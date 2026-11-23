import { describe, expect, it } from 'vitest';
import type { KanaId, KanaPracticeSession } from '../../model/types';
import { getKanaCatalog } from '../catalog';
import {
  buildQuestionOrder,
  createRetrySession,
  createSession,
  getPracticePhase,
  isAwaitingAdvance,
  isAwaitingCorrection,
  practiceReducer,
  shuffle,
  summarizeSession,
} from '../session';

const ids: KanaId[] = ['hiragana:a', 'hiragana:ka', 'hiragana:si'];
const inOrder = () => 0.999;

function answer(session: KanaPracticeSession, value: string) {
  return practiceReducer(practiceReducer(session, { type: 'input', value }), {
    type: 'submit',
  });
}

function required(session: KanaPracticeSession | null): KanaPracticeSession {
  if (!session) throw new Error('Expected a session');
  return session;
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

describe('createSession', () => {
  it('asks every selected kana exactly once, in shuffled order', () => {
    const all = getKanaCatalog('katakana').map(({ id }) => id);
    const session = createSession(all);

    expect(session.order).toHaveLength(104);
    expect(new Set(session.order)).toEqual(new Set(all));
    expect(session.selection).toEqual(all);
    expect(getPracticePhase(session)).toBe('answering');
  });

  it('handles a single kana and removes duplicate ids', () => {
    const session = createSession(['hiragana:a', 'hiragana:a']);
    expect(session.order).toEqual(['hiragana:a']);
  });
});

describe('practiceReducer', () => {
  it('records a correct answer and waits for Next', () => {
    const session = required(
      answer(createSession(ids, { random: inOrder }), ' A '),
    );

    expect(session.attempts).toEqual([
      { answer: 'A', kanaId: 'hiragana:a', outcome: 'correct' },
    ]);
    expect(getPracticePhase(session)).toBe('feedback');
    expect(session.position).toBe(0);

    const next = required(practiceReducer(session, { type: 'next' }));
    expect(next.position).toBe(1);
    expect(next.input).toBe('');
    expect(getPracticePhase(next)).toBe('answering');
  });

  it('records an incorrect answer', () => {
    const session = required(
      answer(createSession(ids, { random: inOrder }), 'i'),
    );
    expect(session.attempts.at(-1)?.outcome).toBe('incorrect');
  });

  it('keeps asking after a wrong answer until the reading is typed correctly', () => {
    const wrong = required(
      answer(createSession(ids, { random: inOrder }), 'i'),
    );
    expect(isAwaitingCorrection(wrong)).toBe(true);
    expect(practiceReducer(wrong, { type: 'next' })).toBe(wrong);

    const stillWrong = required(answer(wrong, 'u'));
    expect(stillWrong.attempts).toEqual(wrong.attempts);
    expect(isAwaitingCorrection(stillWrong)).toBe(true);
    expect(answer(stillWrong, '  ')).toEqual({ ...stillWrong, input: '  ' });

    const corrected = required(answer(stillWrong, ' A '));
    expect(corrected.attempts).toEqual([
      {
        answer: 'i',
        corrected: true,
        kanaId: 'hiragana:a',
        outcome: 'incorrect',
      },
    ]);
    expect(isAwaitingAdvance(corrected)).toBe(true);
    expect(practiceReducer(corrected, { type: 'input', value: 'x' })).toBe(
      corrected,
    );
    expect(practiceReducer(corrected, { type: 'submit' })).toBe(corrected);
    expect(practiceReducer(corrected, { type: 'skip' })).toBe(corrected);
    expect(practiceReducer(corrected, { type: 'hint' })).toBe(corrected);

    const next = required(practiceReducer(corrected, { type: 'next' }));
    expect(next.position).toBe(1);
    expect(next.input).toBe('');
    expect(summarizeSession(next).incorrect).toBe(1);
  });

  it('ignores an empty answer and a second submit', () => {
    const start = createSession(ids, { random: inOrder });
    expect(answer(start, '   ')).toEqual({ ...start, input: '   ' });

    const answered = required(answer(start, 'a'));
    expect(practiceReducer(answered, { type: 'submit' })).toBe(answered);
    expect(practiceReducer(answered, { type: 'skip' })).toBe(answered);
    expect(practiceReducer(answered, { type: 'input', value: 'changed' })).toBe(
      answered,
    );
  });

  it('records a skip as its own outcome and moves on without feedback', () => {
    const typed = required(
      practiceReducer(createSession(ids, { random: inOrder }), {
        type: 'input',
        value: 'half',
      }),
    );
    const skipped = required(practiceReducer(typed, { type: 'skip' }));

    expect(skipped.attempts).toEqual([
      { answer: '', kanaId: 'hiragana:a', outcome: 'skipped' },
    ]);
    expect(skipped.position).toBe(1);
    expect(skipped.input).toBe('');
    expect(practiceReducer(skipped, { type: 'next' })).toBe(skipped);
  });

  it('completes after the last question and summarizes the round', () => {
    let session = createSession(ids, { random: inOrder });
    session = required(practiceReducer(answer(session, 'a'), { type: 'next' }));
    session = required(practiceReducer(session, { type: 'skip' }));
    session = required(
      practiceReducer(answer(required(answer(session, 'su')), 'shi'), {
        type: 'next',
      }),
    );

    expect(getPracticePhase(session)).toBe('complete');
    expect(summarizeSession(session)).toEqual({
      assisted: 0,
      correct: 1,
      incorrect: 1,
      missed: ['hiragana:ka', 'hiragana:si'],
      skipped: 1,
      total: 3,
    });
    expect(practiceReducer(session, { type: 'submit' })).toBe(session);
  });
});

describe('next rounds', () => {
  const finished: KanaPracticeSession = {
    attempts: [
      { answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' },
      { answer: 'x', kanaId: 'hiragana:ka', outcome: 'incorrect' },
      { answer: '', kanaId: 'hiragana:si', outcome: 'skipped' },
    ],
    hintShown: false,
    input: '',
    order: ids,
    position: 3,
    questionCount: 3,
    selection: ids,
  };

  it('retries only the missed kana and keeps the full selection', () => {
    const retry = createRetrySession(finished);
    expect([...retry.order].sort()).toEqual(['hiragana:ka', 'hiragana:si']);
    expect(retry.selection).toEqual(ids);
    expect(retry.questionCount).toBe(3);
    expect(retry.attempts).toEqual([]);
    expect(retry.position).toBe(0);
  });

  it('restarts the full selection in a new order', () => {
    const restart = createSession(finished.selection, { random: () => 0 });
    expect([...restart.order].sort()).toEqual([...ids].sort());
    expect(restart.order).not.toEqual(ids);
  });
});

describe('scheduled advance', () => {
  it('only advances the session it was scheduled for', () => {
    const scheduled = required(
      answer(createSession(ids, { random: inOrder }), 'a'),
    );
    const other = required(
      answer(createSession(ids, { random: inOrder }), 'a'),
    );

    expect(practiceReducer(other, { from: scheduled, type: 'next' })).toBe(
      other,
    );
    expect(
      practiceReducer(scheduled, { from: scheduled, type: 'next' })?.position,
    ).toBe(1);
  });
});

describe('buildQuestionOrder', () => {
  const ten = getKanaCatalog('hiragana')
    .slice(0, 10)
    .map(({ id }) => id);
  const counts = (order: readonly KanaId[]) => {
    const result = new Map<KanaId, number>();
    for (const id of order) result.set(id, (result.get(id) ?? 0) + 1);
    return result;
  };
  const seeded = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      return state / 2_147_483_648;
    };
  };

  it('defaults to one appearance per selected kana', () => {
    const session = createSession(ten);
    expect(session.order).toHaveLength(10);
    expect(new Set(session.order).size).toBe(10);
    expect(session.questionCount).toBe(10);
  });

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

describe('hints', () => {
  it('marks a first-try correct answer as assisted when the hint was shown', () => {
    const start = createSession(ids, { random: inOrder });
    const hinted = required(practiceReducer(start, { type: 'hint' }));
    expect(hinted.hintShown).toBe(true);
    expect(practiceReducer(hinted, { type: 'hint' })).toBe(hinted);

    const answered = required(answer(hinted, 'a'));
    expect(answered.attempts).toEqual([
      { answer: 'a', hintUsed: true, kanaId: 'hiragana:a', outcome: 'correct' },
    ]);
    const next = required(practiceReducer(answered, { type: 'next' }));
    expect(next.hintShown).toBe(false);
  });

  it('records a hint shown after a wrong answer on that attempt', () => {
    const wrong = required(
      answer(createSession(ids, { random: inOrder }), 'o'),
    );
    const hinted = required(practiceReducer(wrong, { type: 'hint' }));
    const corrected = required(answer(hinted, 'a'));

    expect(corrected.attempts).toEqual([
      {
        answer: 'o',
        corrected: true,
        hintUsed: true,
        kanaId: 'hiragana:a',
        outcome: 'incorrect',
      },
    ]);
  });

  it('counts assisted answers apart and retries them once each', () => {
    const repeated: KanaPracticeSession = {
      attempts: [
        {
          answer: 'a',
          hintUsed: true,
          kanaId: 'hiragana:a',
          outcome: 'correct',
        },
        { answer: 'ka', kanaId: 'hiragana:ka', outcome: 'correct' },
        { answer: 'o', kanaId: 'hiragana:a', outcome: 'incorrect' },
        { answer: '', kanaId: 'hiragana:ka', outcome: 'skipped' },
        { answer: 'ka', kanaId: 'hiragana:ka', outcome: 'correct' },
        { answer: 'si', kanaId: 'hiragana:si', outcome: 'correct' },
      ],
      hintShown: false,
      input: '',
      order: [
        'hiragana:a',
        'hiragana:ka',
        'hiragana:a',
        'hiragana:ka',
        'hiragana:ka',
        'hiragana:si',
      ],
      position: 6,
      questionCount: 6,
      selection: ids,
    };

    expect(summarizeSession(repeated)).toEqual({
      assisted: 1,
      correct: 3,
      incorrect: 1,
      missed: ['hiragana:a', 'hiragana:ka'],
      skipped: 1,
      total: 6,
    });
    const retry = createRetrySession(repeated);
    expect([...retry.order].sort()).toEqual(['hiragana:a', 'hiragana:ka']);
    expect(retry.questionCount).toBe(6);
  });
});

describe('skip after a wrong answer', () => {
  it('moves on and keeps the wrong answer as the only attempt', () => {
    const wrong = required(
      answer(createSession(ids, { random: inOrder }), 'o'),
    );
    const skipped = required(practiceReducer(wrong, { type: 'skip' }));

    expect(skipped.position).toBe(1);
    expect(skipped.input).toBe('');
    expect(skipped.attempts).toEqual(wrong.attempts);
    expect(getPracticePhase(skipped)).toBe('answering');
    expect(practiceReducer(skipped, { type: 'skip' })?.attempts).toHaveLength(
      2,
    );
  });
});
