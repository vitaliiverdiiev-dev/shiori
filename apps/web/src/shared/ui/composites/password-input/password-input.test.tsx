import type { SyntheticEvent } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordInput } from './password-input';

function renderInForm() {
  const onSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
  });
  render(
    <form onSubmit={onSubmit}>
      <label htmlFor="password">New password</label>
      <PasswordInput fieldLabel="New password" id="password" />
    </form>,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('PasswordInput', () => {
  it('reveals and hides the value without submitting or losing it', async () => {
    const { onSubmit, user } = renderInForm();
    const input = screen.getByLabelText('New password');

    await user.type(input, 'まなぶ ことは たのしい');
    const show = screen.getByRole('button', { name: 'Show new password' });
    expect(show).toHaveAttribute('aria-controls', 'password');

    await user.click(show);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('まなぶ ことは たのしい');
    expect(
      screen.getByRole('button', { name: 'Hide new password' }),
    ).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Hide new password' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('toggles from the keyboard and keeps focus on the toggle', async () => {
    const { onSubmit, user } = renderInForm();

    await user.click(screen.getByLabelText('New password'));
    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByLabelText('New password')).toHaveAttribute(
      'type',
      'text',
    );
    const hide = screen.getByRole('button', { name: 'Hide new password' });
    expect(hide).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByLabelText('New password')).toHaveAttribute(
      'type',
      'password',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('turns off text correction for the password value', () => {
    renderInForm();
    const input = screen.getByLabelText('New password');

    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });
});
