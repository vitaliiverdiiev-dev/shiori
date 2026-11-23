import type { KanaId } from '@shiori/kana';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from '../../../auth/persistence/schemas/auth.schema.js';
import {
  KANA_ATTEMPT_DIRECTIONS,
  KANA_ATTEMPT_OUTCOMES,
  KANA_SCRIPTS,
  MAX_QUESTIONS_PER_ROUND,
} from '../../model/constants/kana-attempt.constants.js';

const inList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(', '));

export const kanaAttempt = pgTable(
  'kana_attempt',
  {
    corrected: boolean('corrected').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    direction: text('direction', { enum: KANA_ATTEMPT_DIRECTIONS }).notNull(),
    hintUsed: boolean('hint_used').notNull(),
    kanaId: text('kana_id').$type<KanaId>().notNull(),
    outcome: text('outcome', { enum: KANA_ATTEMPT_OUTCOMES }).notNull(),
    questionIndex: integer('question_index').notNull(),
    roundId: uuid('round_id').notNull(),
    script: text('script', { enum: KANA_SCRIPTS }).notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.roundId, table.questionIndex, table.kanaId],
      name: 'kana_attempt_pk',
    }),
    uniqueIndex('kana_attempt_kana_to_romaji_question_idx')
      .on(table.userId, table.roundId, table.questionIndex)
      .where(sql`${table.direction} = 'kana-to-romaji'`),
    index('kana_attempt_progress_idx').on(
      table.userId,
      table.script,
      table.direction,
      table.kanaId,
    ),
    check(
      'kana_attempt_direction_check',
      sql`${table.direction} in (${inList(KANA_ATTEMPT_DIRECTIONS)})`,
    ),
    check(
      'kana_attempt_outcome_check',
      sql`${table.outcome} in (${inList(KANA_ATTEMPT_OUTCOMES)})`,
    ),
    check(
      'kana_attempt_script_check',
      sql`${table.script} in (${inList(KANA_SCRIPTS)})`,
    ),
    check(
      'kana_attempt_kana_id_matches_script',
      sql`starts_with(${table.kanaId}, ${table.script} || ':')`,
    ),
    check(
      'kana_attempt_corrected_only_after_incorrect',
      sql`not ${table.corrected} or ${table.outcome} = 'incorrect'`,
    ),
    check(
      'kana_attempt_question_index_range',
      sql`${table.questionIndex} >= 0 and ${table.questionIndex} < ${sql.raw(String(MAX_QUESTIONS_PER_ROUND))}`,
    ),
  ],
);

export type KanaAttemptRow = typeof kanaAttempt.$inferSelect;
