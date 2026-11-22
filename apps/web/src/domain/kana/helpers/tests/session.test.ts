import { describe, expect, it } from 'vitest';
import type { KanaId, KanaPracticeSession } from '../../model/types';
import { getKanaCatalog } from '../catalog';
import {
  createRetrySession,
  createSession,
  getPracticePhase,
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
    const session = required(answer(createSession(ids, inOrder), ' A '));

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
    const session = required(answer(createSession(ids, inOrder), 'i'));
    expect(session.attempts.at(-1)?.outcome).toBe('incorrect');
  });

  it('ignores an empty answer and a second submit', () => {
    const start = createSession(ids, inOrder);
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
      practiceReducer(createSession(ids, inOrder), {
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
    let session = createSession(ids, inOrder);
    session = required(practiceReducer(answer(session, 'a'), { type: 'next' }));
    session = required(practiceReducer(session, { type: 'skip' }));
    session = required(
      practiceReducer(answer(session, 'su'), { type: 'next' }),
    );

    expect(getPracticePhase(session)).toBe('complete');
    expect(summarizeSession(session)).toEqual({
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
    input: '',
    order: ids,
    position: 3,
    selection: ids,
  };

  it('retries only the missed kana and keeps the full selection', () => {
    const retry = createRetrySession(finished);
    expect([...retry.order].sort()).toEqual(['hiragana:ka', 'hiragana:si']);
    expect(retry.selection).toEqual(ids);
    expect(retry.attempts).toEqual([]);
    expect(retry.position).toBe(0);
  });

  it('restarts the full selection in a new order', () => {
    const restart = createSession(finished.selection, () => 0);
    expect([...restart.order].sort()).toEqual([...ids].sort());
    expect(restart.order).not.toEqual(ids);
  });
});
