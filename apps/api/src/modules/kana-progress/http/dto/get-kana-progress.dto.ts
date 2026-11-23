import { z } from 'zod';
import {
  KANA_ATTEMPT_DIRECTIONS,
  KANA_SCRIPTS,
} from '../../model/constants/kana-attempt.constants.js';

export const kanaProgressQuerySchema = z.strictObject({
  script: z.enum(KANA_SCRIPTS),
});

export const kanaProgressResponseSchema = z.object({
  direction: z.enum(KANA_ATTEMPT_DIRECTIONS),
  kana: z.array(
    z.object({
      assistedCorrect: z
        .int()
        .describe('Correct on the first attempt after the hint was shown.'),
      attempts: z
        .int()
        .describe(
          'Recorded questions; independentCorrect + assistedCorrect + incorrect + skipped.',
        ),
      corrected: z
        .int()
        .describe(
          'Incorrect first attempts that were later retyped correctly.',
        ),
      incorrect: z
        .int()
        .describe('Incorrect on the first attempt, even if corrected later.'),
      independentCorrect: z
        .int()
        .describe('Correct on the first attempt without the hint.'),
      kanaId: z.string(),
      lastPracticedAt: z.iso.datetime(),
      skipped: z.int().describe('Skipped before any answer was submitted.'),
    }),
  ),
  script: z.enum(KANA_SCRIPTS),
});

export type KanaProgressResponse = z.infer<typeof kanaProgressResponseSchema>;
