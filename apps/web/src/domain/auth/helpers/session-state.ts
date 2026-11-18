import { UNAUTHORIZED_STATUS } from '../model/consts';
import type { SessionState } from '../model/types';

type SessionSnapshot = {
  data: unknown;
  error: null | { status?: number };
  isPending: boolean;
};

export function getSessionState({
  data,
  error,
  isPending,
}: SessionSnapshot): SessionState {
  if (data) return 'authenticated';
  if (isPending) return 'checking';
  if (error && error.status !== UNAUTHORIZED_STATUS) return 'unavailable';
  return 'unauthenticated';
}

export function keepGuestDuringRecheck(
  current: SessionState,
  lastSettled: SessionState,
): SessionState {
  return current === 'checking' && lastSettled === 'unauthenticated'
    ? lastSettled
    : current;
}
