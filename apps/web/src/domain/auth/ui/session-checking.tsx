import type { ReactNode } from 'react';

type Props = {
  brand?: ReactNode;
};

export const SessionChecking = ({ brand }: Props) => (
  <main
    aria-busy="true"
    className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center"
  >
    {brand}
    <p className="text-sm text-muted-foreground" role="status">
      Checking your session…
    </p>
  </main>
);
