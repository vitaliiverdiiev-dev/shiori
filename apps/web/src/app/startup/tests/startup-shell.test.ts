import { afterEach, describe, expect, it } from 'vitest';
import type { ThemeConfig } from '@/shared/theme';
import { STARTUP_ATTRIBUTE } from '../consts';
import { createFaviconHref, renderStartupHtml } from '../startup-shell';

const template = `<!doctype html><html><head><!--startup-head--></head><body><div id="root"><!--startup-shell--></div></body></html>`;
const product = {
  logoGlyph: '栞',
  name: 'Shiori',
  tagline: 'Your Guide to Japanese',
};
const theme: ThemeConfig = {
  colors: { dark: '#0a0a0a', light: '#ffffff' },
  shortcutStorageKey: 'theme-shortcut',
  storageKey: 'theme',
};

function parse(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('renderStartupHtml', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('brands the page before any script runs', () => {
    const page = parse(renderStartupHtml(template, product, theme));

    expect(page.title).toBe('Shiori — Your Guide to Japanese');
    expect(page.querySelector('title')?.hasAttribute(STARTUP_ATTRIBUTE)).toBe(
      true,
    );
    expect(page.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
      createFaviconHref('栞'),
    );
    expect(
      page.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    ).toBe('#ffffff');
    const mark = page.querySelector('#root [role="img"]');
    expect(mark?.getAttribute('aria-label')).toBe('Shiori');
    expect(mark?.textContent).toBe('栞');
  });

  it('says it is loading, not that the session was checked', () => {
    const root = parse(
      renderStartupHtml(template, product, theme),
    ).getElementById('root');

    expect(root?.querySelector('[role="status"]')?.textContent).toBe(
      'Loading…',
    );
    expect(root?.textContent).not.toMatch(/session|signed/i);
  });

  it('runs the theme script before the stylesheet and app', () => {
    const head = parse(renderStartupHtml(template, product, theme)).head;
    const [themeScript] = head.querySelectorAll('script');

    expect(themeScript?.textContent).toContain('prefers-color-scheme');
    expect(head.querySelector('style')?.textContent).toContain(
      '.startup-shell',
    );
  });

  it('explains when JavaScript is unavailable', () => {
    const html = renderStartupHtml(template, product, theme);

    expect(html).toContain(
      '<noscript><p class="startup-shell__status">Shiori needs JavaScript to run.</p></noscript>',
    );
  });

  it('escapes product identity before writing it into HTML', () => {
    const page = parse(
      renderStartupHtml(
        template,
        { ...product, name: '<b>Shiori</b>', tagline: 'a & b' },
        theme,
      ),
    );

    expect(page.title).toBe('<b>Shiori</b> — a & b');
    expect(page.querySelector('#root b')).not.toBeInTheDocument();
  });

  it('fails the build when index.html lacks the placeholders', () => {
    expect(() =>
      renderStartupHtml('<html><head></head></html>', product, theme),
    ).toThrow('index.html must contain');
  });

  it('reveals a recovery message when a startup script fails to load', () => {
    const page = parse(renderStartupHtml(template, product, theme));
    document.body.innerHTML = page.body.innerHTML;
    const [, errorScript] = page.head.querySelectorAll('script');
    const listener = document.createElement('script');
    listener.textContent = errorScript?.textContent ?? '';
    document.head.append(listener);

    const failedBundle = document.createElement('script');
    document.body.append(failedBundle);
    failedBundle.dispatchEvent(new Event('error'));

    expect(document.getElementById('startup-error')).toBeVisible();
    expect(document.getElementById('startup-error')).toHaveTextContent(
      'Shiori couldn’t start',
    );
    expect(document.getElementById('startup-loading')).not.toBeVisible();
    listener.remove();
  });
});
