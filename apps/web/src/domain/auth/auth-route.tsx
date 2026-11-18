import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { getSafeRedirect, getSignInPath } from './helpers/redirect';
import { useSessionStatus } from './hooks/use-session-status';
import { REDIRECT_PARAM } from './model/consts';
import type { RouteAccess } from './model/types';
import { SessionChecking } from './ui/session-checking';
import { SessionUnavailable } from './ui/session-unavailable';

type Props = {
  access: RouteAccess;
  unavailableDetails?: ReactNode;
};

export const AuthRoute = ({ access, unavailableDetails }: Props) => {
  const { retry, state, userId } = useSessionStatus();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (state === 'checking') return <SessionChecking />;
  if (state === 'unavailable')
    return <SessionUnavailable details={unavailableDetails} onRetry={retry} />;

  if (access === 'protected') {
    return state === 'authenticated' ? (
      <Outlet key={userId} />
    ) : (
      <Navigate replace to={getSignInPath(location)} />
    );
  }

  return state === 'authenticated' ? (
    <Navigate replace to={getSafeRedirect(searchParams.get(REDIRECT_PARAM))} />
  ) : (
    <Outlet />
  );
};
