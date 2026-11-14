import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthModule } from '../modules/auth/auth.module.js';
import { DiagnosticsModule } from '../modules/diagnostics/diagnostics.module.js';

/**
 * Contract of the app's own Nest endpoints. Better Auth's `/api/auth/*`
 * routes are not Nest controllers and stay out: its own client is their contract.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('API').setVersion('1').build();
  return SwaggerModule.createDocument(app, config, {
    include: [AuthModule, DiagnosticsModule],
  });
}
