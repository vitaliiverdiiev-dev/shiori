export type AuthErrorMessages = {
  codes: Partial<Record<string, string>>;
  fallback: string;
  unauthorized?: string;
};

export type AuthOutcome =
  { code: string | undefined; message: string; ok: false } | { ok: true };

export type RouteAccess = 'guest' | 'protected';

export type SessionState =
  'authenticated' | 'checking' | 'unauthenticated' | 'unavailable';
