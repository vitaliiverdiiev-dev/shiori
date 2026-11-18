import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { toOpenApiSchema } from '#infrastructure/openapi/zod-schema.js';
import type { Auth } from '../../../integrations/better-auth/config/better-auth.config.js';
import {
  type CurrentUserResponse,
  currentUserResponseSchema,
  unauthorizedResponseSchema,
} from '../dto/get-current-user.dto.js';

@ApiTags('Me')
@Controller('me')
export class SessionsController {
  @ApiOkResponse({
    description: 'The user of the current session.',
    schema: toOpenApiSchema(currentUserResponseSchema),
  })
  @ApiOperation({ operationId: 'getCurrentUser', summary: 'Current user' })
  @ApiUnauthorizedResponse({
    description: 'No valid session.',
    schema: toOpenApiSchema(unauthorizedResponseSchema),
  })
  @Get()
  getCurrentUser(@Session() { user }: UserSession<Auth>): CurrentUserResponse {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
