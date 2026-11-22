# Shiori — F05: Forms & Reusable UI

## Context

F01–F04.1 are completed.

The application now has a typed route registry, lazy loading, theme infrastructure, responsive shadcn Sidebar, and consistent production design tokens.

We are starting F05 — Forms & Reusable UI.

**Goal: make all existing forms consistent, accessible, maintainable, and reusable using official shadcn/UI patterns.**

This is an implementation task, not an architecture redesign.

## Working rules

- Work directly on `main`.
- Do not create branches.
- Do not commit or push.
- Read `CLAUDE.md`, the installed KataKit skills, and relevant architecture documentation.
- Follow KataKit 0.4.2 or the latest installed approved version.
- Preserve `app → pages → domain → shared`.
- Strict TypeScript. No `any`, unsafe assertions, unnecessary non-null assertions, or `React.FC`.
- Follow the strict main component file contract.
- Preserve deterministic test placement.
- Use named exports and explicit public APIs.
- Do not add nested `index.ts` files inside internal segments.
- Prefer the simplest complete implementation.
- Preserve all authentication and security behavior.

## 1. Inspect existing forms

Before implementation, review the actual existing forms and their shared components:

- Sign In.
- Sign Up.
- Account Settings.
- Security / Change Password.
- Existing password visibility controls.
- Existing field labels, descriptions, errors and form-level messages.
- Existing React Hook Form and Zod integration.
- Existing tests and Storybook stories.

Identify duplicated responsibilities and potential accessibility defects.

Do not assume every existing wrapper must be replaced.

Record the current behavior and test baseline before making changes.

## 2. Official shadcn first

Use the configured shadcn Base UI implementation.

Consult the current official documentation:

https://ui.shadcn.com/docs/components/base/field

https://ui.shadcn.com/docs/components/base/input-group

https://ui.shadcn.com/docs/forms/react-hook-form

Install required official primitives through the shadcn CLI when appropriate.

Prefer:

- Field.
- FieldLabel.
- FieldDescription.
- FieldError.
- FieldGroup.
- Input.
- InputGroup and its official subcomponents.
- Existing Button and other installed primitives.

Do not recreate their functionality with custom components or additional CSS.

Preserve generated shadcn code as closely as possible to the official implementation.

Do not introduce a custom form framework.

## 3. Consistent field composition

Migrate existing form fields to the official shadcn composition where appropriate.

Ensure:

- Every control has an associated accessible label.
- Labels and descriptions are correctly linked.
- Error text is associated with its field.
- Invalid state is represented correctly.
- Required fields are understandable.
- Error states do not obscure keyboard focus.
- Spacing is consistent.
- Light and Dark themes work correctly.
- Keyboard and screen-reader behavior remain accessible.

Avoid duplicated labels or error messages.

Preserve browser autocomplete behavior.

Do not rely on placeholder text as the only label.

### Reusable components

Create a custom reusable field component only when an actual repeated responsibility justifies it.

A reusable wrapper must eliminate meaningful duplication without hiding React Hook Form or shadcn capabilities.

Prefer composition over configuration-heavy generic components.

Do not build:

- A schema-driven form renderer.
- A generic field factory.
- A custom validation engine.
- A custom form state manager.
- A wrapper that merely renames an existing shadcn component.

## 4. React Hook Form and Zod

Preserve existing React Hook Form and Zod integration.

Important:

- Use `register` for native uncontrolled inputs when appropriate.
- Use `Controller` when a component actually requires controlled integration.
- Do not convert all fields to Controller merely because the shadcn documentation demonstrates it.
- Preserve existing validation rules and validation timing.
- Preserve server-side error handling.
- Avoid unnecessary state duplication between React and React Hook Form.
- Keep schemas in their existing proper ownership locations.

Do not change the password policy or authentication API contracts.

## 5. Password fields

Review the existing password input implementation.

Prefer the official shadcn InputGroup pattern for an input with a show/hide control.

Requirements:

- Accessible show/hide button.
- Correct button type to prevent accidental form submission.
- Preserve keyboard focus when toggling visibility.
- Preserve the current input value.
- Do not expose the password through logging.
- Correct autocomplete attributes.
- No layout shift when toggling visibility.
- Consistent invalid and focus states.
- Appropriate touch target size.

If a reusable PasswordInput is justified, keep it domain-independent and appropriately owned in shared UI.

Do not create separate variations for each authentication form.

Preserve the established password requirements: 15–128 characters, passphrases and Unicode allowed, with confirmation where currently required.

## 6. Form submission and feedback

Review existing loading, disabled, success and error states.

Ensure:

- Duplicate submissions are prevented appropriately.
- Server errors remain understandable without exposing sensitive authentication information.
- Form-level errors are distinct from field-level validation errors.
- Error messages are announced appropriately.
- Pending states do not unnecessarily clear user input.
- Users can correct invalid data without losing unrelated field values.
- Existing redirect and sign-out behavior remains unchanged.

Do not introduce Toast or another notification system solely for this task unless an existing requirement cannot be met by the current feedback components.

## 7. Account Settings regression risk

Previous frontend reviews identified a potential issue involving React Hook Form's `values` configuration and background session updates.

Inspect the current Account Settings implementation.

Determine whether a background session refetch or equivalent update could overwrite a user's unsaved name edit.

Add a regression test for this scenario.

Fix it only if the risk is confirmed or demonstrated by the current implementation.

Preserve correct form initialization and updates when the authenticated user changes.

Do not introduce a new account state store.

## 8. Component ownership and styling

Follow KataKit's file organization rules.

Main component files should contain only the permitted imports, optional Props type, and named component declaration at module scope.

Place internal components and variant definitions in their appropriate ownership segments.

Use CVA when visual variants depend on props or meaningful UI states.

Do not create CVA configurations for static classes.

Do not extract every small callback or JSX fragment.

Prefer existing shadcn primitives and semantic design tokens over repeated styling.

Do not change the established Stone and muted-Indigo visual foundation.

## 9. Storybook

Update or add useful stories for reusable production components where they provide meaningful value.

Focus on actual component states:

- Default.
- Description.
- Invalid.
- Disabled.
- Password visibility.
- Light and Dark themes.

Do not rebuild the experimental F03 design laboratory.

Do not create stories for every trivial wrapper.

Keep Storybook isolated from production-only API calls.

## 10. Testing

Preserve existing tests and add focused behavioral coverage for:

- Label association.
- Field descriptions and errors.
- Required validation.
- Keyboard interactions.
- Password visibility.
- Form submission and pending states.
- Server errors.
- Account form dirty-state preservation.
- Session and authentication regression scenarios.
- Accessibility of invalid and focused fields.

Prefer React Testing Library with realistic user interactions.

Test behavior rather than implementation details.

Test-only React components may remain inside test files when appropriate.

## 11. Browser verification

Where possible, check the real Guest Sign In and Sign Up forms in Chrome.

Inspect:

- Desktop and mobile widths.
- Light and Dark themes.
- Keyboard navigation.
- Focus indicators.
- Validation feedback.
- Password show/hide behavior.
- Browser autofill.
- Horizontal overflow.

Authenticated Account and Security forms should be checked when a suitable test session is available.

Do not request the user's real credentials.

If authenticated browser verification is unavailable, use focused component tests and Storybook where possible, and explicitly report the limitation.

Do not block the entire task on browser-profile authentication issues.

## 12. Performance and regression protection

Record the baseline before changes and compare afterward:

- Initial JavaScript gzip.
- Guest Sign In first-route JavaScript.
- Authenticated Account first-route JavaScript.
- CSS gzip.
- New dependencies and chunks.

Avoid making shared form components eagerly load large dependencies on unrelated routes.

Preserve F01 lazy-loading boundaries.

Do not introduce speculative preload mechanisms.

## 13. Explicitly out of scope

Do not implement:

- New authentication features.
- New account settings.
- New learner pages.
- Dashboard functionality.
- Admin functionality.
- A new design system.
- Sidebar or routing changes.
- Theme refactoring.
- React Compiler integration.
- Axios-to-Fetch migration.
- Backend changes.
- Unrelated dependency upgrades.

Do not modify KataKit.

## 14. Verification

Run the relevant existing checks:

- Lint.
- Typecheck.
- Format check.
- Web tests.
- Relevant repository tests.
- Production build.
- Storybook build.

Inspect the final diff for accidental scope expansion and unnecessary abstractions.

## 15. Final report

Provide:

1. Existing forms and components reviewed.
2. Confirmed problems and duplication.
3. Official shadcn components installed or reused.
4. Files created, modified and removed.
5. Final field and password input architecture.
6. React Hook Form integration decisions.
7. Account dirty-state regression findings.
8. Accessibility improvements.
9. Storybook changes.
10. Before/after bundle measurements.
11. Browser verification and limitations.
12. Tests and quality-gate results.
13. Any unresolved risks or justified exceptions.

Explain why every new custom abstraction is necessary.

**Stop after implementation and verification. Do not commit or push.**
