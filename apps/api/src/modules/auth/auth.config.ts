import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from '../../infrastructure/database/database.module.js';
import * as schema from './auth.schema.js';

const DAY_SECONDS = 86_400;
const SESSION_DAYS = 7;

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export type Auth = ReturnType<typeof createAuth>;

export interface AuthOptions {
  /** Public origin the browser uses (the web app behind the same-origin `/api` proxy). */
  baseURL: string;
  secret: string;
}

/** Shiori's Better Auth configuration; feasibility tests vary single options from it. */
export function authOptions(db: Database, options: AuthOptions) {
  return {
    // Better Auth disables its Origin/CSRF check when NODE_ENV=test or TEST
    // is set; keep it on everywhere.
    advanced: { disableOriginCheck: false },
    // Absolute: the Nest global prefix is not applied to Better Auth routes.
    basePath: '/api/auth',
    baseURL: options.baseURL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
      // Sign-up's user + account inserts (and database hooks) commit or roll back together.
      transaction: true,
    }),
    emailAndPassword: {
      autoSignIn: false,
      // Registration is closed until invitations exist (M02.2).
      disableSignUp: true,
      enabled: true,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      minPasswordLength: PASSWORD_MIN_LENGTH,
    },
    secret: options.secret,
    // Database-backed sessions only: no cookie cache, 7-day rolling expiry.
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

export function createAuth(db: Database, options: AuthOptions) {
  return betterAuth(authOptions(db, options));
}
