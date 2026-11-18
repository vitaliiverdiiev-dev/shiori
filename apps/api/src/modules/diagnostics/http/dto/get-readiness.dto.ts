import { z } from 'zod';

export const readyResponseSchema = z.object({
  checks: z.object({ database: z.literal('up') }),
  status: z.literal('ok'),
});

export const notReadyResponseSchema = z.object({
  checks: z.object({ database: z.literal('down') }),
  status: z.literal('error'),
});

export type NotReadyResponse = z.infer<typeof notReadyResponseSchema>;
export type ReadyResponse = z.infer<typeof readyResponseSchema>;
