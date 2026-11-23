import { describe, expect, it } from 'vitest';
import { isAcceptedReading, normalizeAnswer } from '../answer.js';
import { findKana } from '../catalog.js';

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
