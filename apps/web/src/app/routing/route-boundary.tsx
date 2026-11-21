import { type ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router';
import { ErrorFallback } from '@/shared/ui';

type Props = {
  children: ReactNode;
  fallbackClassName: string;
};

export const RouteBoundary = ({ children, fallbackClassName }: Props) => {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <main className={fallbackClassName}>
          <ErrorFallback error={error} onRetry={resetErrorBoundary} />
        </main>
      )}
      resetKeys={[pathname]}
    >
      <Suspense
        fallback={
          <main aria-busy="true" className={fallbackClassName}>
            <p className="text-muted-foreground" role="status">
              Loading…
            </p>
          </main>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};
