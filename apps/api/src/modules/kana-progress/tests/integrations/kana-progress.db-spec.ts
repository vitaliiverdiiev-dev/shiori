import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { createTestApp, TEST_ORIGIN } from '#test/support/app.js';
import { testDatabaseUrl } from '#test/support/test-database.js';
import {
  ALICE,
  createUser,
  getAuth,
  type TestUser,
} from '#test/support/users.js';

const BOB: TestUser = {
  email: 'bob@example.test',
  name: 'Bob Test',
  password: 'another long test passphrase',
};

interface Attempt {
  answer: string;
  corrected: boolean;
  direction: string;
  hintUsed: boolean;
  kanaId: string;
  outcome: string;
  questionIndex: number;
  roundId: string;
}

let app: INestApplication<App>;
const pool = new Pool({ connectionString: testDatabaseUrl() });
let alice: { id: string; cookie: string };
let bob: { id: string; cookie: string };

function attempt(patch: Partial<Attempt> = {}): Attempt {
  return {
    answer: 'a',
    corrected: false,
    direction: 'kana-to-romaji',
    hintUsed: false,
    kanaId: 'hiragana:a',
    outcome: 'correct',
    questionIndex: 0,
    roundId: randomUUID(),
    ...patch,
  };
}

function progress(session: { cookie: string }, script = 'hiragana') {
  return request(app.getHttpServer())
    .get('/api/kana-progress')
    .query({ script })
    .set('Cookie', session.cookie);
}

async function progressKana(
  session: { cookie: string },
  script = 'hiragana',
): Promise<unknown[]> {
  const response = await progress(session, script).expect(200);
  return (response.body as { kana: unknown[] }).kana;
}

function record(
  session: { id: string; cookie: string },
  attempts: readonly Attempt[],
  userId = session.id,
) {
  return request(app.getHttpServer())
    .post('/api/kana-progress/attempts')
    .set('Origin', TEST_ORIGIN)
    .set('Cookie', session.cookie)
    .send({ attempts, userId });
}

async function signIn(user: TestUser): Promise<{ id: string; cookie: string }> {
  const id = await createUser(getAuth(app), user);
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', TEST_ORIGIN)
    .send({ email: user.email, password: user.password })
    .expect(200);
  const cookie = (response.get('Set-Cookie') ?? [])
    .map((value) => value.split(';')[0] ?? '')
    .join('; ');
  return { id, cookie };
}

async function storedCount(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'select count(*) from kana_attempt',
  );
  return Number(rows[0]?.count);
}

beforeAll(async () => {
  app = await createTestApp(testDatabaseUrl());
});

beforeEach(async () => {
  alice = await signIn(ALICE);
  bob = await signIn(BOB);
});

afterEach(async () => {
  await pool.query('truncate "user", verification cascade');
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('authentication and ownership', () => {
  it('rejects requests without a session', async () => {
    await request(app.getHttpServer())
      .get('/api/kana-progress?script=hiragana')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/kana-progress/attempts')
      .set('Origin', TEST_ORIGIN)
      .send({ attempts: [attempt()], userId: alice.id })
      .expect(401);
    expect(await storedCount()).toBe(0);
  });

  it('records attempts for the session user only', async () => {
    await record(alice, [attempt()]).expect(200);

    const { rows } = await pool.query<{ user_id: string }>(
      'select user_id from kana_attempt',
    );
    expect(rows).toEqual([{ user_id: alice.id }]);
  });

  it('refuses a batch recorded for another user and stores nothing', async () => {
    const response = await record(bob, [attempt()], alice.id).expect(403);

    expect(response.body).toMatchObject({ statusCode: 403 });
    expect(await storedCount()).toBe(0);
  });

  it('shows each user only their own progress', async () => {
    await record(alice, [
      attempt(),
      attempt({ answer: 'i', kanaId: 'hiragana:i' }),
    ]).expect(200);

    expect(await progressKana(bob)).toEqual([]);
    expect(await progressKana(alice)).toHaveLength(2);
  });

  it('does not let a round id collide across users', async () => {
    const shared = attempt();
    await record(alice, [shared]).expect(200);
    await record(bob, [
      { ...shared, answer: 'x', outcome: 'incorrect' },
    ]).expect(200);

    expect(await storedCount()).toBe(2);
  });

  it('sends private progress with Cache-Control: no-store', async () => {
    const response = await progress(alice).expect(200);
    expect(response.get('Cache-Control')).toBe('no-store');
  });
});

describe('progress aggregation', () => {
  it('returns an empty history to a first-time user', async () => {
    expect((await progress(alice).expect(200)).body).toEqual({
      direction: 'kana-to-romaji',
      kana: [],
      script: 'hiragana',
    });
  });

  it('counts first-attempt outcomes without double counting', async () => {
    const roundId = randomUUID();
    const si = (questionIndex: number, patch: Partial<Attempt>) =>
      attempt({ kanaId: 'hiragana:si', questionIndex, roundId, ...patch });
    await record(alice, [
      si(0, { answer: 'shi' }),
      si(1, { answer: 'si', hintUsed: true }),
      si(2, { answer: 'chi', outcome: 'incorrect' }),
      si(3, {
        answer: 'chi',
        corrected: true,
        hintUsed: true,
        outcome: 'incorrect',
      }),
      si(4, { answer: '', outcome: 'skipped' }),
      si(5, { answer: '', hintUsed: true, outcome: 'skipped' }),
      attempt({ questionIndex: 6, roundId }),
    ]).expect(200);
    await record(alice, [
      attempt({
        answer: 'shi',
        kanaId: 'katakana:si',
        questionIndex: 7,
        roundId,
      }),
      attempt({ answer: 'shi', kanaId: 'hiragana:si' }),
    ]).expect(200);

    const { kana } = (await progress(alice).expect(200)).body as {
      kana: Record<string, unknown>[];
    };
    expect(kana).toEqual([
      expect.objectContaining({
        attempts: 1,
        independentCorrect: 1,
        kanaId: 'hiragana:a',
      }),
      {
        assistedCorrect: 1,
        attempts: 7,
        corrected: 1,
        incorrect: 2,
        independentCorrect: 2,
        kanaId: 'hiragana:si',
        lastPracticedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T/,
        ) as unknown,
        skipped: 2,
      },
    ]);
    expect(await progressKana(alice, 'katakana')).toEqual([
      expect.objectContaining({ attempts: 1, kanaId: 'katakana:si' }),
    ]);
  });

  it('counts a hint opened before a right first answer as correct with hint', async () => {
    const response = await record(alice, [
      attempt({ answer: 'shi', hintUsed: true, kanaId: 'hiragana:si' }),
    ]).expect(200);
    expect(response.body).toEqual({ duplicates: 0, recorded: 1 });

    const { rows } = await pool.query<Record<string, unknown>>(
      'select outcome, hint_used, corrected from kana_attempt',
    );
    expect(rows).toEqual([
      { corrected: false, hint_used: true, outcome: 'correct' },
    ]);
    expect(await progressKana(alice)).toEqual([
      expect.objectContaining({
        assistedCorrect: 1,
        attempts: 1,
        corrected: 0,
        incorrect: 0,
        independentCorrect: 0,
        kanaId: 'hiragana:si',
        skipped: 0,
      }),
    ]);
  });

  it('counts a hint opened while correcting a wrong first answer as incorrect only', async () => {
    await record(alice, [
      attempt({
        answer: 'chi',
        corrected: true,
        hintUsed: true,
        kanaId: 'hiragana:si',
        outcome: 'incorrect',
      }),
    ]).expect(200);

    expect(await progressKana(alice)).toEqual([
      expect.objectContaining({
        assistedCorrect: 0,
        attempts: 1,
        corrected: 1,
        incorrect: 1,
        independentCorrect: 0,
      }),
    ]);
  });

  it('adds new rounds to an existing history', async () => {
    await record(alice, [attempt()]).expect(200);
    await record(alice, [
      attempt({ answer: 'o', outcome: 'incorrect' }),
    ]).expect(200);

    const [entry] = await progressKana(alice);
    expect(entry).toMatchObject({
      attempts: 2,
      incorrect: 1,
      independentCorrect: 1,
    });
  });

  it.each(['', 'romaji', 'HIRAGANA'])('rejects script %j', async (script) => {
    await progress(alice, script).expect(400);
  });
});

describe('idempotency', () => {
  it('records an identical retry once', async () => {
    const batch = [
      attempt(),
      attempt({ questionIndex: 1, roundId: randomUUID() }),
    ];

    expect((await record(alice, batch).expect(200)).body).toEqual({
      duplicates: 0,
      recorded: 2,
    });
    expect((await record(alice, batch).expect(200)).body).toEqual({
      duplicates: 2,
      recorded: 0,
    });
    expect(await storedCount()).toBe(2);
  });

  it('records the new part of a partly retried batch', async () => {
    const roundId = randomUUID();
    const first = attempt({ roundId });
    await record(alice, [first]).expect(200);

    const response = await record(alice, [
      first,
      attempt({ questionIndex: 1, roundId }),
    ]).expect(200);
    expect(response.body).toEqual({ duplicates: 1, recorded: 1 });
  });

  it('treats a retry with an upper-case round id as the same occurrence', async () => {
    const first = attempt();
    await record(alice, [first]).expect(200);
    await record(alice, [
      { ...first, roundId: first.roundId.toUpperCase() },
    ]).expect(200);

    expect(await storedCount()).toBe(1);
  });

  it('refuses a conflicting resubmission without overwriting or recording the batch', async () => {
    const recorded = attempt();
    await record(alice, [recorded]).expect(200);

    const fresh = attempt({ questionIndex: 3, roundId: randomUUID() });
    const response = await record(alice, [
      fresh,
      { ...recorded, hintUsed: true },
    ]).expect(409);

    expect(response.body).toEqual({
      conflicts: [
        { kanaId: 'hiragana:a', questionIndex: 0, roundId: recorded.roundId },
      ],
      message: 'Attempts conflict with recorded attempts',
      statusCode: 409,
    });
    const { rows } = await pool.query<{ hint_used: boolean; round_id: string }>(
      'select round_id, hint_used from kana_attempt',
    );
    expect(rows).toEqual([{ hint_used: false, round_id: recorded.roundId }]);
  });

  it('stores one row for concurrent identical submissions', async () => {
    const roundId = randomUUID();
    const batch = Array.from({ length: 50 }, (_, questionIndex) =>
      attempt({ questionIndex, roundId }),
    );
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => record(alice, batch)),
    );

    expect(responses.map(({ status }) => status)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    expect(
      responses.reduce(
        (sum, { body }) => sum + (body as { recorded: number }).recorded,
        0,
      ),
    ).toBe(50);
    expect(await storedCount()).toBe(50);
  });

  it('keeps exactly one version of an occurrence submitted concurrently with different data', async () => {
    const plain = attempt();
    const hinted = { ...plain, hintUsed: true };
    const responses = await Promise.all([
      record(alice, [plain]),
      record(alice, [hinted]),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const winner = responses[0].status === 200 ? plain : hinted;
    const { rows } = await pool.query<{ hint_used: boolean }>(
      'select hint_used from kana_attempt',
    );
    expect(rows).toEqual([{ hint_used: winner.hintUsed }]);
    const conflict = responses.find(({ status }) => status === 409);
    expect(conflict?.body).toMatchObject({
      conflicts: [
        { kanaId: 'hiragana:a', questionIndex: 0, roundId: plain.roundId },
      ],
    });
  });
});

describe('validation', () => {
  it.each([
    ['an unknown kana', [attempt({ kanaId: 'hiragana:wi' })]],
    ['a kana id of the wrong shape', [attempt({ kanaId: 'a' })]],
    ['an unknown direction', [attempt({ direction: 'kana-to-kanji' })]],
    [
      'a romaji answer to a romaji → kana question',
      [attempt({ direction: 'romaji-to-kana' })],
    ],
    ['an unknown outcome', [attempt({ outcome: 'mastered' })]],
    ['a correct outcome with a wrong answer', [attempt({ answer: 'o' })]],
    [
      'an incorrect outcome with the right answer',
      [attempt({ outcome: 'incorrect' })],
    ],
    ['a corrected correct answer', [attempt({ corrected: true })]],
    ['a skip with an answer', [attempt({ outcome: 'skipped' })]],
    ['a negative question index', [attempt({ questionIndex: -1 })]],
    ['a question index beyond a round', [attempt({ questionIndex: 1000 })]],
    ['a fractional question index', [attempt({ questionIndex: 1.5 })]],
    ['a malformed round id', [attempt({ roundId: 'round-1' })]],
    [
      'an oversized answer',
      [attempt({ answer: 'a'.repeat(33), outcome: 'incorrect' })],
    ],
    ['an empty batch', []],
    [
      'an oversized batch',
      Array.from({ length: 101 }, (_, questionIndex) =>
        attempt({ questionIndex }),
      ),
    ],
  ])('rejects %s and stores nothing', async (_, attempts) => {
    const batch =
      attempts.length > 0 ? [attempt({ questionIndex: 999 }), ...attempts] : [];
    await record(alice, batch).expect(400);
    expect(await storedCount()).toBe(0);
  });

  it('rejects an occurrence listed twice in one batch, naming the repetition', async () => {
    const twice = attempt();
    const response = await record(alice, [
      twice,
      { ...twice, hintUsed: true },
    ]).expect(400);
    expect(response.body).toMatchObject({ invalidIndexes: [1] });
    expect(await storedCount()).toBe(0);
  });

  it('names every invalid entry of a mixed batch, records nothing, and accepts the valid rest', async () => {
    const roundId = randomUUID();
    const first = attempt({ questionIndex: 0, roundId });
    const third = attempt({ questionIndex: 2, roundId });

    const response = await record(alice, [
      first,
      attempt({ kanaId: 'hiragana:wi', questionIndex: 1, roundId }),
      third,
      attempt({ answer: 'o', questionIndex: 3, roundId }),
    ]).expect(400);
    expect(response.body).toEqual({
      invalidIndexes: [1, 3],
      message: 'Invalid attempts',
      statusCode: 400,
    });
    expect(await storedCount()).toBe(0);

    await record(alice, [first, third]).expect(200);
    expect(await storedCount()).toBe(2);
  });

  it('names an entry that fails the request schema', async () => {
    const response = await record(alice, [
      attempt(),
      attempt({ answer: 'a'.repeat(33), outcome: 'incorrect' }),
      attempt({ questionIndex: 2, roundId: 'round-2' }),
    ]).expect(400);

    expect(response.body).toMatchObject({ invalidIndexes: [1, 2] });
    expect(await storedCount()).toBe(0);
  });

  it('names no entry when the request is invalid as a whole', async () => {
    const oversized = await record(
      alice,
      Array.from({ length: 101 }, (_, questionIndex) =>
        attempt({ answer: 'x', questionIndex }),
      ),
    ).expect(400);
    const extraField = await request(app.getHttpServer())
      .post('/api/kana-progress/attempts')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', alice.cookie)
      .send({ attempts: [attempt()], extra: true, userId: alice.id })
      .expect(400);

    for (const { body } of [oversized, extraField]) {
      expect(body).toEqual({ message: 'Invalid attempts', statusCode: 400 });
    }
  });

  it('rejects unknown fields and a user id inside an attempt', async () => {
    await record(alice, [{ ...attempt(), userId: bob.id } as Attempt]).expect(
      400,
    );
    await request(app.getHttpServer())
      .post('/api/kana-progress/attempts')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', alice.cookie)
      .send({ attempts: [attempt()], extra: true, userId: alice.id })
      .expect(400);
  });

  it.each([
    ['a missing body', undefined],
    ['a JSON array', [attempt()]],
    ['a string', 'attempts'],
  ])('rejects %s', async (_, body) => {
    const call = request(app.getHttpServer())
      .post('/api/kana-progress/attempts')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', alice.cookie)
      .set('Content-Type', 'application/json');
    await (body === undefined ? call : call.send(JSON.stringify(body))).expect(
      400,
    );
  });
});

describe('database constraints', () => {
  const insert = (values: Record<string, unknown>) =>
    pool.query(
      `insert into kana_attempt (user_id, round_id, question_index, kana_id, script, direction, outcome, corrected, hint_used)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        values.userId ?? alice.id,
        values.roundId ?? randomUUID(),
        values.questionIndex ?? 0,
        values.kanaId ?? 'hiragana:a',
        values.script ?? 'hiragana',
        values.direction ?? 'kana-to-romaji',
        values.outcome ?? 'correct',
        values.corrected ?? false,
        values.hintUsed ?? false,
      ],
    );

  it.each([
    [
      'a kana of another script',
      { kanaId: 'katakana:a' },
      'kana_attempt_kana_id_matches_script',
    ],
    [
      'an unknown script',
      { kanaId: 'kanji:a', script: 'kanji' },
      'kana_attempt_script_check',
    ],
    [
      'an unknown direction',
      { direction: 'kana-to-kanji' },
      'kana_attempt_direction_check',
    ],
    [
      'an unknown outcome',
      { outcome: 'mastered' },
      'kana_attempt_outcome_check',
    ],
    [
      'a corrected skip',
      { corrected: true, outcome: 'skipped' },
      'kana_attempt_corrected_only_after_incorrect',
    ],
    [
      'a question beyond a round',
      { questionIndex: 1000 },
      'kana_attempt_question_index_range',
    ],
    [
      'an unknown user',
      { userId: 'nobody' },
      'kana_attempt_user_id_user_id_fk',
    ],
  ])('rejects %s', async (_, values, constraint) => {
    await expect(insert(values)).rejects.toMatchObject({ constraint });
  });

  it('rejects a second row for the same kana result', async () => {
    const roundId = randomUUID();
    await insert({
      direction: 'romaji-to-kana',
      kanaId: 'hiragana:zi',
      roundId,
    });
    await expect(
      insert({ direction: 'romaji-to-kana', kanaId: 'hiragana:zi', roundId }),
    ).rejects.toMatchObject({ constraint: 'kana_attempt_pk' });
  });

  it('allows several kana in one romaji → kana question but only one in a kana → romaji question', async () => {
    const reverse = randomUUID();
    await insert({
      direction: 'romaji-to-kana',
      kanaId: 'hiragana:zi',
      roundId: reverse,
    });
    await insert({
      direction: 'romaji-to-kana',
      kanaId: 'hiragana:di',
      roundId: reverse,
    });

    const forward = randomUUID();
    await insert({ roundId: forward });
    await expect(
      insert({ kanaId: 'hiragana:i', roundId: forward }),
    ).rejects.toMatchObject({
      constraint: 'kana_attempt_kana_to_romaji_question_idx',
    });
  });

  it("deletes a user's attempts with the user", async () => {
    await record(alice, [attempt()]).expect(200);
    await record(bob, [attempt()]).expect(200);

    await pool.query('delete from "user" where id = $1', [alice.id]);
    const { rows } = await pool.query<{ user_id: string }>(
      'select user_id from kana_attempt',
    );
    expect(rows).toEqual([{ user_id: bob.id }]);
  });

  it('serves progress from the per-user index', async () => {
    const { rows } = await pool.query<{ indexdef: string }>(
      "select indexdef from pg_indexes where tablename = 'kana_attempt' order by indexname",
    );
    expect(rows.map(({ indexdef }) => indexdef)).toEqual([
      expect.stringMatching(
        /UNIQUE INDEX kana_attempt_kana_to_romaji_question_idx .*\(user_id, round_id, question_index\) WHERE \(direction = 'kana-to-romaji'::text\)$/,
      ) as unknown,
      expect.stringContaining(
        '(user_id, round_id, question_index, kana_id)',
      ) as unknown,
      expect.stringContaining(
        '(user_id, script, direction, kana_id)',
      ) as unknown,
    ]);
  });
});

describe('romaji → kana results', () => {
  const reverse = (patch: Partial<Attempt> = {}): Attempt =>
    attempt({
      answer: 'じ',
      direction: 'romaji-to-kana',
      kanaId: 'hiragana:zi',
      ...patch,
    });
  const ji = (roundId: string, questionIndex = 0): [Attempt, Attempt] => [
    reverse({ questionIndex, roundId }),
    reverse({
      answer: 'ち',
      corrected: true,
      kanaId: 'hiragana:di',
      outcome: 'incorrect',
      questionIndex,
      roundId,
    }),
  ];
  const progressIn = async (direction?: string) => {
    const response = await progress(alice)
      .query(direction ? { direction } : {})
      .expect(200);
    return response.body as { direction: string; kana: unknown[] };
  };

  it('records one result per expected kana of one question', async () => {
    const roundId = randomUUID();
    await record(alice, ji(roundId)).expect(200, {
      duplicates: 0,
      recorded: 2,
    });

    const { rows } = await pool.query(
      'select question_index, kana_id, outcome, corrected from kana_attempt order by kana_id',
    );
    expect(rows).toEqual([
      {
        corrected: true,
        kana_id: 'hiragana:di',
        outcome: 'incorrect',
        question_index: 0,
      },
      {
        corrected: false,
        kana_id: 'hiragana:zi',
        outcome: 'correct',
        question_index: 0,
      },
    ]);
  });

  it('accepts the results of one question in separate batches and counts identical retries once', async () => {
    const roundId = randomUUID();
    const [zi, di] = ji(roundId);
    await record(alice, [zi]).expect(200, { duplicates: 0, recorded: 1 });
    await record(alice, [zi, di]).expect(200, { duplicates: 1, recorded: 1 });
    await record(alice, [di, zi]).expect(200, { duplicates: 2, recorded: 0 });
    expect(await storedCount()).toBe(2);
  });

  it('refuses a conflicting retry of one kana result, naming that kana only', async () => {
    const roundId = randomUUID();
    const [zi, di] = ji(roundId);
    await record(alice, [zi, di]).expect(200);

    const response = await record(alice, [
      zi,
      { ...di, corrected: false, hintUsed: true },
    ]).expect(409);
    expect(response.body).toMatchObject({
      conflicts: [{ kanaId: 'hiragana:di', questionIndex: 0, roundId }],
    });
    const { rows } = await pool.query<{ hint_used: boolean }>(
      "select hint_used from kana_attempt where kana_id = 'hiragana:di'",
    );
    expect(rows).toEqual([{ hint_used: false }]);
  });

  it('refuses another kana for a recorded kana → romaji question', async () => {
    const recorded = attempt();
    await record(alice, [recorded]).expect(200);

    const response = await record(alice, [
      { ...recorded, answer: 'i', kanaId: 'hiragana:i' },
    ]).expect(409);
    expect(response.body).toMatchObject({
      conflicts: [
        { kanaId: 'hiragana:i', questionIndex: 0, roundId: recorded.roundId },
      ],
    });
    expect(await storedCount()).toBe(1);
  });

  it('stores each kana result once for concurrent submissions of one question', async () => {
    const roundId = randomUUID();
    const responses = await Promise.all([
      record(alice, ji(roundId)),
      record(alice, ji(roundId).reverse()),
      record(alice, [ji(roundId)[1]]),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(await storedCount()).toBe(2);
  });

  it('names invalid entries of a mixed batch and records nothing from it', async () => {
    const roundId = randomUUID();
    const [zi, di] = ji(roundId);
    const response = await record(alice, [
      zi,
      reverse({ answer: 'じ', kanaId: 'hiragana:di', roundId }),
      reverse({ answer: 'ず', kanaId: 'hiragana:zu', roundId }),
      reverse({
        answer: 'ジ',
        kanaId: 'katakana:zi',
        questionIndex: 1,
        roundId,
      }),
      attempt({
        answer: 'zu',
        kanaId: 'hiragana:du',
        questionIndex: 2,
        roundId,
      }),
      reverse({
        answer: 'じ',
        kanaId: 'hiragana:zu',
        outcome: 'incorrect',
        questionIndex: 2,
        roundId,
      }),
    ]).expect(400);

    expect(response.body).toMatchObject({ invalidIndexes: [1, 2, 5] });
    expect(await storedCount()).toBe(0);
    await record(alice, [zi, di]).expect(200);
    expect(await storedCount()).toBe(2);
  });

  it('keeps the results of one round id apart between users', async () => {
    const roundId = randomUUID();
    await record(alice, ji(roundId)).expect(200, {
      duplicates: 0,
      recorded: 2,
    });
    await record(bob, ji(roundId)).expect(200, { duplicates: 0, recorded: 2 });
    await record(bob, [ji(roundId)[0]], alice.id).expect(403);

    const { rows } = await pool.query<{ count: string; user_id: string }>(
      'select user_id, count(*) from kana_attempt group by user_id order by user_id',
    );
    expect(rows.map(({ count }) => Number(count))).toEqual([2, 2]);
  });

  it('aggregates each direction apart, defaulting to kana → romaji', async () => {
    const roundId = randomUUID();
    await record(alice, [
      ...ji(roundId, 0),
      reverse({
        answer: 'ぢ',
        kanaId: 'hiragana:di',
        questionIndex: 1,
        roundId,
      }),
      reverse({ answer: 'じ', questionIndex: 1, roundId }),
      attempt({
        answer: 'ji',
        kanaId: 'hiragana:di',
        questionIndex: 2,
        roundId,
      }),
    ]).expect(200);

    const forward = await progressIn();
    expect(forward).toMatchObject({ direction: 'kana-to-romaji' });
    expect(forward.kana).toEqual([
      expect.objectContaining({
        attempts: 1,
        independentCorrect: 1,
        kanaId: 'hiragana:di',
      }),
    ]);
    expect(await progressIn('kana-to-romaji')).toEqual(forward);

    const backward = await progressIn('romaji-to-kana');
    expect(backward).toMatchObject({ direction: 'romaji-to-kana' });
    expect(backward.kana).toEqual([
      expect.objectContaining({
        attempts: 2,
        corrected: 1,
        incorrect: 1,
        independentCorrect: 1,
        kanaId: 'hiragana:di',
      }),
      expect.objectContaining({
        attempts: 2,
        independentCorrect: 2,
        kanaId: 'hiragana:zi',
      }),
    ]);
    await progress(alice).query({ direction: 'both' }).expect(400);
  });
});
