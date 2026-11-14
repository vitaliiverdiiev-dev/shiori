import { loadRootEnvFile } from '../../src/infrastructure/config/env.js';
import { isLocalDatabaseUrl } from '../../src/infrastructure/database/local-url.js';

export const MIGRATIONS_FOLDER = new URL('../../drizzle', import.meta.url)
  .pathname;

export function assertSafeTestUrl(raw: string | undefined): string {
  if (!raw) throw new Error('TEST_DATABASE_URL is not set (see .env.example).');
  if (!isLocalDatabaseUrl(raw) || !new URL(raw).pathname.endsWith('_test')) {
    throw new Error(
      'Refusing to run: TEST_DATABASE_URL must be a local *_test database.',
    );
  }
  return raw;
}

export function testDatabaseUrl(): string {
  loadRootEnvFile();
  return assertSafeTestUrl(process.env.TEST_DATABASE_URL);
}
