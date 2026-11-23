import {
  findKana,
  isAcceptedReading,
  isKanaAnswer,
  type Kana,
} from '@shiori/kana';
import type {
  KanaAttemptInput,
  KanaAttemptRecord,
  KanaOccurrence,
  KanaResultOccurrence,
} from '../types/kana-attempt.types.js';

const RECORDED_FIELDS = [
  'corrected',
  'direction',
  'hintUsed',
  'kanaId',
  'outcome',
  'script',
] as const satisfies readonly (keyof KanaAttemptRecord)[];

export function canShareQuestion(
  a: KanaAttemptRecord,
  b: KanaAttemptRecord,
): boolean {
  return (
    a.direction === 'romaji-to-kana' &&
    b.direction === 'romaji-to-kana' &&
    a.kanaId !== b.kanaId &&
    findKana(a.kanaId)?.romaji === findKana(b.kanaId)?.romaji &&
    a.script === b.script
  );
}

function hasConsistentOutcome(
  kana: Kana,
  { answer, corrected, direction, outcome }: KanaAttemptInput,
): boolean {
  const accepted =
    direction === 'romaji-to-kana'
      ? isKanaAnswer(kana, answer)
      : isAcceptedReading(kana, answer);
  switch (outcome) {
    case 'correct':
      return !corrected && accepted;
    case 'incorrect':
      return answer.trim() !== '' && !accepted;
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

export function resultKey(result: KanaResultOccurrence): string {
  return `${occurrenceKey(result)}#${result.kanaId}`;
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
