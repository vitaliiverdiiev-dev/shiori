import type { ThemeConfig } from '../shared/theme/model/types.ts';

// INVARIANT: The colours equal the --background tokens in app/styles/index.css (light oklch(1 0 0), dark oklch(0.147 0.004 49.25)); browsers use them for the theme-color chrome.
export const themeConfig: ThemeConfig = {
  colors: { dark: '#0c0a09', light: '#ffffff' },
  shortcutStorageKey: 'theme-shortcut',
  storageKey: 'theme',
};
