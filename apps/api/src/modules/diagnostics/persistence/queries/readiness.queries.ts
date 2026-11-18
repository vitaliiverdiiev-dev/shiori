import type { QueryConfig } from 'pg';
import type { Database } from '#infrastructure/database/database.module.js';

const READY_QUERY_TIMEOUT_MS = 2_000;

// COMPAT(@types/pg@8.23): pg honours a per-query query_timeout that the types declare only on the client config.
const readyQuery: QueryConfig & { query_timeout: number } = {
  query_timeout: READY_QUERY_TIMEOUT_MS,
  text: 'select 1',
};

export async function pingDatabase(db: Database): Promise<void> {
  await db.$client.query(readyQuery);
}
