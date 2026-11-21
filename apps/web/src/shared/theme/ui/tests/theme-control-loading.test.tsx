import type { ComponentType } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThemeConfig } from '../../model/types';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
  shortcutStorageKey: 'test-theme-shortcut',
  storageKey: 'test-theme',
};

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
}

async function renderWithPendingMenu() {
  vi.resetModules();
  const menuChunk = deferred<ComponentType>();
  const load = vi.fn(() => menuChunk.promise);
  vi.doMock('../theme-menu-loader', async () => {
    const { lazyComponent } = await import('@/shared/helpers/lazy-component');
    return { LazyThemeMenu: lazyComponent(load), loadThemeMenu: load };
  });
  const [{ ThemeControl }, { ThemeProvider }, { ThemeMenu }] =
    await Promise.all([
      import('../theme-control'),
      import('../theme-provider'),
      import('../theme-menu'),
    ]);
  render(
    <ThemeProvider config={config}>
      <ThemeControl />
    </ThemeProvider>,
  );
  return {
    failToLoad: () =>
      act(async () => {
        menuChunk.reject(new Error('offline'));
        await menuChunk.promise.catch(() => undefined);
      }),
    finishLoading: () =>
      act(async () => {
        menuChunk.resolve(ThemeMenu);
        await menuChunk.promise;
      }),
    load,
  };
}

const trigger = (name = 'Theme: System') =>
  screen.getByRole('button', { name });

describe('ThemeControl while the menu chunk loads', () => {
  afterEach(() => {
    vi.doUnmock('../theme-menu-loader');
    vi.restoreAllMocks();
  });

  it('keeps focus on the trigger and ignores D until the menu has focus', async () => {
    const menu = await renderWithPendingMenu();
    const user = userEvent.setup();

    await user.tab();
    await user.keyboard('{Enter}');
    expect(menu.load).toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute('aria-busy', 'true');

    await user.keyboard('d');
    expect(localStorage.getItem(config.storageKey)).toBeNull();
    expect(trigger()).toHaveFocus();

    await menu.finishLoading();
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(document.body).not.toHaveFocus();
    await user.keyboard('d');
    expect(localStorage.getItem(config.storageKey)).toBeNull();

    await waitFor(() => {
      expect(screen.getByRole('menu').contains(document.activeElement)).toBe(
        true,
      );
    });
  });

  it('selects from the keyboard, restores focus on close, and reopens from cache', async () => {
    const menu = await renderWithPendingMenu();
    const user = userEvent.setup();

    await user.click(trigger());
    await menu.finishLoading();
    await screen.findByRole('menu');
    screen.getByRole('menuitemradio', { name: 'Dark' }).focus();
    await user.keyboard('{Enter}');
    expect(localStorage.getItem(config.storageKey)).toBe('dark');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    expect(trigger('Theme: Dark')).toHaveFocus();
    expect(trigger('Theme: Dark')).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('d');
    expect(localStorage.getItem(config.storageKey)).toBe('light');

    await user.click(trigger('Theme: Light'));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(trigger('Theme: Light')).not.toHaveAttribute('aria-busy');
  });

  it('falls back to a disabled trigger when the chunk fails, and the shortcut keeps working', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const menu = await renderWithPendingMenu();
    const user = userEvent.setup();

    await user.click(trigger());
    await menu.failToLoad();

    expect(trigger()).toBeDisabled();
    expect(trigger()).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.keyboard('d');
    expect(localStorage.getItem(config.storageKey)).toBe('dark');
  });
});
