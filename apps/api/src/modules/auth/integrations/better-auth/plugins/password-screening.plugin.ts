import type { BetterAuthPlugin } from 'better-auth';
import { rejectCommonPasswords } from '../hooks/password.hooks.js';

export const passwordScreeningPlugin = {
  id: 'password-screening',
  hooks: { before: [rejectCommonPasswords] },
} satisfies BetterAuthPlugin;
