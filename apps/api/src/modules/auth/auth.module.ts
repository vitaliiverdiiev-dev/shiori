import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import {
  DATABASE,
  type Database,
} from '#infrastructure/database/database.module.js';
import {
  type AuthEnv,
  authSettingsFromEnv,
  createAuth,
} from './integrations/better-auth/config/better-auth.config.js';
import {
  REGISTRATION_MODE,
  RegistrationController,
} from './registration/http/controllers/registration.controller.js';
import { SessionsController } from './sessions/http/controllers/sessions.controller.js';
import { SessionGuard } from './sessions/http/guards/session.guard.js';

@Module({})
export class AuthModule {
  static forRoot(env: AuthEnv): DynamicModule {
    const settings = authSettingsFromEnv(env);
    return {
      controllers: [SessionsController, RegistrationController],
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
