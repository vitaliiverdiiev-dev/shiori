import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import {
  applyThemePreference,
  readThemePreference,
  type Theme,
  type ThemeConfig,
  writeThemePreference,
} from './theme';
import { ThemeContext } from './theme-context';

type Props = {
  children: ReactNode;
  config: ThemeConfig;
};

export const ThemeProvider = ({ children, config }: Props) => {
  const [theme, setThemeState] = useState(() =>
    readThemePreference(config.storageKey),
  );

  useLayoutEffect(() => {
    applyThemePreference(theme, config);
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      applyThemePreference('system', config);
    };
    media.addEventListener('change', followSystem);
    return () => {
      media.removeEventListener('change', followSystem);
    };
  }, [config, theme]);

  useEffect(() => {
    const followOtherTabs = (event: StorageEvent) => {
      if (event.key === null || event.key === config.storageKey) {
        setThemeState(readThemePreference(config.storageKey));
      }
    };
    window.addEventListener('storage', followOtherTabs);
    return () => {
      window.removeEventListener('storage', followOtherTabs);
    };
  }, [config.storageKey]);

  const setTheme = (next: Theme) => {
    writeThemePreference(config.storageKey, next);
    setThemeState(next);
  };

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>;
};
