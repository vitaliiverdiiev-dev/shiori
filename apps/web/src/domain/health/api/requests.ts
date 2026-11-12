import { isApiHealthy, isDatabaseUp } from '../helpers/helpers';
import {
  HEALTH_PATH,
  HEALTH_TIMEOUT_MS,
  READY_PATH,
  READY_TIMEOUT_MS,
} from '../model/consts';
import type { JsonResult, Status } from '../model/types';

// Shared in-flight check: StrictMode's dev remount and concurrent callers
// reuse it instead of firing (and cancelling) duplicate requests.
let inFlight: Promise<Status> | undefined;

export function checkStatus(): Promise<Status> {
  inFlight ??= requestStatus().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

async function getJson(path: string, timeoutMs: number): Promise<JsonResult> {
  try {
    const response = await fetch(path, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return { ok: false, reason: `responded ${String(response.status)}` };
    }
    const body: unknown = await response.json();
    return { body, ok: true };
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError';
    return {
      ok: false,
      reason: timedOut ? 'did not respond in time' : 'is unreachable',
    };
  }
}

async function requestStatus(): Promise<Status> {
  const health = await getJson(HEALTH_PATH, HEALTH_TIMEOUT_MS);
  if (!health.ok) {
    return {
      api: 'offline',
      database: 'unknown',
      reason: `API ${health.reason}`,
    };
  }
  if (!isApiHealthy(health.body)) {
    return {
      api: 'offline',
      database: 'unknown',
      reason: 'Unexpected health response',
    };
  }
  const ready = await getJson(READY_PATH, READY_TIMEOUT_MS);
  return {
    api: 'online',
    database: ready.ok && isDatabaseUp(ready.body) ? 'online' : 'unavailable',
  };
}
