import {
  type BetterAuthPlugin,
  getCurrentAdapter,
  type Where,
} from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { z } from 'zod';
import {
  hashInvitationCode,
  invitationCodeSchema,
} from '../domain/invitation-code.js';

const SIGN_UP_PATH = '/sign-up/email';

const signUpInvitationSchema = z.object({
  email: z.string(),
  invitationCode: invitationCodeSchema,
});

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

export const invitationPlugin = {
  id: 'invitation',
  hooks: {
    before: [
      {
        handler: createAuthMiddleware(async (context) => {
          if (context.context.options.emailAndPassword?.disableSignUp) return;
          const parsed = signUpInvitationSchema.safeParse(context.body);
          const where = usableInvitationWhere(
            context.body,
            parsed.success ? parsed.data.email : '',
            new Date(),
          );
          const found = where
            ? await context.context.adapter.findOne({
                model: 'invitation',
                where,
              })
            : null;
          if (!found) throw invalidInvitation();
        }),
        matcher: (context) => context.path === SIGN_UP_PATH,
      },
    ],
  },
  init: () => ({
    options: {
      databaseHooks: {
        user: {
          create: {
            before: async (user, context) => {
              const isServerSideCreation = !context;
              if (isServerSideCreation) return;
              if (context.path !== SIGN_UP_PATH) {
                throw APIError.from('BAD_REQUEST', {
                  code: 'ACCOUNT_CREATION_DISABLED',
                  message: 'Accounts can only be created through sign-up.',
                });
              }
              const now = new Date();
              const where = usableInvitationWhere(
                context.body,
                user.email,
                now,
              );
              if (!where) throw invalidInvitation();
              const adapter = await getCurrentAdapter(context.context.adapter);
              const claimed = await adapter.updateMany({
                model: 'invitation',
                update: { usedAt: now },
                where,
              });
              if (claimed !== 1) throw invalidInvitation();
            },
          },
        },
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
