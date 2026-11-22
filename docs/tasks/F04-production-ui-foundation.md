# Shiori — F04: Production UI Foundation & Responsive Layouts

## Context

F01, F02 and F02.1 are completed.

F03.0–F03.3 explored several visual design directions in Storybook. The experiments were useful, but none of the proposed layouts has been approved for production.

**We are ending the design experimentation phase.**

Our next goal is to establish a clean, practical, maintainable frontend foundation using official shadcn/ui patterns and existing application functionality.

Do not continue exploring design directions.

Do not implement the experimental learner dashboards.

This is an implementation task.

## Working rules

- Work directly on `main`.
- Do not create branches.
- Do not commit or push.
- Read `CLAUDE.md` and the currently installed KataKit skills.
- Follow KataKit 0.4.2 frontend architecture, UI design, and code quality standards.
- Follow `app → pages → domain → shared`.
- Strict TypeScript, no `any`, unsafe assertions or unnecessary non-null assertions.
- Follow the strict main component file contract.
- Keep module responsibilities clearly organized.
- Use named exports.
- Prefer installed libraries and official shadcn patterns.
- Avoid unnecessary abstraction and premature generalization.
- Preserve all existing authentication, routing, theme, and security behavior.

---

# Phase 1 — Clean Storybook

**This must be completed first, before changing any production UI.**

F03 created an experimental design laboratory.

Remove all obsolete F03 design experiments, including:

- F03.1 Editorial and Bento specimens.
- F03.2 Workspace, Open Bento and Typographic Studio concepts.
- F03.3 Quiet Study variations.
- Experimental color palettes, layout overrides and prototype-only CSS.
- Artificial Japanese learning data created exclusively for these experiments.
- Experimental Storybook stories, controls and configuration that are no longer useful.
- Documentation describing obsolete design experiments.

Inspect the current working tree before deleting anything.

Do not use `git reset --hard`, `git clean -fd` or another broad destructive command.

Remove only files that belong to the obsolete design experiments.

### Preserve

- Storybook itself.
- Existing legitimate stories for real components.
- Useful lightweight Storybook configuration.
- Production UI components.
- Existing app styles and tokens unrelated to F03.
- Existing project documentation unrelated to obsolete experiments.

Review `.storybook/main.ts` and `.storybook/preview.ts`.

Remove experimental layout, face, palette and radius selectors.

A simple Light/Dark preview control may remain if it is useful for real component stories and does not add unnecessary complexity.

### Tailwind source configuration

F03 introduced:

```css
@import 'tailwindcss' source('../..');
```

This was intended to prevent design-lab-only classes from entering production CSS.

After deleting the design lab, re-evaluate whether this source restriction is still necessary.

Keep it only if it remains correct and beneficial for the actual project structure.

Verify that production Tailwind classes are still discovered correctly.

Do not retain obsolete configuration merely because it was previously implemented.

### Verification checkpoint

After cleanup:

- Storybook still starts.
- Existing legitimate component stories render.
- No obsolete Design Lab entries remain.
- TypeScript and lint pass.
- Production build still works.
- No stale imports or references remain.

Do not replace the experiments with another prototype framework.

---

# Phase 2 — Establish the production visual baseline

We are not adopting the full F03 experimental designs.

Use a simple, practical foundation based on our established preferences.

## Colors

Use:

- Stone-inspired neutral palette.
- Muted Indigo as the primary accent.
- Consistent Light and Dark themes.
- Existing semantic shadcn tokens.

Prefer adjusting existing semantic variables over introducing a new token framework.

Preserve shadcn component styling conventions.

Do not create a custom visual system that competes with shadcn.

Avoid:

- Decorative gradients.
- Excessive shadows.
- Large colored dashboard blocks.
- Unnecessary cards.
- Decorative bookmark ribbons.
- Mandatory bilingual section headings.
- Gaming-style visual elements.

Review contrast for text, interactive controls, borders, focus indicators and disabled states.

Avoid arbitrary changes to unrelated tokens.

## Typography

Keep a readable sans-serif font for ordinary application UI.

Use a suitable Japanese Mincho font stack selectively for prominent Japanese study content and branding where appropriate.

Use proper Japanese language attributes.

Do not bundle large Japanese font packages during this phase without a demonstrated requirement and performance assessment.

Do not add decorative serif typography throughout the application.

## Theme compatibility

Preserve the existing ThemeProvider behavior:

- Light / Dark / System.
- Persistence.
- D keyboard shortcut and its accessibility controls.
- No initial flash.
- Instant color switching without staggered transitions.
- Cross-tab and system theme behavior.

If background tokens change, update the associated browser theme-color and initial HTML configuration consistently.

Do not refactor theme internals unless required for compatibility.

## Branding

Preserve the reusable Logo and application branding configuration.

Keep the identity clean and restrained.

Do not implement the experimental bookmark motif as a new global design element.

---

# Phase 3 — Responsive application layouts

Inspect the existing real routes and layouts.

Use the current typed route registry and navigation metadata from F01.

Create an appropriate responsive application structure using official shadcn patterns.

## Guest experience

Keep guest pages straightforward:

- Simple branding.
- Comfortable form width.
- Clear content hierarchy.
- Responsive spacing.
- Accessible theme selection.

Do not build a separate guest navigation framework.

Do not redesign or refactor the forms yet.

The official shadcn Field migration will happen in F05.

## Authenticated experience

Improve the current AppLayout.

For desktop, evaluate the official shadcn Base UI Sidebar pattern against the actual routes and navigation requirements.

Prefer the official Sidebar implementation if it meaningfully improves the application.

Do not create a custom sidebar framework.

Use a sensible navigation structure, clear active states, and a content area that responds appropriately to the viewport.

### Important: Actual routes only

Build navigation from the existing route registry.

Do not add placeholder destinations such as:

- Review.
- Learn.
- Words.
- Kanji.
- Collections.

Those are future product features, not implemented routes.

Do not create mock pages merely to make the navigation look complete.

The current application must remain honest about its available functionality.

### Desktop layout

- Use available screen width appropriately.
- Avoid the previous narrow centered mobile-style column across the entire application.
- Distinguish between the overall application content area and narrower reading/form content.
- Keep comfortable maximum reading widths where appropriate.
- Avoid arbitrary hardcoded dimensions.
- Use responsive CSS and existing design tokens.

Do not force every page into a full-width dashboard layout.

Different page types may require different content widths.

### Mobile layout

Use an official shadcn-compatible mobile navigation pattern appropriate to the actual route count.

A slide-in menu is acceptable.

Do not create a mobile bottom navigation with fake or unimplemented destinations.

Consider:

- Safe-area insets.
- Small screens, including 320px.
- Touch targets.
- Keyboard accessibility.
- Focus management.
- Active route indication.
- Menu close behavior after navigation.
- Long labels and localization.

Prefer reusing the desktop navigation source rather than maintaining separate arrays of links.

## Account menu

Review the current account and sign-out controls.

Use the existing official shadcn DropdownMenu where suitable.

Provide access to existing account-related functionality and theme selection without crowding the header.

Preserve existing sign-out behavior and error handling.

Do not introduce new account functionality.

Do not duplicate theme selection state.

## Layout architecture

Keep layout components simple.

Use reusable UI elements only where they represent real shared responsibilities.

Avoid:

- Custom navigation frameworks.
- Generic layout factories.
- Unnecessary contexts.
- Duplicated route metadata.
- Repeated styling definitions that represent the same visual decision.
- Creating components solely to reduce line counts.

Follow KataKit component ownership and file organization rules.

---

# Phase 4 — Existing pages and styling consistency

Review only existing application pages.

Improve their integration into the new layouts:

- Consistent page spacing.
- Appropriate content widths.
- Page titles and headings.
- Responsive behavior.
- Existing empty/loading/error states.
- Light/Dark compatibility.

Do not invent new application content.

Do not change business logic.

Do not introduce new API requests.

Do not refactor forms or domain behavior.

Keep visual improvements modest.

The objective is a clean production baseline, not a complete bespoke redesign.

Prefer semantic tokens, shadcn variants and CVA where applicable.

Do not extract static Tailwind strings into unnecessary constants.

---

# Phase 5 — Testing and verification

Preserve the existing application behavior.

Add or update relevant tests for:

- Guest layout.
- Authenticated layout.
- Navigation generated from the route registry.
- Active link behavior.
- Mobile navigation.
- Account menu.
- Sign-out.
- Theme access.
- Loading and error states.
- Responsive behavior where practical.
- Existing auth and session protection.
- Private query-cache isolation.

Avoid tests that merely assert implementation details.

Do not create unnecessary test frameworks.

## Browser verification

Open the actual application in a browser where available.

Check:

- Desktop: 1280, 1440 and 1920px.
- Tablet: approximately 768px.
- Mobile: 390 and 320px.
- Light and Dark themes.
- Keyboard navigation.
- Visible focus indicators.
- Mobile menu operation.
- Horizontal overflow.

If authentication prevents a complete browser check, report that limitation.

Do not claim verification of screens that were not actually opened.

## Performance

Record the baseline before changes and compare afterward:

- Initial JavaScript gzip.
- Guest first-route JavaScript.
- Authenticated Home first-route JavaScript.
- CSS gzip.
- Added dependencies and chunks.

Avoid introducing significant initial bundle costs merely for navigation styling.

Keep the initial application experience fast on slower mobile connections.

Do not add speculative prefetch mechanisms.

## Quality gates

Run all relevant established checks:

- Lint.
- Typecheck.
- Format check.
- Web tests.
- Relevant repository tests.
- Production build.
- Storybook build.

Report exact results.

---

# Explicitly out of scope

Do not implement:

- F03 design experiments.
- New learner features.
- Review sessions.
- Word or Kanji functionality.
- Mock dashboards.
- Admin functionality that does not exist.
- New authentication behavior.
- Form architecture migration.
- New generalized design system packages.
- React Compiler integration.
- Axios-to-Fetch migration.
- Backend modifications.
- Unrelated dependency upgrades.

Do not modify KataKit.

Do not implement speculative abstractions for future products.

---

# Final report

Provide:

1. Storybook experiments removed.
2. Storybook configuration retained.
3. Any Tailwind source configuration changes and why.
4. Files created, modified and deleted.
5. Production visual baseline and token changes.
6. Responsive layout and navigation implementation.
7. Official shadcn components used.
8. How route registry integration works.
9. Changes to account and theme controls.
10. Browser verification results.
11. Bundle measurements before and after.
12. Test and quality-gate results.
13. Remaining limitations and justified trade-offs.

Explicitly identify any deviation from official shadcn patterns.

Review the final diff for unnecessary complexity.

**Work directly on main. Do not create branches, commit or push. Stop after implementation and verification.**
