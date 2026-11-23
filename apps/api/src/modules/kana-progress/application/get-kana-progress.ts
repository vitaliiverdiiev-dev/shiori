import type { KanaScript } from '@shiori/kana';
import type { Database } from '#infrastructure/database/database.module.js';
import type {
  KanaAttemptDirection,
  KanaProgressEntry,
} from '../model/types/kana-attempt.types.js';
import { selectKanaProgress } from '../persistence/queries/kana-attempt.queries.js';

export async function getKanaProgress(
  db: Database,
  userId: string,
  script: KanaScript,
  direction: KanaAttemptDirection,
): Promise<KanaProgressEntry[]> {
  return selectKanaProgress(db, userId, script, direction);
}
