import type { KanaScript } from '@shiori/kana';
import { and, eq, inArray, max, or, type SQL, sql } from 'drizzle-orm';
import type { Database } from '#infrastructure/database/database.module.js';
import type {
  KanaAttemptDirection,
  KanaAttemptRecord,
  KanaOccurrence,
  KanaProgressEntry,
} from '../../model/types/kana-attempt.types.js';
import {
  kanaAttempt,
  type KanaAttemptRow,
} from '../schemas/kana-attempt.schema.js';

type Executor = Pick<Database, 'insert' | 'select'>;

const countWhere = (condition: SQL) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

export async function insertNewKanaAttempts(
  db: Executor,
  userId: string,
  records: readonly KanaAttemptRecord[],
): Promise<KanaOccurrence[]> {
  return db
    .insert(kanaAttempt)
    .values(records.map((record) => ({ ...record, userId })))
    .onConflictDoNothing()
    .returning({
      questionIndex: kanaAttempt.questionIndex,
      roundId: kanaAttempt.roundId,
    });
}

export async function selectKanaAttempts(
  db: Executor,
  userId: string,
  occurrences: readonly KanaOccurrence[],
): Promise<KanaAttemptRow[]> {
  const indexesByRound = new Map<string, number[]>();
  for (const { questionIndex, roundId } of occurrences) {
    indexesByRound.set(roundId, [
      ...(indexesByRound.get(roundId) ?? []),
      questionIndex,
    ]);
  }
  const matches = [...indexesByRound].map(([roundId, indexes]) =>
    and(
      eq(kanaAttempt.roundId, roundId),
      inArray(kanaAttempt.questionIndex, indexes),
    ),
  );
  return db
    .select()
    .from(kanaAttempt)
    .where(and(eq(kanaAttempt.userId, userId), or(...matches)));
}

export async function selectKanaProgress(
  db: Executor,
  userId: string,
  script: KanaScript,
  direction: KanaAttemptDirection,
): Promise<KanaProgressEntry[]> {
  const rows = await db
    .select({
      assistedCorrect: countWhere(
        sql`${kanaAttempt.outcome} = 'correct' and ${kanaAttempt.hintUsed}`,
      ),
      attempts: sql<number>`count(*)`.mapWith(Number),
      corrected: countWhere(sql`${kanaAttempt.corrected}`),
      incorrect: countWhere(sql`${kanaAttempt.outcome} = 'incorrect'`),
      independentCorrect: countWhere(
        sql`${kanaAttempt.outcome} = 'correct' and not ${kanaAttempt.hintUsed}`,
      ),
      kanaId: kanaAttempt.kanaId,
      lastPracticedAt: max(kanaAttempt.createdAt),
      skipped: countWhere(sql`${kanaAttempt.outcome} = 'skipped'`),
    })
    .from(kanaAttempt)
    .where(
      and(
        eq(kanaAttempt.userId, userId),
        eq(kanaAttempt.script, script),
        eq(kanaAttempt.direction, direction),
      ),
    )
    .groupBy(kanaAttempt.kanaId)
    .orderBy(kanaAttempt.kanaId);
  return rows.flatMap(({ lastPracticedAt, ...entry }) =>
    lastPracticedAt ? [{ ...entry, lastPracticedAt }] : [],
  );
}
