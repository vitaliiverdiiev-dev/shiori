import { useState } from 'react';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/shared/ui';
import { authClient } from '../config/auth-client';

export const AccountControls = () => {
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
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col px-2 text-sm">
        <span className="truncate font-medium">{data?.user.name}</span>
        <span className="truncate text-muted-foreground">
          {data?.user.email}
        </span>
      </div>
      <Button
        className="w-full justify-start"
        disabled={signOutState === 'pending'}
        onClick={() => void signOut()}
        variant="outline"
      >
        <LogOutIcon aria-hidden="true" data-icon="inline-start" />
        Sign out
      </Button>
      {signOutState === 'failed' && (
        <p className="px-2 text-sm text-destructive" role="alert">
          Could not sign out. Try again.
        </p>
      )}
    </div>
  );
};
