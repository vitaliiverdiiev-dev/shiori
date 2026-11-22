import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`;

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', onChange);
  return () => {
    mql.removeEventListener('change', onChange);
  };
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
