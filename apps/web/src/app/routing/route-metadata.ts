import { matchPath } from 'react-router';
import product from '@/product-config';
import { type RouteDefinition, routes } from './routes';

export type NavigationItem = {
  end: boolean;
  label: string;
  path: string;
};

export function findRoute(pathname: string): RouteDefinition | undefined {
  return routes.find((route) => matchPath(route.path, pathname) !== null);
}

export function getDocumentTitle(pathname: string): string {
  const route = findRoute(pathname);
  if (!route) return product.name;
  return route.documentTitle ?? `${route.title} — ${product.name}`;
}

export function getMainNavigation(): NavigationItem[] {
  return routes
    .filter((route) => 'inMainNavigation' in route && route.inMainNavigation)
    .map(({ path, title }) => ({
      end: path === '/',
      label: title,
      path,
    }));
}
