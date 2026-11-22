import { Outlet } from 'react-router';
import { ThemeControl } from '@/shared/theme';
import { AppLogo } from '../branding/app-logo';
import { RouteBoundary } from '../routing/route-boundary';

export const GuestLayout = () => (
  <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:justify-center sm:pt-12">
    <header className="mb-10 flex items-center justify-between gap-3">
      <AppLogo size="md" />
      <ThemeControl />
    </header>
    <main>
      <RouteBoundary>
        <Outlet />
      </RouteBoundary>
    </main>
  </div>
);
