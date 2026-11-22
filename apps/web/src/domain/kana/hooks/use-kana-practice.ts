import { useEffect, useReducer } from 'react';
import { practiceReducer } from '../helpers/session';
import { readKanaState, writeKanaState } from '../helpers/storage';
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

  useEffect(() => {
    if (session) writeKanaState(script, userId, { session });
  }, [script, session, userId]);

  return { dispatch, session };
}
