import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import {
  applyThemePreference,
  readShortcutEnabled,
  readThemePreference,
  resolveTheme,
  writeShortcutEnabled,
  writeThemePreference,
} from '../helpers/theme';
import { ThemeContext } from '../hooks/theme-context';
import { useThemeShortcut } from '../hooks/use-theme-shortcut';
import { DARK_SCHEME_QUERY } from '../model/consts';
import type { Theme, ThemeConfig } from '../model/types';

type Props = {
  children: ReactNode;
  config: ThemeConfig;
};

export const ThemeProvider = ({ children, config }: Props) => {
  const [theme, setThemeState] = useState(() =>
    readThemePreference(config.storageKey),
  );
  const [shortcutEnabled, setShortcutState] = useState(() =>
    readShortcutEnabled(config.shortcutStorageKey),
  );

  useLayoutEffect(() => {
    applyThemePreference(theme, config);
    if (theme !== 'system') return;

    const media = window.matchMedia(DARK_SCHEME_QUERY);
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
      if (event.key === null || event.key === config.shortcutStorageKey) {
        setShortcutState(readShortcutEnabled(config.shortcutStorageKey));
      }
    };
    window.addEventListener('storage', followOtherTabs);
    return () => {
      window.removeEventListener('storage', followOtherTabs);
    };
  }, [config.shortcutStorageKey, config.storageKey]);

  const setTheme = (next: Theme) => {
    writeThemePreference(config.storageKey, next);
    setThemeState(next);
  };

  const setShortcutEnabled = (enabled: boolean) => {
    writeShortcutEnabled(config.shortcutStorageKey, enabled);
    setShortcutState(enabled);
  };

  useThemeShortcut(shortcutEnabled, () => {
    setTheme(resolveTheme(theme) === 'dark' ? 'light' : 'dark');
  });

  return (
    <ThemeContext
      value={{ setShortcutEnabled, setTheme, shortcutEnabled, theme }}
    >
      {children}
    </ThemeContext>
  );
};
