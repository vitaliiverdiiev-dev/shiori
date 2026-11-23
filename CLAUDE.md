# Claude Code — Shiori

**Status:** M00–M01.2 complete. **M02 (identity):** M02.1–M02.3 accepted; M02.4 (integration, security, verification) implemented and awaiting independent review. **F01** (routing & application foundation) accepted. **F02 (startup, theme & branding, `docs/tasks/F02-startup-theme-branding.md`)** implemented. **F02.1 (frontend compliance & simplification, `docs/tasks/F02.1-frontend-compliance.md`)** implemented and awaiting independent review. F03 (Storybook design experiments) was discontinued and removed. **F04 (production UI foundation & responsive layouts, `docs/tasks/F04-production-ui-foundation.md`)** implemented and awaiting independent review. **F04.1 (sidebar UX polish, `docs/tasks/F04.1-sidebar-ux-polish.md`)** implemented and awaiting independent review. **F05 (forms & reusable UI, `docs/tasks/F05-forms-reusable-ui.md`)** implemented and awaiting independent review. **F06 (React Compiler & performance verification, `docs/tasks/F06-react-compiler.md`)** implemented and awaiting independent review. **M03.1 (Kana catalog & selection, `docs/tasks/M03.1-kana-catalog-selection.md`)** implemented and awaiting independent review. **M03.2 (Kana practice session, `docs/tasks/M03.2-kana-practice-session.md`)** implemented and awaiting independent review, with follow-ups M03.2.1 (fast practice) and **M03.2.2 (repeated practice, balanced shuffle, hints, `docs/tasks/M03.2.2-repeated-practice-hints.md`)**. **M03.3 (persistent Kana progress, `docs/tasks/M03.3-kana-progress.md`)** implemented and awaiting independent review. **M03.3.1 (progress correctness & responsive layout, `docs/tasks/M03.3.1-progress-layout-polish.md`)** implemented and awaiting independent review. **M03.3.2 (Kana Practice/Statistics tabs & toolbar, `docs/tasks/M03.3.2-kana-tabs-toolbar.md`)** implemented and awaiting independent review. **M03.3.3 (persistent Practice action footer, `docs/tasks/M03.3.3-practice-action-footer.md`)** implemented and awaiting independent review. **M03.3.4 (contextual section information, Popover, `docs/tasks/M03.3.4-section-information.md`)** implemented and awaiting independent review. **M03.4.1 (focused refactoring after the M03.4 audit, `docs/tasks/M03.4.1-focused-refactoring.md`)** implemented and awaiting independent review. **M03.4.2 (final correctness verification, `docs/tasks/M03.4.2-final-verification.md`)** implemented and awaiting independent review. No later milestone or phase is authorized. Start a milestone or phase only after its task document exists under `docs/tasks/` and the user explicitly asks for it. Task documents and `docs/01`–`05` describe intended product and future decisions; they do **not** authorize implementing everything.

## Sources of truth

- **Engineering standards:** the KataKit skills (`backend-architecture`, `frontend-architecture`, `code-quality`, `testing`, `quality-gate`, `ui-design`) are canonical for generic TypeScript, architecture, testing and verification rules. Load the relevant ones for the task; do not substitute project docs for a skill that failed to load. Never edit KataKit.
- **Shiori specifics:** `docs/03-architecture.md` (current map, Shiori decisions and justified exceptions), active `docs/specs/` and `docs/tasks/` documents, `docs/02-tech-stack.md` decision statuses. `docs/standards/` is the snapshot that `eslint.config.js` enforces (frontend and code quality v1, backend v2).
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

## Technical communication

Use the KataKit Technical Communication Standard for plans, reviews, explanations,
subagent handoffs, and implementation reports. KataKit injects the canonical standard
at session and subagent start. Do not duplicate the standard in this repository.
If KataKit is disabled or the standard was not loaded, say so rather than claiming
that the communication standard was applied.
