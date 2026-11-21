import type { ReactNode } from 'react';
import { authPaths } from '@/domain/auth';
import product from '@/product-config';
import { lazyComponent } from '@/shared/helpers/lazy-component';

const AccountSettingsPage = lazyComponent(() =>
  import('@/pages/account-settings').then(
    (module) => module.AccountSettingsPage,
  ),
);
const HomePage = lazyComponent(() =>
  import('@/pages/home').then((module) => module.HomePage),
);
const NotFoundPage = lazyComponent(() =>
  import('@/pages/not-found').then((module) => module.NotFoundPage),
);
const SecuritySettingsPage = lazyComponent(() =>
  import('@/pages/security-settings').then(
    (module) => module.SecuritySettingsPage,
  ),
);
const SignInPage = lazyComponent(() =>
  import('@/pages/sign-in').then((module) => module.SignInPage),
);
const SignUpPage = lazyComponent(() =>
  import('@/pages/sign-up').then((module) => module.SignUpPage),
);
const StatusPage = lazyComponent(() =>
  import('@/pages/status').then((module) => module.StatusPage),
);

export type RouteDefinition = RouteShell & {
  id: string;
  documentTitle?: string;
  element: ReactNode;
  path: string;
  title: string;
};

export type RouteLayout = RouteDefinition['layout'];

type RouteShell =
  | { access: 'guest'; layout: 'guest' }
  | { access: 'protected'; inMainNavigation?: boolean; layout: 'app' }
  | { access: 'public'; layout: 'none' };

// INVARIANT: Declaration order is navigation order and match precedence; the `*` route stays last.
const routeDefinitions = [
  {
    id: 'home',
    access: 'protected',
    documentTitle: `${product.name} — ${product.tagline}`,
    element: (
      <HomePage
        logoGlyph={product.logoGlyph}
        name={product.name}
        nameJa={product.nameJa}
        tagline={product.tagline}
      />
    ),
    inMainNavigation: true,
    layout: 'app',
    path: authPaths.home,
    title: 'Home',
  },
  {
    id: 'status',
    access: 'protected',
    element: <StatusPage />,
    inMainNavigation: true,
    layout: 'app',
    path: '/status',
    title: 'Status',
  },
  {
    id: 'accountSettings',
    access: 'protected',
    element: <AccountSettingsPage />,
    inMainNavigation: true,
    layout: 'app',
    path: '/settings/account',
    title: 'Account',
  },
  {
    id: 'securitySettings',
    access: 'protected',
    element: <SecuritySettingsPage />,
    inMainNavigation: true,
    layout: 'app',
    path: '/settings/security',
    title: 'Security',
  },
  {
    id: 'signIn',
    access: 'guest',
    element: <SignInPage />,
    layout: 'guest',
    path: authPaths.signIn,
    title: 'Sign in',
  },
  {
    id: 'signUp',
    access: 'guest',
    element: <SignUpPage />,
    layout: 'guest',
    path: authPaths.signUp,
    title: 'Create account',
  },
  {
    id: 'notFound',
    access: 'public',
    element: <NotFoundPage />,
    layout: 'none',
    path: '*',
    title: 'Page not found',
  },
] as const satisfies readonly RouteDefinition[];

export type RouteId = (typeof routeDefinitions)[number]['id'];

export const routes: readonly RouteDefinition[] = routeDefinitions;
