import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { ESLint } from 'eslint';

const root = path.resolve(import.meta.dirname, '..');
const RULE = 'shiori/comment-policy';
const options = {
  cwd: root,
  overrideConfig: {
    languageOptions: {
      parserOptions: { project: null, projectService: false },
    },
  },
  ruleFilter: ({ ruleId }) => ruleId === RULE,
};
const linter = new ESLint(options);
const fixer = new ESLint({ ...options, fix: true });

const API_FILE = 'apps/api/src/modules/example/example.ts';
const WEB_FILE = 'apps/web/src/domain/example/ui/example.tsx';
const SCRIPT_FILE = 'scripts/example.mjs';

async function reportedLines(file, code) {
  const [result] = await linter.lintText(code, {
    filePath: path.join(root, file),
  });
  return result.messages
    .filter((message) => message.ruleId === RULE)
    .map((message) => message.line);
}

async function rejects(file, code, lines = [1]) {
  assert.deepEqual(await reportedLines(file, code), lines, code);
}

async function accepts(file, code) {
  assert.deepEqual(await reportedLines(file, code), [], code);
}

describe('rejects unclassified comments', () => {
  test('line comments in TS, MJS and the root ESLint config', async () => {
    await rejects(API_FILE, '// Composition root.\nexport const x = 1;\n');
    await rejects(
      SCRIPT_FILE,
      '// Run: node example.mjs\nexport const x = 1;\n',
    );
    await rejects(
      'eslint.config.js',
      '// Architecture v1.\nexport default [];\n',
    );
  });

  test('block, narrative JSDoc and JSX comments', async () => {
    await rejects(API_FILE, '/* Shared pool. */\nexport const x = 1;\n');
    await rejects(
      API_FILE,
      '/** Exported separately so tests can vary single options. */\nexport const x = 1;\n',
    );
    await rejects(
      WEB_FILE,
      'export const Row = () => (\n  <div>\n    {/* Status rows */}\n  </div>\n);\n',
      [3],
    );
  });

  test('other prefixes, missing or thin payloads and wrong spelling', async () => {
    for (const comment of [
      '// NOTE: the pool is shared by every module.',
      '// IMPORTANT: the pool is shared by every module.',
      '// HACK: the pool is shared by every module.',
      '// M02.1: the pool is shared by every module.',
      '// TODO:',
      '// TODO: fix it',
      '// TODO fix the pool sharing later',
      '// todo: fix the pool sharing later',
      '// INVARIANT the pool is shared by every module.',
    ]) {
      await rejects(API_FILE, `${comment}\nexport const x = 1;\n`);
    }
  });

  test('COMPAT and WORKAROUND must name the dependency or protocol', async () => {
    await rejects(
      API_FILE,
      '// COMPAT: Test mode disables Origin verification by default.\nexport const x = 1;\n',
    );
    await rejects(
      API_FILE,
      '// WORKAROUND: Pin the parser until upstream ships a fix.\nexport const x = 1;\n',
    );
  });

  test('a continuation line does not rescue an unclassified comment', () =>
    rejects(
      API_FILE,
      '// The pool is shared.\n// TODO is mentioned here only.\nexport const x = 1;\n',
      [1, 2],
    ));

  test('JSDoc type tags with prose, or in TypeScript, are not exempt', async () => {
    await rejects(
      SCRIPT_FILE,
      '/** @param {string} name the file to read */\nexport const read = (name) => name;\n',
    );
    await rejects(
      SCRIPT_FILE,
      '/**\n * Reads a file.\n * @param {string} name\n */\nexport const read = (name) => name;\n',
    );
    await rejects(
      API_FILE,
      '/** @param {string} name */\nexport const read = (name: string) => name;\n',
    );
  });

  test('ESLint directives need a `--` justification', () =>
    rejects(
      SCRIPT_FILE,
      '// eslint-disable-next-line no-console\nconsole.log(1);\n',
    ));
});

describe('accepts classified comments and narrow technical exceptions', () => {
  test('the five markers, with optional references', async () => {
    for (const comment of [
      '// TODO(SHI-123): Add recovery emails when SMTP setup is supported.',
      '// FIXME: Prevent duplicate invitations under concurrent requests.',
      '// WORKAROUND(package@1.2.3): Use X until upstream fixes Y; remove after upgrade.',
      '// INVARIANT: Consume an invitation atomically with user creation.',
      '// COMPAT(better-auth@1.7.23): Test mode disables Origin verification by default.',
      '/* INVARIANT: Consume an invitation atomically with user creation. */',
    ]) {
      await accepts(API_FILE, `${comment}\nexport const x = 1;\n`);
    }
  });

  test('a classified comment may continue on the next line', () =>
    accepts(
      API_FILE,
      '// COMPAT(better-auth@1.7.23): Test mode disables Origin verification,\n// so the tests re-enable it explicitly.\nexport const x = 1;\n',
    ));

  test('classified JSX comments', () =>
    accepts(
      WEB_FILE,
      'export const Row = () => (\n  <div>\n    {/* TODO(SHI-9): Show the retry button once retries exist. */}\n  </div>\n);\n',
    ));

  test('type-only JSDoc in JS/MJS', async () => {
    await accepts(
      SCRIPT_FILE,
      '/** @param {string} left @param {Record<string, { a: string[] }>} right @returns {boolean} */\nexport const same = (left, right) => left in right;\n',
    );
    await accepts(
      SCRIPT_FILE,
      '/**\n * @template T\n * @param {T[]} [items]\n * @returns {T | undefined}\n */\nexport const first = (items = []) => items[0];\n',
    );
    await accepts(
      SCRIPT_FILE,
      "/** @import { ESLint } from 'eslint' */\n/** @type {ESLint | undefined} */\nexport let linter;\n",
    );
  });

  test('license notices, triple-slash references, shebangs and justified directives', async () => {
    await accepts(
      API_FILE,
      '/*! Example Library v1.0 | (c) Example Authors | MIT License */\nexport const x = 1;\n',
    );
    await accepts(
      API_FILE,
      '// SPDX-License-Identifier: MIT\nexport const x = 1;\n',
    );
    await accepts(
      'apps/web/src/example.d.ts',
      '/// <reference types="vite/client" />\nexport {};\n',
    );
    await accepts(SCRIPT_FILE, '#!/usr/bin/env node\nexport const x = 1;\n');
    await accepts(
      SCRIPT_FILE,
      '// eslint-disable-next-line no-console -- CLI output is the product here.\nconsole.log(1);\n',
    );
  });
});

describe('scope and autofix', () => {
  test('generated client output is not linted', async () => {
    const [result] = await linter.lintText('// Generated.\nexport {};\n', {
      filePath: path.join(root, 'packages/api-client/src/generated/sdk.gen.ts'),
    });
    assert.ok(result.messages.every((message) => message.ruleId !== RULE));
  });

  test('lint --fix never deletes or rewrites a rejected comment', async () => {
    const code = '// Composition root.\nexport const x = 1;\n';
    const [result] = await fixer.lintText(code, {
      filePath: path.join(root, API_FILE),
    });
    assert.equal(result.output ?? code, code);
    assert.deepEqual(
      result.messages.map((message) => message.ruleId),
      [RULE],
    );
  });
});
