# Shiori — F06: React Compiler & Performance Verification

## Context

F01–F05 are completed, reviewed, committed and pushed to `main`.

Shiori now has:

- React 19 and TypeScript.
- Vite 8 with `@vitejs/plugin-react` 6.
- React Router 7 in Declarative Mode.
- Lazy-loaded routes and authenticated layouts.
- TanStack Query.
- React Hook Form and Zod.
- shadcn/ui with Base UI.
- Responsive application layouts.
- A reusable theme and form foundation.
- Vitest, React Testing Library, MSW and Storybook.

We are beginning F06.

Our goal is to enable the stable React Compiler through the officially supported Vite integration, verify actual compilation, and measure its impact without introducing unnecessary complexity.

**This is a focused implementation and measurement task, not an application-wide refactor.**

## Working rules

- Work directly on `main`.
- Do not create branches.
- Do not commit or push.
- Read `CLAUDE.md`, applicable KataKit skills and existing architecture documentation.
- Follow the established `app → pages → domain → shared` architecture.
- Use strict TypeScript with no `any` or unsafe assertions.
- Preserve named exports and the strict main component contract.
- Prefer official integrations.
- Keep the implementation minimal.
- Do not rewrite working components for theoretical performance improvements.
- Preserve existing authentication, caching, routing and error-handling behavior.

## Phase 1 — Establish the baseline

Before changing dependencies or configuration, inspect:

- React and React DOM versions.
- Vite and `@vitejs/plugin-react` versions.
- Current `vite.config.ts`.
- ESLint configuration and `eslint-plugin-react-hooks`.
- TypeScript configuration.
- Storybook's Vite integration.
- Vitest configuration.
- Existing React hooks and manual memoization.
- Current build output and chunk structure.

Record reproducible baseline measurements.

### Bundle baseline

Measure:

- Initial JavaScript, gzip.
- Guest Sign In first-route JavaScript.
- Authenticated Home first-route JavaScript.
- Authenticated Account/Security routes.
- CSS gzip.
- Number of generated JavaScript chunks.

Use the same methodology as previous phases.

Distinguish initial-entry size from total JavaScript required to reach a page.

### Build baseline

Measure production build duration if practical.

Use comparable conditions.

Do not claim a precise build-time improvement or regression from a single noisy measurement.

### Runtime baseline

Where possible, capture a repeatable React rendering scenario using existing application behavior or an existing Storybook component.

Do not invent artificial product features for benchmarking.

If the current application does not contain a meaningful expensive rendering scenario, state that clearly.

Do not manufacture a performance gain.

## Phase 2 — Official React Compiler integration

Consult current official documentation:

https://react.dev/learn/react-compiler/installation

https://react.dev/learn/react-compiler/introduction

https://react.dev/learn/react-compiler/incremental-adoption

https://github.com/vitejs/vite-plugin-react

Use the official stable Babel-based React Compiler integration for our installed Vite React plugin.

For `@vitejs/plugin-react` 6.x, prefer the supported pattern involving:

- `reactCompilerPreset()`.
- `@rolldown/plugin-babel`.
- `babel-plugin-react-compiler`.
- Required Babel peer dependencies.

Inspect the actual installed versions before modifying configuration.

Important:

- Do not use the removed inline `react({ babel: ... })` option.
- Do not switch to the experimental native Rust/oxc React Compiler merely for performance.
- Do not replace Vite or its existing React plugin.
- Do not introduce a separate Babel configuration when the official Vite integration is sufficient.
- Do not install dependencies unrelated to the compiler.
- Do not change the React version without a demonstrated compatibility requirement.

Use the compiler's standard automatic compilation mode unless there is a concrete compatibility reason not to.

Do not introduce a custom configuration framework or unnecessary environment flags.

### Compiler scope

Ensure application React components and custom hooks are eligible for compilation.

Avoid compiling unrelated non-React utilities, backend code, build scripts or generated code unnecessarily.

Use the official preset's filtering behavior where appropriate.

Do not invent elaborate include/exclude rules unless the default behavior creates a demonstrated problem.

## Phase 3 — Verify actual compilation

**A successful build does not prove that React Compiler optimized the application.**

Verify that the compiler is genuinely operating.

Use supported methods such as:

1. React DevTools showing the `Memo ✨` indicator.
2. Inspecting transformed output for compiler-generated memoization.
3. Reviewing compiler diagnostics.
4. Confirming that representative application components and hooks are compiled.

Inspect representative areas:

- Application layouts.
- Authentication components.
- Theme-related React components.
- Reusable UI composites.
- Existing forms.
- Components consuming TanStack Query or React Context.

Do not assume every component must receive an optimization.

Document meaningful skipped components or warnings.

If the compiler cannot optimize a component because of a Rules of React violation, distinguish that from a correctly skipped non-React utility.

Do not change components merely to increase the number of compiled functions.

## Phase 4 — ESLint integration

Review the existing `eslint-plugin-react-hooks` configuration.

Use the current official recommended React Compiler lint rules where compatible.

Requirements:

- Avoid registering the same rules twice.
- Preserve KataKit architecture rules.
- Preserve existing React Hooks enforcement.
- Surface actionable compiler compatibility warnings.
- Do not disable lint rules globally to make the build pass.
- Do not automatically rewrite every reported component.

If any newly enabled lint rule identifies an existing issue, classify it:

- Confirmed correctness issue.
- Compiler optimization limitation.
- Existing accepted pattern.
- Tooling compatibility issue.

Fix confirmed correctness issues within scope.

Do not turn F06 into an unrelated codebase cleanup.

## Phase 5 — Existing memoization

Review existing usage of:

- `React.memo`.
- `useMemo`.
- `useCallback`.
- Manually stabilized objects and callbacks.

Follow the official React recommendation:

- Prefer compiler-generated memoization for new code.
- Preserve existing manual memoization unless there is a demonstrated reason to change it.
- Do not remove manual memoization automatically.
- Do not add manual memoization simply because a component renders.

Remember that manual memoization can also have semantic significance for effect dependencies and integrations.

Do not create unnecessary performance hooks or wrappers.

## Phase 6 — Library compatibility and regressions

Verify compatibility with our existing stack.

Pay particular attention to:

### React Router

- Lazy routes.
- Authenticated layout.
- Route transitions.
- Suspense.
- Error boundaries.
- Recovery from chunk-loading errors.

### TanStack Query

- Query subscriptions.
- Cache invalidation.
- Session-aware cache isolation.
- Data refresh behavior.

### Authentication

- Sign In.
- Sign Up.
- Protected routes.
- Session expiration.
- Account switching.
- Sign Out.

### Forms

- React Hook Form registration.
- Zod validation.
- Form reset behavior.
- Pending submissions.
- Error presentation.
- Preservation of dirty Account form values during background session refresh.

### Theme

- Light, Dark and System.
- Keyboard shortcut D.
- System preference tracking.
- Focus behavior of the lazy ThemeMenu.
- Cross-tab preference updates.
- Instant theme switching without staggered CSS transitions.

Do not refactor these systems unless compilation reveals a real regression.

Do not weaken existing tests.

## Phase 7 — Storybook and testing integration

Inspect whether the compiler is applied consistently and appropriately in:

- Vite development.
- Production builds.
- Vitest.
- Storybook.

The production application must compile correctly.

Development should preserve Fast Refresh and useful debugging behavior.

Storybook should continue functioning without unnecessary duplicate compiler initialization.

Do not introduce an additional Storybook-specific Babel pipeline unless required.

If Storybook or Vitest uses a separate transformation path, explain whether React Compiler is active there and why.

Do not create a second compiler configuration solely to make every tool use identical transformations.

## Phase 8 — Performance verification

Repeat the baseline measurements after enabling the compiler.

### Bundle

Compare before/after:

- Initial JavaScript gzip.
- First-route JavaScript.
- Authenticated route JavaScript.
- CSS.
- Total chunk count.
- Additional dependencies and runtime overhead.

Report regressions as well as improvements.

Do not assume a larger bundle is automatically unacceptable.

### Rendering

Where an existing repeatable scenario is available, compare:

- Component render counts.
- React Profiler commit durations.
- Avoided renders where demonstrable.

Use comparable scenarios with and without the compiler.

Avoid comparing development Strict Mode behavior against production behavior.

Do not claim an improvement without a comparable baseline.

### Startup and network

Inspect application startup behavior on a throttled connection where browser tooling permits.

Include:

- Initial HTML display.
- JavaScript loading.
- Guest Sign In readiness.
- Session-check behavior.
- Lazy authenticated layout loading.
- Route chunk loading.

Keep this separate from React Compiler's rendering optimizations.

If the authenticated browser is unavailable, do not repeatedly request the owner's login or credentials.

Use existing tests, public routes and Storybook, and explicitly report the limitation.

Do not create fake authentication bypasses.

### Performance budgets

Do not introduce arbitrary performance budgets.

Report actual measurements first.

We will decide whether persistent thresholds are justified after reviewing the results.

## Phase 9 — Browser verification

Where possible, verify in Chrome:

- Guest page.
- Theme switching.
- Navigation.
- Form interactions.
- Component focus behavior.
- Console warnings and errors.
- React DevTools compiler indicators.

Do not expose or display saved real passwords while testing.

Do not capture screenshots containing credentials, access tokens or other secrets.

Use fictitious test values for password visibility checks.

If a legitimate authenticated test session is unavailable, report that limitation instead of modifying authentication behavior.

## Phase 10 — Complexity and scope control

Do not:

- Refactor the frontend architecture.
- Create new UI components unrelated to compiler integration.
- Redesign the interface.
- Modify backend code.
- Change API contracts.
- Rewrite React Hook Form integrations.
- Add speculative useMemo/useCallback optimizations.
- Rewrite existing custom hooks.
- Introduce a performance monitoring service.
- Add Lighthouse or bundle-analysis packages without a demonstrated need.
- Modify KataKit.
- Update unrelated dependencies.
- Add compiler opt-out directives without explaining a real incompatibility.

If the compiler produces a significant regression or cannot be integrated safely, do not force adoption.

Report the blocker with evidence and recommend the smallest next step.

## Phase 11 — Documentation

Update relevant architecture documentation.

Document:

- React Compiler integration.
- Applicable tooling.
- Verification approach.
- Any justified exceptions.
- Meaningful build or runtime trade-offs.

Keep documentation concise.

Do not duplicate official React documentation.

Follow existing task-documentation conventions.

## Phase 12 — Quality gates

Run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `pnpm test`
- `pnpm build`
- `pnpm build-storybook`

Run additional existing relevant checks only when required.

Review the final diff for accidental scope expansion.

Confirm that dependency changes are limited to the compiler integration and necessary peer dependencies.

## Final report

Provide:

1. Exact React Compiler and tooling versions.
2. Official integration selected and why.
3. Files and dependencies changed.
4. Whether compiler optimization was actually confirmed.
5. Representative compiled components and hooks.
6. Compiler warnings and skipped optimizations.
7. ESLint integration changes.
8. Vite, Vitest and Storybook compatibility.
9. Before/after bundle measurements.
10. Before/after runtime measurements where reliable.
11. Build-time impact.
12. Browser verification and limitations.
13. Test and quality-gate results.
14. Remaining risks or trade-offs.

Explicitly distinguish:

- Measured improvements.
- Measured regressions.
- Compiler behavior confirmed by inspection.
- Areas where no reliable measurement was possible.

Do not declare performance improvements merely because React Compiler has been enabled.

**Stop after implementation and verification. Do not commit or push.**
