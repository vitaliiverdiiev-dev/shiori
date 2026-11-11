import { defineConfig } from 'drizzle-kit';
import { loadEnv, loadRootEnvFile } from './src/config/env.js';

loadRootEnvFile();

export default defineConfig({
  dialect: 'postgresql',
  // Each feature owns its tables in a colocated `*.schema.ts` file.
  schema: './src/**/*.schema.ts',
  out: './drizzle',
  dbCredentials: { url: loadEnv().DATABASE_URL },
  strict: true,
});
