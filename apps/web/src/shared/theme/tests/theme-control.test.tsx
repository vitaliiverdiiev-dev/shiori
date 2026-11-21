import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ThemeConfig } from '../theme';
import { ThemeControl } from '../theme-control';
import { ThemeProvider } from '../theme-provider';

const config: ThemeConfig = {
  colors: { dark: '#000000', light: '#ffffff' },
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
});
