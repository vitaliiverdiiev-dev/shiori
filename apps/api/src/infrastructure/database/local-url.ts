const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * True for a database URL on this machine. Query parameters are rejected
 * because node-postgres lets `?host=` / `?dbname=` override the URL itself.
 * Also imported directly by `scripts/dev-setup.mjs` (keep it dependency-free).
 */
export function isLocalDatabaseUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return LOCAL_HOSTS.has(url.hostname) && url.search === '';
}
