# Claude Code — M00 Follow-up, Project Status & Review Archive Script

**Task:** Apply only these small M00 follow-up corrections and prepare the source-export helper. Then stop. **Do not implement M01 as part of this task.** The next implementation task is `docs/tasks/M01-database-foundation.md`.

This document is a handoff from a static code review of the first Shiori bootstrap. M00 was **approved with minor comments**, not independently runtime-verified. Keep the current code and architecture; no rewrite.

## 1. Update the project status consistently

After the corrections below are implemented and verification has passed:

- `CLAUDE.md`: remove/replace the stale **"Active task: M00 bootstrap only"** directive. Mark **M00 complete; M01 next**, and point to `docs/tasks/M01-database-foundation.md`. Keep the existing concise engineering rules, especially strict TS, minimal scope, mobile-first and no unrequested Git actions. Make the workflow apply to the **current task** rather than always saying M00.
- `docs/05-roadmap.md`: change **M00 Bootstrap (NOW)** to **M00 Complete** and **M01 Infrastructure** to **M01 Next**. Do not declare M01 complete or install its dependencies in this follow-up.
- `README.md`: update the project-status summary and documentation map so M00 is historical and M01 is next. Keep existing working setup commands.
- `docs/tasks/M00-bootstrap.md`: keep the original task as a historical record; do not rewrite it to reflect new requirements. A small `Status: COMPLETE` line is fine if verification succeeds.
- Other docs: correct only proven stale milestone references; do not rewrite the architecture or design system documents.

**Important:** A task document existing in the repository does not automatically authorize every future milestone. This follow-up completes M00; **start M01 only on the user's subsequent explicit request**.

## 2. Small, concrete M00 review fixes

1. **Health retry test:** Extend `apps/web/src/app.test.tsx` (or colocated equivalent) with an interaction test: initial fetch fails → offline UI → user activates **Check again** → subsequent fetch succeeds → online UI. Use existing React Testing Library/Vitest conventions. Verify the tested behavior, not implementation details. Don't rewrite the health-status component unless the test exposes a real bug.
2. **Mobile touch targets:** Review `apps/web/src/components/ui/button.tsx` and how it is used. Ensure interactive controls intended for touch have accessible target sizes, ideally >=44×44 CSS pixels including hit area. Make the smallest coherent design-system change: adjust relevant Button size defaults/variants or document and implement a reusable touch-friendly variant. Avoid one-off `h-11` overrides proliferating through future features. Keep Storybook examples consistent and check both mobile and desktop behavior. This is a policy for usable touch targets, not a requirement for every visual element to be 44px tall.
3. **Build-time branding accuracy:** In `apps/web/index.html`, correct the inaccurate comment saying `product.config.json` is replaced "at runtime". M00 imports product identity at build time; document that accurately. Do **not** build a runtime-config service now.
4. **Do not refactor for style alone:** `apps/web/src/health-status.tsx` has extra complexity around StrictMode request sharing, but no confirmed bug. Leave it alone unless a specific failing test justifies a change.
5. **Keep existing foundations:** Do not replace NestJS, shadcn/Base UI, Storybook, or root tooling. No new shared packages, domains, framework adapters, or speculative code.

## 3. Implement a one-command source-only review archive script

**Why:** The user sends frequent ZIP reviews and should never manually delete `node_modules`, `.git`, `.turbo`, builds, or local secrets before sending source.

Create **one lightweight script** in `scripts/` and a single root `package.json` command:

```sh
pnpm review:zip
```

Required behavior:

- Write a ZIP **outside the repository** by default, e.g. `../shiori-review-YYYYMMDD-HHMMSS.zip`, and print its absolute location and file count. Do not mutate or delete source files.
- Include repository **tracked and non-ignored untracked** files, reflecting current working-tree contents (including unstaged edits). Do **not** use `git archive HEAD` alone: it omits uncommitted/untracked source changes that are relevant to reviews.
- Prefer a small Python 3 standard-library implementation using `git ls-files --cached --others --exclude-standard -z` plus `zipfile` (or an equally robust portable approach). Handle spaces/unicode in filenames. If Python 3 is a requirement, state it explicitly in README. No new npm runtime dependencies for creating ZIP files.
- Always exclude these regardless of Git tracking status: `.git/`, `node_modules/`, `.turbo/`, `dist/`, `build/`, `coverage/`, `storybook-static/`, `.next/`, `.output/`, `.cache/`, `.vite/`, `.pnpm-store/`, `__MACOSX/`, `.DS_Store`, `*.tsbuildinfo`, `*.log`, generated ZIP/tar archives, local test databases and personal editor/Claude session files.
- **Secrets must never be archived:** exclude `.env`, `.env.*` except explicitly safe template `.env.example` (and its explicit example equivalents), secret/token/password/key/certificate files (`*.pem`, `*.key`, `*.p12`, `*.pfx`, private SSH keys), `.claude/settings.local.json`, and obvious local credentials files. Be conservative about suspicious paths; skipping an ambiguous file with a warning is safer than including secrets.
- Include meaningful source, `pnpm-lock.yaml`, root and workspace package manifests, `product.config.json`, documentation, `.gitignore`, `CLAUDE.md`, non-private `.claude` rules/skills, test files, configuration, and small required static assets. Do not exclude whole docs/tests/source folders just to make the ZIP tiny.
- Do not follow symlinks outside the repository. Avoid archiving large files by mistake; set a reasonable file-size cap and report skipped files without disclosing contents.
- Make ZIP contents use clean **relative paths** (prefer root `shiori/` directory inside the ZIP) and avoid macOS resource-fork/AppleDouble entries. Use a deterministic sort order of included paths.
- Print a concise summary of included files and excluded/skipped path counts. Never print secret contents or connection strings.
- Provide **one focused automated test or a reproducible validation procedure** checking that an untracked, non-ignored source file and a modified tracked source file are included, while a fake `.env` and generated directory are absent. Validation must not expose any real secrets.
- Update README with `pnpm review:zip` and where to find the resulting archive. Keep the script generic enough for reuse in other PNPM/TypeScript repositories without Japanese-specific assumptions apart from naming the ZIP after the repo.

**Note:** A filename-based denylist cannot guarantee that every secret hidden inside otherwise normal source files is removed. Include a short caution in README to inspect the ZIP before sharing. Do not imply this script is a security scanner.

## 4. Verification and completion

- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm build-storybook`, `pnpm format:check` and the archive export script.
- Inspect the generated archive contents (paths, not sensitive contents) for excluded files and verify useful source/doc/config files are present.
- If the local runtime differs from Node 26, resolve in the documented supported way or report the exact blocker; do not make unrelated dependency upgrades.
- If any check fails, fix only problems introduced by this follow-up or clearly attributable M00 issues.
- No commit, push, deployment, or KataKit updates without explicit request.

## Required final response (brief)

List exact files changed, commands run, actual check results, exported ZIP location, and any remaining blockers. Confirm that M00 is complete **only if** verification supports that claim. Explicitly state that M01 has **not** been implemented.
