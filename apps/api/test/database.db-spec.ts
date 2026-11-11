import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { loadRootEnvFile } from '../src/config/env.js';
import { configureApp } from '../src/configure-app.js';
import {
  DATABASE,
  type Database,
  DatabaseModule,
} from '../src/database/database.module.js';
import { isLocalDatabaseUrl } from '../src/database/local-url.js';

/** Only ever touch a local database whose name ends in `_test`. */
function assertSafeTestUrl(raw: string | undefined): string {
  if (!raw) throw new Error('TEST_DATABASE_URL is not set (see .env.example).');
  if (!isLocalDatabaseUrl(raw) || !new URL(raw).pathname.endsWith('_test')) {
    throw new Error(
      'Refusing to run: TEST_DATABASE_URL must be a local *_test database.',
    );
  }
  return raw;
}

describe('database', () => {
  it('refuses non-local or non-test databases', () => {
    expect(() =>
      assertSafeTestUrl('postgres://u:p@db.example.com:5432/shiori_test'),
    ).toThrow(/Refusing/);
    expect(() =>
      assertSafeTestUrl('postgres://u:p@127.0.0.1:5432/shiori'),
    ).toThrow(/Refusing/);
    expect(() =>
      assertSafeTestUrl(
        'postgres://u:p@127.0.0.1:5432/shiori_test?host=db.example.com',
      ),
    ).toThrow(/Refusing/);
  });

  it('runs a query through the configured pool and closes it', async () => {
    loadRootEnvFile();
    const url = assertSafeTestUrl(process.env.TEST_DATABASE_URL);
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ url })],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const db = app.get<Database>(DATABASE);
      const result = await db.execute(sql`select 1 as ok`);
      expect(result.rows).toEqual([{ ok: 1 }]);
    } finally {
      await app.close(); // runs onApplicationShutdown → pool.end()
    }
  });

  it('reports readiness through the real database', async () => {
    loadRootEnvFile();
    const url = assertSafeTestUrl(process.env.TEST_DATABASE_URL);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot({ DATABASE_URL: url })],
    }).compile();
    const app = moduleRef.createNestApplication<INestApplication<App>>();
    configureApp(app);
    await app.init();

    try {
      await request(app.getHttpServer())
        .get('/api/ready')
        .expect(200)
        .expect({ status: 'ok', checks: { database: 'up' } });
    } finally {
      await app.close();
    }
  });
});
