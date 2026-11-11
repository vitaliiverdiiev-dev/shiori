# Claude Code — Shiori

**Status: M00 complete; M01 next** (`docs/tasks/M01-database-foundation.md`). Start a milestone only when the user explicitly asks for it. Before editing code, read `product.config.json`, `README.md`, `docs/01-product.md` through `docs/05-roadmap.md`, and the current task under `docs/tasks/`. These describe the intended product and future decisions; they do **not** authorize implementing everything.

## Principles

- **Design for extension. Implement for current needs.** Deliver the smallest correct, maintainable, runnable change for the active milestone.
- Start from a clean repo. Inventory and Punch UI are _reference ideas only_. Do not copy their source or import their architecture wholesale.
- Follow decision statuses in `docs/02-tech-stack.md`; verify current official package docs before consequential installation choices. If a preferred candidate is not yet needed, do not install it.
- TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; no `any`, unsafe assertions, or non-null assertions. Prefer named exports, avoid `React.FC` and nested ternaries.
- Mobile-first is non-negotiable. A phone layout must feel intentional, accessible, and touch-friendly rather than simply scaled down.
- UI foundation: Tailwind v4, **shadcn/ui using Base UI**, semantic CSS theme tokens, Storybook. Add only components actually needed.
- Keep foundation independent of Japanese domain logic. Compose domain into the app at the bootstrap boundary; avoid speculative layers, adapters, factories, package splits, providers, and global state.
- `product.config.json` is the **canonical source of product identity**. Read identity from it; do not duplicate title/tagline/logo glyph in application components or create a competing config for branding.
- Prefer colocated, cohesive code; do not enforce a folder for every function or test. Strong module boundaries matter more than folder counts.
- Perform relevant lint, typecheck, tests, builds, and Storybook build. Report actual results, not assumed success.
- Do **not** commit, push, deploy, publish, install global Claude plugins, or edit KataKit without explicit permission.

## Workflow

1. Read scope. Check the repository and only material dependency compatibility concerns.
2. Implement the current task directly; do not write another planning document or wait for another approval.
3. Run checks, fix errors, report outcome and only meaningful unresolved items.

No `.claude/agents`, `.claude/skills`, complex rules, or KataKit integration unless a task asks for it. Root `CLAUDE.md` is enough; `.claude/settings.json` only disables commit/PR attribution.
