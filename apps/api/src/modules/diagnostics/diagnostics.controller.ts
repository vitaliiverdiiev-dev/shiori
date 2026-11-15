import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import type { QueryConfig } from 'pg';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.module.js';
import { toOpenApiSchema } from '../../infrastructure/openapi/zod-schema.js';
import { AllowAnonymous } from '../auth/index.js';
import {
  type HealthResponse,
  healthResponseSchema,
  type NotReadyResponse,
  notReadyResponseSchema,
  type ReadyResponse,
  readyResponseSchema,
} from './diagnostics.dto.js';

const READY_QUERY_TIMEOUT_MS = 2_000;

// COMPAT(@types/pg@8.23): pg honours a per-query query_timeout that the types declare only on the client config.
const readyQuery: QueryConfig & { query_timeout: number } = {
  query_timeout: READY_QUERY_TIMEOUT_MS,
  text: 'select 1',
};

@AllowAnonymous()
@Controller()
export class DiagnosticsController {
  private readonly logger = new Logger(DiagnosticsController.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @ApiOkResponse({
    description: 'The API process is running.',
    schema: toOpenApiSchema(healthResponseSchema),
  })
  @ApiOperation({ operationId: 'getHealth', summary: 'Liveness probe' })
  @Get('health')
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }

  @ApiOkResponse({
    description: 'The database is reachable.',
    schema: toOpenApiSchema(readyResponseSchema),
  })
  @ApiOperation({ operationId: 'getReady', summary: 'Readiness probe' })
  @ApiServiceUnavailableResponse({
    description: 'The database is unreachable or too slow.',
    schema: toOpenApiSchema(notReadyResponseSchema),
  })
  @Get('ready')
  async getReady(): Promise<ReadyResponse> {
    try {
      await this.db.$client.query(readyQuery);
      return { checks: { database: 'up' }, status: 'ok' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Database readiness check failed: ${reason}`);
      const body: NotReadyResponse = {
        checks: { database: 'down' },
        status: 'error',
      };
      throw new ServiceUnavailableException(body);
    }
  }
}
