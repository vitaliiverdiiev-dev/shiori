import { useEffect, useState } from 'react';
import { readKanaState, writeKanaState } from '../helpers/storage';
import type { KanaId, KanaScript } from '../model/types';

export function useStoredSelection(
  script: KanaScript,
  userId: string | undefined,
) {
  const [selection, setSelection] = useState<ReadonlySet<KanaId>>(
    () => new Set(readKanaState(script, userId).selection),
  );

  useEffect(() => {
    writeKanaState(script, userId, { selection: [...selection] });
  }, [script, selection, userId]);

  return [selection, setSelection] as const;
}
