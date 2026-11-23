import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import product from '@/product-config';
import { sessionResponse, stubApi } from '@/test/api-stub';
import { registrationMode, server } from '@/test/msw';
import { getNavigation } from './routing/route-metadata';
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
  ['/kana/hiragana', 'Hiragana'],
  ['/kana/katakana', 'Katakana'],
  ['/settings/account', 'Account'],
  ['/settings/security', 'Security'],
  ['/status', 'Status'],
] as const;

const practiceRoutes = [
  ['/kana/hiragana/practice', 'Hiragana'],
  ['/kana/katakana/practice', 'Katakana'],
] as const;

const guestRoutes = [
  ['/sign-in', 'Sign in'],
  ['/sign-up', 'Create account'],
] as const;

const navigationItems = () => getNavigation().flatMap(({ items }) => items);

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

      const title = await screen.findByRole('heading', {
        level: 1,
        name: heading,
      });
      expect(title).toBeVisible();
      expect(screen.getByRole('main')).toContainElement(title);
      const nav = screen.getByRole('navigation', { name: 'Main' });
      expect(within(nav).getAllByRole('link')).toHaveLength(
        navigationItems().length,
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
    expect(
      [...protectedRoutes, ...practiceRoutes].map(([path]) => path).sort(),
    ).toEqual(registryPaths('protected').sort());
    expect(guestRoutes.map(([path]) => path)).toEqual(registryPaths('guest'));
  });

  it.each(guestRoutes)(
    'shows the guest page %s to a signed-out visitor',
    async (path, heading) => {
      stubApi({ [SESSION]: signedOut });
      await renderAt(path);

      const title = await screen.findByRole('heading', { name: heading });
      expect(title).toBeVisible();
      expect(screen.getByRole('main')).toContainElement(title);
      expect(
        screen.queryByRole('navigation', { name: 'Main' }),
      ).not.toBeInTheDocument();
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
    expect(within(nav).getAllByRole('link')).toEqual(
      navigationItems().map(({ label }) =>
        within(nav).getByRole('link', { name: label }),
      ),
    );
    for (const { label, path } of navigationItems()) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        path,
      );
    }
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(nav).getByRole('link', { name: 'Security' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Security' }),
    ).toBeVisible();
    expect(
      within(nav)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
        .map((link) => link.textContent),
    ).toEqual(['Security']);
    expect(document.title).toBe(`Security — ${product.name}`);
  });

  it('opens the mobile navigation, follows a link and closes it', async () => {
    vi.stubGlobal('innerWidth', 390);
    stubApi({ [SESSION]: signedIn });
    await renderAt('/');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { level: 1, name: product.name }),
    ).toBeVisible();
    expect(
      screen.queryByRole('navigation', { name: 'Main' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));
    const menu = await screen.findByRole('dialog');
    const nav = within(menu).getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(menu).getByRole('button', { name: 'Sign out' }),
    ).toBeVisible();

    await user.click(within(nav).getByRole('link', { name: 'Status' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Status' }),
    ).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes the mobile navigation with Escape and returns focus to its trigger', async () => {
    vi.stubGlobal('innerWidth', 390);
    stubApi({ [SESSION]: signedIn });
    await renderAt('/');
    const user = userEvent.setup();

    const trigger = await screen.findByRole('button', {
      name: 'Toggle Sidebar',
    });
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeVisible();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('keeps a branded loading screen while the signed-in shell downloads', async () => {
    vi.doMock('./layouts/app-layout', () => new Promise(() => undefined));
    try {
      stubApi({ [SESSION]: signedIn });
      await renderAt('/');

      expect(await screen.findByText('Loading…')).toBeVisible();
      expect(screen.getByRole('img', { name: product.name })).toBeVisible();
      expect(
        screen.queryByRole('navigation', { name: 'Main' }),
      ).not.toBeInTheDocument();
    } finally {
      vi.doUnmock('./layouts/app-layout');
    }
  });

  it('offers a reload when the signed-in shell cannot download', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.doMock('./layouts/app-layout', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    try {
      stubApi({ [SESSION]: signedIn });
      await renderAt('/');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This page couldn’t load',
      );
      expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();
    } finally {
      vi.doUnmock('./layouts/app-layout');
      vi.restoreAllMocks();
    }
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

  it('replaces the static startup shell and title with a branded session check', async () => {
    stubApi({ [SESSION]: () => new Promise<Response>(() => undefined) });
    const staticTitle = document.createElement('title');
    staticTitle.setAttribute('data-startup', '');
    staticTitle.textContent = 'Static title';
    document.head.append(staticTitle);
    const container = document.createElement('div');
    container.innerHTML =
      '<div class="startup-shell"><p role="status">Loading…</p></div>';
    document.body.append(container);
    window.history.replaceState(null, '', '/settings/account');
    vi.resetModules();
    const { App } = await import('./app');

    render(<App />, { container });

    expect(await screen.findByText('Checking your session…')).toBeVisible();
    expect(screen.getByRole('img', { name: product.name })).toBeVisible();
    expect(container.querySelector('.startup-shell')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    await vi.waitFor(() => {
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
    });
    expect(document.title).toBe(`Account — ${product.name}`);
  });

  it.each([
    ['/sign-in', signedOut],
    ['/', signedIn],
  ])('offers theme selection on %s', async (path, session) => {
    stubApi({ [SESSION]: session });
    await renderAt(path);

    expect(
      await screen.findByRole('button', { name: 'Theme: System' }),
    ).toBeVisible();
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
    expect(await screen.findByText('alice@example.test')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign out. Try again.',
    );
    expect(screen.getByRole('heading', { name: product.name })).toBeVisible();
  });
});

describe('Kana practice', () => {
  it.each(practiceRoutes)(
    'sends a signed-in user without a round from %s to %s selection',
    async (path, heading) => {
      stubApi({ [SESSION]: signedIn });
      await renderAt(path);

      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Start practice' }),
      ).toHaveAttribute('aria-disabled', 'true');
    },
  );

  it.each(practiceRoutes)(
    'sends a signed-out visitor from %s to sign-in',
    async (path) => {
      stubApi({ [SESSION]: signedOut });
      await renderAt(path);

      expect(
        await screen.findByRole('heading', { name: 'Sign in' }),
      ).toBeVisible();
    },
  );

  it('starts a round, keeps it while away and resumes it after a reload', async () => {
    stubApi({ [SESSION]: signedIn });
    await renderAt('/kana/hiragana');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'か ka' }));
    await user.click(screen.getByRole('button', { name: 'Start practice' }));

    expect(
      await screen.findByRole('heading', { name: 'Hiragana practice' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 1')).toBeVisible();
    await user.type(screen.getByRole('textbox'), 'ki{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Try again');

    await user.click(screen.getByRole('link', { name: 'Leave' }));
    expect(
      await screen.findByRole('button', { name: 'か ka' }),
    ).toHaveAttribute('aria-pressed', 'true');

    cleanup();
    await renderAt('/kana/hiragana/practice');
    expect(await screen.findByText('Question 1 of 1')).toBeVisible();
    expect(screen.getByRole('textbox')).toHaveValue('ki');
    expect(screen.getByRole('status')).toHaveTextContent('Try again');
    const resumed = userEvent.setup();
    await resumed.clear(screen.getByRole('textbox'));
    await resumed.type(screen.getByRole('textbox'), 'ka{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Round complete' }),
    ).toBeVisible();
  });

  it('does not show one account’s selection or round to the next', async () => {
    stubApi({ [SESSION]: signedIn });
    await renderAt('/kana/katakana');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'カ ka' }));
    await user.click(screen.getByRole('button', { name: 'Start practice' }));
    expect(await screen.findByText('Question 1 of 1')).toBeVisible();

    cleanup();
    stubApi({ [SESSION]: () => sessionResponse({ id: 'bob', name: 'Bob' }) });
    await renderAt('/kana/katakana/practice');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Katakana' }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 104 selected');
    expect(
      screen.queryByRole('link', { name: /Resume practice/ }),
    ).not.toBeInTheDocument();
  });
});
