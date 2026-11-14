const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * True for a database URL on this machine. Query parameters are rejected
 * because node-postgres lets `?host=` / `?dbname=` override the URL itself.
 * Also imported directly by `scripts/dev-setup.mjs` (keep it dependency-free).
 */
export function isLocalDatabaseUrl(raw: string): boolean {
  return isLocalUrl(raw) && new URL(raw).search === '';
}

/** True when the URL's host is this machine. */
export function isLocalUrl(raw: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(raw).hostname);
  } catch {
    return false;
  }
}
