import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { MIGRATIONS_FOLDER, testDatabaseUrl } from './test-database.js';

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
