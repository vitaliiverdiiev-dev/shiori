import type { ReactNode } from 'react';
import { Button } from '@/shared/ui';

type Props = {
  details?: ReactNode;
  onRetry: () => void;
};

export const SessionUnavailable = ({ details, onRetry }: Props) => (
  <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5">
    <h1 className="text-2xl font-semibold tracking-tight">
      Can’t verify your session
    </h1>
    <p className="text-muted-foreground">
      Shiori couldn’t confirm whether you are signed in. You have not been
      signed out. Try again in a moment; the status below shows what is
      unavailable.
    </p>
    <Button className="w-full sm:w-auto" onClick={onRetry} size="lg">
      Try again
    </Button>
    {details}
  </main>
);
