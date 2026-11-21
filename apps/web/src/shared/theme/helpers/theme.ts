import { DARK_SCHEME_QUERY, THEME_SHORTCUT_KEY } from '../model/consts.ts';
import type { ResolvedTheme, Theme, ThemeConfig } from '../model/types.ts';

const SHORTCUT_IGNORED_TARGETS = [
  'input',
  'select',
  'textarea',
  '[contenteditable]:not([contenteditable="false"])',
  ...[
    'alertdialog',
    'combobox',
    'dialog',
    'listbox',
    'menu',
    'menubar',
    'searchbox',
    'slider',
    'spinbutton',
    'textbox',
  ].map((role) => `[role="${role}"]`),
].join(',');

export function applyThemePreference(theme: Theme, config: ThemeConfig): void {
  const dark = resolveTheme(theme) === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? config.colors.dark : config.colors.light);
}

export function createThemeScript({ colors, storageKey }: ThemeConfig): string {
  const json = (value: string) =>
    JSON.stringify(value).replaceAll('<', '\\u003c');
  // INVARIANT: The script must apply what readThemePreference + applyThemePreference apply; the createThemeScript tests compare both on the same inputs.
  return [
    '(function(){',
    `var t;try{t=localStorage.getItem(${json(storageKey)})}catch(e){}`,
    `var d=t==='dark'||(t!=='light'&&matchMedia('${DARK_SCHEME_QUERY}').matches);`,
    "var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';",
    `var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?${json(colors.dark)}:${json(colors.light)});`,
    '})();',
  ].join('');
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function isThemeShortcut(event: KeyboardEvent): boolean {
  if (event.repeat || event.isComposing || event.defaultPrevented) return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false;
  }
  if (event.key.toLowerCase() !== THEME_SHORTCUT_KEY) return false;
  return !(
    event.target instanceof Element &&
    event.target.closest(SHORTCUT_IGNORED_TARGETS)
  );
}

export function readShortcutEnabled(storageKey: string): boolean {
  return readStorage(storageKey) !== 'off';
}

function readStorage(key: string): null | string {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readThemePreference(storageKey: string): Theme {
  const stored = readStorage(storageKey);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme;
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light';
}

export function writeShortcutEnabled(
  storageKey: string,
  enabled: boolean,
): void {
  writeStorage(storageKey, enabled ? null : 'off');
}

function writeStorage(key: string, value: null | string): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function writeThemePreference(storageKey: string, theme: Theme): void {
  writeStorage(storageKey, theme === 'system' ? null : theme);
}
