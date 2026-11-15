import type { Database } from '../../infrastructure/database/database.module.js';
import type { Auth } from './auth.config.js';
import { bootstrapFirstAdmin } from './bootstrap-admin.js';
import {
  createInvitation,
  INVITATION_LIFETIME_DAYS,
  listInvitations,
  revokeInvitation,
} from './invitations.js';

export interface AuthCliDependencies {
  auth: Auth;
  db: Database;
  io: CliIo;
}

export interface CliIo {
  ask(question: string): Promise<string>;
  askSecret(question: string): Promise<string>;
  error(message: string): void;
  print(message: string): void;
}

const SUCCESS = 0;
const FAILURE = 1;

const USAGE = [
  'Usage:',
  '  bootstrap-admin              create the first admin (prompts for details)',
  '  invite create <email>        create an invitation and show its code once',
  '  invite list                  list invitations (codes are never shown)',
  '  invite revoke <id>           revoke an unused invitation',
].join('\n');

const BOOTSTRAP_FAILURES = {
  'already-initialized':
    'The first admin was already created; this can only happen once.',
  'email-taken': 'An account with this email already exists.',
  'invalid-email': 'That is not a valid email address.',
  'invalid-name': 'A name is required.',
  'invalid-password': 'The password must be 15–128 characters.',
} as const;

async function bootstrapAdmin({ auth, io }: AuthCliDependencies) {
  const name = await io.ask('Name: ');
  const email = await io.ask('Email: ');
  const password = await io.askSecret('Password (15–128 characters): ');
  const confirmation = await io.askSecret('Repeat password: ');
  if (password !== confirmation) {
    io.error('The passwords do not match. Nothing was created.');
    return FAILURE;
  }
  const result = await bootstrapFirstAdmin(auth, { email, name, password });
  if (!result.ok) {
    io.error(BOOTSTRAP_FAILURES[result.reason]);
    return FAILURE;
  }
  io.print('Admin created. Sign in with this email and password.');
  return SUCCESS;
}

async function inviteCreate({ db, io }: AuthCliDependencies, email: string) {
  const result = await createInvitation(db, email);
  if (!result.ok) {
    io.error(
      result.reason === 'email-taken'
        ? 'An account with this email already exists.'
        : 'That is not a valid email address.',
    );
    return FAILURE;
  }
  const { code, invitation } = result;
  io.print(
    `Invitation for ${invitation.email}, valid for ${String(INVITATION_LIFETIME_DAYS)} days (until ${invitation.expiresAt.toISOString()}).`,
  );
  io.print(`Code (shown only now): ${code}`);
  return SUCCESS;
}

async function inviteList({ db, io }: AuthCliDependencies) {
  const invitations = await listInvitations(db);
  if (invitations.length === 0) {
    io.print('No invitations.');
    return SUCCESS;
  }
  for (const invitation of invitations) {
    io.print(
      [
        invitation.id,
        invitation.email,
        invitation.status,
        `expires ${invitation.expiresAt.toISOString()}`,
      ].join('  '),
    );
  }
  return SUCCESS;
}

async function inviteRevoke({ db, io }: AuthCliDependencies, id: string) {
  if (await revokeInvitation(db, id)) {
    io.print('Invitation revoked.');
    return SUCCESS;
  }
  io.error('No unused, unrevoked invitation has that id.');
  return FAILURE;
}

export async function runAuthCli(
  args: readonly string[],
  dependencies: AuthCliDependencies,
): Promise<number> {
  const [command, subcommand, argument, ...extra] = args;
  if (command === 'bootstrap-admin' && subcommand === undefined) {
    return bootstrapAdmin(dependencies);
  }
  if (command === 'invite' && extra.length === 0) {
    if (subcommand === 'create' && argument) {
      return inviteCreate(dependencies, argument);
    }
    if (subcommand === 'list' && argument === undefined) {
      return inviteList(dependencies);
    }
    if (subcommand === 'revoke' && argument) {
      return inviteRevoke(dependencies, argument);
    }
  }
  dependencies.io.error(USAGE);
  return FAILURE;
}
