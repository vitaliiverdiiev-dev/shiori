import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { ESLint } from 'eslint';

const root = path.resolve(import.meta.dirname, '..');

const options = {
  cwd: root,
  overrideConfig: {
    languageOptions: {
      parserOptions: { project: null, projectService: false },
    },
  },
  ruleFilter: ({ ruleId }) =>
    !ruleId.startsWith('@typescript-eslint/') ||
    [
      '@typescript-eslint/no-magic-numbers',
      '@typescript-eslint/no-restricted-imports',
    ].includes(ruleId),
};
const linter = new ESLint(options);
const fixer = new ESLint({ ...options, fix: true });

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
const PACKAGES = '@typescript-eslint/no-restricted-imports';

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
      "import { healthQuery } from '@/domain/health/api/queries';\nexport const x = healthQuery;\n",
      BOUNDARIES,
    );
    await rejects(
      `${WEB}/pages/home/example.ts`,
      "import { healthQuery } from '../../domain/health/api/queries';\nexport const x = healthQuery;\n",
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

  // TODO: Add store/ and pages/<slice>/{api,…} fixtures once those folders exist; boundaries needs real import targets.
  describe("model/ never imports its slice's HOW segments", () => {
    const domainModel = `${WEB}/domain/health/model/example.ts`;
    const pageModel = `${WEB}/pages/home/model/example.ts`;
    const use = (line) => `${line}\nexport const x = 1;\n`;

    for (const [segment, target, name] of [
      ['api', 'api/queries', 'healthQuery'],
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
        "export { healthQuery } from '@/domain/health/api/queries';\n",
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

  test('no internal index.ts barrels', async () => {
    await rejects(
      `${WEB}/domain/health/model/index.ts`,
      "export { CHECKING } from './consts';\n",
      SYNTAX,
    );
    await rejects(
      `${WEB}/shared/theme/ui/index.ts`,
      "export { ThemeControl } from './theme-control';\n",
      SYNTAX,
    );
    await rejects(
      `${WEB}/shared/ui/composites/logo/index.ts`,
      "export { Logo } from './logo';\n",
      SYNTAX,
    );
  });

  test('valid: shared/theme exposes its public API through index.ts', () =>
    passes(
      `${WEB}/shared/theme/index.ts`,
      "export { ThemeControl } from './ui/theme-control';\n",
    ));

  test('shared/theme is consumed through its index.ts only', async () => {
    await rejects(
      `${WEB}/app/layouts/example.ts`,
      "import { ThemeControl } from '@/shared/theme/ui/theme-control';\nexport const x = ThemeControl;\n",
      BOUNDARIES,
    );
    await rejects(
      `${WEB}/pages/home/example.ts`,
      "import { isTheme } from '@/shared/theme/helpers/theme';\nexport const x = isTheme;\n",
      BOUNDARIES,
    );
    await passes(
      `${WEB}/app/layouts/example.ts`,
      "import { ThemeControl } from '@/shared/theme';\nexport const x = ThemeControl;\n",
    );
  });

  test('only the Vite-loaded app files reach theme helpers and types directly', async () => {
    await passes(
      `${WEB}/app/startup/startup-shell.ts`,
      "import { createThemeScript } from '../../shared/theme/helpers/theme.ts';\nimport type { ThemeConfig } from '../../shared/theme/model/types.ts';\nexport const x = (config: ThemeConfig) => createThemeScript(config);\n",
    );
    await passes(
      `${WEB}/app/theme-config.ts`,
      "import type { ThemeConfig } from '../shared/theme/model/types.ts';\nexport const x: ThemeConfig | null = null;\n",
    );
    await rejects(
      `${WEB}/app/startup/startup-shell.ts`,
      "import { ThemeMenu } from '../../shared/theme/ui/theme-menu.tsx';\nexport const x = ThemeMenu;\n",
      BOUNDARIES,
    );
    await rejects(
      `${WEB}/app/layouts/example.ts`,
      "import { createThemeScript } from '../../shared/theme/helpers/theme.ts';\nexport const x = createThemeScript;\n",
      BOUNDARIES,
    );
  });

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

  describe('also covers composites, ui/ components and app components', () => {
    const component = [
      "import { cn } from '@/shared/helpers/cn';",
      'type Props = {',
      '  className?: string;',
      '};',
      'export const Row = ({ className }: Props) => <span className={cn(className)} />;',
      '',
    ].join('\n');
    const locations = [
      `${WEB}/shared/ui/composites/example/example.tsx`,
      `${WEB}/shared/ui/composites/example/ui/example-mark.tsx`,
      `${WEB}/shared/theme/ui/example.tsx`,
      `${WEB}/domain/example/ui/row.tsx`,
      `${WEB}/pages/example/ui/row.tsx`,
      `${WEB}/app/layouts/example-layout.tsx`,
      `${WEB}/app/app.tsx`,
    ];

    for (const file of locations) {
      test(`${file.slice(WEB.length + 1)}: valid shape passes, extras are rejected`, async () => {
        await passes(file, component);
        await rejects(
          file,
          `${component}const SIZES = { sm: 'size-8' };\n`,
          SYNTAX,
        );
        await rejects(
          file,
          `${component}function helper() {\n  return 1;\n}\n`,
          SYNTAX,
        );
        await rejects(
          file,
          `${component}export const Other = () => <span />;\n`,
          SYNTAX,
        );
      });
    }
  });

  test('not stories, tests, variants, routing config or primitives', async () => {
    const helperFile =
      "const LABEL = 'x';\nexport const Row = () => <span>{LABEL}</span>;\n";
    await passes(`${WEB}/domain/example/example.test.tsx`, helperFile);
    await passes(`${WEB}/domain/example/example.stories.tsx`, helperFile);
    await passes(
      `${WEB}/shared/ui/composites/logo/logo.test.tsx`,
      'const Probe = () => <span />;\nexport const x = Probe;\n',
    );
    await passes(
      `${WEB}/shared/ui/composites/example/ui/example-variants.ts`,
      "import { cva } from 'class-variance-authority';\nexport const exampleVariants = cva('flex');\n",
    );
    await passes(
      `${WEB}/app/routing/app-routes.tsx`,
      `${helperFile}export const AppRoutes = () => <Row />;\n`,
    );
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

  test('API source is checked, its unit and DB specs are exempt', async () => {
    const code = 'export const days = 7 * 86_400;\n';
    await rejects(
      `${API}/modules/auth/invitations/application/example.ts`,
      code,
      '@typescript-eslint/no-magic-numbers',
    );
    await passes(
      `${API}/modules/auth/model/helpers/tests/example.spec.ts`,
      code,
    );
    await passes(
      `${API}/modules/auth/tests/integrations/example.db-spec.ts`,
      code,
    );
  });
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
      "import { DiagnosticsController } from '../diagnostics/http/controllers/diagnostics.controller.js';\nexport const x = DiagnosticsController;\n",
      BOUNDARIES,
    ));

  test("a module must not deep-import auth's internals behind its public entrypoint", async () => {
    await rejects(
      `${API}/modules/other/example.ts`,
      "import { SessionGuard } from '../auth/sessions/http/guards/session.guard.js';\nexport const x = SessionGuard;\n",
      BOUNDARIES,
    );
    await rejects(
      `${API}/modules/other/example.ts`,
      "export { SessionGuard } from '../auth/sessions/http/guards/session.guard.js';\n",
      BOUNDARIES,
    );
  });

  test('app still composes modules only through *.module.ts', () =>
    rejects(
      `${API}/app/example.ts`,
      "import { SessionGuard } from '../modules/auth/sessions/http/guards/session.guard.js';\nexport const x = SessionGuard;\n",
      BOUNDARIES,
    ));

  test("app must not import a module's public index.ts", () =>
    rejects(
      `${API}/app/example.ts`,
      "import { AllowAnonymous } from '../modules/auth/index.js';\nexport const x = AllowAnonymous;\n",
      BOUNDARIES,
    ));

  test("valid: a module imports another module's public index.ts", () =>
    passes(
      `${API}/modules/other/example.ts`,
      "import { AllowAnonymous } from '../auth/index.js';\nexport const x = AllowAnonymous;\n",
    ));

  test('valid: a module root file imports its own files directly', () =>
    passes(
      `${API}/modules/auth/example.ts`,
      "import { SessionGuard } from './sessions/http/guards/session.guard.js';\nexport const x = SessionGuard;\n",
    ));

  test('valid: app composes module classes; modules use infrastructure providers', async () => {
    await passes(
      `${API}/app/example.ts`,
      "import { DatabaseModule } from '../infrastructure/database/database.module.js';\nimport { DiagnosticsModule } from '../modules/diagnostics/diagnostics.module.js';\nexport const x = [DatabaseModule, DiagnosticsModule];\n",
    );
    await passes(
      `${API}/modules/other/example.ts`,
      "import { DATABASE } from '#infrastructure/database/database.module.js';\nimport { DiagnosticsModule } from '../diagnostics/diagnostics.module.js';\nexport const x = [DATABASE, DiagnosticsModule];\n",
    );
  });

  test('modules reach infrastructure only through #infrastructure/*', () =>
    rejects(
      `${API}/modules/other/example.ts`,
      "import { DATABASE } from '../../infrastructure/database/database.module.js';\nexport const x = DATABASE;\n",
      IMPORTS,
    ));

  test('#infrastructure/* resolves to the infrastructure element (model may not use it)', () =>
    rejects(
      `${API}/modules/auth/model/helpers/example.ts`,
      "import { isUniqueViolation } from '#infrastructure/database/postgres-errors.js';\nexport const x = isUniqueViolation;\n",
      BOUNDARIES,
    ));

  test('API relative imports climb at most three levels', async () => {
    await passes(
      `${API}/modules/diagnostics/http/controllers/example.ts`,
      "import { AllowAnonymous } from '../../../auth/index.js';\nexport const x = AllowAnonymous;\n",
    );
    await rejects(
      `${API}/modules/auth/invitations/persistence/queries/tests/example.ts`,
      "import { normalizeEmail } from '../../../../model/helpers/email.js';\nexport const x = normalizeEmail;\n",
      IMPORTS,
    );
  });
});

describe('backend model', () => {
  const MODEL = `${API}/modules/auth/model/helpers/example.ts`;

  test('model imports only model files', async () => {
    await rejects(
      MODEL,
      "import { user } from '../../persistence/schemas/auth.schema.js';\nexport const x = user;\n",
      BOUNDARIES,
    );
    await rejects(
      MODEL,
      "import { createInvitation } from '../../invitations/application/create-invitation.js';\nexport const x = createInvitation;\n",
      BOUNDARIES,
    );
  });

  test('model imports no Nest, ORM, driver or Better Auth package, not even types', async () => {
    for (const name of [
      '@nestjs/common',
      'drizzle-orm',
      'drizzle-orm/pg-core',
      'pg',
      'better-auth',
      'better-auth/api',
      '@better-auth/core',
      '@thallesp/nestjs-better-auth',
    ]) {
      await rejects(
        MODEL,
        `import type * as vendor from '${name}';\nexport type X = typeof vendor;\n`,
        PACKAGES,
      );
    }
  });

  test('valid: own model files and framework-neutral libraries', () =>
    passes(
      MODEL,
      "import { z } from 'zod';\nimport { INVITATION_CODE_LENGTH } from '../constants/invitation.constants.js';\nimport type { InvitationStatus } from '../types/invitation.types.js';\nexport const x = (s: InvitationStatus) => [z, INVITATION_CODE_LENGTH, s];\n",
    ));
});

describe('backend capabilities', () => {
  const AUTH = `${API}/modules/auth`;
  const HTTP = `${AUTH}/sessions/http/controllers/example.ts`;
  const APPLICATION = `${AUTH}/admin-bootstrap/application/example.ts`;
  const PERSISTENCE = `${AUTH}/invitations/persistence/queries/example.ts`;
  const use = (line) => `${line}\nexport const x = 1;\n`;

  test('http reaches its own capability application/ and module model/', () =>
    passes(
      `${AUTH}/invitations/http/controllers/example.ts`,
      use(
        "import { normalizeEmail } from '../../../model/helpers/email.js';\nimport { createInvitation } from '../../application/create-invitation.js';",
      ),
    ));

  test('http must not reach another capability, persistence, or integrations at runtime', async () => {
    await rejects(
      HTTP,
      use(
        "import { createInvitation } from '../../../invitations/application/create-invitation.js';",
      ),
      BOUNDARIES,
    );
    await rejects(
      HTTP,
      use(
        "import { user } from '../../../persistence/schemas/auth.schema.js';",
      ),
      BOUNDARIES,
    );
    await rejects(
      HTTP,
      use(
        "import { createAuth } from '../../../integrations/better-auth/config/better-auth.config.js';",
      ),
      BOUNDARIES,
    );
    await rejects(HTTP, use("import { eq } from 'drizzle-orm';"), PACKAGES);
  });

  test('valid: http type-imports integration and vendor contracts', () =>
    passes(
      HTTP,
      "import type { BetterAuthOptions } from 'better-auth';\nimport type { Auth } from '../../../integrations/better-auth/config/better-auth.config.js';\nexport type X = [Auth, BetterAuthOptions];\n",
    ));

  test('valid: application uses another capability application/, module persistence/ and integrations/', () =>
    passes(
      APPLICATION,
      use(
        "import { createFirstAdmin } from '../../integrations/better-auth/adapters/admin-bootstrap.adapter.js';\nimport { createInvitation } from '../../invitations/application/create-invitation.js';\nimport { isEmailRegistered } from '../../persistence/queries/user.queries.js';\nconsole.log(createInvitation, createFirstAdmin, isEmailRegistered);",
      ),
    ));

  test("application must not reach another capability's persistence, nor build queries or call vendors itself", async () => {
    await rejects(
      APPLICATION,
      use(
        "import { insertInvitation } from '../../invitations/persistence/queries/invitation.queries.js';",
      ),
      BOUNDARIES,
    );
    await rejects(
      APPLICATION,
      use("import { eq } from 'drizzle-orm';"),
      PACKAGES,
    );
    await rejects(
      APPLICATION,
      use("import { getCurrentAdapter } from 'better-auth';"),
      PACKAGES,
    );
    await passes(
      APPLICATION,
      "import type { BetterAuthOptions } from 'better-auth';\nexport type X = BetterAuthOptions;\n",
    );
  });

  test('capability persistence uses its own persistence/ and module model/ only', async () => {
    await passes(
      PERSISTENCE,
      use(
        "import { invitationStatus } from '../../../model/helpers/invitation.policy.js';\nimport { invitation } from '../schemas/invitation.schema.js';\nconsole.log(invitation, invitationStatus);",
      ),
    );
    await rejects(
      PERSISTENCE,
      use(
        "import { user } from '../../../persistence/schemas/auth.schema.js';",
      ),
      BOUNDARIES,
    );
    await rejects(
      PERSISTENCE,
      use(
        "import { createInvitation } from '../../application/create-invitation.js';",
      ),
      BOUNDARIES,
    );
    await rejects(
      PERSISTENCE,
      use("import { getCurrentAdapter } from 'better-auth';"),
      PACKAGES,
    );
  });

  test('module-level persistence never imports a capability', () =>
    rejects(
      `${AUTH}/persistence/queries/example.ts`,
      use(
        "import { invitation } from '../../invitations/persistence/schemas/invitation.schema.js';",
      ),
      BOUNDARIES,
    ));

  describe('Better Auth table registration exception', () => {
    const CONFIG = `${AUTH}/integrations/better-auth/config/better-auth.config.ts`;
    const schema =
      "import { invitation } from '../../../invitations/persistence/schemas/invitation.schema.js';";

    test('valid: the Better Auth config imports module and capability table definitions', () =>
      passes(
        CONFIG,
        use(
          "import { adminBootstrap } from '../../../admin-bootstrap/persistence/schemas/admin-bootstrap.schema.js';\nimport { invitation } from '../../../invitations/persistence/schemas/invitation.schema.js';\nimport * as authSchema from '../../../persistence/schemas/auth.schema.js';\nconsole.log(adminBootstrap, authSchema, invitation);",
        ),
      ));

    test('no other integration file may import a table definition', async () => {
      for (const file of [
        `${AUTH}/integrations/better-auth/config/other.config.ts`,
        `${AUTH}/integrations/better-auth/hooks/example.ts`,
        `${AUTH}/integrations/better-auth/plugins/example.ts`,
        `${AUTH}/integrations/better-auth/adapters/example.adapter.ts`,
      ]) {
        await rejects(file, use(schema), BOUNDARIES);
      }
    });

    test('the config still may not import queries, mappers or application/', async () => {
      for (const target of [
        "import { insertInvitation } from '../../../invitations/persistence/queries/invitation.queries.js';",
        "import { toInvitationSummary } from '../../../invitations/persistence/mappers/invitation-row.mapper.js';",
        "import { isEmailRegistered } from '../../../persistence/queries/user.queries.js';",
        "import { createInvitation } from '../../../invitations/application/create-invitation.js';",
      ]) {
        await rejects(CONFIG, use(target), BOUNDARIES);
      }
    });

    test("the config may not import another module's persistence", () =>
      rejects(
        CONFIG,
        use(
          "import { pingDatabase } from '../../../../diagnostics/persistence/queries/readiness.queries.js';",
        ),
        BOUNDARIES,
      ));
  });

  test('hooks may call capability application/; plugins may not', async () => {
    const application =
      "import { createInvitation } from '../../../invitations/application/create-invitation.js';";
    await passes(
      `${AUTH}/integrations/better-auth/hooks/example.ts`,
      use(application),
    );
    await rejects(
      `${AUTH}/integrations/better-auth/plugins/example.ts`,
      use(application),
      BOUNDARIES,
    );
  });

  test('module CLI calls capability application/; integrations only as types', async () => {
    const CLI = `${AUTH}/cli/example.ts`;
    await passes(
      CLI,
      "import type { Auth } from '../integrations/better-auth/config/better-auth.config.js';\nimport { createInvitation } from '../invitations/application/create-invitation.js';\nexport const x = (auth: Auth) => [auth, createInvitation];\n",
    );
    await rejects(
      CLI,
      use(
        "import { insertInvitation } from '../invitations/persistence/queries/invitation.queries.js';",
      ),
      BOUNDARIES,
    );
    await rejects(
      CLI,
      use(
        "import { createAuth } from '../integrations/better-auth/config/better-auth.config.js';",
      ),
      BOUNDARIES,
    );
  });

  test('an area must not import its own module root or public index.ts', async () => {
    await rejects(
      HTTP,
      use("import { AllowAnonymous } from '../../../index.js';"),
      BOUNDARIES,
    );
    await rejects(
      APPLICATION,
      use("import { AuthModule } from '../../auth.module.js';"),
      BOUNDARIES,
    );
  });

  test('valid: tests at any level use their module freely', async () => {
    await passes(
      `${AUTH}/invitations/tests/integrations/example.db-spec.ts`,
      use(
        "import { createAuth } from '../../../integrations/better-auth/config/better-auth.config.js';\nimport { insertInvitation } from '../../persistence/queries/invitation.queries.js';",
      ),
    );
    await passes(
      `${AUTH}/tests/integrations/example.db-spec.ts`,
      use("import { user } from '../../persistence/schemas/auth.schema.js';"),
    );
  });

  test("another module's capability is not reachable", () =>
    rejects(
      `${API}/modules/other/http/controllers/example.ts`,
      use(
        "import { createInvitation } from '../../../auth/invitations/application/create-invitation.js';",
      ),
      BOUNDARIES,
    ));

  test('single-capability module: http -> application -> persistence', async () => {
    const DIAGNOSTICS = `${API}/modules/diagnostics`;
    await passes(
      `${DIAGNOSTICS}/http/controllers/example.ts`,
      use(
        "import { checkDatabaseReadiness } from '../../application/check-database-readiness.js';",
      ),
    );
    await rejects(
      `${DIAGNOSTICS}/http/controllers/example.ts`,
      use(
        "import { pingDatabase } from '../../persistence/queries/readiness.queries.js';",
      ),
      BOUNDARIES,
    );
    await passes(
      `${DIAGNOSTICS}/application/example.ts`,
      use(
        "import { pingDatabase } from '../persistence/queries/readiness.queries.js';",
      ),
    );
  });
});
