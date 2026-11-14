import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthModule } from '../modules/auth/auth.module.js';
import { DiagnosticsModule } from '../modules/diagnostics/diagnostics.module.js';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('API').setVersion('1').build();
  return SwaggerModule.createDocument(app, config, {
    include: [AuthModule, DiagnosticsModule],
  });
}
