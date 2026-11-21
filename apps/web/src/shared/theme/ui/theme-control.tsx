import { Suspense, useDeferredValue, useState } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/shared/ui';
import { useTheme } from '../hooks/use-theme';
import { themeLabels } from '../model/consts';
import { LazyThemeMenu, loadThemeMenu } from './theme-menu-loader';

export const ThemeControl = () => {
  const { theme } = useTheme();
  const [menuRequested, setMenuRequested] = useState(false);
  const menuReady = useDeferredValue(menuRequested);

  const preload = () => {
    loadThemeMenu().catch(() => undefined);
  };

  const trigger = (unavailable: boolean) => (
    <Button
      aria-busy={(menuRequested && !unavailable) || undefined}
      aria-haspopup="menu"
      aria-label={`Theme: ${themeLabels[theme]}`}
      disabled={unavailable}
      onClick={() => {
        setMenuRequested(true);
      }}
      onFocus={preload}
      onPointerEnter={preload}
      size="icon"
      variant="ghost"
    >
      <SunIcon aria-hidden="true" className="dark:hidden" />
      <MoonIcon aria-hidden="true" className="hidden dark:block" />
    </Button>
  );

  return (
    <ErrorBoundary fallback={trigger(true)}>
      <Suspense fallback={trigger(false)}>
        {menuReady ? <LazyThemeMenu /> : trigger(false)}
      </Suspense>
    </ErrorBoundary>
  );
};
