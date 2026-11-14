// Fails when the working-tree API contract or generated client differ from a
// fresh `pnpm api:generate`, whether or not they are committed. The working
// tree is restored afterwards, so the check never rewrites files.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const GENERATED_PATHS = [
  'apps/api/openapi.json',
  'packages/api-client/src/generated',
];

/**
 * Generated files that differ, appear or disappear between two roots.
 * @param {string} expectedRoot @param {string} actualRoot @param {string[]} paths
 * @returns {string[]}
 */
export function diffTrees(expectedRoot, actualRoot, paths) {
  const files = new Set(
    paths.flatMap((path) => [
      ...listFiles(expectedRoot, path),
      ...listFiles(actualRoot, path),
    ]),
  );
  return [...files]
    .filter(
      (file) => !sameFile(join(expectedRoot, file), join(actualRoot, file)),
    )
    .sort();
}

/** @param {string} base @param {string} path @returns {string[]} */
function listFiles(base, path) {
  const absolute = join(base, path);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) return [path];
  return readdirSync(absolute, { recursive: true })
    .map((entry) => join(absolute, String(entry)))
    .filter((file) => statSync(file).isFile())
    .map((file) => relative(base, file).split(sep).join('/'));
}

/** @param {string} left @param {string} right */
function sameFile(left, right) {
  return (
    existsSync(left) &&
    existsSync(right) &&
    readFileSync(left).equals(readFileSync(right))
  );
}

/** @param {string} from @param {string} to */
function copyPaths(from, to) {
  for (const path of GENERATED_PATHS) {
    rmSync(join(to, path), { force: true, recursive: true });
    if (existsSync(join(from, path))) {
      cpSync(join(from, path), join(to, path), { recursive: true });
    }
  }
}

function main() {
  const snapshot = mkdtempSync(join(tmpdir(), 'shiori-api-check-'));
  try {
    copyPaths(root, snapshot);
    const generation = spawnSync('pnpm', ['api:generate'], {
      cwd: root,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    if (generation.status !== 0) {
      console.error('\n✖ pnpm api:generate failed.\n');
      process.exitCode = 1;
      return;
    }
    const drift = diffTrees(snapshot, root, GENERATED_PATHS);
    if (drift.length > 0) {
      console.error(
        `\n✖ Generated API files are stale; run \`pnpm api:generate\`:\n  - ${drift.join('\n  - ')}\n`,
      );
      process.exitCode = 1;
      return;
    }
    console.log('\n✔ API contract and client match a fresh generation.\n');
  } finally {
    copyPaths(snapshot, root);
    rmSync(snapshot, { force: true, recursive: true });
  }
}

if (import.meta.main) main();
