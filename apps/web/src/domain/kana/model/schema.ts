import * as z from 'zod/mini';
import { KANA_STORAGE_VERSION } from './consts';

const storedSessionSchema = z.object({
  attempts: z.array(
    z.object({
      answer: z.string(),
      corrected: z.optional(z.boolean()),
      kanaId: z.string(),
      outcome: z.enum(['correct', 'incorrect', 'skipped']),
    }),
  ),
  input: z.string(),
  order: z.array(z.string()),
  position: z.int().check(z.nonnegative()),
  selection: z.array(z.string()),
});

export const storedKanaStateSchema = z.object({
  selection: z.array(z.string()),
  session: z.nullable(storedSessionSchema),
  userId: z.string(),
  version: z.literal(KANA_STORAGE_VERSION),
});

export type StoredKanaRecord = z.infer<typeof storedKanaStateSchema>;
