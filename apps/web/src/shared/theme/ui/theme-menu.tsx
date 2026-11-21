import { MoonIcon, SunIcon } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { isTheme } from '../helpers/theme';
import { useTheme } from '../hooks/use-theme';
import { THEME_SHORTCUT_KEY, themeLabels, themes } from '../model/consts';

export const ThemeMenu = () => {
  const { setShortcutEnabled, setTheme, shortcutEnabled, theme } = useTheme();

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Theme: ${themeLabels[theme]}`}
            size="icon"
            variant="ghost"
          />
        }
      >
        <SunIcon aria-hidden="true" className="dark:hidden" />
        <MoonIcon aria-hidden="true" className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup
          onValueChange={(value: unknown) => {
            if (isTheme(value)) setTheme(value);
          }}
          value={theme}
        >
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          {themes.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {themeLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={shortcutEnabled}
          onCheckedChange={setShortcutEnabled}
        >
          {`Switch with ${THEME_SHORTCUT_KEY.toUpperCase()} key`}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
