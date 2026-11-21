import type { Theme } from './types.ts';

export const themes: readonly Theme[] = ['light', 'dark', 'system'];

export const themeLabels = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
} as const satisfies Record<Theme, string>;

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export const THEME_SHORTCUT_KEY = 'd';
