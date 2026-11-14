export function isApiHealthy(body: unknown): boolean {
  return isRecord(body) && body.status === 'ok';
}

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
