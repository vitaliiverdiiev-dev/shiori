export type ResolvedTheme = 'dark' | 'light';

export type Theme = 'system' | ResolvedTheme;

export type ThemeConfig = {
  colors: Record<ResolvedTheme, string>;
  shortcutStorageKey: string;
  storageKey: string;
};
