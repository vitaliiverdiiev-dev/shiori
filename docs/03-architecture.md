# 03 — Shiori Architecture & Foundation Boundaries

## Goals

Readable, maintainable, production-minded **modular monolith**. Learn established full-stack engineering practices without layering every CRUD endpoint into five artificial abstractions. Clean code is a result of clear dependencies and cohesive modules, not folder count.

## Architecture standards

Code structure, dependency direction and lint enforcement follow the portable standards. This file only records Shiori-specific decisions.

- [Frontend Architecture v1](standards/frontend-architecture-v1.md): React layers, slices, main component file contract, tests.
- [Backend Architecture v2](standards/backend-architecture-v2.md): NestJS modular monolith, Module → Capability → Responsibility (KataKit `backend-architecture` 0.4.1).
- [Code Quality & ESLint v1](standards/code-quality-v1.md): boundaries, ordering, magic numbers, rule tests.

## Current map (M02, Backend Architecture v2)

```text
apps/web/src/
  main.tsx                    # bootstrap: StrictMode + app/app.tsx + global CSS
  app/app.tsx                 # composition: <title>, favicon, React Router 7 declarative route table
  app/layouts/app-layout.tsx  # signed-in shell: header, main navigation, AccountMenu, <Outlet>
  app/layouts/guest-layout.tsx  # sign-in/sign-up shell: brand + <Outlet>
  app/providers/query-client.ts  # the single TanStack QueryClient (no automatic query retries)
  app/styles/index.css        # Tailwind v4 + semantic tokens (light/dark, Japanese fonts)
  pages/home/                 # HomePage (identity via props)
  pages/status/               # StatusPage — renders HealthStatus
  pages/{sign-in,sign-up,account-settings,security-settings}/  # compose domain/auth forms
  pages/not-found/            # public `*` page
  domain/auth/                # AuthRoute, AccountMenu, forms (ui/), RHF+Zod schemas (model/), config/auth-client.ts, api/queries.ts (registration mode)
  domain/health/              # HealthStatus: api/queries.ts (generated SDK + TanStack Query), model/, helpers/, hooks/, ui/
  shared/api/query-access.ts  # PUBLIC_QUERY_META / isPublicQuery: queries are private unless marked public
  shared/ui/                  # index.ts + primitives/{button,input,label} (shadcn on Base UI, stories)
  shared/helpers/cn.ts        # `cn`
  test/setup.ts               # Vitest/RTL setup
  test/api-stub.ts            # fetch stub (Better Auth) and session fixtures for tests
  test/msw.ts, test/render.tsx  # MSW server for Axios/generated-SDK requests; providers + user-event render helper
apps/api/src/
  main.ts                     # loads + validates env, creates the app
  cli.ts                      # local account CLI entry: env, pool, Better Auth, terminal I/O
  openapi.ts                  # second entry point: writes apps/api/openapi.json offline
  app/app.module.ts           # composition root; app/app.config.ts = body parser off, global prefix, shutdown hooks, `listen` on `API_HOST`
  app/openapi.ts              # OpenAPI document of the app's own Nest endpoints
  infrastructure/config/      # env parsing/validation (Zod)
  infrastructure/database/    # single pg pool + Drizzle provider (DATABASE token), local-URL guard
  infrastructure/openapi/     # Zod schema → OpenAPI 3.0 schema object
  infrastructure/terminal/    # prompt/hidden-input terminal I/O for the CLI
  modules/auth/               # auth.module.ts (Nest wiring) + index.ts (public: AllowAnonymous) at the root
    model/                    # module-wide business contracts, no technical imports
      types/                  #   invitation, admin-bootstrap, registration contracts
      schemas/                #   invitation-code.validation.ts (Zod)
      constants/              #   password limits, common-password denylist, invitation code size + lifetime, bootstrap marker id
      helpers/                #   email normalization, password policy (length, common-password screening), invitation code generate/hash, invitation status policy
    persistence/              # module-owned data: Better Auth core tables (schemas/auth.schema.ts), user lookup query
    integrations/better-auth/ # the one shared Better Auth integration
      config/                 #   better-auth.config.ts: options, Drizzle adapter, settings from env, Auth type
      plugins/                #   invitation (model + hooks), admin-bootstrap (model), password-screening (hook)
      hooks/                  #   invitation.hooks.ts: sign-up pre-check and in-transaction claim; password.hooks.ts: common-password screening
      adapters/               #   admin-bootstrap.adapter.ts: first-admin transaction through Better Auth
    cli/                      # auth.cli.ts dispatch + bootstrap-admin / invite commands
    sessions/http/            # SessionsController (GET /api/me), DTO, SessionGuard (global APP_GUARD)
    registration/http/        # RegistrationController (GET /api/registration), DTO
    invitations/              # application (create/list/revoke), persistence (invitation table, queries, row mapper), DB spec
    admin-bootstrap/          # application (bootstrapFirstAdmin), persistence (admin_bootstrap table), DB spec
    tests/integrations/       # module-wide DB specs: sessions, registration flow, permissions, CLI, Better Auth feasibility
  modules/diagnostics/        # single capability: http (controller, DTOs), application (readiness), persistence (ping query)
apps/api/test/                # app-level e2e, migration specs, shared harness (support/: test app, test DB guard, users)
apps/api/drizzle/             # committed SQL migrations (0000_auth … 0003_backfill_admin_bootstrap)
apps/api/openapi.json         # committed API contract (machine-owned)
packages/api-client/          # @shiori/api-client: Hey API SDK (Axios) + TanStack Query options
infra/docker/postgres/init/   # repository-level Docker assets (not the API's infrastructure/)
compose.yaml                  # local PostgreSQL
product.config.json           # canonical product identity
```

- **Diagnostics ↔ health:** the API's `modules/diagnostics` owns the `/api/health` (liveness) and `/api/ready` (readiness) contracts; the web `domain/health` slice consumes them, treats only `{ status: 'ok', checks: { database: 'up' } }` as database online, and derives "database unknown" when the API is offline. Health and readiness are two public TanStack queries on the generated SDK (5 s / 8 s Axios timeouts, no automatic retries, aborted through the query signal); readiness runs only while health is OK, and "Check again" refetches both. `AuthRoute` renders `HealthStatus` in its unavailable state (composed in `app/app.tsx`), so diagnostics stay visible without exposing protected content.
- **Auth (`modules/auth`):** Better Auth (pinned exactly) owns `/api/auth/*`, mounted at an absolute base path (the Nest `api` prefix does not apply; `/api/api/auth` is a tested 404). It reuses the shared pool through the `DATABASE` token. Nest starts with `bodyParser: false`; the adapter re-adds JSON/URL-encoded parsing for every other route. Sessions are database-backed (7 days, refreshed daily, no cookie cache); cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` with a `__Secure-` prefix when `BETTER_AUTH_URL` is https. The Origin check is forced on (`disableOriginCheck: false`) because Better Auth skips it under `NODE_ENV=test`. Same-origin only: no CORS. Rate limiting is on in every runtime (`rateLimit: !isTest()` in `authSettingsFromEnv`; Better Auth's own default is `NODE_ENV=production` only, so `pnpm start` without it had none): `/sign-in/*`, `/sign-up/*` and `/change-password` allow 3 requests per 10 s per client IP, other auth routes 100 per 10 s; tested in `auth.db-spec.ts`. Storage is in-process memory (reset on restart, not shared between instances). Better Auth reads no forwarded-IP header (`advanced.ipAddress.ipAddressHeaders: []`): `X-Forwarded-For` and similar headers are client-controlled unless a trusted proxy overwrites them, and none exists yet, so a forged header must not select a rate-limit bucket (tested: a new forged `X-Forwarded-For` per attempt is still limited). Without an IP, Better Auth keys the limit per path in a single shared bucket and logs a one-time warning; under the test runner it uses `127.0.0.1`. CORS and the Origin check only constrain browsers: a non-browser client can send any `Origin`, so the network boundary is the listener (below). Both are production deployment requirements (below).
- **Private query cache:** `app/providers/query-client.ts` subscribes to Better Auth's session store through `subscribeToSessionUser` (`domain/auth`). The store notifies synchronously on change, before React re-renders, so on every user-id change (sign-out, revocation, expiry, account switch) every query not marked `meta: PUBLIC_QUERY_META` is removed before the next user's components read the cache. `removeQueries` destroys each query, which also aborts its in-flight fetch, so a late response cannot repopulate it. Public queries (health, readiness, registration mode) are kept. Mutations are not cached.
- **Web session (`domain/auth`):** Better Auth's `useSession` is the only session state. `AuthRoute` maps it to checking (no data, pending), authenticated (data), unauthenticated (null session or 401) and unavailable (network error or other status with no data); a failed background re-check keeps a verified session. A guest page stays mounted while a re-check runs after a confirmed sign-out. The protected `<Outlet>` is keyed by user id, so an account change remounts every signed-in page. When a verified session ends while a protected page is open (sign-out, expiry, revocation or a 401 from an account action), `AuthRoute` redirects with router state `{ signedOut: true }` and the sign-in form shows a neutral "You have been signed out" status; a first visit without a session shows nothing. The unavailable state says the session could not be verified and that the user has not been signed out; 502/503/504 (a proxy that cannot reach the API) are reported as an unreachable API, other 5xx as a server error. Post-login destinations pass `getSafeRedirect` (internal paths only; never a guest page); the sign-in form only signs in and the guest guard performs the redirect. Forms call the Better Auth client directly and map its typed error codes to fixed messages (`helpers/auth-action.ts`); sign-up sends the plugin's `invitationCode` through `fetchOptions.body`, never auto-signs-in, and shows the same neutral completion for success and duplicate-account responses.
- **Route protection:** `SessionGuard` (global `APP_GUARD`) protects every Nest route. Other modules take `@AllowAnonymous()` from Auth's public entrypoint `modules/auth/index.ts`, which re-exports the adapter's decorator so it sets the same metadata key the guard reads; it exports nothing else until another module needs it. `@AllowAnonymous()` routes skip the session lookup entirely, so health stays independent of the database even when a cookie is sent, and they never receive `request.user` / `@Session()`. A route that should know the user when one is signed in uses `@OptionalAuth()` instead. A missing session is Nest's default 401 body `{ message, statusCode: 401 }`, documented in OpenAPI.
- **Roles:** `user.role` (`user` | `admin`) is a Better Auth additional field with `input: false` and a database CHECK; clients cannot set it on sign-up or `update-user`, including the admin (tested). The Admin plugin is not used, so impersonation, role, password and removal endpoints do not exist (tested 404 for an admin session), and `delete-user` is disabled. Nest routes can require a role with the adapter's `@Roles(['admin'])` (401 guest, 403 user, tested). Several admins are allowed by the schema; only the initial bootstrap is one-time (below). Creating further admins needs a future protected operation.
- **Auth schema and upgrades:** `persistence/schemas/auth.schema.ts` (and the invitation plugin's `invitation` model) is hand-written for the pinned Better Auth version (the CLI was not run). Better Auth's runtime schema check compares it with the fields the library expects on first use, and `pnpm test:db` migrates a fresh database and exercises sign-in. **When upgrading Better Auth**, diff the expected tables (`getAuthTables`) against `persistence/schemas/auth.schema.ts`, generate a migration for any change and run `pnpm test:db` before committing.
- **Passwords:** 15–128 characters, never trimmed, hashed by Better Auth, which applies Unicode NFKC before hashing and verifying (canonically or compatibility-equivalent input, such as full-width Latin from a Japanese IME, is the same password). The length check counts UTF-16 code units of the raw input; a client-side check must use the same rule. No character-class rules.
- **Common-password screening:** `model/helpers/password.policy.ts` rejects a password whose NFKC, lower-cased, whitespace-free form is empty, one 1–3 character unit repeated (`aaaa…`, `abcabc…`, `😀😀…`) or in `model/constants/common-passwords.constants.ts`, a small curated offline list of well-known passwords that pass the 15-character minimum (digit runs, keyboard walks, `passwordpassword`, `correct horse battery staple`, …). The same policy runs in the `password-screening` plugin's before-hook on every Better Auth route that sets a password (`/sign-up/email`, `/change-password`, `/reset-password`; error code `PASSWORD_TOO_COMMON`, checked before any account lookup, so it does not reveal whether an email exists) and in `bootstrapFirstAdmin`. Better Auth's server-only `setPassword` has no HTTP route and is not used. A hook on the hasher was rejected: sign-in hashes unknown-user passwords for timing, so it would change sign-in errors. **Limitation:** this is basic offline screening, not breached-password detection; it does not query Have I Been Pwned or any network service, and it misses most leaked passwords.
- **Registration:** `REGISTRATION_MODE` is `closed` (default) or `invite`; `open` is rejected at startup until verified email exists. `GET /api/registration` (public, OpenAPI `getRegistration`) returns only the mode. Changing the mode never touches sessions. HTTP is allowed only for a loopback `BETTER_AUTH_URL`; any other host needs https and a non-example secret.
- **Invitations:** project-owned `invitation` table (`invitations/persistence/schemas/invitation.schema.ts`): normalized email (CHECK), unique SHA-256 `code_hash` of a 256-bit random code (exactly 43 base64url characters; any other shape or size is rejected before hashing), 7-day expiry, `used_at`/`revoked_at` with a CHECK that at most one is set. `integrations/better-auth/plugins/invitation.plugin.ts` registers the table with Better Auth and wires the hooks in `integrations/better-auth/hooks/invitation.hooks.ts`, which enforce invite-only sign-up in two steps: a read-only check before the endpoint (so an existing email gets the same `INVALID_INVITATION` for a bad code as a new one) and, in `user.create.before`, a single conditional `UPDATE … WHERE code_hash, email, unused, unrevoked, unexpired` through the transaction adapter that must touch exactly one row. Because the Drizzle adapter runs sign-up with `transaction: true`, the claim commits or rolls back with the user and account rows; concurrent redemptions serialize on the row lock. Any other endpoint that tries to create a user is refused. An existing email gets Better Auth's synthetic success and its invitation is not consumed.
- **First admin:** `admin-bootstrap/application/bootstrap-first-admin.ts` validates input and runs the pre-checks; `integrations/better-auth/adapters/admin-bootstrap.adapter.ts` then creates the user (role `admin`) and credential account with Better Auth's `internalAdapter` and hasher inside `runWithTransaction` (`@better-auth/core`, pinned to the same version as `better-auth`) and maps the two unique violations to results. In the same transaction it first inserts the single `admin_bootstrap` row (primary key `initial`, CHECK-ed), so a concurrent bootstrap from another process waits on that key and fails, a failure rolls back all three rows, and the row stays after the first admin is demoted or deleted: bootstrap never reopens. Migration `0003_backfill_admin_bootstrap` (a drizzle-kit `--custom` data migration) marks installations that already had an admin before this table existed. The pre-check only gives a friendlier message. The CLI (`pnpm auth:bootstrap-admin`, `pnpm auth:invite …`) is a transport over these operations; a future setup wizard or admin UI must add its own authorization boundary.
- **API contract and client:** Zod DTOs → `@nestjs/swagger` → committed `apps/api/openapi.json` → `@hey-api/openapi-ts` → `packages/api-client/src/generated` (committed, never hand-edited). `pnpm api:generate` rebuilds both; `pnpm api:check` generates both into a temporary directory with the same configuration and fails on drift without writing the tracked files (it only rebuilds `apps/api/dist`), and an API e2e test fails when `openapi.json` is stale. Better Auth routes stay out: its own client is their contract. The generated paths already include `/api` and the default base URL is empty, so browser requests are relative and same-origin (through the Vite proxy in development) and carry the session cookie without CORS or `withCredentials`. The package builds to `dist/`; consumers import `@shiori/api-client` and `@shiori/api-client/react-query`; Turbo's `typecheck`, `lint`, `test` and `dev` depend on `^build` so `dist/` exists. Because the package's declarations are emitted without `exactOptionalPropertyTypes`, generated query options need their `queryFn` re-asserted for `useQuery` (WORKAROUND in each slice's `api/queries.ts`). Turning the flag on for the package fails in the machine-owned Hey API runtime (0.99.0: `client/` and `core/`), so no configuration fix exists yet. Web tests intercept Axios (XHR in jsdom) with MSW and Better Auth (`fetch`) with the fetch stub. `@tanstack/react-query` is a peer dependency so the web app owns the only runtime copy.
- **Product identity:** `@/product-config` is a single TS/Vite alias to the root `product.config.json`. ESLint allows it only in `src/app`; pages receive values as typed props.
- **shadcn:** `components.json` targets `@/shared/ui/primitives` and `@/shared/helpers/cn`. The CLI writes `primitives/<name>.tsx`; move it to `primitives/<name>/<name>.tsx`, import `cn` from `@/shared/helpers/cn`, export it from `shared/ui/index.ts` when used outside shared, then run `pnpm lint:fix`.
- **Database schemas** are Drizzle tables in `persistence/schemas/*.schema.ts` of their owner; Drizzle Kit discovers only `src/modules/*/persistence/schemas/*.schema.ts` and `src/modules/*/*/persistence/schemas/*.schema.ts`. Zod validation in `model/schemas/` uses `*.validation.ts`, so it never matches. Auth owns `user`/`session`/`account`/`verification` at module level (Better Auth identity, used by every capability); `invitations/` owns `invitation`; `admin-bootstrap/` owns `admin_bootstrap`. The v2 relocation changed no table: `drizzle-kit generate` reports no changes against the committed migrations.
- **Auth capabilities:** `sessions` (current user, global session guard), `registration` (public registration mode), `invitations` (invite lifecycle: create/list/revoke; claim during sign-up), `admin-bootstrap` (one-time first admin). Better Auth serves all four, so its configuration, plugins, hooks and adapters live once in `integrations/better-auth/`. Invitations checks for an existing account through the module-level `persistence/queries/user.queries.ts`, never through another capability. `invitations/application/revoke-invitation.ts` is a single conditional update; it stays an application operation because the CLI calls only `application/`.
- **Better Auth integration flow (acyclic):** `config` → `plugins` → `hooks` → `model`; `admin-bootstrap/application` → `adapters` → `model`. Nothing imports `config` at runtime except `auth.module.ts`, `src/cli.ts` and tests; `http/` and `cli/` use its `Auth` type only. The hooks claim the invitation through Better Auth's transaction adapter (`getCurrentAdapter`) because that is the only handle inside the sign-up transaction; an application-side Drizzle write could not join it.
- **Better Auth table registration (deviation from KataKit v2):** `integrations/better-auth/config/better-auth.config.ts` imports the module's and capabilities' `persistence/schemas/*.schema.ts` to pass them to `drizzleAdapter(db, { schema })`. KataKit forbids module-level directories from importing capability internals; the Drizzle adapter needs the table objects, and composing them in `auth.module.ts` would force `src/cli.ts` and every test that builds a Better Auth instance through the Nest module file. Lint limits the exception to that one file importing `persistence/schemas/*.schema.ts` of its own module; queries, mappers, `application/`, other integration files and other modules stay rejected (fixtures in `scripts/eslint-architecture.test.mjs`).
- **Import strategy:** modules reach `infrastructure/` through the Node subpath import `#infrastructure/*` (`apps/api/package.json#imports`). The `shiori-source` condition maps it to `src/` for TypeScript (`customConditions`), Vitest (`ssr.resolve.conditions` in `vitest.config.ts`) and the ESLint resolver (`conditionNames`); plain Node takes `default` → `dist/`, so compiled `main.js`, `cli.js` and `openapi.js` resolve the emitted files. Relative imports into `infrastructure/` from modules are rejected; `app/`, entry files and `test/` keep relative paths.
- **Diagnostics:** a single-capability module. `http/controllers/diagnostics.controller.ts` maps the result to 200 or 503 and logs the failure reason; `application/check-database-readiness.ts` turns the probe outcome into ready / not ready with a reason; `persistence/queries/readiness.queries.ts` holds the bounded `select 1`.
- **OpenAPI tags:** `@nestjs/swagger` derives a tag from the controller class name. `SessionsController` pins `@ApiTags('Me')` so the published contract (and the generated client) did not change when the class was renamed.
- **API tests:** unit specs follow the KataKit placement rule (`model/helpers/email.ts` → `model/helpers/tests/email.spec.ts`). DB specs live in `tests/integrations/*.db-spec.ts` of the smallest owning directory: `invitations/` and `admin-bootstrap/` for their capability operations, the module root for flows that span capabilities or the Better Auth integration. App-spanning e2e, migration specs and the shared harness stay in `apps/api/test/`. Module specs import the harness through `#test/*`; only spec files use it, and the build excludes them. `pnpm test` runs `*.spec.ts` and `test/**/*.e2e-spec.ts`; `pnpm test:db` runs `*.db-spec.ts` under `src/` and `test/`.

### Enforcement and exceptions

Enforced by `pnpm lint` (`eslint.config.js`) and proven by `scripts/eslint-architecture.test.mjs`:

- Frontend layer direction, cross-slice access only via `pages/<slice>/index.ts`, `domain/<slice>/index.ts`, `shared/ui/index.ts` (`eslint-plugin-boundaries`, alias and relative imports both resolved).
- No internal `index.ts` barrels; relative imports at most `../../` (`../../../` in `apps/api/src`, the depth from a capability category to its module root).
- `model/` is its own boundaries element (`web-model`): it imports only its own slice's `model/` files and non-React `shared/` units (not `shared/ui` or `shared/hooks`), whether spelled relative or `@/`, including `export … from` and literal `import()`. React/React DOM are banned there by `no-restricted-imports`. Not covered: computed `import()` specifiers and paths that do not resolve to a file (TypeScript rejects those).
- Main component contract for `app/app.tsx` and `{pages,domain}/<slice>/*.tsx` (`no-restricted-syntax` selectors).
- Backend: infrastructure never imports modules; `app/` imports modules only via `*.module.ts`; a module sees another module only through its `*.module.ts` or its designated public `index.ts`. Inside a module, boundaries elements are `api-tests` (any `tests/`), `api-module-area` (module-level `model`, `persistence`, `integrations`, `cli`, and `http`/`application` of a single-capability module) and `api-capability-area` (`<capability>/{http,application,persistence,integrations}`); the allowed directions are the table in [Backend Architecture v2](standards/backend-architecture-v2.md#4-dependency-directions-enforced), including type-only integration imports from `http/` and `cli/` (`dependency.kind: 'type'`). `@typescript-eslint/no-restricted-imports` bans technical packages per responsibility: `model/` none of Nest, Drizzle, `pg`, Better Auth (even types); `application/`, `http/`, `cli/` no runtime Drizzle, `pg` or Better Auth (types allowed); `persistence/` no Nest or Better Auth. Imports between files of the same element are unchecked (`checkInternals` off).
- Ordering (Perfectionist, auto-fixable) and `@typescript-eslint/no-magic-numbers` in `apps/*/src` (tests, specs and stories exempt).
- Comments (KataKit `code-quality` policy): `shiori/comment-policy` (`scripts/eslint-comment-policy.mjs`, proven by `scripts/eslint-comment-policy.test.mjs`) rejects every unclassified comment in linted JS/TS, including `eslint.config.js` and `scripts/`. COMPAT and WORKAROUND must name the dependency in parentheses. Technical exceptions only: license notices, triple-slash references, shebangs, ESLint directives with a `--` reason, and type-only JSDoc in `.js/.mjs/.cjs`. No autofix. Lint checks the marker, not whether the claim is true; YAML, HTML, SQL and Python comments are reviewed manually.

Justified exceptions: shadcn primitives skip `sort-objects` (cva key order decides class precedence) and `react-refresh/only-export-components`; `main.tsx` and API `main.ts`/`cli.ts`/`openapi.ts` are bootstrap files (process entry points and composition roots) outside the layer graph; `cli.ts` composes the env, pool, Better Auth instance and terminal I/O and imports `modules/auth/cli/auth.cli.ts` and `modules/auth/integrations/better-auth/config/better-auth.config.ts` directly; the Better Auth config's table registration (above) is the only exception inside a module. `packages/api-client` compiles its generated code with `exactOptionalPropertyTypes: false` because Hey API's generated Axios runtime (0.99.0) does not compile with it; the exception is limited to that package's own build, the generated directory is excluded from ESLint and Prettier, and consumers keep the flag (verified by compiling against the emitted declarations with `exactOptionalPropertyTypes: true` and `skipLibCheck: false`).

Manual review only: a "main component file" is recognised by location (slice-root `.tsx`), not by content; exported Nest providers consumed across modules need an explicit contract when the first real consumer appears; one-component-per-file in `ui/`, WHAT/HOW placement and test placement are conventions, not lint gates.

## Responsibilities and dependency direction

- **Composition/bootstrap** may import both foundation and domain to assemble the app.
- **Foundation**: framework bootstrap, configuration, auth/session infrastructure, database connection, HTTP error conventions, observability, generic UI primitives, deployment. MUST NOT import Japanese-specific modules.
- **Japanese domain/features**: vocabulary, kana, kanji, practice, collections, progress. May depend on foundation public APIs; domain _rules_ should be pure TS where feasible.
- **Infrastructure**: HTTP/database/cache/storage implementations; adapter abstractions only where there's a meaningful substitute, test seam, or complex boundary. Avoid repository interfaces for trivial queries.
- **Presentation**: page/screen composition, UI components, view-state; avoid huge "everything hooks" returning dozens of unrelated values.
- **API**: validation at network boundaries, clear typed errors, server-side ownership and authorization checks, explicit data contracts; no secrets in browser.
- Prefer colocation by feature and small files when it improves navigation, **not** mandatory folder-per-function/test.
- Reuse is a design question: obvious generic concerns are foundation; uncertain candidates stay local until a second actual use case.

## Configuration strategy

**At M00:** root `product.config.json` is the canonical source for app identity. The web frontend consumes it through a small typed accessor or direct typed import. UI components must not duplicate title/tagline/glyph constants. A static Vite build may embed these values at build time in M00; this is acceptable for a developer scaffold. Avoid a generic runtime-config service until deployment customization is a real requirement.

**Later, for self-hosting:** distinguish two sources:

1. **Product/public config**: product identity (starting in `product.config.json`), branding, optional feature flags and public registration mode. Theme values come from CSS token files. The future Starter App should change branding through one small canonical config surface.
2. **Deployment/server config**: database URL, base URL, cookie/auth secrets, ports, storage credentials, internal toggles; environment variables/secrets, validated at startup.

A built Vite SPA cannot use build-time variables for per-installation runtime customization without rebuilding. At the self-host release milestone, design sanitized **public runtime config** so that an installer can change public identity/registration settings without rebuilding, while keeping all secrets server-only.

## Starter App extraction criterion (later)

Removing Japanese domain modules must leave a runnable web/API foundation, with stable bootstrap, auth, configuration, component primitives, and deployment tooling. The **composition root** may reference the domain; foundation internals may not. Replacing business routes, database tables, and migrations for another product is expected. We do _not_ create a dedicated starter repository or a long-lived `foundation` branch now.

## Auth: deferred beyond M02

M02 implements email/password, sessions, CLI first admin and invitations, `closed`/`invite` registration and the settings UI (details above). Not implemented: setup wizard, admin UI, SMTP, email verification, `open` registration, password reset email, email change, OAuth, MFA. Auth stays independent of Japanese models.

Production deployment requirements (not met by local defaults; to be designed with the self-host milestone):

- **Listener:** `main.ts` listens on `API_HOST` (validated IP literal, default `127.0.0.1`; `test/app.e2e-spec.ts` checks the default address and that the LAN address is refused). A container or other host must set `API_HOST` explicitly (for example `0.0.0.0`) and must then make the reverse proxy the only network path to the API.
- Serve over HTTPS with an https `BETTER_AUTH_URL` (enforced for non-loopback hosts) and a generated secret.
- Put the API behind one reverse proxy that is its only entry point and that overwrites (not appends to) the client-IP header, then set Better Auth `advanced.ipAddress.ipAddressHeaders` (and `trustedProxies` for appended `X-Forwarded-For`) to exactly that proxy's header. Until then every client shares one rate-limit bucket per path, which lets one client lock others out of sign-in for 10 seconds at a time.
- Rate-limit counters are in memory per process: several API instances need shared storage (database or secondary storage).
- `/api/auth/get-session` sends `Cache-Control: no-store`, but `/api/me` and `/api/auth/list-sessions` send no cache headers (`/api/me` has an ETag) and no response sends `Vary: Cookie`, so a caching proxy or CDN could serve one user's response to another. Express also sends `X-Powered-By`. Set `Cache-Control: no-store` on private API responses and drop `X-Powered-By` before exposing the API through any shared cache.
- `get-session` and `list-sessions` return raw session tokens in JSON (Better Auth default). They cannot authenticate without the server-signed cookie (tested: 401 as cookie and as bearer); do not install Better Auth's bearer plugin without revisiting this.

### Accepted dependency advisories (M02, temporary)

`pnpm audit` and `pnpm audit --prod` fail on these four advisories (checked 18 Nov 2026). They are accepted for the development milestone only, not suppressed. None of the affected modules loads in the API process (traced at startup, sign-in and sign-up) or appears in the web bundle. Recheck at every dependency update and before any deployment.

| Advisory                          | Package (installed)    | Reached through                                                                            | Runs during                                                                 | Fix available |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------- |
| GHSA-fc5q-39xc-vjpf (high, ReDoS) | picomatch 2.3.2, 4.0.7 | `shadcn` (web `dependencies`, CLI + CSS import), Vite, Vitest, Tailwind, Storybook, ESLint | dev, build, test, lint                                                      | none          |
| GHSA-g3hv-75wg-m249 (moderate)    | minimatch 10.2.6       | `shadcn` → ts-morph, ESLint stack, Storybook                                               | lint, Storybook, shadcn CLI                                                 | 11.0.1        |
| GHSA-67mh-4wv8-2f99 (moderate)    | esbuild 0.18.20        | `drizzle-kit` → `@esbuild-kit` (also Better Auth's optional peer)                          | `db:*` commands; `transform` only, the affected dev server is never started | 0.25.0        |
| GHSA-3g3m-2fjr-6pw4 (moderate)    | glob 13.0.7            | `@storybook/react-vite` docgen plugin                                                      | Storybook                                                                   | 14.0.2        |

## Self-hosting plan (later milestone)

- Docker Compose for web/API/PostgreSQL, persistent database volume; publishable versioned images eventually.
- First-user bootstrap without leaking secrets, secure cookies and HTTPS guidance, backups **and tested restores**, health checks, upgrade/migration strategy.
- AWS-specific deployment, high availability, multiple replicas and Kubernetes are **not** requirements now.
- One ongoing `main` branch, short feature branches; **no** long-lived foundation branch.

## Offline/mobile plan (later milestone)

- User explicitly downloads selected learning data into web IndexedDB; app-shell caching via PWA service worker.
- Save attempted reviews locally with stable IDs; sync idempotently after reconnect; define conflicts and ordering later.
- React Native/Expo may reuse pure logic and API contracts, but native UI and storage will have their own adapters.

## Architecture decisions & Claude workflow

- Before irreversible/high-impact choices: investigate official docs, compare 2-3 real options, summarize reasoning in a short ADR only when useful.
- For ordinary UI, endpoints, or refactors: implement smallest correct change and verify.
- No giant agent orchestration. Start with root `CLAUDE.md`; KataKit is developed separately when repeated needs appear.
- Do not change code across domains for convenience; document actual limitations instead of inventing future scaffolding.
