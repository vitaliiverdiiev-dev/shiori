import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from '#infrastructure/database/database.module.js';
import { adminBootstrap } from '../../../admin-bootstrap/persistence/schemas/admin-bootstrap.schema.js';
import { invitation } from '../../../invitations/persistence/schemas/invitation.schema.js';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../../model/constants/password.constants.js';
import type { RegistrationMode } from '../../../model/types/registration.types.js';
import * as authSchema from '../../../persistence/schemas/auth.schema.js';
import { adminBootstrapPlugin } from '../plugins/admin-bootstrap.plugin.js';
import { invitationPlugin } from '../plugins/invitation.plugin.js';

const DAY_SECONDS = 86_400;
const SESSION_DAYS = 7;

export type Auth = ReturnType<typeof createAuth>;

export interface AuthEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  REGISTRATION_MODE: RegistrationMode;
}

export interface AuthSettings {
  baseURL: string;
  registrationMode: RegistrationMode;
  secret: string;
}

export function authSettingsFromEnv(env: AuthEnv): AuthSettings {
  return {
    baseURL: env.BETTER_AUTH_URL,
    registrationMode: env.REGISTRATION_MODE,
    secret: env.BETTER_AUTH_SECRET,
  };
}

export function betterAuthOptions(db: Database, settings: AuthSettings) {
  return {
    // COMPAT(better-auth@1.7.23): Origin checks default to off when NODE_ENV=test or TEST is set.
    advanced: { disableOriginCheck: false },
    // COMPAT(@thallesp/nestjs-better-auth@2.8.0): The Nest global prefix is not applied to Better Auth routes.
    basePath: '/api/auth',
    baseURL: settings.baseURL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { ...authSchema, adminBootstrap, invitation },
      // INVARIANT: Invitation claims share the sign-up transaction; without it a failed sign-up burns the invitation.
      transaction: true,
    }),
    emailAndPassword: {
      autoSignIn: false,
      disableSignUp: settings.registrationMode !== 'invite',
      enabled: true,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      minPasswordLength: PASSWORD_MIN_LENGTH,
    },
    plugins: [adminBootstrapPlugin, invitationPlugin],
    secret: settings.secret,
    session: {
      expiresIn: SESSION_DAYS * DAY_SECONDS,
      updateAge: DAY_SECONDS,
    },
    telemetry: { enabled: false },
    user: {
      additionalFields: {
        role: {
          defaultValue: 'user',
          input: false,
          required: true,
          type: ['user', 'admin'],
        },
      },
    },
  } satisfies BetterAuthOptions;
}

export function createAuth(db: Database, settings: AuthSettings) {
  return betterAuth(betterAuthOptions(db, settings));
}
