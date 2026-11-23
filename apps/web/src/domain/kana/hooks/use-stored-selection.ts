import { useEffect, useState } from 'react';
import type { KanaId, KanaScript } from '@shiori/kana';
import { readKanaState, writeKanaState } from '../helpers/storage';

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
