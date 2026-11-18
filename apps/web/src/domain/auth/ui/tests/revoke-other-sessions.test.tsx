import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { stubApi, unreachable } from '@/test/api-stub';
import { renderWithProviders } from '@/test/render';

const REVOKE = 'POST /api/auth/revoke-other-sessions';

async function renderAction() {
  vi.resetModules();
  const { RevokeOtherSessions } = await import('../revoke-other-sessions');
  return renderWithProviders(<RevokeOtherSessions />);
}

describe('RevokeOtherSessions', () => {
  it('signs out other devices on request', async () => {
    const revoke = vi.fn(() => Response.json({ status: true }));
    stubApi({ [REVOKE]: revoke });
    const { user } = await renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Sign out other devices' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Other devices have been signed out.',
    );
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('reports a network failure and allows another attempt', async () => {
    stubApi({ [REVOKE]: unreachable });
    const { user } = await renderAction();

    await user.click(
      screen.getByRole('button', { name: 'Sign out other devices' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Shiori could not be reached.',
    );
    expect(
      screen.getByRole('button', { name: 'Sign out other devices' }),
    ).toBeEnabled();
  });
});
