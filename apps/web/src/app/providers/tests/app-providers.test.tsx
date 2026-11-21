import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../app-providers';

describe('AppProviders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces a crashed application with a recoverable error screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldFail = true;
    const Shell = () => {
      if (shouldFail) throw new Error('shell failed');
      return <h1>Shell</h1>;
    };
    render(
      <AppProviders>
        <Shell />
      </AppProviders>,
    );
    const user = userEvent.setup();

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('heading', { name: 'Shell' })).toBeVisible();
  });
});
