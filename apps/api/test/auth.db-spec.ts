import { Body, Controller, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
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
import { currentUserResponseSchema } from '../src/modules/auth/auth.dto.js';
import { createTestApp, TEST_ORIGIN } from './support/app.js';
import { testDatabaseUrl } from './support/test-database.js';
import { ALICE, authOf, createUser } from './support/users.js';

const SESSION_COOKIE = 'better-auth.session_token';
const DAY_MS = 86_400_000;

let app: INestApplication<App>;
let pool: Pool;

async function countRows(table: 'session' | 'user'): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) from "${table}"`,
  );
  return Number(rows[0]?.count);
}

/** `name=value` of the session cookie set by a response. */
function sessionCookie(setCookie: string[] | undefined): string {
  const cookie = setCookie?.find((value) =>
    value.startsWith(`${SESSION_COOKIE}=`),
  );
  if (!cookie) throw new Error('No session cookie was set');
  return cookie.split(';')[0] ?? '';
}

function signIn(email: string, password: string, origin: string = TEST_ORIGIN) {
  return request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', origin)
    .send({ email, password });
}

beforeAll(async () => {
  app = await createTestApp(testDatabaseUrl());
  pool = new Pool({ connectionString: testDatabaseUrl() });
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

beforeEach(async () => {
  await createUser(authOf(app), ALICE);
});

afterEach(async () => {
  await pool.query('truncate "user", verification cascade');
});

describe('public diagnostics', () => {
  it('stay anonymous', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
    await request(app.getHttpServer()).get('/api/ready').expect(200);
  });
});

describe('sign-in and session', () => {
  it('denies the private endpoint without a session', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('sets an HttpOnly, SameSite=Lax session cookie (not Secure on http)', async () => {
    const response = await signIn(ALICE.email, ALICE.password).expect(200);
    const cookie = response
      .get('Set-Cookie')
      ?.find((value) => value.startsWith(`${SESSION_COOKIE}=`));
    expect(cookie).toMatch(/; HttpOnly/i);
    expect(cookie).toMatch(/; SameSite=Lax/i);
    expect(cookie).not.toMatch(/; Secure/i);
  });

  it('authorizes the private endpoint with a real session', async () => {
    const cookie = sessionCookie(
      (await signIn(ALICE.email, ALICE.password).expect(200)).get('Set-Cookie'),
    );
    const response = await request(app.getHttpServer())
      .get('/api/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(currentUserResponseSchema.parse(response.body)).toEqual({
      id: expect.any(String) as string,
      email: ALICE.email,
      name: ALICE.name,
      role: 'user',
    });
  });

  it('stores a database session that expires in seven days', async () => {
    await signIn(ALICE.email, ALICE.password).expect(200);
    const { rows } = await pool.query<{ expires_at: Date }>(
      'select expires_at from session',
    );
    const lifetime = (rows[0]?.expires_at.getTime() ?? 0) - Date.now();
    expect(lifetime).toBeGreaterThan(7 * DAY_MS - 60_000);
    expect(lifetime).toBeLessThanOrEqual(7 * DAY_MS);
  });

  it('denies the old cookie after sign-out', async () => {
    const cookie = sessionCookie(
      (await signIn(ALICE.email, ALICE.password).expect(200)).get('Set-Cookie'),
    );
    await request(app.getHttpServer())
      .post('/api/auth/sign-out')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie)
      .expect(200);
    expect(await countRows('session')).toBe(0);
    await request(app.getHttpServer())
      .get('/api/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('fails identically for a wrong password and an unknown email', async () => {
    const wrongPassword = await signIn(ALICE.email, 'not the right password');
    const unknownEmail = await signIn('nobody@example.test', ALICE.password);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(wrongPassword.get('Set-Cookie')).toBeUndefined();
  });

  // Whitespace is significant. Better Auth's hasher applies NFKC to both
  // hash and verify, so composed and decomposed forms are the same password.
  it('never trims passwords and treats Unicode forms as equivalent', async () => {
    const password = '  栞 café correct horse  '.normalize('NFC');
    const bob = { email: 'bob@example.test', name: 'Bob Test', password };
    await createUser(authOf(app), bob);
    await signIn(bob.email, password.trim()).expect(401);
    await signIn(bob.email, password.normalize('NFD')).expect(200);
    await signIn(bob.email, password).expect(200);
  });

  it('rejects a sign-in from an untrusted origin', async () => {
    await signIn(ALICE.email, ALICE.password, 'https://evil.example').expect(
      403,
    );
    expect(await countRows('session')).toBe(0);
  });
});

describe('closed registration', () => {
  it('rejects a direct sign-up POST and creates no user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('Origin', TEST_ORIGIN)
      .send({
        email: 'mallory@example.test',
        name: 'Mallory',
        password: 'a long enough passphrase',
      });
    expect(response.status).toBe(400);
    expect(response.get('Set-Cookie')).toBeUndefined();
    expect(await countRows('user')).toBe(1);
  });
});

@AllowAnonymous()
@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('body parsing outside /api/auth', () => {
  it('still parses JSON for ordinary Nest routes', async () => {
    const echoApp = await createTestApp(testDatabaseUrl(), {
      imports: [EchoModule],
    });
    try {
      await request(echoApp.getHttpServer())
        .post('/api/echo')
        .send({ kana: 'しおり' })
        .expect(201)
        .expect({ kana: 'しおり' });
    } finally {
      await echoApp.close();
    }
  });
});
