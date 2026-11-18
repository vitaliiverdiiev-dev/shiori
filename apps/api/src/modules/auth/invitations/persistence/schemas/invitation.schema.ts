import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    codeHash: text('code_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    email: text('email').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [
    check(
      'invitation_email_normalized',
      sql`${table.email} = lower(btrim(${table.email})) and ${table.email} <> ''`,
    ),
    check(
      'invitation_single_outcome',
      sql`num_nonnulls(${table.usedAt}, ${table.revokedAt}) <= 1`,
    ),
    check(
      'invitation_expires_after_creation',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export type InvitationRow = typeof invitation.$inferSelect;
