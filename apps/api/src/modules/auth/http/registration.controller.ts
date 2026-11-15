import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { toOpenApiSchema } from '../../../infrastructure/openapi/zod-schema.js';
import type { RegistrationMode } from '../integrations/auth.config.js';
import {
  type RegistrationResponse,
  registrationResponseSchema,
} from './auth.dto.js';

export const REGISTRATION_MODE = Symbol('REGISTRATION_MODE');

@AllowAnonymous()
@Controller('registration')
export class RegistrationController {
  constructor(
    @Inject(REGISTRATION_MODE) private readonly mode: RegistrationMode,
  ) {}

  @ApiOkResponse({
    description: 'How new accounts can be created.',
    schema: toOpenApiSchema(registrationResponseSchema),
  })
  @ApiOperation({
    operationId: 'getRegistration',
    summary: 'Registration mode',
  })
  @Get()
  getRegistration(): RegistrationResponse {
    return { mode: this.mode };
  }
}
