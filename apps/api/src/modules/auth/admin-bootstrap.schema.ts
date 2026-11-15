import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const INITIAL_ADMIN_BOOTSTRAP_ID = 'initial';

export const adminBootstrap = pgTable(
  'admin_bootstrap',
  {
    id: text('id').primaryKey(),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'admin_bootstrap_single_row',
      sql`${table.id} = ${sql.raw(`'${INITIAL_ADMIN_BOOTSTRAP_ID}'`)}`,
    ),
  ],
);
