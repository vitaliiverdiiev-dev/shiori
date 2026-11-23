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
  type KanaAttemptsInvalidResponse,
  kanaAttemptsInvalidResponseSchema,
  recordKanaAttemptsRequestSchema,
  type RecordKanaAttemptsResponse,
  recordKanaAttemptsResponseSchema,
} from '../dto/record-kana-attempts.dto.js';

@ApiTags('Kana progress')
@ApiUnauthorizedResponse({
  description: 'No valid session.',
  schema: toOpenApiSchema(errorResponseSchema(HttpStatus.UNAUTHORIZED)),
})
@Controller('kana-progress')
export class KanaProgressController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @ApiBadRequestResponse({
    description: 'Missing or unknown script, or unknown direction.',
    schema: toOpenApiSchema(errorResponseSchema(HttpStatus.BAD_REQUEST)),
  })
  @ApiOkResponse({
    description:
      'Per-kana statistics of the current user for one script and one direction (default `kana-to-romaji`). Kana without recorded results in that direction are omitted.',
    schema: toOpenApiSchema(kanaProgressResponseSchema),
  })
  @ApiOperation({ operationId: 'getKanaProgress', summary: 'Kana progress' })
  @ApiQuery({
    enum: KANA_ATTEMPT_DIRECTIONS,
    name: 'direction',
    required: false,
  })
  @ApiQuery({ enum: KANA_SCRIPTS, name: 'script', required: true })
  @Get()
  @Header('Cache-Control', 'no-store')
  async getKanaProgress(
    @Session() { user }: UserSession,
    @Query() query: unknown,
  ): Promise<KanaProgressResponse> {
    const parsed = kanaProgressQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('Invalid script or direction');
    }
    const { direction, script } = parsed.data;
    const entries = await getKanaProgress(this.db, user.id, script, direction);
    return {
      direction,
      kana: entries.map(({ lastPracticedAt, ...entry }) => ({
        ...entry,
        lastPracticedAt: lastPracticedAt.toISOString(),
      })),
      script,
    };
  }

  @ApiBadRequestResponse({
    description:
      'Malformed batch, unknown kana, an outcome that contradicts the answer, a kana result listed twice, or several kana for one question that are not one romaji → kana reading. Nothing is recorded; `invalidIndexes` names the invalid entries when they can be identified.',
    schema: toOpenApiSchema(kanaAttemptsInvalidResponseSchema),
  })
  @ApiBody({ schema: toOpenApiSchema(recordKanaAttemptsRequestSchema) })
  @ApiConflictResponse({
    description:
      'A kana result of a question is already recorded with different data (or, for `kana-to-romaji`, the question is recorded for another kana). Nothing from this batch is recorded.',
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
    if (!parsed.success) {
      throw invalidAttempts(attemptIndexes(parsed.error.issues));
    }
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
    if (result.reason === 'invalid-attempts') {
      throw invalidAttempts(result.indexes);
    }
    const conflict: KanaAttemptsConflictResponse = {
      conflicts: result.conflicts,
      message: 'Attempts conflict with recorded attempts',
      statusCode: HttpStatus.CONFLICT,
    };
    throw new ConflictException(conflict);
  }
}

function attemptIndexes(
  issues: readonly { path: readonly PropertyKey[] }[],
): number[] | undefined {
  const indexes = new Set<number>();
  for (const { path } of issues) {
    const [field, index] = path;
    if (field !== 'attempts' || typeof index !== 'number') return undefined;
    indexes.add(index);
  }
  return indexes.size > 0 ? [...indexes].sort((a, b) => a - b) : undefined;
}

function invalidAttempts(
  indexes: readonly number[] | undefined,
): BadRequestException {
  const response: KanaAttemptsInvalidResponse = {
    ...(indexes && { invalidIndexes: [...indexes] }),
    message: 'Invalid attempts',
    statusCode: HttpStatus.BAD_REQUEST,
  };
  return new BadRequestException(response);
}
