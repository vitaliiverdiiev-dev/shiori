export const KANA_ATTEMPT_DIRECTIONS = ['kana-to-romaji'] as const;
export const KANA_ATTEMPT_OUTCOMES = [
  'correct',
  'incorrect',
  'skipped',
] as const;
export const KANA_SCRIPTS = ['hiragana', 'katakana'] as const;

export const MAX_ANSWER_LENGTH = 32;
export const MAX_ATTEMPTS_PER_REQUEST = 100;
export const MAX_KANA_ID_LENGTH = 32;
export const MAX_QUESTIONS_PER_ROUND = 1_000;
export const MAX_USER_ID_LENGTH = 255;
