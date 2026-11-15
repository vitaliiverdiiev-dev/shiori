import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.module.js';
import { MeController } from './http/me.controller.js';
import {
  REGISTRATION_MODE,
  RegistrationController,
} from './http/registration.controller.js';
import { SessionGuard } from './http/session.guard.js';
import {
  type AuthEnv,
  authSettingsFromEnv,
  createAuth,
} from './integrations/auth.config.js';

@Module({})
export class AuthModule {
  static forRoot(env: AuthEnv): DynamicModule {
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
