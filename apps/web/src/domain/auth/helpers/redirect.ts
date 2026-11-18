import {
  authPaths,
  REDIRECT_PARAM,
  REDIRECT_PARSE_ORIGIN,
} from '../model/consts';

type Destination = { hash: string; pathname: string; search: string };

const guestPaths = new Set<string>([authPaths.signIn, authPaths.signUp]);

export function getSafeRedirect(target: null | string): string {
  if (!target || !isPlainInternalPath(target)) return authPaths.home;

  let decoded: string;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    return authPaths.home;
  }
  if (!isPlainInternalPath(decoded)) return authPaths.home;

  const url = new URL(target, REDIRECT_PARSE_ORIGIN);
  if (url.origin !== REDIRECT_PARSE_ORIGIN || url.pathname.startsWith('//')) {
    return authPaths.home;
  }
  const route = url.pathname.replace(/\/+$/, '').toLowerCase();
  if (guestPaths.has(route)) return authPaths.home;

  return `${url.pathname}${url.search}${url.hash}`;
}

export function getSignInPath({ hash, pathname, search }: Destination): string {
  const destination = `${pathname}${search}${hash}`;
  if (destination === authPaths.home) return authPaths.signIn;
  const query = new URLSearchParams({ [REDIRECT_PARAM]: destination });
  return `${authPaths.signIn}?${query.toString()}`;
}

function isPlainInternalPath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !/\p{Cc}/u.test(path)
  );
}
