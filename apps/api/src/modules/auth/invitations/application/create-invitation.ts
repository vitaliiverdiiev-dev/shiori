import type { Database } from '#infrastructure/database/database.module.js';
import { INVITATION_LIFETIME_DAYS } from '../../model/constants/invitation.constants.js';
import { normalizeEmail } from '../../model/helpers/email.js';
import {
  generateInvitationCode,
  hashInvitationCode,
} from '../../model/helpers/invitation-code.js';
import type { CreateInvitationResult } from '../../model/types/invitation.types.js';
import { isEmailRegistered } from '../../persistence/queries/user.queries.js';
import { toInvitationSummary } from '../persistence/mappers/invitation-row.mapper.js';
import { insertInvitation } from '../persistence/queries/invitation.queries.js';

const DAY_MS = 86_400_000;

export async function createInvitation(
  db: Database,
  rawEmail: string,
  now: Date = new Date(),
): Promise<CreateInvitationResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, reason: 'invalid-email' };
  if (await isEmailRegistered(db, email)) {
    return { ok: false, reason: 'email-taken' };
  }

  const code = generateInvitationCode();
  const row = await insertInvitation(db, {
    codeHash: hashInvitationCode(code),
    createdAt: now,
    email,
    expiresAt: new Date(now.getTime() + INVITATION_LIFETIME_DAYS * DAY_MS),
  });
  return { code, invitation: toInvitationSummary(row, now), ok: true };
}
