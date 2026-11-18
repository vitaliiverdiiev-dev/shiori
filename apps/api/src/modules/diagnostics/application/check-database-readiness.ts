import type { Database } from '#infrastructure/database/database.module.js';
import { pingDatabase } from '../persistence/queries/readiness.queries.js';

export async function checkDatabaseReadiness(
  db: Database,
): Promise<{ ready: false; reason: string } | { ready: true }> {
  try {
    await pingDatabase(db);
    return { ready: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return { ready: false, reason };
  }
}
