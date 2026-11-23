import type { KanaId, KanaQuestion } from '@shiori/kana';
import {
  findKana,
  getKanaCatalog,
  isAcceptedReading,
  questionKey,
} from '@shiori/kana';
import { describe, expect, it } from 'vitest';
import type { KanaPracticeSession } from '../../model/types';
import {
  createRetrySession,
  createSession,
  getAbandonedAttempts,
  getFinalizedAttempts,
  getPracticePhase,
  isAwaitingAdvance,
  isAwaitingCorrection,
  practiceReducer,
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

function forward(...kanaIds: KanaId[]): KanaQuestion[] {
  return kanaIds.map((kanaId) => ({ direction: 'kana-to-romaji', kanaId }));
}

function keys(session: KanaPracticeSession): string[] {
  return session.order.map(questionKey);
}

function required(session: KanaPracticeSession | null): KanaPracticeSession {
  if (!session) throw new Error('Expected a session');
  return session;
}

describe('createSession', () => {
  it('asks every selected kana exactly once, in shuffled order', () => {
    const all = getKanaCatalog('katakana').map(({ id }) => id);
    const session = createSession(all);

    expect(session.order).toHaveLength(104);
    expect(new Set(keys(session))).toEqual(new Set(all));
    expect(session.selection).toEqual(all);
    expect(getPracticePhase(session)).toBe('answering');
  });

  it('handles a single kana and removes duplicate ids', () => {
    const session = createSession(['hiragana:a', 'hiragana:a']);
    expect(keys(session)).toEqual(['hiragana:a']);
  });

  it('defaults to one appearance per selected kana', () => {
    const ten = getKanaCatalog('hiragana')
      .slice(0, 10)
      .map(({ id }) => id);
    const session = createSession(ten);
    expect(session.order).toHaveLength(10);
    expect(new Set(keys(session)).size).toBe(10);
    expect(session.questionCount).toBe(10);
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
        kanaId: keys(start)[0],
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

    expect(keys(twice)).toEqual(['hiragana:a', 'hiragana:a']);
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

    const typed = required(
      practiceReducer(si, { type: 'input', value: tooLong }),
    );
    expect(typed.inputs).toEqual([tooLong]);
    expect(required(practiceReducer(typed, { type: 'submit' }))).toBe(typed);

    const wrong = required(answer(si, 'chi'));
    const retyped = required(
      practiceReducer(wrong, { type: 'input', value: tooLong }),
    );
    expect(required(practiceReducer(retyped, { type: 'submit' }))).toBe(
      retyped,
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
        kanaId: keys(start)[0],
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

    expect(session.results).toEqual([
      [{ answer: 'A', kanaId: 'hiragana:a', outcome: 'correct' }],
    ]);
    expect(getPracticePhase(session)).toBe('feedback');
    expect(session.position).toBe(0);

    const next = required(practiceReducer(session, { type: 'next' }));
    expect(next.position).toBe(1);
    expect(next.inputs).toEqual(['']);
    expect(getPracticePhase(next)).toBe('answering');
  });

  it('records an incorrect answer', () => {
    const session = required(
      answer(createSession(ids, { random: inOrder }), 'i'),
    );
    expect(session.results.at(-1)?.[0]?.outcome).toBe('incorrect');
  });

  it('keeps asking after a wrong answer until the reading is typed correctly', () => {
    const wrong = required(
      answer(createSession(ids, { random: inOrder }), 'i'),
    );
    expect(isAwaitingCorrection(wrong)).toBe(true);
    expect(practiceReducer(wrong, { type: 'next' })).toBe(wrong);

    const stillWrong = required(answer(wrong, 'u'));
    expect(stillWrong.results).toEqual(wrong.results);
    expect(isAwaitingCorrection(stillWrong)).toBe(true);
    expect(answer(stillWrong, '  ')).toEqual({
      ...stillWrong,
      inputs: ['  '],
    });

    const corrected = required(answer(stillWrong, ' A '));
    expect(corrected.results).toEqual([
      [
        {
          answer: 'i',
          corrected: true,
          kanaId: 'hiragana:a',
          outcome: 'incorrect',
        },
      ],
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
    expect(next.inputs).toEqual(['']);
    expect(summarizeSession(next).incorrect).toBe(1);
  });

  it('ignores an empty answer and a second submit', () => {
    const start = createSession(ids, { random: inOrder });
    expect(answer(start, '   ')).toEqual({ ...start, inputs: ['   '] });

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

    expect(skipped.results).toEqual([
      [{ answer: '', kanaId: 'hiragana:a', outcome: 'skipped' }],
    ]);
    expect(skipped.position).toBe(1);
    expect(skipped.inputs).toEqual(['']);
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
    hintShown: false,
    hintUsed: false,
    inputs: [],
    mode: 'kana-to-romaji',
    order: forward(...ids),
    position: 3,
    questionCount: 3,
    results: [
      [{ answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' }],
      [{ answer: 'x', kanaId: 'hiragana:ka', outcome: 'incorrect' }],
      [{ answer: '', kanaId: 'hiragana:si', outcome: 'skipped' }],
    ],
    roundId: ROUND,
    selection: ids,
  };

  it('retries only the missed kana and keeps the full selection', () => {
    const retry = createRetrySession(finished);
    expect(keys(retry).sort()).toEqual(['hiragana:ka', 'hiragana:si']);
    expect(retry.selection).toEqual(ids);
    expect(retry.questionCount).toBe(3);
    expect(retry.results).toEqual([]);
    expect(retry.position).toBe(0);
  });

  it('restarts the full selection in a new order', () => {
    const restart = createSession(finished.selection, { random: () => 0 });
    expect(keys(restart).sort()).toEqual([...ids].sort());
    expect(keys(restart)).not.toEqual(ids);
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

describe('hints', () => {
  it('marks a first-try correct answer as assisted when the hint was shown', () => {
    const start = createSession(ids, { random: inOrder });
    const hinted = required(practiceReducer(start, { type: 'hint' }));
    expect(hinted.hintShown).toBe(true);

    const hidden = required(practiceReducer(hinted, { type: 'hint' }));
    expect(hidden.hintShown).toBe(false);
    expect(hidden.hintUsed).toBe(true);

    const answered = required(answer(hidden, 'a'));
    expect(answered.results).toEqual([
      [
        {
          answer: 'a',
          hintUsed: true,
          kanaId: 'hiragana:a',
          outcome: 'correct',
        },
      ],
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
    expect(closed.results[0]?.[0]?.hintUsed).toBe(true);
    const corrected = required(answer(closed, 'a'));

    expect(corrected.results).toEqual([
      [
        {
          answer: 'o',
          corrected: true,
          hintUsed: true,
          kanaId: 'hiragana:a',
          outcome: 'incorrect',
        },
      ],
    ]);
  });

  it('counts assisted answers apart and retries them once each', () => {
    const repeated: KanaPracticeSession = {
      hintShown: false,
      hintUsed: false,
      inputs: [],
      mode: 'kana-to-romaji',
      order: forward(
        'hiragana:a',
        'hiragana:ka',
        'hiragana:a',
        'hiragana:ka',
        'hiragana:ka',
        'hiragana:si',
      ),
      position: 6,
      questionCount: 6,
      results: [
        [
          {
            answer: 'a',
            hintUsed: true,
            kanaId: 'hiragana:a',
            outcome: 'correct',
          },
        ],
        [{ answer: 'ka', kanaId: 'hiragana:ka', outcome: 'correct' }],
        [{ answer: 'o', kanaId: 'hiragana:a', outcome: 'incorrect' }],
        [{ answer: '', kanaId: 'hiragana:ka', outcome: 'skipped' }],
        [{ answer: 'ka', kanaId: 'hiragana:ka', outcome: 'correct' }],
        [{ answer: 'si', kanaId: 'hiragana:si', outcome: 'correct' }],
      ],
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
    expect(keys(retry).sort()).toEqual(['hiragana:a', 'hiragana:ka']);
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
    expect(skipped.inputs).toEqual(['']);
    expect(skipped.results).toEqual(wrong.results);
    expect(getPracticePhase(skipped)).toBe('answering');
    expect(practiceReducer(skipped, { type: 'skip' })?.results).toHaveLength(2);
  });
});

describe('romaji → kana cards', () => {
  const ji = createSession(['hiragana:zi'], {
    mode: 'romaji-to-kana',
    roundId: ROUND,
  });
  const type = (session: KanaPracticeSession, ...values: string[]) =>
    values.reduce<KanaPracticeSession>(
      (current, value, field) =>
        required(practiceReducer(current, { field, type: 'input', value })),
      session,
    );
  const check = (session: KanaPracticeSession, ...values: string[]) =>
    required(practiceReducer(type(session, ...values), { type: 'submit' }));
  const sent = (...steps: KanaPracticeSession[]) =>
    steps.slice(1).flatMap((step, index) =>
      getFinalizedAttempts(steps[index] ?? null, step).map(
        ({
          corrected,
          direction,
          hintUsed,
          kanaId,
          outcome,
          questionIndex,
        }) => ({
          corrected,
          direction,
          hintUsed,
          kanaId,
          outcome,
          questionIndex,
        }),
      ),
    );

  it('asks the whole reading once for a partial or complete selection', () => {
    expect(ji.order).toEqual([
      { direction: 'romaji-to-kana', readingId: 'hiragana/ji' },
    ]);
    expect(ji.selection).toEqual(['hiragana:zi']);
    expect(ji.inputs).toEqual(['', '']);

    const both = createSession(['hiragana:di', 'hiragana:zi', 'hiragana:a'], {
      mode: 'romaji-to-kana',
      questionCount: 4,
    });
    expect(both.order).toHaveLength(4);
    expect(new Set(keys(both))).toEqual(new Set(['hiragana/a', 'hiragana/ji']));
  });

  it('evaluates nothing until every field has an answer', () => {
    const partial = type(ji, 'じ');
    expect(practiceReducer(partial, { type: 'submit' })).toBe(partial);
    expect(sent(ji, partial)).toEqual([]);
    expect(practiceReducer(ji, { field: 2, type: 'input', value: 'x' })).toBe(
      ji,
    );
  });

  it('scores each kana of one card on its own and finalizes a right one at once', () => {
    const wrong = check(ji, 'ち', 'じ');

    expect(wrong.results).toEqual([
      [
        { answer: 'じ', kanaId: 'hiragana:zi', outcome: 'correct' },
        { answer: 'ち', kanaId: 'hiragana:di', outcome: 'incorrect' },
      ],
    ]);
    expect(isAwaitingCorrection(wrong)).toBe(true);
    expect(sent(ji, wrong)).toEqual([
      {
        corrected: false,
        direction: 'romaji-to-kana',
        hintUsed: false,
        kanaId: 'hiragana:zi',
        outcome: 'correct',
        questionIndex: 0,
      },
    ]);
  });

  it('marks a correction without turning the first answer into a correct one', () => {
    const wrong = check(ji, 'じ', 'ち');
    const stillWrong = check(wrong, 'じ', 'つ');
    expect(stillWrong).toEqual(type(wrong, 'じ', 'つ'));

    const corrected = check(wrong, 'じ', 'ぢ');
    expect(corrected.results[0]).toEqual([
      { answer: 'じ', kanaId: 'hiragana:zi', outcome: 'correct' },
      {
        answer: 'ち',
        corrected: true,
        kanaId: 'hiragana:di',
        outcome: 'incorrect',
      },
    ]);
    expect(isAwaitingAdvance(corrected)).toBe(true);
    const next = required(practiceReducer(corrected, { type: 'next' }));
    expect(sent(ji, wrong, corrected, next)).toEqual([
      expect.objectContaining({ kanaId: 'hiragana:zi', outcome: 'correct' }),
      expect.objectContaining({
        corrected: true,
        kanaId: 'hiragana:di',
        outcome: 'incorrect',
      }),
    ]);
    expect(summarizeSession(next)).toMatchObject({
      correct: 1,
      incorrect: 1,
      missed: ['hiragana:di'],
      total: 1,
    });
  });

  it('matches a repeated answer once', () => {
    const twice = check(ji, 'じ', 'じ');
    expect(twice.results[0]?.map(({ outcome }) => outcome)).toEqual([
      'correct',
      'incorrect',
    ]);
    expect(
      check(ji, 'ち', 'つ').results[0]?.map(({ outcome }) => outcome),
    ).toEqual(['incorrect', 'incorrect']);
  });

  it('applies a hint before the first check to every kana of the card', () => {
    const hinted = required(practiceReducer(ji, { type: 'hint' }));
    expect(check(hinted, 'ぢ', 'じ').results[0]).toEqual([
      {
        answer: 'じ',
        hintUsed: true,
        kanaId: 'hiragana:zi',
        outcome: 'correct',
      },
      {
        answer: 'ぢ',
        hintUsed: true,
        kanaId: 'hiragana:di',
        outcome: 'correct',
      },
    ]);
  });

  it('applies a hint after a wrong answer only to unresolved kana', () => {
    const wrong = check(ji, 'じ', 'ち');
    const hinted = required(practiceReducer(wrong, { type: 'hint' }));

    expect(hinted.results[0]).toEqual([
      { answer: 'じ', kanaId: 'hiragana:zi', outcome: 'correct' },
      {
        answer: 'ち',
        hintUsed: true,
        kanaId: 'hiragana:di',
        outcome: 'incorrect',
      },
    ]);
    expect(sent(wrong, hinted)).toEqual([]);
    expect(getAbandonedAttempts(hinted)).toEqual([
      expect.objectContaining({
        answer: 'ち',
        direction: 'romaji-to-kana',
        hintUsed: true,
        kanaId: 'hiragana:di',
        outcome: 'incorrect',
      }),
    ]);
  });

  it('skips every kana of an unanswered card, and only the unresolved ones after a check', () => {
    const skipped = required(practiceReducer(ji, { type: 'skip' }));
    expect(
      sent(ji, skipped).map(({ kanaId, outcome }) => [kanaId, outcome]),
    ).toEqual([
      ['hiragana:zi', 'skipped'],
      ['hiragana:di', 'skipped'],
    ]);

    const wrong = check(ji, 'じ', 'ち');
    const moved = required(practiceReducer(wrong, { type: 'skip' }));
    expect(sent(ji, wrong, moved)).toEqual([
      expect.objectContaining({ kanaId: 'hiragana:zi', outcome: 'correct' }),
      expect.objectContaining({
        corrected: false,
        kanaId: 'hiragana:di',
        outcome: 'incorrect',
      }),
    ]);
    expect(getPracticePhase(moved)).toBe('complete');
  });

  it('never finalizes a kana result twice over a whole round', () => {
    let session = createSession(['hiragana:zi', 'hiragana:zu', 'hiragana:a'], {
      mode: 'romaji-to-kana',
      questionCount: 6,
      roundId: ROUND,
    });
    const steps = [session];
    while (getPracticePhase(session) !== 'complete') {
      const forms = session.inputs.map(() => 'x');
      session = check(session, ...forms);
      steps.push(session, required(practiceReducer(session, { type: 'hint' })));
      session = required(practiceReducer(session, { type: 'skip' }));
      steps.push(session);
    }
    const results = sent(...steps);
    const identities = results.map(
      ({ kanaId, questionIndex }) => `${String(questionIndex)}#${kanaId}`,
    );
    expect(new Set(identities).size).toBe(identities.length);
    expect(results).toHaveLength(session.results.flat().length);
  });

  it('keeps the selection when retrying a missed reading', () => {
    const missed = check(ji, 'ぢ', 'ぢ');
    const finished = required(practiceReducer(missed, { type: 'skip' }));
    const retry = createRetrySession(finished);
    expect(retry.mode).toBe('romaji-to-kana');
    expect(retry.order).toEqual(ji.order);
    expect(retry.selection).toEqual(['hiragana:zi']);
  });
});

describe('both directions', () => {
  it('gives each card one concrete direction', () => {
    const session = createSession(['katakana:zu'], {
      mode: 'both',
      questionCount: 4,
    });
    expect(session.order.map(({ direction }) => direction).sort()).toEqual([
      'kana-to-romaji',
      'kana-to-romaji',
      'romaji-to-kana',
      'romaji-to-kana',
    ]);
    const first = session.order[0];
    expect(session.inputs).toHaveLength(
      first?.direction === 'romaji-to-kana' ? 2 : 1,
    );
  });
});
