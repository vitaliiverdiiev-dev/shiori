import { defineConfig } from 'drizzle-kit';
import {
  loadDatabaseEnv,
  loadRootEnvFile,
} from './src/infrastructure/config/env.js';

loadRootEnvFile();

export const connection = {
  dbCredentials: { url: loadDatabaseEnv().DATABASE_URL },
  dialect: 'postgresql',
} as const;

export default defineConfig({
  ...connection,
  out: './drizzle',
  schema: [
    './src/modules/*/persistence/schemas/*.schema.ts',
    './src/modules/*/*/persistence/schemas/*.schema.ts',
  ],
  strict: true,
});
