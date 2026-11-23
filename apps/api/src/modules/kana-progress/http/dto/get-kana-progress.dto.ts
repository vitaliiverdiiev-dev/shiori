import { z } from 'zod';
import {
  KANA_ATTEMPT_DIRECTIONS,
  KANA_SCRIPTS,
} from '../../model/constants/kana-attempt.constants.js';

export const kanaProgressQuerySchema = z.strictObject({
  direction: z.enum(KANA_ATTEMPT_DIRECTIONS).default('kana-to-romaji'),
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
          'Recorded results of this kana in this direction, one per question that expected it; independentCorrect + assistedCorrect + incorrect + skipped. A romaji → kana question with several expected kana gives each of them one result, so these counts are not numbers of questions.',
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
      lastPracticedAt: z.iso
        .datetime()
        .describe('When the server saved the latest attempt.'),
      skipped: z.int().describe('Skipped before any answer was submitted.'),
    }),
  ),
  script: z.enum(KANA_SCRIPTS),
});

export type KanaProgressResponse = z.infer<typeof kanaProgressResponseSchema>;
