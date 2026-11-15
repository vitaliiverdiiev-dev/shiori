import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../../infrastructure/database/database.module.js';
import { normalizeEmail } from '../domain/credentials.js';
import {
  generateInvitationCode,
  hashInvitationCode,
} from '../domain/invitation-code.js';
import { user } from '../persistence/auth.schema.js';
import { invitation } from '../persistence/invitation.schema.js';

const DAY_MS = 86_400_000;
export const INVITATION_LIFETIME_DAYS = 7;

export type CreateInvitationResult =
  | { code: string; invitation: InvitationSummary; ok: true }
  | { ok: false; reason: 'email-taken' | 'invalid-email' };

export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'used';

export interface InvitationSummary {
  id: string;
  createdAt: Date;
  email: string;
  expiresAt: Date;
  status: InvitationStatus;
}

export async function createInvitation(
  db: Database,
  rawEmail: string,
  now: Date = new Date(),
): Promise<CreateInvitationResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, reason: 'invalid-email' };
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  if (existing) return { ok: false, reason: 'email-taken' };

  const code = generateInvitationCode();
  const [row] = await db
    .insert(invitation)
    .values({
      id: randomUUID(),
      codeHash: hashInvitationCode(code),
      createdAt: now,
      email,
      expiresAt: new Date(now.getTime() + INVITATION_LIFETIME_DAYS * DAY_MS),
    })
    .returning();
  if (!row) throw new Error('Invitation insert returned no row');
  return { code, invitation: summarize(row, now), ok: true };
}

export async function listInvitations(
  db: Database,
  now: Date = new Date(),
): Promise<InvitationSummary[]> {
  const rows = await db
    .select()
    .from(invitation)
    .orderBy(desc(invitation.createdAt));
  return rows.map((row) => summarize(row, now));
}

export async function revokeInvitation(
  db: Database,
  id: string,
  now: Date = new Date(),
): Promise<boolean> {
  const revoked = await db
    .update(invitation)
    .set({ revokedAt: now })
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

function statusOf(
  row: typeof invitation.$inferSelect,
  now: Date,
): InvitationStatus {
  if (row.usedAt) return 'used';
  if (row.revokedAt) return 'revoked';
  return row.expiresAt <= now ? 'expired' : 'active';
}

function summarize(
  row: typeof invitation.$inferSelect,
  now: Date,
): InvitationSummary {
  return {
    id: row.id,
    createdAt: row.createdAt,
    email: row.email,
    expiresAt: row.expiresAt,
    status: statusOf(row, now),
  };
}
