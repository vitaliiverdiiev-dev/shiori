import { drizzle } from 'drizzle-orm/node-postgres';
import { loadEnv, loadRootEnvFile } from './infrastructure/config/env.js';
import { createPool } from './infrastructure/database/database.module.js';
import { errorCode } from './infrastructure/database/postgres-errors.js';
import {
  createTerminalIo,
  TerminalInputClosedError,
} from './infrastructure/terminal/terminal-io.js';
import { runAuthCli } from './modules/auth/cli/auth.cli.js';
import {
  authSettingsFromEnv,
  createAuth,
} from './modules/auth/integrations/auth.config.js';

loadRootEnvFile();
const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const db = drizzle({ client: pool });
const io = createTerminalIo();
const [, , ...args] = process.argv;

try {
  process.exitCode = await runAuthCli(args, {
    auth: createAuth(db, authSettingsFromEnv(env)),
    db,
    io,
  });
} catch (error) {
  const code = errorCode(error);
  io.error(
    error instanceof TerminalInputClosedError
      ? 'Cancelled. Nothing was changed.'
      : `Command failed${code ? ` (${code})` : ''}. Is the database running and migrated (pnpm db:migrate)?`,
  );
  process.exitCode = 1;
} finally {
  io.close();
  await pool.end();
}
