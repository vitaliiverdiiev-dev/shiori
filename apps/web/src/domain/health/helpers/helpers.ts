import { CHECKING, TIMEOUT_ERROR_CODES } from '../model/consts';
import type { ProbeResult, RequestFailure, Status } from '../model/types';

export function describeApiFailure({ code, response }: RequestFailure): string {
  if (response) return `API responded ${String(response.status)}`;
  if (code && TIMEOUT_ERROR_CODES.includes(code)) {
    return 'API did not respond in time';
  }
  return 'API is unreachable';
}

export function getStatus(health: ProbeResult, readiness: ProbeResult): Status {
  if (health.isFetching) return CHECKING;
  if (health.error) {
    return {
      api: 'offline',
      database: 'unknown',
      reason: describeApiFailure(health.error),
    };
  }
  if (!isApiHealthy(health.data)) {
    return {
      api: 'offline',
      database: 'unknown',
      reason: 'Unexpected health response',
    };
  }
  if (readiness.isFetching) return CHECKING;
  return {
    api: 'online',
    database:
      readiness.isSuccess && isDatabaseUp(readiness.data)
        ? 'online'
        : 'unavailable',
  };
}

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
