import { createHash, randomBytes } from 'node:crypto';
import { INVITATION_CODE_BYTES } from '../constants/invitation.constants.js';

export function generateInvitationCode(): string {
  return randomBytes(INVITATION_CODE_BYTES).toString('base64url');
}

export function hashInvitationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
