import type { ThemeConfig } from '../shared/theme/model/types.ts';

// INVARIANT: The colours equal the --background tokens in app/styles/index.css (light oklch(1 0 0), dark oklch(0.145 0 0)); browsers use them for the theme-color chrome.
export const themeConfig: ThemeConfig = {
  colors: { dark: '#0a0a0a', light: '#ffffff' },
  shortcutStorageKey: 'theme-shortcut',
  storageKey: 'theme',
};
