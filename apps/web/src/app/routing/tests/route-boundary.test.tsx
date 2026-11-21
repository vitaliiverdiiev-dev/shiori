import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lazyComponent } from '@/shared/helpers/lazy-component';
import { RouteBoundary } from '../route-boundary';

function renderAt(path: string, routes: Record<string, ComponentType>) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <nav>
        <Link to="/fine">Fine page</Link>
      </nav>
      <Routes>
        <Route
          element={
            <RouteBoundary fallbackClassName="fallback">
              <Outlet />
            </RouteBoundary>
          }
        >
          {Object.entries(routes).map(([routePath, Page]) => (
            <Route element={<Page />} key={routePath} path={routePath} />
          ))}
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const FinePage = () => <h1>Fine</h1>;

describe('RouteBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading state until a lazy page arrives', async () => {
    let finishLoading: (page: ComponentType) => void = () => undefined;
    const LazyPage = lazyComponent(
      () =>
        new Promise<ComponentType>((resolve) => {
          finishLoading = resolve;
        }),
    );
    renderAt('/lazy', { '/lazy': LazyPage });

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');

    finishLoading(() => <h1>Loaded page</h1>);

    expect(
      await screen.findByRole('heading', { name: 'Loaded page' }),
    ).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('offers a reload, not a retry, when a page bundle fails to download', async () => {
    const BrokenDownload = lazyComponent<object>(() =>
      Promise.reject(
        new TypeError('Failed to fetch dynamically imported module'),
      ),
    );
    renderAt('/lazy', { '/lazy': BrokenDownload });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This page couldn’t load');
    expect(alert).toHaveTextContent('Check your connection');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
  });

  it('recovers from a render error when the user tries again', async () => {
    let shouldFail = true;
    const FlakyPage = () => {
      if (shouldFail) throw new Error('render failed');
      return <h1>Recovered</h1>;
    };
    renderAt('/flaky', { '/flaky': FlakyPage });
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong',
    );
    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'Recovered' }),
    ).toBeVisible();
  });

  it('clears the error when the user navigates to another page', async () => {
    const BrokenPage = () => {
      throw new Error('render failed');
    };
    renderAt('/broken', { '/broken': BrokenPage, '/fine': FinePage });
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Fine page' }));

    expect(await screen.findByRole('heading', { name: 'Fine' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
