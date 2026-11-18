import { describe, expect, it } from 'vitest';
import { getSafeRedirect, getSignInPath } from '../redirect';

describe('getSafeRedirect', () => {
  it.each([
    ['/status', '/status'],
    ['/settings/account?tab=name#top', '/settings/account?tab=name#top'],
    ['/a/../status', '/status'],
  ])('keeps the internal destination %s', (target, expected) => {
    expect(getSafeRedirect(target)).toBe(expected);
  });

  it.each([
    ['missing', null],
    ['empty', ''],
    ['absolute URL', 'https://evil.example/path'],
    ['javascript URL', 'javascript:alert(1)'],
    ['protocol-relative', '//evil.example'],
    ['backslash protocol-relative', '/\\evil.example'],
    ['encoded protocol-relative', '/%2F%2Fevil.example'],
    ['encoded backslash', '/%5Cevil.example'],
    ['tab-smuggled protocol-relative', '/\t/evil.example'],
    ['encoded control character', '/%09/evil.example'],
    ['dot-segment protocol-relative', '/.//evil.example'],
    ['relative path', 'status'],
    ['malformed encoding', '/%E0%A4%A'],
    ['sign-in page', '/sign-in?redirect=/status'],
    ['sign-up page with trailing slash', '/SIGN-UP/'],
  ])('falls back to home for a %s target', (_case, target) => {
    expect(getSafeRedirect(target)).toBe('/');
  });
});

describe('getSignInPath', () => {
  it('omits the destination when it is home', () => {
    expect(getSignInPath({ hash: '', pathname: '/', search: '' })).toBe(
      '/sign-in',
    );
  });

  it('preserves path, query and hash of any other destination', () => {
    const path = getSignInPath({
      hash: '#top',
      pathname: '/settings/account',
      search: '?tab=name',
    });

    expect(path).toBe(
      '/sign-in?redirect=%2Fsettings%2Faccount%3Ftab%3Dname%23top',
    );
    const target = new URLSearchParams(path.split('?')[1]).get('redirect');
    expect(getSafeRedirect(target)).toBe('/settings/account?tab=name#top');
  });
});
