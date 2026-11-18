import { useState } from 'react';
import { Button } from '@/shared/ui';
import { authClient } from '../config/auth-client';
import { runAuthAction } from '../helpers/auth-action';
import { revokeSessionsMessages } from '../model/consts';
import type { AuthOutcome } from '../model/types';
import { FormMessage } from './form-message';

export const RevokeOtherSessions = () => {
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<AuthOutcome>();

  const revoke = async () => {
    setPending(true);
    setOutcome(undefined);
    setOutcome(
      await runAuthAction(
        () => authClient.revokeOtherSessions(),
        revokeSessionsMessages,
      ),
    );
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {outcome &&
        (outcome.ok ? (
          <FormMessage tone="success">
            Other devices have been signed out.
          </FormMessage>
        ) : (
          <FormMessage tone="error">{outcome.message}</FormMessage>
        ))}
      <Button
        className="w-full sm:w-auto sm:self-start"
        disabled={pending}
        onClick={() => void revoke()}
        size="lg"
        variant="outline"
      >
        {pending ? 'Signing out other devices…' : 'Sign out other devices'}
      </Button>
    </div>
  );
};
