import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import type { Env } from '../../infrastructure/config/env.js';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.module.js';
import { authSettingsFromEnv, createAuth } from './auth.config.js';
import { MeController } from './me.controller.js';
import {
  REGISTRATION_MODE,
  RegistrationController,
} from './registration.controller.js';
import { SessionGuard } from './session.guard.js';

@Module({})
export class AuthModule {
  static forRoot(
    env: Pick<
      Env,
      'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'REGISTRATION_MODE'
    >,
  ): DynamicModule {
    const settings = authSettingsFromEnv(env);
    return {
      controllers: [MeController, RegistrationController],
      imports: [
        BetterAuthModule.forRootAsync({
          disableGlobalAuthGuard: true,
          inject: [DATABASE],
          useFactory: (db: Database) => ({
            auth: createAuth(db, settings),
            disableTrustedOriginsCors: true,
          }),
        }),
      ],
      module: AuthModule,
      providers: [
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: REGISTRATION_MODE, useValue: settings.registrationMode },
      ],
    };
  }
}
