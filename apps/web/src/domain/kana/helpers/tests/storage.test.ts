import { getKanaCatalog } from '@shiori/kana';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KanaPracticeSession } from '../../model/types';
import { createSession } from '../session';
import { readKanaState, writeKanaState } from '../storage';

const KEY = 'shiori:kana:hiragana';
const ROUND = '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10';
const session: KanaPracticeSession = {
  hintShown: false,
  hintUsed: false,
  inputs: [''],
  mode: 'kana-to-romaji',
  order: [
    { direction: 'kana-to-romaji', kanaId: 'hiragana:a' },
    { direction: 'kana-to-romaji', kanaId: 'hiragana:ka' },
  ],
  position: 1,
  questionCount: 2,
  results: [[{ answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' }]],
  roundId: ROUND,
  selection: ['hiragana:a', 'hiragana:ka'],
};
const legacySession = {
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
  session: legacySession,
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
    ['an unknown version', JSON.stringify(record({ version: 3 }))],
    [
      'a version 2 record with an M03 session',
      JSON.stringify(record({ version: 2 })),
    ],
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
      { ...legacySession, order: ['hiragana:a', 'hiragana:wi'] },
    ],
    [
      'a duplicated selected kana',
      {
        ...legacySession,
        selection: ['hiragana:a', 'hiragana:a', 'hiragana:ka'],
      },
    ],
    [
      'a question outside the selection',
      { ...legacySession, selection: ['hiragana:a'] },
    ],
    [
      'an empty round',
      { ...legacySession, attempts: [], order: [], position: 0 },
    ],
    ['a position past the end', { ...legacySession, position: 3 }],
    ['missing attempts', { ...legacySession, attempts: [] }],
    [
      'an attempt for another question',
      {
        ...legacySession,
        attempts: [{ answer: 'ka', kanaId: 'hiragana:ka', outcome: 'correct' }],
      },
    ],
    [
      'a correction on a correct answer',
      {
        ...legacySession,
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
        ...legacySession,
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
        ...legacySession,
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

  it('upgrades an M03 round in place and saves it in the current format', () => {
    storeRaw(record());
    expect(readKanaState('hiragana', 'alice').session).toEqual(session);

    writeKanaState('hiragana', 'alice', { questionCount: 2 });
    expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? '')).toMatchObject({
      session: { inputs: [''], mode: 'kana-to-romaji', results: [[{}]] },
      version: 2,
    });
    expect(readKanaState('hiragana', 'alice').session).toEqual(session);
  });

  describe('romaji → kana rounds', () => {
    const wrong: KanaPracticeSession = {
      hintShown: false,
      hintUsed: true,
      inputs: ['じ', 'ち'],
      mode: 'romaji-to-kana',
      order: [
        { direction: 'romaji-to-kana', readingId: 'hiragana/a' },
        { direction: 'romaji-to-kana', readingId: 'hiragana/ji' },
      ],
      position: 1,
      questionCount: 2,
      results: [
        [{ answer: '', kanaId: 'hiragana:a', outcome: 'skipped' }],
        [
          { answer: 'じ', kanaId: 'hiragana:zi', outcome: 'correct' },
          {
            answer: 'ち',
            hintUsed: true,
            kanaId: 'hiragana:di',
            outcome: 'incorrect',
          },
        ],
      ],
      roundId: ROUND,
      selection: ['hiragana:a', 'hiragana:zi'],
    };
    const stored = (patch: Partial<KanaPracticeSession>) => {
      storeRaw({
        selection: [],
        session: { ...wrong, ...patch },
        userId: 'alice',
        version: 2,
      });
      return readKanaState('hiragana', 'alice').session;
    };
    const [skippedA, answeredJi] = wrong.results;

    it('restores a card with a finalized and an unresolved kana result', () => {
      writeKanaState('hiragana', 'alice', { session: wrong });
      expect(readKanaState('hiragana', 'alice').session).toEqual(wrong);
    });

    it.each<[string, Partial<KanaPracticeSession>]>([
      [
        'a reading of the other script',
        {
          order: [
            { direction: 'romaji-to-kana', readingId: 'hiragana/a' },
            { direction: 'romaji-to-kana', readingId: 'katakana/ji' },
          ],
        },
      ],
      [
        'a reading without a selected member',
        { selection: ['hiragana:a', 'hiragana:zu'] },
      ],
      ['a direction the mode does not ask', { mode: 'kana-to-romaji' }],
      [
        'one result for a two-kana reading',
        { results: [skippedA ?? [], answeredJi?.slice(0, 1) ?? []] },
      ],
      [
        'results in another order than the reading',
        {
          results: [skippedA ?? [], [...(answeredJi ?? [])].reverse()],
        },
      ],
      [
        'a card skipped only in part',
        {
          position: 2,
          results: [
            skippedA ?? [],
            [
              { answer: '', kanaId: 'hiragana:zi', outcome: 'skipped' },
              { answer: 'ち', kanaId: 'hiragana:di', outcome: 'incorrect' },
            ],
          ],
        },
      ],
      ['fields that do not fit the card', { inputs: ['じ'] }],
    ])('discards a round with %s', (_, patch) => {
      expect(stored(patch)).toBeNull();
    });
  });

  it('restores typed text longer than an answer may be, unchanged', () => {
    const typed = `shi${' '.repeat(29)}x`;
    storeRaw(record({ session: { ...legacySession, input: typed } }));
    expect(readKanaState('hiragana', 'alice').session).toEqual({
      ...session,
      inputs: [typed],
    });
  });

  it('restores a corrected wrong answer awaiting advance', () => {
    const corrected: KanaPracticeSession = {
      ...session,
      position: 0,
      results: [
        [
          {
            answer: 'o',
            corrected: true,
            kanaId: 'hiragana:a',
            outcome: 'incorrect',
          },
        ],
      ],
    };
    writeKanaState('hiragana', 'alice', { session: corrected });
    expect(readKanaState('hiragana', 'alice').session).toEqual(corrected);
  });

  it('restores a complete catalog round mid-way', () => {
    const round = {
      ...createSession(getKanaCatalog('hiragana').map(({ id }) => id)),
      inputs: ['ts'],
    };
    writeKanaState('hiragana', 'alice', { session: round });
    expect(readKanaState('hiragana', 'alice').session).toEqual(round);
  });

  it('keeps repeated questions apart by their position in the round', () => {
    const repeated: KanaPracticeSession = {
      ...session,
      hintShown: true,
      hintUsed: true,
      order: [...session.order, ...session.order],
      position: 3,
      questionCount: 4,
      results: [
        [{ answer: 'a', kanaId: 'hiragana:a', outcome: 'correct' }],
        [{ answer: 'ga', kanaId: 'hiragana:ka', outcome: 'incorrect' }],
        [
          {
            answer: 'a',
            hintUsed: true,
            kanaId: 'hiragana:a',
            outcome: 'correct',
          },
        ],
      ],
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
      record({
        session: { ...legacySession, hintShown: true, hintUsed: undefined },
      }),
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
        inputs: ['k'],
        roundId: expect.any(String) as unknown,
      },
    });
  });

  it.each(['round-1', 42])('discards a stored round id of %j', (roundId) => {
    storeRaw(record({ session: { ...legacySession, roundId } }));
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
