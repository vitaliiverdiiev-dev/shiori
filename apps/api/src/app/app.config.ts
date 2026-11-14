import type { INestApplication, NestApplicationOptions } from '@nestjs/common';

/**
 * Better Auth reads the raw request body on `/api/auth/*`; the auth module
 * re-adds JSON and URL-encoded parsing for every other route.
 */
export const appOptions: NestApplicationOptions = { bodyParser: false };

/** App-wide setup shared by `main.ts` and e2e tests, so tests see real routes. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
