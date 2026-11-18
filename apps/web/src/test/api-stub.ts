import { vi } from 'vitest';

const SESSION_LIFETIME_MS = 86_400_000;

type Handler = (body: unknown) => Promise<Response> | Response;

export const unreachable = (): Promise<Response> =>
  Promise.reject(new TypeError('Failed to fetch'));

function parseBody(body: BodyInit | null | undefined): unknown {
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

export function sessionResponse(user: { id: string; name: string }): Response {
  const now = new Date().toISOString();
  return Response.json({
    session: {
      id: `session-${user.id}`,
      createdAt: now,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS).toISOString(),
      token: `token-${user.id}`,
      updatedAt: now,
      userId: user.id,
    },
    user: {
      ...user,
      createdAt: now,
      email: `${user.id}@example.test`,
      emailVerified: false,
      updatedAt: now,
    },
  });
}

export function stubApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(
    (input: Request | string | URL, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.href,
      );
      const method = input instanceof Request ? input.method : init?.method;
      const handler =
        routes[`${method ?? 'GET'} ${url.pathname}`] ?? routes[url.pathname];
      return handler
        ? Promise.resolve(handler(parseBody(init?.body)))
        : unreachable();
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function triggerSessionRecheck() {
  document.dispatchEvent(new Event('visibilitychange'));
}
