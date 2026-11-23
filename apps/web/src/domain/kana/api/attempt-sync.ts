import { recordKanaAttempts } from '@shiori/api-client';
import {
  addPendingAttempts,
  isPendingAttemptsKey,
  readConflicts,
  readHttpStatus,
  readPendingAttempts,
  readResponseData,
  removeAttempts,
  writePendingAttempts,
} from '../helpers/pending-attempts';
import {
  ATTEMPT_BATCH_SIZE,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  SYNC_RETRY_BASE_MS,
  SYNC_RETRY_FACTOR,
  SYNC_RETRY_MAX_MS,
} from '../model/consts';
import type {
  AttemptSyncSnapshot,
  PendingKanaAttempt,
  PendingKanaAttempts,
} from '../model/types';

export type AttemptSync = ReturnType<typeof createAttemptSync>;

const NO_ATTEMPTS: PendingKanaAttempts = { pending: [], rejected: [] };

export function createAttemptSync(
  userId: string | undefined,
  onSaved: () => void,
) {
  let active = false;
  let sending = false;
  let failures = 0;
  let timer: number | undefined;
  let memory: null | PendingKanaAttempts = null;
  let status: AttemptSyncSnapshot['status'] = 'idle';
  let snapshot: AttemptSyncSnapshot = { pending: 0, rejected: 0, status };
  const listeners = new Set<() => void>();
  const isActive = () => active;

  const read = (): PendingKanaAttempts =>
    memory ??
    (userId === undefined ? NO_ATTEMPTS : readPendingAttempts(userId));

  const write = (queue: PendingKanaAttempts) => {
    if (userId === undefined) return;
    if (memory !== null || !writePendingAttempts(userId, queue)) {
      memory = queue;
    }
  };

  const publish = (next = status) => {
    status = next;
    const { pending, rejected } = read();
    if (
      snapshot.pending === pending.length &&
      snapshot.rejected === rejected.length &&
      snapshot.status === status
    ) {
      return;
    }
    snapshot = { pending: pending.length, rejected: rejected.length, status };
    for (const listener of listeners) listener();
  };

  const send = async (
    owner: string,
    batch: readonly PendingKanaAttempt[],
  ): Promise<boolean> => {
    try {
      await recordKanaAttempts({
        body: { attempts: [...batch], userId: owner },
        throwOnError: true,
      });
      const queue = read();
      write({ ...queue, pending: removeAttempts(queue.pending, batch) });
      onSaved();
      return true;
    } catch (error) {
      const httpStatus = readHttpStatus(error);
      const conflicts =
        httpStatus === HTTP_CONFLICT
          ? readConflicts(readResponseData(error))
          : null;
      const queue = read();
      if (conflicts) {
        write({ ...queue, pending: removeAttempts(queue.pending, conflicts) });
        return true;
      }
      if (httpStatus === HTTP_BAD_REQUEST) {
        write({
          pending: removeAttempts(queue.pending, batch),
          rejected: [...queue.rejected, ...batch],
        });
        return true;
      }
      return false;
    }
  };

  const flush = async (): Promise<void> => {
    if (!active || sending || userId === undefined) return;
    window.clearTimeout(timer);
    const batch = read().pending.slice(0, ATTEMPT_BATCH_SIZE);
    if (batch.length === 0) {
      failures = 0;
      publish('idle');
      return;
    }

    sending = true;
    publish('saving');
    const delivered = await send(userId, batch);
    sending = false;

    if (delivered) {
      failures = 0;
      if (isActive()) await flush();
      else publish('idle');
      return;
    }
    failures += 1;
    publish('waiting');
    if (isActive()) {
      timer = window.setTimeout(
        () => void flush(),
        Math.min(
          SYNC_RETRY_BASE_MS * SYNC_RETRY_FACTOR ** (failures - 1),
          SYNC_RETRY_MAX_MS,
        ),
      );
    }
  };

  const retry = () => {
    failures = 0;
    void flush();
  };

  const onStorage = (event: StorageEvent) => {
    if (userId !== undefined && isPendingAttemptsKey(event.key, userId)) {
      publish();
    }
  };

  return {
    getSnapshot: () => snapshot,
    record: (attempts: readonly PendingKanaAttempt[]) => {
      if (userId === undefined || attempts.length === 0) return;
      write(addPendingAttempts(read(), attempts));
      publish();
      void flush();
    },
    retry,
    start: () => {
      active = true;
      window.addEventListener('online', retry);
      window.addEventListener('storage', onStorage);
      publish();
      void flush();
      return () => {
        active = false;
        window.clearTimeout(timer);
        window.removeEventListener('online', retry);
        window.removeEventListener('storage', onStorage);
      };
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
