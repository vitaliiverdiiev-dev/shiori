import type { BetterAuthOptions } from 'better-auth';
import {
  type BetterAuthInstance,
  createFirstAdmin,
  hasUserWithEmail,
  isAdminBootstrapCompleted,
} from '../../integrations/better-auth/adapters/admin-bootstrap.adapter.js';
import { normalizeEmail } from '../../model/helpers/email.js';
import {
  hasAllowedPasswordLength,
  isCommonPassword,
} from '../../model/helpers/password.policy.js';
import type {
  BootstrapResult,
  FirstAdminInput,
} from '../../model/types/admin-bootstrap.types.js';

export async function bootstrapFirstAdmin<Options extends BetterAuthOptions>(
  auth: BetterAuthInstance<Options>,
  input: FirstAdminInput,
): Promise<BootstrapResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email) return { ok: false, reason: 'invalid-email' };
  if (!name) return { ok: false, reason: 'invalid-name' };
  if (!hasAllowedPasswordLength(input.password)) {
    return { ok: false, reason: 'invalid-password' };
  }
  if (isCommonPassword(input.password)) {
    return { ok: false, reason: 'common-password' };
  }
  if (await isAdminBootstrapCompleted(auth)) {
    return { ok: false, reason: 'already-initialized' };
  }
  if (await hasUserWithEmail(auth, email)) {
    return { ok: false, reason: 'email-taken' };
  }
  return createFirstAdmin(auth, { email, name, password: input.password });
}
