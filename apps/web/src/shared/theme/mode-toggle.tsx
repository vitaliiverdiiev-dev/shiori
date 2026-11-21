import { MoonIcon, SunIcon } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { isTheme, themeLabels, themes } from './theme';
import { useTheme } from './use-theme';

type Props = {
  defaultOpen?: boolean;
};

export const ModeToggle = ({ defaultOpen = false }: Props) => {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
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
      <DropdownMenuContent align="end" className="w-36">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
