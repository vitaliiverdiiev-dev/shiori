import { NestFactory } from '@nestjs/core';
import { appOptions, configureApp } from './app/app.config.js';
import { AppModule } from './app/app.module.js';
import { loadEnv, loadRootEnvFile } from './infrastructure/config/env.js';

loadRootEnvFile();
const env = loadEnv();

const app = await NestFactory.create(AppModule.forRoot(env), appOptions);
configureApp(app);
await app.listen(env.PORT);
