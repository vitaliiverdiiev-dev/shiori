import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

// Metadata key set by @AllowAnonymous() in @thallesp/nestjs-better-auth.
const PUBLIC_KEY = 'PUBLIC';
const reflector = new Reflector();

/**
 * The library guard loads the session before checking @AllowAnonymous, so a
 * request carrying a session cookie made /api/health query the database.
 * Public routes now skip the session lookup entirely.
 */
@Injectable()
export class SessionGuard extends AuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = reflector.getAllAndOverride<boolean | undefined>(
      PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    return isPublic === true || super.canActivate(context);
  }
}
