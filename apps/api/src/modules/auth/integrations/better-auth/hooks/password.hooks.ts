import type { HookEndpointContext } from 'better-auth';
import {
  APIError,
  type AuthMiddleware,
  createAuthMiddleware,
} from 'better-auth/api';
import { z } from 'zod';
import {
  hasAllowedPasswordLength,
  isCommonPassword,
} from '../../../model/helpers/password.policy.js';

const SIGN_UP_PATH = '/sign-up/email';

const NEW_PASSWORD_FIELD = {
  '/change-password': 'newPassword',
  '/reset-password': 'newPassword',
  [SIGN_UP_PATH]: 'password',
} as const satisfies Record<string, string>;

type PasswordPath = keyof typeof NEW_PASSWORD_FIELD;

function isPasswordPath(path: string | undefined): path is PasswordPath {
  return path !== undefined && Object.hasOwn(NEW_PASSWORD_FIELD, path);
}

function newPasswordOf(
  path: string | undefined,
  body: unknown,
  signUpDisabled: boolean,
): string | undefined {
  if (!isPasswordPath(path)) return undefined;
  if (path === SIGN_UP_PATH && signUpDisabled) return undefined;
  const field = NEW_PASSWORD_FIELD[path];
  const parsed = z.object({ [field]: z.string() }).safeParse(body);
  return parsed.success ? parsed.data[field] : undefined;
}

export const rejectCommonPasswords: {
  handler: AuthMiddleware;
  matcher: (context: HookEndpointContext) => boolean;
} = {
  handler: createAuthMiddleware((context) => {
    const password = newPasswordOf(
      context.path,
      context.body,
      context.context.options.emailAndPassword?.disableSignUp === true,
    );
    return password !== undefined &&
      hasAllowedPasswordLength(password) &&
      isCommonPassword(password)
      ? Promise.reject(
          APIError.from('BAD_REQUEST', {
            code: 'PASSWORD_TOO_COMMON',
            message:
              'This password is too common. Choose a less predictable one.',
          }),
        )
      : Promise.resolve();
  }),
  matcher: (context) => isPasswordPath(context.path),
};
