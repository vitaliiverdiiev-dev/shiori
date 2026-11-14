import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { appOptions, configureApp } from './app/app.config.js';
import { AppModule } from './app/app.module.js';
import { createOpenApiDocument } from './app/openapi.js';

// Writes apps/api/openapi.json offline: the pool is lazy and never connects,
// and these placeholders are not credentials.
const placeholderEnv = {
  BETTER_AUTH_SECRET: 'openapi-generation-placeholder-secret',
  BETTER_AUTH_URL: 'http://localhost',
  DATABASE_URL: 'postgres://openapi@127.0.0.1:1/openapi',
};
const outputFile = new URL('../openapi.json', import.meta.url);
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
