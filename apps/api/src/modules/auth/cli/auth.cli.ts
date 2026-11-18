import type { AuthCliDependencies } from './auth-cli.types.js';
import { bootstrapAdminCommand } from './bootstrap-admin.command.js';
import {
  inviteCreateCommand,
  inviteListCommand,
  inviteRevokeCommand,
} from './invite.command.js';

const SUCCESS = 0;
const FAILURE = 1;

const USAGE = [
  'Usage:',
  '  bootstrap-admin              create the first admin (prompts for details)',
  '  invite create <email>        create an invitation and show its code once',
  '  invite list                  list invitations (codes are never shown)',
  '  invite revoke <id>           revoke an unused invitation',
].join('\n');

function dispatch(
  [command, subcommand, argument, ...extra]: readonly string[],
  dependencies: AuthCliDependencies,
): Promise<boolean> | undefined {
  if (command === 'bootstrap-admin' && subcommand === undefined) {
    return bootstrapAdminCommand(dependencies);
  }
  if (command !== 'invite' || extra.length > 0) return undefined;
  if (subcommand === 'create' && argument) {
    return inviteCreateCommand(dependencies, argument);
  }
  if (subcommand === 'list' && argument === undefined) {
    return inviteListCommand(dependencies);
  }
  if (subcommand === 'revoke' && argument) {
    return inviteRevokeCommand(dependencies, argument);
  }
  return undefined;
}

export async function runAuthCli(
  args: readonly string[],
  dependencies: AuthCliDependencies,
): Promise<number> {
  const succeeded = await dispatch(args, dependencies);
  if (succeeded === undefined) {
    dependencies.io.error(USAGE);
    return FAILURE;
  }
  return succeeded ? SUCCESS : FAILURE;
}
