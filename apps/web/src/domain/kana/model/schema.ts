import * as z from 'zod/mini';
import {
  KANA_DIRECTION,
  KANA_STORAGE_VERSION,
  MAX_ANSWER_LENGTH,
  MAX_QUESTION_COUNT,
  PENDING_ATTEMPTS_VERSION,
} from './consts';

const questionCount = z.int().check(z.positive(), z.lte(MAX_QUESTION_COUNT));

const storedSessionSchema = z.object({
  attempts: z.array(
    z.object({
      answer: z.string(),
      corrected: z.optional(z.boolean()),
      hintUsed: z.optional(z.boolean()),
      kanaId: z.string(),
      outcome: z.enum(['correct', 'incorrect', 'skipped']),
    }),
  ),
  hintShown: z.optional(z.boolean()),
  hintUsed: z.optional(z.boolean()),
  input: z.string(),
  order: z.array(z.string()),
  position: z.int().check(z.nonnegative()),
  questionCount: z.optional(questionCount),
  roundId: z.optional(z.uuid()),
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

const pendingAttemptSchema = z.object({
  answer: z.string().check(z.maxLength(MAX_ANSWER_LENGTH)),
  corrected: z.boolean(),
  direction: z.literal(KANA_DIRECTION),
  hintUsed: z.boolean(),
  kanaId: z.string(),
  outcome: z.enum(['correct', 'incorrect', 'skipped']),
  questionIndex: z.int().check(z.nonnegative(), z.lt(MAX_QUESTION_COUNT)),
  roundId: z.uuid(),
});

export const pendingAttemptsSchema = z.object({
  pending: z.array(pendingAttemptSchema),
  rejected: z.array(pendingAttemptSchema),
  version: z.literal(PENDING_ATTEMPTS_VERSION),
});

export const attemptConflictSchema = z.object({
  conflicts: z.array(
    z.object({ questionIndex: z.number(), roundId: z.string() }),
  ),
});
