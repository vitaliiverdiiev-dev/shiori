import { describe, expect, it } from 'vitest';
import type { KanaAttemptInput } from '../../types/kana-attempt.types.js';
import {
  canShareQuestion,
  isSameKanaAttempt,
  occurrenceKey,
  resultKey,
  toKanaAttemptRecord,
} from '../kana-attempt.policy.js';

const ROUND = '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10';

function attempt(patch: Partial<KanaAttemptInput> = {}): KanaAttemptInput {
  return {
    answer: 'shi',
    corrected: false,
    direction: 'kana-to-romaji',
    hintUsed: false,
    kanaId: 'hiragana:si',
    outcome: 'correct',
    questionIndex: 0,
    roundId: ROUND,
    ...patch,
  };
}

describe('toKanaAttemptRecord', () => {
  it('derives the script from the canonical catalog', () => {
    expect(toKanaAttemptRecord(attempt({ kanaId: 'katakana:si' }))).toEqual({
      corrected: false,
      direction: 'kana-to-romaji',
      hintUsed: false,
      kanaId: 'katakana:si',
      outcome: 'correct',
      questionIndex: 0,
      roundId: ROUND,
      script: 'katakana',
    });
  });

  it.each([
    ['an accepted alternative', attempt({ answer: 'si' })],
    ['full-width input', attempt({ answer: 'ＳＨＩ' })],
    ['a hinted correct answer', attempt({ hintUsed: true })],
    ['an incorrect answer', attempt({ answer: 'chi', outcome: 'incorrect' })],
    [
      'an incorrect answer corrected later with the hint',
      attempt({
        answer: 'chi',
        corrected: true,
        hintUsed: true,
        outcome: 'incorrect',
      }),
    ],
    ['a skip', attempt({ answer: '', outcome: 'skipped' })],
    [
      'a skip after the hint',
      attempt({ answer: '', hintUsed: true, outcome: 'skipped' }),
    ],
  ])('accepts %s', (_, input) => {
    expect(toKanaAttemptRecord(input)).not.toBeNull();
  });

  it.each([
    ['an unknown kana', attempt({ kanaId: 'hiragana:wi' })],
    ['a kana id without a script', attempt({ kanaId: 'si' })],
    ['a correct outcome with a wrong answer', attempt({ answer: 'chi' })],
    [
      'an incorrect outcome with a right answer',
      attempt({ outcome: 'incorrect' }),
    ],
    [
      'an incorrect outcome without an answer',
      attempt({ answer: ' ', outcome: 'incorrect' }),
    ],
    ['a corrected correct answer', attempt({ corrected: true })],
    ['a skip with an answer', attempt({ outcome: 'skipped' })],
    [
      'a corrected skip',
      attempt({ answer: '', corrected: true, outcome: 'skipped' }),
    ],
  ])('rejects %s', (_, input) => {
    expect(toKanaAttemptRecord(input)).toBeNull();
  });

  it('identifies an occurrence by round and question, regardless of UUID case', () => {
    const lower = toKanaAttemptRecord(attempt({ questionIndex: 7 }));
    const upper = toKanaAttemptRecord(
      attempt({ questionIndex: 7, roundId: ROUND.toUpperCase() }),
    );
    expect(lower && occurrenceKey(lower)).toBe(upper && occurrenceKey(upper));
    expect(occurrenceKey({ questionIndex: 1, roundId: ROUND })).not.toBe(
      occurrenceKey({ questionIndex: 7, roundId: ROUND }),
    );
  });
});

describe('isSameKanaAttempt', () => {
  const record = (patch: Partial<KanaAttemptInput> = {}) => {
    const result = toKanaAttemptRecord(attempt(patch));
    if (!result) throw new Error('expected a valid attempt');
    return result;
  };

  it('ignores the submitted answer text but compares every recorded fact', () => {
    expect(isSameKanaAttempt(record(), record({ answer: 'si' }))).toBe(true);
    expect(isSameKanaAttempt(record(), record({ hintUsed: true }))).toBe(false);
    expect(
      isSameKanaAttempt(
        record(),
        record({ answer: 'chi', outcome: 'incorrect' }),
      ),
    ).toBe(false);
    expect(isSameKanaAttempt(record(), record({ kanaId: 'katakana:si' }))).toBe(
      false,
    );
  });
});

describe('romaji → kana attempts', () => {
  const reverse = (patch: Partial<KanaAttemptInput> = {}) =>
    attempt({
      answer: 'じ',
      direction: 'romaji-to-kana',
      kanaId: 'hiragana:zi',
      ...patch,
    });

  it.each([
    ['the expected kana', reverse()],
    ['a decomposed kana', reverse({ answer: 'じ' })],
    ['half-width katakana', reverse({ answer: 'ｼﾞ', kanaId: 'katakana:zi' })],
    ['a yōon', reverse({ answer: 'きゃ', kanaId: 'hiragana:kya' })],
    [
      'another member of the reading as incorrect',
      reverse({ kanaId: 'hiragana:di', outcome: 'incorrect' }),
    ],
    ['romaji as incorrect', reverse({ answer: 'ji', outcome: 'incorrect' })],
    [
      'the other script as incorrect',
      reverse({ answer: 'ジ', outcome: 'incorrect' }),
    ],
    ['a skip', reverse({ answer: '', outcome: 'skipped' })],
  ])('accepts %s', (_, input) => {
    expect(toKanaAttemptRecord(input)).not.toBeNull();
  });

  it.each([
    ['romaji as correct', reverse({ answer: 'ji' })],
    ['the other script as correct', reverse({ answer: 'ジ' })],
    [
      'another member of the reading as correct',
      reverse({ kanaId: 'hiragana:di' }),
    ],
    ['the expected kana as incorrect', reverse({ outcome: 'incorrect' })],
  ])('rejects %s', (_, input) => {
    expect(toKanaAttemptRecord(input)).toBeNull();
  });
});

describe('canShareQuestion', () => {
  const record = (patch: Partial<KanaAttemptInput>) => {
    const result = toKanaAttemptRecord(attempt(patch));
    if (!result) throw new Error('expected a valid attempt');
    return result;
  };
  const zi = record({
    answer: 'じ',
    direction: 'romaji-to-kana',
    kanaId: 'hiragana:zi',
  });

  it('lets the members of one reading share a romaji → kana question', () => {
    const di = record({
      answer: 'じ',
      direction: 'romaji-to-kana',
      kanaId: 'hiragana:di',
      outcome: 'incorrect',
    });
    expect(canShareQuestion(zi, di)).toBe(true);
    expect(resultKey(zi)).not.toBe(resultKey(di));
    expect(occurrenceKey(zi)).toBe(occurrenceKey(di));
  });

  it.each([
    [
      'another reading',
      { answer: 'ず', direction: 'romaji-to-kana', kanaId: 'hiragana:zu' },
    ],
    [
      'the other script',
      {
        answer: 'ジ',
        direction: 'romaji-to-kana',
        kanaId: 'katakana:di',
        outcome: 'incorrect',
      },
    ],
    ['a kana → romaji result', { answer: 'ji', kanaId: 'hiragana:di' }],
  ] as const)('refuses %s in the same question', (_, patch) => {
    expect(canShareQuestion(zi, record(patch))).toBe(false);
  });

  it('keeps one kana per kana → romaji question', () => {
    expect(
      canShareQuestion(
        record({}),
        record({ answer: 'a', kanaId: 'hiragana:a' }),
      ),
    ).toBe(false);
  });
});
