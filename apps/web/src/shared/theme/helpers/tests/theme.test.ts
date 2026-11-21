import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubColorScheme } from '@/test/match-media';
import type { ThemeConfig } from '../../model/types';
import {
  applyThemePreference,
  createThemeScript,
  isThemeShortcut,
  readShortcutEnabled,
  readThemePreference,
  resolveTheme,
  writeShortcutEnabled,
  writeThemePreference,
} from '../theme';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
  shortcutStorageKey: 'test-theme-shortcut',
  storageKey: 'test-theme',
};

const root = document.documentElement;
const themeColor = () =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

function addThemeColorMeta() {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.append(meta);
}

function storageThatThrows() {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const node of document.head.querySelectorAll(
    'meta[name="theme-color"], script',
  )) {
    node.remove();
  }
});

describe('readThemePreference', () => {
  it.each([
    [null, 'system'],
    ['light', 'light'],
    ['dark', 'dark'],
    ['system', 'system'],
    ['purple', 'system'],
    ['"dark"', 'system'],
  ])('reads stored %s as %s', (stored, expected) => {
    if (stored !== null) localStorage.setItem(config.storageKey, stored);
    expect(readThemePreference(config.storageKey)).toBe(expected);
  });

  it('falls back to system when storage is inaccessible', () => {
    storageThatThrows();
    expect(readThemePreference(config.storageKey)).toBe('system');
  });
});

describe('writeThemePreference', () => {
  it('stores an explicit choice and clears the key for system', () => {
    writeThemePreference(config.storageKey, 'dark');
    expect(localStorage.getItem(config.storageKey)).toBe('dark');

    writeThemePreference(config.storageKey, 'system');
    expect(localStorage.getItem(config.storageKey)).toBeNull();
  });

  it('does not throw when storage is inaccessible', () => {
    storageThatThrows();
    expect(() => {
      writeThemePreference(config.storageKey, 'dark');
    }).not.toThrow();
  });
});

describe('shortcut preference', () => {
  it('is enabled by default and remembers being turned off', () => {
    expect(readShortcutEnabled(config.shortcutStorageKey)).toBe(true);

    writeShortcutEnabled(config.shortcutStorageKey, false);
    expect(readShortcutEnabled(config.shortcutStorageKey)).toBe(false);

    writeShortcutEnabled(config.shortcutStorageKey, true);
    expect(localStorage.getItem(config.shortcutStorageKey)).toBeNull();
  });

  it('stays enabled and does not throw when storage is inaccessible', () => {
    storageThatThrows();
    expect(() => {
      writeShortcutEnabled(config.shortcutStorageKey, false);
    }).not.toThrow();
    expect(readShortcutEnabled(config.shortcutStorageKey)).toBe(true);
  });
});

describe('resolveTheme', () => {
  it.each([
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)(
    'resolves %s (system dark: %s) to %s',
    (theme, prefersDark, resolved) => {
      stubColorScheme(prefersDark);
      expect(resolveTheme(theme)).toBe(resolved);
    },
  );
});

describe('applyThemePreference', () => {
  it.each([
    ['light', false, false],
    ['light', true, false],
    ['dark', false, true],
    ['system', false, false],
    ['system', true, true],
  ] as const)(
    'applies %s with a dark system preference of %s',
    (theme, prefersDark, dark) => {
      stubColorScheme(prefersDark);
      addThemeColorMeta();

      applyThemePreference(theme, config);

      expect(root.classList.contains('dark')).toBe(dark);
      expect(root.style.colorScheme).toBe(dark ? 'dark' : 'light');
      expect(themeColor()).toBe(dark ? '#000000' : '#ffffff');
    },
  );
});

describe('createThemeScript', () => {
  function runScript(script: string) {
    const element = document.createElement('script');
    element.textContent = script;
    document.head.append(element);
  }

  const appliedTheme = () => ({
    colorScheme: root.style.colorScheme,
    dark: root.classList.contains('dark'),
    themeColor: themeColor(),
  });

  it.each([
    ['dark', false, true],
    ['light', true, false],
    ['system', true, true],
    [null, true, true],
    [null, false, false],
    ['broken', false, false],
  ])(
    'applies stored %s (system dark: %s) before the app loads, as the runtime helpers do',
    (stored, prefersDark, dark) => {
      addThemeColorMeta();
      if (stored !== null) localStorage.setItem(config.storageKey, stored);
      runScript(
        `window.matchMedia = () => ({ matches: ${String(prefersDark)} });`,
      );

      runScript(createThemeScript(config));
      const fromScript = appliedTheme();

      root.classList.remove('dark');
      root.style.colorScheme = '';
      stubColorScheme(prefersDark);
      applyThemePreference(readThemePreference(config.storageKey), config);

      expect(fromScript).toEqual({
        colorScheme: dark ? 'dark' : 'light',
        dark,
        themeColor: dark ? '#000000' : '#ffffff',
      });
      expect(appliedTheme()).toEqual(fromScript);
    },
  );

  it('still applies a theme when storage is inaccessible', () => {
    storageThatThrows();
    runScript('window.matchMedia = () => ({ matches: true });');

    runScript(createThemeScript(config));

    expect(root.classList.contains('dark')).toBe(true);
  });

  it('cannot break out of the inline script element', () => {
    const script = createThemeScript({
      ...config,
      colors: { dark: '</script><script>alert(1)</script>', light: '#fff' },
      storageKey: '</script><script>alert(1)</script>',
    });

    expect(script).not.toContain('</script>');
  });
});

describe('isThemeShortcut', () => {
  function keydown(
    init: KeyboardEventInit,
    target: EventTarget = document.body,
  ) {
    let matched: boolean | undefined;
    const listener = (event: KeyboardEvent) => {
      matched = isThemeShortcut(event);
    };
    document.addEventListener('keydown', listener);
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
    document.removeEventListener('keydown', listener);
    return matched;
  }

  function inside(html: string) {
    document.body.innerHTML = html;
    const target = document.querySelector('[data-target]');
    if (!target) throw new Error('fixture needs a [data-target]');
    return target;
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    ['d', {}],
    ['D with Caps Lock', { key: 'D' }],
  ])('accepts %s outside editable controls', (_, init) => {
    expect(keydown({ key: 'd', ...init })).toBe(true);
    expect(
      keydown(
        { key: 'd', ...init },
        inside('<button data-target>Save</button>'),
      ),
    ).toBe(true);
  });

  it.each([
    ['another key', { key: 'e' }],
    ['Shift+D', { key: 'D', shiftKey: true }],
    ['Ctrl+D', { ctrlKey: true }],
    ['Cmd+D', { metaKey: true }],
    ['Alt+D', { altKey: true }],
    ['a repeated keydown', { repeat: true }],
    ['IME composition', { isComposing: true }],
  ])('ignores %s', (_, init) => {
    expect(keydown({ key: 'd', ...init })).toBe(false);
  });

  it.each([
    '<input data-target />',
    '<textarea data-target></textarea>',
    '<select data-target></select>',
    '<div contenteditable="true"><p data-target>Text</p></div>',
    '<div role="textbox" data-target></div>',
    '<div role="combobox" data-target></div>',
    '<div role="menu"><div role="menuitemradio" data-target>Dark</div></div>',
    '<div role="dialog"><button data-target>Close</button></div>',
  ])('ignores keys typed in %s', (html) => {
    expect(keydown({ key: 'd' }, inside(html))).toBe(false);
  });

  it('ignores a key another handler already handled', () => {
    const target = inside('<button data-target>Save</button>');
    target.addEventListener('keydown', (event) => {
      event.preventDefault();
    });

    expect(keydown({ key: 'd' }, target)).toBe(false);
  });
});
