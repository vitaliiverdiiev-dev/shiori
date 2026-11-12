import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Architecture v1 — see docs/standards/code-quality-v1.md. Rule behaviour is
// proven by scripts/eslint-architecture.test.mjs.

const WEB = 'apps/web/src';
const API = 'apps/api/src';
const TESTS_AND_STORIES = ['**/*.test.{ts,tsx}', '**/*.stories.tsx'];

/** `id` first, everything else A–Z (objects, type literals, interfaces). */
const idFirst = {
  customGroups: [{ elementNamePattern: '^id$', groupName: 'id' }],
  groups: ['id', 'unknown'],
  type: 'alphabetical',
};

const maxTwoLevelsUp = {
  message:
    'Climb at most two levels (../../). Use an `@/` import that respects slice boundaries, or reconsider file ownership.',
  regex: '^(\\.\\./){3,}',
};

const index = (types) => ({
  element: { fileInternalPath: 'index.ts', type: types },
});
const sameSlice = (type) => ({
  element: { captured: { slice: '{{from.element.captured.slice}}' }, type },
});
// model/ of the importing page/domain slice (same layer and slice name).
const ownModel = (layer) => ({
  element: {
    captured: { layer, slice: '{{from.element.captured.slice}}' },
    type: 'web-model',
  },
});
// shared/ui is consumed through its index.ts; shared/helpers files are direct units.
const shared = [
  {
    element: {
      captured: { unit: 'ui' },
      fileInternalPath: 'index.ts',
      type: 'web-shared',
    },
  },
  { element: { captured: { unit: '!ui' }, type: 'web-shared' } },
];

const architecture = {
  plugins: { boundaries },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          // Frontend: app → pages/domain/shared; pages → domain/shared; domain → shared.
          {
            allow: {
              to: [
                { element: { type: 'web-app' } },
                index(['web-page', 'web-domain']),
                ...shared,
                { file: { categories: 'product-config' } },
              ],
            },
            from: { element: { type: 'web-app' } },
          },
          {
            allow: {
              to: [
                sameSlice('web-page'),
                ownModel('pages'),
                index(['web-page', 'web-domain']),
                ...shared,
              ],
            },
            from: { element: { type: 'web-page' } },
          },
          {
            allow: {
              to: [
                sameSlice('web-domain'),
                ownModel('domain'),
                index('web-domain'),
                ...shared,
              ],
            },
            from: { element: { type: 'web-domain' } },
          },
          {
            // model/ (WHAT) sees only its own model/ and non-React shared
            // units — never the slice's api/helpers/hooks/store/ui, whatever
            // the import spelling (`../helpers` or `@/domain/<slice>/helpers`).
            allow: {
              to: [
                {
                  element: {
                    captured: {
                      layer: '{{from.element.captured.layer}}',
                      slice: '{{from.element.captured.slice}}',
                    },
                    type: 'web-model',
                  },
                },
                {
                  element: {
                    captured: { unit: '!{hooks,ui}' },
                    type: 'web-shared',
                  },
                },
              ],
            },
            from: { element: { type: 'web-model' } },
          },
          {
            allow: { to: { element: { type: 'web-shared' } } },
            from: { element: { type: 'web-shared' } },
          },
          // Backend: app composes modules (entry classes) and infrastructure;
          // infrastructure never depends on modules; modules see each other's
          // `*.module.ts` only.
          {
            allow: {
              to: [
                { element: { type: ['api-app', 'api-infrastructure'] } },
                {
                  element: {
                    fileInternalPath: '*.module.ts',
                    type: 'api-module',
                  },
                },
              ],
            },
            from: { element: { type: 'api-app' } },
          },
          {
            allow: { to: { element: { type: 'api-infrastructure' } } },
            from: { element: { type: 'api-infrastructure' } },
          },
          {
            allow: {
              to: [
                {
                  element: {
                    captured: { module: '{{from.element.captured.module}}' },
                    type: 'api-module',
                  },
                },
                { element: { type: 'api-infrastructure' } },
                {
                  element: {
                    fileInternalPath: '*.module.ts',
                    type: 'api-module',
                  },
                },
              ],
            },
            from: { element: { type: 'api-module' } },
          },
          {
            // The canonical product config reaches pages only as props from app.
            disallow: { to: { file: { categories: 'product-config' } } },
            from: {
              element: {
                type: ['web-page', 'web-domain', 'web-model', 'web-shared'],
              },
            },
            message:
              'Only src/app imports @/product-config; pass values to pages as props.',
          },
        ],
      },
    ],
  },
  settings: {
    'boundaries/elements': [
      { partialMatch: false, pattern: `${WEB}/app`, type: 'web-app' },
      // Before web-page/web-domain: model/ is its own element so its
      // restrictions hold for relative and `@/` imports alike.
      {
        capture: ['layer', 'slice'],
        partialMatch: false,
        pattern: `${WEB}/{pages,domain}/*/model`,
        type: 'web-model',
      },
      {
        capture: ['slice'],
        partialMatch: false,
        pattern: `${WEB}/pages/*`,
        type: 'web-page',
      },
      {
        capture: ['slice'],
        partialMatch: false,
        pattern: `${WEB}/domain/*`,
        type: 'web-domain',
      },
      {
        capture: ['unit'],
        partialMatch: false,
        pattern: `${WEB}/shared/*`,
        type: 'web-shared',
      },
      { partialMatch: false, pattern: `${API}/app`, type: 'api-app' },
      {
        capture: ['unit'],
        partialMatch: false,
        pattern: `${API}/infrastructure/*`,
        type: 'api-infrastructure',
      },
      {
        capture: ['module'],
        partialMatch: false,
        pattern: `${API}/modules/*`,
        type: 'api-module',
      },
    ],
    'boundaries/files': [
      { category: 'product-config', pattern: 'product.config.json' },
    ],
    'boundaries/root-path': import.meta.dirname,
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        noWarnOnMultipleProjects: true,
        project: ['apps/web/tsconfig.app.json', 'apps/api/tsconfig.json'],
      },
    },
  },
};

export default defineConfig([
  globalIgnores(['**/dist', '**/storybook-static', '**/coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Ordering: ESLint owns order (auto-fixable), Prettier owns formatting.
    files: ['**/*.{ts,tsx}'],
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-exports': [
        'error',
        { groups: ['value-export', 'type-export'], type: 'alphabetical' },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          customGroups: [
            { elementNamePattern: '^react(-dom)?(/.*)?$', groupName: 'react' },
          ],
          // React, third-party (incl. node:), `@/` aliases, relative — no blank lines.
          groups: [
            'react',
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown',
          ],
          internalPattern: ['^@/'],
          newlinesBetween: 0,
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-interfaces': ['error', idFirst],
      'perfectionist/sort-jsx-props': ['error', { type: 'alphabetical' }],
      'perfectionist/sort-modules': [
        'error',
        {
          // Only type/interface/function declarations; classes (Nest
          // decorators) and enums keep their authored position.
          customGroups: [
            { groupName: 'class', selector: 'class', type: 'unsorted' },
            { groupName: 'enum', selector: 'enum', type: 'unsorted' },
          ],
          groups: [['interface', 'type'], 'enum', 'class', 'function'],
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-named-exports': [
        'error',
        { groups: ['value-export', 'type-export'], type: 'alphabetical' },
      ],
      'perfectionist/sort-named-imports': ['error', { type: 'alphabetical' }],
      'perfectionist/sort-object-types': ['error', idFirst],
      'perfectionist/sort-objects': ['error', idFirst],
    },
  },
  {
    files: ['apps/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [maxTwoLevelsUp] }],
    },
  },
  {
    // model/ stays independent of React; its local-file boundaries
    // (api/helpers/hooks/store/ui) are enforced by boundaries (web-model).
    files: [`${WEB}/{pages,domain}/*/model/**/*.{ts,tsx}`],
    ignores: TESTS_AND_STORIES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            maxTwoLevelsUp,
            {
              message:
                'model/ holds types, contracts and constants only: no React imports.',
              regex: '^react(-dom)?(/.*)?$',
            },
          ],
        },
      ],
    },
  },
  {
    files: [`${WEB}/**/*.{ts,tsx}`, `${API}/**/*.ts`],
    ...architecture,
  },
  {
    // Named values instead of unexplained numbers in production source.
    files: [`${WEB}/**/*.{ts,tsx}`, `${API}/**/*.ts`],
    ignores: [...TESTS_AND_STORIES, '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          detectObjects: true,
          enforceConst: true,
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
    },
  },
  {
    // Main page/domain/app component file: imports, optional `type Props`,
    // and exactly one named `export const Component = (...) => ...`.
    files: [`${WEB}/app/app.tsx`, `${WEB}/{pages,domain}/*/*.tsx`],
    ignores: TESTS_AND_STORIES,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message:
            'Main component file: only imports, `type Props` and one `export const Component`. Move other declarations to model/, helpers/, hooks/ or ui/.',
          selector:
            "Program > :not(ImportDeclaration, TSTypeAliasDeclaration[id.name='Props'], ExportNamedDeclaration[declaration.type='VariableDeclaration'][declaration.kind='const'])",
        },
        {
          message: 'Main component file: exactly one exported component.',
          selector:
            'Program > ExportNamedDeclaration ~ ExportNamedDeclaration, Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator ~ VariableDeclarator',
        },
        {
          message:
            'Main component file: export a PascalCase arrow function component (`export const Name = (...) => ...`).',
          selector:
            "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator:not([id.name=/^[A-Z][A-Za-z0-9]*$/][init.type='ArrowFunctionExpression'])",
        },
      ],
    },
  },
  {
    // Only slice roots (and shared/ui) are public; no internal barrels.
    files: [
      `${WEB}/{pages,domain}/*/*/**/index.{ts,tsx}`,
      `${WEB}/shared/**/index.{ts,tsx}`,
      `${WEB}/app/**/index.{ts,tsx}`,
    ],
    ignores: [`${WEB}/shared/ui/index.ts`],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message:
            'No internal index.ts barrels: only pages/<slice>, domain/<slice> and shared/ui expose an index.ts.',
          selector: 'Program',
        },
      ],
    },
  },
  {
    // Root Node scripts (plain ESM, run directly by Node).
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
    // Frontend standard: `type Props` and type aliases, not interfaces.
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  {
    // shadcn-generated primitives: variant helpers live next to components,
    // and cva config key order decides class precedence, so it is not sorted.
    files: [`${WEB}/shared/ui/primitives/**/*.tsx`],
    rules: {
      'perfectionist/sort-objects': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Nest modules and controllers are decorated classes by design.
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
    },
  },
]);
