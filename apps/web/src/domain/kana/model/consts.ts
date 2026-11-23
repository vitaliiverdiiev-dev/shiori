import type { KanaScript } from '@shiori/kana';
import type { KanaPaths } from './types';

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

export const KANA_DIRECTION = 'kana-to-romaji';
export const MAX_ANSWER_LENGTH = 32;

export const ATTEMPT_BATCH_SIZE = 100;
export const PENDING_ATTEMPTS_PREFIX = 'shiori:kana-attempts:';
export const PENDING_ATTEMPTS_VERSION = 1;
export const SYNC_RETRY_BASE_MS = 2_000;
export const SYNC_RETRY_MAX_MS = 60_000;

export const HTTP_BAD_REQUEST = 400;
export const HTTP_CONFLICT = 409;
export const SYNC_RETRY_FACTOR = 2;
