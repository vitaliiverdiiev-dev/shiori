import type { INestApplication } from '@nestjs/common';
import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint } from 'better-auth/api';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  type AuthSettings,
  betterAuthOptions,
} from '../src/modules/auth/auth.config.js';
import { registrationResponseSchema } from '../src/modules/auth/auth.dto.js';
import {
  createInvitation,
  revokeInvitation,
} from '../src/modules/auth/invitations.js';
import { createTestApp, TEST_AUTH_ENV, TEST_ORIGIN } from './support/app.js';
import { testDatabaseUrl } from './support/test-database.js';
import { ALICE, createUser, getAuth } from './support/users.js';

const DAY_MS = 86_400_000;
const PARALLEL_SIGN_UPS = 10;
const RACE_ROUNDS = 5;
const SESSION_COOKIE = 'better-auth.session_token';
const INVITEE = {
  email: 'invitee@example.test',
  name: 'Invitee Test',
  password: 'a long enough passphrase',
};
const INVALID_INVITATION = { code: 'INVALID_INVITATION' };
const INVITE_SETTINGS: AuthSettings = {
  baseURL: TEST_AUTH_ENV.BETTER_AUTH_URL,
  registrationMode: 'invite',
  secret: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
};

let closedApp: INestApplication<App>;
let inviteApp: INestApplication<App>;
const pool = new Pool({ connectionString: testDatabaseUrl() });
const db = drizzle({ client: pool });

async function count(table: 'account' | 'session' | 'user') {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) from "${table}"`,
  );
  return Number(rows[0]?.count);
}

async function invitationState(id: string) {
  const { rows } = await pool.query<{ revoked: boolean; used: boolean }>(
    'select used_at is not null as used, revoked_at is not null as revoked from invitation where id = $1',
    [id],
  );
  return rows[0];
}

async function invite(email = INVITEE.email, now = new Date()) {
  const result = await createInvitation(db, email, now);
  if (!result.ok)
    throw new Error(`expected an invitation, got ${result.reason}`);
  return result;
}

function signUp(target: INestApplication<App>, body: Record<string, unknown>) {
  return request(target.getHttpServer())
    .post('/api/auth/sign-up/email')
    .set('Origin', TEST_ORIGIN)
    .send(body);
}

function signUpRequest(body: Record<string, unknown>): Request {
  return new Request(`${TEST_ORIGIN}/api/auth/sign-up/email`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Origin: TEST_ORIGIN },
    method: 'POST',
  });
}

beforeAll(async () => {
  closedApp = await createTestApp(testDatabaseUrl());
  inviteApp = await createTestApp(testDatabaseUrl(), {
    env: { REGISTRATION_MODE: 'invite' },
  });
});

afterEach(async () => {
  await pool.query('truncate "user", verification, invitation cascade');
});

afterAll(async () => {
  await closedApp.close();
  await inviteApp.close();
  await pool.end();
});

describe('GET /api/registration', () => {
  it('reports the configured mode to anonymous callers', async () => {
    const invite = await request(inviteApp.getHttpServer())
      .get('/api/registration')
      .expect(200);
    const closed = await request(closedApp.getHttpServer())
      .get('/api/registration')
      .expect(200);

    expect(registrationResponseSchema.parse(invite.body)).toEqual({
      mode: 'invite',
    });
    expect(registrationResponseSchema.parse(closed.body)).toEqual({
      mode: 'closed',
    });
  });
});

describe('invite-only sign-up', () => {
  it('creates a user with a valid invitation, without a session or admin role', async () => {
    const { code, invitation } = await invite();

    const response = await signUp(inviteApp, {
      ...INVITEE,
      invitationCode: code,
      role: 'admin',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ token: null });
    expect(response.get('Set-Cookie') ?? []).not.toContainEqual(
      expect.stringContaining(SESSION_COOKIE),
    );
    expect(await count('session')).toBe(0);
    const { rows } = await pool.query('select email, role from "user"');
    expect(rows).toEqual([{ email: INVITEE.email, role: 'user' }]);
    expect(await invitationState(invitation.id)).toEqual({
      revoked: false,
      used: true,
    });
    await request(inviteApp.getHttpServer())
      .post('/api/auth/sign-in/email')
      .set('Origin', TEST_ORIGIN)
      .send({ email: INVITEE.email, password: INVITEE.password })
      .expect(200);
  });

  it('accepts the invited email in any letter case', async () => {
    const { code } = await invite();
    await signUp(inviteApp, {
      ...INVITEE,
      email: 'Invitee@Example.TEST',
      invitationCode: code,
    }).expect(200);
    const { rows } = await pool.query('select email from "user"');
    expect(rows).toEqual([{ email: INVITEE.email }]);
  });

  it.each([
    ['missing', () => ({ ...INVITEE })],
    ['empty', () => ({ ...INVITEE, invitationCode: '' })],
    ['unknown', () => ({ ...INVITEE, invitationCode: 'x'.repeat(43) })],
  ])('rejects a %s code', async (_case, body) => {
    const { invitation } = await invite();
    const response = await signUp(inviteApp, body());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(INVALID_INVITATION);
    expect(await count('user')).toBe(0);
    expect(await invitationState(invitation.id)).toEqual({
      revoked: false,
      used: false,
    });
  });

  it('rejects an altered code, another email, an expired and a revoked invitation identically', async () => {
    const valid = await invite();
    const expired = await invite(
      'late@example.test',
      new Date(Date.now() - 8 * DAY_MS),
    );
    const revoked = await invite('revoked@example.test');
    await pool.query('update invitation set revoked_at = now() where id = $1', [
      revoked.invitation.id,
    ]);
    const lastChar = valid.code.at(-1) === 'A' ? 'B' : 'A';

    const responses = await Promise.all([
      signUp(inviteApp, {
        ...INVITEE,
        invitationCode: `${valid.code.slice(0, -1)}${lastChar}`,
      }),
      signUp(inviteApp, {
        ...INVITEE,
        email: 'someone-else@example.test',
        invitationCode: valid.code,
      }),
      signUp(inviteApp, {
        ...INVITEE,
        email: 'late@example.test',
        invitationCode: expired.code,
      }),
      signUp(inviteApp, {
        ...INVITEE,
        email: 'revoked@example.test',
        invitationCode: revoked.code,
      }),
    ]);

    const [first] = responses;
    for (const response of responses) {
      expect(response.status).toBe(400);
      expect(response.body).toEqual(first.body);
      expect(response.body).toMatchObject(INVALID_INVITATION);
      expect(JSON.stringify(response.body)).not.toContain(valid.code);
    }
    expect(await count('user')).toBe(0);
    expect(await invitationState(valid.invitation.id)).toEqual({
      revoked: false,
      used: false,
    });
  });

  it('rejects a replayed code after a successful sign-up', async () => {
    const { code } = await invite();
    await signUp(inviteApp, { ...INVITEE, invitationCode: code }).expect(200);

    const sameEmail = await signUp(inviteApp, {
      ...INVITEE,
      invitationCode: code,
    });
    const otherEmail = await signUp(inviteApp, {
      ...INVITEE,
      email: 'other@example.test',
      invitationCode: code,
    });

    expect(sameEmail.status).toBe(400);
    expect(sameEmail.body).toMatchObject(INVALID_INVITATION);
    expect(otherEmail.status).toBe(400);
    expect(await count('user')).toBe(1);
  });

  it('answers an existing email like a new sign-up without consuming the invitation', async () => {
    const { code, invitation } = await invite();
    await createUser(getAuth(inviteApp), { ...INVITEE });

    const response = await signUp(inviteApp, {
      ...INVITEE,
      invitationCode: code,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: null,
      user: { email: INVITEE.email, role: 'user' },
    });
    expect(await count('user')).toBe(1);
    expect(await count('account')).toBe(1);
    expect(await invitationState(invitation.id)).toEqual({
      revoked: false,
      used: false,
    });
  });

  it('rejects an invalid code for an existing email exactly like for a new one', async () => {
    await createUser(getAuth(inviteApp), { ...INVITEE });
    const bogus = { invitationCode: 'x'.repeat(43) };

    const existing = await signUp(inviteApp, { ...INVITEE, ...bogus });
    const unknown = await signUp(inviteApp, {
      ...INVITEE,
      ...bogus,
      email: 'unknown@example.test',
    });

    expect(existing.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(existing.body).toEqual(unknown.body);
  });

  it('creates at most one account when the same invitation is redeemed concurrently', async () => {
    const { code, invitation } = await invite();

    const responses = await Promise.all(
      Array.from({ length: PARALLEL_SIGN_UPS }, () =>
        signUp(inviteApp, { ...INVITEE, invitationCode: code }),
      ),
    );

    expect(await count('user')).toBe(1);
    expect(await count('account')).toBe(1);
    expect(await invitationState(invitation.id)).toEqual({
      revoked: false,
      used: true,
    });
    for (const response of responses) {
      expect([200, 400]).toContain(response.status);
    }
  });

  it('lets either a revocation or a redemption win a race, never both', async () => {
    for (let round = 0; round < RACE_ROUNDS; round += 1) {
      const email = `race-${String(round)}@example.test`;
      const { code, invitation } = await invite(email);

      const [signUpResponse, revoked] = await Promise.all([
        signUp(inviteApp, { ...INVITEE, email, invitationCode: code }),
        revokeInvitation(db, invitation.id),
      ]);

      const state = await invitationState(invitation.id);
      const { rows } = await pool.query(
        'select 1 from "user" where email = $1',
        [email],
      );
      if (revoked) {
        expect(state).toEqual({ revoked: true, used: false });
        expect(rows).toHaveLength(0);
        expect(signUpResponse.status).toBe(400);
      } else {
        expect(state).toEqual({ revoked: false, used: true });
        expect(rows).toHaveLength(1);
        expect(signUpResponse.status).toBe(200);
      }
    }
  });

  it('rolls the claim back when account creation fails, so a retry succeeds', async () => {
    const { code, invitation } = await invite();
    const base = betterAuthOptions(db, INVITE_SETTINGS);
    const failingAuth = betterAuth({
      ...base,
      databaseHooks: {
        account: {
          create: {
            before: () => {
              throw new Error('simulated failure after the user insert');
            },
          },
        },
      },
    });

    const failed = await failingAuth.handler(
      signUpRequest({ ...INVITEE, invitationCode: code }),
    );

    expect(failed.ok).toBe(false);
    expect(await count('user')).toBe(0);
    expect(await invitationState(invitation.id)).toEqual({
      revoked: false,
      used: false,
    });
    await signUp(inviteApp, { ...INVITEE, invitationCode: code }).expect(200);
    expect(await count('user')).toBe(1);
  });

  it('refuses user creation from any endpoint other than sign-up', async () => {
    const backdoor = {
      id: 'test-backdoor',
      endpoints: {
        createUserBackdoor: createAuthEndpoint(
          '/test/create-user',
          { method: 'POST' },
          async (context) => {
            await context.context.internalAdapter.createUser(
              {
                email: 'backdoor@example.test',
                emailVerified: false,
                name: 'Backdoor',
              },
              { method: 'email-password' },
            );
            return context.json({ created: true });
          },
        ),
      },
    } satisfies BetterAuthPlugin;
    const base = betterAuthOptions(db, INVITE_SETTINGS);
    const auth = betterAuth({ ...base, plugins: [...base.plugins, backdoor] });

    const response = await auth.handler(
      new Request(`${TEST_ORIGIN}/api/auth/test/create-user`, {
        headers: { Origin: TEST_ORIGIN },
        method: 'POST',
      }),
    );

    expect(response.ok).toBe(false);
    expect(await count('user')).toBe(0);
  });
});

describe('closed registration', () => {
  it('rejects sign-up even with a valid invitation and leaves it unused', async () => {
    const { code, invitation } = await invite();
    const response = await signUp(closedApp, {
      ...INVITEE,
      invitationCode: code,
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED',
    });
    expect(await count('user')).toBe(0);
    expect(await invitationState(invitation.id)).toEqual({
      revoked: false,
      used: false,
    });
  });

  it('keeps existing sessions valid across a mode change', async () => {
    await createUser(getAuth(inviteApp), ALICE);
    const signIn = await request(inviteApp.getHttpServer())
      .post('/api/auth/sign-in/email')
      .set('Origin', TEST_ORIGIN)
      .send({ email: ALICE.email, password: ALICE.password })
      .expect(200);
    const cookie = (signIn.get('Set-Cookie') ?? [])
      .map((value) => value.split(';')[0] ?? '')
      .join('; ');

    await request(closedApp.getHttpServer())
      .get('/api/me')
      .set('Cookie', cookie)
      .expect(200);
  });
});
