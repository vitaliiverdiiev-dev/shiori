import type { KanaId } from '@shiori/kana';
import { findKana, getKanaCatalog, isAcceptedReading } from '@shiori/kana';
import { describe, expect, it } from 'vitest';
import type { KanaPracticeSession } from '../../model/types';
import {
  buildQuestionOrder,
  createRetrySession,
  createSession,
  getAbandonedAttempts,
  getFinalizedAttempts,
  getPracticePhase,
  isAwaitingAdvance,
  isAwaitingCorrection,
  practiceReducer,
  shuffle,
  summarizeSession,
} from '../session';

const ids: KanaId[] = ['hiragana:a', 'hiragana:ka', 'hiragana:si'];
const ROUND = '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10';
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

describe('round identity', () => {
  it('gives every new round its own id, also for a retry', () => {
    const first = createSession(ids);
    const again = createSession(first.selection);

    expect(first.roundId).toMatch(/^[\da-f-]{36}$/);
    expect(again.roundId).not.toBe(first.roundId);
    const finished = { ...first, position: first.order.length };
    expect(createRetrySession(finished).roundId).not.toBe(first.roundId);
  });
});

describe('getFinalizedAttempts', () => {
  const start = createSession(['hiragana:a', 'hiragana:a', 'hiragana:si'], {
    questionCount: 3,
    random: inOrder,
    roundId: ROUND,
  });
  const advance = (session: KanaPracticeSession) =>
    required(practiceReducer(session, { type: 'next' }));

  it('finalizes a right first answer at once, not again when the round advances', () => {
    const answered = required(answer(start, 'a'));
    expect(getFinalizedAttempts(start, answered)).toEqual([
      {
        answer: 'a',
        corrected: false,
        direction: 'kana-to-romaji',
        hintUsed: false,
        kanaId: start.order[0],
        outcome: 'correct',
        questionIndex: 0,
        roundId: ROUND,
      },
    ]);
    expect(getFinalizedAttempts(answered, advance(answered))).toEqual([]);
  });

  it('keeps a hint opened and closed before a right first answer', () => {
    const hinted = required(practiceReducer(start, { type: 'hint' }));
    const closed = required(practiceReducer(hinted, { type: 'hint' }));
    const answered = required(answer(closed, 'a'));

    expect(getFinalizedAttempts(closed, answered)).toEqual([
      expect.objectContaining({ hintUsed: true, outcome: 'correct' }),
    ]);
  });

  it('does not finalize a wrong answer while it can still be corrected', () => {
    const wrong = required(answer(start, 'o'));
    expect(getFinalizedAttempts(start, wrong)).toEqual([]);
    const hinted = required(practiceReducer(wrong, { type: 'hint' }));
    expect(getFinalizedAttempts(wrong, hinted)).toEqual([]);
  });

  it('keeps a wrong first answer as incorrect, with its correction and hint', () => {
    const wrong = required(answer(start, 'o'));
    const hinted = required(practiceReducer(wrong, { type: 'hint' }));
    const corrected = required(answer(hinted, 'a'));

    expect(getFinalizedAttempts(corrected, advance(corrected))).toEqual([]);
    expect(getFinalizedAttempts(hinted, corrected)).toEqual([
      expect.objectContaining({
        answer: 'o',
        corrected: true,
        hintUsed: true,
        outcome: 'incorrect',
      }),
    ]);
  });

  it('records one skipped occurrence, and none for Skip after a wrong answer', () => {
    const skipped = required(practiceReducer(start, { type: 'skip' }));
    expect(getFinalizedAttempts(start, skipped)).toEqual([
      expect.objectContaining({ answer: '', outcome: 'skipped' }),
    ]);

    const wrong = required(answer(start, 'o'));
    const moved = required(practiceReducer(wrong, { type: 'skip' }));
    expect(getFinalizedAttempts(wrong, moved)).toEqual([
      expect.objectContaining({ corrected: false, outcome: 'incorrect' }),
    ]);
  });

  it('identifies repeated kana by their question index', () => {
    const twice = createSession(['hiragana:a'], {
      questionCount: 2,
      roundId: ROUND,
    });
    const first = advance(required(answer(twice, 'a')));
    const second = required(answer(first, 'a'));

    expect(twice.order).toEqual(['hiragana:a', 'hiragana:a']);
    expect(getFinalizedAttempts(first, second)).toEqual([
      expect.objectContaining({ kanaId: 'hiragana:a', questionIndex: 1 }),
    ]);
  });

  it('finalizes nothing for a restored or newly started round', () => {
    const answered = required(answer(start, 'a'));
    expect(getFinalizedAttempts(null, advance(answered))).toEqual([]);
    expect(getFinalizedAttempts(advance(answered), createSession(ids))).toEqual(
      [],
    );
  });

  it('never sends an answer that the server would judge differently', () => {
    const si = createSession(['hiragana:si'], { roundId: ROUND });
    const tooLong = `shi${' '.repeat(29)}x`;
    expect(tooLong).toHaveLength(33);

    const refused = required(
      practiceReducer(si, { type: 'input', value: tooLong }),
    );
    expect(refused.input).toBe('');
    expect(required(practiceReducer(refused, { type: 'submit' }))).toBe(
      refused,
    );

    const capped = required(answer(si, tooLong.slice(0, 32)));
    const longWrong = required(answer(si, `${'x'.repeat(31)}s`));
    for (const [before, after] of [
      [si, capped],
      [longWrong, required(practiceReducer(longWrong, { type: 'skip' }))],
    ] as const) {
      for (const sent of getFinalizedAttempts(before, after)) {
        const kana = findKana(sent.kanaId);
        expect(sent.answer.length).toBeLessThanOrEqual(32);
        expect(kana && isAcceptedReading(kana, sent.answer)).toBe(
          sent.outcome === 'correct',
        );
      }
    }
    expect(getFinalizedAttempts(si, capped)).toEqual([
      expect.objectContaining({ answer: 'shi', outcome: 'correct' }),
    ]);
  });
});

describe('getAbandonedAttempts', () => {
  const start = createSession(['hiragana:a', 'hiragana:ka'], {
    random: inOrder,
    roundId: ROUND,
  });

  it('finalizes a wrong answer awaiting correction as incorrect, keeping its hint', () => {
    const wrong = required(answer(start, 'o'));
    const hinted = required(practiceReducer(wrong, { type: 'hint' }));

    expect(getAbandonedAttempts(hinted)).toEqual([
      {
        answer: 'o',
        corrected: false,
        direction: 'kana-to-romaji',
        hintUsed: true,
        kanaId: start.order[0],
        outcome: 'incorrect',
        questionIndex: 0,
        roundId: ROUND,
      },
    ]);
  });

  it('finalizes nothing that is unanswered, already final or complete', () => {
    const hinted = required(practiceReducer(start, { type: 'hint' }));
    const right = required(answer(start, 'a'));
    const corrected = required(answer(required(answer(start, 'o')), 'a'));
    const skipped = required(practiceReducer(start, { type: 'skip' }));

    for (const session of [start, hinted, right, corrected, skipped]) {
      expect(getAbandonedAttempts(session)).toEqual([]);
    }
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
    hintUsed: false,
    input: '',
    order: ids,
    position: 3,
    questionCount: 3,
    roundId: ROUND,
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

    const hidden = required(practiceReducer(hinted, { type: 'hint' }));
    expect(hidden.hintShown).toBe(false);
    expect(hidden.hintUsed).toBe(true);

    const answered = required(answer(hidden, 'a'));
    expect(answered.attempts).toEqual([
      { answer: 'a', hintUsed: true, kanaId: 'hiragana:a', outcome: 'correct' },
    ]);
    expect(practiceReducer(answered, { type: 'hint' })).toBe(answered);
    const next = required(practiceReducer(answered, { type: 'next' }));
    expect(next.hintShown).toBe(false);
    expect(next.hintUsed).toBe(false);
  });

  it('records a hint shown after a wrong answer on that attempt', () => {
    const wrong = required(
      answer(createSession(ids, { random: inOrder }), 'o'),
    );
    const hinted = required(practiceReducer(wrong, { type: 'hint' }));
    const closed = required(practiceReducer(hinted, { type: 'hint' }));
    expect(closed.attempts[0]?.hintUsed).toBe(true);
    const corrected = required(answer(closed, 'a'));

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
      hintUsed: false,
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
      roundId: ROUND,
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
