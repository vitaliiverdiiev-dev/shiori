import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Outlet, Route, Routes } from 'react-router';
import { AuthRoute } from '@/domain/auth';
import { lazyComponent } from '@/shared/helpers/lazy-component';
import { LoadingScreen } from '@/shared/ui';
import { AppLogo } from '../branding/app-logo';
import { GuestLayout } from '../layouts/guest-layout';
import { RouteBoundary } from './route-boundary';
import { type RouteLayout, routes } from './routes';

const AppLayout = lazyComponent(() =>
  import('../layouts/app-layout').then((module) => module.AppLayout),
);
const HealthStatus = lazyComponent(() =>
  import('@/domain/health').then((module) => module.HealthStatus),
);

const sessionBrand = <AppLogo size="lg" variant="symbol" />;

const serverStatus = (
  <ErrorBoundary
    fallback={
      <p className="text-sm text-muted-foreground">
        Server status details could not be loaded.
      </p>
    }
  >
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground" role="status">
          Checking server status…
        </p>
      }
    >
      <HealthStatus />
    </Suspense>
  </ErrorBoundary>
);

function pageRoutes(layout: RouteLayout) {
  return routes
    .filter((route) => route.layout === layout)
    .map(({ id, element, path }) => (
      <Route element={element} key={id} path={path} />
    ));
}

export const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen brand={sessionBrand} label="Loading…" />}>
    <Routes>
      <Route
        element={
          <AuthRoute
            access="protected"
            brand={sessionBrand}
            unavailableDetails={serverStatus}
          />
        }
      >
        <Route element={<AppLayout />}>{pageRoutes('app')}</Route>
      </Route>
      <Route
        element={
          <AuthRoute
            access="guest"
            brand={sessionBrand}
            unavailableDetails={serverStatus}
          />
        }
      >
        <Route element={<GuestLayout />}>{pageRoutes('guest')}</Route>
      </Route>
      <Route
        element={
          <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
            <RouteBoundary>
              <Outlet />
            </RouteBoundary>
          </main>
        }
      >
        {pageRoutes('none')}
      </Route>
    </Routes>
  </Suspense>
);
