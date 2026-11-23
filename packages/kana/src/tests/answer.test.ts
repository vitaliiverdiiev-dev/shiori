import { describe, expect, it } from 'vitest';
import {
  isAcceptedReading,
  isKanaAnswer,
  matchKanaAnswers,
  normalizeAnswer,
} from '../answer.js';
import { findKana, findReadingGroup } from '../catalog.js';

function accepts(id: string, answer: string): boolean {
  const kana = findKana(id);
  if (!kana) throw new Error(`Missing kana ${id}`);
  return isAcceptedReading(kana, answer);
}

describe('normalizeAnswer', () => {
  it('trims, lower-cases and folds full-width Latin letters', () => {
    expect(normalizeAnswer('  ShI \t')).toBe('shi');
    expect(normalizeAnswer('ＫＹＵ')).toBe('kyu');
  });
});

describe('isAcceptedReading', () => {
  it.each([
    ['hiragana:a', 'a'],
    ['katakana:a', 'A'],
    ['hiragana:kyu', 'kyu'],
    ['katakana:si', ' shi '],
    ['katakana:si', 'si'],
    ['hiragana:ti', 'chi'],
    ['hiragana:ti', 'ti'],
    ['katakana:gyo', 'GYO'],
    ['hiragana:zi', 'ji'],
    ['hiragana:zi', 'zi'],
    ['hiragana:di', 'ji'],
    ['hiragana:di', 'di'],
    ['hiragana:zu', 'zu'],
    ['hiragana:du', 'zu'],
    ['hiragana:du', 'du'],
    ['hiragana:o', 'o'],
    ['hiragana:wo', 'wo'],
    ['katakana:wo', 'o'],
    ['hiragana:n', 'n'],
    ['hiragana:n', 'nn'],
    ['hiragana:n', "n'"],
    ['hiragana:sya', 'sha'],
    ['hiragana:sya', 'sya'],
    ['hiragana:zya', 'ja'],
    ['hiragana:zya', 'zya'],
    ['hiragana:zya', 'jya'],
    ['hiragana:tya', 'cha'],
    ['hiragana:tya', 'tya'],
    ['hiragana:tya', 'cya'],
  ])('accepts %s as %j', (id, answer) => {
    expect(accepts(id, answer)).toBe(true);
  });

  it.each([
    ['hiragana:o', 'wo'],
    ['hiragana:zu', 'du'],
    ['hiragana:zi', 'di'],
    ['hiragana:si', 'shii'],
    ['hiragana:si', 's hi'],
    ['hiragana:si', 'し'],
    ['hiragana:sya', 'shya'],
    ['hiragana:kyu', 'kiyu'],
    ['hiragana:n', 'm'],
    ['hiragana:a', ''],
  ])('rejects %s as %j', (id, answer) => {
    expect(accepts(id, answer)).toBe(false);
  });
});

describe('isKanaAnswer', () => {
  it('compares the normalized answer with the form of the same script', () => {
    const kana = (id: string) => {
      const found = findKana(id);
      if (!found) throw new Error(`Missing kana ${id}`);
      return found;
    };
    expect(isKanaAnswer(kana('hiragana:si'), ' し ')).toBe(true);
    expect(isKanaAnswer(kana('hiragana:kya'), 'きゃ')).toBe(true);
    expect(isKanaAnswer(kana('katakana:zi'), 'ｼﾞ')).toBe(true);
    expect(isKanaAnswer(kana('hiragana:zi'), 'じ')).toBe(true);
    expect(isKanaAnswer(kana('hiragana:si'), 'シ')).toBe(false);
    expect(isKanaAnswer(kana('katakana:si'), 'し')).toBe(false);
    expect(isKanaAnswer(kana('hiragana:si'), 'shi')).toBe(false);
    expect(isKanaAnswer(kana('hiragana:kya'), 'きや')).toBe(false);
    expect(isKanaAnswer(kana('hiragana:a'), '')).toBe(false);
  });
});

describe('matchKanaAnswers', () => {
  const group = (id: string) => findReadingGroup(id)?.kana ?? [];
  const results = (id: string, answers: readonly string[]) =>
    matchKanaAnswers(group(id), answers).map(({ answer, correct, kana }) => [
      kana.form,
      answer,
      correct,
    ]);

  it.each([
    [
      ['じ', 'ぢ'],
      [
        ['じ', 'じ', true],
        ['ぢ', 'ぢ', true],
      ],
    ],
    [
      ['ぢ', 'じ'],
      [
        ['じ', 'じ', true],
        ['ぢ', 'ぢ', true],
      ],
    ],
    [
      ['じ', 'じ'],
      [
        ['じ', 'じ', true],
        ['ぢ', 'じ', false],
      ],
    ],
    [
      ['じ', 'ち'],
      [
        ['じ', 'じ', true],
        ['ぢ', 'ち', false],
      ],
    ],
    [
      ['ち', 'じ'],
      [
        ['じ', 'じ', true],
        ['ぢ', 'ち', false],
      ],
    ],
    [
      ['ち', 'つ'],
      [
        ['じ', 'ち', false],
        ['ぢ', 'つ', false],
      ],
    ],
    [
      [' ぢ ', 'ジ'],
      [
        ['じ', 'ジ', false],
        ['ぢ', 'ぢ', true],
      ],
    ],
  ])('matches %j to ji regardless of order', (answers, expected) => {
    expect(results('hiragana/ji', answers)).toEqual(expected);
  });

  it('matches each expected kana at most once', () => {
    expect(
      results('katakana/zu', ['ヅ', 'ヅ']).filter(([, , correct]) => correct),
    ).toHaveLength(1);
  });

  it('treats a multi-code-point yōon form as one answer', () => {
    expect(results('hiragana/kya', ['きゃ'])).toEqual([['きゃ', 'きゃ', true]]);
    expect(results('hiragana/kya', ['き'])).toEqual([['きゃ', 'き', false]]);
  });
});
