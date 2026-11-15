import type { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createOpenApiDocument } from '../src/app/openapi.js';
import { unauthorizedResponseSchema } from '../src/modules/auth/auth.dto.js';
import {
  healthResponseSchema,
  notReadyResponseSchema,
  readyResponseSchema,
} from '../src/modules/diagnostics/diagnostics.dto.js';
import { createTestApp, TEST_AUTH_ENV } from './support/app.js';

const UNREACHABLE_DATABASE_URL = 'postgres://unused@127.0.0.1:1/unused';
const DOWN = { checks: { database: 'down' }, status: 'error' };

function signedSessionCookie(token: string): string {
  const signature = createHmac('sha256', TEST_AUTH_ENV.BETTER_AUTH_SECRET)
    .update(token)
    .digest('base64');
  return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
}

describe('with an unreachable database', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp(UNREACHABLE_DATABASE_URL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health stays ok (liveness)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
    expect(healthResponseSchema.parse(response.body)).toEqual(response.body);
  });

  it('GET /api/health ignores a session cookie instead of querying the database', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Cookie', signedSessionCookie('some-session-token'))
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/ready returns 503 with a fixed body', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/ready')
      .expect(503)
      .expect(DOWN);
    expect(notReadyResponseSchema.parse(response.body)).toEqual(DOWN);
  });

  it('GET /api/me requires a session and answers with the documented 401 body', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/me')
      .expect(401);
    expect(unauthorizedResponseSchema.parse(response.body)).toEqual(
      response.body,
    );
  });

  it('serves Better Auth once under /api/auth, never under /api/api/auth', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/ok')
      .expect(200)
      .expect({ ok: true });
    await request(app.getHttpServer()).get('/api/api/auth/ok').expect(404);
  });

  it('exposes no admin or impersonation endpoints', async () => {
    for (const path of [
      '/api/auth/admin/impersonate-user',
      '/api/auth/admin/set-role',
      '/api/auth/admin/set-user-password',
      '/api/auth/admin/create-user',
    ]) {
      await request(app.getHttpServer()).post(path).send({}).expect(404);
    }
  });
});

describe('GET /api/ready with a stubbed database', () => {
  it('returns 200 when the query succeeds', async () => {
    const query = vi
      .fn<(config: { query_timeout?: number }) => Promise<{ rows: [] }>>()
      .mockResolvedValue({ rows: [] });
    const app = await createTestApp(UNREACHABLE_DATABASE_URL, {
      database: { $client: { query } },
    });
    try {
      const response = await request(app.getHttpServer())
        .get('/api/ready')
        .expect(200)
        .expect({ checks: { database: 'up' }, status: 'ok' });
      expect(readyResponseSchema.parse(response.body)).toEqual(response.body);
      expect(query.mock.calls[0]?.[0].query_timeout).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('returns 503 without internals when the query times out', async () => {
    const query = vi.fn(() =>
      Promise.reject(new Error('Query read timeout on db.internal:5432')),
    );
    const app = await createTestApp(UNREACHABLE_DATABASE_URL, {
      database: { $client: { query } },
    });
    try {
      const response = await request(app.getHttpServer())
        .get('/api/ready')
        .expect(503);
      expect(response.body).toEqual(DOWN);
      expect(response.text).not.toContain('db.internal');
    } finally {
      await app.close();
    }
  });
});

describe('OpenAPI contract', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp(UNREACHABLE_DATABASE_URL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('matches the committed openapi.json (run `pnpm api:generate`)', () => {
    const committed: unknown = JSON.parse(
      readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'),
    );
    expect(createOpenApiDocument(app)).toEqual(committed);
  });

  it('documents only the app’s own endpoints with stable operation ids', () => {
    const { paths } = createOpenApiDocument(app);
    expect(
      Object.entries(paths).map(([path, item]) => [
        path,
        item.get?.operationId,
      ]),
    ).toEqual([
      ['/api/me', 'getCurrentUser'],
      ['/api/registration', 'getRegistration'],
      ['/api/health', 'getHealth'],
      ['/api/ready', 'getReady'],
    ]);
  });
});
