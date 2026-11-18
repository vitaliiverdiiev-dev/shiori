import { useState } from 'react';
import { Button } from '@/shared/ui';
import { authClient } from '../config/auth-client';

export const AccountMenu = () => {
  const { data } = authClient.useSession();
  const [signOutState, setSignOutState] = useState<
    'failed' | 'idle' | 'pending'
  >('idle');

  const signOut = async () => {
    setSignOutState('pending');
    try {
      const { error } = await authClient.signOut();
      setSignOutState(error ? 'failed' : 'idle');
    } catch {
      setSignOutState('failed');
    }
  };

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm text-muted-foreground">
          {data?.user.name}
        </span>
        <Button
          disabled={signOutState === 'pending'}
          onClick={() => void signOut()}
          variant="outline"
        >
          Sign out
        </Button>
      </div>
      {signOutState === 'failed' && (
        <p className="text-sm text-destructive" role="alert">
          Could not sign out. Try again.
        </p>
      )}
    </div>
  );
};
