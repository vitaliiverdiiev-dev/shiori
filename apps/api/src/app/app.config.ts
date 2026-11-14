import type { INestApplication, NestApplicationOptions } from '@nestjs/common';

/**
 * Better Auth reads the raw request body on `/api/auth/*`; the auth module
 * re-adds JSON and URL-encoded parsing for every other route.
 */
export const appOptions: NestApplicationOptions = { bodyParser: false };

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
