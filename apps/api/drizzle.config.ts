import { defineConfig } from 'drizzle-kit';
import { loadEnv, loadRootEnvFile } from './src/infrastructure/config/env.js';

loadRootEnvFile();

/** Database connection, shared with drizzle.studio.config.ts. */
export const connection = {
  dbCredentials: { url: loadEnv().DATABASE_URL },
  dialect: 'postgresql',
} as const;

export default defineConfig({
  ...connection,
  out: './drizzle',
  // Each feature owns its tables in a colocated `*.schema.ts` file.
  schema: './src/**/*.schema.ts',
  strict: true,
});
