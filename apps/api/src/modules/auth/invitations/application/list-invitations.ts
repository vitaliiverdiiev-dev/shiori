import type { Database } from '#infrastructure/database/database.module.js';
import type { InvitationSummary } from '../../model/types/invitation.types.js';
import { toInvitationSummary } from '../persistence/mappers/invitation-row.mapper.js';
import { selectInvitationsNewestFirst } from '../persistence/queries/invitation.queries.js';

export async function listInvitations(
  db: Database,
  now: Date = new Date(),
): Promise<InvitationSummary[]> {
  const rows = await selectInvitationsNewestFirst(db);
  return rows.map((row) => toInvitationSummary(row, now));
}
