# F01 — Routing & Application Foundation

Follows the frontend architecture audit (21 Nov 2026). The project owner approved the architectural direction.

## Scope

1. A type-safe route registry.
2. Navigation metadata derived from route definitions.
3. Lazy-loaded pages and layouts.
4. React Suspense boundaries.
5. Reliable error boundaries and recovery.
6. Clean `AppProviders` composition.
7. Simplification of the application entrypoint.

## Requirements

### Routing

- Preserve React Router 7 Declarative Mode.
- One predictable source of truth for route metadata: route IDs, paths, titles, access requirements, layout assignment and optional navigation metadata.
- Derive navigation from route definitions; do not duplicate route paths across layouts.
- Preserve domain ownership of authentication-specific constants where appropriate.
- Strong TypeScript typing, no `any` or unsafe assertions. No generic routing framework. No future admin routes or features.

### Lazy loading

- `React.lazy` and Suspense per current official documentation. Lazy-load page components, and layouts where it meaningfully reduces initial JavaScript.
- Keep the initial application shell minimal; avoid eager page imports through barrel exports; do not preload unrelated page bundles; no localStorage-based layout prediction.
- Preserve existing session and access-control behavior.

### Error recovery

- Error boundaries for lazy-import failures and rendering errors, with accessible, understandable recovery actions and no infinite reload loops.
- Preserve the existing API-unavailable and session-expired behavior. Prefer existing library capabilities when justified.

### Providers

- A simple, explicit `AppProviders` composition and a clean entrypoint.
- Preserve QueryClient initialization and private-cache isolation. No unused providers, dependency injection, provider factories or unnecessary adapters.

### Performance

Record the production build size before implementation. Afterwards compare initial JS gzip size, number and size of chunks, guest initial route, authenticated initial route, and whether unused pages stay outside the initial dependency graph. Do not invent runtime metrics.

### Testing

Preserve all existing functionality and tests. Add or update behavioral tests for guest navigation, protected navigation, session checking and recovery, session expiration, user changes and cache isolation, lazy-loading fallback, route access requirements, error boundaries and recovery, and navigation metadata consistency.

### Design restrictions

No UI redesign in this phase. The future direction (modern Japanese minimalism, selective minimalist Bento layouts; no gamification, streaks, achievements, mascots or decorative assistants) is handled separately through Storybook.

### Engineering standards

KataKit frontend architecture, current stable React 19 and React Router documentation, `app → pages → domain → shared`, library-first, strict TypeScript, named exports, cohesive transferable modules. No backend changes, no unrelated dependency updates.

## Execution

Implement incrementally, verify each logical change, run lint, TypeScript, tests and build, review the diff for scope expansion. Do not commit or push. Stop after implementation and verification for independent review.
