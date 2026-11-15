import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export function normalizeEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase();
  return z.email().safeParse(email).success ? email : undefined;
}
