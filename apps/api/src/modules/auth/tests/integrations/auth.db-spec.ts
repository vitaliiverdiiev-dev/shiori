import { Body, Controller, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
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
import {
  createTestApp,
  TEST_AUTH_ENV,
  TEST_ORIGIN,
} from '#test/support/app.js';
import { testDatabaseUrl } from '#test/support/test-database.js';
import { ALICE, createUser, getAuth } from '#test/support/users.js';
import { AllowAnonymous } from '../../index.js';
import { createAuth } from '../../integrations/better-auth/config/better-auth.config.js';
import { currentUserResponseSchema } from '../../sessions/http/dto/get-current-user.dto.js';

const SESSION_COOKIE = 'better-auth.session_token';
const DAY_MS = 86_400_000;
const HTTPS_ORIGIN = 'https://shiori.example.test';
const NEW_PASSWORD = 'a brand new passphrase for alice';
const RATE_LIMITED_PATHS = [
  '/sign-in/email',
  '/sign-up/email',
  '/change-password',
] as const;
const ALLOWED_ATTEMPTS = 3;
const TOO_MANY_REQUESTS = 429;

let aliceId: string;
let app: INestApplication<App>;
let pool: Pool;

function browserCookies(setCookie: string[] | undefined): string {
  const pairs = (setCookie ?? []).map((value) => value.split(';')[0] ?? '');
  if (!pairs.some((pair) => pair.startsWith(`${SESSION_COOKIE}=`))) {
    throw new Error('No session cookie was set');
  }
  return pairs.join('; ');
}

async function countRows(table: 'session' | 'user'): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) from "${table}"`,
  );
  return Number(rows[0]?.count);
}

function getMe(cookie: string) {
  return request(app.getHttpServer()).get('/api/me').set('Cookie', cookie);
}

function postAuth(path: string, cookie: string, body: object = {}) {
  return request(app.getHttpServer())
    .post(`/api/auth${path}`)
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', cookie)
    .send(body);
}

function signIn(
  email: string,
  password: string,
  origin: string = TEST_ORIGIN,
  target: INestApplication<App> = app,
) {
  return request(target.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', origin)
    .send({ email, password });
}

async function signInAlice(password = ALICE.password): Promise<string> {
  const response = await signIn(ALICE.email, password).expect(200);
  return browserCookies(response.get('Set-Cookie'));
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
  aliceId = await createUser(getAuth(app), ALICE);
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

  it('sets a __Secure- prefixed, Secure session cookie when the public URL is https', async () => {
    const httpsApp = await createTestApp(testDatabaseUrl(), {
      env: { BETTER_AUTH_URL: HTTPS_ORIGIN },
    });
    try {
      const response = await signIn(
        ALICE.email,
        ALICE.password,
        HTTPS_ORIGIN,
        httpsApp,
      ).expect(200);
      const cookie = response
        .get('Set-Cookie')
        ?.find((value) => value.startsWith(`__Secure-${SESSION_COOKIE}=`));
      expect(cookie).toMatch(/; Secure/i);
      expect(cookie).toMatch(/; HttpOnly/i);
      expect(cookie).toMatch(/; SameSite=Lax/i);
    } finally {
      await httpsApp.close();
    }
  });

  it('authorizes the private endpoint with a real session', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/me')
      .set('Cookie', await signInAlice())
      .expect(200);
    expect(currentUserResponseSchema.parse(response.body)).toEqual({
      id: aliceId,
      email: ALICE.email,
      name: ALICE.name,
      role: 'user',
    });
  });

  it('denies a session once it has expired in the database (no cookie cache)', async () => {
    const cookie = await signInAlice();
    await pool.query(
      "update session set expires_at = now() - interval '1 minute'",
    );
    await request(app.getHttpServer())
      .get('/api/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('does not let a signed-in user make themselves admin', async () => {
    const cookie = await signInAlice();
    const response = await request(app.getHttpServer())
      .post('/api/auth/update-user')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie)
      .send({ role: 'admin' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'FIELD_NOT_ALLOWED' });
    const { rows } = await pool.query<{ role: string }>(
      'select role from "user"',
    );
    expect(rows).toEqual([{ role: 'user' }]);
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
    const cookie = await signInAlice();
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

  it('never trims passwords and treats NFKC-equivalent input as the same password', async () => {
    const password = '  栞 café correct horse  '.normalize('NFC');
    const bob = { email: 'bob@example.test', name: 'Bob Test', password };
    await createUser(getAuth(app), bob);
    await signIn(bob.email, password.trim()).expect(401);
    await signIn(bob.email, password.normalize('NFD')).expect(200);
    await signIn(bob.email, '  栞 café ｃｏｒｒｅｃｔ ｈｏｒｓｅ  ').expect(
      200,
    );
    await signIn(bob.email, password).expect(200);
  });

  it('rejects a sign-in from an untrusted origin', async () => {
    await signIn(ALICE.email, ALICE.password, 'https://evil.example').expect(
      403,
    );
    expect(await countRows('session')).toBe(0);
  });
});

describe('password change', () => {
  it('requires the current password and the length policy', async () => {
    const cookie = await signInAlice();
    const wrongCurrent = await postAuth('/change-password', cookie, {
      currentPassword: 'not the right password',
      newPassword: NEW_PASSWORD,
    });
    expect(wrongCurrent.status).toBe(400);
    expect(wrongCurrent.body).toMatchObject({ code: 'INVALID_PASSWORD' });
    const tooShort = await postAuth('/change-password', cookie, {
      currentPassword: ALICE.password,
      newPassword: 'fourteen chars',
    });
    expect(tooShort.status).toBe(400);
    expect(tooShort.body).toMatchObject({ code: 'PASSWORD_TOO_SHORT' });
    await signIn(ALICE.email, ALICE.password).expect(200);
  });

  it.each([
    ['a listed password', 'PasswordPassword'],
    ['full-width input', 'ｐａｓｓｗｏｒｄｐａｓｓｗｏｒｄ'],
    ['a repeated character', 'x'.repeat(20)],
  ])(
    'rejects %s as too common and keeps the old password',
    async (_case, newPassword) => {
      const cookie = await signInAlice();
      const response = await postAuth('/change-password', cookie, {
        currentPassword: ALICE.password,
        newPassword,
      });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'PASSWORD_TOO_COMMON' });
      await signIn(ALICE.email, ALICE.password).expect(200);
    },
  );

  it('revokes every other session and keeps this device signed in', async () => {
    const otherDevice = await signInAlice();
    const thisDevice = await signInAlice();
    const response = await postAuth('/change-password', thisDevice, {
      currentPassword: ALICE.password,
      newPassword: NEW_PASSWORD,
      revokeOtherSessions: true,
    }).expect(200);

    await getMe(otherDevice).expect(401);
    await getMe(browserCookies(response.get('Set-Cookie'))).expect(200);
    await signIn(ALICE.email, ALICE.password).expect(401);
    await signIn(ALICE.email, NEW_PASSWORD).expect(200);
  });
});

describe('password reset (no reset email exists yet)', () => {
  async function storeResetToken(token: string) {
    await pool.query(
      "insert into verification (id, identifier, value, expires_at, created_at, updated_at) values ($1, $2, $3, now() + interval '1 hour', now(), now())",
      [`reset-${token}`, `reset-password:${token}`, aliceId],
    );
  }

  it('cannot request a reset token', async () => {
    const response = await postAuth('/request-password-reset', '', {
      email: ALICE.email,
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'RESET_PASSWORD_DISABLED' });
  });

  it('screens the new password even with a valid reset token', async () => {
    await storeResetToken('valid-token');
    const common = await postAuth('/reset-password', '', {
      newPassword: 'passwordpassword',
      token: 'valid-token',
    });
    expect(common.status).toBe(400);
    expect(common.body).toMatchObject({ code: 'PASSWORD_TOO_COMMON' });
    await postAuth('/reset-password', '', {
      newPassword: NEW_PASSWORD,
      token: 'valid-token',
    }).expect(200);
    await signIn(ALICE.email, NEW_PASSWORD).expect(200);
  });
});

describe('other sessions', () => {
  it('signs out other devices without signing out this one', async () => {
    const otherDevice = await signInAlice();
    const thisDevice = await signInAlice();
    await postAuth('/revoke-other-sessions', thisDevice).expect(200);
    await getMe(otherDevice).expect(401);
    await getMe(thisDevice).expect(200);
  });

  it('refuses to act without a session', async () => {
    await postAuth('/revoke-other-sessions', '').expect(401);
  });
});

describe('rate limiting', () => {
  it('throttles sign-in, sign-up and password-change attempts, ignoring forged X-Forwarded-For', async () => {
    const limited = createAuth(drizzle({ client: pool }), {
      baseURL: TEST_ORIGIN,
      rateLimit: true,
      registrationMode: 'invite',
      secret: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
    });
    const attempt = async (path: string, forgedClientIp: string) =>
      (
        await limited.handler(
          new Request(`${TEST_ORIGIN}/api/auth${path}`, {
            body: JSON.stringify({
              email: ALICE.email,
              password: 'not the right password',
            }),
            headers: {
              'content-type': 'application/json',
              origin: TEST_ORIGIN,
              'x-forwarded-for': forgedClientIp,
            },
            method: 'POST',
          }),
        )
      ).status;

    for (const path of RATE_LIMITED_PATHS) {
      const statuses: number[] = [];
      for (let made = 0; made <= ALLOWED_ATTEMPTS; made += 1) {
        statuses.push(await attempt(path, `203.0.113.${String(made + 1)}`));
      }
      expect(statuses.slice(0, ALLOWED_ATTEMPTS)).not.toContain(
        TOO_MANY_REQUESTS,
      );
      expect(statuses.at(-1)).toBe(TOO_MANY_REQUESTS);
    }
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
