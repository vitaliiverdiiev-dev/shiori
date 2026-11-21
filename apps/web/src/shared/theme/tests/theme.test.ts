import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubColorScheme } from '@/test/match-media';
import {
  applyThemePreference,
  createThemeScript,
  readThemePreference,
  type ThemeConfig,
  writeThemePreference,
} from '../theme';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
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

  it.each([
    ['dark', false, true],
    ['light', true, false],
    [null, true, true],
    ['broken', false, false],
  ])(
    'applies stored %s (system dark: %s) before the app loads',
    (stored, prefersDark, dark) => {
      addThemeColorMeta();
      if (stored !== null) localStorage.setItem(config.storageKey, stored);
      runScript(
        `window.matchMedia = () => ({ matches: ${String(prefersDark)} });`,
      );

      runScript(createThemeScript(config));

      expect(root.classList.contains('dark')).toBe(dark);
      expect(root.style.colorScheme).toBe(dark ? 'dark' : 'light');
      expect(themeColor()).toBe(dark ? '#000000' : '#ffffff');
    },
  );

  it('cannot break out of the inline script element', () => {
    const script = createThemeScript({
      ...config,
      storageKey: '</script><script>alert(1)</script>',
    });

    expect(script).not.toContain('</script>');
  });
});
