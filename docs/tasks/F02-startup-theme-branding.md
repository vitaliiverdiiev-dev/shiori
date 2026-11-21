# F02 — Startup, Theme & Branding Foundation

Follows F01 (routing & application foundation, accepted). Implementation task, not an audit.

## Scope

1. **Static startup shell** in `index.html`, rendered before React from `product.config.json`. Light/dark aware, tiny inline CSS, no JS, fonts or network assets needed. No animation. React takes over the root, with no duplicate loading screens. Sensible behavior without JavaScript or when startup fails. The shell must not pretend that the session check has completed: the four session states (checking, authenticated, unauthenticated, unavailable) stay unchanged. No new auth requests or request waterfalls.
2. **Theme foundation** (`'light' | 'dark' | 'system'`, default system), starting from the official shadcn Vite ThemeProvider:
   - persistent preference, immediate switching, live `prefers-color-scheme` tracking with listener cleanup;
   - correct theme before React with no flash, and one shared algorithm for the inline script and the provider;
   - graceful handling of missing, malformed or inaccessible `localStorage`;
   - `color-scheme` and `theme-color`, cross-tab sync where cheap;
   - Tailwind 4 dark variant checked against the official docs.
3. **Theme selector:** a compact, accessible shadcn ModeToggle adapted to Base UI DropdownMenu. Light/Dark/System with the current choice identifiable, available to guest and signed-in users. Keep the dropdown out of the startup entry chunk.
4. **Logo component:** symbol and symbol+name variants, small size API, correct accessible naming. No product-config import in shared UI; the product identity is bound at the app boundary. Used in the layouts, the home page, the startup shell and the session-checking screen.
5. **Document metadata:** a meaningful title and favicon before React, route titles from F01 preserved, light/dark `theme-color`, no duplicate or conflicting metadata. No metadata library.
6. **Session-checking screen:** minimal, calm, typography-led, consistent with the static shell (modern Japanese minimalism; no gamification, mascots, heavy gradients, decorative cards or complex animation).

## Performance

Record a baseline before changes, then compare the initial entry JS, the guest and authenticated Home first routes, the chunk count, new dependency impact, critical CSS, blocking resources and waterfalls. No preloading of unrelated pages, no localStorage layout prediction, no invented runtime metrics.

## Testing

- **Theme:** default, explicit choices, persistence, invalid or missing storage, system changes, listener cleanup, DOM classes, storage failures, selector interaction and accessibility.
- **Startup and branding:** built HTML shell, title and glyph, initial theme, Logo variants and names, document title, favicon and metadata, no leftover shell.
- **Regression:** existing auth, cache-isolation, lazy-route and error-boundary behavior.

## Out of scope

Full redesign, Bento layouts, new learner navigation, admin Sidebar, AccountMenu redesign (beyond theme access), form refactoring, React Compiler, Axios→fetch, new auth or learning features, PWA, route architecture changes, backend changes, unrelated dependency upgrades.

## Rules

Work on `main`, no branches. Do not commit or push. Stop after implementation and verification.
