import type { Database } from '#infrastructure/database/database.module.js';
import {
  canShareQuestion,
  isSameKanaAttempt,
  occurrenceKey,
  resultKey,
  toKanaAttemptRecord,
} from '../model/helpers/kana-attempt.policy.js';
import type {
  KanaAttemptInput,
  KanaAttemptRecord,
  KanaResultOccurrence,
  RecordKanaAttemptsResult,
} from '../model/types/kana-attempt.types.js';
import {
  insertNewKanaAttempts,
  selectKanaAttempts,
} from '../persistence/queries/kana-attempt.queries.js';

class KanaAttemptConflict extends Error {
  constructor(readonly conflicts: KanaResultOccurrence[]) {
    super('Kana attempt conflicts with a recorded attempt');
  }
}

function inLockOrder(
  records: readonly KanaAttemptRecord[],
): KanaAttemptRecord[] {
  return records.toSorted((a, b) =>
    resultKey(a) < resultKey(b) ? -1 : Number(resultKey(a) > resultKey(b)),
  );
}

export async function recordKanaAttempts(
  db: Database,
  userId: string,
  inputs: readonly KanaAttemptInput[],
): Promise<RecordKanaAttemptsResult> {
  const records: KanaAttemptRecord[] = [];
  const invalid: number[] = [];
  const results = new Set<string>();
  const questions = new Map<string, KanaAttemptRecord>();
  for (const [index, input] of inputs.entries()) {
    const record = toKanaAttemptRecord(input);
    const sameQuestion = record && questions.get(occurrenceKey(record));
    if (
      !record ||
      results.has(resultKey(record)) ||
      (sameQuestion && !canShareQuestion(sameQuestion, record))
    ) {
      invalid.push(index);
      continue;
    }
    results.add(resultKey(record));
    if (!sameQuestion) questions.set(occurrenceKey(record), record);
    records.push(record);
  }
  if (invalid.length > 0) {
    return { indexes: invalid, ok: false, reason: 'invalid-attempts' };
  }

  try {
    return await db.transaction(async (tx) => {
      const inserted = new Set(
        (await insertNewKanaAttempts(tx, userId, inLockOrder(records))).map(
          resultKey,
        ),
      );
      const repeated = records.filter(
        (record) => !inserted.has(resultKey(record)),
      );
      if (repeated.length > 0) {
        await rejectConflicts(tx, userId, repeated);
      }
      return {
        duplicates: repeated.length,
        ok: true,
        recorded: inserted.size,
      };
    });
  } catch (error) {
    if (!(error instanceof KanaAttemptConflict)) throw error;
    return { conflicts: error.conflicts, ok: false, reason: 'conflict' };
  }
}

async function rejectConflicts(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  userId: string,
  repeated: readonly KanaAttemptRecord[],
): Promise<void> {
  const stored = await selectKanaAttempts(tx, userId, repeated);
  const byResult = new Map(stored.map((row) => [resultKey(row), row]));
  const questions = new Set(stored.map(occurrenceKey));
  const conflicts = repeated.filter((record) => {
    if (!questions.has(occurrenceKey(record))) {
      throw new Error('A conflicting kana attempt is missing');
    }
    const existing = byResult.get(resultKey(record));
    return !existing || !isSameKanaAttempt(existing, record);
  });
  if (conflicts.length > 0) {
    throw new KanaAttemptConflict(
      conflicts.map(({ kanaId, questionIndex, roundId }) => ({
        kanaId,
        questionIndex,
        roundId,
      })),
    );
  }
}
