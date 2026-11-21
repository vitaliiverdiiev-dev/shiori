import { Suspense, useState } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { lazyComponent } from '@/shared/helpers/lazy-component';
import { Button } from '@/shared/ui';
import { themeLabels } from './theme';
import { useTheme } from './use-theme';

const loadModeToggle = () =>
  import('./mode-toggle').then((module) => module.ModeToggle);
const ModeToggle = lazyComponent(loadModeToggle);

export const ThemeControl = () => {
  const { theme } = useTheme();
  const [menuRequested, setMenuRequested] = useState(false);

  const preload = () => {
    loadModeToggle().catch(() => undefined);
  };

  const trigger = (unavailable: boolean) => (
    <Button
      aria-haspopup="menu"
      aria-label={`Theme: ${themeLabels[theme]}`}
      disabled={unavailable}
      onClick={() => {
        setMenuRequested(true);
      }}
      onFocus={preload}
      onPointerEnter={preload}
      onTouchStart={preload}
      size="icon"
      variant="ghost"
    >
      <SunIcon aria-hidden="true" className="dark:hidden" />
      <MoonIcon aria-hidden="true" className="hidden dark:block" />
    </Button>
  );

  if (!menuRequested) return trigger(false);

  return (
    <ErrorBoundary fallback={trigger(true)}>
      <Suspense fallback={trigger(false)}>
        <ModeToggle defaultOpen />
      </Suspense>
    </ErrorBoundary>
  );
};
