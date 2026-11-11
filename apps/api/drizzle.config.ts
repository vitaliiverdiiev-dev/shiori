import { defineConfig } from 'drizzle-kit';
import { loadEnv, loadRootEnvFile } from './src/config/env.js';

loadRootEnvFile();

/** Database connection, shared with drizzle.studio.config.ts. */
export const connection = {
  dialect: 'postgresql',
  dbCredentials: { url: loadEnv().DATABASE_URL },
} as const;

export default defineConfig({
  ...connection,
  // Each feature owns its tables in a colocated `*.schema.ts` file.
  schema: './src/**/*.schema.ts',
  out: './drizzle',
  strict: true,
});
