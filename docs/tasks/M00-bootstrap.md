# M00 — Bootstrap Shiori from scratch

**This is the current implementation task.** Implement now in the existing documentation-only repository. No approval loop or lengthy planning memo required.

## Objective

Create a clean, runnable, strict TypeScript full-stack monorepo for **Shiori**, with a **real shadcn/Base UI + Storybook foundation**. It must look intentionally mobile-first on the initial web screen, not like an unstyled starter template. Display the real Shiori brand identity from `product.config.json`. Do not add Japanese-specific business models yet.

## Do the work

1. Read `product.config.json`, `CLAUDE.md` and the project handoff docs. Check the existing files and official docs. Confirm compatible current versions of Node 26 LTS, pnpm, Turborepo, Vite, NestJS, Tailwind v4, shadcn CLI/Base UI, and Storybook. Summarize only _material_ incompatibilities; use current stable compatible versions and commit-lockfile-ready reproducible setup.
2. Set up pnpm workspaces and Turborepo, with `apps/web` (React + Vite + TS) and `apps/api` (NestJS + TS). Add shared config packages **only if** they remove real duplication already present. Keep standard root package scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `format:check` (adapt naming if justified). Avoid elaborate tooling wrappers.
3. Set strong TS flags for both applications: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, with explicit types and no `any`/unsafe casts. Configure ESLint flat config and Prettier without duplicate/conflicting formatters.
4. Keep **one** source of truth for the product identity: `product.config.json`. Wire its values into the web UI through a typed import/accessor. Show Shiori, 日本語の栞, the 栞 glyph and the tagline on the home screen; derive document title from config rather than copy/paste brand constants. Do not build a runtime config service in M00.
5. Initialize Tailwind CSS **v4** on web; configure shadcn/ui **using Base UI**, CSS variables and proper web app aliases. Use the official CLI; do not substitute Radix or a homebrew lookalike. Generate **only Button**; use it on the page. Keep semantic tokens for foreground/background/primary/border/radius and light/dark support. Ensure changing token values updates the Button and page consistently.
6. Configure **Storybook React + Vite** in web; load the same CSS tokens used by the app. Add Button stories for default, secondary/outline (where supported), and disabled. Verify Storybook starts/builds. No other components unless required.
7. Build a polished but simple **mobile-first** home/placeholder page (Shiori identity, a short Japanese-learning description, one real shadcn Button, responsive layout). Desktop expands gracefully; do not create complex navigation or product features.
8. Implement NestJS `GET /health` with a small typed response. From web, demonstrate the actual API connection and states without adding a global query/state library solely for this check. Use a Vite dev proxy or clearly explained CORS strategy for local development; fail transparently if API is unavailable.
9. Add a minimal web smoke test and an API health test using compatible tools. Confirm lint, typecheck, tests, builds. Do not replace working Nest test tooling just to unify test runners in M00.
10. Update the developer README with actual commands. Respect docs: later milestones are **not authorized** for implementation.

## Do NOT implement

- PostgreSQL/Drizzle/TypeORM, Better Auth, registration, sessions, domain services, dictionary data, OpenAPI/Orval, Zustand, TanStack Query, forms, DataTable, filters, modals, Sonner, PWA/offline sync, React Native, CI/CD platforms, release infrastructure, deployment to a server.
- Do not create placeholder domain packages, mega design-system package, agent hierarchy, auto-generated ADR for obvious choices, or custom libraries which duplicate installed tools.
- No commit, push, publishing, deployment, or global KataKit edits.

## Acceptance criteria

- Fresh checkout instructions work with Node 26 LTS and pnpm.
- Both `apps/web` and `apps/api` start; web shows intentional mobile-first design and connects to `/health`.
- The Shiori name, Japanese title, tagline and logo glyph come from `product.config.json` and are visible on the mobile-first web page.
- A shadcn **Base UI** Button is actually installed and used (verify generated implementation/setup, not only CSS resemblance).
- Semantic CSS light/dark tokens exist, and Storybook shows the real Button with variants/states.
- Lint, typecheck, tests, build and Storybook build succeed (or clearly report exact environment blocker).
- No unrequested systems or future-domain files are added.

## Final report (short)

- Repo tree (only relevant paths), exact installed versions.
- Dev/test/build/Storybook commands.
- Verification commands and results, with unresolved issues.
- Any narrow, evidence-based architecture recommendation for M01. No lengthy retrospective.
