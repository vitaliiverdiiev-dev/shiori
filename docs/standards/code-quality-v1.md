# Code Quality & ESLint v1 — TypeScript, React and Module Boundaries

**Status:** Shared, reusable standards used by the first architecture refactor. Implement via the existing ESLint flat config and a small number of verified plugins/rules. **Do not claim enforcement for rules that are only described in prose.**

## 1. Mandatory baseline

- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), no `any`, unsafe assertions or non-null assertions. Prefer type-only imports/exports when required; named exports and typed public boundaries.
- Preserve existing React hooks, react-refresh, Nest decorator and Prettier compatibility.
- Use existing ESLint 10 flat config; **check current stable plugin compatibility before installation** (including Node 26/TS 6). Add a plugin only for requirements it can verifiably enforce. Don't install a dozen overlapping style plugins or rewrite ESLint wholesale.
- Candidate tools: `eslint-plugin-perfectionist` for ordering, `eslint-plugin-boundaries` for layer/slice constraints, `@typescript-eslint/no-magic-numbers` for unexplained values. Use configured `no-restricted-imports` or a small local rule when it is more reliable for a specific public-API restriction.
- Prefer **ESLint `--fix`** for safely fixable ordering; ensure the root repo offers a convenient lint-fix command (`pnpm lint:fix` or equivalent) without changing the existing `pnpm lint` meaning. Prettier formats, ESLint governs ordering.

Official reference docs:

- https://perfectionist.dev/rules/sort-imports
- https://perfectionist.dev/rules/sort-exports
- https://perfectionist.dev/rules/sort-named-imports
- https://perfectionist.dev/rules/sort-named-exports
- https://perfectionist.dev/rules/sort-modules
- https://perfectionist.dev/rules/sort-objects
- https://perfectionist.dev/rules/sort-object-types
- https://perfectionist.dev/rules/sort-interfaces
- https://perfectionist.dev/rules/sort-jsx-props
- https://typescript-eslint.io/rules/no-magic-numbers/
- https://www.jsboundaries.dev/docs/overview/

## 2. Imports — four adjacent groups, zero blank lines

Order **within authored TS/TSX files**:

1. React packages: `react`, `react/*`, `react-dom`, `react-dom/*`.
2. Other third-party packages (including `@nestjs/*`, Zod, TanStack Query, etc. when applicable).
3. Internal absolute alias imports `@/...` (sort alphabetically).
4. Relative imports to files within the current slice/unit: `./...`, `../...`, `../../...` (sort alphabetically).

Inside each group: A–Z, including named specifiers. **No blank line between groups**; one import per line as Prettier formats. Keep type imports correctly typed; group them by module origin rather than inventing a fifth visual section.

```ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui';
import { getHealthLabel } from './helpers/helpers';
import type { HealthStatus } from './model/types';
```

Rules:

- Side-effect imports (global CSS, polyfills, setup) can be order-sensitive: preserve semantics, handle separately from auto-sorted value imports, and document targeted exceptions.
- A relative import may traverse **at most two parent levels** (`../` or `../../`). For deeper cases use an appropriate `@/...` import **without violating slice boundaries**, or reconsider file ownership. Do not create aliases just to evade architecture.
- For **external use of any slice**, only the slice's `index.ts` is allowed, even with a `@/` path. Deep imports into another slice are forbidden regardless of alias or relative syntax. Within the same slice, direct imports are allowed.
- Do not assume the sorter itself enforces architecture; add separate boundary restrictions.
- Preserve CSS bootstrap and Node/Nest/ESM import behavior. Third-party package imports without `@/` remain external even if scoped like `@tanstack/...`.

## 3. Exports

- Sort explicit `export { ... } from ...` re-export statements and named exported specifiers alphabetically; value exports first, `export type` exports next where supported without awkward rewrites.
- Export only what is needed outside the slice/unit. Prefer `export { X } from './x'` and `export type { T } from './types'`. No wildcard `export *` from public slice barrels.
- **Do not claim** an auto-sorter can classify React components vs functions vs constants semantically; no automatic four-kind grouping is required in v1.
- Internal files can export named symbols used inside the slice; the slice `index.ts` is their only public gateway.

## 4. Alphabetical declarations

- Use `perfectionist/sort-modules` or equivalent for **top-level `type`, `interface`, `function` declarations** where safe. Verify dependencies stay correct after `--fix`.
- For cohesive helper files, optionally sort arrow-function declarations if the selected stable plugin supports it safely. Demonstrate it on intentionally out-of-order helpers.
- **Do not globally sort arbitrary `const`, React component bodies, hook calls, variable initializations or statement order**. Don't enable dangerous whole-program variable reordering.
- `type Card` and `type AbortCard` become alphabetical (`AbortCard`, then `Card`) if they are in the same eligible sortable block. This must be demonstrated by an actual fix test.
- Strict page/domain main-component file contract from `frontend-architecture-v1.md` takes precedence over generic module ordering.

## 5. Object keys, TypeScript properties and JSX props

Desired convention: **exact key `id` first, then other keys A–Z**.

Applies to safe cases for:

- Object literals: `perfectionist/sort-objects`.
- Type object properties: `perfectionist/sort-object-types`.
- Interface properties: `perfectionist/sort-interfaces`.

Example:

```ts
const user = {
  id: '123',
  age: 20,
  email: 'test@example.com',
  name: 'Example',
};

type User = {
  id: string;
  age: number;
  email: string;
  name: string;
};
```

Use custom groups for **exactly** `id`, not a fuzzy match for `identity`, `userId`, etc. Prove correct behavior on ordinary objects, type literals and interfaces. Handle object spreads, getters/setters, dependent initializers, integer-like property keys, computed properties and order-sensitive runtime objects (e.g. configs/serializers) conservatively. If safe automated sorting is not possible for a case, use a narrow, justified exclusion; **never silently change behavior to win a style check**.

Sort JSX props A–Z with `perfectionist/sort-jsx-props` when safe; preserve the position of spread props and any intentionally order-dependent expression. No special `id`-first rule for JSX props was requested: alphabetic order only. Do not automatically sort the contents of arrays, union types or component hook statements just because a plugin can.

## 6. No magic numbers / named constants

- Adopt `@typescript-eslint/no-magic-numbers` with **practical allowances** for conventional `0`, `1`, `-1`, array indexes, test fixture values, and numeric literal types where useful; configure carefully to prevent excessive noise in TypeScript types, enum declarations and styles.
- Meaningful timeouts, intervals, limits, thresholds, percentages, conversion factors etc. should be named (e.g. `HEALTH_TIMEOUT_MS`) in the owner's `model/consts.ts`, or an appropriate infrastructure config. Avoid duplicated literals with the _same semantic meaning_; do not merge coincidental equal numbers with different meanings.
- This rule reports a problem but **doesn't auto-invent variable names**. Manual extraction with a meaningful name is expected. Avoid putting every one-off obvious literal into `consts.ts`.

## 7. Architecture enforcement: positive and negative tests

Implement rules for:

1. `app → pages/domain/shared`; `pages → domain/shared`; `domain → shared`; `shared → none of app/pages/domain`.
2. No deep imports across page/domain slices. Cross-slice references use only an independently owned `index.ts` public entrypoint.
3. No `index.ts` barrel files inside slice `api/model/helpers/hooks/store/ui/tests`. Only explicitly allowed public units have barrels.
4. Relative imports no deeper than `../../` (within applicable authored TS/TSX; account for tests/config/tooling exceptions).
5. Main page/domain component only imports, optional `type Props`, one named `export const Component` at top level. Generated shadcn primitives, tests, stories, API files, backend files and setup files must not be falsely rejected.
6. On backend, shared infrastructure must not depend on business feature internals; another Nest feature must not deep-import a private feature implementation as a shortcut. Nest composition of module classes and exported DI providers is allowed.

**Test actual rule behavior**, not just the presence of plugin names in `eslint.config.js`. Use ESLint RuleTester or a small fixture runner that asserts expected diagnostics and `--fix` outputs. Minimum matrix:

| Deliberately invalid sample                                                                          | Expected                                |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `shared` imports `@/domain/health`                                                                   | Lint error                              |
| `domain` imports `@/pages/home`                                                                      | Lint error                              |
| `pages/home` imports internal `@/domain/health/api/requests`                                         | Lint error                              |
| Sibling domain slice deep-imports sibling's `model/types`                                            | Lint error                              |
| Third-level relative traversal `../../../`                                                           | Lint error                              |
| Main component defines extra top-level `function`, `const`, `type Extra`, or inline helper component | Lint error                              |
| `model` imports UI or React hooks (if forbidden by implemented internal policy)                      | Lint error                              |
| Wrong import/export order, shuffled types, object `id` last, shuffled JSX props                      | Correct `--fix` result                  |
| Meaningful unexplained magic literal                                                                 | Lint error                              |
| Backend infrastructure imports `modules/diagnostics/...`                                             | Lint error if backend policy is enabled |

| Deliberately valid sample                                                       | Expected |
| ------------------------------------------------------------------------------- | -------- |
| Page imports `@/domain/health`                                                  | Pass     |
| Internal file uses `./...` or `../model/types` within own slice                 | Pass     |
| Main component calls hooks and declares local variables **inside** its function | Pass     |
| shadcn primitive defines CVA variants                                           | Pass     |
| Test imports own slice implementation directly                                  | Pass     |
| API module imports database provider via permitted infrastructure path          | Pass     |

Tests must be **reproducible, runnable by an ordinary command**, and must not create or leave test fixtures in production source directories. Avoid disabling all checks when an edge case appears. If a requirement cannot be enforced reliably by ESLint without disproportionate custom machinery, clearly document it as a reviewed convention, not an implemented gate.

## 8. Existing tooling and scope

- Preserve root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build-storybook`, `pnpm format:check` and DB-specific `pnpm test:db` behavior.
- Add `pnpm lint:fix` if straightforward and compatible with Turborepo packages; document it.
- Update root and app ESLint configs/scopes after moving primitives and source files.
- Don't add a Git hook manager, create a new shared ESLint package, modify KataKit, or introduce CI/publishing just to enforce this version of the standard.
- Run lint/fix **on focused files first**, inspect diffs for unintended runtime changes, then run full checks.
