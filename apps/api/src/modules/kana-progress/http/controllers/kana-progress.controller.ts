import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import {
  DATABASE,
  type Database,
} from '#infrastructure/database/database.module.js';
import { toOpenApiSchema } from '#infrastructure/openapi/zod-schema.js';
import { getKanaProgress } from '../../application/get-kana-progress.js';
import { recordKanaAttempts } from '../../application/record-kana-attempts.js';
import {
  KANA_ATTEMPT_DIRECTIONS,
  KANA_SCRIPTS,
} from '../../model/constants/kana-attempt.constants.js';
import {
  kanaProgressQuerySchema,
  type KanaProgressResponse,
  kanaProgressResponseSchema,
} from '../dto/get-kana-progress.dto.js';
import {
  errorResponseSchema,
  type KanaAttemptsConflictResponse,
  kanaAttemptsConflictResponseSchema,
  recordKanaAttemptsRequestSchema,
  type RecordKanaAttemptsResponse,
  recordKanaAttemptsResponseSchema,
} from '../dto/record-kana-attempts.dto.js';

const [KANA_TO_ROMAJI] = KANA_ATTEMPT_DIRECTIONS;

@ApiTags('Kana progress')
@ApiUnauthorizedResponse({
  description: 'No valid session.',
  schema: toOpenApiSchema(errorResponseSchema(HttpStatus.UNAUTHORIZED)),
})
@Controller('kana-progress')
export class KanaProgressController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @ApiBadRequestResponse({
    description: 'Missing or unknown script.',
    schema: toOpenApiSchema(errorResponseSchema(HttpStatus.BAD_REQUEST)),
  })
  @ApiOkResponse({
    description:
      'Per-kana statistics of the current user for one script, Kana → romaji. Kana without recorded attempts are omitted.',
    schema: toOpenApiSchema(kanaProgressResponseSchema),
  })
  @ApiOperation({ operationId: 'getKanaProgress', summary: 'Kana progress' })
  @ApiQuery({ enum: KANA_SCRIPTS, name: 'script', required: true })
  @Get()
  @Header('Cache-Control', 'no-store')
  async getKanaProgress(
    @Session() { user }: UserSession,
    @Query() query: unknown,
  ): Promise<KanaProgressResponse> {
    const parsed = kanaProgressQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException('Invalid script');
    const { script } = parsed.data;
    const entries = await getKanaProgress(
      this.db,
      user.id,
      script,
      KANA_TO_ROMAJI,
    );
    return {
      direction: KANA_TO_ROMAJI,
      kana: entries.map(({ lastPracticedAt, ...entry }) => ({
        ...entry,
        lastPracticedAt: lastPracticedAt.toISOString(),
      })),
      script,
    };
  }

  @ApiBadRequestResponse({
    description:
      'Malformed batch, unknown kana, an outcome that contradicts the answer, or an occurrence listed twice. Nothing is recorded.',
    schema: toOpenApiSchema(errorResponseSchema(HttpStatus.BAD_REQUEST)),
  })
  @ApiBody({ schema: toOpenApiSchema(recordKanaAttemptsRequestSchema) })
  @ApiConflictResponse({
    description:
      'An occurrence is already recorded with different data. Nothing from this batch is recorded.',
    schema: toOpenApiSchema(kanaAttemptsConflictResponseSchema),
  })
  @ApiForbiddenResponse({
    description: 'The batch was recorded for another user than the session.',
    schema: toOpenApiSchema(errorResponseSchema(HttpStatus.FORBIDDEN)),
  })
  @ApiOkResponse({
    description:
      'Every occurrence is recorded: `recorded` new ones, `duplicates` identical to earlier submissions.',
    schema: toOpenApiSchema(recordKanaAttemptsResponseSchema),
  })
  @ApiOperation({
    operationId: 'recordKanaAttempts',
    summary: 'Record finalized Kana attempts',
  })
  @HttpCode(HttpStatus.OK)
  @Post('attempts')
  async recordKanaAttempts(
    @Session() { user }: UserSession,
    @Body() body: unknown,
  ): Promise<RecordKanaAttemptsResponse> {
    const parsed = recordKanaAttemptsRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid attempts');
    if (parsed.data.userId !== user.id) {
      throw new ForbiddenException('Attempts belong to another user');
    }

    const result = await recordKanaAttempts(
      this.db,
      user.id,
      parsed.data.attempts,
    );
    if (result.ok) {
      return { duplicates: result.duplicates, recorded: result.recorded };
    }
    if (result.reason === 'invalid-attempt') {
      throw new BadRequestException(
        `Invalid attempt at index ${String(result.index)}`,
      );
    }
    const conflict: KanaAttemptsConflictResponse = {
      conflicts: result.conflicts,
      message: 'Attempts conflict with recorded attempts',
      statusCode: HttpStatus.CONFLICT,
    };
    throw new ConflictException(conflict);
  }
}
