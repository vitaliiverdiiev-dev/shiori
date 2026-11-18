import type { AuthContext, BetterAuthOptions } from '@better-auth/core';
import { runWithTransaction } from '@better-auth/core/context';
import { getCurrentAdapter } from 'better-auth';
import { isUniqueViolation } from '#infrastructure/database/postgres-errors.js';
import { INITIAL_ADMIN_BOOTSTRAP_ID } from '../../../model/constants/admin-bootstrap.constants.js';
import type {
  BootstrapResult,
  FirstAdminInput,
} from '../../../model/types/admin-bootstrap.types.js';

const ADMIN_BOOTSTRAP_KEY = 'admin_bootstrap_pkey';
const USER_EMAIL_UNIQUE = 'user_email_unique';

export interface BetterAuthInstance<Options extends BetterAuthOptions> {
  $context: Promise<AuthContext<Options>>;
}

export async function createFirstAdmin<Options extends BetterAuthOptions>(
  auth: BetterAuthInstance<Options>,
  { email, name, password }: FirstAdminInput,
): Promise<BootstrapResult> {
  const context = await auth.$context;
  const passwordHash = await context.password.hash(password);
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
      return { ok: false, reason: 'already-initialized' };
    }
    if (isUniqueViolation(error, USER_EMAIL_UNIQUE)) {
      return { ok: false, reason: 'email-taken' };
    }
    throw error;
  }
}

export async function hasUserWithEmail<Options extends BetterAuthOptions>(
  auth: BetterAuthInstance<Options>,
  email: string,
): Promise<boolean> {
  const context = await auth.$context;
  return Boolean(await context.internalAdapter.findUserByEmail(email));
}

export async function isAdminBootstrapCompleted<
  Options extends BetterAuthOptions,
>(auth: BetterAuthInstance<Options>): Promise<boolean> {
  const context = await auth.$context;
  const completed = await context.adapter.findOne({
    model: 'adminBootstrap',
    where: [{ field: 'id', value: INITIAL_ADMIN_BOOTSTRAP_ID }],
  });
  return Boolean(completed);
}
