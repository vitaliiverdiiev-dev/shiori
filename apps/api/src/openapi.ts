import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { appOptions, configureApp } from './app/app.config.js';
import { type AppEnv, AppModule } from './app/app.module.js';
import { createOpenApiDocument } from './app/openapi.js';

const placeholderEnv: AppEnv = {
  BETTER_AUTH_SECRET: 'openapi-generation-placeholder-secret',
  BETTER_AUTH_URL: 'http://localhost',
  DATABASE_URL: 'postgres://openapi@127.0.0.1:1/openapi',
  REGISTRATION_MODE: 'closed',
};
const outputFile =
  process.argv[2] ?? new URL('../openapi.json', import.meta.url);
const JSON_INDENT = 2;

const app = await NestFactory.create(AppModule.forRoot(placeholderEnv), {
  ...appOptions,
  logger: false,
});
configureApp(app);
await app.init();
writeFileSync(
  outputFile,
  `${JSON.stringify(createOpenApiDocument(app), null, JSON_INDENT)}\n`,
);
await app.close();
