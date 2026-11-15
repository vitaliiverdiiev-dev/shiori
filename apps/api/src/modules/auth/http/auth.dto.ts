import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

export const currentUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
});

export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;

export const registrationResponseSchema = z.object({
  mode: z.enum(['closed', 'invite']),
});

export type RegistrationResponse = z.infer<typeof registrationResponseSchema>;

export const unauthorizedResponseSchema = z.object({
  message: z.string(),
  statusCode: z.literal(HttpStatus.UNAUTHORIZED),
});
