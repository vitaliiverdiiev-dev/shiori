import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router';
import { ThemeProvider } from '@/shared/theme/theme-provider';
import { ErrorFallback } from '@/shared/ui';
import { themeConfig } from '../theme-config';
import { queryClient } from './query-client';

type Props = {
  children: ReactNode;
};

export const AppProviders = ({ children }: Props) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
        <ErrorFallback error={error} onRetry={resetErrorBoundary} />
      </main>
    )}
  >
    <ThemeProvider config={themeConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
