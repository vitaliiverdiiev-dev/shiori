/** `/api/health` body: `{ status: 'ok' }`. */
export function isApiHealthy(body: unknown): boolean {
  return isRecord(body) && body.status === 'ok';
}

/** `/api/ready` body: `{ status: 'ok', checks: { database: 'up' } }`; anything else is not ready. */
export function isDatabaseUp(body: unknown): boolean {
  return (
    isRecord(body) &&
    body.status === 'ok' &&
    isRecord(body.checks) &&
    body.checks.database === 'up'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
