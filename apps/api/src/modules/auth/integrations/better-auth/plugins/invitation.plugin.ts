import type { BetterAuthPlugin } from 'better-auth';
import {
  claimInvitationForNewUser,
  requireInvitationBeforeSignUp,
} from '../hooks/invitation.hooks.js';

export const invitationPlugin = {
  id: 'invitation',
  hooks: { before: [requireInvitationBeforeSignUp] },
  init: () => ({
    options: {
      databaseHooks: {
        user: { create: { before: claimInvitationForNewUser } },
      },
    },
  }),
  schema: {
    invitation: {
      fields: {
        codeHash: { required: true, type: 'string', unique: true },
        createdAt: { required: true, type: 'date' },
        email: { required: true, type: 'string' },
        expiresAt: { required: true, type: 'date' },
        revokedAt: { required: false, type: 'date' },
        usedAt: { required: false, type: 'date' },
      },
    },
  },
} satisfies BetterAuthPlugin;
