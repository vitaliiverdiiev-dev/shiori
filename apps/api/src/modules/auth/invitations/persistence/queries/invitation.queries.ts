import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database } from '#infrastructure/database/database.module.js';
import {
  invitation,
  type InvitationRow,
} from '../schemas/invitation.schema.js';

export interface NewInvitation {
  codeHash: string;
  createdAt: Date;
  email: string;
  expiresAt: Date;
}

export async function insertInvitation(
  db: Database,
  values: NewInvitation,
): Promise<InvitationRow> {
  const [row] = await db
    .insert(invitation)
    .values({ id: randomUUID(), ...values })
    .returning();
  if (!row) throw new Error('Invitation insert returned no row');
  return row;
}

export async function revokeUnusedInvitation(
  db: Database,
  id: string,
  revokedAt: Date,
): Promise<boolean> {
  const revoked = await db
    .update(invitation)
    .set({ revokedAt })
    .where(
      and(
        eq(invitation.id, id),
        isNull(invitation.usedAt),
        isNull(invitation.revokedAt),
      ),
    )
    .returning({ id: invitation.id });
  return revoked.length > 0;
}

export async function selectInvitationsNewestFirst(
  db: Database,
): Promise<InvitationRow[]> {
  return db.select().from(invitation).orderBy(desc(invitation.createdAt));
}
