import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { diffTrees, findDrift } from './api-check.mjs';

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

/** @param {Record<string, string>} files @returns {(outputRoot: string) => void} */
function writes(files) {
  return (outputRoot) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(outputRoot, path, '..'), { recursive: true });
      writeFileSync(join(outputRoot, path), content);
    }
  };
}

test('generates outside the checked tree and leaves it untouched', () => {
  const root = tree(current);
  let outputRoot = '';
  const drift = findDrift({
    generate: (output) => {
      outputRoot = output;
      writes({ ...current, 'generated/sdk.gen.ts': 'export const a = 2;' })(
        output,
      );
    },
    paths: PATHS,
    root,
  });

  assert.deepEqual(drift, ['generated/sdk.gen.ts']);
  assert.notEqual(outputRoot, root);
  assert.equal(
    readFileSync(join(root, 'generated/sdk.gen.ts'), 'utf8'),
    'export const a = 1;',
  );
  assert.equal(existsSync(outputRoot), false);
});

test('a failed generation still leaves the tree untouched and cleans up', () => {
  const root = tree(current);
  let outputRoot = '';
  assert.throws(
    () =>
      findDrift({
        generate: (output) => {
          outputRoot = output;
          writes({ 'generated/sdk.gen.ts': 'partial' })(output);
          throw new Error('generator crashed');
        },
        paths: PATHS,
        root,
      }),
    /generator crashed/,
  );
  assert.equal(
    readFileSync(join(root, 'generated/sdk.gen.ts'), 'utf8'),
    'export const a = 1;',
  );
  assert.equal(existsSync(outputRoot), false);
});
