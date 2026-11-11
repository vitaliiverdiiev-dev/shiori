import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { loadEnv, loadRootEnvFile } from './config/env.js';

loadRootEnvFile();
const env = loadEnv(); // fail fast, before any module is built

const app = await NestFactory.create(AppModule.forRoot(env));
configureApp(app);
await app.listen(env.PORT);
