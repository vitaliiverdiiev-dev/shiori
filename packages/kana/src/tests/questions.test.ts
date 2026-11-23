import { describe, expect, it } from 'vitest';
import { getKanaCatalog } from '../catalog.js';
import {
  buildQuestionOrder,
  getExpectedKana,
  planQuestions,
  questionKey,
  shuffle,
  toQuestionUnits,
} from '../questions.js';
import type { KanaQuestion } from '../types.js';

const ten = getKanaCatalog('hiragana')
  .slice(0, 10)
  .map(({ id }) => id);

function counts(order: readonly string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const id of order) result.set(id, (result.get(id) ?? 0) + 1);
  return result;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

describe('shuffle', () => {
  it('returns a permutation and leaves the input untouched', () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items, () => 0);
    expect([...result].sort()).toEqual(items);
    expect(result).not.toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses every swap position (Fisher–Yates)', () => {
    const seen = new Set<string>();
    for (let a = 0; a < 3; a += 1) {
      for (let b = 0; b < 2; b += 1) {
        const draws = [a / 3, b / 2];
        seen.add(shuffle(['x', 'y', 'z'], () => draws.shift() ?? 0).join(''));
      }
    }
    expect(seen.size).toBe(6);
  });
});

describe('buildQuestionOrder', () => {
  it('asks 10 kana ten times each in 100 questions, cycle by cycle', () => {
    const order = buildQuestionOrder(ten, 100, seeded(1));

    expect(order).toHaveLength(100);
    expect([...counts(order).values()]).toEqual(Array(10).fill(10));
    for (let start = 0; start < 100; start += 10) {
      expect(new Set(order.slice(start, start + 10))).toEqual(new Set(ten));
    }
  });

  it('spreads 23 questions over 10 kana as 2 or 3 appearances', () => {
    const order = buildQuestionOrder(ten, 23, seeded(2));
    const appearances = [...counts(order).values()].sort();

    expect(order).toHaveLength(23);
    expect(appearances).toEqual([2, 2, 2, 2, 2, 2, 2, 3, 3, 3]);
    expect(new Set(order.slice(20)).size).toBe(3);
    expect(order.every((id) => ten.includes(id))).toBe(true);
  });

  it('asks fewer questions than kana with distinct kana only', () => {
    const order = buildQuestionOrder(ten, 4, seeded(3));
    expect(order).toHaveLength(4);
    expect(new Set(order).size).toBe(4);
  });

  it('repeats a single kana as often as asked', () => {
    expect(buildQuestionOrder(['hiragana:a'], 50)).toEqual(
      Array(50).fill('hiragana:a'),
    );
  });

  it('never repeats a kana back to back across cycles', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const order = buildQuestionOrder(
        ['hiragana:a', 'hiragana:i', 'hiragana:u'],
        31,
        seeded(seed),
      );
      order.forEach((id, index) => {
        if (index > 0) expect(id).not.toBe(order[index - 1]);
      });
    }
  });

  it('avoids back-to-back repeats with two kana as well', () => {
    const order = buildQuestionOrder(['hiragana:a', 'hiragana:i'], 9, () => 0);
    order.forEach((id, index) => {
      if (index > 0) expect(id).not.toBe(order[index - 1]);
    });
    expect(order).toHaveLength(9);
  });

  it('produces a different arrangement for a new round', () => {
    const first = buildQuestionOrder(ten, 30, seeded(4));
    const second = buildQuestionOrder(ten, 30, seeded(5));
    expect(second).not.toEqual(first);
  });
});

describe('toQuestionUnits', () => {
  const selection = ['hiragana:zi', 'hiragana:di', 'hiragana:a', 'hiragana:zi'];

  it('asks each selected kana once in Kana → romaji', () => {
    expect(toQuestionUnits(selection, 'kana-to-romaji')).toEqual([
      { direction: 'kana-to-romaji', kanaId: 'hiragana:zi' },
      { direction: 'kana-to-romaji', kanaId: 'hiragana:di' },
      { direction: 'kana-to-romaji', kanaId: 'hiragana:a' },
    ]);
  });

  it('asks each reading once in romaji → Kana, even with several members selected', () => {
    expect(toQuestionUnits(selection, 'romaji-to-kana')).toEqual([
      { direction: 'romaji-to-kana', readingId: 'hiragana/a' },
      { direction: 'romaji-to-kana', readingId: 'hiragana/ji' },
    ]);
  });

  it('expects every member of the reading, also an unselected one', () => {
    const [question] = toQuestionUnits(['hiragana:zi'], 'romaji-to-kana');
    if (!question) throw new Error('Expected a question');
    expect(getExpectedKana(question).map(({ id }) => id)).toEqual([
      'hiragana:zi',
      'hiragana:di',
    ]);
  });

  it('combines both directions for the both mode without mixing scripts', () => {
    const units = toQuestionUnits(['katakana:zu', 'katakana:ka'], 'both');
    expect(units.map(questionKey)).toEqual([
      'katakana:zu',
      'katakana:ka',
      'katakana/ka',
      'katakana/zu',
    ]);
    expect(
      units
        .flatMap(getExpectedKana)
        .every(({ script }) => script === 'katakana'),
    ).toBe(true);
  });

  it('ignores unknown ids', () => {
    expect(toQuestionUnits(['hiragana:xx'], 'both')).toEqual([]);
  });
});

describe('planQuestions', () => {
  it('plans exactly the configured number of cards over unique readings', () => {
    const units = toQuestionUnits(
      ['hiragana:zi', 'hiragana:di', 'hiragana:zu', 'hiragana:a'],
      'romaji-to-kana',
    );
    const plan = planQuestions(units, 100, seeded(6));

    expect(units).toHaveLength(3);
    expect(plan).toHaveLength(100);
    expect([...counts(plan.map(questionKey)).values()].sort()).toEqual([
      33, 33, 34,
    ]);
    plan.forEach((question, index) => {
      if (index > 0) expect(question).not.toEqual(plan[index - 1]);
    });
  });

  it('roughly balances the two directions in the both mode', () => {
    const units = toQuestionUnits(ten, 'both');
    const plan = planQuestions(units, 40, seeded(7));
    const directions = counts(plan.map(({ direction }) => direction));

    expect(plan).toHaveLength(40);
    expect(directions.get('kana-to-romaji')).toBe(20);
    expect(directions.get('romaji-to-kana')).toBe(20);
  });

  it('returns no cards without units', () => {
    expect(planQuestions([], 10)).toEqual([]);
  });

  it('alternates the directions of a single kana in the both mode', () => {
    const plan: KanaQuestion[] = planQuestions(
      toQuestionUnits(['hiragana:a'], 'both'),
      5,
      () => 0,
    );
    const directions = plan.map(({ direction }) => direction);
    expect(directions).toHaveLength(5);
    directions.forEach((direction, index) => {
      if (index > 0) expect(direction).not.toBe(directions[index - 1]);
    });
  });
});
