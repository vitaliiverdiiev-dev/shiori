import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { DATABASE } from '../src/database/database.module.js';

// Nothing listens on port 1: connections are refused immediately.
const UNREACHABLE_DATABASE_URL = 'postgres://unused@127.0.0.1:1/unused';
const DOWN = { status: 'error', checks: { database: 'down' } };

async function createApp(database?: unknown): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({
    imports: [AppModule.forRoot({ DATABASE_URL: UNREACHABLE_DATABASE_URL })],
  });
  if (database) builder.overrideProvider(DATABASE).useValue(database);
  const app = (await builder.compile()).createNestApplication<
    INestApplication<App>
  >();
  configureApp(app);
  await app.init();
  return app;
}

describe('with an unreachable database', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health stays ok (liveness)', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/ready returns 503 with a fixed body', async () => {
    await request(app.getHttpServer())
      .get('/api/ready')
      .expect(503)
      .expect(DOWN);
  });
});

describe('GET /api/ready with a stubbed database', () => {
  it('returns 200 when the query succeeds', async () => {
    const query = vi
      .fn<(config: { query_timeout?: number }) => Promise<{ rows: [] }>>()
      .mockResolvedValue({ rows: [] });
    const app = await createApp({ $client: { query } });
    try {
      await request(app.getHttpServer())
        .get('/api/ready')
        .expect(200)
        .expect({ status: 'ok', checks: { database: 'up' } });
      // The check must be bounded by a driver-level timeout.
      expect(query.mock.calls[0]?.[0].query_timeout).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('returns 503 without internals when the query times out', async () => {
    const query = vi.fn(() =>
      Promise.reject(new Error('Query read timeout on db.internal:5432')),
    );
    const app = await createApp({ $client: { query } });
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
