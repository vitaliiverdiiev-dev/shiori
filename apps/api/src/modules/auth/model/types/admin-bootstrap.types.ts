export type BootstrapFailure =
  | 'already-initialized'
  | 'common-password'
  | 'email-taken'
  | 'invalid-email'
  | 'invalid-name'
  | 'invalid-password';

export type BootstrapResult =
  { ok: false; reason: BootstrapFailure } | { ok: true; userId: string };

export interface FirstAdminInput {
  email: string;
  name: string;
  password: string;
}
