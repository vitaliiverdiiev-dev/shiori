import { type ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router';
import { ErrorFallback } from '@/shared/ui';

type Props = {
  children: ReactNode;
};

export const RouteBoundary = ({ children }: Props) => {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} onRetry={resetErrorBoundary} />
      )}
      resetKeys={[pathname]}
    >
      <Suspense
        fallback={
          <p aria-busy="true" className="text-muted-foreground" role="status">
            Loading…
          </p>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};
