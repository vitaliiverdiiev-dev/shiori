import { type DynamicModule, Module } from '@nestjs/common';
import type { Env } from '../infrastructure/config/env.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { DiagnosticsModule } from '../modules/diagnostics/diagnostics.module.js';

/** Composition root: infrastructure plus feature modules. */
@Module({})
export class AppModule {
  static forRoot(env: Pick<Env, 'DATABASE_URL'>): DynamicModule {
    return {
      imports: [
        DatabaseModule.forRoot({ url: env.DATABASE_URL }),
        DiagnosticsModule,
      ],
      module: AppModule,
    };
  }
}
