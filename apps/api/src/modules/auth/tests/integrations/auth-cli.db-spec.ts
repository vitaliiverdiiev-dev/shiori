import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { TEST_AUTH_ENV } from '#test/support/app.js';
import { testDatabaseUrl } from '#test/support/test-database.js';
import type { CliIo } from '../../cli/auth-cli.types.js';
import { runAuthCli } from '../../cli/auth.cli.js';
import { createAuth } from '../../integrations/better-auth/config/better-auth.config.js';
import { hashInvitationCode } from '../../model/helpers/invitation-code.js';

const PASSWORD = 'an admin passphrase that is long';
const pool = new Pool({ connectionString: testDatabaseUrl() });
const db = drizzle({ client: pool });
const auth = createAuth(db, {
  baseURL: TEST_AUTH_ENV.BETTER_AUTH_URL,
  rateLimit: false,
  registrationMode: 'closed',
  secret: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
});

async function roles() {
  const { rows } = await pool.query<{ email: string; role: string }>(
    'select email, role from "user"',
  );
  return rows;
}

function run(args: string[], answers: string[] = []) {
  const terminal = scriptedIo(answers);
  return runAuthCli(args, { auth, db, io: terminal.io }).then((exitCode) => ({
    exitCode,
    ...terminal,
  }));
}

function scriptedIo(answers: string[]) {
  const output: string[] = [];
  const secretPrompts: string[] = [];
  const next = () => Promise.resolve(answers.shift() ?? '');
  const io: CliIo = {
    ask: (question) => {
      output.push(question);
      return next();
    },
    askSecret: (question) => {
      secretPrompts.push(question);
      return next();
    },
    error: (message) => output.push(message),
    print: (message) => output.push(message),
  };
  return { io, output, secretPrompts, text: () => output.join('\n') };
}

afterEach(async () => {
  await pool.query(
    'truncate "user", verification, invitation, admin_bootstrap cascade',
  );
});

afterAll(async () => {
  await pool.end();
});

describe('bootstrap-admin', () => {
  const answers = ['Admin Test', 'admin@example.test', PASSWORD, PASSWORD];

  it('creates the first admin from prompts and never echoes the password', async () => {
    const result = await run(['bootstrap-admin'], [...answers]);

    expect(result.exitCode).toBe(0);
    expect(result.secretPrompts).toHaveLength(2);
    expect(result.text()).not.toContain(PASSWORD);
    expect(await roles()).toEqual([
      { email: 'admin@example.test', role: 'admin' },
    ]);
  });

  it('refuses a second bootstrap', async () => {
    await run(['bootstrap-admin'], [...answers]);
    const second = await run(
      ['bootstrap-admin'],
      ['Other', 'other@example.test', PASSWORD, PASSWORD],
    );
    expect(second.exitCode).toBe(1);
    expect(second.text()).toMatch(/only happen once/i);
    expect(await roles()).toHaveLength(1);
  });

  it('refuses mismatched passwords', async () => {
    const result = await run(
      ['bootstrap-admin'],
      ['Admin Test', 'admin@example.test', PASSWORD, `${PASSWORD}!`],
    );
    expect(result.exitCode).toBe(1);
    expect(await roles()).toEqual([]);
  });

  it('accepts no arguments, so secrets never reach argv', async () => {
    const result = await run(['bootstrap-admin', '--password', PASSWORD]);
    expect(result.exitCode).toBe(1);
    expect(result.secretPrompts).toEqual([]);
    expect(await roles()).toEqual([]);
  });
});

describe('invite', () => {
  it('creates an invitation and shows its code exactly once', async () => {
    const created = await run(['invite', 'create', 'Bob@Example.test']);

    expect(created.exitCode).toBe(0);
    const { rows } = await pool.query<{ code_hash: string }>(
      'select code_hash from invitation',
    );
    const code = created.output
      .flatMap((line) => /[\w-]{43}/.exec(line) ?? [])
      .find(
        (candidate) => hashInvitationCode(candidate) === rows[0]?.code_hash,
      );
    expect(code).toBeDefined();

    const listed = await run(['invite', 'list']);
    expect(listed.exitCode).toBe(0);
    expect(listed.text()).toContain('bob@example.test');
    expect(listed.text()).toContain('active');
    expect(listed.text()).not.toContain(code);
    expect(listed.text()).not.toContain(rows[0]?.code_hash);
  });

  it('revokes an active invitation once', async () => {
    await run(['invite', 'create', 'bob@example.test']);
    const { rows } = await pool.query<{ id: string }>(
      'select id from invitation',
    );
    const id = rows[0]?.id ?? '';

    expect((await run(['invite', 'revoke', id])).exitCode).toBe(0);
    expect((await run(['invite', 'revoke', id])).exitCode).toBe(1);
    expect((await run(['invite', 'list'])).text()).toContain('revoked');
  });

  it('explains invalid input without creating anything', async () => {
    const invalid = await run(['invite', 'create', 'not-an-email']);
    const missing = await run(['invite', 'create']);
    expect(invalid.exitCode).toBe(1);
    expect(missing.exitCode).toBe(1);
    const { rows } = await pool.query('select 1 from invitation');
    expect(rows).toEqual([]);
  });
});

describe('usage', () => {
  it('rejects an unknown command with usage help', async () => {
    const result = await run(['make-me-admin']);
    expect(result.exitCode).toBe(1);
    expect(result.text()).toMatch(/usage/i);
  });
});
