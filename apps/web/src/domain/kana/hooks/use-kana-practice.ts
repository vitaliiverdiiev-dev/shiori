import { useEffect, useReducer } from 'react';
import { isAwaitingAdvance, practiceReducer } from '../helpers/session';
import { readKanaState, writeKanaState } from '../helpers/storage';
import { CORRECT_ADVANCE_DELAY_MS } from '../model/consts';
import type { KanaScript } from '../model/types';

export function useKanaPractice(
  script: KanaScript,
  userId: string | undefined,
) {
  const [session, dispatch] = useReducer(
    practiceReducer,
    null,
    () => readKanaState(script, userId).session,
  );
  const awaitingAdvance = session !== null && isAwaitingAdvance(session);

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
