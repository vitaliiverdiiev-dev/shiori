# Frontend Architecture v1 — React + TypeScript

**Status:** Working standard for first implementation iteration. Revisit after implementing and testing the first substantial auth slice; changes must be intentional, not accidental.

**Portability:** This is a generic frontend standard for React/TypeScript applications. It is not tied to Japanese learning, Shiori, or a future KataKit plugin. A project may document a justified exception, but must not silently substitute a different architecture.

## 1. Principles

- Design for extension; implement only what is needed now. **A folder in an example is not a requirement to create it.**
- Structure should tell us **who owns code** and **where dependencies may flow**. No global grab-bags or folder-per-function convention.
- Prefer small coherent implementations, typed boundaries, direct names, minimal abstractions, named exports, strict TypeScript, no `any`, unsafe or non-null assertions, and no `React.FC`.
- Avoid copy-pasting generated framework patterns into unnecessary layers; do not introduce Zustand or TanStack Query until they solve an existing need.
- The first authentication implementation is an explicit evaluation of this v1 standard. Don't redesign it preemptively.

## 2. Source layers and import direction

```text
src/
├── app/                  # Bootstrap, root composition, routing, providers, global styles
├── pages/                # Page slices; page-specific composition and behavior
├── domain/               # Domain/functional slices, may or may not render UI
├── shared/               # Domain-agnostic, reusable building blocks
├── test/                 # Cross-cutting testing setup/utilities only
└── main.tsx              # Entry point
```

Dependency direction:

- `app` may import from `pages`, `domain`, `shared`.
- `pages` may import from `domain` and `shared`.
- `domain` may import from `shared`.
- `shared` must **not** import `domain`, `pages`, or `app`.
- No root `features/`, `widgets/`, or `entities/` layers in v1. Don't migrate to pure FSD by assumption.
- A slice is owned by `pages/<slice>` or `domain/<slice>`. A slice must not import another slice's internal files. If a same-layer cross-slice dependency is genuinely needed, use only its public `index.ts` and avoid circular dependencies; prefer a lower-layer/shared contract when appropriate.
- A slice's internals may use direct file imports; **no internal barrel `index.ts`** for `api`, `model`, `helpers`, `hooks`, `store`, `ui`, or `tests`.
- Only independent public boundaries have `index.ts`: `pages/<page>/index.ts`, `domain/<domain>/index.ts`, `shared/ui/index.ts` (and other independently consumed shared units if justified). `app` is an entry/composition layer, not automatically a public barrel.
- Public `index.ts` exports **only symbols actually used outside the slice**. Prefer explicit named re-exports (`export type` for types), not `export *`.
- Consumers import the slice via its directory alias, e.g. `@/domain/health`, not `@/domain/health/hooks/...` or `@/pages/home/home-page`.
- `main.tsx` is a bootstrap exception; it may import the app composition directly. A canonical product configuration JSON located at repository root may be exposed by one explicit bundler/TS alias to the `app` composition and passed as typed props to a page; do not create a second config source, import `app` from `pages`, or bypass the two-parent import-depth rule.

## 3. Slice anatomy (optional segments, not scaffold)

```text
pages/<page>/ or domain/<domain>/
├── index.ts                # The one public API of this slice
├── <main-component>.tsx    # One main exported component, if this slice has UI
├── <main-component>.test.tsx
├── api/                    # requests.ts; queries.ts; mutations.ts; tests/
├── model/                  # types.ts; consts.ts; schema.ts; config.ts; tests/
├── helpers/                # helpers.ts; validation.ts; mappers.ts; etc.; tests/
├── store/                  # Zustand store and store-specific selectors/actions/tests
├── hooks/                  # React-specific coordination, hooks and their tests/
└── ui/                     # Local subcomponents and their tests/
```

A domain slice does **not** have to expose a React component. A page slice normally has its page component. Create only segments/files with real code. No empty folders, dummy exports, or placeholder files.

### File ownership — explicit WHAT / HOW convention

| Location   | Owns                                                                   | Examples and rules                                                                                                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model/`   | **WHAT**: shapes, contracts, allowed values, declarative configuration | `types.ts`, `schema.ts` (Zod request/response contracts), `consts.ts`, `config.ts`. It does not implement converters or event handlers. Infer types from Zod when appropriate; avoid duplicate sources of truth.                                                                                                   |
| `helpers/` | **HOW**: operations performed on data                                  | `helpers.ts`, `validation.ts` (actual validation operations), `mappers.ts`, `formatters.ts`, `normalizers.ts`, `reducer.ts` for independent pure transitions, `factory.ts`, `events.ts` for pure event utilities. One meaningful file may hold several cohesive functions; **not one file per helper** by default. |
| `api/`     | Remote communication and server cache mechanisms                       | `requests.ts` for transport calls, `queries.ts` for TanStack query options/hooks, `mutations.ts` for mutations. A request may be REST, GraphQL, etc.; the folder stays `api/`. It may call `helpers/mappers.ts`; don't duplicate transport mappers in `api/`.                                                      |
| `store/`   | Client state ownership and store-specific helpers                      | `use-<name>-store.ts` / `store.ts`, optional `selectors.ts`, `actions.ts`, `reducer.ts`, `types.ts` if explicitly store-specific. **Zustand doesn't imply a reducer or a separate selectors file.** Simple actions stay in the store.                                                                              |
| `hooks/`   | React hooks that coordinate state, effects, API, UI actions            | `use-health-status.ts`, `use-submit-form.ts`. No pass-through hooks solely to wrap another hook.                                                                                                                                                                                                                   |
| `ui/`      | Internal, reusable-_within-slice_ React subcomponents                  | `status-indicator.tsx`. No local stylesheets or CSS modules.                                                                                                                                                                                                                                                       |

**Boundary decisions:**

- `model/schema.ts` describes acceptable request/response shape. `helpers/validation.ts` implements the _operation_ of validating an answer or other substantive behavior. Avoid a redundant one-line wrapper around `.safeParse()` if it adds nothing.
- **All mappers live in `helpers/`** for the slice, regardless of whether input comes from API or another source; model types define input/output shapes. `api/requests.ts` calls a helper if needed.
- General pure transformations and reducers belong in `helpers/`. Pure functions tightly coupled to a specific Zustand store may live in `store/`; don't split simple Zustand actions artificially. `store/` must not become a second API cache: don't mirror TanStack Query server state by default.
- React event callbacks that depend on hooks, mutations or component state stay in the component when trivial, or move to a custom hook. `helpers/events.ts` is for pure event-related operations, **not** arbitrary hooks disguised as functions.
- Prefer one `helpers.ts` for a small cohesive set, or group several related functions in `validation.ts`, `mappers.ts`, etc. Split by responsibility **only when it helps comprehension**.
- `model/` should normally remain independent of `helpers/`, `hooks/`, `ui/` and `store/`. Helpers may import model contracts. Store and hooks may consume model and helpers. Avoid import cycles.

## 4. Strict main component file contract

Applies to the main `.tsx` of **every page and domain UI slice**, and to app root component if applicable. Also applies to newly authored page-like components. **Do not silently weaken this rule for convenience.**

At module top level, this file contains **only**:

1. Imports.
2. `type Props = ...` if this component needs props.
3. Exactly one **named** `export const <Component> = (...) => ...` declaration.

No other module-level type/interface, function, constant, hook declaration, helper component, `use...` declaration, or side-effect initialization. No default exports. You may **call** hooks, helpers, events and queries _inside_ the component, and declare ordinary local variables/event callbacks there as needed; extract substantial logic to the proper segment. Do not prohibit hook calls or useful local computations.

```tsx
import { useHealthStatus } from './hooks/use-health-status';
import { StatusIndicator } from './ui/status-indicator';

type Props = {
  compact?: boolean;
};

export const HealthStatus = ({ compact = false }: Props) => {
  const status = useHealthStatus();
  return <StatusIndicator compact={compact} status={status} />;
};
```

For page/domain subcomponents in `ui/`, prefer the same one-component-per-file cleanliness when practical; if utility declarations are needed, move them rather than growing unrelated top-level code. **Exception:** third-party generated shadcn primitives may need CVA variants and supporting declarations in their component files; preserve those patterns and the project's existing `react-refresh` exemption.

Implement a **targeted automated lint check** for the page/domain main component file contract, with positive and negative tests. Detect main files reliably without applying the restriction to stories, tests, `ui/` primitives or ordinary TypeScript modules. If off-the-shelf ESLint selectors cannot express it without false positives, use **one minimal, locally tested AST rule**; do not build a broad plugin framework. Document precisely what is enforced and what still requires review.

## 5. Shared structure and styling

```text
shared/
├── ui/
│   ├── index.ts
│   ├── primitives/
│   │   └── button/
│   │       ├── button.tsx
│   │       ├── button.test.tsx      # only if meaningful tests exist
│   │       └── button.stories.tsx
│   └── composites/               # composed generic UI; create as used
└── helpers/
    ├── cn.ts                     # `cn` utility (not `lib/utils.ts`)
    └── tests/                    # only when needed
```

- `primitives/` is for real shadcn/Base UI components. Each primitive lives in its own folder named after it. Stories and tests for its identically named component are adjacent.
- `composites/` is for genuinely reusable domain-agnostic compositions of primitives. Don't promote a single-use domain UI into shared.
- `shared/helpers/cn.ts` owns `cn`. Other general utilities may be added to `shared/helpers/` when genuinely reusable. No global `hooks/`, `services/` or `utils/` dumping grounds.
- No slice-local CSS files or CSS Modules. Use Tailwind classes in components; CSS rules/tokens that genuinely require stylesheets belong under `app/styles/`. In the rare case a runtime value needs `style={{...}}`, use it deliberately; don't generate component-local CSS files. Keep existing semantic light/dark tokens and Japanese-capable fonts.
- Ensure `components.json` paths/aliases match this structure: `ui` targets `@/shared/ui/primitives`, `utils` resolves `@/shared/helpers/cn`; update `components`, `lib`, `hooks` thoughtfully if needed so generated files don't revive old `components/` and `lib/` roots. Update Tailwind CSS path, Storybook preview imports and `react-refresh` glob after moving styles/primitives.
- The shadcn CLI typically writes `primitives/button.tsx`, **not** `primitives/button/button.tsx`. After `shadcn add`, relocate generated files into their per-component folders, update imports, and leave source behavior intact. No generator script is needed for this first iteration.
- Preserve accessibility, mobile-first touch targets, Base UI/shadcn behavior, Storybook and theme tokens.

## 6. Test location convention

Tests are created for real behavior, not to fill a template. Use `*.test.ts` / `*.test.tsx`; `tests/`, not `__tests__/` and not a global tree mirroring the application.

1. **Main page/domain component:** colocate its test at slice root, regardless of folder name: `health/health-status.tsx` + `health/health-status.test.tsx`.
2. **File whose basename equals its immediate containing folder:** colocate the test: `button/button.tsx` + `button/button.test.tsx`, or `helpers/helpers.ts` + `helpers/helpers.test.ts` if that shape is intentionally used.
3. **Every other file:** use a `tests/` directory in that file's immediate folder: `api/tests/requests.test.ts`, `hooks/tests/use-health-status.test.ts`, `ui/tests/status-indicator.test.tsx`, `model/tests/schema.test.ts`.
4. `tests/` may contain shared fixtures/handlers for that local scope as needed, but no `index.ts`. `src/test/` is only for cross-cutting test setup/utilities. No mass relocation just because file count changes.
5. Test files within a slice may import its internals directly; external production consumers may not.

Example (illustrative, not mandatory scaffold):

```text
health/
├── index.ts
├── health-status.tsx
├── health-status.test.tsx
├── api/
│   ├── requests.ts
│   └── tests/requests.test.ts
├── model/
│   ├── schema.ts
│   └── tests/schema.test.ts
├── helpers/
│   ├── validation.ts
│   └── tests/validation.test.ts
├── hooks/
│   ├── use-health-status.ts
│   └── tests/use-health-status.test.ts
└── ui/
    ├── status-indicator.tsx
    └── tests/status-indicator.test.tsx
```

## 7. Verification expectations

- Enforce dependency direction, public `index.ts` boundaries, import depth and the main-component contract through ESLint **where reliable**, not merely prose.
- Don't break React hook call ordering, query lifecycle, StrictMode request behavior, accessibility or test reliability during rearrangement.
- Check architecture from _both directions_: forbidden cases fail lint, and valid same-slice/public-API imports pass.
- Document any unavoidable exception with a concrete reason, in the owning project, not as permission to ignore all boundaries.

**Shared lint conventions and negative-test requirements:** [code-quality-v1.md](./code-quality-v1.md).
