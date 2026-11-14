import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.module.js';
import { type AuthOptions, createAuth } from './auth.config.js';
import { MeController } from './me.controller.js';
import { SessionGuard } from './session.guard.js';

/** Better Auth on `/api/auth/*` and session protection for every non-public route. */
@Module({})
export class AuthModule {
  static forRoot(options: AuthOptions): DynamicModule {
    return {
      controllers: [MeController],
      imports: [
        BetterAuthModule.forRootAsync({
          disableGlobalAuthGuard: true,
          inject: [DATABASE],
          useFactory: (db: Database) => ({
            auth: createAuth(db, options),
            // Same-origin only (the web app proxies /api): no CORS.
            disableTrustedOriginsCors: true,
          }),
        }),
      ],
      module: AuthModule,
      providers: [{ provide: APP_GUARD, useClass: SessionGuard }],
    };
  }
}
