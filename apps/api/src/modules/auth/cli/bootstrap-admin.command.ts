import { bootstrapFirstAdmin } from '../admin-bootstrap/application/bootstrap-first-admin.js';
import type { AuthCliDependencies } from './auth-cli.types.js';

const BOOTSTRAP_FAILURES = {
  'already-initialized':
    'The first admin was already created; this can only happen once.',
  'common-password':
    'That password is too common. Choose a less predictable one. Nothing was created.',
  'email-taken': 'An account with this email already exists.',
  'invalid-email': 'That is not a valid email address.',
  'invalid-name': 'A name is required.',
  'invalid-password': 'The password must be 15–128 characters.',
} as const;

export async function bootstrapAdminCommand({
  auth,
  io,
}: AuthCliDependencies): Promise<boolean> {
  const name = await io.ask('Name: ');
  const email = await io.ask('Email: ');
  const password = await io.askSecret('Password (15–128 characters): ');
  const confirmation = await io.askSecret('Repeat password: ');
  if (password !== confirmation) {
    io.error('The passwords do not match. Nothing was created.');
    return false;
  }
  const result = await bootstrapFirstAdmin(auth, { email, name, password });
  if (!result.ok) {
    io.error(BOOTSTRAP_FAILURES[result.reason]);
    return false;
  }
  io.print('Admin created. Sign in with this email and password.');
  return true;
}
