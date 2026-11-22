import type { ReactNode } from 'react';
import { matchPath } from 'react-router';
import product from '@/product-config';
import { type NavigationGroup, type RouteDefinition, routes } from './routes';

export type NavigationItem = {
  end: boolean;
  icon: ReactNode;
  label: string;
  path: string;
};

export type NavigationSection = {
  group: NavigationGroup;
  items: NavigationItem[];
  label: string | undefined;
};

const navigationGroupLabels: Record<NavigationGroup, string | undefined> = {
  kana: 'Kana',
  main: undefined,
  settings: 'Settings',
  system: 'System',
};

export function findRoute(pathname: string): RouteDefinition | undefined {
  return routes.find((route) => matchPath(route.path, pathname) !== null);
}

export function getDocumentTitle(pathname: string): string {
  const route = findRoute(pathname);
  if (!route) return product.name;
  return route.documentTitle ?? `${route.title} — ${product.name}`;
}

export function getNavigation(): NavigationSection[] {
  const sections = new Map<NavigationGroup, NavigationItem[]>();
  for (const route of routes) {
    if (!('navigation' in route)) continue;
    const { group, icon } = route.navigation;
    sections.set(group, [
      ...(sections.get(group) ?? []),
      { end: route.path === '/', icon, label: route.title, path: route.path },
    ]);
  }
  return Array.from(sections, ([group, items]) => ({
    group,
    items,
    label: navigationGroupLabels[group],
  }));
}

export function isNavigationItemActive(
  { end, path }: NavigationItem,
  pathname: string,
): boolean {
  return matchPath({ end, path }, pathname) !== null;
}
