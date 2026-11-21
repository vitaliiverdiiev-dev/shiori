export type Theme = 'dark' | 'light' | 'system';

export type ThemeConfig = {
  colors: { dark: string; light: string };
  storageKey: string;
};

export const themes: readonly Theme[] = ['light', 'dark', 'system'];

export const themeLabels = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
} as const satisfies Record<Theme, string>;

export function applyThemePreference(theme: Theme, config: ThemeConfig): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? config.colors.dark : config.colors.light);
}

export function createThemeScript(config: ThemeConfig): string {
  // INVARIANT: readThemePreference and applyThemePreference are serialised into the inline startup script; they must use only their parameters and browser globals.
  const json = (value: unknown) =>
    JSON.stringify(value).replaceAll('<', '\\u003c');
  return `(${applyThemePreference.toString()})((${readThemePreference.toString()})(${json(config.storageKey)}),${json(config)});`;
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readThemePreference(storageKey: string): Theme {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemePreference(storageKey: string, theme: Theme): void {
  try {
    if (theme === 'system') window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, theme);
  } catch {
    return;
  }
}
