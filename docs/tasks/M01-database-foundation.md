# M01 — PostgreSQL & Database Foundation

**Status:** NEXT — authorized only after the M00 follow-up in `M00-review-instructions.md` is completed and M00 is marked complete.

## Goal

Add a small, robust database foundation to the existing Shiori monorepo: local PostgreSQL, typed backend configuration, Drizzle ORM, explicit migration commands, and a real database connectivity integration test. Preserve the existing frontend, API health behavior, and Design System.

**Development principle:** Design for extension. Implement for current needs. We are building Shiori, not a generic database framework.

## ORM decision — Drizzle for Shiori (M01)

We considered **Drizzle** and **TypeORM**, using the Inventory App only as a reference, not as source code to copy.

| Criterion                  | Drizzle                                                             | TypeORM                                                             |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Database programming model | Explicit, SQL-oriented, schema in TypeScript                        | Entity/data mapper with decorators, repositories, and query builder |
| NestJS integration         | Small custom provider/module required                               | Mature `@nestjs/typeorm` integration                                |
| Schema organization        | Multiple files/directories supported                                | Entities can be colocated within modules                            |
| Migrations                 | Generated, reviewable SQL via Drizzle Kit                           | Generated or manually written migrations via DataSource             |
| Our current requirement    | Small PostgreSQL integration, explicit queries, minimum abstraction | More useful if a rich entity/repository model becomes necessary     |
| Trade-off                  | More explicit wiring in NestJS                                      | More framework/ORM machinery and decorator model                    |

**Decision:** Use Drizzle + `pg` (`node-postgres`) for M01. We prefer explicit queries and schema ownership over a repository/entity abstraction that is not yet needed. This is a deliberate **project choice**, not a claim that TypeORM is obsolete or unsuitable for enterprise systems.

Official references:

- https://orm.drizzle.team/docs/sql-schema-declaration
- https://orm.drizzle.team/docs/migrations
- https://orm.drizzle.team/docs/get-started-postgresql
- https://typeorm.io/docs/migrations/setup/
- https://typeorm.io/docs/releases/1.0/upgrading-from-0.3/

Before installing, check currently compatible **stable** versions against NestJS 12, TypeScript 6 and Node 26; do not install an RC/prerelease solely because the docs show `@rc`. If you uncover a genuine blocker, report it precisely rather than silently switching ORM.

## Implement

1. **PostgreSQL for local development**
   - Add a minimal `compose.yaml` / `docker-compose.yml` for **PostgreSQL only** (no web/API production containers yet).
   - Use a named volume, a database healthcheck, and a loopback-only host port by default. Choose a supported stable PostgreSQL image version and document it.
   - Keep credentials out of source control; provide `.env.example` with clearly fake local development values, and ensure `.env*` remains ignored except explicit examples.
   - Provide clear commands to start/stop PostgreSQL; stopping must not silently delete the volume.

2. **Runtime configuration in `apps/api`**
   - Validate the required database URL / configuration at the actual startup boundary with a minimal typed solution (e.g. Zod if justified). Fail early and clearly for missing/invalid config, without printing credentials.
   - Separate server/deployment config from `product.config.json` (which remains the single source of public product identity).
   - Avoid a generic multi-app configuration framework, excessive config layering, or duplicating env parsing across modules and migration scripts.
   - Preserve `/api/health` as a lightweight liveness endpoint; do not make it implicitly depend on database availability. A database readiness endpoint is optional **only if** a concrete use case appears; otherwise the integration test is sufficient.

3. **Drizzle + NestJS integration**
   - Use a single PostgreSQL connection pool and one small NestJS database provider/module, with explicit lifecycle/shutdown cleanup.
   - Make database access possible from future feature modules via a well-defined injection token or equivalent typed mechanism; do not implement repositories, adapters, base services, or domain packages without consumers.
   - Database infrastructure must not import Japanese-specific modules.
   - Make TypeScript types precise; no `any`, unsafe assertions, or non-null assertions.

4. **Schema organization and migrations**
   - Configure Drizzle Kit for versioned, reviewable SQL migrations (`generate`, `migrate`, optionally `check`). Do not use schema `push` as the production migration workflow or automatically mutate schema on every API startup.
   - Support splitting future schemas by actual feature/domain module; avoid one mandatory giant global schema file. Start with the smallest viable location/entrypoint needed by the chosen Drizzle version.
   - **Do not invent a fake `users`, `settings`, or `health_checks` product table solely for M01.** With no legitimate persisted domain data yet, it is acceptable for M01 to configure and execute the migration command against a clean local database with no pending domain migrations. The first real, reviewed SQL migration belongs to M02 (auth), when a real model exists.
   - Clearly document this intentional limitation: M01 verifies the migration workflow configuration, but does **not** yet prove a non-empty production schema migration. Do not claim otherwise.

5. **Verification**
   - Add one real DB integration test that runs an innocuous `SELECT 1` through the actual configured database connection/provider (not a mocked ORM). The test must use an explicit, isolated local **test database**; refuse to run against an unknown/production-looking URL.
   - Keep the ordinary `pnpm test` working without Docker if it currently works without Docker. Expose the real DB integration test separately (`test:db` or an equivalent clearly documented command).
   - Verify DB start, environment validation, API startup, database connection, migration CLI against a disposable dev database, and clean shutdown. Do not print DB secrets.
   - Run and report: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build-storybook`, `pnpm format:check`, and the database integration test. If Docker is unavailable, state exactly what was not verified rather than claiming success.

6. **Documentation and scripts**
   - Add the smallest practical root/API scripts for `db:up`, `db:down`, `db:generate`, `db:migrate`, and `test:db` (naming may differ if more consistent with existing conventions).
   - Update README with reproducible database setup, how to migrate, how to run a DB integration test, and the data-preserving behavior of `db:down`.
   - Keep `CLAUDE.md`, `docs/05-roadmap.md`, and documentation status consistent when the milestone is complete.

## Do not implement in M01

- Better Auth, login, owner bootstrap, sessions, registration policies, OAuth, user entities, app roles.
- Japanese vocabulary/kana/kanji/practice tables, endpoints, or frontend features.
- TanStack Query, OpenAPI/Orval, Zustand, new UI primitives, DataTable, PWA, mobile app, production deployment, Kubernetes/AWS.
- Redis, job queues, microservices, database-per-module, infrastructure abstraction layers with no consumer.
- Dummy application tables created only to make the milestone look larger.
- Automatic Git commits, pushes, production deployment, or KataKit changes.

## Acceptance criteria

- Local PostgreSQL can be started with a documented command; the default configuration does not expose it to the whole network.
- API uses a typed, validated backend database config and can connect via a single managed pool/provider; missing/invalid config fails clearly.
- Drizzle Kit is configured for versioned migrations, including future multi-file schemas, and the migration command runs; no false claim of a real domain migration until M02.
- A DB integration test proves real connectivity with a safely isolated test database.
- Existing `/api/health`, web UI, Storybook, and M00 tests still work.
- The listed verification commands pass, or exact environmental blockers are reported.
- No unnecessary modules, schemas, endpoints, or abstractions are introduced.

## Short final report

Provide: changed-file list, chosen package versions, exact database/migration/test commands, actual verification results, and blockers. Mention the deliberate absence of a domain migration in M01. Do not write another large architecture memo or request an approval loop for this scoped task.
