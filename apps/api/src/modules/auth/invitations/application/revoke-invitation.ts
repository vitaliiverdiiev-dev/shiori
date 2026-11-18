import type { Database } from '#infrastructure/database/database.module.js';
import { revokeUnusedInvitation } from '../persistence/queries/invitation.queries.js';

export async function revokeInvitation(
  db: Database,
  id: string,
  now: Date = new Date(),
): Promise<boolean> {
  return revokeUnusedInvitation(db, id, now);
}
