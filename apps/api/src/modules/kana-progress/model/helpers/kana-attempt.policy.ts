import { findKana, isAcceptedReading, type Kana } from '@shiori/kana';
import type {
  KanaAttemptInput,
  KanaAttemptRecord,
  KanaOccurrence,
} from '../types/kana-attempt.types.js';

const RECORDED_FIELDS = [
  'corrected',
  'direction',
  'hintUsed',
  'kanaId',
  'outcome',
  'script',
] as const satisfies readonly (keyof KanaAttemptRecord)[];

function hasConsistentOutcome(
  kana: Kana,
  { answer, corrected, outcome }: KanaAttemptInput,
): boolean {
  switch (outcome) {
    case 'correct':
      return !corrected && isAcceptedReading(kana, answer);
    case 'incorrect':
      return answer.trim() !== '' && !isAcceptedReading(kana, answer);
    case 'skipped':
      return !corrected && answer === '';
  }
}

export function isSameKanaAttempt(
  a: KanaAttemptRecord,
  b: KanaAttemptRecord,
): boolean {
  return RECORDED_FIELDS.every((field) => a[field] === b[field]);
}

export function occurrenceKey({
  questionIndex,
  roundId,
}: KanaOccurrence): string {
  return `${roundId}#${String(questionIndex)}`;
}

export function toKanaAttemptRecord(
  input: KanaAttemptInput,
): KanaAttemptRecord | null {
  const kana = findKana(input.kanaId);
  if (!kana || !hasConsistentOutcome(kana, input)) return null;
  return {
    corrected: input.corrected,
    direction: input.direction,
    hintUsed: input.hintUsed,
    kanaId: kana.id,
    outcome: input.outcome,
    questionIndex: input.questionIndex,
    roundId: input.roundId.toLowerCase(),
    script: kana.script,
  };
}
