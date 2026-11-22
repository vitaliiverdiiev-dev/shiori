export type Kana = {
  id: KanaId;
  alternatives: readonly string[];
  counterpartId: KanaId;
  form: string;
  order: number;
  romaji: string;
  rowId: string;
  script: KanaScript;
  section: KanaSection;
  soundId: string;
};

export type KanaAttempt = {
  answer: string;
  corrected?: boolean;
  kanaId: KanaId;
  outcome: KanaOutcome;
};

export type KanaGroupState = 'all' | 'none' | 'some';

export type KanaId = `${KanaScript}:${string}`;

export type KanaOutcome = 'correct' | 'incorrect' | 'skipped';

export type KanaPaths = {
  practice: string;
  selection: string;
};

export type KanaPracticeAction =
  | { session: KanaPracticeSession; type: 'start' }
  | { type: 'input'; value: string }
  | { from?: KanaPracticeSession; type: 'next' }
  | { type: 'skip' }
  | { type: 'submit' };

export type KanaPracticePhase = 'answering' | 'complete' | 'feedback';

export type KanaPracticeSession = {
  attempts: readonly KanaAttempt[];
  input: string;
  order: readonly KanaId[];
  position: number;
  selection: readonly KanaId[];
};

export type KanaPracticeSummary = {
  correct: number;
  incorrect: number;
  missed: readonly KanaId[];
  skipped: number;
  total: number;
};

export type KanaRow = {
  id: string;
  cells: readonly (Kana | null)[];
  kana: readonly Kana[];
  label: string;
};

export type KanaRowDefinition = {
  id: string;
  section: KanaSection;
  sounds: readonly (KanaSoundDefinition | null)[];
};

export type KanaScript = 'hiragana' | 'katakana';

export type KanaScriptInfo = {
  label: string;
  nativeLabel: string;
};

export type KanaSection = 'basic' | 'dakuten' | 'yoon';

export type KanaSectionGroup = {
  id: KanaSection;
  description: string;
  kana: readonly Kana[];
  rows: readonly KanaRow[];
  title: string;
};

export type KanaSectionInfo = {
  description: string;
  title: string;
};

export type KanaSoundDefinition = {
  id: string;
  alternatives?: readonly string[];
  hiragana: string;
  katakana: string;
  romaji: string;
};

export type StoredKanaState = {
  selection: readonly KanaId[];
  session: KanaPracticeSession | null;
};
