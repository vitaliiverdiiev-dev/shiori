import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { MIGRATIONS_FOLDER, testDatabaseUrl } from './test-database.js';

/**
 * Vitest global setup for `pnpm test:db`: start every run from an empty
 * *_test database and apply the committed migrations, as a fresh install would.
 */
export default async function setup(): Promise<void> {
  const pool = new Pool({ connectionString: testDatabaseUrl() });
  try {
    await pool.query(
      'drop schema if exists drizzle cascade; drop schema public cascade; create schema public;',
    );
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } finally {
    await pool.end();
  }
}
