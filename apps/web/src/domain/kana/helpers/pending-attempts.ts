import {
  PENDING_ATTEMPTS_PREFIX,
  PENDING_ATTEMPTS_VERSION,
} from '../model/consts';
import { attemptConflictSchema, pendingAttemptsSchema } from '../model/schema';
import type { PendingKanaAttempt, PendingKanaAttempts } from '../model/types';

const EMPTY: PendingKanaAttempts = { pending: [], rejected: [] };

type Occurrence = Pick<PendingKanaAttempt, 'questionIndex' | 'roundId'>;

export function addPendingAttempts(
  queue: PendingKanaAttempts,
  attempts: readonly PendingKanaAttempt[],
): PendingKanaAttempts {
  const queued = new Set(queue.pending.map(occurrenceKey));
  return {
    ...queue,
    pending: [
      ...queue.pending,
      ...attempts.filter((attempt) => !queued.has(occurrenceKey(attempt))),
    ],
  };
}

export function isPendingAttemptsKey(key: null | string, userId: string) {
  return key === pendingAttemptsKey(userId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function occurrenceKey({ questionIndex, roundId }: Occurrence): string {
  return `${roundId.toLowerCase()}#${String(questionIndex)}`;
}

function pendingAttemptsKey(userId: string): string {
  return `${PENDING_ATTEMPTS_PREFIX}${userId}`;
}

export function readConflicts(data: unknown): Occurrence[] | null {
  const parsed = attemptConflictSchema.safeParse(data);
  return parsed.success && parsed.data.conflicts.length > 0
    ? parsed.data.conflicts
    : null;
}

export function readHttpStatus(error: unknown): number | undefined {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  const { status } = error.response;
  return typeof status === 'number' ? status : undefined;
}

export function readPendingAttempts(userId: string): PendingKanaAttempts {
  let raw: null | string;
  try {
    raw = window.localStorage.getItem(pendingAttemptsKey(userId));
  } catch {
    return EMPTY;
  }
  if (raw === null) return EMPTY;
  try {
    const parsed = pendingAttemptsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function readResponseData(error: unknown): unknown {
  return isRecord(error) && isRecord(error.response)
    ? error.response.data
    : undefined;
}

export function removeAttempts(
  attempts: readonly PendingKanaAttempt[],
  removed: readonly Occurrence[],
): PendingKanaAttempt[] {
  const keys = new Set(removed.map(occurrenceKey));
  return attempts.filter((attempt) => !keys.has(occurrenceKey(attempt)));
}

export function writePendingAttempts(
  userId: string,
  queue: PendingKanaAttempts,
): boolean {
  try {
    const key = pendingAttemptsKey(userId);
    if (queue.pending.length === 0 && queue.rejected.length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(
        key,
        JSON.stringify({ ...queue, version: PENDING_ATTEMPTS_VERSION }),
      );
    }
    return true;
  } catch {
    return false;
  }
}
