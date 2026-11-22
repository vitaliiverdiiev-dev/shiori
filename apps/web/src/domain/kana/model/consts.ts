import type { KanaPaths, KanaScript } from './types';

export const kanaPaths = {
  hiragana: {
    practice: '/kana/hiragana/practice',
    selection: '/kana/hiragana',
  },
  katakana: {
    practice: '/kana/katakana/practice',
    selection: '/kana/katakana',
  },
} as const satisfies Record<KanaScript, KanaPaths>;

export const KANA_STORAGE_PREFIX = 'shiori:kana:';
export const KANA_STORAGE_VERSION = 1;
