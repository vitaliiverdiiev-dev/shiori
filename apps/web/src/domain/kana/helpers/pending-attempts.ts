import {
  PENDING_ATTEMPTS_PREFIX,
  PENDING_ATTEMPTS_VERSION,
} from '../model/consts';
import {
  attemptConflictSchema,
  invalidAttemptsSchema,
  pendingAttemptsSchema,
} from '../model/schema';
import type { PendingKanaAttempt, PendingKanaAttempts } from '../model/types';

const EMPTY: PendingKanaAttempts = { invalid: [], pending: [], rejected: [] };

type Occurrence = Pick<PendingKanaAttempt, 'questionIndex' | 'roundId'>;

export function addPendingAttempts(
  queue: PendingKanaAttempts,
  attempts: readonly PendingKanaAttempt[],
): PendingKanaAttempts {
  return { ...queue, pending: appendAttempts(queue.pending, attempts) };
}

export function appendAttempts(
  list: readonly PendingKanaAttempt[],
  attempts: readonly PendingKanaAttempt[],
): PendingKanaAttempt[] {
  const listed = new Set(list.map(occurrenceKey));
  const result = [...list];
  for (const attempt of attempts) {
    const key = occurrenceKey(attempt);
    if (listed.has(key)) continue;
    listed.add(key);
    result.push(attempt);
  }
  return result;
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

export function readInvalidAttempts(
  data: unknown,
  batch: readonly PendingKanaAttempt[],
): null | PendingKanaAttempt[] {
  const parsed = invalidAttemptsSchema.safeParse(data);
  if (!parsed.success) return null;
  const indexes = new Set(parsed.data.invalidIndexes);
  const identifiable =
    indexes.size > 0 &&
    indexes.size === parsed.data.invalidIndexes.length &&
    [...indexes].every((index) => index < batch.length);
  return identifiable ? batch.filter((_, index) => indexes.has(index)) : null;
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
    if (!parsed.success) return EMPTY;
    const { invalid = [], pending, rejected } = parsed.data;
    return { invalid, pending, rejected };
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
    if (
      queue.pending.length === 0 &&
      queue.rejected.length === 0 &&
      queue.invalid.length === 0
    ) {
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
