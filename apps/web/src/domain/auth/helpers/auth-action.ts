import { authClient } from '../config/auth-client';
import {
  commonMessages,
  GATEWAY_ERROR_STATUSES,
  SERVER_ERROR_STATUS,
  TOO_MANY_REQUESTS_STATUS,
  UNAUTHORIZED_STATUS,
} from '../model/consts';
import type { AuthErrorMessages, AuthOutcome } from '../model/types';

type AuthError = { code?: string | undefined; status: number };

export function describeAuthError(
  error: AuthError,
  messages: AuthErrorMessages,
): string {
  const known = error.code ? messages.codes[error.code] : undefined;
  if (known) return known;
  if (error.status === UNAUTHORIZED_STATUS && messages.unauthorized) {
    return messages.unauthorized;
  }
  if (error.status === TOO_MANY_REQUESTS_STATUS) {
    return commonMessages.tooManyRequests;
  }
  if (GATEWAY_ERROR_STATUSES.includes(error.status)) {
    return commonMessages.apiUnreachable;
  }
  if (error.status >= SERVER_ERROR_STATUS) return commonMessages.serverError;
  if (error.status === 0) return commonMessages.network;
  return messages.fallback;
}

export async function runAuthAction(
  action: () => Promise<{ error: AuthError | null }>,
  messages: AuthErrorMessages,
): Promise<AuthOutcome> {
  try {
    const { error } = await action();
    if (!error) return { ok: true };
    if (error.status === UNAUTHORIZED_STATUS && messages.unauthorized) {
      authClient.$store.notify('$sessionSignal');
    }
    return {
      code: error.code,
      message: describeAuthError(error, messages),
      ok: false,
    };
  } catch {
    return { code: undefined, message: commonMessages.network, ok: false };
  }
}
