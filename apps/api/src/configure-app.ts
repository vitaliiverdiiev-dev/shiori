import type { INestApplication } from '@nestjs/common';

/** App-wide setup shared by `main.ts` and e2e tests, so tests see real routes. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
