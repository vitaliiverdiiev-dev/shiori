# M02.1 — Comment Policy Enforcement & Final Cleanup

**Repository:** `vitaliiverdiiev-dev/shiori`  
**Target branch:** `m02.1-auth-foundation` (confirm current checkout/HEAD before editing).  
**Scope:** finish M02.1 hygiene and enforcement only; **do not begin M02.2**.

## Prerequisite and sources of truth

First complete and install/activate the corresponding KataKit comment-policy update. **Explicitly load** `kata-kit:code-quality`, `kata-kit:testing` (for ESLint rule regression tests), and the relevant architecture skill before editing. Load `kata-kit:quality-gate` at the end. Confirm actual loading, not merely that a plugin is installed. Stop and report if a required skill is unavailable.

**KataKit skills define reusable engineering standards.** This task specifies what Shiori must enforce. `CLAUDE.md` and `docs/03-architecture.md` hold Shiori-specific context and documented technical exceptions, not a copied universal comment policy. Follow existing project ESLint/TypeScript/Prettier config, Architecture v1 slice boundaries and current M02.1 spec. If this task and a skill disagree, report the precise conflict rather than silently choosing.

Inspect the **current** checkout, staged/unstaged changes and existing tests before acting. Previous reviews may describe older versions of files: do **not** assume a problem is still present merely because this task mentions it. No changes to KataKit from inside Shiori.

## Outcome

After this task, Shiori's **maintained** source is free of explanatory noise; new ordinary JS/TS comments must be classified as one of `TODO`, `FIXME`, `WORKAROUND`, `INVARIANT`, or `COMPAT` and justified. The policy is actively **enforced by ESLint, with automated positive/negative tests**, not merely promised in Markdown. All applicable formatting, lint, type, test, generation-consistency and build checks pass. The security scan may still report reviewed upstream advisories but must never be falsely marked PASS.

## 1. Audit and remove comments — actual necessity, not keyword laundering

Inspect all maintained project source and configuration containing comments, not only the latest diff: `apps/api`, `apps/web`, `packages/api-client` **outside generated output**, root and `scripts/` configuration/tests, and relevant `.mjs/.js/.ts/.tsx` files. Review YAML/configuration comments manually where relevant. Do not rewrite unrelated functionality just to remove prose.

For **every** human-authored comment:

1. If names/types/code/tests already communicate it, **remove it**.
2. If it repeats configuration (`transaction: true`, `session.expiresIn`, `disableSignUp`), describes a function/class/file, JSX, style, or milestone, **remove it**.
3. Keep it only if its deletion would hide genuinely non-obvious, important information; then use **one of the five specific categories** with a substantive explanation, preferably one short line.
4. `COMPAT` requires a verifiable external dependency/version or protocol constraint; `INVARIANT` a genuinely critical non-obvious invariant (ideally a regression test); `WORKAROUND` a temporary constraint and removal condition; `TODO/FIXME` a concrete remaining action. Do not turn ordinary comments into fake `COMPAT` labels.
5. Preserve license/copyright notices, generated code untouched, objectively required tooling directives, and type-bearing JSDoc in JS/MJS when needed for type checking. Do not keep narrative JSDoc merely because it is syntactically valid. Never use an indiscriminate comment-deletion script.

Specific review targets (assess actual contents, not quotas):

- `apps/api/src/modules/auth/auth.config.ts`: remove JSDoc for `baseURL` and `betterAuthOptions`; remove obvious prose about `transaction`, `disableSignUp`, `session`; consider keeping only concise, fact-checked `COMPAT` notes for forced Origin/CSRF verification under tests and unusual Nest/Better Auth base path behavior.
- `apps/api/src/modules/auth/session.guard.ts`: condense explanation of why a public route skips database session lookup and `@AllowAnonymous` versus `@OptionalAuth`; avoid redundant JSDoc.
- `auth.schema.ts`, `auth.module.ts`, `app.config.ts`, `env.ts`, `local-url.ts`, `database.module.ts`, `diagnostics.controller.ts`, `openapi.ts`: delete ordinary narration, retain real compatibility/security constraints only where code or tests cannot convey them.
- Frontend `button.tsx`, health status files, `vite.config.ts`, scripts and tests: no explanatory wrappers, duplicate run commands, obvious layout descriptions, or milestone history.
- `eslint.config.js` and `pnpm-workspace.yaml`: comments are **not exempt** from semantic review. Retain only genuinely necessary reasons for non-obvious restrictions/overrides and legal/tooling metadata.

Do not force an artificial count or delete a critical comment to meet a number. Produce a **short retained-comment inventory** with the location, category and specific reason; if many remain, revisit the necessity judgment.

## 2. Enforce the policy with existing ESLint infrastructure

Add a **small repository-local ESLint rule** (inline plugin or a single small local module if that is cleaner) using ESLint's comment tokens/source-code API. Do not add an npm dependency or external plugin solely for this rule and do not build a broad comment-processing framework.

- Apply it to maintained `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx` source and tests/configuration actually linted by this repo. Account for the current flat config, file globs and ignores. Ensure scripts/configs aren't silently skipped; adjust scopes minimally if necessary.
- Reject ordinary `//`, `/*...*/`, `/**...*/` and JSX-expression comments without a valid leading `TODO`, `FIXME`, `WORKAROUND`, `INVARIANT`, or `COMPAT` marker **and substantive description**. No `NOTE`/`IMPORTANT`/`HACK`/milestone prefixes. Support optional reference syntax like `TODO(SHI-123):` or `COMPAT(better-auth@1.7.23):`.
- Allow **narrow, explicit** technical exceptions: legally required license notices; parser/tool-required pragmas or triple-slash references only when needed; type-bearing JSDoc for JS/MJS type checking; generated/vendor files excluded by precise configured paths. Avoid permitting arbitrary prose under `@param` or using a broad `/** ... */` bypass.
- No autofix that deletes or rewrites comments. Emit an actionable **error** (not warning), with file/line and the five categories. Make deliberate limits clear: ESLint can check classification, not whether a `COMPAT` statement is true.
- Add regression tests to the existing ESLint test harness or one small related test file if cleaner. Cover positive and negative examples for TS, TSX/JSX, JS/MJS, ordinary JSDoc, meaningful type-bearing JSDoc, block comments, license/required pragma, valid/invalid marker payload, and source files vs generated exclusion. Prove the test rejects the old unclassified comment pattern and that lint autofix does **not** erase comments. Ensure the test runs under `pnpm test`.
- Preserve existing architecture boundaries/sorting, no duplicate lint configs, `--max-warnings 0`, and typecheck behavior. Do not introduce `eslint-disable` or weaken TypeScript.

The rule is intended for future tasks too. A passing regex is **not sufficient** to approve a semantically useless comment: KataKit `code-quality` and review still own that judgment.

## 3. Finish the technical cleanup identified in the M02.1 review

These are **conditional checks against current HEAD**, not mandatory rewrites if already correct:

**API consistency:** Inspect `scripts/api-check.mjs`, its tests, and `pnpm api:check`. The check must verify working-tree OpenAPI/SDK against a fresh generation **without depending on a Git commit** and **without changing the working tree even if generation fails or is interrupted**, where feasible. If it currently regenerates in place then restores in `finally`, recognize that forced termination can leave a modified tree; prefer generating into an isolated temporary workspace/output directory, preserving identical config/environment, and comparing contents. Add/adjust focused tests for stale/changed/added/deleted output and read-only behavior. Do not create another SDK generator or change generated code manually. If a truly isolated invocation is not feasible with installed tools, report the limitation and a safe minimal alternative; avoid speculative infrastructure.

**Dependency classification:** Verify whether `shadcn` is runtime-imported. If used only as the component generator CLI, move it from `apps/web/package.json` `dependencies` to `devDependencies`, update lockfile and recheck build/generation. Do not move actual runtime UI packages. This must not be described as fixing the upstream `deepmerge` vulnerability; it only changes deployment dependency ownership.

**Security advisories:** Re-run the actual configured `pnpm audit` and `pnpm audit --prod`, identify **current** advisories and direct dependency chains. Verify safe compatible updates/mitigations where possible, especially the previously discussed `deepmerge`, `minimatch`, `glob`, and `esbuild` chains. Do not force incompatible major overrides, suppress scans, or pretend dev-tool risks equal public API exploitability. If any remain, produce a brief **risk register** in the existing appropriate project doc or final handoff (no new policy file): advisory/affected package/severity/reachability/exposure/available fix/owner or revisit trigger. Treat acceptance as a **separate explicit user decision**. A failed `pnpm audit` is FAIL even if risks are consciously accepted.

**Documentation:** Ensure `CLAUDE.md` contains Shiori-specific commands, context, exceptions and milestone state, without restating KataKit's reusable policy; keep the canonical comment definitions **only in KataKit**. Update existing documentation only for changes really made. Do not create extra standards or duplicate a long policy in `docs/standards/`. Do not edit historical documents needlessly.

## 4. Required checks and definition of done

Use `kata-kit:testing` while implementing the ESLint rule (RED → GREEN for representative negative/positive fixtures). After the cleanup, explicitly invoke `kata-kit:quality-gate` and perform its **read-only** checks; fixes and autoformatting belong to the implementation step **before** the final gate.

Discover and run the project's real equivalent of:

```sh
pnpm format          # implementation cleanup only; review resulting diff
pnpm format:check    # must PASS
pnpm lint            # 0 errors AND 0 warnings; must PASS
pnpm typecheck       # must PASS
pnpm test            # includes new ESLint fixtures; must PASS
pnpm test:db         # must PASS when test database is available
pnpm api:check       # must PASS on current uncommitted state
pnpm build           # must PASS
pnpm build-storybook # must PASS
pnpm audit --prod    # report exact status, not a fabricated PASS
pnpm audit           # report exact status and advisories
```

Also run `git diff --check`, inspect staged/unstaged changes, verify generated artifacts stay unchanged except deliberate regeneration, and ensure no secrets/temporary files. If a runtime check is applicable and possible, execute and report it; otherwise mark NOT RUN/BLOCKED accurately. Run checks **again after the final change** where affected.

All applicable formatting, ESLint, typecheck, test, generation and build checks must be green with zero warnings/errors. Pre-existing failures are still failures: fix them when safely within scope; otherwise report NOT READY and the blocker. Security scan results are separate; remaining reviewed advisories require the user's explicit risk acceptance, never a false green scan. Do not silently downgrade or delete required checks to achieve PASS.

## Final report and acceptance

Return a compact report with:

1. Current branch/commit and exact files changed; confirm **no M02.2 changes**.
2. Counts of removed/retained comments, with an **itemized justification for remaining ordinary human-authored comments**. Technical/legal/type-JSDoc exceptions can be grouped.
3. Local ESLint rule location and tests, with examples of comments rejected/accepted and proof that autofix doesn't delete them.
4. API check read-only verification and dependency classification decision.
5. Exact commands and observed `PASS`/`FAIL`/`BLOCKED`/`NOT RUN`, including zero warning/error evidence and outstanding advisories.
6. Any unanswered security or compatibility risks needing user approval.

**No Git commits, pushes, PRs, deployment, KataKit edits, M02.2 implementation, new agents or extra project standards. Stop for manual review.**
