import js from '@eslint/js';
import { defaultConditionNames } from 'eslint-import-resolver-typescript';
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
    'Climb at most three levels (../../../), the depth from a capability category such as <capability>/http/controllers/ to its module root. Deeper means reconsider file ownership.',
  regex: '^(\\.\\./){4,}',
};

const infrastructureThroughAlias = {
  message:
    'Modules import infrastructure through the `#infrastructure/*` subpath import, not a relative path.',
  regex: '^(\\.\\./)+infrastructure/',
};

const SOURCE_CONDITION = 'shiori-source';

const technicalPackages = {
  auth: ['@better-auth/.+', '@thallesp/.+', 'better-auth(/.+)?'],
  betterAuth: ['@better-auth/.+', 'better-auth(/.+)?'],
  nest: ['@nestjs/.+'],
  orm: ['drizzle-orm(/.+)?', 'pg'],
};

const vendorImports = (packages, message, allowTypeImports) => ({
  '@typescript-eslint/no-restricted-imports': [
    'error',
    {
      patterns: [
        { allowTypeImports, message, regex: `^(${packages.join('|')})$` },
      ],
    },
  ],
});

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
const PUBLIC_SHARED_UNITS = '{theme,ui}';
const shared = [
  {
    element: {
      captured: { unit: PUBLIC_SHARED_UNITS },
      fileInternalPath: 'index.ts',
      type: 'web-shared',
    },
  },
  {
    element: {
      captured: { unit: `!${PUBLIC_SHARED_UNITS}` },
      type: 'web-shared',
    },
  },
];

const SAME_MODULE = '{{from.element.captured.module}}';
const SAME_CAPABILITY = '{{from.element.captured.capability}}';
const apiInfrastructure = { element: { type: 'api-infrastructure' } };
const otherModulePublicFiles = {
  element: {
    captured: { module: `!${SAME_MODULE}` },
    fileInternalPath: ['*.module.ts', 'index.ts'],
    type: 'api-module',
  },
};
const moduleArea = (area, extra = {}) => ({
  element: {
    captured: { area, module: SAME_MODULE },
    type: 'api-module-area',
    ...extra,
  },
});
const capabilityArea = (area, capability = SAME_CAPABILITY, extra = {}) => ({
  element: {
    captured: { area, capability, module: SAME_MODULE },
    type: 'api-capability-area',
    ...extra,
  },
});
const typeOnly = (to) => ({ dependency: { kind: 'type' }, to });
const fromModuleArea = (area, extra = {}) => ({
  element: { captured: { area }, type: 'api-module-area', ...extra },
});
const fromCapabilityArea = (area) => ({
  element: { captured: { area }, type: 'api-capability-area' },
});
const technicalAllowances = [apiInfrastructure, otherModulePublicFiles];

const backendPolicies = [
  {
    allow: {
      to: [
        { element: { type: ['api-app', 'api-infrastructure'] } },
        { element: { fileInternalPath: '*.module.ts', type: 'api-module' } },
      ],
    },
    from: { element: { type: 'api-app' } },
  },
  {
    allow: { to: apiInfrastructure },
    from: { element: { type: 'api-infrastructure' } },
  },
  {
    allow: {
      to: [
        {
          element: {
            captured: { module: SAME_MODULE },
            type: ['api-module', 'api-module-area', 'api-capability-area'],
          },
        },
        ...technicalAllowances,
      ],
    },
    from: { element: { type: 'api-module' } },
  },
  {
    allow: {
      to: [
        {
          element: {
            captured: { module: SAME_MODULE },
            type: [
              'api-module',
              'api-module-area',
              'api-capability-area',
              'api-tests',
            ],
          },
        },
        ...technicalAllowances,
      ],
    },
    from: { element: { type: 'api-tests' } },
  },
  { allow: { to: moduleArea('model') }, from: fromModuleArea('model') },
  {
    allow: {
      to: [moduleArea('{model,persistence}'), apiInfrastructure],
    },
    from: fromModuleArea('persistence'),
  },
  {
    allow: {
      to: [moduleArea('{model,integrations}'), ...technicalAllowances],
    },
    from: fromModuleArea('integrations'),
  },
  {
    allow: {
      to: [
        moduleArea('persistence', { fileInternalPath: 'schemas/*.schema.ts' }),
        capabilityArea('persistence', '*', {
          fileInternalPath: 'schemas/*.schema.ts',
        }),
      ],
    },
    from: fromModuleArea('integrations', {
      fileInternalPath: 'better-auth/config/better-auth.config.ts',
    }),
  },
  {
    allow: { to: capabilityArea('application', '*') },
    from: fromModuleArea('integrations', { fileInternalPath: '*/hooks/*' }),
  },
  {
    allow: [
      {
        to: [
          moduleArea('{model,cli}'),
          capabilityArea('application', '*'),
          ...technicalAllowances,
        ],
      },
      typeOnly(moduleArea('integrations')),
    ],
    from: fromModuleArea('cli'),
  },
  {
    allow: [
      {
        to: [moduleArea('{model,http,application}'), ...technicalAllowances],
      },
      typeOnly(moduleArea('integrations')),
    ],
    from: fromModuleArea('http'),
  },
  {
    allow: {
      to: [
        moduleArea('{model,application,persistence,integrations}'),
        ...technicalAllowances,
      ],
    },
    from: fromModuleArea('application'),
  },
  {
    allow: [
      {
        to: [
          moduleArea('model'),
          capabilityArea('{http,application}'),
          ...technicalAllowances,
        ],
      },
      typeOnly([moduleArea('integrations'), capabilityArea('integrations')]),
    ],
    from: fromCapabilityArea('http'),
  },
  {
    allow: {
      to: [
        moduleArea('{model,persistence,integrations}'),
        capabilityArea('{application,persistence,integrations}'),
        capabilityArea('application', '*'),
        ...technicalAllowances,
      ],
    },
    from: fromCapabilityArea('application'),
  },
  {
    allow: {
      to: [
        moduleArea('model'),
        capabilityArea('persistence'),
        apiInfrastructure,
      ],
    },
    from: fromCapabilityArea('persistence'),
  },
  {
    allow: {
      to: [
        moduleArea('model'),
        capabilityArea('{integrations,application}'),
        ...technicalAllowances,
      ],
    },
    from: fromCapabilityArea('integrations'),
  },
];

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
            // INVARIANT: vite.config.ts loads these app files in Node; importing the shared/theme index would pull React components into the config bundle.
            allow: {
              to: {
                element: {
                  captured: { unit: 'theme' },
                  fileInternalPath: ['helpers/theme.ts', 'model/types.ts'],
                  type: 'web-shared',
                },
              },
            },
            from: {
              element: {
                fileInternalPath: [
                  'startup/startup-shell.ts',
                  'theme-config.ts',
                ],
                type: 'web-app',
              },
            },
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
          ...backendPolicies,
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
      // INVARIANT: boundaries assigns the first matching element, so web-model, api-tests and the API areas must precede their parent elements.
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
        pattern: `${API}/modules/*/**/tests`,
        type: 'api-tests',
      },
      {
        capture: ['module', 'area'],
        partialMatch: false,
        pattern: `${API}/modules/*/{model,persistence,integrations,cli,http,application}`,
        type: 'api-module-area',
      },
      {
        capture: ['module', 'capability', 'area'],
        partialMatch: false,
        pattern: `${API}/modules/*/*/{http,application,persistence,integrations}`,
        type: 'api-capability-area',
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
        conditionNames: [SOURCE_CONDITION, ...defaultConditionNames],
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
          internalPattern: ['^@/', '^#'],
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
    files: [`${API}/modules/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [maxThreeLevelsUpInApi, infrastructureThroughAlias] },
      ],
    },
  },
  {
    files: [`${API}/modules/*/model/**/*.ts`],
    ignores: ['**/tests/**'],
    rules: vendorImports(
      [
        ...technicalPackages.auth,
        ...technicalPackages.nest,
        ...technicalPackages.orm,
      ],
      'model/ holds pure business contracts and rules: no Nest, ORM, database driver or Better Auth imports.',
      false,
    ),
  },
  {
    files: [
      `${API}/modules/*/{http,cli}/**/*.ts`,
      `${API}/modules/*/*/http/**/*.ts`,
    ],
    ignores: ['**/tests/**'],
    rules: vendorImports(
      [...technicalPackages.orm, ...technicalPackages.betterAuth],
      'Transports call application/; vendor and ORM contracts are type-only here.',
      true,
    ),
  },
  {
    files: [
      `${API}/modules/*/application/**/*.ts`,
      `${API}/modules/*/*/application/**/*.ts`,
    ],
    ignores: ['**/tests/**'],
    rules: vendorImports(
      [...technicalPackages.auth, ...technicalPackages.orm],
      'application/ orchestrates; queries belong in persistence/ and vendor calls in integrations/ (type-only imports allowed).',
      true,
    ),
  },
  {
    files: [
      `${API}/modules/*/persistence/**/*.ts`,
      `${API}/modules/*/*/persistence/**/*.ts`,
    ],
    ignores: ['**/tests/**'],
    rules: vendorImports(
      [...technicalPackages.auth, ...technicalPackages.nest],
      'persistence/ holds tables, queries and row mappers: no Nest or Better Auth imports.',
      false,
    ),
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
    files: [
      `${WEB}/app/**/*.tsx`,
      `${WEB}/{pages,domain}/*/*.tsx`,
      `${WEB}/**/ui/**/*.tsx`,
    ],
    ignores: [
      ...TESTS_AND_STORIES,
      `${WEB}/app/routing/{app-routes,routes}.tsx`,
      `${WEB}/shared/ui/primitives/**`,
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message:
            'Main component file: only imports, `type Props` and one `export const Component`. Move other declarations to model/, helpers/, hooks/ or ui/ (variants to ui/<component>-variants.ts).',
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
    ignores: [`${WEB}/shared/{theme,ui}/index.ts`],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message:
            'No internal index.ts barrels: only pages/<slice>, domain/<slice>, shared/ui and shared/theme expose an index.ts.',
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
