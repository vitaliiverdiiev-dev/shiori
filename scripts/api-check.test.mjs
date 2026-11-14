import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { diffTrees } from './api-check.mjs';

const PATHS = ['contract.json', 'generated'];
const temporaryRoots = [];

/** @param {Record<string, string>} files */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'api-check-test-'));
  temporaryRoots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

const current = {
  'contract.json': '{}',
  'generated/client/index.ts': 'export {};',
  'generated/sdk.gen.ts': 'export const a = 1;',
};

test('reports no drift when the regenerated files are identical', () => {
  assert.deepEqual(diffTrees(tree(current), tree(current), PATHS), []);
});

test('reports changed, added and removed generated files', () => {
  const regenerated = tree({
    'contract.json': '{"paths":{}}',
    'generated/client/index.ts': 'export {};',
    'generated/types.gen.ts': 'export type A = 1;',
  });
  assert.deepEqual(diffTrees(tree(current), regenerated, PATHS), [
    'contract.json',
    'generated/sdk.gen.ts',
    'generated/types.gen.ts',
  ]);
});

test('ignores files outside the generated paths', () => {
  const regenerated = tree({ ...current, 'README.md': 'changed' });
  assert.deepEqual(diffTrees(tree(current), regenerated, PATHS), []);
});
