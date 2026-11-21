import { createContext } from 'react';
import type { Theme } from '../model/types';

export type ThemeContextValue = {
  setShortcutEnabled: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  shortcutEnabled: boolean;
  theme: Theme;
};

export const ThemeContext = createContext<null | ThemeContextValue>(null);
