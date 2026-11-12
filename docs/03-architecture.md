# 03 — Shiori Architecture & Foundation Boundaries

## Goals

Readable, maintainable, production-minded **modular monolith**. Learn established full-stack engineering practices without layering every CRUD endpoint into five artificial abstractions. Clean code is a result of clear dependencies and cohesive modules, not folder count.

## Architecture v1 standards

Code structure, dependency direction and lint enforcement follow the portable standards. This file only records Shiori-specific decisions.

- [Frontend Architecture v1](standards/frontend-architecture-v1.md): React layers, slices, main component file contract, tests.
- [Backend Architecture v1](standards/backend-architecture-v1.md): NestJS modular monolith.
- [Code Quality & ESLint v1](standards/code-quality-v1.md): boundaries, ordering, magic numbers, rule tests.

## Current map (M01.2)

```text
apps/web/src/
  main.tsx                    # bootstrap: StrictMode + app/app.tsx + global CSS
  app/app.tsx                 # composition: <title>, favicon, HomePage with identity props
  app/styles/index.css        # Tailwind v4 + semantic tokens (light/dark, Japanese fonts)
  pages/home/                 # HomePage (identity via props) — renders HealthStatus
  domain/health/              # HealthStatus: api/requests.ts, model/, helpers/, hooks/, ui/
  shared/ui/                  # index.ts + primitives/button (shadcn on Base UI, story)
  shared/helpers/cn.ts        # `cn`
  test/setup.ts               # Vitest/RTL setup only
apps/api/src/
  main.ts                     # loads + validates env, creates the app
  app/app.module.ts           # composition root; app/app.config.ts = global prefix + shutdown hooks
  infrastructure/config/      # env parsing/validation (Zod)
  infrastructure/database/    # single pg pool + Drizzle provider (DATABASE token), local-URL guard
  modules/diagnostics/        # GET /api/health, GET /api/ready
infra/docker/postgres/init/   # repository-level Docker assets (not the API's infrastructure/)
compose.yaml                  # local PostgreSQL
product.config.json           # canonical product identity
```

- **Diagnostics ↔ health:** the API's `modules/diagnostics` owns the `/api/health` (liveness) and `/api/ready` (readiness) contracts; the web `domain/health` slice consumes them, treats only `{ status: 'ok', checks: { database: 'up' } }` as database online, and derives "database unknown" when the API is offline.
- **Product identity:** `@/product-config` is a single TS/Vite alias to the root `product.config.json`. ESLint allows it only in `src/app`; pages receive values as typed props.
- **shadcn:** `components.json` targets `@/shared/ui/primitives` and `@/shared/helpers/cn`. The CLI writes `primitives/<name>.tsx`; move it to `primitives/<name>/<name>.tsx`, import `cn` from `@/shared/helpers/cn`, export it from `shared/ui/index.ts` when used outside shared, then run `pnpm lint:fix`.
- **Database schemas** will live with their owning API module as `*.schema.ts` (Drizzle glob `src/**/*.schema.ts`); none exist yet.

### Enforcement and exceptions

Enforced by `pnpm lint` (`eslint.config.js`) and proven by `scripts/eslint-architecture.test.mjs`:

- Frontend layer direction, cross-slice access only via `pages/<slice>/index.ts`, `domain/<slice>/index.ts`, `shared/ui/index.ts` (`eslint-plugin-boundaries`, alias and relative imports both resolved).
- No internal `index.ts` barrels; relative imports at most `../../`; `model/` imports no React/api/helpers/hooks/store/ui.
- Main component contract for `app/app.tsx` and `{pages,domain}/<slice>/*.tsx` (`no-restricted-syntax` selectors).
- Backend: infrastructure never imports modules; `app/` imports modules only via `*.module.ts`; modules see other modules' `*.module.ts` only.
- Ordering (Perfectionist, auto-fixable) and `@typescript-eslint/no-magic-numbers` in `apps/*/src` (tests, specs and stories exempt).

Justified exceptions: shadcn primitives skip `sort-objects` (cva key order decides class precedence) and `react-refresh/only-export-components`; `main.tsx` and API `main.ts` are bootstrap files outside the layer graph.

Manual review only: a "main component file" is recognised by location (slice-root `.tsx`), not by content; exported Nest providers consumed across modules need an explicit contract when the first real consumer appears; one-component-per-file in `ui/`, WHAT/HOW placement and test placement are conventions, not lint gates.

## Responsibilities and dependency direction

- **Composition/bootstrap** may import both foundation and domain to assemble the app.
- **Foundation**: framework bootstrap, configuration, auth/session infrastructure, database connection, HTTP error conventions, observability, generic UI primitives, deployment. MUST NOT import Japanese-specific modules.
- **Japanese domain/features**: vocabulary, kana, kanji, practice, collections, progress. May depend on foundation public APIs; domain _rules_ should be pure TS where feasible.
- **Infrastructure**: HTTP/database/cache/storage implementations; adapter abstractions only where there's a meaningful substitute, test seam, or complex boundary. Avoid repository interfaces for trivial queries.
- **Presentation**: page/screen composition, UI components, view-state; avoid huge "everything hooks" returning dozens of unrelated values.
- **API**: validation at network boundaries, clear typed errors, server-side ownership and authorization checks, explicit data contracts; no secrets in browser.
- Prefer colocation by feature and small files when it improves navigation, **not** mandatory folder-per-function/test.
- Reuse is a design question: obvious generic concerns are foundation; uncertain candidates stay local until a second actual use case.

## Configuration strategy

**At M00:** root `product.config.json` is the canonical source for app identity. The web frontend consumes it through a small typed accessor or direct typed import. UI components must not duplicate title/tagline/glyph constants. A static Vite build may embed these values at build time in M00; this is acceptable for a developer scaffold. Avoid a generic runtime-config service until deployment customization is a real requirement.

**Later, for self-hosting:** distinguish two sources:

1. **Product/public config**: product identity (starting in `product.config.json`), branding, optional feature flags and public registration mode. Theme values come from CSS token files. The future Starter App should change branding through one small canonical config surface.
2. **Deployment/server config**: database URL, base URL, cookie/auth secrets, ports, storage credentials, internal toggles; environment variables/secrets, validated at startup.

A built Vite SPA cannot use build-time variables for per-installation runtime customization without rebuilding. At the self-host release milestone, design sanitized **public runtime config** so that an installer can change public identity/registration settings without rebuilding, while keeping all secrets server-only.

## Starter App extraction criterion (later)

Removing Japanese domain modules must leave a runnable web/API foundation, with stable bootstrap, auth, configuration, component primitives, and deployment tooling. The **composition root** may reference the domain; foundation internals may not. Replacing business routes, database tables, and migrations for another product is expected. We do _not_ create a dedicated starter repository or a long-lived `foundation` branch now.

## Auth plan (later milestone)

Common authentication flow regardless of product. First-owner initialization; `open`, `invite`, `closed` registration policies **enforced on server**, including OAuth identity creation. Multi-user data boundaries and session lifecycle. Do not wire auth to Japanese models; domain-specific onboarding is an app-level handler. Validate Better Auth/Nest integration before adopting; do not implement cryptography/session handling from scratch.

## Self-hosting plan (later milestone)

- Docker Compose for web/API/PostgreSQL, persistent database volume; publishable versioned images eventually.
- First-user bootstrap without leaking secrets, secure cookies and HTTPS guidance, backups **and tested restores**, health checks, upgrade/migration strategy.
- AWS-specific deployment, high availability, multiple replicas and Kubernetes are **not** requirements now.
- One ongoing `main` branch, short feature branches; **no** long-lived foundation branch.

## Offline/mobile plan (later milestone)

- User explicitly downloads selected learning data into web IndexedDB; app-shell caching via PWA service worker.
- Save attempted reviews locally with stable IDs; sync idempotently after reconnect; define conflicts and ordering later.
- React Native/Expo may reuse pure logic and API contracts, but native UI and storage will have their own adapters.

## Architecture decisions & Claude workflow

- Before irreversible/high-impact choices: investigate official docs, compare 2-3 real options, summarize reasoning in a short ADR only when useful.
- For ordinary UI, endpoints, or refactors: implement smallest correct change and verify.
- No giant agent orchestration. Start with root `CLAUDE.md`; KataKit is developed separately when repeated needs appear.
- Do not change code across domains for convenience; document actual limitations instead of inventing future scaffolding.
