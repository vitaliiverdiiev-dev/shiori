export interface Kana {
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
}

export type KanaId = `${KanaScript}:${string}`;

export interface KanaRow {
  id: string;
  cells: readonly (Kana | null)[];
  kana: readonly Kana[];
  label: string;
}

export interface KanaRowDefinition {
  id: string;
  section: KanaSection;
  sounds: readonly (KanaSoundDefinition | null)[];
}

export type KanaScript = 'hiragana' | 'katakana';

export interface KanaScriptInfo {
  label: string;
  nativeLabel: string;
}

export type KanaSection = 'basic' | 'dakuten' | 'yoon';

export interface KanaSectionGroup {
  id: KanaSection;
  description: string;
  kana: readonly Kana[];
  rows: readonly KanaRow[];
  title: string;
}

export interface KanaSectionInfo {
  description: string;
  title: string;
}

export interface KanaSoundDefinition {
  id: string;
  alternatives?: readonly string[];
  hiragana: string;
  katakana: string;
  romaji: string;
}
