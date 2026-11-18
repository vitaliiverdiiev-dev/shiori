import { invitationStatus } from '../../../model/helpers/invitation.policy.js';
import type { InvitationSummary } from '../../../model/types/invitation.types.js';
import type { InvitationRow } from '../schemas/invitation.schema.js';

export function toInvitationSummary(
  row: InvitationRow,
  now: Date,
): InvitationSummary {
  return {
    id: row.id,
    createdAt: row.createdAt,
    email: row.email,
    expiresAt: row.expiresAt,
    status: invitationStatus(row, now),
  };
}
