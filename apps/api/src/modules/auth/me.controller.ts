import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { toOpenApiSchema } from '../../infrastructure/openapi/zod-schema.js';
import type { Auth } from './auth.config.js';
import {
  type CurrentUserResponse,
  currentUserResponseSchema,
} from './auth.dto.js';

/** The signed-in user; requires a valid session like every non-public route. */
@Controller('me')
export class MeController {
  @ApiOkResponse({
    description: 'The user of the current session.',
    schema: toOpenApiSchema(currentUserResponseSchema),
  })
  @ApiOperation({ operationId: 'getCurrentUser', summary: 'Current user' })
  @ApiUnauthorizedResponse({ description: 'No valid session.' })
  @Get()
  getCurrentUser(@Session() { user }: UserSession<Auth>): CurrentUserResponse {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
