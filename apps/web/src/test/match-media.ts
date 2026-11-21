import { vi } from 'vitest';

class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly listeners = new Set<EventListenerOrEventListenerObject>();
  matches: boolean;
  readonly media: string;
  onchange: MediaQueryList['onchange'] = null;

  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (listener) this.listeners.add(listener);
    super.addEventListener(type, listener);
  }

  addListener(): void {
    throw new Error('Use addEventListener');
  }

  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (listener) this.listeners.delete(listener);
    super.removeEventListener(type, listener);
  }

  removeListener(): void {
    throw new Error('Use removeEventListener');
  }
}

export function stubColorScheme(prefersDark: boolean) {
  const query = new FakeMediaQueryList(
    '(prefers-color-scheme: dark)',
    prefersDark,
  );
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    listenerCount: () => query.listeners.size,
    setPrefersDark: (next: boolean) => {
      query.matches = next;
      query.dispatchEvent(new Event('change'));
    },
  };
}
