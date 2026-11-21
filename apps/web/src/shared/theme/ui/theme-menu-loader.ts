import { lazyComponent } from '@/shared/helpers/lazy-component';

export const loadThemeMenu = () =>
  import('./theme-menu').then((module) => module.ThemeMenu);

export const LazyThemeMenu = lazyComponent(loadThemeMenu);
