import { betterAuth } from 'better-auth';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  TEST_AUTH_ENV,
  TEST_ORIGIN,
} from '#test/support/app.js';
import { testDatabaseUrl } from '#test/support/test-database.js';
import { createUser } from '#test/support/users.js';
import {
  type AuthSettings,
  betterAuthOptions,
  createAuth,
} from '../../../integrations/better-auth/config/better-auth.config.js';
import { currentUserResponseSchema } from '../../../sessions/http/dto/get-current-user.dto.js';
import { bootstrapFirstAdmin } from '../../application/bootstrap-first-admin.js';

const PARALLEL_BOOTSTRAPS = 5;
const SETTINGS: AuthSettings = {
  baseURL: TEST_AUTH_ENV.BETTER_AUTH_URL,
  registrationMode: 'closed',
  secret: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
};
const ADMIN = {
  email: 'Admin@Example.TEST',
  name: 'Admin Test',
  password: 'an admin passphrase that is long',
};

const pool = new Pool({ connectionString: testDatabaseUrl() });
const db = drizzle({ client: pool });
const auth = createAuth(db, SETTINGS);

async function users() {
  const { rows } = await pool.query<{ email: string; role: string }>(
    'select email, role from "user" order by email',
  );
  return rows;
}

afterEach(async () => {
  await pool.query(
    'truncate "user", verification, invitation, admin_bootstrap cascade',
  );
});

afterAll(async () => {
  await pool.end();
});

describe('bootstrapFirstAdmin', () => {
  it('creates the first admin, who can then sign in normally', async () => {
    const result = await bootstrapFirstAdmin(auth, ADMIN);

    expect(result).toMatchObject({ ok: true });
    expect(await users()).toEqual([
      { email: 'admin@example.test', role: 'admin' },
    ]);
    const app = await createTestApp(testDatabaseUrl());
    try {
      const signIn = await request(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .set('Origin', TEST_ORIGIN)
        .send({ email: 'admin@example.test', password: ADMIN.password })
        .expect(200);
      const cookie = (signIn.get('Set-Cookie') ?? [])
        .map((value) => value.split(';')[0] ?? '')
        .join('; ');
      const me = await request(app.getHttpServer())
        .get('/api/me')
        .set('Cookie', cookie)
        .expect(200);
      expect(currentUserResponseSchema.parse(me.body).role).toBe('admin');
    } finally {
      await app.close();
    }
  });

  it('refuses a second bootstrap', async () => {
    await bootstrapFirstAdmin(auth, ADMIN);
    const second = await bootstrapFirstAdmin(auth, {
      ...ADMIN,
      email: 'second@example.test',
    });
    expect(second).toEqual({ ok: false, reason: 'already-initialized' });
    expect(await users()).toHaveLength(1);
  });

  it('creates exactly one admin when bootstraps race', async () => {
    const results = await Promise.all(
      Array.from({ length: PARALLEL_BOOTSTRAPS }, (_, index) =>
        bootstrapFirstAdmin(auth, {
          ...ADMIN,
          email: `admin-${String(index)}@example.test`,
        }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    for (const result of results.filter((result) => !result.ok)) {
      expect(result).toEqual({ ok: false, reason: 'already-initialized' });
    }
    const { rows } = await pool.query<{ count: string }>(
      'select count(*) from account',
    );
    expect(await users()).toHaveLength(1);
    expect(rows[0]?.count).toBe('1');
  });

  it('works when invited users exist but no admin does', async () => {
    await createUser(auth, {
      email: 'member@example.test',
      name: 'Member',
      password: 'a member passphrase',
    });
    expect(await bootstrapFirstAdmin(auth, ADMIN)).toMatchObject({ ok: true });
  });

  it.each([
    [{ email: 'not an email' }, 'invalid-email'],
    [{ name: '   ' }, 'invalid-name'],
    [{ password: 'p'.repeat(14) }, 'invalid-password'],
    [{ password: 'p'.repeat(129) }, 'invalid-password'],
  ])('rejects invalid input %o', async (override, reason) => {
    expect(await bootstrapFirstAdmin(auth, { ...ADMIN, ...override })).toEqual({
      ok: false,
      reason,
    });
    expect(await users()).toEqual([]);
  });

  it('refuses an email that already has an account', async () => {
    await createUser(auth, {
      email: 'admin@example.test',
      name: 'Member',
      password: 'a member passphrase',
    });
    expect(await bootstrapFirstAdmin(auth, ADMIN)).toEqual({
      ok: false,
      reason: 'email-taken',
    });
    expect(await users()).toEqual([
      { email: 'admin@example.test', role: 'user' },
    ]);
  });

  it('does not stop a later, authorized second admin', async () => {
    await bootstrapFirstAdmin(auth, ADMIN);
    await pool.query(
      "insert into \"user\" (id, email, name, role) values ('second', 'second@example.test', 'Second', 'admin')",
    );
    const { rows } = await pool.query(
      'select email from "user" where role = \'admin\' order by email',
    );
    expect(rows).toEqual([
      { email: 'admin@example.test' },
      { email: 'second@example.test' },
    ]);
  });

  it('stays one-time after the first admin is demoted or deleted', async () => {
    await bootstrapFirstAdmin(auth, ADMIN);
    await pool.query('update "user" set role = \'user\'');
    expect(
      await bootstrapFirstAdmin(auth, { ...ADMIN, email: 'b@example.test' }),
    ).toEqual({ ok: false, reason: 'already-initialized' });
    await pool.query('delete from "user"');
    expect(
      await bootstrapFirstAdmin(auth, { ...ADMIN, email: 'c@example.test' }),
    ).toEqual({ ok: false, reason: 'already-initialized' });
  });

  it('leaves no partial admin when the account insert fails, and can be retried', async () => {
    const failing = betterAuth({
      ...betterAuthOptions(db, SETTINGS),
      databaseHooks: {
        account: {
          create: {
            before: () => {
              throw new Error('simulated crash after the user insert');
            },
          },
        },
      },
    });

    await expect(bootstrapFirstAdmin(failing, ADMIN)).rejects.toThrow();
    expect(await users()).toEqual([]);
    const { rows } = await pool.query('select 1 from admin_bootstrap');
    expect(rows).toEqual([]);
    expect(await bootstrapFirstAdmin(auth, ADMIN)).toMatchObject({ ok: true });
  });

  it('fails cleanly when the database is unreachable', async () => {
    const unreachable = new Pool({
      connectionString: 'postgres://unused@127.0.0.1:1/unused',
      connectionTimeoutMillis: 1_000,
    });
    try {
      await expect(
        bootstrapFirstAdmin(
          createAuth(drizzle({ client: unreachable }), SETTINGS),
          ADMIN,
        ),
      ).rejects.toThrow();
    } finally {
      await unreachable.end();
    }
  });
});
