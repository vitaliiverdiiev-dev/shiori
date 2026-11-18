import { z } from 'zod';

export function normalizeEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase();
  return z.email().safeParse(email).success ? email : undefined;
}
