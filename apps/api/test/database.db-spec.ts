import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
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
      await app.close();
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

const MIGRATION_COUNT = 5;
const MIGRATIONS_BEFORE_ADMIN_BOOTSTRAP = 2;

function migrationsUpTo(count: number): string {
  const folder = mkdtempSync(join(tmpdir(), 'shiori-migrations-'));
  cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
  const journalFile = join(folder, 'meta/_journal.json');
  const journal = z
    .object({ entries: z.array(z.object({ idx: z.number() }).loose()) })
    .loose()
    .parse(JSON.parse(readFileSync(journalFile, 'utf8')));
  writeFileSync(
    journalFile,
    JSON.stringify({
      ...journal,
      entries: journal.entries.filter((entry) => entry.idx < count),
    }),
  );
  return folder;
}

describe('committed migrations', () => {
  it('mark an installation that already has an admin as bootstrapped', async () => {
    const pool = new Pool({ connectionString: testDatabaseUrl() });
    const db = drizzle({ client: pool });
    const olderMigrations = migrationsUpTo(MIGRATIONS_BEFORE_ADMIN_BOOTSTRAP);
    try {
      await pool.query(
        'drop schema public cascade; create schema public; drop schema drizzle cascade',
      );
      await migrate(db, { migrationsFolder: olderMigrations });
      await pool.query(
        "insert into \"user\" (id, email, name, role) values ('a', 'admin@example.test', 'Admin', 'admin')",
      );

      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

      const { rows } = await pool.query('select id from admin_bootstrap');
      expect(rows).toEqual([{ id: 'initial' }]);
    } finally {
      await pool.query('truncate "user", admin_bootstrap cascade');
      await pool.end();
      rmSync(olderMigrations, { force: true, recursive: true });
    }
  });

  it('created the auth, invitation and kana attempt tables on the empty test database', async () => {
    const pool = new Pool({ connectionString: testDatabaseUrl() });
    try {
      const { rows } = await pool.query<{ table_name: string }>(
        "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
      );
      expect(rows.map((row) => row.table_name)).toEqual([
        'account',
        'admin_bootstrap',
        'invitation',
        'kana_attempt',
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
      expect(before.rowCount).toBe(MIGRATION_COUNT);
    } finally {
      await pool.end();
    }
  });
});
