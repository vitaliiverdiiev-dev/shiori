import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from '@/test/api-stub';
import { registrationMode, server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';

const SIGN_UP = 'POST /api/auth/sign-up/email';
const INVITATION = 'Wm9vLWJhci1iYXotcXV4LTEyMzQ1Njc4OTAtYWJjZGVm';
const PASSPHRASE = 'さくら が さいた 🌸 spring';
const NEUTRAL = /If your invitation and details were accepted/;

const syntheticSuccess = () =>
  Response.json({ token: null, user: { email: 'alice@example.test' } });

async function fillForm(
  user: ReturnType<typeof renderWithProviders>['user'],
  overrides: Partial<Record<string, string>> = {},
) {
  const values = {
    'Confirm password': PASSPHRASE,
    Email: 'alice@example.test',
    'Invitation code': ` ${INVITATION} `,
    Name: 'Alice',
    Password: PASSPHRASE,
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

async function renderRegistration() {
  vi.resetModules();
  const { Registration } = await import('../registration');
  return renderWithProviders(<Registration />);
}

describe('Registration', () => {
  beforeEach(() => {
    stubApi({});
  });

  it('does not offer a form when registration is closed', async () => {
    server.use(registrationMode('closed'));
    await renderRegistration();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking whether registration is open…',
    );
    expect(
      await screen.findByText(/Registration is closed/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('asks for every invitation detail in invite mode', async () => {
    server.use(registrationMode('invite'));
    await renderRegistration();

    for (const label of ['Name', 'Email', 'Invitation code']) {
      expect(await screen.findByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('offers a retry when the registration mode cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get('*/api/registration', () =>
        fail
          ? HttpResponse.json({}, { status: 503 })
          : HttpResponse.json({ mode: 'invite' }),
      ),
    );
    const { user } = await renderRegistration();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not check whether registration is open.',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText('Invitation code')).toBeVisible();
  });

  it('validates the invitation code, password policy and confirmation locally', async () => {
    server.use(registrationMode('invite'));
    const signUp = vi.fn(syntheticSuccess);
    stubApi({ [SIGN_UP]: signUp });
    const { user } = await renderRegistration();
    await screen.findByLabelText('Name');

    await fillForm(user, {
      'Confirm password': 'fourteen chars',
      'Invitation code': '',
      Password: '🔑'.repeat(7),
    });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      expect.stringContaining('Use 15–128 characters.'),
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      screen.getByLabelText('Invitation code'),
    ).toHaveAccessibleDescription('Enter your invitation code.');
    expect(signUp).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Passwords do not match.');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('sends a Unicode passphrase unchanged and shows a neutral next step', async () => {
    server.use(registrationMode('invite'));
    const signUp = vi.fn<(body: unknown) => Response>(() => syntheticSuccess());
    stubApi({ [SIGN_UP]: signUp });
    const { user } = await renderRegistration();
    await screen.findByLabelText('Name');

    await fillForm(user, {
      'Confirm password': ` ${PASSPHRASE} `,
      Password: ` ${PASSPHRASE} `,
    });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const heading = await screen.findByRole('heading', {
      name: 'Registration submitted',
    });
    expect(heading).toHaveFocus();
    expect(screen.getByText(NEUTRAL)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    expect(signUp).toHaveBeenCalledWith({
      email: 'alice@example.test',
      invitationCode: INVITATION,
      name: 'Alice',
      password: ` ${PASSPHRASE} `,
    });
  });

  it.each([
    ['a synthetic success', syntheticSuccess],
    [
      'an explicit duplicate-account error',
      () =>
        Response.json(
          { code: 'USER_ALREADY_EXISTS', message: 'User already exists.' },
          { status: 422 },
        ),
    ],
  ])(
    'gives the same neutral message for %s, never confirming the email exists',
    async (_case, response) => {
      server.use(registrationMode('invite'));
      stubApi({ [SIGN_UP]: response });
      const { user } = await renderRegistration();
      await screen.findByLabelText('Name');

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      expect(await screen.findByText(NEUTRAL)).toBeVisible();
      expect(screen.queryByText(/already/i)).not.toBeInTheDocument();
    },
  );

  it('keeps the form and explains a rejected invitation', async () => {
    server.use(registrationMode('invite'));
    stubApi({
      [SIGN_UP]: () =>
        Response.json(
          { code: 'INVALID_INVITATION', message: 'The invitation is invalid.' },
          { status: 400 },
        ),
    });
    const { user } = await renderRegistration();
    await screen.findByLabelText('Name');

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation code is not valid for this email address',
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Alice');
  });
});
