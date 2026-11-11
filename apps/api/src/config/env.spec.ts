import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const url = 'postgres://user:not-a-real-secret@127.0.0.1:55432/shiori';

describe('loadEnv', () => {
  it('parses valid config and defaults PORT', () => {
    expect(loadEnv({ DATABASE_URL: url })).toEqual({
      DATABASE_URL: url,
      PORT: 3000,
    });
  });

  it.each([
    [{}, 'DATABASE_URL'],
    [{ DATABASE_URL: 'mysql://u:p@127.0.0.1/x' }, 'DATABASE_URL'],
    [{ DATABASE_URL: url, PORT: 'abc' }, 'PORT'],
  ])('fails clearly for %o', (source, name) => {
    expect(() => loadEnv(source)).toThrow(name);
  });

  it('never includes values in the error', () => {
    expect(() =>
      loadEnv({ DATABASE_URL: url.replace('postgres', 'mysql') }),
    ).toThrow(/^(?!.*not-a-real-secret).*$/);
  });
});
