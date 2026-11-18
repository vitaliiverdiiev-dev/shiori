# Shiori backend: checking the KataKit `backend-architecture` skill against real code (plan only)

**Branch checked:** `m02.1-auth-foundation` at `7ddf743`, with a clean tree. It already includes M02.2.
**Stack:** Nest 12.4, better-auth 1.7.23 and @better-auth/core 1.7.23 (both pinned exactly), @thallesp/nestjs-better-auth 2.8.0, drizzle-orm 0.45 and drizzle-kit 0.31, pg 8.23, Vitest 5.
**No edits were made.** The only command run besides reading files was `drizzle-kit generate` against a copy of the migrations in a scratch directory. It reported "No schema changes, nothing to migrate", and `git status` was still clean afterwards.

## 1. Who owns what today

| Concern                         | Owner                                                                                                                                                               | Files                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity, sessions, credentials | Better Auth, wired inside `modules/auth`                                                                                                                            | `auth.config.ts` (options and adapter), `auth.schema.ts` (user, session, account, verification), `session.guard.ts` (global `APP_GUARD`), `me.controller.ts`, `auth.dto.ts`                                                                                        |
| Registration mode               | `modules/auth`                                                                                                                                                      | `registration.controller.ts`, plus the `REGISTRATION_MODE` value in `infrastructure/config/env.ts`                                                                                                                                                                 |
| Invitations                     | `modules/auth`                                                                                                                                                      | `invitation.schema.ts` (table and CHECKs); `invitation.plugin.ts` (registers the table with Better Auth, a pre-check before sign-up, and the claim in `user.create.before`); `invitations.ts` (Drizzle create/list/revoke, code hashing, **and `normalizeEmail`**) |
| First-admin bootstrap           | `modules/auth`                                                                                                                                                      | `admin-bootstrap.schema.ts`, `admin-bootstrap.plugin.ts`, `bootstrap-admin.ts`                                                                                                                                                                                     |
| Profiles and preferences        | **Nobody, on purpose.** The profile name is Better Auth's `user.name`, changed through `update-user` (M02.3). Spec §2.1 forbids speculative Users/Sessions modules. | —                                                                                                                                                                                                                                                                  |
| Shared database                 | `infrastructure/database`                                                                                                                                           | `database.module.ts` (one pool, the `DATABASE` token, `createPool`), `postgres-errors.ts`, `local-url.ts`                                                                                                                                                          |
| Entry points                    | `src/` root and `app/`                                                                                                                                              | `main.ts` and `app/` for HTTP; `cli.ts` with `auth.cli.ts` and `infrastructure/terminal` for the CLI; `openapi.ts` and `app/openapi.ts` for OpenAPI generation                                                                                                     |
| Database schema discovery       | `drizzle.config.ts`                                                                                                                                                 | Glob `./src/**/*.schema.ts`. The Better Auth adapter gets its own explicit list in `auth.config.ts:49`.                                                                                                                                                            |
| Migrations                      | `apps/api/drizzle/`                                                                                                                                                 | One history, 0000–0003. 0003 is the hand-written `--custom` backfill.                                                                                                                                                                                              |

**Module contracts:**

- `AuthModule` exports nothing. Its effects reach the rest of the app through the global guard and through Better Auth's `AuthService`.
- There are no cycles inside `modules/auth`. The whole import graph was traced, and nothing imports back into `auth.config.ts`.
- Code outside the module reaches into it in two places:
  - `src/cli.ts` imports `auth.cli.ts` and `auth.config.ts`. That is wiring code, but it is not listed as an exception in `docs/03`.
  - `diagnostics.controller.ts:13` imports `AllowAnonymous` straight from the Better Auth Nest adapter library instead of from Auth.

## 2. Findings

### Confirmed problems (all small)

1. **Auth's "public route" rule is borrowed from a library, not offered by Auth.**
   - `SessionGuard` is Auth's policy, and it depends on the library's internal `'PUBLIC'` metadata key (`session.guard.ts:5-6`).
   - Diagnostics marks its routes public with the library's decorator, not with anything Auth exposes.
   - Shiori's own lint makes this hard to fix the way KataKit recommends. It lets a module import only another module's `*.module.ts` (`eslint.config.js:136-153`), so an `index.ts` public entry point is currently **forbidden**. KataKit's skill and Shiori's lint disagree here.

2. **`invitations.ts` does three unrelated jobs.**
   - It holds email normalization, which `bootstrap-admin.ts:7` depends on.
   - It holds the invitation code format and hashing, used by the plugin.
   - It holds the Drizzle create/list/revoke operations.
   - Separately, the password limits live in `auth.config.ts`, so bootstrap imports the Better Auth config file just to get two numbers.
   - Effect: when you read bootstrap's imports, it looks as if it depends on invitations.

3. **Auth imports the app-wide `Env` type.**
   - `auth.config.ts:3` and `auth.module.ts:4` both import `Env`. Auth only needs 3 values, but it names infrastructure's whole config type.
   - Auth's base path `'/api/auth'` (`auth.config.ts:45`) is hard-coded and must match `setGlobalPrefix('api')` in `app.config.ts`. An e2e test checks this, but it is not written down as something an app must provide.

4. **Docs have drifted.**
   - `docs/03` lists `main.ts` and `openapi.ts` as files outside the layer graph, but not `cli.ts`.
   - `docs/standards/backend-architecture-v1.md` still has M01.2-era text ("rename from configure-app.ts", "do not pre-create auth/").
   - That v1 standard says an `index.ts` is not required, while KataKit now requires a single designated entry point once another module consumes something.

### Potential risks (not bugs today)

- **Two code paths write to `invitation`.** The CLI writes through the app's Drizzle `db`; sign-up writes through Better Auth's adapter. They never share a transaction. This is correct only because each write is a single conditional statement, and `registration.db-spec.ts:302` proves the revoke-vs-redeem race. Any future multi-step invitation logic must stay inside one of the two paths.
- **`createInvitation` checks and then inserts, so it isn't atomic.** It checks whether the email already has an account, then inserts. If someone signs up in between, an invitation exists that nobody can use; it just stays "active" until it expires. There is also no "one active invitation per email" constraint. The spec says nothing either way.
- **`transaction: true` holds up the whole invitation guarantee.** In the installed `@better-auth/drizzle-adapter`, the option defaults to off (`config.transaction ?? false`). Better Auth's transaction context lives in AsyncLocalStorage and is reachable only through `getCurrentAdapter`. Existing tests do guard this (`auth-feasibility.db-spec.ts:111,134`; `registration.db-spec.ts:329`).
- **Future sign-up side effects can't join the sign-up transaction.** If a later module wants to write something when a user signs up (say, default learning settings), an app `db.transaction()` cannot share Better Auth's transaction. Better options: create the data lazily on first use, or use an after-commit hook. Both are covered by existing evidence (`auth-feasibility.db-spec.ts:155`).

### Already correct

- Schemas live with their owner and are found through the glob. There is one migration history, and the applied migrations match the current schema (no drift).
- Database constraints protect the invariants: email must be lower-case, an invitation can't be both used and revoked, the bootstrap table can only ever hold one row, and the code hash is unique.
- Transactions:
  - **Sign-up:** Better Auth wraps it in `runWithTransaction` (`sign-up.mjs:144`), and the invitation claim runs inside it through `getCurrentAdapter`.
  - **Bootstrap:** the bootstrap marker, the user and the account are written in one Better Auth transaction, and the password is hashed _before_ it starts. The checks done before the transaction only produce friendlier messages; the database constraints are what enforce correctness.
- Race tests exist for the cases that matter: concurrent bootstrap, concurrent redemption, revocation vs redemption, and rollback when account creation fails.
- Controllers and the CLI are thin. The CLI takes its terminal I/O as a structural interface instead of importing infrastructure.
- There is one pool, and no Shiori or Japanese-specific strings in `modules/auth`.
- Infrastructure never imports from modules, and lint enforces that.

### Not yet necessary

- Users, Profiles or Preferences modules.
- `domain/`, `application/`, `persistence/` or `http/` subfolders. Sixteen files is still easy to navigate, and M02.3–M02.4 are mostly frontend work.
- Repository classes, a TransactionRunner, or ALS/CLS helpers.
- Splitting the env schema per module.
- Moving the existing tests.

### Where the tests are today

| Runner                                                                                                                                              | Include pattern                             | Files                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.ts` (`pnpm test`, no Docker)                                                                                                         | `src/**/*.spec.ts`, `test/**/*.e2e-spec.ts` | `infrastructure/config/env.spec.ts`, `modules/auth/invitations.spec.ts`, `test/app.e2e-spec.ts` (with an unreachable database)                                                                                        |
| `vitest.db.config.ts` (`pnpm test:db`, files run one at a time, the global setup drops and re-migrates the database, local `*_test` databases only) | `test/**/*.db-spec.ts`                      | **Auth only, no app harness:** `invitations`, `auth-cli`, `auth-feasibility`. **Boot the full app through `createTestApp`:** `auth`, `registration`, `permissions`, `bootstrap-admin`. **Infrastructure:** `database` |

There is no CI configuration in the repo. Turbo's `test` task runs only the unit runner.

## 3. Recommended sequence

**Phase 1: give Auth a public entry point (no file moves)**

- **Scope:**
  - Add `modules/auth/index.ts`. It re-exports only the route-access decorators (`AllowAnonymous`, `OptionalAuth`, `Roles`) and the `Session`/`UserSession` types if a consumer needs them.
  - Switch `diagnostics.controller.ts` to import from it.
  - Allow `modules/*/index.ts` in the boundaries policy and add pass/fail cases to `scripts/eslint-architecture.test.mjs`. Deep imports must still be rejected.
  - In `docs/03`, list `cli.ts` as a bootstrap file and note that the module-contract rule now applies.
- **Acceptance:**
  - `openapi.json` is unchanged (`pnpm api:check`).
  - `/api/health` and `/api/ready` stay anonymous (`app.e2e-spec.ts:37-60`, `auth.db-spec.ts:79`).
  - `pnpm lint` passes, and the new lint fixture tests pass.
- **Tests:** the existing ones cover the behavior. Add the lint rule tests first.

**Phase 2: tidy Auth internals (small and reversible)**

- **Scope:**
  - Create `modules/auth/credentials.ts` holding `normalizeEmail`, `PASSWORD_MIN_LENGTH` and `PASSWORD_MAX_LENGTH`.
  - Update the imports in `auth.config.ts`, `invitations.ts`, `bootstrap-admin.ts` and `test/auth-feasibility.db-spec.ts`. No re-exports from the old files.
  - Replace `Pick<Env, …>` in `auth.config.ts` and `auth.module.ts` with a local `AuthEnv` interface of the same 3 fields. `Env` still satisfies it structurally, so `cli.ts` and `app.module.ts` don't change.
- **Acceptance:**
  - No behavior change.
  - `pnpm typecheck`, `lint` and `test` pass, and `pnpm test:db` passes with the same number of files and tests as before.
  - Nothing in `modules/auth` imports `infrastructure/config`.
- **Tests:** existing DB tests already cover normalization (`invitations.db-spec.ts:62`, the `bootstrap-admin.db-spec.ts:118` cases) and the password limits. If a unit test for `credentials.ts` is wanted, it goes in `auth/tests/credentials.spec.ts` under the KataKit rule.

**Phase 3 (optional): trial the integration-test placement rule with one file.** Do this only to check KataKit's `tests/integrations/` rule in practice.

- **Scope:**
  - Move `test/invitations.db-spec.ts` into the module.
  - Add a subpath import such as `"#test-support/*"` to `apps/api/package.json`, because the relative path would need 5 `../` levels and lint allows 2.
  - Widen the magic-numbers exemption in `eslint.config.js:331` to `**/*.db-spec.ts`, which `**/*.spec.ts` doesn't match.
  - Add `src/**/tests/integrations/*.db-spec.ts` to `vitest.db.config.ts`.
  - Confirm that the boundaries rule accepts a module file importing something that isn't a known element.
- **Acceptance:**
  - `test:db` still finds 8 files and runs the same number of tests.
  - The unit runner does not pick up the moved file.
  - `nest build` output contains no spec files (the `**/*spec.ts` exclude already covers this).
- **Recommendation:** not worth it yet. It needs 4 config changes to move one file. Tests that boot `AppModule` should stay in `test/` anyway.

### File moves

| Old → new                                                                                                          | Reason                                             | Required changes                                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `normalizeEmail` from `invitations.ts` → new `credentials.ts`                                                      | Bootstrap stops depending on invitations           | Imports in `invitations.ts` and `bootstrap-admin.ts`                                                         |
| `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` from `auth.config.ts` → `credentials.ts`                               | Policy constants separated from Better Auth wiring | Imports in `auth.config.ts`, `bootstrap-admin.ts`, `test/auth-feasibility.db-spec.ts`                        |
| _(Phase 3, optional)_ `test/invitations.db-spec.ts` → `src/modules/auth/tests/integrations/invitations.db-spec.ts` | Puts a module-owned DB test inside the module      | Vitest DB include, package `imports` alias, magic-number exemption, boundaries check, then confirm discovery |

**Readability:** everything above uses plain Nest modules, one `index.ts` and named files. A backend developer who has never heard of KataKit would find the same code by filename.

## 4. Verdict on KataKit

The rules hold up on this repo: ownership, transactions, Better Auth caveats and the "don't scaffold" advice all match what the code actually needs. Six wording fixes **in KataKit**:

1. **Public entry point.** Add: "If the project's boundary lint only permits `*.module.ts`, update the lint policy and its tests to allow the designated entry point." Also add: "When an owner module's global guard is implemented by a vendor library, consumers get the route-marking decorators from the owner's entry point, not from the vendor."
2. **Integration-test placement.** Change "where the runner supports it" to "where runner globs, lint scopes (relative-import depth, test exemptions, boundary elements), build excludes and shared harness imports all support it." Add: "A test that boots the composed app is application-level, even when it exercises one module."
3. **Top-level layout.** Change "`main.ts`: startup only" to "`main.ts` and other process entry points (CLI, offline generators): wiring only." Real apps have more than one entry point.
4. **Config.** Add: "Centralized env validation may include module variables. Modules accept a narrow settings or input type instead of importing the app-wide env type."
5. **Better Auth transactions** (in the data-and-transactions reference). Add: "Check whether the adapter's transaction option is enabled (off by default in some versions; when it is off, `runWithTransaction` gives no atomicity). Inside the auth transaction, reach it only through the library's current-adapter accessor."
6. **Unit vs integration tests under `tests/`.** State explicitly that `tests/` can hold both unit specs and a `tests/integrations/` subfolder, and that the suffix must keep the unit runner from picking up integration tests. Shiori's `.db-spec.ts` already does this.

## 5. Open questions

- Should there be at most one active invitation per email? The spec is silent; it would mean a partial unique index and a new migration.
- Does any CI outside this repo run `pnpm test:db`? Nothing in the repo does, and the answer decides how risky any test move is.
