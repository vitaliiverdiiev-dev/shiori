const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// COMPAT(pg-connection-string@2.14): `?host=` overrides the URL host, so a local-looking URL with a query is not local.
export function isLocalDatabaseUrl(raw: string): boolean {
  return isLocalUrl(raw) && new URL(raw).search === '';
}

export function isLocalUrl(raw: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(raw).hostname);
  } catch {
    return false;
  }
}
