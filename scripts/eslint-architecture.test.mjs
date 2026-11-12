// Proves the Architecture v1 lint rules (eslint.config.js) by linting inline
// samples at virtual paths: nothing is written to the source tree.
// Run: node --test "scripts/*.test.mjs"
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { ESLint } from 'eslint';

const root = path.resolve(import.meta.dirname, '..');

// Virtual files are not in any tsconfig, so lint them without type information
// and skip the type-aware typescript-eslint rules (covered by `pnpm lint`).
const options = {
  cwd: root,
  overrideConfig: {
    languageOptions: {
      parserOptions: { project: null, projectService: false },
    },
  },
  ruleFilter: ({ ruleId }) =>
    !ruleId.startsWith('@typescript-eslint/') ||
    ruleId === '@typescript-eslint/no-magic-numbers',
};
const linter = new ESLint(options);
const fixer = new ESLint({ ...options, fix: true });

/** Rule ids reported for `code` linted as if it lived at `file`. */
async function ruleIds(file, code) {
  const [result] = await linter.lintText(code, {
    filePath: path.join(root, file),
  });
  return result.messages.map((message) => message.ruleId ?? message.message);
}

async function fixed(file, code) {
  const [result] = await fixer.lintText(code, {
    filePath: path.join(root, file),
  });
  return result.output ?? code;
}

async function rejects(file, code, ruleId) {
  assert.ok(
    (await ruleIds(file, code)).includes(ruleId),
    `${file} should report ${ruleId}`,
  );
}

async function passes(file, code) {
  assert.deepEqual(await ruleIds(file, code), [], `${file} should pass`);
}

const WEB = 'apps/web/src';
const API = 'apps/api/src';
const BOUNDARIES = 'boundaries/dependencies';
const SYNTAX = 'no-restricted-syntax';
const IMPORTS = 'no-restricted-imports';

describe('frontend layers and slices', () => {
  test('shared must not import domain', () =>
    rejects(
      `${WEB}/shared/helpers/example.ts`,
      "import { HealthStatus } from '@/domain/health';\nexport const x = HealthStatus;\n",
      BOUNDARIES,
    ));

  test('domain must not import pages', () =>
    rejects(
      `${WEB}/domain/health/helpers/example.ts`,
      "import { HomePage } from '@/pages/home';\nexport const x = HomePage;\n",
      BOUNDARIES,
    ));

  test('pages must not deep-import a domain slice (alias or relative)', async () => {
    await rejects(
      `${WEB}/pages/home/example.ts`,
      "import { checkStatus } from '@/domain/health/api/requests';\nexport const x = checkStatus;\n",
      BOUNDARIES,
    );
    await rejects(
      `${WEB}/pages/home/example.ts`,
      "import { checkStatus } from '../../domain/health/api/requests';\nexport const x = checkStatus;\n",
      BOUNDARIES,
    );
  });

  test('a sibling domain slice must not deep-import model/types', () =>
    rejects(
      `${WEB}/domain/other/example.ts`,
      "import type { Status } from '@/domain/health/model/types';\nexport type X = Status;\n",
      BOUNDARIES,
    ));

  test('shared/ui is consumed through its index.ts only', () =>
    rejects(
      `${WEB}/pages/home/example.ts`,
      "import { Button } from '@/shared/ui/primitives/button/button';\nexport const x = Button;\n",
      BOUNDARIES,
    ));

  test('only app imports the product config alias', () =>
    rejects(
      `${WEB}/pages/home/example.ts`,
      "import product from '@/product-config';\nexport const x = product;\n",
      BOUNDARIES,
    ));

  test('relative imports climb at most two levels', () =>
    rejects(
      `${WEB}/domain/health/model/example.ts`,
      "import { Button } from '../../../shared/ui';\nexport const x = Button;\n",
      IMPORTS,
    ));

  // Boundaries resolves each import to a real file, so both spellings hit the
  // same rule. Targets must exist: unresolved paths are not elements (and fail
  // typecheck anyway), so store/ and pages/<slice>/{api,…} have no fixture yet.
  describe("model/ never imports its slice's HOW segments", () => {
    const domainModel = `${WEB}/domain/health/model/example.ts`;
    const pageModel = `${WEB}/pages/home/model/example.ts`;
    const use = (line) => `${line}\nexport const x = 1;\n`;

    for (const [segment, target, name] of [
      ['api', 'api/requests', 'checkStatus'],
      ['helpers', 'helpers/helpers', 'isRecord'],
      ['hooks', 'hooks/use-health-status', 'useHealthStatus'],
      ['ui', 'ui/status-row', 'StatusRow'],
    ]) {
      test(`${segment}: relative and @/ alias`, async () => {
        await rejects(
          domainModel,
          use(`import { ${name} } from '../${target}';`),
          BOUNDARIES,
        );
        await rejects(
          domainModel,
          use(`import { ${name} } from '@/domain/health/${target}';`),
          BOUNDARIES,
        );
      });
    }

    test('re-exports and literal dynamic import() are covered', async () => {
      await rejects(
        domainModel,
        "export { checkStatus } from '@/domain/health/api/requests';\n",
        BOUNDARIES,
      );
      await rejects(
        domainModel,
        "export const load = () => import('@/domain/health/helpers/helpers');\n",
        BOUNDARIES,
      );
    });

    test('nor its slice root, its own index.ts, shared/ui or React', async () => {
      await rejects(
        domainModel,
        use("import { HealthStatus } from '@/domain/health';"),
        BOUNDARIES,
      );
      await rejects(
        pageModel,
        use("import { HomePage } from '../home-page';"),
        BOUNDARIES,
      );
      await rejects(
        pageModel,
        use("import { HomePage } from '@/pages/home/home-page';"),
        BOUNDARIES,
      );
      await rejects(
        domainModel,
        use("import { Button } from '@/shared/ui';"),
        BOUNDARIES,
      );
      await rejects(
        domainModel,
        use("import { useState } from 'react';"),
        IMPORTS,
      );
    });

    test('valid: own model files and non-React shared helpers', async () => {
      await passes(
        domainModel,
        "import type { Status } from './types';\nexport type X = Status;\n",
      );
      await passes(
        domainModel,
        "import type { Status } from '@/domain/health/model/types';\nexport type X = Status;\n",
      );
      await passes(
        domainModel,
        "import { cn } from '@/shared/helpers/cn';\nexport const x = cn;\n",
      );
    });

    test("valid: helpers, hooks and ui import their slice's model", async () => {
      await passes(
        `${WEB}/domain/health/helpers/example.ts`,
        "import type { Status } from '@/domain/health/model/types';\nexport type X = Status;\n",
      );
      await passes(
        `${WEB}/domain/health/hooks/example.ts`,
        "import { CHECKING } from '../model/consts';\nexport const x = CHECKING;\n",
      );
      await passes(
        `${WEB}/domain/health/index.ts`,
        "export type { Status } from './model/types';\n",
      );
    });

    test("another slice must not import a slice's model directly", () =>
      rejects(
        `${WEB}/pages/home/example.ts`,
        "import { CHECKING } from '@/domain/health/model/consts';\nexport const x = CHECKING;\n",
        BOUNDARIES,
      ));
  });

  test('no internal index.ts barrels', () =>
    rejects(
      `${WEB}/domain/health/model/index.ts`,
      "export { CHECKING } from './consts';\n",
      SYNTAX,
    ));

  test('valid: pages use public slice APIs, app reads the product config', async () => {
    await passes(
      `${WEB}/pages/home/example.ts`,
      "import { HealthStatus } from '@/domain/health';\nimport { cn } from '@/shared/helpers/cn';\nimport { Button } from '@/shared/ui';\nexport const x = [Button, cn, HealthStatus];\n",
    );
    await passes(
      `${WEB}/app/example.ts`,
      "import { HomePage } from '@/pages/home';\nimport product from '@/product-config';\nexport const x = [HomePage, product];\n",
    );
  });

  test('valid: same-slice internals and tests import directly', async () => {
    await passes(
      `${WEB}/domain/health/ui/example.ts`,
      "import { apiText } from '../model/consts';\nimport type { StatusState } from '../model/types';\nexport const x = (state: StatusState) => [apiText, state];\n",
    );
    await passes(
      `${WEB}/domain/health/hooks/tests/example.test.ts`,
      "import { useHealthStatus } from '../use-health-status';\nexport const x = useHealthStatus;\n",
    );
    await passes(
      `${WEB}/domain/health/index.ts`,
      "export { HealthStatus } from './health-status';\n",
    );
  });
});

describe('main component file contract', () => {
  const main = `${WEB}/domain/example/example.tsx`;
  const valid = [
    "import { useState } from 'react';",
    "import { Button } from '@/shared/ui';",
    'type Props = {',
    '  label: string;',
    '};',
    'export const Example = ({ label }: Props) => {',
    '  const [count, setCount] = useState(0);',
    '  const increment = () => {',
    '    setCount((n) => n + 1);',
    '  };',
    '  return <Button onClick={increment}>{`${label} ${String(count)}`}</Button>;',
    '};',
    '',
  ].join('\n');

  test('valid: hooks and local variables inside the component', () =>
    passes(main, valid));

  for (const [name, extra] of [
    ['function', 'function helper() {\n  return 1;\n}\n'],
    ['const', "const LABEL = 'x';\n"],
    ['type', 'type Extra = string;\n'],
    ['inline component', 'const Inner = () => <span />;\n'],
    ['second export', 'export const Other = () => <span />;\n'],
    ['default export', 'export default Example;\n'],
  ]) {
    test(`rejects an extra top-level ${name}`, () =>
      rejects(main, `${valid}${extra}`, SYNTAX));
  }

  test('rejects a function-declaration component', () =>
    rejects(
      `${WEB}/pages/example/example-page.tsx`,
      'export function ExamplePage() {\n  return <main />;\n}\n',
      SYNTAX,
    ));

  test('applies to app/app.tsx; not to ui/, stories, tests or primitives', async () => {
    await rejects(
      `${WEB}/app/app.tsx`,
      'const x = 1;\nexport const App = () => x;\n',
      SYNTAX,
    );
    const helperFile =
      "const LABEL = 'x';\nexport const Row = () => <span>{LABEL}</span>;\n";
    await passes(`${WEB}/domain/example/ui/row.tsx`, helperFile);
    await passes(`${WEB}/domain/example/example.test.tsx`, helperFile);
    await passes(`${WEB}/domain/example/example.stories.tsx`, helperFile);
  });

  test('valid: the shadcn primitive with CVA variants', async () => {
    const { readFile } = await import('node:fs/promises');
    const file = `${WEB}/shared/ui/primitives/button/button.tsx`;
    await passes(file, await readFile(path.join(root, file), 'utf8'));
  });
});

describe('ordering autofix', () => {
  const file = `${WEB}/domain/health/helpers/example.ts`;

  test('imports: React, packages, @/ aliases, relative — A–Z, no blank lines', async () => {
    const input = [
      "import { isDatabaseUp, isApiHealthy } from './helpers';",
      "import { cn } from '@/shared/helpers/cn';",
      '',
      "import { cva } from 'class-variance-authority';",
      "import type { Status } from '../model/types';",
      "import { useState } from 'react';",
      'export const x = [cn, cva, isApiHealthy, isDatabaseUp, useState] as unknown as Status;',
      '',
    ].join('\n');
    const expected = [
      "import { useState } from 'react';",
      "import { cva } from 'class-variance-authority';",
      "import { cn } from '@/shared/helpers/cn';",
      "import type { Status } from '../model/types';",
      "import { isApiHealthy, isDatabaseUp } from './helpers';",
      'export const x = [cn, cva, isApiHealthy, isDatabaseUp, useState] as unknown as Status;',
      '',
    ].join('\n');
    assert.equal(await fixed(file, input), expected);
  });

  test('exports: re-exports and specifiers A–Z, values before types', async () => {
    const input =
      "export type { Status } from '../model/types';\nexport { isDatabaseUp, isApiHealthy } from './helpers';\nexport { CHECKING } from '../model/consts';\n";
    const expected =
      "export { CHECKING } from '../model/consts';\nexport { isApiHealthy, isDatabaseUp } from './helpers';\nexport type { Status } from '../model/types';\n";
    assert.equal(await fixed(file, input), expected);
  });

  test('objects, type literals and interfaces: exactly `id` first, then A–Z', async () => {
    const input = [
      "export const user = { name: 'Example', identity: 'x', age: 20, id: '123' };",
      'export type User = { name: string; userId: string; id: string; age: number };',
      'export interface Card { title: string; id: string; body: string }',
      '',
    ].join('\n');
    const expected = [
      "export const user = { id: '123', age: 20, identity: 'x', name: 'Example' };",
      // sort-modules also orders the two declarations; Prettier tidies `;`.
      'export interface Card { id: string; body: string; title: string; }',
      'export type User = { id: string; age: number; name: string; userId: string; };',
      '',
    ].join('\n');
    assert.equal(await fixed(file, input), expected);
  });

  test('object spreads keep their position', async () => {
    const input =
      'export const merge = (base: object) => ({ b: 2, a: 1, ...base, d: 4, c: 3 });\n';
    assert.equal(
      await fixed(file, input),
      'export const merge = (base: object) => ({ a: 1, b: 2, ...base, c: 3, d: 4 });\n',
    );
  });

  test('top-level types and functions A–Z (Card/AbortCard)', async () => {
    const input = [
      'export type Card = { title: string };',
      'export type AbortCard = { reason: string };',
      'export function zeta() {',
      '  return alpha();',
      '}',
      'export function alpha() {',
      '  return 0;',
      '}',
      '',
    ].join('\n');
    const expected = [
      'export type AbortCard = { reason: string };',
      'export type Card = { title: string };',
      'export function alpha() {',
      '  return 0;',
      '}',
      'export function zeta() {',
      '  return alpha();',
      '}',
      '',
    ].join('\n');
    assert.equal(await fixed(file, input), expected);
  });

  test('JSX props A–Z around a spread', async () => {
    const input =
      'export const A = (props: object) => <a title="t" href="/" {...props} rel="x" className="c" />;\n';
    assert.equal(
      await fixed(`${WEB}/domain/example/ui/link.tsx`, input),
      'export const A = (props: object) => <a href="/" title="t" {...props} className="c" rel="x" />;\n',
    );
  });
});

describe('magic numbers', () => {
  const file = `${WEB}/domain/health/helpers/example.ts`;

  test('rejects an unexplained timeout', () =>
    rejects(
      file,
      'export const wait = () => new Promise((resolve) => setTimeout(resolve, 1500));\n',
      '@typescript-eslint/no-magic-numbers',
    ));

  test('valid: named constants and conventional 0/1', () =>
    passes(
      file,
      'const RETRY_DELAY_MS = 1_500;\nexport const wait = () => new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));\nexport const next = (n: number) => (n > 0 ? n + 1 : 0);\n',
    ));
});

describe('backend boundaries', () => {
  test('infrastructure must not import a feature module', () =>
    rejects(
      `${API}/infrastructure/database/example.ts`,
      "import { DiagnosticsModule } from '../../modules/diagnostics/diagnostics.module.js';\nexport const x = DiagnosticsModule;\n",
      BOUNDARIES,
    ));

  test("a module must not deep-import another module's internals", () =>
    rejects(
      `${API}/modules/other/example.ts`,
      "import { DiagnosticsController } from '../diagnostics/diagnostics.controller.js';\nexport const x = DiagnosticsController;\n",
      BOUNDARIES,
    ));

  test('valid: app composes module classes; modules use infrastructure providers', async () => {
    await passes(
      `${API}/app/example.ts`,
      "import { DatabaseModule } from '../infrastructure/database/database.module.js';\nimport { DiagnosticsModule } from '../modules/diagnostics/diagnostics.module.js';\nexport const x = [DatabaseModule, DiagnosticsModule];\n",
    );
    await passes(
      `${API}/modules/other/example.ts`,
      "import { DATABASE } from '../../infrastructure/database/database.module.js';\nimport { DiagnosticsModule } from '../diagnostics/diagnostics.module.js';\nexport const x = [DATABASE, DiagnosticsModule];\n",
    );
  });
});
