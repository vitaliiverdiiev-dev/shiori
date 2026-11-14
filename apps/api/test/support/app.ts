import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { appOptions, configureApp } from '../../src/app/app.config.js';
import { type AppEnv, AppModule } from '../../src/app/app.module.js';
import { DATABASE } from '../../src/infrastructure/database/database.module.js';

/** Fake, test-only auth settings: a local http origin, as in development. */
export const TEST_AUTH_ENV = {
  BETTER_AUTH_SECRET: 'test-only-secret-not-used-anywhere-else',
  BETTER_AUTH_URL: 'http://localhost:5173',
} as const;
export const TEST_ORIGIN = TEST_AUTH_ENV.BETTER_AUTH_URL;

/** The real app (prefix, body parsing, guards) on the given database. */
export async function createTestApp(
  databaseUrl: string,
  options: {
    database?: unknown;
    env?: Partial<AppEnv>;
    imports?: Type[];
  } = {},
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({
    imports: [
      AppModule.forRoot({
        ...TEST_AUTH_ENV,
        DATABASE_URL: databaseUrl,
        ...options.env,
      }),
      ...(options.imports ?? []),
    ],
  });
  if (options.database) {
    builder.overrideProvider(DATABASE).useValue(options.database);
  }
  const app = (await builder.compile()).createNestApplication<
    INestApplication<App>
  >(appOptions);
  configureApp(app);
  await app.init();
  return app;
}
