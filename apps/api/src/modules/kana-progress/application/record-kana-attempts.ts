import type { Database } from '#infrastructure/database/database.module.js';
import {
  isSameKanaAttempt,
  occurrenceKey,
  toKanaAttemptRecord,
} from '../model/helpers/kana-attempt.policy.js';
import type {
  KanaAttemptInput,
  KanaAttemptRecord,
  KanaOccurrence,
  RecordKanaAttemptsResult,
} from '../model/types/kana-attempt.types.js';
import {
  insertNewKanaAttempts,
  selectKanaAttempts,
} from '../persistence/queries/kana-attempt.queries.js';

class KanaAttemptConflict extends Error {
  constructor(readonly conflicts: KanaOccurrence[]) {
    super('Kana attempt conflicts with a recorded attempt');
  }
}

export async function recordKanaAttempts(
  db: Database,
  userId: string,
  inputs: readonly KanaAttemptInput[],
): Promise<RecordKanaAttemptsResult> {
  const records: KanaAttemptRecord[] = [];
  const invalid: number[] = [];
  const keys = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    const record = toKanaAttemptRecord(input);
    if (!record || keys.has(occurrenceKey(record))) {
      invalid.push(index);
      continue;
    }
    keys.add(occurrenceKey(record));
    records.push(record);
  }
  if (invalid.length > 0) {
    return { indexes: invalid, ok: false, reason: 'invalid-attempts' };
  }

  try {
    return await db.transaction(async (tx) => {
      const inserted = new Set(
        (await insertNewKanaAttempts(tx, userId, records)).map(occurrenceKey),
      );
      const repeated = records.filter(
        (record) => !inserted.has(occurrenceKey(record)),
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
  const stored = new Map(
    (await selectKanaAttempts(tx, userId, repeated)).map((row) => [
      occurrenceKey(row),
      row,
    ]),
  );
  const conflicts = repeated.filter((record) => {
    const existing = stored.get(occurrenceKey(record));
    if (!existing) throw new Error('A conflicting kana attempt is missing');
    return !isSameKanaAttempt(existing, record);
  });
  if (conflicts.length > 0) {
    throw new KanaAttemptConflict(
      conflicts.map(({ questionIndex, roundId }) => ({
        questionIndex,
        roundId,
      })),
    );
  }
}
