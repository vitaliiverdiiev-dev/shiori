import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import {
  KANA_ATTEMPT_DIRECTIONS,
  KANA_ATTEMPT_OUTCOMES,
  MAX_ANSWER_LENGTH,
  MAX_ATTEMPTS_PER_REQUEST,
  MAX_KANA_ID_LENGTH,
  MAX_QUESTIONS_PER_ROUND,
  MAX_USER_ID_LENGTH,
} from '../../model/constants/kana-attempt.constants.js';

const occurrenceSchema = z.strictObject({
  questionIndex: z
    .int()
    .min(0)
    .max(MAX_QUESTIONS_PER_ROUND - 1),
  roundId: z.uuid(),
});

export const recordKanaAttemptsRequestSchema = z.strictObject({
  attempts: z
    .array(
      occurrenceSchema.extend({
        answer: z.string().max(MAX_ANSWER_LENGTH),
        corrected: z.boolean(),
        direction: z.enum(KANA_ATTEMPT_DIRECTIONS),
        hintUsed: z.boolean(),
        kanaId: z.string().max(MAX_KANA_ID_LENGTH),
        outcome: z.enum(KANA_ATTEMPT_OUTCOMES),
      }),
    )
    .min(1)
    .max(MAX_ATTEMPTS_PER_REQUEST),
  userId: z
    .string()
    .min(1)
    .max(MAX_USER_ID_LENGTH)
    .describe(
      'The user the client recorded these attempts for. It must equal the session user; ownership always comes from the session.',
    ),
});

export const recordKanaAttemptsResponseSchema = z.object({
  duplicates: z.int(),
  recorded: z.int(),
});

export type RecordKanaAttemptsResponse = z.infer<
  typeof recordKanaAttemptsResponseSchema
>;

export const kanaAttemptsConflictResponseSchema = z.object({
  conflicts: z.array(occurrenceSchema),
  message: z.string(),
  statusCode: z.literal(HttpStatus.CONFLICT),
});

export type KanaAttemptsConflictResponse = z.infer<
  typeof kanaAttemptsConflictResponseSchema
>;

export const kanaAttemptsInvalidResponseSchema = z.object({
  invalidIndexes: z
    .array(
      z
        .int()
        .min(0)
        .max(MAX_ATTEMPTS_PER_REQUEST - 1),
    )
    .min(1)
    .optional()
    .describe(
      'Positions in `attempts` of every invalid entry. Absent when the request is invalid as a whole.',
    ),
  message: z.string(),
  statusCode: z.literal(HttpStatus.BAD_REQUEST),
});

export type KanaAttemptsInvalidResponse = z.infer<
  typeof kanaAttemptsInvalidResponseSchema
>;

export const errorResponseSchema = (status: HttpStatus) =>
  z.object({ message: z.string(), statusCode: z.literal(status) });
