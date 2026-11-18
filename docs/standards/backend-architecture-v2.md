# Backend Architecture v2 — NestJS Modular Monolith

**Canonical source:** KataKit `backend-architecture` 0.4.1 (Module → Capability → Responsibility). This file is Shiori's snapshot of that standard as `eslint.config.js` enforces it, plus the project choices KataKit leaves to the project. Where this file and KataKit disagree, KataKit wins and this file is updated. Shiori's concrete module map, decisions and exceptions are in [03-architecture.md](../03-architecture.md).

## 1. Top-level structure

```text
apps/api/src/
├── app/              # app.module.ts (composition root), app.config.ts (Nest app setup), openapi.ts
├── infrastructure/   # env validation, database pool + Drizzle provider, OpenAPI schema helper, terminal I/O
├── modules/          # independently owned functional modules
├── main.ts           # process entry: HTTP server
├── cli.ts            # process entry: local account CLI
└── openapi.ts        # process entry: writes apps/api/openapi.json
```

`infrastructure/` never imports modules. `app/` composes modules through their `*.module.ts` only. Process entry files are wiring only and sit outside the layer graph.

## 2. Module layout

```text
modules/<module>/                       # multi-capability       modules/<module>/        # single capability
├── <module>.module.ts                  # Nest composition root  ├── <module>.module.ts
├── index.ts                            # public entrypoint      ├── http/
├── model/{types,schemas,constants,helpers,mappers}/            ├── application/
├── persistence/{schemas,queries,mappers,repositories}/         └── persistence/
├── integrations/<vendor>/{config,plugins,hooks,adapters,types}/
├── cli/                                # flat: <module>.cli.ts, <name>.command.ts
├── <capability>/
│   ├── http/{controllers,dto,guards,pipes}/
│   ├── application/                    # flat: <verb>-<concept>.ts
│   ├── persistence/{schemas,queries,mappers,repositories}/
│   └── tests/integrations/
└── tests/integrations/
```

- Reserved responsibility names: `http`, `application`, `model`, `persistence`, `integrations`, `cli`, `tests`. Any other directory directly under a module is a capability (kebab-case business concept). A capability has no Nest module, `index.ts` or barrel.
- Only `<module>.module.ts` and `index.ts` sit at a module root. Create a directory only for real code; categories are flat (only `tests/` nests).
- In a multi-capability module, `http/` and `application/` live inside capabilities; the module root holds `model/`, `cli/`, `tests/`, module-wide `persistence/` and shared `integrations/<vendor>/`.

## 3. File naming (Shiori suffixes)

| Role                                 | Name                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Drizzle table definitions            | `persistence/schemas/<concept>.schema.ts` (Drizzle Kit discovers only `persistence/schemas/*.schema.ts`)                                  |
| Zod validation of business contracts | `model/schemas/<concept>.validation.ts` (never `*.schema.ts`)                                                                             |
| Queries / row mappers                | `persistence/queries/<concept>.queries.ts`, `persistence/mappers/<concept>-row.mapper.ts`                                                 |
| Business types / constants / rules   | `model/types/<concept>.types.ts`, `model/constants/<concept>.constants.ts`, `model/helpers/<concept>.policy.ts` or `<purpose>.ts`         |
| HTTP                                 | `http/controllers/<capability>.controller.ts`, `http/dto/<action>-<concept>.dto.ts` (Zod response schemas), `http/guards/<name>.guard.ts` |
| Integrations                         | `integrations/<vendor>/config/<vendor>.config.ts`, `plugins/<name>.plugin.ts`, `hooks/<name>.hooks.ts`, `adapters/<name>.adapter.ts`      |
| CLI                                  | `cli/<module>.cli.ts` (dispatch), `cli/<name>.command.ts`, `cli/<module>-cli.types.ts` (shared I/O contract)                              |

## 4. Dependency directions (enforced)

| From                                       | May import                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| module root files                          | anything in their module; infrastructure; other modules' `*.module.ts` / `index.ts`                                                                                                                                                                                                                                      |
| `model/`                                   | `model/` only; no infrastructure; no Nest, Drizzle, `pg` or Better Auth package, not even as types                                                                                                                                                                                                                       |
| module `persistence/`                      | `model/`, own `persistence/`, infrastructure; no Nest or Better Auth                                                                                                                                                                                                                                                     |
| capability `persistence/`                  | `model/`, own capability `persistence/`, infrastructure; no Nest or Better Auth                                                                                                                                                                                                                                          |
| module `integrations/`                     | `model/`, own `integrations/`, infrastructure, other modules' public files; Auth's `better-auth/config/better-auth.config.ts` additionally `persistence/schemas/*.schema.ts` of its own module and capabilities (adapter registration, the one documented deviation); `*/hooks/*` additionally capability `application/` |
| capability `integrations/`                 | `model/`, own capability `integrations/` and `application/`, infrastructure                                                                                                                                                                                                                                              |
| capability `application/`                  | `model/`, own capability `persistence/` + `integrations/`, module `persistence/` + `integrations/`, any capability's `application/`, infrastructure, other modules' public files; vendor/ORM packages type-only                                                                                                          |
| capability `http/`                         | own capability `http/` + `application/`, `model/`, infrastructure, other modules' public files; module or own capability `integrations/` and Better Auth/ORM packages type-only; Nest and `@thallesp/nestjs-better-auth` transport decorators allowed                                                                    |
| module `cli/`                              | `model/`, `cli/`, any capability's `application/`, infrastructure, other modules' public files; `integrations/` and vendor/ORM packages type-only                                                                                                                                                                        |
| single-capability `http/` / `application/` | as the capability rows, with the module root as the capability                                                                                                                                                                                                                                                           |
| `tests/` at any level                      | anything in their module, infrastructure, other modules' public files, `#test/*`                                                                                                                                                                                                                                         |

- Areas never import their module's root files, so a module never imports its own `index.ts`. Imports inside one area are unchecked (`checkInternals` off).
- Modules import infrastructure only through the Node subpath import `#infrastructure/*`; relative imports climb at most `../../../`.

## 5. Tests

- Unit specs (`*.spec.ts`): adjacent when the source's first filename segment equals its directory name, otherwise in that directory's `tests/` (`model/helpers/email.ts` → `model/helpers/tests/email.spec.ts`).
- DB integration specs (`*.db-spec.ts`): `tests/integrations/` of the smallest directory containing the behavior (capability or module). App-spanning e2e, migration specs and the shared harness stay in `apps/api/test/`.
- Moving a test updates runner globs and confirms both suites still discover every file.

## 6. Quality and evidence

- Strict TypeScript: no `any`, unsafe assertions, non-null assertions.
- Keep `.js` import specifiers and runtime decorator metadata as the ESM/Node configuration requires; typecheck, build and run the compiled entry points after relocating files.
- No repository interfaces, base services, action classes or wrappers without a real need. Avoid cycles and `forwardRef()`.
- Every boundary rule has a passing and a failing fixture in `scripts/eslint-architecture.test.mjs`.

**Shared lint and quality expectations:** [code-quality-v1.md](./code-quality-v1.md).
