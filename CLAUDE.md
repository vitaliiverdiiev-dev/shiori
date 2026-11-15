# Claude Code — Shiori

**Status:** M00–M02.1 complete. **M02 (identity) in progress:** M02.2 (first-admin CLI, invite-only registration) implemented and awaiting manual review; M02.3–M02.4 not authorized. Start a milestone or phase only after its task document exists under `docs/tasks/` and the user explicitly asks for it. Task documents and `docs/01`–`05` describe intended product and future decisions; they do **not** authorize implementing everything.

## Sources of truth

- **Engineering standards:** the KataKit skills (`backend-architecture`, `frontend-architecture`, `code-quality`, `testing`, `quality-gate`, `ui-design`) are canonical for generic TypeScript, architecture, testing and verification rules. Load the relevant ones for the task; do not substitute project docs for a skill that failed to load. Never edit KataKit.
- **Shiori specifics:** `docs/03-architecture.md` (current map, Shiori decisions and justified exceptions), active `docs/specs/` and `docs/tasks/` documents, `docs/02-tech-stack.md` decision statuses. `docs/standards/` is the Architecture v1 snapshot that `eslint.config.js` enforces.
- **Product identity:** `product.config.json` is canonical. Read title/tagline/glyph from it; never duplicate them in components or another config.

## Project constraints

- Mobile-first UI is non-negotiable. UI foundation: Tailwind v4, shadcn/ui on **Base UI**, semantic theme tokens, Storybook; add only components actually used.
- Keep the foundation independent of Japanese domain logic; compose the domain at the bootstrap boundary.
- Compiler flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) are set in the tsconfigs; the only exception is generated code in `packages/api-client` (see `docs/03-architecture.md`).
- Inventory and Punch UI are reference ideas only; do not copy their source or architecture.
- Machine-owned files are never hand-edited: `apps/api/openapi.json` and `packages/api-client/src/generated` (`pnpm api:generate`), and `apps/api/drizzle/` (`pnpm db:generate`; the only hand-written SQL is the body of a data migration created with `pnpm db:generate --custom`, and an applied migration is never rewritten). Never run `drizzle-kit push` or Better Auth's `auth migrate`.
- Better Auth and `@better-auth/core` are pinned exactly to the same version; an upgrade must follow the schema check in `docs/03-architecture.md`.
- Comments follow KataKit `code-quality`; `pnpm lint` enforces the markers via `shiori/comment-policy`. Do not add rule exemptions without review.
- Do **not** commit, push, deploy, publish, or install global Claude plugins without explicit permission.

## Commands

`pnpm dev` · `pnpm lint` / `pnpm lint:fix` · `pnpm typecheck` · `pnpm test` · `pnpm test:db` (needs `pnpm db:up`) · `pnpm build` · `pnpm build-storybook` · `pnpm format:check` · `pnpm api:generate` / `pnpm api:check`. Report actual results, not assumed success.

## Workflow

1. Read the active task and the relevant spec; check the repository and only material dependency compatibility concerns.
2. Implement the current task directly; do not write another planning document or wait for another approval.
3. Run the applicable checks (`quality-gate`), fix errors, report the outcome and only meaningful unresolved items, then stop where the task says to stop.

`.claude/settings.json` only disables commit/PR attribution; no project agents, skills or rules beyond this file.
