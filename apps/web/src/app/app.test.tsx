import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import product from '@/product-config';
import { sessionResponse, stubApi } from '@/test/api-stub';
import { registrationMode, server } from '@/test/msw';
import { getMainNavigation } from './routing/route-metadata';
import { routes } from './routing/routes';

const SESSION = '/api/auth/get-session';
const alice = { id: 'alice', name: 'Alice' };
const signedIn = () => sessionResponse(alice);
const signedOut = () => Response.json(null);

async function renderAt(path: string) {
  window.history.replaceState(null, '', path);
  vi.resetModules();
  const { App } = await import('./app');
  return render(<App />);
}

const protectedRoutes = [
  ['/', product.name],
  ['/status', 'Status'],
  ['/settings/account', 'Account'],
  ['/settings/security', 'Security'],
] as const;

const guestRoutes = [
  ['/sign-in', 'Sign in'],
  ['/sign-up', 'Create account'],
] as const;

const registryPaths = (access: string) =>
  routes.filter((route) => route.access === access).map(({ path }) => path);

describe('App routes', () => {
  beforeEach(() => {
    server.use(registrationMode('invite'));
  });

  it('sets the document identity from product.config.json', async () => {
    stubApi({ [SESSION]: signedIn });
    await renderAt('/');

    expect(
      await screen.findByRole('heading', { name: product.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(product.nameJa)).toBeInTheDocument();
    expect(screen.getByText(product.tagline)).toBeInTheDocument();
    expect(document.title).toBe(`${product.name} — ${product.tagline}`);
  });

  it.each(protectedRoutes)(
    'shows %s with navigation to a signed-in user',
    async (path, heading) => {
      stubApi({ [SESSION]: signedIn });
      await renderAt(path);

      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeVisible();
      const nav = screen.getByRole('navigation', { name: 'Main' });
      expect(within(nav).getAllByRole('link')).toHaveLength(
        getMainNavigation().length,
      );
      expect(screen.getByText(alice.name)).toBeVisible();
    },
  );

  it.each(protectedRoutes)(
    'sends a signed-out visitor from %s to sign-in',
    async (path) => {
      stubApi({ [SESSION]: signedOut });
      await renderAt(path);

      expect(
        await screen.findByRole('heading', { name: 'Sign in' }),
      ).toBeVisible();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    },
  );

  it('exercises every protected and guest route in the registry', () => {
    expect(protectedRoutes.map(([path]) => path)).toEqual(
      registryPaths('protected'),
    );
    expect(guestRoutes.map(([path]) => path)).toEqual(registryPaths('guest'));
  });

  it.each(guestRoutes)(
    'shows the guest page %s to a signed-out visitor',
    async (path, heading) => {
      stubApi({ [SESSION]: signedOut });
      await renderAt(path);

      expect(
        await screen.findByRole('heading', { name: heading }),
      ).toBeVisible();
    },
  );

  it.each(guestRoutes.map(([path]) => path))(
    'sends a signed-in user from %s home',
    async (path) => {
      stubApi({ [SESSION]: signedIn });
      await renderAt(path);

      expect(
        await screen.findByRole('heading', { name: product.name }),
      ).toBeVisible();
    },
  );

  it.each([
    ['/sign-in?redirect=%2Fsettings%2Fsecurity', 'Security'],
    ['/sign-in?redirect=https%3A%2F%2Fevil.example%2F', product.name],
    ['/sign-in?redirect=%2F%2Fevil.example', product.name],
  ])('signs in from %s and lands on %s', async (path, heading) => {
    let session = signedOut;
    stubApi({
      'POST /api/auth/sign-in/email': () => {
        session = signedIn;
        return Response.json({ redirect: false, token: 'token-alice' });
      },
      [SESSION]: () => session(),
    });
    await renderAt(path);
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText('Email'),
      'alice@example.test',
    );
    await user.type(
      screen.getByLabelText('Password'),
      'correct horse battery staple{enter}',
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
    expect(window.location.origin).toBe('http://localhost:3000');
  });

  it('completes sign-up without signing the visitor in', async () => {
    const session = vi.fn(signedOut);
    stubApi({
      'POST /api/auth/sign-up/email': () =>
        Response.json({ token: null, user: { email: 'alice@example.test' } }),
      [SESSION]: session,
    });
    await renderAt('/sign-up');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.test');
    await user.type(
      screen.getByLabelText('Password'),
      'a long enough passphrase',
    );
    await user.type(
      screen.getByLabelText('Confirm password'),
      'a long enough passphrase',
    );
    await user.type(
      screen.getByLabelText('Invitation code'),
      'Wm9vLWJhci1iYXotcXV4LTEyMzQ1Njc4OTAtYWJjZGVm',
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { name: 'Registration submitted' }),
    ).toBeVisible();
    await vi.waitFor(() => {
      expect(session.mock.calls.length).toBeGreaterThan(1);
    });
    expect(
      screen.getByRole('heading', { name: 'Registration submitted' }),
    ).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go to sign in' }));
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
  });

  it('returns to sign-in, keeping the page, when the session expires during a save', async () => {
    let session = signedIn;
    stubApi({
      'POST /api/auth/update-user': () => {
        session = signedOut;
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
      },
      [SESSION]: () => session(),
    });
    await renderAt('/settings/account');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Name'), ' Smith');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
    expect(window.location.search).toBe('?redirect=%2Fsettings%2Faccount');
  });

  it('shows public diagnostics, not protected content, when the session cannot be verified', async () => {
    server.use(
      http.get('*/api/health', () => HttpResponse.json({ status: 'ok' })),
      http.get('*/api/ready', () =>
        HttpResponse.json(
          { checks: { database: 'down' }, status: 'error' },
          { status: 503 },
        ),
      ),
    );
    stubApi({ [SESSION]: () => Response.json({}, { status: 500 }) });
    await renderAt('/settings/account');

    expect(
      await screen.findByRole('heading', { name: 'Can’t verify your session' }),
    ).toBeVisible();
    expect(await screen.findByText('Database unavailable')).toBeVisible();
    expect(screen.getByText('API online')).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('navigates between signed-in pages with the registry navigation', async () => {
    stubApi({ [SESSION]: signedIn });
    await renderAt('/');
    const user = userEvent.setup();

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual(getMainNavigation().map(({ label, path }) => [label, path]));

    await user.click(within(nav).getByRole('link', { name: 'Security' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Security' }),
    ).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'Security' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(document.title).toBe(`Security — ${product.name}`);
  });

  it('moves between the guest pages', async () => {
    stubApi({ [SESSION]: signedOut });
    await renderAt('/sign-in');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('link', { name: 'Create an account' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Create account' }),
    ).toBeVisible();
    expect(document.title).toBe(`Create account — ${product.name}`);

    await user.click(screen.getByRole('link', { name: 'Sign in' }));
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
  });

  it('opens the requested page once a failed session check succeeds on retry', async () => {
    let session = () => Response.json({}, { status: 500 });
    stubApi({ [SESSION]: () => session() });
    await renderAt('/settings/security');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: 'Can’t verify your session' }),
    ).toBeVisible();
    session = signedIn;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Security' }),
    ).toBeVisible();
  });

  it('keeps the session recovery screen when the diagnostics bundle cannot load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.doMock('@/domain/health', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    try {
      stubApi({ [SESSION]: () => Response.json({}, { status: 500 }) });
      await renderAt('/');

      expect(
        await screen.findByText('Server status details could not be loaded.'),
      ).toBeVisible();
      expect(
        screen.getByRole('heading', { name: 'Can’t verify your session' }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    } finally {
      vi.doUnmock('@/domain/health');
      vi.restoreAllMocks();
    }
  });

  it('shows the not-found page without waiting for the session', async () => {
    stubApi({ [SESSION]: () => new Promise<Response>(() => undefined) });
    await renderAt('/no-such-page');

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  });

  it('signs out and returns to sign-in without the previous user’s data', async () => {
    let session = signedIn;
    stubApi({
      'POST /api/auth/sign-out': () => {
        session = signedOut;
        return Response.json({ success: true });
      },
      [SESSION]: () => session(),
    });
    await renderAt('/settings/account');
    expect(await screen.findByText(alice.name)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
    expect(screen.queryByText(alice.name)).not.toBeInTheDocument();
  });

  it('keeps the user signed in and reports a failed sign-out', async () => {
    stubApi({
      'POST /api/auth/sign-out': () => Response.json({}, { status: 500 }),
      [SESSION]: signedIn,
    });
    await renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign out. Try again.',
    );
    expect(screen.getByRole('heading', { name: product.name })).toBeVisible();
  });
});
