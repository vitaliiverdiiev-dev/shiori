import { describe, expect, it } from 'vitest';
import type { KanaAttemptInput } from '../../types/kana-attempt.types.js';
import {
  isSameKanaAttempt,
  occurrenceKey,
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
