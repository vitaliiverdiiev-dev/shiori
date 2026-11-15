import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const CODE_BYTES = 32;
const CODE_LENGTH = 43;

export const invitationCodeSchema = z
  .string()
  .length(CODE_LENGTH)
  .regex(/^[\w-]+$/);

export function generateInvitationCode(): string {
  return randomBytes(CODE_BYTES).toString('base64url');
}

export function hashInvitationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
