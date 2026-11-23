import { describe, expect, it } from 'vitest';
import { describeQuestionCount, parseQuestionCount } from '../question-count';

describe('parseQuestionCount', () => {
  it.each([
    ['1', 1],
    [' 100 ', 100],
    ['1000', 1000],
  ])('accepts %j', (text, count) => {
    expect(parseQuestionCount(text)).toBe(count);
  });

  it.each(['', '0', '-3', '2.5', '1e2', '1001', 'ten', '9007199254740993'])(
    'rejects %j',
    (text) => {
      expect(parseQuestionCount(text)).toBeNull();
    },
  );
});

describe('describeQuestionCount', () => {
  it.each([
    [10, 10, '10 questions · each kana once'],
    [100, 10, '100 questions · each kana 10 times'],
    [23, 10, '23 questions · each kana 2–3 times'],
    [15, 10, '15 questions · each kana 1–2 times'],
    [4, 10, '4 questions from 10 kana'],
    [1, 1, '1 question · each kana once'],
  ])('describes %i questions over %i kana', (count, kana, text) => {
    expect(describeQuestionCount(count, kana)).toBe(text);
  });
});
