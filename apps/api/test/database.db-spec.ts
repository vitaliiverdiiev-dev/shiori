import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  DATABASE,
  type Database,
  DatabaseModule,
} from '../src/infrastructure/database/database.module.js';
import { createTestApp } from './support/app.js';
import {
  assertSafeTestUrl,
  MIGRATIONS_FOLDER,
  testDatabaseUrl,
} from './support/test-database.js';

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
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ url: testDatabaseUrl() })],
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
    const app = await createTestApp(testDatabaseUrl());
    try {
      await request(app.getHttpServer())
        .get('/api/ready')
        .expect(200)
        .expect({ checks: { database: 'up' }, status: 'ok' });
    } finally {
      await app.close();
    }
  });
});

describe('committed migrations', () => {
  it('created the auth tables on the empty test database', async () => {
    const pool = new Pool({ connectionString: testDatabaseUrl() });
    try {
      const { rows } = await pool.query<{ table_name: string }>(
        "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
      );
      expect(rows.map((row) => row.table_name)).toEqual([
        'account',
        'session',
        'user',
        'verification',
      ]);
    } finally {
      await pool.end();
    }
  });

  it('are a no-op when applied again', async () => {
    const pool = new Pool({ connectionString: testDatabaseUrl() });
    try {
      const applied = () =>
        pool.query('select hash from drizzle.__drizzle_migrations');
      const before = await applied();
      await migrate(drizzle({ client: pool }), {
        migrationsFolder: MIGRATIONS_FOLDER,
      });
      expect((await applied()).rows).toEqual(before.rows);
      expect(before.rowCount).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
