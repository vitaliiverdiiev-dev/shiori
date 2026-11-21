import type { Plugin } from 'vite';
import { createThemeScript } from '../../shared/theme/helpers/theme.ts';
import type { ThemeConfig } from '../../shared/theme/model/types.ts';
import { STARTUP_ATTRIBUTE } from './consts.ts';

type ProductIdentity = {
  logoGlyph: string;
  name: string;
  tagline: string;
};

const HEAD_PLACEHOLDER = '<!--startup-head-->';
const SHELL_PLACEHOLDER = '<!--startup-shell-->';

const criticalCss = [
  'html{background:var(--background,Canvas);color:var(--foreground,CanvasText)}',
  ".startup-shell{box-sizing:border-box;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;margin:0;padding:0 1.25rem;font-family:'Geist Variable',system-ui,sans-serif;text-align:center}",
  ".startup-shell__mark{display:flex;align-items:center;justify-content:center;width:4rem;height:4rem;border-radius:1.125rem;background:var(--primary,CanvasText);color:var(--primary-foreground,Canvas);font-size:2.25rem;line-height:1;font-family:'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP','Noto Serif CJK JP',serif;user-select:none}",
  '.startup-shell__status{margin:0;font-size:.875rem;line-height:1.25rem;color:var(--muted-foreground,GrayText)}',
  '.startup-shell__status a{color:inherit;text-decoration:underline}',
].join('');

const startupErrorScript = `addEventListener('error',function(event){var message=document.getElementById('startup-error');if(!message)return;var target=event.target;if(target!==window&&!(target&&(target.tagName==='SCRIPT'||target.tagName==='LINK')))return;message.hidden=false;var loading=document.getElementById('startup-loading');if(loading)loading.hidden=true;},true);`;

export function createFaviconHref(glyph: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="52" font-family="serif">${escapeHtml(glyph)}</text></svg>`,
  )}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderStartupHtml(
  html: string,
  product: ProductIdentity,
  theme: ThemeConfig,
): string {
  if (!html.includes(HEAD_PLACEHOLDER) || !html.includes(SHELL_PLACEHOLDER)) {
    throw new Error(
      `index.html must contain ${HEAD_PLACEHOLDER} and ${SHELL_PLACEHOLDER}`,
    );
  }
  const name = escapeHtml(product.name);
  const head = [
    `<title ${STARTUP_ATTRIBUTE}>${name} — ${escapeHtml(product.tagline)}</title>`,
    `<link rel="icon" href="${createFaviconHref(product.logoGlyph)}" />`,
    `<meta name="theme-color" content="${escapeHtml(theme.colors.light)}" />`,
    `<script>${createThemeScript(theme)}</script>`,
    `<script>${startupErrorScript}</script>`,
    `<style>${criticalCss}</style>`,
    '<noscript><style>#startup-loading{display:none}</style></noscript>',
  ].join('\n    ');
  const shell = [
    '<div class="startup-shell">',
    `<span class="startup-shell__mark" role="img" aria-label="${name}">${escapeHtml(product.logoGlyph)}</span>`,
    '<p class="startup-shell__status" id="startup-loading" role="status">Loading…</p>',
    `<p class="startup-shell__status" id="startup-error" role="alert" hidden>${name} couldn’t start. Check your connection, then <a href="">reload the page</a>.</p>`,
    `<noscript><p class="startup-shell__status">${name} needs JavaScript to run.</p></noscript>`,
    '</div>',
  ].join('');

  return html.replace(HEAD_PLACEHOLDER, head).replace(SHELL_PLACEHOLDER, shell);
}

export function startupShell(
  product: ProductIdentity,
  theme: ThemeConfig,
): Plugin {
  return {
    name: 'startup-shell',
    transformIndexHtml: {
      handler: (html, { path }) =>
        path === '/index.html' ? renderStartupHtml(html, product, theme) : html,
      order: 'pre',
    },
  };
}
