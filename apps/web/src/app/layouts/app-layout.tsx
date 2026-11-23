import { Link, Outlet, useLocation } from 'react-router';
import { authPaths } from '@/domain/auth';
import { ThemeControl } from '@/shared/theme';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui';
import { AppLogo } from '../branding/app-logo';
import { RouteBoundary } from '../routing/route-boundary';
import { findRoute } from '../routing/route-metadata';
import { AppSidebar } from './ui/app-sidebar';

export const AppLayout = () => {
  const { pathname } = useLocation();
  const title = findRoute(pathname)?.title;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-clip pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] [--app-header-height:calc(3.5rem+1px+env(safe-area-inset-top))]">
        <header className="sticky top-0 z-10 box-content flex h-14 items-center gap-2 border-b bg-background px-3 pt-[env(safe-area-inset-top)] sm:px-4">
          <SidebarTrigger size="icon" />
          <Link
            className="flex min-h-11 shrink-0 items-center rounded-md md:hidden"
            to={authPaths.home}
          >
            <AppLogo size="sm" variant="symbol" />
          </Link>
          {title && (
            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight md:pl-1">
              {title}
            </h1>
          )}
          <div className="ml-auto">
            <ThemeControl />
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-6 pb-(--app-content-bottom) [--app-content-bottom:max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pt-8">
          <RouteBoundary>
            <Outlet />
          </RouteBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
