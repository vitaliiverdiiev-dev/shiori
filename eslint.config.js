import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { commentPolicyPlugin } from './scripts/eslint-comment-policy.mjs';

const WEB = 'apps/web/src';
const API = 'apps/api/src';
const TESTS_AND_STORIES = ['**/*.test.{ts,tsx}', '**/*.stories.tsx'];

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

const maxThreeLevelsUpInApi = {
  message:
    'Climb at most three levels (../../../), the depth from a module area such as modules/<module>/http/ to infrastructure/. Deeper means reconsider file ownership.',
  regex: '^(\\.\\./){4,}',
};

const index = (types) => ({
  element: { fileInternalPath: 'index.ts', type: types },
});
const sameSlice = (type) => ({
  element: { captured: { slice: '{{from.element.captured.slice}}' }, type },
});
const ownModel = (layer) => ({
  element: {
    captured: { layer, slice: '{{from.element.captured.slice}}' },
    type: 'web-model',
  },
});
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

const moduleAreaImports = {
  application: ['application', 'domain', 'integrations', 'persistence'],
  cli: ['application', 'cli', 'domain', 'integrations'],
  domain: ['domain'],
  http: ['application', 'domain', 'http', 'integrations'],
  integrations: ['domain', 'integrations', 'persistence'],
  persistence: ['persistence'],
};
const MODULE_AREAS = Object.keys(moduleAreaImports);
const otherModulePublicFiles = {
  element: {
    captured: { module: '!{{from.element.captured.module}}' },
    fileInternalPath: ['*.module.ts', 'index.ts'],
    type: 'api-module',
  },
};
const moduleAreaPolicies = Object.entries(moduleAreaImports).map(
  ([area, allowedAreas]) => ({
    allow: {
      to: [
        {
          element: {
            captured: {
              area:
                allowedAreas.length === 1
                  ? allowedAreas[0]
                  : `{${allowedAreas.join(',')}}`,
              module: '{{from.element.captured.module}}',
            },
            type: 'api-module-area',
          },
        },
        ...(area === 'domain'
          ? []
          : [
              { element: { type: 'api-infrastructure' } },
              otherModulePublicFiles,
            ]),
      ],
    },
    from: { element: { captured: { area }, type: 'api-module-area' } },
  }),
);

const architecture = {
  plugins: { boundaries },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
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
                    type: ['api-module', 'api-module-area'],
                  },
                },
                { element: { type: 'api-infrastructure' } },
                {
                  element: {
                    fileInternalPath: ['*.module.ts', 'index.ts'],
                    type: 'api-module',
                  },
                },
              ],
            },
            from: { element: { type: 'api-module' } },
          },
          ...moduleAreaPolicies,
          {
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
      // INVARIANT: boundaries assigns the first matching element, so web-model and api-module-area must precede their parent elements.
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
        capture: ['module', 'area'],
        partialMatch: false,
        pattern: `${API}/modules/*/{${MODULE_AREAS.join(',')}}`,
        type: 'api-module-area',
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
  globalIgnores([
    '**/dist',
    '**/storybook-static',
    '**/coverage',
    'packages/api-client/src/generated',
  ]),
  {
    files: ['**/*.{cjs,js,jsx,mjs,ts,tsx}'],
    plugins: { shiori: commentPolicyPlugin },
    rules: { 'shiori/comment-policy': 'error' },
  },
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
          // INVARIANT: Classes stay in place; moving a decorated class above one it references throws at load.
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
    files: [`${API}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: [maxThreeLevelsUpInApi] }],
    },
  },
  {
    files: [`${API}/modules/*/domain/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            maxThreeLevelsUpInApi,
            {
              group: [
                '@better-auth/*',
                '@nestjs/*',
                '@thallesp/*',
                'better-auth',
                'better-auth/*',
                'drizzle-orm',
                'drizzle-orm/*',
                'pg',
              ],
              message:
                'domain/ holds pure rules: no Nest, ORM, database driver or Better Auth imports.',
            },
          ],
        },
      ],
    },
  },
  {
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
    files: [`${WEB}/**/*.{ts,tsx}`, `${API}/**/*.ts`],
    ignores: [...TESTS_AND_STORIES, '**/*.spec.ts', '**/*.db-spec.ts'],
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
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  {
    // INVARIANT: cva variant key order decides class precedence, so sorting would change styling.
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
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
    },
  },
]);
