import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

// COMPAT(@thallesp/nestjs-better-auth@2.8.0): @AllowAnonymous() sets this key; the library guard loads the session first.
const PUBLIC_KEY = 'PUBLIC';
const reflector = new Reflector();

// INVARIANT: @AllowAnonymous routes never load a session or see request.user; use @OptionalAuth to read an optional user.
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
