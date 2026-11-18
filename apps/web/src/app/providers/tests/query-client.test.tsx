import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_QUERY_META } from '@/shared/api/query-access';
import {
  sessionResponse,
  stubApi,
  triggerSessionRecheck,
} from '@/test/api-stub';
import { registrationMode, server } from '@/test/msw';

const SESSION = '/api/auth/get-session';
const PRIVATE_KEY = ['private-notes'];
const PUBLIC_KEY = ['public-probe'];
const alice = { id: 'alice', name: 'Alice' };
const bob = { id: 'bob', name: 'Bob' };

type SessionUser = typeof alice | null;

async function renderSignedIn(session: () => SessionUser) {
  window.history.replaceState(null, '', '/');
  vi.resetModules();
  const [{ App }, { queryClient }, { subscribeToSessionUser }] =
    await Promise.all([
      import('../../app'),
      import('../query-client'),
      import('@/domain/auth'),
    ]);
  render(<App />);
  expect(await screen.findByText('Alice')).toBeVisible();

  queryClient.setQueryData(PRIVATE_KEY, 'Alice’s notes');
  await queryClient.query({
    meta: PUBLIC_QUERY_META,
    queryFn: () => 'public data',
    queryKey: PUBLIC_KEY,
  });
  expect(session()).toEqual(alice);
  const seenByLaterListeners: unknown[] = [];
  subscribeToSessionUser(() => {
    seenByLaterListeners.push(queryClient.getQueryData(PRIVATE_KEY));
  });
  return { queryClient, seenByLaterListeners };
}

function sessionStub(initial: SessionUser) {
  let current = initial;
  const respond = () =>
    current ? sessionResponse(current) : Response.json(null);
  return {
    respond,
    set: (next: SessionUser) => {
      current = next;
    },
    value: () => current,
  };
}

describe('private query cache', () => {
  beforeEach(() => {
    server.use(registrationMode('invite'));
  });

  it('is cleared when user A signs out and stays clear for user B', async () => {
    const session = sessionStub(alice);
    stubApi({
      'POST /api/auth/sign-in/email': () => {
        session.set(bob);
        return Response.json({ redirect: false, token: 'token-bob' });
      },
      'POST /api/auth/sign-out': () => {
        session.set(null);
        return Response.json({ success: true });
      },
      [SESSION]: session.respond,
    });
    const { queryClient, seenByLaterListeners } = await renderSignedIn(
      session.value,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined();

    await user.type(screen.getByLabelText('Email'), 'bob@example.test');
    await user.type(
      screen.getByLabelText('Password'),
      'bob’s long passphrase{enter}',
    );
    expect(await screen.findByText('Bob')).toBeVisible();

    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(PUBLIC_KEY)).toBe('public data');
    expect(seenByLaterListeners).toEqual([undefined, undefined]);
  });

  it('is cleared when the session is revoked elsewhere', async () => {
    const session = sessionStub(alice);
    stubApi({ [SESSION]: session.respond });
    const { queryClient, seenByLaterListeners } = await renderSignedIn(
      session.value,
    );

    session.set(null);
    act(() => {
      triggerSessionRecheck();
    });

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(PUBLIC_KEY)).toBe('public data');
    expect(seenByLaterListeners).toEqual([undefined]);
  });

  it('cancels a pending private request on account switch and ignores its late response', async () => {
    const session = sessionStub(alice);
    stubApi({ [SESSION]: session.respond });
    const { queryClient } = await renderSignedIn(session.value);
    queryClient.removeQueries({ queryKey: PRIVATE_KEY });

    let signal: AbortSignal | undefined;
    let respondLate: (value: string) => void = () => undefined;
    const pending = queryClient
      .query({
        queryFn: (context) => {
          signal = context.signal;
          return new Promise<string>((resolve) => {
            respondLate = resolve;
          });
        },
        queryKey: PRIVATE_KEY,
      })
      .catch((error: unknown) => error);

    session.set(bob);
    act(() => {
      triggerSessionRecheck();
    });
    expect(await screen.findByText('Bob')).toBeVisible();

    expect(signal?.aborted).toBe(true);
    respondLate('Alice’s notes');
    await pending;
    expect(queryClient.getQueryData(PRIVATE_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(PUBLIC_KEY)).toBe('public data');
  });
});
