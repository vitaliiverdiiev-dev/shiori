import { describe, expect, it } from 'vitest';
import product from '@/product-config';
import {
  findRoute,
  getDocumentTitle,
  getMainNavigation,
} from '../route-metadata';
import { routes } from '../routes';

describe('route registry', () => {
  it('gives every route a unique id and path', () => {
    expect(new Set(routes.map(({ id }) => id)).size).toBe(routes.length);
    expect(new Set(routes.map(({ path }) => path)).size).toBe(routes.length);
  });

  it('keeps the catch-all route last so it never shadows another route', () => {
    expect(routes.filter(({ path }) => path === '*')).toHaveLength(1);
    expect(routes.at(-1)?.path).toBe('*');
  });

  it('places each access level in its own layout', () => {
    for (const route of routes) {
      const expectedLayout = {
        guest: 'guest',
        protected: 'app',
        public: 'none',
      }[route.access];
      expect(route.layout).toBe(expectedLayout);
    }
  });
});

describe('getMainNavigation', () => {
  it('lists the protected routes marked for main navigation, in registry order', () => {
    const marked = routes.filter(
      (route) => 'inMainNavigation' in route && route.inMainNavigation,
    );

    expect(getMainNavigation()).toEqual(
      marked.map(({ path, title }) => ({
        end: path === '/',
        label: title,
        path,
      })),
    );
    expect(marked.every(({ access }) => access === 'protected')).toBe(true);
    expect(getMainNavigation().map(({ label }) => label)).toEqual([
      'Home',
      'Status',
      'Account',
      'Security',
    ]);
  });

  it('matches only the home link exactly', () => {
    expect(
      getMainNavigation()
        .filter(({ end }) => end)
        .map(({ path }) => path),
    ).toEqual(['/']);
  });
});

describe('findRoute', () => {
  it.each([
    ['/', 'home'],
    ['/settings/security', 'securitySettings'],
    ['/settings/security/', 'securitySettings'],
    ['/sign-in', 'signIn'],
    ['/settings', 'notFound'],
    ['/no-such-page', 'notFound'],
  ])('resolves %s to %s', (pathname, id) => {
    expect(findRoute(pathname)?.id).toBe(id);
  });
});

describe('getDocumentTitle', () => {
  it('uses the product identity on the home page', () => {
    expect(getDocumentTitle('/')).toBe(`${product.name} — ${product.tagline}`);
  });

  it.each([
    ['/settings/account', `Account — ${product.name}`],
    ['/sign-up', `Create account — ${product.name}`],
    ['/missing', `Page not found — ${product.name}`],
  ])('titles %s as %s', (pathname, title) => {
    expect(getDocumentTitle(pathname)).toBe(title);
  });
});
