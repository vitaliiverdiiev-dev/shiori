import type { KanaId, KanaScript } from '@shiori/kana';
import type {
  KANA_ATTEMPT_DIRECTIONS,
  KANA_ATTEMPT_OUTCOMES,
} from '../constants/kana-attempt.constants.js';

export type KanaAttemptDirection = (typeof KANA_ATTEMPT_DIRECTIONS)[number];

export interface KanaAttemptInput extends KanaOccurrence {
  answer: string;
  corrected: boolean;
  direction: KanaAttemptDirection;
  hintUsed: boolean;
  kanaId: string;
  outcome: KanaAttemptOutcome;
}

export type KanaAttemptOutcome = (typeof KANA_ATTEMPT_OUTCOMES)[number];

export interface KanaAttemptRecord extends KanaOccurrence {
  corrected: boolean;
  direction: KanaAttemptDirection;
  hintUsed: boolean;
  kanaId: KanaId;
  outcome: KanaAttemptOutcome;
  script: KanaScript;
}

export interface KanaOccurrence {
  questionIndex: number;
  roundId: string;
}

export interface KanaProgressEntry {
  assistedCorrect: number;
  attempts: number;
  corrected: number;
  incorrect: number;
  independentCorrect: number;
  kanaId: string;
  lastPracticedAt: Date;
  skipped: number;
}

export type RecordKanaAttemptsResult =
  | { conflicts: KanaOccurrence[]; ok: false; reason: 'conflict' }
  | { duplicates: number; ok: true; recorded: number }
  | { indexes: number[]; ok: false; reason: 'invalid-attempts' };
