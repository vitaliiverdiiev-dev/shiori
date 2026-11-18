import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { registrationMode, server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';
import { SignUpLink } from '../sign-up-link';

describe('SignUpLink', () => {
  it('offers account creation in invite mode', async () => {
    server.use(registrationMode('invite'));
    renderWithProviders(<SignUpLink />);

    expect(
      await screen.findByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/sign-up');
  });

  it.each([
    ['registration is closed', registrationMode('closed')],
    [
      'the mode cannot be loaded',
      http.get('*/api/registration', () => HttpResponse.error()),
    ],
  ])('stays hidden when %s', async (_case, handler) => {
    let requested = false;
    server.use(handler);
    server.events.on('request:end', () => {
      requested = true;
    });
    renderWithProviders(<SignUpLink />);

    await expect.poll(() => requested).toBe(true);
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
