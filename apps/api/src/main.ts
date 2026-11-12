import { NestFactory } from '@nestjs/core';
import { configureApp } from './app/app.config.js';
import { AppModule } from './app/app.module.js';
import { loadEnv, loadRootEnvFile } from './infrastructure/config/env.js';

loadRootEnvFile();
const env = loadEnv(); // fail fast, before any module is built

const app = await NestFactory.create(AppModule.forRoot(env));
configureApp(app);
await app.listen(env.PORT);
