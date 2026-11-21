import { Link, NavLink, Outlet } from 'react-router';
import { AccountMenu, authPaths } from '@/domain/auth';
import { cn } from '@/shared/helpers/cn';
import { ThemeControl } from '@/shared/theme/theme-control';
import { AppLogo } from '../branding/app-logo';
import { RouteBoundary } from '../routing/route-boundary';
import { getMainNavigation } from '../routing/route-metadata';

const mainNavigation = getMainNavigation();

export const AppLayout = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground',
      isActive && 'bg-muted text-foreground',
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-5 py-2">
          <Link
            className="flex min-h-11 shrink-0 items-center"
            to={authPaths.home}
          >
            <AppLogo size="sm" />
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            <ThemeControl />
            <AccountMenu />
          </div>
        </div>
        <nav
          aria-label="Main"
          className="mx-auto w-full max-w-lg overflow-x-auto px-3 pb-2"
        >
          <ul className="flex gap-1">
            {mainNavigation.map(({ end, label, path }) => (
              <li key={path}>
                <NavLink className={linkClass} end={end} to={path}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <RouteBoundary fallbackClassName="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 py-8">
        <Outlet />
      </RouteBoundary>
    </div>
  );
};
