import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw';
import { readPendingAttempts } from '../../helpers/pending-attempts';
import type { PendingKanaAttempt } from '../../model/types';
import { type AttemptSync, createAttemptSync } from '../attempt-sync';

const ROUND = '0b8f5a3e-7c1d-4f7a-9a51-2f4a1c6d9e10';
const ENDPOINT = '*/api/kana-progress/attempts';

type Body = { attempts: PendingKanaAttempt[]; userId: string };

const attempt = (questionIndex: number): PendingKanaAttempt => ({
  answer: 'a',
  corrected: false,
  direction: 'kana-to-romaji',
  hintUsed: false,
  kanaId: 'hiragana:a',
  outcome: 'correct',
  questionIndex,
  roundId: ROUND,
});

function recordRequests(
  respond: (body: Body) => Response = () =>
    HttpResponse.json({ duplicates: 0, recorded: 1 }),
) {
  const bodies: Body[] = [];
  server.use(
    http.post(ENDPOINT, async ({ request }) => {
      const body = (await request.json()) as Body;
      bodies.push(body);
      return respond(body);
    }),
  );
  return bodies;
}

const stops: (() => void)[] = [];

function started(userId = 'alice', onSaved = vi.fn()) {
  const sync = createAttemptSync(userId, onSaved);
  stops.push(sync.start());
  return { onSaved, sync };
}

const pending = (userId = 'alice') => readPendingAttempts(userId).pending;
const settled = (sync: AttemptSync) =>
  vi.waitFor(() => {
    expect(sync.getSnapshot().status).not.toBe('saving');
  });

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  vi.useRealTimers();
});

describe('createAttemptSync', () => {
  it('keeps a finalized attempt until the server acknowledges it', async () => {
    const bodies = recordRequests();
    const { onSaved, sync } = started();

    sync.record([attempt(0)]);
    expect(pending()).toEqual([attempt(0)]);
    expect(sync.getSnapshot()).toEqual({
      pending: 1,
      rejected: 0,
      retryable: 0,
      status: 'saving',
    });

    await settled(sync);
    expect(bodies).toEqual([{ attempts: [attempt(0)], userId: 'alice' }]);
    expect(pending()).toEqual([]);
    expect(window.localStorage.length).toBe(0);
    expect(onSaved).toHaveBeenCalledOnce();
    expect(sync.getSnapshot()).toEqual({
      pending: 0,
      rejected: 0,
      retryable: 0,
      status: 'idle',
    });
  });

  it('queues an occurrence only once', async () => {
    const bodies = recordRequests(() => HttpResponse.error());
    const { sync } = started();

    sync.record([attempt(0)]);
    sync.record([attempt(0), attempt(1)]);
    await settled(sync);

    expect(pending()).toEqual([attempt(0), attempt(1)]);
    expect(bodies).toHaveLength(1);
  });

  it('keeps attempts after a network failure and retries with growing delays', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let fail = true;
    const bodies = recordRequests(() =>
      fail
        ? HttpResponse.error()
        : HttpResponse.json({ duplicates: 0, recorded: 1 }),
    );
    const { onSaved, sync } = started();

    sync.record([attempt(0)]);
    await settled(sync);
    expect(sync.getSnapshot()).toMatchObject({ pending: 1, status: 'waiting' });
    expect(pending()).toEqual([attempt(0)]);

    vi.advanceTimersByTime(2_000);
    await vi.waitFor(() => {
      expect(bodies).toHaveLength(2);
    });
    await settled(sync);

    vi.advanceTimersByTime(3_999);
    expect(bodies).toHaveLength(2);
    fail = false;
    vi.advanceTimersByTime(1);
    await vi.waitFor(() => {
      expect(sync.getSnapshot().status).toBe('idle');
    });
    expect(bodies).toHaveLength(3);
    expect(pending()).toEqual([]);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('retries at once on request or when the browser is back online', async () => {
    let fail = true;
    const bodies = recordRequests(() =>
      fail
        ? HttpResponse.json({ message: 'down' }, { status: 503 })
        : HttpResponse.json({ duplicates: 0, recorded: 1 }),
    );
    const { sync } = started();
    sync.record([attempt(0)]);
    await settled(sync);
    expect(sync.getSnapshot().status).toBe('waiting');

    sync.retry();
    await settled(sync);
    expect(bodies).toHaveLength(2);

    fail = false;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(sync.getSnapshot().status).toBe('idle');
    });
    expect(pending()).toEqual([]);
  });

  it('sends attempts left from an earlier visit as soon as it starts', async () => {
    const offline = recordRequests(() => HttpResponse.error());
    const first = started();
    first.sync.record([attempt(0), attempt(1)]);
    await settled(first.sync);
    expect(offline).toHaveLength(1);
    for (const stop of stops.splice(0)) stop();

    const bodies = recordRequests();
    const { sync } = started();
    expect(sync.getSnapshot().pending).toBe(2);
    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toMatchObject({ pending: 0, status: 'idle' });
    });
    expect(bodies[0]?.attempts).toEqual([attempt(0), attempt(1)]);
  });

  it('stops retrying after it is stopped', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bodies = recordRequests(() => HttpResponse.error());
    const { sync } = started();
    sync.record([attempt(0)]);
    await settled(sync);

    for (const stop of stops.splice(0)) stop();
    vi.advanceTimersByTime(120_000);
    expect(bodies).toHaveLength(1);
    expect(pending()).toEqual([attempt(0)]);
  });

  it('sends at most 100 attempts per request', async () => {
    const bodies = recordRequests();
    const { sync } = started();

    sync.record(Array.from({ length: 150 }, (_, index) => attempt(index)));
    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toMatchObject({ pending: 0, status: 'idle' });
    });
    expect(bodies.map(({ attempts }) => attempts.length)).toEqual([100, 50]);
  });

  it('drops attempts the server already holds differently and sends the rest', async () => {
    const bodies = recordRequests(({ attempts }) =>
      attempts.some(({ questionIndex }) => questionIndex === 0)
        ? HttpResponse.json(
            {
              conflicts: [
                { kanaId: 'hiragana:a', questionIndex: 0, roundId: ROUND },
              ],
              message: 'Attempts conflict with recorded attempts',
              statusCode: 409,
            },
            { status: 409 },
          )
        : HttpResponse.json({ duplicates: 0, recorded: attempts.length }),
    );
    const { sync } = started();

    sync.record([attempt(0), attempt(1)]);
    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toMatchObject({ pending: 0, status: 'idle' });
    });
    expect(bodies.map(({ attempts }) => attempts.length)).toEqual([2, 1]);
  });

  describe('several kana results of one question', () => {
    const zi: PendingKanaAttempt = {
      answer: 'じ',
      corrected: false,
      direction: 'romaji-to-kana',
      hintUsed: false,
      kanaId: 'hiragana:zi',
      outcome: 'correct',
      questionIndex: 0,
      roundId: ROUND,
    };
    const di: PendingKanaAttempt = {
      ...zi,
      answer: 'ち',
      kanaId: 'hiragana:di',
      outcome: 'incorrect',
    };

    it('queues each kana result once without one replacing the other', () => {
      const sync = createAttemptSync('alice', vi.fn());
      sync.record([zi]);
      sync.record([di, { ...zi, roundId: ROUND.toUpperCase() }]);
      expect(pending()).toEqual([zi, di]);
    });

    it('drops only the kana result the server names in a conflict', async () => {
      const bodies = recordRequests(({ attempts }) =>
        attempts.some(({ kanaId }) => kanaId === 'hiragana:di')
          ? HttpResponse.json(
              {
                conflicts: [
                  { kanaId: 'hiragana:di', questionIndex: 0, roundId: ROUND },
                ],
                message: 'Attempts conflict with recorded attempts',
                statusCode: 409,
              },
              { status: 409 },
            )
          : HttpResponse.json({ duplicates: 0, recorded: attempts.length }),
      );
      const { sync } = started();

      sync.record([zi, di]);
      await vi.waitFor(() => {
        expect(sync.getSnapshot()).toMatchObject({
          pending: 0,
          status: 'idle',
        });
      });
      expect(bodies.map(({ attempts }) => attempts)).toEqual([[zi, di], [zi]]);
    });

    it('moves only the invalid kana result of a question aside', async () => {
      recordRequests(({ attempts }) =>
        attempts.length === 2
          ? HttpResponse.json(
              {
                invalidIndexes: [1],
                message: 'Invalid attempts',
                statusCode: 400,
              },
              { status: 400 },
            )
          : HttpResponse.json({ duplicates: 0, recorded: 1 }),
      );
      const { sync } = started();

      sync.record([zi, di]);
      await vi.waitFor(() => {
        expect(sync.getSnapshot()).toMatchObject({
          pending: 0,
          status: 'idle',
        });
      });
      expect(readPendingAttempts('alice').invalid).toEqual([di]);
    });
  });

  it('sends a queue saved by M03 unchanged', async () => {
    const saved = { ...attempt(4), answer: 'o', outcome: 'incorrect' };
    window.localStorage.setItem(
      'shiori:kana-attempts:alice',
      JSON.stringify({ pending: [saved], rejected: [attempt(5)], version: 1 }),
    );
    const bodies = recordRequests();
    const { sync } = started();

    await settled(sync);
    expect(bodies).toEqual([{ attempts: [saved], userId: 'alice' }]);
    expect(readPendingAttempts('alice')).toEqual({
      invalid: [],
      pending: [],
      rejected: [attempt(5)],
    });
  });

  it('keeps a batch refused as a whole, never resends it by itself, and sends it again on request', async () => {
    let refuse = true;
    const bodies = recordRequests(() =>
      refuse
        ? HttpResponse.json(
            { message: 'Invalid attempts', statusCode: 400 },
            { status: 400 },
          )
        : HttpResponse.json({ duplicates: 0, recorded: 2 }),
    );
    const { sync } = started();

    sync.record([attempt(0), attempt(1)]);
    await settled(sync);
    expect(sync.getSnapshot()).toEqual({
      pending: 0,
      rejected: 2,
      retryable: 2,
      status: 'idle',
    });
    expect(readPendingAttempts('alice').rejected).toEqual([
      attempt(0),
      attempt(1),
    ]);
    sync.retry();
    await settled(sync);
    expect(bodies).toHaveLength(1);

    refuse = false;
    sync.retryRejected();
    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toMatchObject({
        pending: 0,
        rejected: 0,
        status: 'idle',
      });
    });
    expect(bodies).toHaveLength(2);
    expect(window.localStorage.length).toBe(0);
  });

  it('moves only the entries the server names as invalid and saves the rest', async () => {
    const bodies = recordRequests(({ attempts }) => {
      const invalidIndexes = attempts.flatMap(({ questionIndex }, index) =>
        questionIndex === 1 || questionIndex === 3 ? [index] : [],
      );
      return invalidIndexes.length > 0
        ? HttpResponse.json(
            { invalidIndexes, message: 'Invalid attempts', statusCode: 400 },
            { status: 400 },
          )
        : HttpResponse.json({ duplicates: 0, recorded: attempts.length });
    });
    const { onSaved, sync } = started();

    sync.record([0, 1, 2, 3, 4].map(attempt));
    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toEqual({
        pending: 0,
        rejected: 2,
        retryable: 0,
        status: 'idle',
      });
    });

    expect(bodies.map(({ attempts }) => attempts.length)).toEqual([5, 3]);
    expect(bodies[1]?.attempts).toEqual([0, 2, 4].map(attempt));
    expect(readPendingAttempts('alice')).toEqual({
      invalid: [attempt(1), attempt(3)],
      pending: [],
      rejected: [],
    });
    expect(onSaved).toHaveBeenCalledOnce();

    sync.retryRejected();
    await settled(sync);
    expect(bodies).toHaveLength(2);
  });

  it('applies the named indexes to the batch that was sent, not to attempts queued meanwhile', async () => {
    let respond: (response: Response) => void = () => undefined;
    const bodies = recordRequests(() => HttpResponse.error());
    server.use(
      http.post(ENDPOINT, async ({ request }) => {
        bodies.push((await request.json()) as Body);
        return bodies.length === 1
          ? new Promise<Response>((resolve) => {
              respond = resolve;
            })
          : HttpResponse.json({ duplicates: 0, recorded: 2 });
      }),
    );
    const { sync } = started();

    sync.record([attempt(0), attempt(1)]);
    await vi.waitFor(() => {
      expect(bodies).toHaveLength(1);
    });
    sync.record([attempt(2), attempt(3)]);
    expect(pending()).toEqual([0, 1, 2, 3].map(attempt));
    respond(
      HttpResponse.json(
        { invalidIndexes: [0], message: 'Invalid attempts', statusCode: 400 },
        { status: 400 },
      ),
    );

    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toMatchObject({ pending: 0, status: 'idle' });
    });
    expect(bodies.map(({ attempts }) => attempts)).toEqual([
      [attempt(0), attempt(1)],
      [attempt(1), attempt(2), attempt(3)],
    ]);
    expect(readPendingAttempts('alice').invalid).toEqual([attempt(0)]);
  });

  it('keeps one refused copy of an occurrence when two tabs receive the same 400', async () => {
    let arrived = 0;
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(ENDPOINT, async () => {
        arrived += 1;
        await gate;
        return HttpResponse.json(
          { invalidIndexes: [0], message: 'Invalid attempts', statusCode: 400 },
          { status: 400 },
        );
      }),
    );
    window.localStorage.setItem(
      'shiori:kana-attempts:alice',
      JSON.stringify({
        pending: [attempt(0)],
        rejected: [],
        version: 1,
      }),
    );
    const first = started();
    const second = started();
    await vi.waitFor(() => {
      expect(arrived).toBe(2);
    });
    release(undefined);
    await settled(first.sync);
    await settled(second.sync);

    expect(readPendingAttempts('alice')).toEqual({
      invalid: [attempt(0)],
      pending: [],
      rejected: [],
    });
  });

  it.each([
    ['an index outside the batch', [0, 2]],
    ['a repeated index', [0, 0]],
    ['a negative index', [-1]],
    ['no index', []],
  ])(
    'keeps the whole batch, retryable, when the response names %s',
    async (_, invalidIndexes) => {
      recordRequests(() =>
        HttpResponse.json(
          { invalidIndexes, message: 'Invalid attempts', statusCode: 400 },
          { status: 400 },
        ),
      );
      const { sync } = started();

      sync.record([attempt(0), attempt(1)]);
      await settled(sync);

      expect(readPendingAttempts('alice')).toEqual({
        invalid: [],
        pending: [],
        rejected: [attempt(0), attempt(1)],
      });
      expect(sync.getSnapshot().retryable).toBe(2);
    },
  );

  it('sends results refused by an earlier version again, keeping only the invalid ones', async () => {
    window.localStorage.setItem(
      'shiori:kana-attempts:alice',
      JSON.stringify({
        pending: [],
        rejected: [attempt(0), attempt(1)],
        version: 1,
      }),
    );
    const bodies = recordRequests(({ attempts }) =>
      attempts.length === 2
        ? HttpResponse.json(
            {
              invalidIndexes: [1],
              message: 'Invalid attempts',
              statusCode: 400,
            },
            { status: 400 },
          )
        : HttpResponse.json({ duplicates: 0, recorded: 1 }),
    );
    const { sync } = started();
    expect(sync.getSnapshot()).toMatchObject({ rejected: 2, retryable: 2 });
    expect(bodies).toEqual([]);

    sync.retryRejected();
    await vi.waitFor(() => {
      expect(sync.getSnapshot()).toEqual({
        pending: 0,
        rejected: 1,
        retryable: 0,
        status: 'idle',
      });
    });
    expect(bodies.map(({ attempts }) => attempts)).toEqual([
      [attempt(0), attempt(1)],
      [attempt(0)],
    ]);
    expect(readPendingAttempts('alice').invalid).toEqual([attempt(1)]);
  });

  it('removes refused results on request and keeps pending ones and other accounts', async () => {
    const queue = {
      invalid: [attempt(1)],
      pending: [attempt(2)],
      rejected: [attempt(0)],
      version: 1,
    };
    for (const user of ['alice', 'bob']) {
      window.localStorage.setItem(
        `shiori:kana-attempts:${user}`,
        JSON.stringify(queue),
      );
    }
    recordRequests(() => HttpResponse.error());
    const { sync } = started();
    await settled(sync);

    sync.discardRejected();

    expect(sync.getSnapshot()).toMatchObject({
      pending: 1,
      rejected: 0,
      retryable: 0,
    });
    expect(readPendingAttempts('alice')).toEqual({
      invalid: [],
      pending: [attempt(2)],
      rejected: [],
    });
    expect(readPendingAttempts('bob')).toEqual({
      invalid: [attempt(1)],
      pending: [attempt(2)],
      rejected: [attempt(0)],
    });
  });

  it("never reads or sends another account's attempts", async () => {
    recordRequests(() => HttpResponse.error());
    const alice = started('alice');
    alice.sync.record([attempt(0)]);
    await settled(alice.sync);
    for (const stop of stops.splice(0)) stop();

    const bodies = recordRequests();
    const bob = started('bob');
    bob.sync.record([attempt(5)]);
    await settled(bob.sync);

    expect(bodies).toEqual([{ attempts: [attempt(5)], userId: 'bob' }]);
    expect(bob.sync.getSnapshot().pending).toBe(0);
    expect(pending('alice')).toEqual([attempt(0)]);
  });

  it('keeps attempts in memory when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    recordRequests(() => HttpResponse.error());
    const { sync } = started();

    sync.record([attempt(0)]);
    await settled(sync);
    expect(sync.getSnapshot()).toMatchObject({ pending: 1, status: 'waiting' });
    vi.restoreAllMocks();
  });

  it('records nothing without a signed-in user', () => {
    const bodies = recordRequests();
    const sync = createAttemptSync(undefined, vi.fn());
    stops.push(sync.start());

    sync.record([attempt(0)]);
    expect(sync.getSnapshot().pending).toBe(0);
    expect(bodies).toEqual([]);
  });
});
