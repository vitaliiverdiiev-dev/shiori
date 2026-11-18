import { createInvitation } from '../invitations/application/create-invitation.js';
import { listInvitations } from '../invitations/application/list-invitations.js';
import { revokeInvitation } from '../invitations/application/revoke-invitation.js';
import { INVITATION_LIFETIME_DAYS } from '../model/constants/invitation.constants.js';
import type { AuthCliDependencies } from './auth-cli.types.js';

export async function inviteCreateCommand(
  { db, io }: AuthCliDependencies,
  email: string,
): Promise<boolean> {
  const result = await createInvitation(db, email);
  if (!result.ok) {
    io.error(
      result.reason === 'email-taken'
        ? 'An account with this email already exists.'
        : 'That is not a valid email address.',
    );
    return false;
  }
  const { code, invitation } = result;
  io.print(
    `Invitation for ${invitation.email}, valid for ${String(INVITATION_LIFETIME_DAYS)} days (until ${invitation.expiresAt.toISOString()}).`,
  );
  io.print(`Code (shown only now): ${code}`);
  return true;
}

export async function inviteListCommand({
  db,
  io,
}: AuthCliDependencies): Promise<boolean> {
  const invitations = await listInvitations(db);
  if (invitations.length === 0) {
    io.print('No invitations.');
    return true;
  }
  for (const invitation of invitations) {
    io.print(
      [
        invitation.id,
        invitation.email,
        invitation.status,
        `expires ${invitation.expiresAt.toISOString()}`,
      ].join('  '),
    );
  }
  return true;
}

export async function inviteRevokeCommand(
  { db, io }: AuthCliDependencies,
  id: string,
): Promise<boolean> {
  if (await revokeInvitation(db, id)) {
    io.print('Invitation revoked.');
    return true;
  }
  io.error('No unused, unrevoked invitation has that id.');
  return false;
}
