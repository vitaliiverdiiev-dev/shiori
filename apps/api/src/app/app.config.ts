import type { INestApplication, NestApplicationOptions } from '@nestjs/common';
import type { Env } from '../infrastructure/config/env.js';

// COMPAT(@thallesp/nestjs-better-auth@2.8.0): Better Auth reads the raw body; the module re-adds parsers for other routes.
export const appOptions: NestApplicationOptions = { bodyParser: false };

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}

export async function listen(
  app: INestApplication,
  { API_HOST, PORT }: Pick<Env, 'API_HOST' | 'PORT'>,
): Promise<void> {
  await app.listen(PORT, API_HOST);
}
