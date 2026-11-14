import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// COMPAT(better-auth@1.7.23): Must match getAuthTables(options); re-verify on upgrade (docs/03-architecture.md).

const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    createdAt: createdAt(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    name: text('name').notNull(),
    role: text('role', { enum: ['user', 'admin'] })
      .default('user')
      .notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('user_role_check', sql`${table.role} in ('user', 'admin')`),
  ],
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    token: text('token').notNull().unique(),
    updatedAt: updatedAt(),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accessToken: text('access_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    accountId: text('account_id').notNull(),
    createdAt: createdAt(),
    idToken: text('id_token'),
    password: text('password'),
    providerId: text('provider_id').notNull(),
    refreshToken: text('refresh_token'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    updatedAt: updatedAt(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    identifier: text('identifier').notNull(),
    updatedAt: updatedAt(),
    value: text('value').notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);
