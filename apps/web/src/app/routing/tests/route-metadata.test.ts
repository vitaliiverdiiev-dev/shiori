import { describe, expect, it } from 'vitest';
import product from '@/product-config';
import {
  findRoute,
  getDocumentTitle,
  getNavigation,
  isNavigationItemActive,
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

  it('places each access level in its own layouts', () => {
    for (const route of routes) {
      const expectedLayouts = {
        guest: ['guest'],
        protected: ['app', 'focus'],
        public: ['none'],
      }[route.access];
      expect(expectedLayouts).toContain(route.layout);
    }
  });

  it('keeps focus-layout routes out of the navigation', () => {
    for (const route of routes.filter(({ layout }) => layout === 'focus')) {
      expect('navigation' in route).toBe(false);
    }
  });
});

describe('getNavigation', () => {
  it('groups the protected routes that declare navigation, in registry order', () => {
    const navigable = routes.filter((route) => 'navigation' in route);

    expect(navigable.every(({ access }) => access === 'protected')).toBe(true);
    expect(
      getNavigation().map(({ items, label }) => [
        label,
        items.map((item) => item.label),
      ]),
    ).toEqual([
      [undefined, ['Home']],
      ['Kana', ['Hiragana', 'Katakana']],
      ['Settings', ['Account', 'Security']],
      ['System', ['Status']],
    ]);
    expect(
      getNavigation().flatMap(({ items }) => items.map(({ path }) => path)),
    ).toEqual(navigable.map(({ path }) => path));
  });

  it('matches only the home link exactly', () => {
    expect(
      getNavigation()
        .flatMap(({ items }) => items)
        .filter(({ end }) => end)
        .map(({ path }) => path),
    ).toEqual(['/']);
  });
});

describe('isNavigationItemActive', () => {
  const items = getNavigation().flatMap((section) => section.items);
  const activeAt = (pathname: string) =>
    items
      .filter((item) => isNavigationItemActive(item, pathname))
      .map(({ label }) => label);

  it.each([
    ['/', ['Home']],
    ['/status', ['Status']],
    ['/kana/katakana', ['Katakana']],
    ['/kana', []],
    ['/settings/security/', ['Security']],
    ['/settings', []],
    ['/no-such-page', []],
  ])('marks %s as %j', (pathname, labels) => {
    expect(activeAt(pathname)).toEqual(labels);
  });
});

describe('findRoute', () => {
  it.each([
    ['/', 'home'],
    ['/kana/hiragana', 'hiragana'],
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
    ['/kana/hiragana', `Hiragana — ${product.name}`],
    ['/sign-up', `Create account — ${product.name}`],
    ['/missing', `Page not found — ${product.name}`],
  ])('titles %s as %s', (pathname, title) => {
    expect(getDocumentTitle(pathname)).toBe(title);
  });
});
