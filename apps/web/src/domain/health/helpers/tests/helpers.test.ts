import { describe, expect, it } from 'vitest';
import { describeApiFailure, getStatus } from '../helpers';

const idle = {
  data: undefined,
  error: null,
  isFetching: false,
  isSuccess: false,
};

describe('describeApiFailure', () => {
  it.each([
    [{ code: 'ECONNABORTED' }, 'API did not respond in time'],
    [{ code: 'ETIMEDOUT' }, 'API did not respond in time'],
    [{ code: 'ERR_NETWORK' }, 'API is unreachable'],
    [
      { code: 'ERR_BAD_RESPONSE', response: { status: 503 } },
      'API responded 503',
    ],
  ])('describes %o as "%s"', (failure, text) => {
    expect(describeApiFailure(failure)).toBe(text);
  });
});

describe('getStatus', () => {
  it('ignores cached readiness while the API is offline', () => {
    const health = { ...idle, error: { code: 'ERR_NETWORK' } };
    const staleReadiness = {
      ...idle,
      data: { checks: { database: 'up' }, status: 'ok' },
      isSuccess: true,
    };

    expect(getStatus(health, staleReadiness)).toEqual({
      api: 'offline',
      database: 'unknown',
      reason: 'API is unreachable',
    });
  });
});
