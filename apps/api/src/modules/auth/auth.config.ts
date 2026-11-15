import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Env } from '../../infrastructure/config/env.js';
import type { Database } from '../../infrastructure/database/database.module.js';
import { adminBootstrapPlugin } from './admin-bootstrap.plugin.js';
import { adminBootstrap } from './admin-bootstrap.schema.js';
import * as authSchema from './auth.schema.js';
import { invitationPlugin } from './invitation.plugin.js';
import { invitation } from './invitation.schema.js';

const DAY_SECONDS = 86_400;
const SESSION_DAYS = 7;

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export type Auth = ReturnType<typeof createAuth>;

export interface AuthSettings {
  baseURL: string;
  registrationMode: RegistrationMode;
  secret: string;
}

export type RegistrationMode = 'closed' | 'invite';

export function authSettingsFromEnv(
  env: Pick<
    Env,
    'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'REGISTRATION_MODE'
  >,
): AuthSettings {
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
