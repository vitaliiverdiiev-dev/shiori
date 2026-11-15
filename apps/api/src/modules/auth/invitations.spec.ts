import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { invitationCodeSchema } from './invitations.js';

const CODE_LENGTH = 43;

describe('invitationCodeSchema', () => {
  it('accepts the base64url encoding of 32 random bytes', () => {
    const code = randomBytes(32).toString('base64url');
    expect(invitationCodeSchema.safeParse(code).success).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['one character short', 'a'.repeat(CODE_LENGTH - 1)],
    ['one character long', 'a'.repeat(CODE_LENGTH + 1)],
    ['oversized', 'a'.repeat(100_000)],
    ['standard base64 characters', `${'a'.repeat(CODE_LENGTH - 1)}+`],
    ['padding', `${'a'.repeat(CODE_LENGTH - 1)}=`],
    ['whitespace', ` ${'a'.repeat(CODE_LENGTH - 1)}`],
    ['non-ASCII', `${'a'.repeat(CODE_LENGTH - 1)}栞`],
  ])('rejects %s', (_case, code) => {
    expect(invitationCodeSchema.safeParse(code).success).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(invitationCodeSchema.safeParse(42).success).toBe(false);
  });
});
