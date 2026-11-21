import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ThemeConfig } from '../../model/types';
import { ThemeControl } from '../theme-control';
import { ThemeProvider } from '../theme-provider';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
  shortcutStorageKey: 'test-theme-shortcut',
  storageKey: 'test-theme',
};

function renderControl() {
  return render(
    <ThemeProvider config={config}>
      <ThemeControl />
    </ThemeProvider>,
  );
}

describe('ThemeControl', () => {
  it('names the current theme on a compact trigger', () => {
    renderControl();

    const trigger = screen.getByRole('button', { name: 'Theme: System' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('offers Light, Dark and System and marks the current choice', async () => {
    renderControl();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Theme: System' }));

    const menu = await screen.findByRole('menu');
    const options = within(menu).getAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
    expect(
      within(menu).getByRole('menuitemradio', { name: 'System' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('switches the theme from the menu', async () => {
    renderControl();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Theme: System' }));
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Dark' }),
    );

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(config.storageKey)).toBe('dark');
    expect(
      await screen.findByRole('button', { name: 'Theme: Dark' }),
    ).toBeVisible();
  });

  it('works from the keyboard', async () => {
    renderControl();
    const user = userEvent.setup();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Theme: System' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    const light = screen.getByRole('menuitemradio', { name: 'Light' });
    light.focus();
    await user.keyboard('{Enter}');

    expect(localStorage.getItem(config.storageKey)).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('does not switch the theme when D is typed inside the open menu', async () => {
    renderControl();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Theme: System' }));
    const menu = await screen.findByRole('menu');
    await waitFor(() => {
      expect(menu.contains(document.activeElement)).toBe(true);
    });
    await user.keyboard('d');

    expect(localStorage.getItem(config.storageKey)).toBeNull();
    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('shows the D shortcut and lets the user turn it off', async () => {
    renderControl();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Theme: System' }));
    const shortcut = await screen.findByRole('menuitemcheckbox', {
      name: 'Switch with D key',
    });
    expect(shortcut).toHaveAttribute('aria-checked', 'true');

    await user.click(shortcut);
    expect(shortcut).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem(config.shortcutStorageKey)).toBe('off');

    await user.keyboard('{Escape}');
    await user.keyboard('d');
    expect(localStorage.getItem(config.storageKey)).toBeNull();
    expect(screen.getByRole('button', { name: 'Theme: System' })).toBeVisible();
  });
});
