import { Controller, Get, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { bootstrapFirstAdmin } from '../src/modules/auth/bootstrap-admin.js';
import { createTestApp, TEST_ORIGIN } from './support/app.js';
import { testDatabaseUrl } from './support/test-database.js';
import { ALICE, createUser, getAuth } from './support/users.js';

const ADMIN = {
  email: 'admin@example.test',
  name: 'Admin Test',
  password: 'an admin passphrase that is long',
};

@Controller('admin-probe')
class AdminProbeController {
  @Get()
  @Roles(['admin'])
  probe(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [AdminProbeController] })
class AdminProbeModule {}

let app: INestApplication<App>;
const pool = new Pool({ connectionString: testDatabaseUrl() });

async function cookieFor(email: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', TEST_ORIGIN)
    .send({ email, password })
    .expect(200);
  return (response.get('Set-Cookie') ?? [])
    .map((value) => value.split(';')[0] ?? '')
    .join('; ');
}

function post(path: string, cookie: string, body: object = {}) {
  return request(app.getHttpServer())
    .post(path)
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

async function roleOf(email: string) {
  const { rows } = await pool.query<{ role: string }>(
    'select role from "user" where email = $1',
    [email],
  );
  return rows[0]?.role;
}

beforeAll(async () => {
  app = await createTestApp(testDatabaseUrl(), {
    imports: [AdminProbeModule],
  });
});

beforeEach(async () => {
  const auth = getAuth(app);
  await bootstrapFirstAdmin(auth, ADMIN);
  await createUser(auth, ALICE);
});

afterEach(async () => {
  await pool.query('truncate "user", verification, invitation cascade');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('role-protected route', () => {
  it('returns 401 to a guest, 403 to a user and 200 to the admin', async () => {
    await request(app.getHttpServer()).get('/api/admin-probe').expect(401);
    await request(app.getHttpServer())
      .get('/api/admin-probe')
      .set('Cookie', await cookieFor(ALICE.email, ALICE.password))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin-probe')
      .set('Cookie', await cookieFor(ADMIN.email, ADMIN.password))
      .expect(200);
  });
});

describe('dangerous admin operations', () => {
  it.each([
    '/api/auth/admin/set-role',
    '/api/auth/admin/impersonate-user',
    '/api/auth/admin/set-user-password',
    '/api/auth/admin/remove-user',
    '/api/auth/admin/ban-user',
  ])('%s does not exist, even for the admin', async (path) => {
    const cookie = await cookieFor(ADMIN.email, ADMIN.password);
    const response = await post(path, cookie, { userId: 'x' });
    expect(response.status).toBe(404);
  });

  it('the admin cannot change roles through update-user', async () => {
    const cookie = await cookieFor(ADMIN.email, ADMIN.password);
    const response = await post('/api/auth/update-user', cookie, {
      role: 'user',
    });
    expect(response.status).toBe(400);
    expect(await roleOf(ADMIN.email)).toBe('admin');
  });

  it('no account can delete itself, so the last admin cannot disappear', async () => {
    const cookie = await cookieFor(ADMIN.email, ADMIN.password);
    const response = await post('/api/auth/delete-user', cookie, {
      password: ADMIN.password,
    });
    expect(response.ok).toBe(false);
    expect(await roleOf(ADMIN.email)).toBe('admin');
  });
});
