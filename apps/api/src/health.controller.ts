import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryConfig } from 'pg';
import { DATABASE, type Database } from './database/database.module.js';

export interface HealthResponse {
  status: 'ok';
}

export interface ReadinessResponse {
  status: 'ok' | 'error';
  checks: { database: 'up' | 'down' };
}

// pg honours a per-query `query_timeout` (client-side), but @types/pg only
// declares it on the client config, hence the widened type.
const readyQuery: QueryConfig & { query_timeout: number } = {
  text: 'select 1',
  query_timeout: 2_000,
};

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Liveness: the process answers. Never touches the database. */
  @Get('health')
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }

  /** Readiness: the database answers a trivial query within a bounded time. */
  @Get('ready')
  async getReady(): Promise<ReadinessResponse> {
    try {
      await this.db.$client.query(readyQuery);
      return { status: 'ok', checks: { database: 'up' } };
    } catch (error) {
      // Details stay in the server log; the response body is fixed.
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Database readiness check failed: ${reason}`);
      const body: ReadinessResponse = {
        status: 'error',
        checks: { database: 'down' },
      };
      throw new ServiceUnavailableException(body);
    }
  }
}
