import type { AuthContext, BetterAuthOptions } from '@better-auth/core';
import { runWithTransaction } from '@better-auth/core/context';
import { getCurrentAdapter } from 'better-auth';
import { isUniqueViolation } from '../../../infrastructure/database/postgres-errors.js';
import {
  normalizeEmail,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../domain/credentials.js';
import { INITIAL_ADMIN_BOOTSTRAP_ID } from '../persistence/admin-bootstrap.schema.js';

const ADMIN_BOOTSTRAP_KEY = 'admin_bootstrap_pkey';
const USER_EMAIL_UNIQUE = 'user_email_unique';

type BootstrapFailure =
  | 'already-initialized'
  | 'email-taken'
  | 'invalid-email'
  | 'invalid-name'
  | 'invalid-password';

export type BootstrapResult =
  { ok: false; reason: BootstrapFailure } | { ok: true; userId: string };

export interface FirstAdminInput {
  email: string;
  name: string;
  password: string;
}

export async function bootstrapFirstAdmin<Options extends BetterAuthOptions>(
  auth: { $context: Promise<AuthContext<Options>> },
  input: FirstAdminInput,
): Promise<BootstrapResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email) return failure('invalid-email');
  if (!name) return failure('invalid-name');
  if (
    input.password.length < PASSWORD_MIN_LENGTH ||
    input.password.length > PASSWORD_MAX_LENGTH
  ) {
    return failure('invalid-password');
  }

  const context = await auth.$context;
  const completed = await context.adapter.findOne({
    model: 'adminBootstrap',
    where: [{ field: 'id', value: INITIAL_ADMIN_BOOTSTRAP_ID }],
  });
  if (completed) return failure('already-initialized');
  if (await context.internalAdapter.findUserByEmail(email)) {
    return failure('email-taken');
  }

  const passwordHash = await context.password.hash(input.password);
  try {
    const userId = await runWithTransaction(context.adapter, async () => {
      const adapter = await getCurrentAdapter(context.adapter);
      await adapter.create({
        data: { id: INITIAL_ADMIN_BOOTSTRAP_ID, completedAt: new Date() },
        forceAllowId: true,
        model: 'adminBootstrap',
      });
      const user = await context.internalAdapter.createUser(
        { email, emailVerified: false, name, role: 'admin' },
        { method: 'email-password' },
      );
      await context.internalAdapter.linkAccount({
        accountId: user.id,
        password: passwordHash,
        providerId: 'credential',
        userId: user.id,
      });
      return user.id;
    });
    return { ok: true, userId };
  } catch (error) {
    if (isUniqueViolation(error, ADMIN_BOOTSTRAP_KEY)) {
      return failure('already-initialized');
    }
    if (isUniqueViolation(error, USER_EMAIL_UNIQUE))
      return failure('email-taken');
    throw error;
  }
}

function failure(reason: BootstrapFailure): BootstrapResult {
  return { ok: false, reason };
}
