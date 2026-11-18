import type {
  InvitationOutcome,
  InvitationStatus,
} from '../types/invitation.types.js';

export function invitationStatus(
  invitation: InvitationOutcome,
  now: Date,
): InvitationStatus {
  if (invitation.usedAt) return 'used';
  if (invitation.revokedAt) return 'revoked';
  return invitation.expiresAt <= now ? 'expired' : 'active';
}
