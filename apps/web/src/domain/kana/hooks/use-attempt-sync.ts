import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createAttemptSync } from '../api/attempt-sync';
import { invalidateKanaProgress } from '../api/queries';

export function useAttemptSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [sync] = useState(() =>
    createAttemptSync(userId, () => {
      void invalidateKanaProgress(queryClient);
    }),
  );
  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot);

  useEffect(() => sync.start(), [sync]);

  return {
    ...snapshot,
    discardRejected: sync.discardRejected,
    record: sync.record,
    retry: sync.retry,
    retryRejected: sync.retryRejected,
  };
}
