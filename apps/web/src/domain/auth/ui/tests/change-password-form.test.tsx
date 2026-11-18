import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sessionResponse, stubApi } from '@/test/api-stub';
import { renderWithProviders } from '@/test/render';

const SESSION = '/api/auth/get-session';
const CHANGE = 'POST /api/auth/change-password';
const CURRENT = 'old but long passphrase';
const NEXT = 'ひらがな と カタカナ を まなぶ';
const session = () => sessionResponse({ id: 'alice', name: 'Alice' });

async function fill(
  user: ReturnType<typeof renderWithProviders>['user'],
  confirm = NEXT,
) {
  await user.type(screen.getByLabelText('Current password'), CURRENT);
  await user.type(screen.getByLabelText('New password'), NEXT);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Change password' }));
}

async function renderForm() {
  vi.resetModules();
  const { ChangePasswordForm } = await import('../change-password-form');
  return renderWithProviders(<ChangePasswordForm />);
}

describe('ChangePasswordForm', () => {
  it('changes the password, revokes other sessions and clears the fields', async () => {
    const change = vi.fn<(body: unknown) => Response>(() =>
      Response.json({ token: 'new' }),
    );
    stubApi({ [CHANGE]: change, [SESSION]: session });
    const { user } = await renderForm();

    await fill(user);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Password changed. Other devices have been signed out.',
    );
    expect(change).toHaveBeenCalledWith({
      currentPassword: CURRENT,
      newPassword: NEXT,
      revokeOtherSessions: true,
    });
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('explains an incorrect current password', async () => {
    stubApi({
      [CHANGE]: () =>
        Response.json(
          { code: 'INVALID_PASSWORD', message: 'Invalid password' },
          { status: 400 },
        ),
      [SESSION]: session,
    });
    const { user } = await renderForm();

    await fill(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Current password is incorrect.',
    );
  });

  it('requires the confirmation to match before sending', async () => {
    const change = vi.fn(() => Response.json({}));
    stubApi({ [CHANGE]: change, [SESSION]: session });
    const { user } = await renderForm();

    await fill(user, `${NEXT}!`);

    expect(
      screen.getByLabelText('Confirm new password'),
    ).toHaveAccessibleDescription('Passwords do not match.');
    expect(change).not.toHaveBeenCalled();
  });
});
