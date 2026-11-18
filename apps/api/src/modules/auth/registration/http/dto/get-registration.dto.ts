import { z } from 'zod';

export const registrationResponseSchema = z.object({
  mode: z.enum(['closed', 'invite']),
});

export type RegistrationResponse = z.infer<typeof registrationResponseSchema>;
