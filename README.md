# Shiori — 日本語の栞

**Your Guide to Japanese** · Logo glyph: **栞** · Repository: **`shiori`**

Shiori is a self-hosted Japanese vocabulary, kana and kanji learning application. Status: **M00–M01.2 complete; M02 (identity) implemented through M02.4, awaiting independent review** (web + API shell, local PostgreSQL with Drizzle, one-command dev, health/readiness diagnostics, architecture lint enforcement, Better Auth email/password with database sessions, first-admin and invitation CLI, invite-only registration, sign-in/sign-up/account/security pages, typed API client pipeline). No learning features, setup wizard, admin UI, SMTP or production deployment yet; local checks passing does not make it production-ready.

## Getting started

Requirements: [pnpm](https://pnpm.io/installation) 12+ and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running). You do not need to install Node yourself: `package.json` pins Node **26 LTS** via `devEngines.runtime`, and pnpm downloads it on install.

```sh
pnpm install
pnpm dev            # web on http://localhost:5173, API on http://127.0.0.1:3000/api (loopback only)
```

`pnpm dev` runs `scripts/dev-setup.mjs` first, then the apps:

1. Checks that Docker and Docker Compose are available.
2. Creates `.env` from `.env.example` if it is missing (fake, local-only values; an existing `.env` is never overwritten) and checks that `DATABASE_URL` matches the `POSTGRES_*` settings and points to this machine, and that the auth variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) are set. A `.env` created before M02.1 lacks them: copy both from `.env.example`.
3. Starts PostgreSQL (`docker compose up -d --wait postgres`) and waits until it is healthy.
4. Applies the committed migrations (`pnpm db:migrate`). It never generates migrations or pushes schema changes.
5. Starts Vite (HMR) and NestJS (watch mode) via Turborepo.

Any failure stops before the app servers start, with a message saying what to fix. Rerunning is safe: data, the container and `.env` are reused. **Ctrl+C** stops web and API; PostgreSQL keeps running (stop it with `pnpm db:down`). Use `pnpm dev:apps` to start only web and API when the database is already up.

The API serves everything under `/api`; the web dev server proxies `/api/*` to it (set `API_URL` to point elsewhere), so no CORS setup is needed locally. `GET /api/health` is liveness (no database); `GET /api/ready` is readiness (runs a bounded `select 1`, returns 503 if the database is down). The home page shows both.

| Command                                 | What it does                                                   |
| --------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                              | Prepare `.env` + PostgreSQL + migrations, then run web and API |
| `pnpm dev:apps`                         | Run only web (Vite) and API (Nest watch)                       |
| `pnpm build`                            | Production builds of both apps                                 |
| `pnpm typecheck`                        | TypeScript checks                                              |
| `pnpm lint`                             | ESLint incl. architecture boundaries and ordering (no changes) |
| `pnpm lint:fix`                         | ESLint with safe autofixes (imports, keys, JSX props order)    |
| `pnpm test`                             | Vitest (web + API), `scripts/` tests and ESLint rule fixtures  |
| `pnpm db:up` / `pnpm db:down`           | Start / stop local PostgreSQL (data kept)                      |
| `pnpm db:generate` / `pnpm db:migrate`  | Create / apply Drizzle SQL migrations                          |
| `pnpm db:studio`                        | Drizzle Studio for browsing the local database                 |
| `pnpm test:db`                          | Real-database integration test (needs `pnpm db:up`)            |
| `pnpm format:check`                     | Prettier check (`pnpm format` to fix)                          |
| `pnpm api:generate`                     | Regenerate `apps/api/openapi.json` and `packages/api-client`   |
| `pnpm api:check`                        | Fail if the contract or SDK differ from a fresh generation     |
| `pnpm auth:bootstrap-admin`             | Create the first admin (interactive, password hidden)          |
| `pnpm auth:invite create <email>`       | Create a 7-day, one-use invitation; prints its code once       |
| `pnpm auth:invite list` / `revoke <id>` | List invitations (no codes) / revoke an unused one             |
| `pnpm build-storybook`                  | Static Storybook build                                         |
| `pnpm --filter web storybook`           | Storybook dev server on http://localhost:6006                  |

## Database (local development)

Requires Docker. PostgreSQL 18 (`postgres:18-alpine`) runs from `compose.yaml`, reachable only from this machine on `127.0.0.1:55432` (change with `POSTGRES_PORT`).

`pnpm dev` handles setup automatically. The individual commands still work on their own:

```sh
pnpm db:up             # start PostgreSQL and wait until healthy
pnpm db:migrate        # apply committed migrations (drizzle-kit migrate)
pnpm db:studio         # Drizzle Studio on 127.0.0.1:4983 (Ctrl+C to stop)
pnpm test:db           # real-database test against the isolated shiori_test DB
pnpm db:down           # stop; data is kept in the shiori_postgres-data volume
```

- **Drizzle Studio** is optional and not started by `pnpm dev`. Its server listens only on `127.0.0.1:4983`; the UI opens at `https://local.drizzle.studio`, a page served by Drizzle that talks to that local server from your browser.

- The API reads `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (and optional `PORT`, `API_HOST`, `REGISTRATION_MODE`) from the environment or the root `.env`, validates them at startup and exits with an error naming the variable (never its value). Outside loopback, `BETTER_AUTH_URL` must be https and the example secret is refused (generate a 32+ character secret, e.g. `openssl rand -base64 32`); `REGISTRATION_MODE` is `closed` (default, no sign-up) or `invite`; `open` is refused until email verification exists. Drizzle commands need only `DATABASE_URL`. `/api/health` is liveness only and does not touch the database.
- The API listens on `127.0.0.1` only (`API_HOST`, default `127.0.0.1`), so other devices on your network cannot reach it; the web dev server proxies to `http://127.0.0.1:3000`. `API_HOST` takes an IP literal, not a host name. Setting a non-loopback address such as `0.0.0.0` or `::` exposes the API to the network; do that only behind a reverse proxy you control (see "Auth: deferred beyond M02" in `docs/03-architecture.md`).
- Schemas live with their owner as `apps/api/src/modules/<module>/[<capability>/]persistence/schemas/*.schema.ts` (Drizzle Kit discovers only those); the first migration, `0000_auth`, creates the Better Auth tables. Change a schema, then `pnpm db:generate` writes a reviewable SQL migration to `apps/api/drizzle/`; commit it and run `pnpm db:migrate`. Never use `drizzle-kit push` for real databases.
- `pnpm test:db` refuses to run unless `TEST_DATABASE_URL` points to a local database whose name ends in `_test`; each run drops that database's schemas and applies the committed migrations from scratch. The `shiori_test` database is created by `infra/docker/postgres/init/` when the volume is first initialised. `pnpm test` stays Docker-free.
- To wipe all local data deliberately: `docker compose down -v`.

## Accounts (local CLI)

There is no public setup page and no SMTP. Accounts are managed with local commands that read `.env` like the API (they build the API first):

```sh
pnpm auth:bootstrap-admin              # once per installation: prompts for name, email, password (hidden)
pnpm auth:invite create friend@example.com
pnpm auth:invite list
pnpm auth:invite revoke <id>
```

- Passwords are only read from the prompt, never from arguments or the environment, and are never printed. Bootstrap works once per installation, even across concurrent runs, and stays closed if that admin is later removed.
- An invitation is bound to its normalized (lower-case) email, valid for 7 days and usable once; only a SHA-256 hash of the code is stored, so the code cannot be shown again. Send it to the person yourself.
- With `REGISTRATION_MODE=invite`, the invitee opens `/sign-up` and enters name, email, password and the invitation code; sign-up never signs them in, so they sign in at `/sign-in` afterwards. `GET /api/registration` tells the web app which mode is active.
- Passwords (sign-up, password change, first admin) must be 15–128 characters; any language, spaces and emoji are fine. A small offline list of very common passwords and single repeated characters is refused. This is not a breached-password check.
- Sign-in, sign-up and password change are rate-limited (3 attempts per 10 seconds per path). Forwarded-IP headers are ignored, so all clients share that limit; this is the safe choice while the API is loopback-only. A deployment behind a reverse proxy must configure trusted client-IP handling; see "Auth: deferred beyond M02" in `docs/03-architecture.md`.

## Web app

Signed out: `/sign-in` and `/sign-up` (form only in invite mode). Signed in: `/` (home), `/status` (API and database status), `/settings/account` (name; email is read-only) and `/settings/security` (change password, which signs out other devices; sign out other devices). Unknown paths show a not-found page. If the session cannot be verified (API or database down), the app shows a retry screen with the server status instead of signing you out.

## Sharing source for review

```sh
pnpm review:zip   # requires Python 3.9+
```

Writes `../shiori-review-<timestamp>.zip` (next to the repository folder) and prints its path and file count. It contains tracked and non-ignored untracked files as they are on disk, including uncommitted edits, under a `shiori/` folder. Dependencies, build output, `.git`, logs, archives, `.env*` files (except `.env.example`), keys/certificates and other secret-looking files are always left out. Use `--output <path>` to choose another location.

> The filter works on file names; it is not a secret scanner. Inspect the archive before sharing it.

## Architecture

`apps/web` (React + Vite + Tailwind v4 + shadcn/ui on Base UI + Storybook) and `apps/api` (NestJS + Drizzle) follow the architecture standards: [frontend v1](docs/standards/frontend-architecture-v1.md), [backend v2](docs/standards/backend-architecture-v2.md), [code quality v1](docs/standards/code-quality-v1.md). Shiori's map and exceptions: [docs/03-architecture.md](docs/03-architecture.md).

```text
apps/web/src/  main.tsx · app/ (routes, layouts, query client, styles) · pages/{home,status,sign-in,sign-up,account-settings,security-settings,not-found} · domain/{auth,health} · shared/{api,ui,helpers} · test/
apps/api/src/  main.ts · cli.ts · openapi.ts · app/ (module, app.config, openapi) · infrastructure/{config,database,openapi,terminal} · modules/{auth,diagnostics}
packages/      api-client (generated from apps/api/openapi.json)
```

Tests sit next to the main component (`health-status.test.tsx`) or in a local `tests/` folder; API unit tests are `*.spec.ts`, e2e and DB tests live in `apps/api/test/`. `pnpm lint` rejects layer/slice violations, deep imports, extra top-level code in main component files and magic numbers; `pnpm lint:fix` sorts imports, exports, keys (`id` first) and JSX props.

**Adding a shadcn component:** `pnpm dlx shadcn@latest add <name> -c apps/web` writes `src/shared/ui/primitives/<name>.tsx`. Move it to `primitives/<name>/<name>.tsx`, change `import { cn } from 'cn'` to `@/shared/helpers/cn`, export it from `src/shared/ui/index.ts` if used outside `shared`, then run `pnpm lint:fix`.

## Development philosophy

- **Design for extension. Implement for current needs.**
- Start with an actual runnable application, not an abstract starter framework.
- The generic foundation must not depend on Japanese learning modules.
- Reuse patterns _when justified by real usage_, not speculative shared code.
- Meaningful architecture choices get small research comparisons; ordinary changes go directly to implementation and verification.
- Product branding belongs in `product.config.json`; secrets and deployment configuration will be separate in later milestones.

## Documentation map

| File                                             | Purpose                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `product.config.json`                            | Product identity: Shiori, 日本語の栞, slogan, logo glyph, repo name |
| `CLAUDE.md`                                      | Minimal coding and workflow rules                                   |
| `docs/01-product.md`                             | Product purpose, learning workflows, self-hosted scope              |
| `docs/02-tech-stack.md`                          | Decided, preferred, deferred technologies                           |
| `docs/03-architecture.md`                        | Shiori code map, enforced boundaries, configuration, future plans   |
| `docs/04-design-system.md`                       | Mobile-first UX, tokens, Base UI shadcn, Storybook                  |
| `docs/05-roadmap.md`                             | Milestone scope and sequencing                                      |
| `docs/tasks/M00-bootstrap.md`                    | M00 task (complete, historical record)                              |
| `docs/tasks/M00-review-instructions.md`          | M00 review follow-up (complete)                                     |
| `docs/tasks/M01-database-foundation.md`          | M01 task (complete)                                                 |
| `docs/tasks/M01.1-infrastructure-diagnostics.md` | M01.1 task (complete)                                               |
| `docs/tasks/M01.2-architecture-baseline.md`      | M01.2 task (complete)                                               |
| `docs/specs/M02-authentication-design.md`        | M02 authentication decisions (source of truth)                      |
| `docs/tasks/M02*.md`                             | M02 execution map and phases M02.1–M02.4 (awaiting review)          |
| `docs/standards/*.md`                            | Architecture v1: frontend, backend, code quality (portable)         |

Do not implement features from later milestones just because they are mentioned in the docs.
