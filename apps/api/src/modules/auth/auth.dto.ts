import { z } from 'zod';

export const currentUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
});

export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
