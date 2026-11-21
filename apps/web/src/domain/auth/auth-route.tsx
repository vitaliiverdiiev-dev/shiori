import { type ReactNode, useState } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { getSafeRedirect, getSignInPath } from './helpers/redirect';
import { useSessionStatus } from './hooks/use-session-status';
import { REDIRECT_PARAM, SIGNED_OUT_STATE } from './model/consts';
import type { RouteAccess } from './model/types';
import { SessionChecking } from './ui/session-checking';
import { SessionUnavailable } from './ui/session-unavailable';

type Props = {
  access: RouteAccess;
  brand?: ReactNode;
  unavailableDetails?: ReactNode;
};

export const AuthRoute = ({ access, brand, unavailableDetails }: Props) => {
  const { retry, state, userId } = useSessionStatus();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  if (state === 'authenticated' && !wasAuthenticated) {
    setWasAuthenticated(true);
  }

  if (state === 'checking') return <SessionChecking brand={brand} />;
  if (state === 'unavailable')
    return <SessionUnavailable details={unavailableDetails} onRetry={retry} />;

  if (access === 'protected') {
    return state === 'authenticated' ? (
      <Outlet key={userId} />
    ) : (
      <Navigate
        replace
        state={wasAuthenticated ? SIGNED_OUT_STATE : undefined}
        to={getSignInPath(location)}
      />
    );
  }

  return state === 'authenticated' ? (
    <Navigate replace to={getSafeRedirect(searchParams.get(REDIRECT_PARAM))} />
  ) : (
    <Outlet />
  );
};
