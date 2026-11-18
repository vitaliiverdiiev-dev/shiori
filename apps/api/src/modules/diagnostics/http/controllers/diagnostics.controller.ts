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
import {
  DATABASE,
  type Database,
} from '#infrastructure/database/database.module.js';
import { toOpenApiSchema } from '#infrastructure/openapi/zod-schema.js';
import { AllowAnonymous } from '../../../auth/index.js';
import { checkDatabaseReadiness } from '../../application/check-database-readiness.js';
import {
  type HealthResponse,
  healthResponseSchema,
} from '../dto/get-health.dto.js';
import {
  type NotReadyResponse,
  notReadyResponseSchema,
  type ReadyResponse,
  readyResponseSchema,
} from '../dto/get-readiness.dto.js';

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
    const readiness = await checkDatabaseReadiness(this.db);
    if (readiness.ready) return { checks: { database: 'up' }, status: 'ok' };
    this.logger.warn(`Database readiness check failed: ${readiness.reason}`);
    const body: NotReadyResponse = {
      checks: { database: 'down' },
      status: 'error',
    };
    throw new ServiceUnavailableException(body);
  }
}
