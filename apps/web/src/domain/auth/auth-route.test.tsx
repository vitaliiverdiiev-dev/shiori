import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sessionResponse,
  stubApi,
  triggerSessionRecheck,
  unreachable,
} from '@/test/api-stub';

const SESSION = '/api/auth/get-session';
const alice = { id: 'alice', name: 'Alice' };
const bob = { id: 'bob', name: 'Bob' };
const signedOut = () => Response.json(null);

const LocationProbe = () => {
  const { pathname, search, ...location } = useLocation();
  return (
    <>
      <output aria-label="location">{`${pathname}${search}`}</output>
      <output aria-label="navigation state">
        {JSON.stringify(location.state)}
      </output>
    </>
  );
};

const Private = () => (
  <>
    <h1>Private content</h1>
    <label>
      Draft
      <input />
    </label>
  </>
);

const Guest = () => (
  <label>
    Email
    <input />
  </label>
);

function deferred() {
  let resolve: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function renderRoutes(path: string) {
  vi.resetModules();
  const { AuthRoute } = await import('./auth-route');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthRoute access="protected" />}>
          <Route element={<Private />} path="/private" />
          <Route element={<h1>Status</h1>} path="/status" />
          <Route element={<h1>Home</h1>} path="/" />
        </Route>
        <Route element={<AuthRoute access="guest" />}>
          <Route element={<Guest />} path="/sign-in" />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const location = () => screen.getByRole('status', { name: 'location' });
const navigationState = () =>
  screen.getByRole('status', { name: 'navigation state' });

describe('AuthRoute', () => {
  beforeEach(() => {
    stubApi({ [SESSION]: signedOut });
  });

  it('shows only a checking state until the session is verified', async () => {
    const pending = deferred();
    stubApi({ [SESSION]: () => pending.promise });
    await renderRoutes('/private');

    expect(await screen.findByText('Checking your session…')).toBeVisible();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve(sessionResponse(alice));
      await pending.promise;
    });
    expect(await screen.findByText('Private content')).toBeVisible();
  });

  it('sends a signed-out visitor to sign-in and keeps the destination', async () => {
    await renderRoutes('/private?tab=1');

    expect(await screen.findByLabelText('Email')).toBeVisible();
    expect(location()).toHaveTextContent(
      '/sign-in?redirect=%2Fprivate%3Ftab%3D1',
    );
    expect(navigationState()).toHaveTextContent('null');
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
  });

  it('treats a rejected (401) session as signed out', async () => {
    stubApi({
      [SESSION]: () =>
        Response.json({ message: 'Unauthorized' }, { status: 401 }),
    });
    await renderRoutes('/private');

    expect(await screen.findByLabelText('Email')).toBeVisible();
  });

  it.each([
    ['the network fails', unreachable],
    ['the server errors', () => Response.json({}, { status: 500 })],
    [
      'the proxy cannot reach the API',
      () => new Response(null, { status: 502 }),
    ],
  ])(
    'shows a retry state instead of signing out when %s',
    async (_case, failure) => {
      const session = vi
        .fn<() => Promise<Response> | Response>()
        .mockImplementationOnce(failure)
        .mockImplementation(() => sessionResponse(alice));
      stubApi({ [SESSION]: session });
      await renderRoutes('/private');

      expect(
        await screen.findByRole('heading', {
          name: 'Can’t verify your session',
        }),
      ).toBeVisible();
      expect(screen.getByText(/You have not been signed out/)).toBeVisible();
      expect(location()).toHaveTextContent('/private');
      expect(screen.queryByText('Private content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('Private content')).toBeVisible();
    },
  );

  it('keeps a signed-in user in place when a background re-check fails', async () => {
    const session = vi
      .fn<() => Promise<Response> | Response>()
      .mockImplementationOnce(() => sessionResponse(alice))
      .mockImplementation(unreachable);
    stubApi({ [SESSION]: session });
    await renderRoutes('/private');
    expect(await screen.findByText('Private content')).toBeVisible();

    await act(async () => {
      triggerSessionRecheck();
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(session).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText('Private content')).toBeVisible();
  });

  it('sends the user to sign-in when the session expires or is revoked', async () => {
    const session = vi
      .fn<() => Response>()
      .mockImplementationOnce(() => sessionResponse(alice))
      .mockImplementation(signedOut);
    stubApi({ [SESSION]: session });
    await renderRoutes('/private');
    expect(await screen.findByText('Private content')).toBeVisible();

    act(() => {
      triggerSessionRecheck();
    });

    expect(await screen.findByLabelText('Email')).toBeVisible();
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
    expect(navigationState()).toHaveTextContent('{"signedOut":true}');
  });

  it('discards the previous user’s page state when the account changes', async () => {
    const session = vi
      .fn<() => Response>()
      .mockImplementationOnce(() => sessionResponse(alice))
      .mockImplementation(() => sessionResponse(bob));
    stubApi({ [SESSION]: session });
    await renderRoutes('/private');
    fireEvent.change(await screen.findByLabelText('Draft'), {
      target: { value: 'Alice’s note' },
    });

    act(() => {
      triggerSessionRecheck();
    });

    await vi.waitFor(() => {
      expect(session).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(screen.getByLabelText('Draft')).toHaveValue('');
    });
  });

  it('keeps a guest page mounted while the session is re-checked', async () => {
    const pending = deferred();
    const session = vi
      .fn<() => Promise<Response> | Response>()
      .mockImplementationOnce(signedOut)
      .mockImplementation(() => pending.promise);
    stubApi({ [SESSION]: session });
    await renderRoutes('/sign-in');
    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'alice@example.test' },
    });

    act(() => {
      triggerSessionRecheck();
    });

    await vi.waitFor(() => {
      expect(session).toHaveBeenCalledTimes(2);
    });
    expect(
      screen.queryByText('Checking your session…'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.test');
    await act(async () => {
      pending.resolve(signedOut());
      await pending.promise;
    });
  });

  it.each([
    ['/sign-in?redirect=%2Fstatus', '/status'],
    ['/sign-in?redirect=https%3A%2F%2Fevil.example', '/'],
    ['/sign-in?redirect=%2F%2Fevil.example', '/'],
    ['/sign-in?redirect=%2Fsign-in', '/'],
    ['/sign-in', '/'],
  ])('sends a signed-in user from %s to %s', async (path, destination) => {
    stubApi({ [SESSION]: () => sessionResponse(alice) });
    await renderRoutes(path);

    await vi.waitFor(() => {
      expect(location()).toHaveTextContent(new RegExp(`^${destination}$`));
    });
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
