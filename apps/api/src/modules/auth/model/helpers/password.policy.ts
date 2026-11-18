import { COMMON_PASSWORDS } from '../constants/common-passwords.constants.js';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../constants/password.constants.js';

const WHITESPACE = /\s+/gu;
const REPEATED_SHORT_UNIT = /^(.{1,3})\1+$/su;

export function hasAllowedPasswordLength(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}

export function isCommonPassword(password: string): boolean {
  const comparable = password
    .normalize('NFKC')
    .toLowerCase()
    .replace(WHITESPACE, '');
  return (
    comparable === '' ||
    REPEATED_SHORT_UNIT.test(comparable) ||
    COMMON_PASSWORDS.has(comparable)
  );
}
