import { Link, NavLink, Outlet } from 'react-router';
import { AccountMenu } from '@/domain/auth';
import { cn } from '@/shared/helpers/cn';

type Props = {
  logoGlyph: string;
  name: string;
};

export const AppLayout = ({ logoGlyph, name }: Props) => {
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
            className="flex min-h-11 shrink-0 items-center gap-2 font-semibold"
            to="/"
          >
            <span
              aria-hidden="true"
              className="font-display text-xl text-primary"
            >
              {logoGlyph}
            </span>
            {name}
          </Link>
          <AccountMenu />
        </div>
        <nav
          aria-label="Main"
          className="mx-auto w-full max-w-lg overflow-x-auto px-3 pb-2"
        >
          <ul className="flex gap-1">
            <li>
              <NavLink className={linkClass} end to="/">
                Home
              </NavLink>
            </li>
            <li>
              <NavLink className={linkClass} to="/status">
                Status
              </NavLink>
            </li>
            <li>
              <NavLink className={linkClass} to="/settings/account">
                Account
              </NavLink>
            </li>
            <li>
              <NavLink className={linkClass} to="/settings/security">
                Security
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <Outlet />
    </div>
  );
};
