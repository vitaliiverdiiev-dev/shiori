import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../constants/password.constants.js';
import {
  hasAllowedPasswordLength,
  isCommonPassword,
} from '../password.policy.js';

describe('isCommonPassword', () => {
  it.each([
    ['a listed password', 'passwordpassword'],
    ['letter case', 'PasswordPassword'],
    ['spaces between words', 'correct horse battery staple'],
    ['full-width input (NFKC)', 'ｐａｓｓｗｏｒｄｐａｓｓｗｏｒｄ'],
    ['a keyboard walk', 'qwertyuiopasdfgh'],
    ['a digit run', '123456789012345'],
    ['one repeated character', 'aaaaaaaaaaaaaaa'],
    ['one repeated emoji', '😀'.repeat(15)],
    ['a repeated short unit', 'abcabcabcabcabc'],
    ['spaced repetition', 'a a a a a a a a'],
    ['whitespace only', ' '.repeat(15)],
  ])('rejects %s', (_case, password) => {
    expect(isCommonPassword(password)).toBe(true);
  });

  it.each([
    ['a passphrase', 'a long enough passphrase'],
    ['Unicode and spaces', '栞 しおり café 2026 passphrase'],
    ['a listed password inside a longer one', 'my passwordpassword is long'],
    ['a four-character unit repeated', 'abcdabcdabcdabcd'],
  ])('accepts %s', (_case, password) => {
    expect(isCommonPassword(password)).toBe(false);
  });
});

describe('hasAllowedPasswordLength', () => {
  it('counts UTF-16 code units of the raw input, inclusive bounds', () => {
    expect(hasAllowedPasswordLength('x'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(
      false,
    );
    expect(hasAllowedPasswordLength('x'.repeat(PASSWORD_MIN_LENGTH))).toBe(
      true,
    );
    expect(hasAllowedPasswordLength('x'.repeat(PASSWORD_MAX_LENGTH))).toBe(
      true,
    );
    expect(hasAllowedPasswordLength('x'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(
      false,
    );
  });
});
