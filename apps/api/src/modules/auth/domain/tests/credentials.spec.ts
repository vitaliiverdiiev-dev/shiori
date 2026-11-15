import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '../credentials.js';

describe('normalizeEmail', () => {
  it('trims and lowercases a valid address', () => {
    expect(normalizeEmail('  Admin@Example.TEST \n')).toBe(
      'admin@example.test',
    );
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['missing domain', 'admin@'],
    ['no at sign', 'not an email'],
  ])('rejects %s', (_case, raw) => {
    expect(normalizeEmail(raw)).toBeUndefined();
  });
});
