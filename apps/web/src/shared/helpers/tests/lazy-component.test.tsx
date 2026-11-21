import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from 'react-error-boundary';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lazyComponent, ModuleLoadError } from '../lazy-component';

describe('lazyComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the loaded component with its props', async () => {
    const Greeting = lazyComponent(() =>
      Promise.resolve(({ name }: { name: string }) => <p>Hello {name}</p>),
    );
    render(
      <Suspense fallback="loading">
        <Greeting name="Alice" />
      </Suspense>,
    );

    expect(await screen.findByText('Hello Alice')).toBeVisible();
  });

  it('reports a failed import as a ModuleLoadError that keeps the cause', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cause = new TypeError('Failed to fetch dynamically imported module');
    const onError = vi.fn<(error: unknown) => void>();
    const Broken = lazyComponent<object>(() => Promise.reject(cause));
    render(
      <ErrorBoundary fallback={<p>failed</p>} onError={onError}>
        <Suspense fallback="loading">
          <Broken />
        </Suspense>
      </ErrorBoundary>,
    );

    expect(await screen.findByText('failed')).toBeVisible();
    const [error] = onError.mock.lastCall ?? [];
    expect(error).toBeInstanceOf(ModuleLoadError);
    expect(error).toHaveProperty('cause', cause);
  });
});
