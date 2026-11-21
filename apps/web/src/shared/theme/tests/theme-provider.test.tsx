import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubColorScheme } from '@/test/match-media';
import type { ThemeConfig } from '../theme';
import { ThemeProvider } from '../theme-provider';
import { useTheme } from '../use-theme';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
  storageKey: 'test-theme',
};

const ThemeProbe = () => {
  const { setTheme, theme } = useTheme();
  return (
    <>
      <output aria-label="theme">{theme}</output>
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
});
