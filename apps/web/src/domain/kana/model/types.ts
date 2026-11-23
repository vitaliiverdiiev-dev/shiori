import type { RecordKanaAttemptsData } from '@shiori/api-client';
import type { KanaId, KanaPracticeMode, KanaQuestion } from '@shiori/kana';

export type AttemptSyncSnapshot = {
  pending: number;
  rejected: number;
  retryable: number;
  status: 'idle' | 'saving' | 'waiting';
};

export type KanaAttempt = {
  answer: string;
  corrected?: boolean;
  hintUsed?: boolean;
  kanaId: KanaId;
  outcome: KanaOutcome;
};

export type KanaGroupState = 'all' | 'none' | 'some';

export type KanaOutcome = 'correct' | 'incorrect' | 'skipped';

export type KanaPaths = {
  practice: string;
  selection: string;
};

export type KanaPracticeAction =
  | { session: KanaPracticeSession; type: 'start' }
  | { type: 'hint' }
  | { field?: number; type: 'input'; value: string }
  | { from?: KanaPracticeSession; type: 'next' }
  | { type: 'skip' }
  | { type: 'submit' };

export type KanaPracticePhase = 'answering' | 'complete' | 'feedback';

export type KanaPracticeSession = {
  hintShown: boolean;
  hintUsed: boolean;
  inputs: readonly string[];
  mode: KanaPracticeMode;
  order: readonly KanaQuestion[];
  position: number;
  questionCount: number;
  results: readonly KanaQuestionResult[];
  roundId: string;
  selection: readonly KanaId[];
};

export type KanaPracticeSummary = {
  assisted: number;
  correct: number;
  incorrect: number;
  missed: readonly KanaId[];
  skipped: number;
  total: number;
};

export type KanaProgressStats = {
  assistedCorrect: number;
  attempts: number;
  corrected: number;
  incorrect: number;
  independentCorrect: number;
  kanaId: string;
  lastPracticedAt: string;
  skipped: number;
};

export type KanaQuestionResult = readonly KanaAttempt[];

export type PendingKanaAttempt =
  RecordKanaAttemptsData['body']['attempts'][number];

export type PendingKanaAttempts = {
  invalid: readonly PendingKanaAttempt[];
  pending: readonly PendingKanaAttempt[];
  rejected: readonly PendingKanaAttempt[];
};

export type StoredKanaState = {
  questionCount: null | number;
  selection: readonly KanaId[];
  session: KanaPracticeSession | null;
};
