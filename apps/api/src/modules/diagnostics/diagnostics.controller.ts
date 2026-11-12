import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryConfig } from 'pg';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.module.js';

export interface HealthResponse {
  status: 'ok';
}

export interface ReadinessResponse {
  checks: { database: 'down' | 'up' };
  status: 'error' | 'ok';
}

const READY_QUERY_TIMEOUT_MS = 2_000;

// pg honours a per-query `query_timeout` (client-side), but @types/pg only
// declares it on the client config, hence the widened type.
const readyQuery: QueryConfig & { query_timeout: number } = {
  query_timeout: READY_QUERY_TIMEOUT_MS,
  text: 'select 1',
};

/** Liveness and readiness probes (`/api/health`, `/api/ready`). */
@Controller()
export class DiagnosticsController {
  private readonly logger = new Logger(DiagnosticsController.name);

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
      return { checks: { database: 'up' }, status: 'ok' };
    } catch (error) {
      // Details stay in the server log; the response body is fixed.
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Database readiness check failed: ${reason}`);
      const body: ReadinessResponse = {
        checks: { database: 'down' },
        status: 'error',
      };
      throw new ServiceUnavailableException(body);
    }
  }
}
