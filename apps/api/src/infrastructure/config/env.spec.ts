import { describe, expect, it } from 'vitest';
import { EXAMPLE_AUTH_SECRET, loadDatabaseEnv, loadEnv } from './env.js';

const url = 'postgres://user:not-a-real-secret@127.0.0.1:55432/shiori';
const secret = 'fake-test-secret-that-is-long-enough-123';
const valid = {
  BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: 'http://localhost:5173',
  DATABASE_URL: url,
};

describe('loadEnv', () => {
  it('parses valid config with defaults', () => {
    expect(loadEnv(valid)).toEqual({
      ...valid,
      PORT: 3000,
      REGISTRATION_MODE: 'closed',
    });
  });

  it('accepts invite-only registration', () => {
    expect(
      loadEnv({ ...valid, REGISTRATION_MODE: 'invite' }).REGISTRATION_MODE,
    ).toBe('invite');
  });

  it('accepts a deployed https origin with its own secret', () => {
    const env = { ...valid, BETTER_AUTH_URL: 'https://shiori.example.com' };
    expect(loadEnv(env).BETTER_AUTH_URL).toBe('https://shiori.example.com');
  });

  it('allows the example secret on this machine', () => {
    expect(() =>
      loadEnv({ ...valid, BETTER_AUTH_SECRET: EXAMPLE_AUTH_SECRET }),
    ).not.toThrow();
  });

  it.each([
    [{}, 'DATABASE_URL'],
    [{ ...valid, DATABASE_URL: 'mysql://u:p@127.0.0.1/x' }, 'DATABASE_URL'],
    [{ ...valid, PORT: 'abc' }, 'PORT'],
    [{ ...valid, BETTER_AUTH_SECRET: undefined }, 'BETTER_AUTH_SECRET'],
    [{ ...valid, BETTER_AUTH_SECRET: 'short' }, 'BETTER_AUTH_SECRET'],
    [{ ...valid, BETTER_AUTH_URL: 'ftp://localhost' }, 'BETTER_AUTH_URL'],
    [{ ...valid, REGISTRATION_MODE: 'public' }, 'REGISTRATION_MODE'],
    [
      { ...valid, REGISTRATION_MODE: 'open' },
      'REGISTRATION_MODE (open registration requires email verification)',
    ],
    [
      { ...valid, BETTER_AUTH_URL: 'http://shiori.example.com' },
      'BETTER_AUTH_URL (a non-local URL must use https)',
    ],
    [
      {
        ...valid,
        BETTER_AUTH_SECRET: EXAMPLE_AUTH_SECRET,
        BETTER_AUTH_URL: 'https://shiori.example.com',
      },
      'BETTER_AUTH_SECRET (the example secret is for local development only)',
    ],
  ])('fails clearly for %o', (source, problem) => {
    expect(() => loadEnv(source)).toThrow(problem);
  });

  it('never includes values in the error', () => {
    const attempt = () =>
      loadEnv({
        ...valid,
        BETTER_AUTH_SECRET: 'too-short-secret',
        DATABASE_URL: url.replace('postgres', 'mysql'),
      });
    expect(attempt).toThrow(/^(?!.*not-a-real-secret)(?!.*too-short-secret)/);
  });
});

describe('loadDatabaseEnv', () => {
  it('needs only DATABASE_URL, so migrations run before auth is configured', () => {
    expect(loadDatabaseEnv({ DATABASE_URL: url })).toEqual({
      DATABASE_URL: url,
    });
  });
});
