// Run: node --test "scripts/*.test.mjs"
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDatabaseEnv } from './dev-setup.mjs';

const env = {
  POSTGRES_USER: 'shiori',
  POSTGRES_PASSWORD: 'fake-pass',
  POSTGRES_DB: 'shiori',
  POSTGRES_PORT: '55432',
  DATABASE_URL: 'postgres://shiori:fake-pass@127.0.0.1:55432/shiori',
};

test('accepts a consistent local configuration', () => {
  assert.deepEqual(checkDatabaseEnv(env), []);
});

test('defaults POSTGRES_PORT to 55432 like compose.yaml', () => {
  assert.deepEqual(checkDatabaseEnv({ ...env, POSTGRES_PORT: undefined }), []);
});

test('reports mismatches by variable name only', () => {
  const problems = checkDatabaseEnv({
    ...env,
    DATABASE_URL: 'postgres://other:wrong-pass@127.0.0.1:5432/other',
  });
  assert.equal(problems.length, 4);
  assert.ok(problems.every((p) => !p.includes('wrong-pass')));
});

test('refuses non-local or parameter-overridden URLs', () => {
  for (const url of [
    'postgres://shiori:fake-pass@db.example.com:55432/shiori',
    'postgres://shiori:fake-pass@127.0.0.1:55432/shiori?host=db.example.com',
  ]) {
    assert.match(
      checkDatabaseEnv({ ...env, DATABASE_URL: url })[0] ?? '',
      /this machine/,
    );
  }
});

test('requires DATABASE_URL', () => {
  assert.deepEqual(checkDatabaseEnv({ ...env, DATABASE_URL: undefined }), [
    'DATABASE_URL is not set.',
  ]);
});
