# 04 — Shiori Design System & Mobile-first UX

**Non-negotiable for M00:** shadcn/ui **Base UI** implementation, Tailwind CSS v4, semantic CSS tokens, Storybook, and one actual reusable Button with basic stories. This is not a generic Tailwind-only scaffold.

## UI ownership

- Use **shadcn/ui generated source** (Base UI-based where applicable) as the project's reusable component primitives. The generated code lives in the app and is editable; never hand-copy random controls to bypass the shared primitives.
- Configure `components.json` for the Vite web app, correct aliases, CSS-variable theming, `rsc: false`.
- Initialize the shadcn CLI **for Base UI**, not Radix, and verify the generated setup. CLI syntax currently supports `pnpm dlx shadcn@latest init -b base -c apps/web` when run from the monorepo root; check its options at implementation time. Use the workspace package runner (pnpm).
- Components are added **on demand**. M00 installs only Button, not dozens of default components.
- Every new shared component must have a simple well-defined API, accessible states, and relevant Storybook stories/tests. Application-specific wrappers (e.g. Japanese IME answer input) can compose a shared `Input` without bloating its generic variants.
- One source for visual primitives: styles are driven by semantic theme tokens; consumers should not hardcode arbitrary brand hex colors.

## Product identity (M00)

Render **Shiori**, **日本語の栞**, **Your Guide to Japanese**, and the **栞** glyph, all sourced from `product.config.json`. The glyph itself serves as the first brand mark; no generated illustration or complex logo system is necessary. Ensure the chosen font can display the kanji reliably. Use a generic HTML title fallback if required, and set the user-visible document title from the config. Do not scatter brand text across UI files.

## Theme tokens

Define light and dark modes with semantic variables (e.g. `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--border`, `--ring`, `--radius`) and Tailwind v4 `@theme inline` mappings where appropriate. Support typography and radius scales. Preserve shadcn's necessary tokens and states; do not invent a second contradictory token system.

Example concept (not a complete CSS stylesheet):

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.18 0 0);
  --radius: 0.625rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

A theme file changes colors, radii, typography, and related visual values—not the entire structure or behavior of UI components. Avoid adding a theme editor to M00.

## Storybook from the beginning

- Storybook configured for React + Vite in `apps/web`; ensure project CSS/tokens load in stories.
- Add `Button.stories.tsx` and demonstrate at least default, secondary/outline, and disabled states (as supported by generated variant API).
- Test meaningful behavior/accessibility as components evolve; do not require an artificial number of stories.
- Storybook is a **development tool**; it is not a standalone design-system server in production.

## Mobile-first, native-like web behavior

- Start at narrow phone widths. Layout should feel built for touch: clear hierarchy, readable type, comfortable touch targets, safe-area-aware spacing when needed, correct keyboard/focus behavior.
- Desktop may add panels, density and keyboard shortcuts without changing underlying app logic.
- Do **not** solve mobile layout solely by shrinking desktop components. A desktop table can be cards/lists on phone.
- First M00 page should show the Shiori identity, carefully styled for small screens, and a real reusable button (e.g. retry API health). Do not scaffold a full product navigation shell.
- Future Expo app should match intent/tokens and main interactions, but may use platform-specific components. shadcn HTML/DOM components are not React Native components.

## Future generic components — **not** for M00

- Input/form primitives, Select, Dialog/Drawer, Sonner toaster.
- Config-driven `DataTable` built around TanStack Table; table config + engine + view separated once real table needs exist. Support future sorting/pinning/resizing/visibility/order/persisted settings incrementally, not as unused config fields.
- `Filters<T>` independent of table and routing, typed values, optional URL adapter; pagination independent and composable.
- Modal registry/host potentially Zustand + lazy loading, but strict modal-id → payload typing, explicit success/cancel/dismiss, no async open/close races. Local dialogs remain local when simpler.

## References

- https://ui.shadcn.com/docs/cli
- https://ui.shadcn.com/docs/installation/vite
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://tailwindcss.com/docs/theme/
- https://storybook.js.org/docs/get-started/frameworks/react-vite/
