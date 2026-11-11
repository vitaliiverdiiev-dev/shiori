# 02 — Shiori Technology Decisions (11 Nov 2026)

Statuses: **DECIDED** = implement when its milestone arrives; **PREFERRED** = chosen direction but verify with a small practical integration; **VALIDATE LATER** = do not install in M00; **DEFERRED** = future scope only.

| Area                   | Technology                                                  | Status                      | Note                                                                                               |
| ---------------------- | ----------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Runtime                | Node.js **26 LTS**                                          | DECIDED                     | Use a current supported LTS patch and check compatibility                                          |
| Language               | TypeScript strict                                           | DECIDED                     | End-to-end TS; no `any`                                                                            |
| Product identity       | Root `product.config.json`                                  | DECIDED                     | Canonical name/title/glyph/tagline/repo; M00 web consumes it                                       |
| Monorepo               | pnpm workspaces + Turborepo                                 | DECIDED                     | Keep shared packages minimal                                                                       |
| Web                    | React 19 + Vite + TypeScript                                | DECIDED                     | SPA; mobile-first                                                                                  |
| Backend                | NestJS (modular monolith)                                   | PREFERRED                   | Learn established Node/TS backend patterns without excessive ceremony                              |
| Styling                | Tailwind CSS v4                                             | DECIDED                     | Semantic tokens / CSS variables                                                                    |
| UI components          | **shadcn/ui with Base UI**                                  | DECIDED                     | NOT Radix for the new project; own generated component source                                      |
| Component explorer     | Storybook React + Vite                                      | DECIDED                     | Start with Button states in M00                                                                    |
| Data / server state    | TanStack Query                                              | DECIDED for data milestones | Not needed in M00 unless real API async state warrants it                                          |
| Local app state        | React state first; Zustand selectively                      | DECIDED policy              | Do not introduce global stores for trivial cases                                                   |
| Forms                  | React Hook Form + Zod                                       | PREFERRED                   | Add when first substantive form appears                                                            |
| Routing                | React Router or TanStack Router                             | VALIDATE LATER              | Avoid installing both; routing beyond a single placeholder not needed in M00                       |
| Database               | PostgreSQL                                                  | DECIDED                     | Introduce in M01                                                                                   |
| ORM                    | Drizzle (`drizzle-orm` + `pg`)                              | DECIDED (M01)               | Chosen over TypeORM for explicit SQL-oriented queries; see `docs/tasks/M01-database-foundation.md` |
| Database migrations    | Drizzle Kit                                                 | DECIDED (M01)               | Modular schema files; controlled migrations                                                        |
| Auth                   | Better Auth                                                 | PREFERRED                   | Test Nest integration and registration policy before adopting                                      |
| API contract           | OpenAPI + generated types/client (Orval candidate)          | PREFERRED                   | Compare with alternatives at first real endpoint; avoid hand-maintained duplicate contracts        |
| Notifications          | Sonner                                                      | PREFERRED                   | Add once needed, one provider                                                                      |
| Tables                 | TanStack Table (v9 series as of Nov 2026)                   | DEFERRED                    | Config-driven wrapper built incrementally from real usage                                          |
| Testing                | Vitest + React Testing Library; Storybook interaction tests | DECIDED for web             | Nest test tooling when API tests grow; avoid redundant test frameworks                             |
| Dev deployment         | Local processes; Docker Compose for Postgres in M01         | DECIDED                     | Minimal bootstrap does not require production containers                                           |
| Self-host distribution | Docker Compose + prebuilt container images                  | DECIDED target              | Implement later with backup/restore, HTTPS guide                                                   |
| Offline                | PWA, IndexedDB web, SQLite mobile                           | DEFERRED                    | Sync semantics defined from real requirements                                                      |
| Mobile app             | Expo + React Native                                         | DEFERRED                    | Share domain/client logic, not shadcn JSX                                                          |
| KataKit                | Separate minimal Claude plugin                              | DEFERRED                    | Only root CLAUDE.md for M00                                                                        |

## Scope guard

**Install in M00:** only packages needed for pnpm/Turbo, React/Vite web, NestJS API, Tailwind v4, shadcn/Base UI Button, Storybook and relevant checks. No dependency should be installed just because it appears in this future stack table.

**Not a package-version contract:** install compatible current stable releases and preserve resolved versions in the lockfile. The stack choices are architecture decisions, not an instruction to force incompatible majors.

## Important validation notes

- **Better Auth + NestJS**: Better Auth lists a _community-maintained_ NestJS integration; verify support for current Nest/adapter, request-body handling, secure cookies, logout, sessions and registration policy in a small vertical spike. Do not add auth in M00.
- **Drizzle**: schema can live in multiple files; avoid one giant global schema. Do not add ORM/DB in M00.
- **API client**: OpenAPI → generated client worked well conceptually in Inventory. Do not add generation pipeline for a single `/health` response; introduce at first domain endpoint.
- **Version policy**: avoid inventing exact package numbers. Check official documentation and package compatibility; install current stable compatible versions, pin via lockfile, report actual resolved versions. Do not upgrade just because a new major appears during implementation.
- **Node**: official release schedule lists Node 26 as Active LTS from 28 Oct 2026; choose matching local/CI version.

## Official references

- Node releases: https://nodejs.org/en/about/previous-releases
- pnpm: https://pnpm.io/workspaces
- Turborepo: https://turborepo.com/docs
- React: https://react.dev/
- NestJS: https://docs.nestjs.com/
- shadcn CLI: https://ui.shadcn.com/docs/cli
- shadcn Base UI default: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- Tailwind tokens: https://tailwindcss.com/docs/theme/
- Storybook React/Vite: https://storybook.js.org/docs/get-started/frameworks/react-vite/
- Drizzle schema layout: https://orm.drizzle.team/docs/sql-schema-declaration
- Better Auth Nest: https://www.better-auth.com/docs/integrations/nestjs
- TanStack Table v9: https://tanstack.com/blog/announcing-tanstack-table-v9
