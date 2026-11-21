import { useEffect, useEffectEvent } from 'react';
import { isThemeShortcut } from '../helpers/theme';

export function useThemeShortcut(enabled: boolean, onShortcut: () => void) {
  const handleShortcut = useEffectEvent(onShortcut);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isThemeShortcut(event)) handleShortcut();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}
