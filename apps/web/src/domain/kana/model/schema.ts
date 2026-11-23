import { kanaDirections } from '@shiori/kana';
import * as z from 'zod/mini';
import {
  KANA_STORAGE_VERSION,
  LEGACY_KANA_STORAGE_VERSION,
  MAX_ANSWER_LENGTH,
  MAX_QUESTION_COUNT,
  PENDING_ATTEMPTS_VERSION,
} from './consts';

const questionCount = z.int().check(z.positive(), z.lte(MAX_QUESTION_COUNT));

const storedAttemptSchema = z.object({
  answer: z.string(),
  corrected: z.optional(z.boolean()),
  hintUsed: z.optional(z.boolean()),
  kanaId: z.string(),
  outcome: z.enum(['correct', 'incorrect', 'skipped']),
});

const storedSessionSchema = z.object({
  hintShown: z.boolean(),
  hintUsed: z.boolean(),
  inputs: z.array(z.string()),
  mode: z.enum([...kanaDirections, 'both']),
  order: z.array(
    z.union([
      z.object({ direction: z.literal('kana-to-romaji'), kanaId: z.string() }),
      z.object({
        direction: z.literal('romaji-to-kana'),
        readingId: z.string(),
      }),
    ]),
  ),
  position: z.int().check(z.nonnegative()),
  questionCount,
  results: z.array(z.array(storedAttemptSchema)),
  roundId: z.uuid(),
  selection: z.array(z.string()),
});

export const storedKanaStateSchema = z.object({
  questionCount: z.optional(z.nullable(questionCount)),
  selection: z.array(z.string()),
  session: z.nullable(storedSessionSchema),
  userId: z.string(),
  version: z.literal(KANA_STORAGE_VERSION),
});

export type StoredKanaRecord = z.infer<typeof storedKanaStateSchema>;

export type StoredKanaSession = z.infer<typeof storedSessionSchema>;

const legacySessionSchema = z.object({
  attempts: z.array(storedAttemptSchema),
  hintShown: z.optional(z.boolean()),
  hintUsed: z.optional(z.boolean()),
  input: z.string(),
  order: z.array(z.string()),
  position: z.int().check(z.nonnegative()),
  questionCount: z.optional(questionCount),
  roundId: z.optional(z.uuid()),
  selection: z.array(z.string()),
});

export const legacyKanaStateSchema = z.object({
  questionCount: z.optional(z.nullable(questionCount)),
  selection: z.array(z.string()),
  session: z.nullable(legacySessionSchema),
  userId: z.string(),
  version: z.literal(LEGACY_KANA_STORAGE_VERSION),
});

export type LegacyKanaSession = z.infer<typeof legacySessionSchema>;

const pendingAttemptSchema = z.object({
  answer: z.string().check(z.maxLength(MAX_ANSWER_LENGTH)),
  corrected: z.boolean(),
  direction: z.enum(kanaDirections),
  hintUsed: z.boolean(),
  kanaId: z.string(),
  outcome: z.enum(['correct', 'incorrect', 'skipped']),
  questionIndex: z.int().check(z.nonnegative(), z.lt(MAX_QUESTION_COUNT)),
  roundId: z.uuid(),
});

export const pendingAttemptsSchema = z.object({
  invalid: z.optional(z.array(pendingAttemptSchema)),
  pending: z.array(pendingAttemptSchema),
  rejected: z.array(pendingAttemptSchema),
  version: z.literal(PENDING_ATTEMPTS_VERSION),
});

export const attemptConflictSchema = z.object({
  conflicts: z.array(
    z.object({
      kanaId: z.string(),
      questionIndex: z.number(),
      roundId: z.string(),
    }),
  ),
});

export const invalidAttemptsSchema = z.object({
  invalidIndexes: z.array(z.int().check(z.nonnegative())),
});
