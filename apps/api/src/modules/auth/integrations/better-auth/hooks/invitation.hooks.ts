import {
  type GenericEndpointContext,
  getCurrentAdapter,
  type HookEndpointContext,
  type Where,
} from 'better-auth';
import {
  APIError,
  type AuthMiddleware,
  createAuthMiddleware,
} from 'better-auth/api';
import { z } from 'zod';
import { hashInvitationCode } from '../../../model/helpers/invitation-code.js';
import { invitationCodeSchema } from '../../../model/schemas/invitation-code.validation.js';

const SIGN_UP_PATH = '/sign-up/email';

const signUpInvitationSchema = z.object({
  email: z.string(),
  invitationCode: invitationCodeSchema,
});

export const requireInvitationBeforeSignUp: {
  handler: AuthMiddleware;
  matcher: (context: HookEndpointContext) => boolean;
} = {
  handler: createAuthMiddleware(async (context) => {
    if (context.context.options.emailAndPassword?.disableSignUp) return;
    const parsed = signUpInvitationSchema.safeParse(context.body);
    const where = usableInvitationWhere(
      context.body,
      parsed.success ? parsed.data.email : '',
      new Date(),
    );
    const found = where
      ? await context.context.adapter.findOne({ model: 'invitation', where })
      : null;
    if (!found) throw invalidInvitation();
  }),
  matcher: (context) => context.path === SIGN_UP_PATH,
};

export async function claimInvitationForNewUser(
  user: { email: string },
  context: GenericEndpointContext | null,
): Promise<void> {
  const isServerSideCreation = !context;
  if (isServerSideCreation) return;
  if (context.path !== SIGN_UP_PATH) {
    throw APIError.from('BAD_REQUEST', {
      code: 'ACCOUNT_CREATION_DISABLED',
      message: 'Accounts can only be created through sign-up.',
    });
  }
  const now = new Date();
  const where = usableInvitationWhere(context.body, user.email, now);
  if (!where) throw invalidInvitation();
  const adapter = await getCurrentAdapter(context.context.adapter);
  const claimed = await adapter.updateMany({
    model: 'invitation',
    update: { usedAt: now },
    where,
  });
  if (claimed !== 1) throw invalidInvitation();
}

function invalidInvitation(): APIError {
  return APIError.from('BAD_REQUEST', {
    code: 'INVALID_INVITATION',
    message: 'The invitation is invalid or has expired.',
  });
}

function usableInvitationWhere(
  body: unknown,
  email: string,
  now: Date,
): undefined | Where[] {
  const parsed = signUpInvitationSchema.safeParse(body);
  if (!parsed.success) return undefined;
  return [
    {
      field: 'codeHash',
      value: hashInvitationCode(parsed.data.invitationCode),
    },
    { field: 'email', value: email.toLowerCase() },
    { field: 'usedAt', value: null },
    { field: 'revokedAt', value: null },
    { field: 'expiresAt', operator: 'gt', value: now },
  ];
}
