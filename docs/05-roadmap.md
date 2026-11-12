# 05 — Shiori Incremental Delivery Roadmap

Only the **current milestone** is authorized for implementation. Do not scaffold future modules or install future dependencies before they are actually used.

| Milestone                | Outcome                                                                                                                                                                                                                              | Specific exclusions                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| M00 Complete             | pnpm/Turbo; strict TS; React/Vite and NestJS; canonical `product.config.json`; Shiori identity on mobile-first page; Tailwind v4; shadcn **Base UI** Button; semantic light/dark tokens; Storybook; basic health endpoint and checks | No DB/auth/Docker production stack/business domain |
| M01 Complete             | PostgreSQL dev via Docker Compose; Drizzle chosen; migration workflow configured (first real migration in M02); schema organization; typed env; backend tests                                                                        | No OAuth or domain complexity                      |
| M01.1 Complete           | One-command `pnpm dev` (env + PostgreSQL + migrations + apps); `/api/ready` readiness; API/DB status in UI; Drizzle Studio                                                                                                           | No production compose/Dockerfiles                  |
| M01.2 Complete           | Architecture v1 baseline: frontend layers/slices, NestJS app/infrastructure/modules, ESLint boundaries, ordering and magic-number rules with fixture tests                                                                           | No auth, no domain features                        |
| **M02 Next** Identity    | Secure sessions, first admin, email/password, registration policy `open/invite/closed`, authorization, login UI; verify Better Auth/Nest                                                                                             | No big role system/organizations unless needed     |
| M03 First learning slice | Kana content/readings; single practice type, answer evaluation, persisted progress, minimal useful mobile UX                                                                                                                         | No full JLPT curriculum / handwriting recognition  |
| M04 Vocabulary & reviews | Kanji–word relations, collections, SRS, second practice mode, generated typed API client if useful                                                                                                                                   | No full offline sync yet                           |
| M05 Self-host release    | Build/run with versioned Docker images and Compose, setup docs, backups/restores, security review, updates                                                                                                                           | No mandatory Kubernetes/AWS support                |
| M06 Offline              | Download content packs, PWA caching, local attempts, explicit sync policy                                                                                                                                                            | No Expo yet                                        |
| Later                    | Handwriting, native mobile Expo, advanced tables/filters/modals when real usage demands                                                                                                                                              | No speculative framework extraction                |

**Note:** Order after M00 may be adjusted by working-product needs, especially self-hosting. Avoid "enterprise readiness" as an excuse to implement hypothetical scaling systems. Aim for enterprise-quality engineering practices in a small modular product.

## Milestone completion rule

- A runnable vertical result exists.
- Relevant commands run successfully (or blockers are stated honestly).
- No unnecessary files/dependencies.
- Documentation updated only for actual decisions.
- Independent review before proceeding to next milestone.
