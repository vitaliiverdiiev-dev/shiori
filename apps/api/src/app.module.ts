import { type DynamicModule, Module } from '@nestjs/common';
import type { Env } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';

@Module({})
export class AppModule {
  static forRoot(env: Pick<Env, 'DATABASE_URL'>): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.forRoot({ url: env.DATABASE_URL })],
      controllers: [HealthController],
    };
  }
}
