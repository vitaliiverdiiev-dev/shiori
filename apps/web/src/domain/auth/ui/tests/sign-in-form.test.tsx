import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubApi, unreachable } from '@/test/api-stub';
import { renderWithProviders } from '@/test/render';

const SIGN_IN = 'POST /api/auth/sign-in/email';

async function renderForm() {
  vi.resetModules();
  const { SignInForm } = await import('../sign-in-form');
  return renderWithProviders(<SignInForm />);
}

describe('SignInForm', () => {
  beforeEach(() => {
    stubApi({});
  });

  it('explains that a previous session ended when sent here after sign-out', async () => {
    vi.resetModules();
    const { SignInForm } = await import('../sign-in-form');
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/sign-in', state: { signedOut: true } }]}
      >
        <SignInForm />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'You have been signed out. Sign in again to continue.',
    );
  });

  it('shows no sign-out notice on a direct visit', async () => {
    await renderForm();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('supports password managers with standard autocomplete fields', async () => {
    await renderForm();

    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'autocomplete',
      'username',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });

  it('flags empty fields, describes the errors and focuses the first one', async () => {
    const signIn = vi.fn(() => Response.json({}));
    stubApi({ [SIGN_IN]: signIn });
    const { user } = await renderForm();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const email = screen.getByLabelText('Email');
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter your email address.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Enter your password.',
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it('submits from the keyboard with the password exactly as typed', async () => {
    const signIn = vi.fn<(body: unknown) => Response>(() =>
      Response.json({ redirect: false }),
    );
    stubApi({ [SIGN_IN]: signIn });
    const { user } = await renderForm();

    await user.type(screen.getByLabelText('Email'), '  alice@example.test ');
    await user.type(
      screen.getByLabelText('Password'),
      ' わたしの ひみつ 🔑 passphrase {enter}',
    );

    await vi.waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.test',
          password: ' わたしの ひみつ 🔑 passphrase ',
        }),
      );
    });
  });

  it('keeps the button disabled while signing in', async () => {
    stubApi({ [SIGN_IN]: () => new Promise<Response>(() => undefined) });
    const { user } = await renderForm();

    await user.type(screen.getByLabelText('Email'), 'alice@example.test');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('button', { name: 'Signing in…' }),
    ).toBeDisabled();
  });

  it.each([
    [
      'invalid credentials',
      () =>
        Response.json(
          {
            code: 'INVALID_EMAIL_OR_PASSWORD',
            message: 'Invalid email or password',
          },
          { status: 401 },
        ),
      'Email or password is incorrect.',
    ],
    [
      'rate limiting',
      () => Response.json({ message: 'Too many requests' }, { status: 429 }),
      'Too many attempts. Wait a moment and try again.',
    ],
    [
      'a server error',
      () => Response.json({}, { status: 500 }),
      'Something went wrong on the server. Try again in a moment.',
    ],
    [
      'an unreachable API behind the proxy',
      () => new Response(null, { status: 502 }),
      'Shiori’s server can’t be reached right now. Try again in a moment.',
    ],
    [
      'a network failure',
      unreachable,
      'Shiori could not be reached. Check your connection and try again.',
    ],
  ])(
    'explains %s and lets the user retry',
    async (_case, response, message) => {
      stubApi({ [SIGN_IN]: response });
      const { user } = await renderForm();

      await user.type(screen.getByLabelText('Email'), 'alice@example.test');
      await user.type(
        screen.getByLabelText('Password'),
        'wrong password value',
      );
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    },
  );

  it('shows and hides the password', async () => {
    const { user } = await renderForm();
    const password = screen.getByLabelText('Password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
