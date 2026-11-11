# Shiori — 日本語の栞

**Your Guide to Japanese** · Logo glyph: **栞** · Repository: **`shiori`**

Shiori is a self-hosted Japanese vocabulary, kana and kanji learning application. Status: **M00, M01 and M01.1 complete** (web + API shell, local PostgreSQL with Drizzle, one-command dev, health/readiness diagnostics; no learning features yet); **M02 identity is next**.

## Getting started

Requirements: [pnpm](https://pnpm.io/installation) 12+ and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running). You do not need to install Node yourself: `package.json` pins Node **26 LTS** via `devEngines.runtime`, and pnpm downloads it on install.

```sh
pnpm install
pnpm dev            # web on http://localhost:5173, API on http://localhost:3000/api
```

`pnpm dev` runs `scripts/dev-setup.mjs` first, then the apps:

1. Checks that Docker and Docker Compose are available.
2. Creates `.env` from `.env.example` if it is missing (fake, local-only values; an existing `.env` is never overwritten) and checks that `DATABASE_URL` matches the `POSTGRES_*` settings and points to this machine.
3. Starts PostgreSQL (`docker compose up -d --wait postgres`) and waits until it is healthy.
4. Applies the committed migrations (`pnpm db:migrate`). It never generates migrations or pushes schema changes.
5. Starts Vite (HMR) and NestJS (watch mode) via Turborepo.

Any failure stops before the app servers start, with a message saying what to fix. Rerunning is safe: data, the container and `.env` are reused. **Ctrl+C** stops web and API; PostgreSQL keeps running (stop it with `pnpm db:down`). Use `pnpm dev:apps` to start only web and API when the database is already up.

The API serves everything under `/api`; the web dev server proxies `/api/*` to it (set `API_URL` to point elsewhere), so no CORS setup is needed locally. `GET /api/health` is liveness (no database); `GET /api/ready` is readiness (runs a bounded `select 1`, returns 503 if the database is down). The home page shows both.

| Command                                | What it does                                                   |
| -------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                             | Prepare `.env` + PostgreSQL + migrations, then run web and API |
| `pnpm dev:apps`                        | Run only web (Vite) and API (Nest watch)                       |
| `pnpm build`                           | Production builds of both apps                                 |
| `pnpm typecheck`                       | TypeScript checks                                              |
| `pnpm lint`                            | ESLint (root flat config, type-aware)                          |
| `pnpm test`                            | Vitest (web + API) and the `scripts/` tests (Python, Node)     |
| `pnpm db:up` / `pnpm db:down`          | Start / stop local PostgreSQL (data kept)                      |
| `pnpm db:generate` / `pnpm db:migrate` | Create / apply Drizzle SQL migrations                          |
| `pnpm db:studio`                       | Drizzle Studio for browsing the local database                 |
| `pnpm test:db`                         | Real-database integration test (needs `pnpm db:up`)            |
| `pnpm format:check`                    | Prettier check (`pnpm format` to fix)                          |
| `pnpm build-storybook`                 | Static Storybook build                                         |
| `pnpm --filter web storybook`          | Storybook dev server on http://localhost:6006                  |

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

- **Drizzle Studio** is optional and not started by `pnpm dev`. Its server listens only on `127.0.0.1:4983`; the UI opens at `https://local.drizzle.studio`, a page served by Drizzle that talks to that local server from your browser. There are no application tables until the first real migration (M02, auth).

- The API reads `DATABASE_URL` (and optional `PORT`) from the environment or the root `.env`, validates it at startup and exits with a clear error if it is missing or invalid. `/api/health` is liveness only and does not touch the database.
- Schemas live next to their feature as `apps/api/src/**/*.schema.ts`. Change a schema, then `pnpm db:generate` writes a reviewable SQL migration to `apps/api/drizzle/`; commit it and run `pnpm db:migrate`. Never use `drizzle-kit push` for real databases.
- **Current limitation:** there are no tables yet. `apps/api/drizzle/meta/_journal.json` is Drizzle's empty migration journal, so `db:migrate` runs but applies nothing, and `db:generate` fails with "No schema files found" (exit code 1) until the first schema arrives with M02 (auth); that error is expected, not a broken setup. M01 verifies the workflow, not a real schema migration.
- `pnpm test:db` refuses to run unless `TEST_DATABASE_URL` points to a local database whose name ends in `_test`. The `shiori_test` database is created by `infra/docker/postgres/init/` when the volume is first initialised. `pnpm test` stays Docker-free.
- To wipe all local data deliberately: `docker compose down -v`.

## Sharing source for review

```sh
pnpm review:zip   # requires Python 3.9+
```

Writes `../shiori-review-<timestamp>.zip` (next to the repository folder) and prints its path and file count. It contains tracked and non-ignored untracked files as they are on disk, including uncommitted edits, under a `shiori/` folder. Dependencies, build output, `.git`, logs, archives, `.env*` files (except `.env.example`), keys/certificates and other secret-looking files are always left out. Use `--output <path>` to choose another location.

> The filter works on file names; it is not a secret scanner. Inspect the archive before sharing it.

Layout: `apps/web` (React + Vite + Tailwind v4 + shadcn/ui on Base UI + Storybook), `apps/api` (NestJS). Add shadcn components with `pnpm dlx shadcn@latest add <name> -c apps/web`.

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
| `docs/03-architecture.md`                        | Foundation/domain boundaries, configuration, future auth/deployment |
| `docs/04-design-system.md`                       | Mobile-first UX, tokens, Base UI shadcn, Storybook                  |
| `docs/05-roadmap.md`                             | Milestone scope and sequencing                                      |
| `docs/tasks/M00-bootstrap.md`                    | M00 task (complete, historical record)                              |
| `docs/tasks/M00-review-instructions.md`          | M00 review follow-up (complete)                                     |
| `docs/tasks/M01-database-foundation.md`          | M01 task (complete)                                                 |
| `docs/tasks/M01.1-infrastructure-diagnostics.md` | M01.1 task (complete)                                               |

Do not implement features from later milestones just because they are mentioned in the docs.
