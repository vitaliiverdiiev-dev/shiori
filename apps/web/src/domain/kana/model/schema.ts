import * as z from 'zod/mini';
import { KANA_STORAGE_VERSION, MAX_QUESTION_COUNT } from './consts';

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
  input: z.string(),
  order: z.array(z.string()),
  position: z.int().check(z.nonnegative()),
  questionCount: z.optional(questionCount),
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
