import { spawnSync } from 'node:child_process';
import { constants, copyFileSync, existsSync } from 'node:fs';
import { isLocalDatabaseUrl } from '../apps/api/src/infrastructure/database/local-url.ts';

const root = new URL('..', import.meta.url);
const envFile = new URL('.env', root);
const exampleFile = new URL('.env.example', root);

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function checkDatabaseEnv(env) {
  const raw = env.DATABASE_URL;
  if (!raw) return ['DATABASE_URL is not set.'];
  if (!isLocalDatabaseUrl(raw)) {
    return [
      'DATABASE_URL must point to this machine (localhost/127.0.0.1, no query parameters). ' +
        'Migrations only run automatically against a local database.',
    ];
  }
  const url = new URL(raw);
  const problems = [];
  if ((url.port || '5432') !== (env.POSTGRES_PORT || '55432')) {
    problems.push('DATABASE_URL port does not match POSTGRES_PORT.');
  }
  if (decodeURIComponent(url.username) !== env.POSTGRES_USER) {
    problems.push('DATABASE_URL user does not match POSTGRES_USER.');
  }
  if (decodeURIComponent(url.password) !== env.POSTGRES_PASSWORD) {
    problems.push('DATABASE_URL password does not match POSTGRES_PASSWORD.');
  }
  if (url.pathname.slice(1) !== env.POSTGRES_DB) {
    problems.push('DATABASE_URL database does not match POSTGRES_DB.');
  }
  return problems;
}

const REQUIRED_AUTH_VARIABLES = ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'];

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function checkAuthEnv(env) {
  return REQUIRED_AUTH_VARIABLES.filter((name) => !env[name]).map(
    (name) => `${name} is not set (copy it from .env.example).`,
  );
}

/** @param {string} message @returns {never} */
function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** @param {string} command @param {string[]} args @param {boolean} [show] */
function run(command, args, show = false) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: show ? 'inherit' : 'pipe',
    // COMPAT(node@26 on Windows): pnpm is a .cmd shim, which spawn() runs only with shell: true.
    shell: process.platform === 'win32' && command === 'pnpm',
  });
}

function main() {
  console.log('› Checking Docker');
  const docker = run('docker', ['version', '--format', '{{.Server.Version}}']);
  if (docker.error) {
    fail(
      'Docker is not installed (`docker` not found). Install Docker Desktop, then rerun `pnpm dev`.',
    );
  }
  if (docker.status !== 0) {
    fail(
      'Docker is installed but not running. Start Docker Desktop, then rerun `pnpm dev`.',
    );
  }
  if (run('docker', ['compose', 'version']).status !== 0) {
    fail(
      'Docker Compose v2 (`docker compose`) is not available. Update Docker Desktop.',
    );
  }

  if (!existsSync(envFile)) {
    copyFileSync(exampleFile, envFile, constants.COPYFILE_EXCL);
    console.log('› Created .env from .env.example (fake, local-only values).');
  }
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    fail(
      `.env could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const problems = [
    ...checkDatabaseEnv(process.env),
    ...checkAuthEnv(process.env),
  ];
  if (problems.length > 0) {
    fail(
      `.env is inconsistent:\n  - ${problems.join('\n  - ')}\nCompare it with .env.example.`,
    );
  }
  const config = run('docker', ['compose', 'config', '--quiet']);
  if (config.status !== 0) {
    fail(
      `compose.yaml cannot be resolved with your .env:\n${config.stderr.trim()}`,
    );
  }

  console.log('› Starting PostgreSQL');
  if (
    run('docker', ['compose', 'up', '-d', '--wait', 'postgres'], true)
      .status !== 0
  ) {
    fail(
      'PostgreSQL did not become healthy. See `docker compose logs postgres`.',
    );
  }

  console.log('› Applying committed migrations');
  if (run('pnpm', ['--filter', 'api', 'db:migrate'], true).status !== 0) {
    fail('Migrations failed, so the app servers were not started.');
  }

  console.log('› Database ready. Starting web and API…\n');
}

if (import.meta.main) main();
