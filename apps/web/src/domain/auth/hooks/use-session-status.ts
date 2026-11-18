import { useState } from 'react';
import { authClient } from '../config/auth-client';
import {
  getSessionState,
  keepGuestDuringRecheck,
} from '../helpers/session-state';
import type { SessionState } from '../model/types';

export function useSessionStatus(): {
  retry: () => void;
  state: SessionState;
  userId: string | undefined;
} {
  const session = authClient.useSession();
  const current = getSessionState(session);
  const [lastSettled, setLastSettled] = useState(current);
  if (current !== 'checking' && current !== lastSettled) {
    setLastSettled(current);
  }

  const retry = () => {
    void session.refetch();
  };

  return {
    retry,
    state: keepGuestDuringRecheck(current, lastSettled),
    userId: session.data?.user.id,
  };
}
