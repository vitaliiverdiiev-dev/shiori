const MARKER =
  /^(TODO|FIXME|WORKAROUND|INVARIANT|COMPAT)(?:\(([^()\s][^()]*)\))?: (.+)$/s;
const NEEDS_REFERENCE = new Set(['COMPAT', 'WORKAROUND']);
const MIN_DESCRIPTION_WORDS = 3;
const LICENSE = /^!|SPDX-License-Identifier:|@license\b/;
const TRIPLE_SLASH = /^\/\s*<reference\s+(?:lib|path|types)=/;
const DIRECTIVE = /^\s*eslint-(?:disable(?:-line|-next-line)?|enable)\b/;
const JUSTIFIED_DIRECTIVE = /\s--\s+\S/;
const SCRIPT_FILE = /\.[cm]?js$/;

const TAG_TAILS = {
  import: /^\s+(?:\{[^}]*\}|\*\s+as\s+[\w$]+|[\w$]+)\s+from\s+(['"])[^'"]+\1/,
  param: /^\s+(?:\[[\w$.]+(?:=[^\]]*)?\]|[\w$.]+)/,
  property: /^\s+(?:\[[\w$.]+(?:=[^\]]*)?\]|[\w$.]+)/,
  returns: /^/,
  satisfies: /^/,
  template: /^\s+[\w$]+(?:\s*,\s*[\w$]+)*/,
  type: /^/,
  typedef: /^\s+[\w$]+/,
};
const TYPED_TAGS = new Set([
  'param',
  'property',
  'returns',
  'satisfies',
  'type',
  'typedef',
]);

const MESSAGE =
  'Unclassified comment. Remove it, or start it with TODO, FIXME, WORKAROUND, INVARIANT or COMPAT, then `: ` and a specific reason (COMPAT and WORKAROUND name the dependency: `COMPAT(pkg@1.2.3): …`).';

/** @param {string} text @returns {number} */
function balancedBraceEnd(text) {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return index + 1;
  }
  return -1;
}

/** @param {string} value @returns {string} */
function blockText(value) {
  return value
    .split('\n')
    .map((line) => line.replace(/^\s*\*+/, '').trim())
    .filter(Boolean)
    .join(' ');
}

/** @param {string} text @returns {boolean} */
function isClassified(text) {
  const match = MARKER.exec(text);
  if (!match) return false;
  const [, category, reference, description] = match;
  if (NEEDS_REFERENCE.has(category) && !reference) return false;
  return description.trim().split(/\s+/).length >= MIN_DESCRIPTION_WORDS;
}

/** @param {string} text @returns {boolean} */
function isTypeOnlyJsDoc(text) {
  let rest = text.trim();
  if (!rest.startsWith('@')) return false;
  while (rest.length > 0) {
    const tag = /^@(\w+)/.exec(rest);
    if (!tag || !(tag[1] in TAG_TAILS)) return false;
    rest = rest.slice(tag[0].length);
    if (
      TYPED_TAGS.has(tag[1]) ||
      (tag[1] === 'template' && /^\s*\{/.test(rest))
    ) {
      rest = rest.trimStart();
      const end = balancedBraceEnd(rest);
      if (!rest.startsWith('{') || end < 0) return false;
      rest = rest.slice(end);
    }
    const tail = TAG_TAILS[tag[1]].exec(rest);
    if (!tail) return false;
    rest = rest.slice(tail[0].length).trimStart();
    if (rest.length > 0 && !rest.startsWith('@')) return false;
  }
  return true;
}

/** @param {import('eslint').AST.Program['comments'][number]} comment @param {string} filename */
function isTechnicalException(comment, filename) {
  if (comment.type === 'Shebang') return true;
  if (DIRECTIVE.test(comment.value)) {
    return (
      !comment.value.trim().startsWith('eslint-disable') ||
      JUSTIFIED_DIRECTIVE.test(comment.value)
    );
  }
  if (LICENSE.test(comment.value)) return true;
  if (comment.type === 'Line') return TRIPLE_SLASH.test(comment.value);
  return (
    comment.value.startsWith('*') &&
    SCRIPT_FILE.test(filename) &&
    isTypeOnlyJsDoc(blockText(comment.value))
  );
}

/** @type {import('eslint').Rule.RuleModule} */
const commentPolicy = {
  create(context) {
    return {
      Program() {
        let previousClassified;
        for (const comment of context.sourceCode.getAllComments()) {
          const classified =
            (comment.type === 'Line' &&
              previousClassified?.type === 'Line' &&
              previousClassified.loc.end.line === comment.loc.start.line - 1 &&
              previousClassified.loc.start.column ===
                comment.loc.start.column) ||
            isClassified(
              comment.type === 'Block'
                ? blockText(comment.value)
                : comment.value.trim(),
            );
          if (!classified && !isTechnicalException(comment, context.filename)) {
            context.report({ loc: comment.loc, message: MESSAGE });
          }
          previousClassified = classified ? comment : undefined;
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Allow only TODO/FIXME/WORKAROUND/INVARIANT/COMPAT comments plus narrow technical exceptions.',
    },
    schema: [],
    type: 'suggestion',
  },
};

export const commentPolicyPlugin = {
  rules: { 'comment-policy': commentPolicy },
};
