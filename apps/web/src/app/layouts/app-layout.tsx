import { Link, Outlet } from 'react-router';
import { authPaths } from '@/domain/auth';
import { ThemeControl } from '@/shared/theme';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/ui';
import { AppLogo } from '../branding/app-logo';
import { RouteBoundary } from '../routing/route-boundary';
import { AppSidebar } from './ui/app-sidebar';

export const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset className="min-w-0 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <header className="box-content flex h-14 items-center gap-2 border-b px-3 pt-[env(safe-area-inset-top)] sm:px-4">
        <SidebarTrigger size="icon" />
        <Link
          className="flex min-h-11 items-center rounded-md md:hidden"
          to={authPaths.home}
        >
          <AppLogo size="sm" />
        </Link>
        <div className="ml-auto">
          <ThemeControl />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pt-8">
        <RouteBoundary>
          <Outlet />
        </RouteBoundary>
      </div>
    </SidebarInset>
  </SidebarProvider>
);
