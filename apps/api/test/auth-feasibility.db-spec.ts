import {
  betterAuth,
  type BetterAuthOptions,
  type GenericEndpointContext,
  getCurrentAdapter,
} from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { betterAuthOptions } from '../src/modules/auth/auth.config.js';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../src/modules/auth/credentials.js';
import { TEST_AUTH_ENV, TEST_ORIGIN } from './support/app.js';
import { testDatabaseUrl } from './support/test-database.js';

const pool = new Pool({ connectionString: testDatabaseUrl() });
const db = drizzle({ client: pool });
const SIGN_UP = {
  email: 'invitee@example.test',
  name: 'Invitee Test',
  password: 'a long enough passphrase',
};
const signUpResponseSchema = z.object({
  token: z.string().nullable(),
  user: z.record(z.string(), z.unknown()),
});

async function count(table: 'account' | 'user' | 'verification') {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) from "${table}"`,
  );
  return Number(rows[0]?.count);
}

function postSignUp(
  auth: ReturnType<typeof signUpAuth>,
  body: Record<string, unknown>,
): Promise<Response> {
  return auth.handler(
    new Request(`${TEST_ORIGIN}/api/auth/sign-up/email`, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Origin: TEST_ORIGIN },
      method: 'POST',
    }),
  );
}

function signUpAuth(
  extra: Pick<BetterAuthOptions, 'databaseHooks' | 'hooks'> = {},
) {
  const base = betterAuthOptions(db, {
    baseURL: TEST_AUTH_ENV.BETTER_AUTH_URL,
    registrationMode: 'invite',
    secret: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
  });
  return betterAuth({ ...base, ...extra, plugins: [] });
}

afterEach(async () => {
  await pool.query('truncate "user", verification cascade');
});

afterAll(async () => {
  await pool.end();
});

const failAccountInsert = {
  account: {
    create: {
      before: () => {
        throw new Error('simulated failure after the user insert');
      },
    },
  },
};

async function consumeInTransaction(
  context: GenericEndpointContext | null,
): Promise<void> {
  if (!context) throw new Error('expected an endpoint context');
  const adapter = await getCurrentAdapter(context.context.adapter);
  await adapter.create({
    data: {
      expiresAt: new Date(),
      identifier: 'invite-consumed',
      value: 'consumed',
    },
    model: 'verification',
  });
}

describe('sign-up transaction boundary (adapter transaction: true)', () => {
  it('commits a user.create.before write made through the current adapter together with the user', async () => {
    const auth = signUpAuth({
      databaseHooks: {
        user: {
          create: { before: (_user, context) => consumeInTransaction(context) },
        },
      },
    });

    expect((await postSignUp(auth, SIGN_UP)).status).toBe(200);
    expect(await count('user')).toBe(1);
    expect(await count('verification')).toBe(1);
  });

  it('rolls back that write, the user and the account when a later insert fails', async () => {
    let hookRan = false;
    const auth = signUpAuth({
      databaseHooks: {
        ...failAccountInsert,
        user: {
          create: {
            before: async (_user, context) => {
              await consumeInTransaction(context);
              hookRan = true;
            },
          },
        },
      },
    });

    expect((await postSignUp(auth, SIGN_UP)).ok).toBe(false);
    expect(hookRan).toBe(true);
    expect(await count('user')).toBe(0);
    expect(await count('account')).toBe(0);
    expect(await count('verification')).toBe(0);
  });

  it('cannot roll back a write made through a separate connection', async () => {
    const auth = signUpAuth({
      databaseHooks: {
        ...failAccountInsert,
        user: {
          create: {
            before: async () => {
              await pool.query(
                "insert into verification (id, identifier, value, expires_at) values ('outside', 'invite-consumed', 'consumed', now())",
              );
            },
          },
        },
      },
    });

    expect((await postSignUp(auth, SIGN_UP)).ok).toBe(false);
    expect(await count('user')).toBe(0);
    expect(await count('verification')).toBe(1);
  });

  it('runs user.create.after hooks only after commit, so never for a failed sign-up', async () => {
    let afterRan = false;
    const auth = signUpAuth({
      databaseHooks: {
        ...failAccountInsert,
        user: {
          create: {
            after: () => {
              afterRan = true;
              return Promise.resolve();
            },
          },
        },
      },
    });

    expect((await postSignUp(auth, SIGN_UP)).ok).toBe(false);
    expect(afterRan).toBe(false);
  });
});

describe('sign-up request body', () => {
  it('passes an extra invitationCode field to the before hook and database hooks', async () => {
    const seen: { database?: unknown; endpoint?: unknown } = {};
    const auth = signUpAuth({
      databaseHooks: {
        user: {
          create: {
            before: (_user, context) => {
              const body: unknown = context?.body;
              seen.database =
                typeof body === 'object' &&
                body !== null &&
                'invitationCode' in body
                  ? body.invitationCode
                  : undefined;
              return Promise.resolve();
            },
          },
        },
      },
      hooks: {
        before: createAuthMiddleware((context) => {
          const body: unknown = context.body;
          if (
            context.path === '/sign-up/email' &&
            typeof body === 'object' &&
            body !== null &&
            'invitationCode' in body
          ) {
            seen.endpoint = body.invitationCode;
          }
          return Promise.resolve();
        }),
      },
    });

    const response = await postSignUp(auth, {
      ...SIGN_UP,
      invitationCode: 'fake-invitation-code',
    });

    expect(response.status).toBe(200);
    expect(seen).toEqual({
      database: 'fake-invitation-code',
      endpoint: 'fake-invitation-code',
    });
    const { rows } = await pool.query<Record<string, unknown>>(
      'select * from "user"',
    );
    expect(Object.keys(rows[0] ?? {})).not.toContain('invitation_code');
  });

  it('ignores a client-supplied role and creates no session', async () => {
    const response = await postSignUp(signUpAuth(), {
      ...SIGN_UP,
      role: 'admin',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    const { rows } = await pool.query<{ role: string }>(
      'select role from "user"',
    );
    expect(rows).toEqual([{ role: 'user' }]);
    expect(await count('account')).toBe(1);
  });

  it.each([
    { accepted: false, length: PASSWORD_MIN_LENGTH - 1 },
    { accepted: true, length: PASSWORD_MIN_LENGTH },
    { accepted: true, length: PASSWORD_MAX_LENGTH },
    { accepted: false, length: PASSWORD_MAX_LENGTH + 1 },
  ])(
    'enforces password length on the server: $length characters',
    async ({ accepted, length }) => {
      const response = await postSignUp(signUpAuth(), {
        ...SIGN_UP,
        password: 'p'.repeat(length),
      });
      expect(response.status).toBe(accepted ? 200 : 400);
      expect(await count('user')).toBe(accepted ? 1 : 0);
    },
  );

  it('answers a duplicate email exactly like a new sign-up (no enumeration)', async () => {
    const auth = signUpAuth();
    const first = signUpResponseSchema.parse(
      await (await postSignUp(auth, SIGN_UP)).json(),
    );
    const duplicateResponse = await postSignUp(auth, SIGN_UP);
    const duplicate = signUpResponseSchema.parse(
      await duplicateResponse.json(),
    );

    expect(duplicateResponse.status).toBe(200);
    expect(duplicate.token).toBeNull();
    expect(first.token).toBeNull();
    expect(Object.keys(duplicate.user).sort()).toEqual(
      Object.keys(first.user).sort(),
    );
    expect(duplicate.user).toMatchObject({
      email: SIGN_UP.email,
      role: 'user',
    });
    expect(await count('user')).toBe(1);
  });
});
