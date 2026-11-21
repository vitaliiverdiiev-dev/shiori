import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubColorScheme } from '@/test/match-media';
import { useTheme } from '../../hooks/use-theme';
import type { ThemeConfig } from '../../model/types';
import { ThemeProvider } from '../theme-provider';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
  shortcutStorageKey: 'test-theme-shortcut',
  storageKey: 'test-theme',
};

const ThemeProbe = () => {
  const { setShortcutEnabled, setTheme, shortcutEnabled, theme } = useTheme();
  return (
    <>
      <output aria-label="theme">{theme}</output>
      <input aria-label="Note" />
      <button
        onClick={() => {
          setShortcutEnabled(!shortcutEnabled);
        }}
      >
        {shortcutEnabled ? 'Disable shortcut' : 'Enable shortcut'}
      </button>
      <button
        onClick={() => {
          setTheme('light');
        }}
      >
        Light
      </button>
      <button
        onClick={() => {
          setTheme('dark');
        }}
      >
        Dark
      </button>
      <button
        onClick={() => {
          setTheme('system');
        }}
      >
        System
      </button>
    </>
  );
};

function renderProvider() {
  return render(
    <ThemeProvider config={config}>
      <ThemeProbe />
    </ThemeProvider>,
  );
}

const currentTheme = () => screen.getByRole('status', { name: 'theme' });
const isDark = () => document.documentElement.classList.contains('dark');

describe('ThemeProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('follows the system by default', () => {
    stubColorScheme(true);
    renderProvider();

    expect(currentTheme()).toHaveTextContent('system');
    expect(isDark()).toBe(true);
  });

  it('applies and remembers an explicit choice across remounts', async () => {
    const { unmount } = renderProvider();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(isDark()).toBe(true);
    expect(localStorage.getItem(config.storageKey)).toBe('dark');

    unmount();
    renderProvider();
    expect(currentTheme()).toHaveTextContent('dark');
    expect(isDark()).toBe(true);
  });

  it('ignores a malformed stored value', () => {
    localStorage.setItem(config.storageKey, 'sepia');
    renderProvider();

    expect(currentTheme()).toHaveTextContent('system');
  });

  it('tracks system changes only while System is selected and cleans up', async () => {
    const colorScheme = stubColorScheme(false);
    const { unmount } = renderProvider();
    const user = userEvent.setup();

    expect(colorScheme.listenerCount()).toBe(1);
    act(() => {
      colorScheme.setPrefersDark(true);
    });
    expect(isDark()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(colorScheme.listenerCount()).toBe(0);
    act(() => {
      colorScheme.setPrefersDark(false);
      colorScheme.setPrefersDark(true);
    });
    expect(isDark()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(isDark()).toBe(true);
    expect(localStorage.getItem(config.storageKey)).toBeNull();

    unmount();
    expect(colorScheme.listenerCount()).toBe(0);
  });

  it('follows a choice made in another tab', () => {
    renderProvider();

    act(() => {
      localStorage.setItem(config.storageKey, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: config.storageKey }),
      );
    });

    expect(currentTheme()).toHaveTextContent('dark');
    expect(isDark()).toBe(true);
  });

  it('keeps the choice for this visit when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    renderProvider();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Dark' }));

    expect(currentTheme()).toHaveTextContent('dark');
    expect(isDark()).toBe(true);
  });

  it('requires a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<ThemeProbe />)).toThrow(
      'useTheme must be used inside ThemeProvider',
    );
  });

  describe('D shortcut', () => {
    it('switches between Light and Dark', async () => {
      localStorage.setItem(config.storageKey, 'dark');
      renderProvider();
      const user = userEvent.setup();

      await user.keyboard('d');
      expect(currentTheme()).toHaveTextContent('light');
      expect(isDark()).toBe(false);
      expect(localStorage.getItem(config.storageKey)).toBe('light');

      await user.keyboard('d');
      expect(currentTheme()).toHaveTextContent('dark');
    });

    it.each([
      [false, 'dark'],
      [true, 'light'],
    ])(
      'leaves System for the opposite of the resolved theme (system dark: %s)',
      async (prefersDark, expected) => {
        stubColorScheme(prefersDark);
        renderProvider();
        const user = userEvent.setup();

        await user.keyboard('d');

        expect(currentTheme()).toHaveTextContent(expected);
      },
    );

    it('ignores typing in a text field and a held key', async () => {
      renderProvider();
      const user = userEvent.setup();

      await user.type(screen.getByRole('textbox', { name: 'Note' }), 'dd');
      expect(currentTheme()).toHaveTextContent('system');

      await user.click(document.body);
      await user.keyboard('{d>2/}');
      expect(currentTheme()).toHaveTextContent('dark');
    });

    it('can be turned off, and stays off after a reload', async () => {
      const { unmount } = renderProvider();
      const user = userEvent.setup();

      await user.click(
        screen.getByRole('button', { name: 'Disable shortcut' }),
      );
      await user.keyboard('d');
      expect(currentTheme()).toHaveTextContent('system');
      expect(localStorage.getItem(config.shortcutStorageKey)).toBe('off');

      unmount();
      renderProvider();
      await user.keyboard('d');
      expect(currentTheme()).toHaveTextContent('system');

      await user.click(screen.getByRole('button', { name: 'Enable shortcut' }));
      await user.keyboard('d');
      expect(currentTheme()).toHaveTextContent('dark');
    });

    it('stops listening after unmount', async () => {
      const { unmount } = renderProvider();
      const user = userEvent.setup();

      unmount();
      await user.keyboard('d');

      expect(localStorage.getItem(config.storageKey)).toBeNull();
    });
  });
});
