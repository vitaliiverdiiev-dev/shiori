# Shiori — 日本語の栞

**Your Guide to Japanese** · Logo glyph: **栞** · Repository: **`shiori`**

Shiori is a self-hosted Japanese vocabulary, kana and kanji learning application. Status: **M00 complete** (runnable web + API shell, no learning features yet); **M01 database foundation is next**.

## Getting started

Requirements: [pnpm](https://pnpm.io/installation) 12+. You do not need to install Node yourself: `package.json` pins Node **26 LTS** via `devEngines.runtime`, and pnpm downloads it on install.

```sh
pnpm install
pnpm dev            # web on http://localhost:5173, API on http://localhost:3000/api
```

The API serves everything under `/api`; the web dev server proxies `/api/*` to it (set `API_URL` to point elsewhere), so no CORS setup is needed locally.

| Command                       | What it does                                       |
| ----------------------------- | -------------------------------------------------- |
| `pnpm dev`                    | Run web (Vite) and API (Nest, watch mode) together |
| `pnpm build`                  | Production builds of both apps                     |
| `pnpm typecheck`              | TypeScript checks                                  |
| `pnpm lint`                   | ESLint (root flat config, type-aware)              |
| `pnpm test`                   | Vitest (web + API) and the `scripts/` Python tests |
| `pnpm format:check`           | Prettier check (`pnpm format` to fix)              |
| `pnpm build-storybook`        | Static Storybook build                             |
| `pnpm --filter web storybook` | Storybook dev server on http://localhost:6006      |

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

| File                                    | Purpose                                                             |
| --------------------------------------- | ------------------------------------------------------------------- |
| `product.config.json`                   | Product identity: Shiori, 日本語の栞, slogan, logo glyph, repo name |
| `CLAUDE.md`                             | Minimal coding and workflow rules                                   |
| `docs/01-product.md`                    | Product purpose, learning workflows, self-hosted scope              |
| `docs/02-tech-stack.md`                 | Decided, preferred, deferred technologies                           |
| `docs/03-architecture.md`               | Foundation/domain boundaries, configuration, future auth/deployment |
| `docs/04-design-system.md`              | Mobile-first UX, tokens, Base UI shadcn, Storybook                  |
| `docs/05-roadmap.md`                    | Milestone scope and sequencing                                      |
| `docs/tasks/M00-bootstrap.md`           | M00 task (complete, historical record)                              |
| `docs/tasks/M00-review-instructions.md` | M00 review follow-up (complete)                                     |
| `docs/tasks/M01-database-foundation.md` | **Next task** — start only when explicitly requested                |

Do not implement features from later milestones just because they are mentioned in the docs.
