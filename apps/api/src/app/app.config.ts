import type { INestApplication, NestApplicationOptions } from '@nestjs/common';

// COMPAT(@thallesp/nestjs-better-auth@2.8.0): Better Auth reads the raw body; the module re-adds parsers for other routes.
export const appOptions: NestApplicationOptions = { bodyParser: false };

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
