import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import type { KanaScript } from '@shiori/kana';
import {
  getFinalizedAttempts,
  isAwaitingAdvance,
  practiceReducer,
} from '../helpers/session';
import { readKanaState, writeKanaState } from '../helpers/storage';
import { CORRECT_ADVANCE_DELAY_MS } from '../model/consts';
import type { PendingKanaAttempt } from '../model/types';

export function useKanaPractice(
  script: KanaScript,
  userId: string | undefined,
  onFinalized: (attempts: readonly PendingKanaAttempt[]) => void,
) {
  const [session, dispatch] = useReducer(
    practiceReducer,
    null,
    () => readKanaState(script, userId).session,
  );
  const lastSession = useRef(session);
  const awaitingAdvance = session !== null && isAwaitingAdvance(session);

  useLayoutEffect(() => {
    const previous = lastSession.current;
    lastSession.current = session;
    if (session) onFinalized(getFinalizedAttempts(previous, session));
  }, [onFinalized, session]);

  useEffect(() => {
    if (session) writeKanaState(script, userId, { session });
  }, [script, session, userId]);

  useEffect(() => {
    if (!awaitingAdvance) return;
    const timer = window.setTimeout(() => {
      dispatch({ from: session, type: 'next' });
    }, CORRECT_ADVANCE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [awaitingAdvance, session]);

  return { awaitingAdvance, dispatch, session };
}
