# Shiori M02 — Authentication Design Specification

Status: **Approved product scope; technical integration must be proved in M02.1**. Date: 14 November 2026.
Owner: Shiori repository. Applies to milestones M02.1–M02.4. This is the **Shiori-specific source of truth** for M02 decisions; do not duplicate generic KataKit standards here.

## 0. Read-first and authority

Before implementation, inspect the **current** repository, `CLAUDE.md`, `docs/01-product.md` through `docs/05-roadmap.md`, `docs/standards/{frontend-architecture-v1,backend-architecture-v1,code-quality-v1}.md`, and the active M02 task. Apply the installed KataKit skills as relevant: `frontend-architecture`, `backend-architecture`, `code-quality`, `testing`, `ui-design`, and final `quality-gate`. Prefer current source files over outdated examples. These tasks authorize **only their explicitly requested phase**, not the full roadmap, commit or deployment.

Repository baseline checked: `https://github.com/vitaliiverdiiev-dev/shiori` on 14 Nov 2026. Node 26, pnpm/Turbo, React 19/Vite SPA, NestJS modular monolith, PostgreSQL 18, Drizzle, root `pnpm dev` that migrates before starting services, `/api/health` and `/api/ready`, Storybook, architecture lint checks. **No auth implementation assumed already present**. Existing roadmap marks M02 as next, and the first substantive SQL migration belongs here. Do not silently overwrite current repo changes if it has advanced.

## 1. Product decisions — locked for M02

| Area             | M02 decision                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth engine      | Better Auth email/password; NestJS adapter only after compatibility verification                                                                                          |
| DB               | PostgreSQL with existing Drizzle + existing managed pool; avoid second pool                                                                                               |
| Roles            | `admin`, `user`; no full RBAC/organizations/impersonation                                                                                                                 |
| First admin      | Local secure CLI bootstrap **now**, guarded against repeats and races; later UI Setup Wizard                                                                              |
| Registration     | `closed` default, `invite` enabled, `open` **not operational** until reliable email verification/delivery; reject unsafe `open` config at startup                         |
| Invitations      | CLI-created, email-bound, high-entropy, one-use, 7-day expiry, hashed at rest, revocable; no SMTP; later Admin UI                                                         |
| Signup           | Does **not** automatically sign in; after signup show safe completion and navigate to sign-in                                                                             |
| Password         | 15–128 characters; no uppercase/number/symbol complexity rules; permit spaces, passphrases, Unicode, autofill, paste; verify client/server alignment                      |
| Password UX      | Confirmation on sign-up and password change; show/hide; avoid distracting strength theater                                                                                |
| Password check   | Reject a defensible set of very common/compromised passwords using a practical documented strategy; no undeclared external network requirement or faux-complete blocklist |
| Accounts         | Profile name update; email read-only until verified email change is supported; current-password change; no email reset yet                                                |
| Sessions         | Better Auth database-backed cookie sessions, default 7-day sliding expiry; no cookie cache or duplicate Zustand session store; logout/revoke other sessions               |
| Web              | React Router 7 declarative SPA; guest `sign-in`, gated `sign-up`; protected `/`, `/status`, `/settings/account`, `/settings/security`; no public marketing page           |
| HTTP             | Better Auth native typed client for auth; custom Nest endpoints use Axios + Hey API generated SDK from Nest OpenAPI, TanStack Query 5 for async server state              |
| Forms            | React Hook Form + Zod                                                                                                                                                     |
| Install future   | One command to install, UI setup/admin without IT knowledge; no wizard/production installer/SMTP implemented now                                                          |
| Scope boundaries | No OAuth, MFA, organization/team, admin dashboard, forgotten-password email, production hosting setup, or real Japanese-learning data in M02                              |

### 1.1 User journeys

**New local installation:** operator runs `pnpm dev`, applies migrations, then runs a documented **interactive local CLI** to create the first admin, with secret input hidden and not passed as CLI argument or written to a shell history. Next launch refuses to bootstrap a second initial admin. Login is then possible.

**Invite-only installation:** operator creates code for a normalized email via local CLI; the code is displayed once and passed outside the app. Recipient opens `/sign-up`, enters name/email/password/confirmation/invitation code. Backend enforces current mode, code, expiry, email binding and one-time use. Successful signup does not create a session. User signs in separately. Because duplicate-email signup can deliberately receive a synthetic success response, **do not promise that an account was created** based solely on a success status; the UI can offer a neutral next-step message and sign-in link. Do not reveal email existence through messages or invite-consumption side effects.

**Closed registration:** guest can use `/sign-in` but cannot create an account (including by direct HTTP POST). Existing users continue to sign in. In `open`, without delivery/verification, boot must fail with clear configuration error rather than silently enabling unverified public signup. Expose only a minimal read-only public registration-capability response (`closed` or `invite`) for frontend navigation, with no invitation validation, secrets, email existence or user information in this endpoint; prefer including it as an ordinary typed Nest endpoint in OpenAPI/Hey API.

**Account security:** signed-in user can change their own name, change password using current password (revoking other sessions), sign out on this device, and revoke other sessions. Email is visible but not editable. No privileged admin access to learning data.

**Failure handling:** invalid credentials use generic messages; login/signup unavailable on server/network outage is not conflated with invalid session; transient 5xx does not log the user out; failed/repeated invitation never gives two accounts; user A's cached private data is not visible to user B in one browser.

## 2. Technical architecture

### 2.1 Backend ownership

Use the current `apps/api/src/app/` composition root, `infrastructure/{config,database}/` (env and shared DB pool), and `modules/auth/` (Better Auth config, session/registration policy, invitation and bootstrap operations). `modules/diagnostics/` remains distinct; health/readiness must be publicly accessible to health probes and not reveal secrets. Never create speculative Users/Sessions/Permissions modules to mirror a vendor library.

**CLI is a transport, not the source of business logic.** Commands should invoke reusable auth module operations, so a future authenticated Admin UI or protected setup endpoint can reuse them. Future public setup must use a separately verified one-use installer secret and atomic first-admin invariant, not an unguarded `if (userCount === 0)` endpoint. Do not build future UI now.

Avoid duplicate PostgreSQL pools. Validate compatibility among current Nest, Better Auth, community Nest integration, Drizzle adapter, Node and TS versions before locking dependencies. Confirm the exact route mounting with the current Nest global `/api` prefix: `/api/auth/*` **once**, never `/api/api/auth/*`. Verify body parser, same-origin cookies, guards, sign-up hooks, and Nest public health endpoints with live HTTP integration tests.

**Admin Plugin is not safe merely because it provides `admin` role.** It exposes powerful endpoints (including impersonation, changing user credentials and roles) by default. Either supply proven minimal server-enforced permissions and explicitly test that undesired endpoints fail, or decline the plugin and implement the minimal role mechanism safely. Neither hidden UI nor role checking only in React counts. Do not leave a broadly privileged admin API accessible as a shortcut for CLI operations. Preserve initial admin privilege safely and avoid accidental demotion/removal of the last admin.

### 2.2 Auth database and migration

Core Better Auth schema: user/account/session/verification as required by **installed** version and selected plugins; never invent schema fields from an example. Add only one project-owned invitation table (or equivalent proven minimal state) where warranted. Persist a cryptographic hash of invite code, not the raw code; support expiry, revocation, one-use, and concurrency. Use PostgreSQL uniqueness/check constraints and real transactions or a rigorously proven alternative.

**Potential blocker: atomic invitation redemption.** Before designing it, prove the invite code can be passed to and validated by the actual Better Auth sign-up endpoint (including body schema restrictions), and that **every** account-creating route is constrained. `before/after` hooks do not by themselves make invitation consumption atomic with Better Auth's user/account inserts. M02.1 must investigate and record the supported transaction boundary; M02.2 must provide tests for two concurrent signups, partial failure, retries, crash/recovery, and email-match behavior. If atomicity cannot be demonstrated with the available adapter, **stop and report a concrete design alternative**; do not mark one-use invitations secure based on a sequential happy path. Better Auth adapter support and database hook semantics vary by version.

For the Drizzle adapter, generate the ORM auth schema using the installed compatible Better Auth CLI and use the **existing Drizzle Kit** to create/commit/apply SQL migration. **Decided in M02.1 review:** the schema was written by hand from the installed version's `getAuthTables` output (running the CLI through `pnpm dlx` was blocked by package-execution restrictions, which must not be bypassed). Better Auth's runtime schema check and `pnpm test:db` guard it; every Better Auth upgrade must re-verify the schema (see `docs/03-architecture.md`). Do not run `auth migrate` as if it migrated a Drizzle database. Ensure both production/dev and isolated test DBs get the same committed migration; `pnpm dev` must continue to migrate repeatably.

### 2.3 Auth session and security

Session source of truth is Better Auth; `useSession`/typed client in React. Database-backed sessions, 7 days rolling expiration (verify exact Better Auth options), no `cookieCache` in M02. Cookie options must be appropriate for HTTPS/production and localhost development (`Secure` in HTTPS); `HttpOnly`, SameSite, Origin/trustedOrigins and CSRF protections preserved. Prefer same-origin `/api` proxy. Better Auth secret: strong production secret; env validation rejects missing/weak placeholders outside development. Do not leak tokens/passwords/secrets in logs, traces or test snapshots.

Review reverse-proxy trust boundaries before deriving an IP address for rate limiting. Rate limiting applies to sign-in, sign-up, invite validation/attempts and other sensitive endpoints. Ensure development-only in-memory behavior is not presented as reliable across future production replicas; document storage/scale assumption. Avoid perma-lockout abuse, overbroad admin grants, and cleartext credentials.

No forced password complexity; require 15–128 with consistent Unicode handling; never trim passwords. Use Better Auth password hashing (no DIY hashing). **Decided in M02.1 review:** Better Auth's hasher applies Unicode NFKC to the password before hashing and verifying; this is accepted, so canonically or compatibility-equivalent input (e.g. full-width Latin typed with a Japanese IME) is the same password. The 15–128 length check counts UTF-16 code units of the raw input, so client validation must use the same rule. Covered by `apps/api/test/auth.db-spec.ts`. A common-password/breached-password strategy must not silently depend on external availability: document actual offline guarantee, online optional behavior, and unavailable-network policy. No fake claim that a tiny local list checks all known leaks.

Generic login errors to avoid user enumeration. With `autoSignIn: false` and Admin Plugin, verify `customSyntheticUser` response fields for indistinguishable duplicate-email signup responses, per installed docs. Avoid a success/error differential that discloses existing email. Frontend messages derived from known typed error codes; unknown errors show safe neutral fallback.

### 2.4 Frontend architecture and routing

Use `apps/web/src/app/` for router composition, query provider, root layouts and CSS (`app/styles/`). Four root frontend layers only: `app -> pages -> domain -> shared`, respecting ESLint boundaries and public `index.ts`. `pages` own page composition, `domain/auth/` owns auth logic, `shared` has generic UI. The Better Auth instance belongs at `domain/auth/config/auth-client.ts` as agreed (not `api/auth-client.ts`). No unnecessary `store/` for session.

Actual routes in M02:

| Route                | Access/behavior                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Protected home/dashboard placeholder, no public landing                                                                   |
| `/sign-in`           | Guest only; signed-in user redirected to `/`                                                                              |
| `/sign-up`           | Guest only; available in invite mode, rejected in closed/open-disabled; frontend presentation mirrors safe backend policy |
| `/settings/account`  | Protected; name edit, read-only email                                                                                     |
| `/settings/security` | Protected; password change and other-session revocation                                                                   |
| `/status`            | Protected UI diagnostics; `GET /api/health` and `/api/ready` stay publicly callable                                       |
| `*`                  | Accessible not-found state; may include link to safe destination                                                          |
| `/admin/*`, `/setup` | Future only; do not scaffold pages                                                                                        |

Implement a small guest/protected route boundary around Better Auth session checking, with four distinct states: checking, authenticated, unauthenticated, **unavailable**. Network 5xx should not immediately be treated as logout. Avoid protected-content flashes; do not blank the whole app during quiet background refresh. After login restore an **internal, validated** redirect only; reject protocol-relative, encoded, cross-origin and malformed destinations. Fallback `/`.

Use RHF + Zod for meaningful forms; place schemas in `model/`, transforms in `helpers/`, React orchestration in `hooks/` only when justified, UI under `ui/`, configuration in `config/`. Follow the exact main-component top-level contract in Architecture v1; no CSS modules/local styles; Tailwind in components and theme tokens in `app/styles/`. UI: clean mobile-first, touch-friendly, keyboard and screen-reader accessible, loading/error/success states, low animation, no unnecessary decorative cards.

### 2.5 Data transport and end-to-end typing

- **Auth**: use Better Auth's own typed React client for login/signup/session/change-password/sign-out. Do not duplicate its endpoints in Hey API.
- **Own NestJS endpoints**: define runtime-validated Zod schemas/DTOs and accurate OpenAPI operation IDs/responses; generate typed SDK and TanStack Query query/mutation options with Hey API, Axios as HTTP transport. Don't write parallel hand-maintained TypeScript DTOs and `fetch` wrappers.
- Determine the exact compatible Nest + Zod OpenAPI bridge in M02.1 (real generated spec, not theoretical). Zod source of runtime truth whenever compatible; if framework integration cannot derive reliable OpenAPI, document the smallest supported alternative without silently changing stack.
- Prefer generated SDK in a domain-specific `packages/api-client` workspace if actually used by the web health-check; do not introduce a generic API framework or unused packages. Generated files are machine-owned and not manually edited; codegen determinism and drift checked in CI/quality gate.
- TanStack Query 5 manages _all app-specific async server state_ including existing health/readiness UI (migrate its manual effect/state/fetch once SDK is ready), without redundantly wrapping Better Auth's own `useSession`. Do not invent duplicate query-key implementations where generator provides them.
- API errors use Axios/SDK facilities and typed error shapes; 401 vs 403 vs network errors vs validation errors handled distinctly. Never globally redirect on all 401. Cancel requests via AbortSignal as supported; consciously configure retry policy (do not stack retries).
- On sign-out, account change or session invalidation, clear sensitive TanStack cache and ensure data from user A is never shown to B. Do not remove all unrelated public cache without reason.

## 3. Security and correctness matrix (must pass by M02.4)

| Scenario                                         | Required observable result                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Fresh DB + first bootstrap                       | Exactly one admin; admin authenticated only after ordinary sign-in; passwords not logged or passed in argv |
| Second bootstrap / concurrent bootstrap          | No second first-owner privilege; clear safe failure                                                        |
| `closed` direct POST signup                      | Rejected even without frontend                                                                             |
| `invite` valid / expired / revoked / wrong email | Only valid bound token authorizes one registration; invalid responses do not expose secrets                |
| Same invitation, parallel POSTs and retries      | At most one user; no duplicate usable invitations; crash/failure path is demonstrated                      |
| Missing/invalid credentials                      | Generic auth failure without email enumeration                                                             |
| Successful signup                                | No session/cookie created; separate sign-in needed                                                         |
| Ordinary user calls privileged/admin endpoint    | `403`/safe denial; impersonation and unauthorized role changes inaccessible                                |
| Guest calls protected endpoint                   | `401`; health and readiness remain intentionally public                                                    |
| Session expiry / logout / revoke other           | Previous cookie no longer authorizes after required invalidation                                           |
| API unavailable while checking session           | Error/retry state; not misreported as confirmed logout                                                     |
| External redirect query                          | Rejected to safe root                                                                                      |
| User A -> logout -> user B                       | No A-specific cached data or UI flashes                                                                    |
| Password change                                  | Requires current password, policy validated, other sessions revoked                                        |
| Open-mode env without email verification         | Startup rejects/explicitly disables unsafe configuration; never silently opens signup                      |
| Debug/logging & HTTP headers                     | No secrets, passwords or tokens in logs; correct cookies/Origin/rate limiting                              |
| Docs/installer                                   | Clean fresh DB with committed migrations starts via documented developer commands                          |

## 4. Milestone boundaries and review gates

- **M02.1 — Auth foundation & typed API pipeline:** compatibility spike; better-auth integration, schema and real migration, public health protection, minimal roles, session tests, OpenAPI/Hey API/Axios pipeline using diagnostics. **Stop for review**.
- **M02.2 — Bootstrap, registration policy & invitations:** local CLI, safe closed/invite/open-disabled, proven one-use invitation semantics, deny unintended admin endpoints; tests with real PostgreSQL. **Stop for review**.
- **M02.3 — Web auth experience & health migration:** router, UI forms/layouts, Better Auth client config, RHF/Zod, sessions, settings, TanStack Query health via generated SDK, mobile/accessibility tests. **Stop for review**.
- **M02.4 — End-to-end/security hardening:** risk tests, performance, dependency/security review, docs, complete quality gate, manual browser smoke test, report. **Do not commit/push without explicit request**.

If a compatibility or atomicity blocker is discovered, do not improvise a large alternate architecture. Give reproducible evidence and a minimal recommendation at the end of the current authorized phase.

## 5. Deferred decisions / migration path (intentional, not todo code)

- **UI setup/one-command install**: safe future bootstrap entry point, installer-generated one-use setup secret and atomic first-admin invariant. Not created in M02.
- **Admin UI**: reuse invite/bootstrap/account operations; do not put logic exclusively in CLI. Authn/authz appropriate to each caller, no unauthenticated admin-management API.
- **SMTP & verified-email open registration**: `open` will become usable only after tested verification delivery, email change and recovery flows.
- **Password recovery**: future email recovery; a local emergency recovery method may be proposed separately if tested, but not auto-exposed as privileged HTTP API.
- **Production deployment**: TLS/reverse-proxy/config/backups/replica-safe rate-limiting and credentials; do not claim deployment readiness in M02 merely because local checks pass.
- **No extra KataKit skills, no app-wide state library or generic base services** without demonstrated need.

## 6. Primary integration references (verify against installed versions)

- Better Auth NestJS integration: https://better-auth.com/docs/integrations/nestjs
- NestJS adapter integration: https://github.com/ThallesP/nestjs-better-auth
- Better Auth Drizzle: https://better-auth.com/docs/adapters/drizzle
- Better Auth database hooks/transactions: https://better-auth.com/docs/concepts/database
- Better Auth email/password and enumeration: https://better-auth.com/docs/authentication/email-password
- Better Auth Admin plugin / restricted permissions: https://better-auth.com/docs/plugins/admin
- Better Auth sessions: https://better-auth.com/docs/concepts/session-management
- Better Auth CLI: https://better-auth.com/docs/concepts/cli
- Hey API: https://heyapi.dev/docs/openapi/typescript/get-started
- React Router 7: https://reactrouter.com/start/modes
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview

**Do not use Beta docs by accident if project dependencies are stable.** Re-check breaking changes at install time and use locked compatible versions for the commit.
