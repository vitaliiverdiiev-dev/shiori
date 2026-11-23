import { getKanaCatalog } from '@shiori/kana';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KanaPracticeSession } from '../../model/types';
import { createSession } from '../session';
import { readKanaState, writeKanaState } from '../storage';

const KEY = 'shiori:kana:hiragana';
const ROUND = '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10';
const session: KanaPracticeSession = {
  attempts: [{ answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' }],
  hintShown: false,
  hintUsed: false,
  input: '',
  order: ['hiragana:a', 'hiragana:ka'],
  position: 1,
  questionCount: 2,
  roundId: ROUND,
  selection: ['hiragana:a', 'hiragana:ka'],
};

function storeRaw(value: unknown) {
  window.sessionStorage.setItem(KEY, JSON.stringify(value));
}

const record = (overrides: Record<string, unknown> = {}) => ({
  selection: ['hiragana:a', 'hiragana:ka'],
  session,
  userId: 'alice',
  version: 1,
  ...overrides,
});

describe('kana state storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips the selection and the session for the same user', () => {
    writeKanaState('hiragana', 'alice', {
      selection: ['hiragana:ka'],
      session,
    });
    writeKanaState('hiragana', 'alice', { selection: ['hiragana:a'] });

    expect(readKanaState('hiragana', 'alice')).toEqual({
      questionCount: null,
      selection: ['hiragana:a'],
      session,
    });
    expect(readKanaState('katakana', 'alice').session).toBeNull();
  });

  it('ignores another user’s data and replaces it on the next write', () => {
    writeKanaState('hiragana', 'alice', { selection: ['hiragana:a'], session });

    expect(readKanaState('hiragana', 'bob')).toEqual({
      questionCount: null,
      selection: [],
      session: null,
    });
    writeKanaState('hiragana', 'bob', { selection: ['hiragana:ka'] });
    expect(readKanaState('hiragana', 'alice').selection).toEqual([]);
  });

  it('stores nothing without a signed-in user', () => {
    writeKanaState('hiragana', undefined, { selection: ['hiragana:a'] });
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
    expect(readKanaState('hiragana', undefined).selection).toEqual([]);
  });

  it.each([
    ['malformed JSON', '{'],
    ['an unknown version', JSON.stringify(record({ version: 2 }))],
    ['a wrong shape', JSON.stringify(record({ selection: 'hiragana:a' }))],
  ])('starts empty after %s', (_, raw) => {
    window.sessionStorage.setItem(KEY, raw);
    expect(readKanaState('hiragana', 'alice')).toEqual({
      questionCount: null,
      selection: [],
      session: null,
    });
  });

  it('drops selected ids that are not in the catalog of the script', () => {
    storeRaw(
      record({
        selection: ['hiragana:a', 'katakana:a', 'hiragana:wi', 'hiragana:a'],
      }),
    );
    expect(readKanaState('hiragana', 'alice').selection).toEqual([
      'hiragana:a',
      'hiragana:a',
    ]);
  });

  it.each([
    [
      'an unknown kana id',
      { ...session, order: ['hiragana:a', 'hiragana:wi'] },
    ],
    [
      'a duplicated selected kana',
      { ...session, selection: ['hiragana:a', 'hiragana:a', 'hiragana:ka'] },
    ],
    [
      'a question outside the selection',
      { ...session, selection: ['hiragana:a'] },
    ],
    ['an empty round', { ...session, attempts: [], order: [], position: 0 }],
    ['a position past the end', { ...session, position: 3 }],
    ['missing attempts', { ...session, attempts: [] }],
    [
      'an attempt for another question',
      {
        ...session,
        attempts: [{ answer: 'ka', kanaId: 'hiragana:ka', outcome: 'correct' }],
      },
    ],
    [
      'a correction on a correct answer',
      {
        ...session,
        attempts: [
          {
            answer: 'a',
            corrected: true,
            kanaId: 'hiragana:a',
            outcome: 'correct',
          },
        ],
      },
    ],
    [
      'an answer longer than the API accepts',
      {
        ...session,
        attempts: [
          {
            answer: `shi${' '.repeat(29)}x`,
            kanaId: 'hiragana:a',
            outcome: 'incorrect',
          },
        ],
        position: 0,
      },
    ],
    [
      'a skip waiting for Next',
      {
        ...session,
        attempts: [{ answer: '', kanaId: 'hiragana:a', outcome: 'skipped' }],
        position: 0,
      },
    ],
  ])('discards a session with %s but keeps the selection', (_, stored) => {
    storeRaw(record({ session: stored }));
    expect(readKanaState('hiragana', 'alice')).toEqual({
      questionCount: null,
      selection: ['hiragana:a', 'hiragana:ka'],
      session: null,
    });
  });

  it('restores typed text longer than an answer may be, unchanged', () => {
    const typed = `shi${' '.repeat(29)}x`;
    storeRaw(record({ session: { ...session, input: typed } }));
    expect(readKanaState('hiragana', 'alice').session).toEqual({
      ...session,
      input: typed,
    });
  });

  it('restores a corrected wrong answer awaiting advance', () => {
    const corrected: KanaPracticeSession = {
      ...session,
      attempts: [
        {
          answer: 'o',
          corrected: true,
          kanaId: 'hiragana:a',
          outcome: 'incorrect',
        },
      ],
      position: 0,
    };
    writeKanaState('hiragana', 'alice', { session: corrected });
    expect(readKanaState('hiragana', 'alice').session).toEqual(corrected);
  });

  it('restores a complete catalog round mid-way', () => {
    const round = {
      ...createSession(getKanaCatalog('hiragana').map(({ id }) => id)),
      input: 'ts',
    };
    writeKanaState('hiragana', 'alice', { session: round });
    expect(readKanaState('hiragana', 'alice').session).toEqual(round);
  });

  it('keeps repeated questions apart by their position in the round', () => {
    const repeated: KanaPracticeSession = {
      ...session,
      attempts: [
        { answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' },
        { answer: 'ga', kanaId: 'hiragana:ka', outcome: 'incorrect' },
        {
          answer: 'a',
          hintUsed: true,
          kanaId: 'hiragana:a',
          outcome: 'correct',
        },
      ],
      hintShown: true,
      hintUsed: true,
      order: ['hiragana:a', 'hiragana:ka', 'hiragana:a', 'hiragana:ka'],
      position: 3,
      questionCount: 4,
    };
    writeKanaState('hiragana', 'alice', {
      questionCount: 4,
      session: repeated,
    });

    expect(readKanaState('hiragana', 'alice')).toEqual({
      questionCount: 4,
      selection: [],
      session: repeated,
    });
  });

  it('treats a hint open in an older save as used', () => {
    storeRaw(
      record({ session: { ...session, hintShown: true, hintUsed: undefined } }),
    );
    expect(readKanaState('hiragana', 'alice').session).toMatchObject({
      hintShown: true,
      hintUsed: true,
    });
  });

  it('restores a round saved before question counts, hints and round ids existed', () => {
    storeRaw(
      record({
        session: {
          attempts: [{ answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' }],
          input: 'k',
          order: ['hiragana:a', 'hiragana:ka'],
          position: 1,
          selection: ['hiragana:a', 'hiragana:ka'],
        },
      }),
    );
    expect(readKanaState('hiragana', 'alice')).toEqual({
      questionCount: null,
      selection: ['hiragana:a', 'hiragana:ka'],
      session: {
        ...session,
        input: 'k',
        roundId: expect.any(String) as unknown,
      },
    });
  });

  it.each(['round-1', 42])('discards a stored round id of %j', (roundId) => {
    storeRaw(record({ session: { ...session, roundId } }));
    expect(readKanaState('hiragana', 'alice').session).toBeNull();
  });

  it.each([0, 1001, 2.5, '10'])(
    'ignores a stored question count of %j',
    (questionCount) => {
      storeRaw(record({ questionCount }));
      expect(readKanaState('hiragana', 'alice')).toMatchObject({
        questionCount: null,
        selection: [],
      });
    },
  );

  it('fails safely when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => {
      writeKanaState('hiragana', 'alice', { session });
    }).not.toThrow();
    expect(readKanaState('hiragana', 'alice').session).toBeNull();
  });
});
