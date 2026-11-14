import { type DynamicModule, Module } from '@nestjs/common';
import type { Env } from '../infrastructure/config/env.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { AuthModule } from '../modules/auth/auth.module.js';
import { DiagnosticsModule } from '../modules/diagnostics/diagnostics.module.js';

export type AppEnv = Pick<
  Env,
  'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'DATABASE_URL'
>;

@Module({})
export class AppModule {
  static forRoot(env: AppEnv): DynamicModule {
    return {
      imports: [
        DatabaseModule.forRoot({ url: env.DATABASE_URL }),
        AuthModule.forRoot({
          baseURL: env.BETTER_AUTH_URL,
          secret: env.BETTER_AUTH_SECRET,
        }),
        DiagnosticsModule,
      ],
      module: AppModule,
    };
  }
}
