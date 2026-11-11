# 03 — Shiori Architecture & Foundation Boundaries

## Goals

Readable, maintainable, production-minded **modular monolith**. Learn established full-stack engineering practices without layering every CRUD endpoint into five artificial abstractions. Clean code is a result of clear dependencies and cohesive modules, not folder count.

## Initial repository shape (M00)

```text
apps/
  web/          # React + Vite + shadcn UI, Storybook
  api/          # NestJS app
packages/      # create ONLY packages that have an actual first consumer
  ...
docs/          # handoff + future lightweight ADRs
product.config.json # canonical product identity (root)
turbo.json
pnpm-workspace.yaml
CLAUDE.md
```

Allow tools to generate their conventional files, but do not create empty `domain/`, `services/`, `adapters/`, `contracts/`, `ui/`, `mobile/` packages simply to look architectural. Do not overengineer Nest modules in M00.

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
