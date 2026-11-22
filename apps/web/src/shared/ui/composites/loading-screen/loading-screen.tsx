import type { ReactNode } from 'react';

type Props = {
  brand?: ReactNode;
  label: string;
};

export const LoadingScreen = ({ brand, label }: Props) => (
  <main
    aria-busy="true"
    className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center"
  >
    {brand}
    <p className="text-sm text-muted-foreground" role="status">
      {label}
    </p>
  </main>
);
