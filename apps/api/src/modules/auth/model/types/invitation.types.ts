export type CreateInvitationResult =
  | { code: string; invitation: InvitationSummary; ok: true }
  | { ok: false; reason: 'email-taken' | 'invalid-email' };

export interface InvitationOutcome {
  expiresAt: Date;
  revokedAt: Date | null;
  usedAt: Date | null;
}

export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'used';

export interface InvitationSummary {
  id: string;
  createdAt: Date;
  email: string;
  expiresAt: Date;
  status: InvitationStatus;
}
