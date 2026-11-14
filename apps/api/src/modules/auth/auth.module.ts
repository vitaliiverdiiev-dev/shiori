import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.module.js';
import { type AuthSettings, createAuth } from './auth.config.js';
import { MeController } from './me.controller.js';
import { SessionGuard } from './session.guard.js';

@Module({})
export class AuthModule {
  static forRoot(settings: AuthSettings): DynamicModule {
    return {
      controllers: [MeController],
      imports: [
        BetterAuthModule.forRootAsync({
          disableGlobalAuthGuard: true,
          inject: [DATABASE],
          useFactory: (db: Database) => ({
            auth: createAuth(db, settings),
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
