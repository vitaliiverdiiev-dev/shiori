import type { ReactNode } from 'react';
import {
  ActivityIcon,
  HouseIcon,
  ShieldIcon,
  UserRoundIcon,
} from 'lucide-react';
import { authPaths } from '@/domain/auth';
import { kanaPaths } from '@/domain/kana';
import product from '@/product-config';
import { lazyComponent } from '@/shared/helpers/lazy-component';
import { NavigationGlyph } from '../layouts/ui/navigation-glyph';

const AccountSettingsPage = lazyComponent(() =>
  import('@/pages/account-settings').then(
    (module) => module.AccountSettingsPage,
  ),
);
const HomePage = lazyComponent(() =>
  import('@/pages/home').then((module) => module.HomePage),
);
const KanaPage = lazyComponent(() =>
  import('@/pages/kana').then((module) => module.KanaPage),
);
const KanaPracticePage = lazyComponent(() =>
  import('@/pages/kana-practice').then((module) => module.KanaPracticePage),
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

export type NavigationGroup = 'kana' | 'main' | 'settings' | 'system';

export type RouteDefinition = RouteShell & {
  id: string;
  documentTitle?: string;
  element: ReactNode;
  path: string;
  title: string;
};

export type RouteLayout = RouteDefinition['layout'];

type RouteNavigation = {
  group: NavigationGroup;
  icon: ReactNode;
};

type RouteShell =
  | { access: 'guest'; layout: 'guest' }
  | { access: 'protected'; layout: 'app'; navigation?: RouteNavigation }
  | { access: 'protected'; layout: 'focus' }
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
    layout: 'app',
    navigation: { group: 'main', icon: <HouseIcon aria-hidden="true" /> },
    path: authPaths.home,
    title: 'Home',
  },
  {
    id: 'hiragana',
    access: 'protected',
    element: <KanaPage script="hiragana" />,
    layout: 'app',
    navigation: { group: 'kana', icon: <NavigationGlyph glyph="あ" /> },
    path: kanaPaths.hiragana.selection,
    title: 'Hiragana',
  },
  {
    id: 'katakana',
    access: 'protected',
    element: <KanaPage script="katakana" />,
    layout: 'app',
    navigation: { group: 'kana', icon: <NavigationGlyph glyph="ア" /> },
    path: kanaPaths.katakana.selection,
    title: 'Katakana',
  },
  {
    id: 'hiraganaPractice',
    access: 'protected',
    element: <KanaPracticePage script="hiragana" />,
    layout: 'focus',
    path: kanaPaths.hiragana.practice,
    title: 'Hiragana practice',
  },
  {
    id: 'katakanaPractice',
    access: 'protected',
    element: <KanaPracticePage script="katakana" />,
    layout: 'focus',
    path: kanaPaths.katakana.practice,
    title: 'Katakana practice',
  },
  {
    id: 'accountSettings',
    access: 'protected',
    element: <AccountSettingsPage />,
    layout: 'app',
    navigation: {
      group: 'settings',
      icon: <UserRoundIcon aria-hidden="true" />,
    },
    path: '/settings/account',
    title: 'Account',
  },
  {
    id: 'securitySettings',
    access: 'protected',
    element: <SecuritySettingsPage />,
    layout: 'app',
    navigation: { group: 'settings', icon: <ShieldIcon aria-hidden="true" /> },
    path: '/settings/security',
    title: 'Security',
  },
  {
    id: 'status',
    access: 'protected',
    element: <StatusPage />,
    layout: 'app',
    navigation: { group: 'system', icon: <ActivityIcon aria-hidden="true" /> },
    path: '/status',
    title: 'Status',
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
