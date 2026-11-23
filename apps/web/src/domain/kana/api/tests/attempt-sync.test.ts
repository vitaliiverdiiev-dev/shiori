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
              conflicts: [{ questionIndex: 0, roundId: ROUND }],
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

  it('keeps a refused batch on the device without sending it again', async () => {
    const bodies = recordRequests(() =>
      HttpResponse.json(
        { message: 'Invalid attempts', statusCode: 400 },
        { status: 400 },
      ),
    );
    const { sync } = started();

    sync.record([attempt(0)]);
    await settled(sync);

    expect(sync.getSnapshot()).toEqual({
      pending: 0,
      rejected: 1,
      status: 'idle',
    });
    expect(readPendingAttempts('alice').rejected).toEqual([attempt(0)]);
    sync.retry();
    await settled(sync);
    expect(bodies).toHaveLength(1);
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
