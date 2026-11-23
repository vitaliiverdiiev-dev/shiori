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

export const CORRECT_ADVANCE_DELAY_MS = 400;

export const MAX_QUESTION_COUNT = 1_000;

export const KANA_STORAGE_PREFIX = 'shiori:kana:';
export const KANA_STORAGE_VERSION = 1;
