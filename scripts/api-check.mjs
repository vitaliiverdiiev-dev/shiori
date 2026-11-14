import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const OPENAPI_FILE = 'apps/api/openapi.json';
const CLIENT_DIR = 'packages/api-client/src/generated';
const GENERATED_PATHS = [OPENAPI_FILE, CLIENT_DIR];

/**
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

/**
 * @param {{ generate: (outputRoot: string) => void, paths: string[], root: string }} options
 * @returns {string[]}
 */
export function findDrift({ generate, paths, root }) {
  const outputRoot = mkdtempSync(join(tmpdir(), 'shiori-api-check-'));
  try {
    generate(outputRoot);
    return diffTrees(outputRoot, root, paths);
  } finally {
    rmSync(outputRoot, { force: true, recursive: true });
  }
}

/** @param {string} outputRoot */
function generateInto(outputRoot) {
  const openapiFile = join(outputRoot, OPENAPI_FILE);
  mkdirSync(dirname(openapiFile), { recursive: true });
  pnpm(['--filter', 'api', 'run', 'openapi', openapiFile]);

  const clientConfig = join(outputRoot, 'openapi-ts.config.mjs');
  const baseConfig = join(root, 'packages/api-client/openapi-ts.config.ts');
  writeFileSync(
    clientConfig,
    [
      `import baseConfig from ${JSON.stringify(baseConfig)};`,
      'const config = await baseConfig;',
      `export default { ...config, input: ${JSON.stringify(openapiFile)}, output: { ...config.output, path: ${JSON.stringify(join(outputRoot, CLIENT_DIR))} } };`,
      '',
    ].join('\n'),
  );
  pnpm([
    '--filter',
    '@shiori/api-client',
    'exec',
    'openapi-ts',
    '--file',
    clientConfig,
  ]);
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

function main() {
  let drift;
  try {
    drift = findDrift({ generate: generateInto, paths: GENERATED_PATHS, root });
  } catch (error) {
    console.error(
      `\n✖ API generation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
    return;
  }
  if (drift.length > 0) {
    console.error(
      `\n✖ Generated API files are stale; run \`pnpm api:generate\`:\n  - ${drift.join('\n  - ')}\n`,
    );
    process.exitCode = 1;
    return;
  }
  console.log('\n✔ API contract and client match a fresh generation.\n');
}

/** @param {string[]} args */
function pnpm(args) {
  const result = spawnSync('pnpm', args, {
    cwd: root,
    // COMPAT(node@26 on Windows): pnpm is a .cmd shim, which spawn() runs only with shell: true.
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`pnpm ${args.join(' ')} failed`);
}

/** @param {string} left @param {string} right */
function sameFile(left, right) {
  return (
    existsSync(left) &&
    existsSync(right) &&
    readFileSync(left).equals(readFileSync(right))
  );
}

if (import.meta.main) main();
