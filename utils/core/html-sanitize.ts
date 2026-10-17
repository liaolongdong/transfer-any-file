/**
 * Subresource stripping for untrusted HTML rendered inside the extension.
 *
 * DOMPurify removes executable markup but deliberately keeps remote URLs: a sanitized
 * `<img src="https://…">` or `<link rel="stylesheet" href="https://…">` still makes the browser
 * issue a network request when the markup is rendered (srcdoc iframes load subresources even
 * without scripts, and `html-to-image` with `cacheBust` re-fetches what it finds in the DOM).
 * For an offline-first extension that is both a privacy leak and a broken promise, so every
 * render boundary strips remote references before the markup reaches an iframe or the rasterizer.
 *
 * URL values are not compared as text. Browsers resolve `//host/path`, `\\host\path`, HTML
 * character references and CSS escapes (`u\72 l(...)`) to the same remote location, and CSS
 * comments may sit between tokens, so everything below normalizes before deciding and then cuts
 * the *original* span — safe CSS is left byte-for-byte intact.
 */

/** Tags whose attribute values trigger a subresource load, with the URL-bearing attributes. */
const SUBRESOURCE_ATTRS: Record<string, string[]> = {
  img: ['src'],
  link: ['href'],
  base: ['href'],
  source: ['src'],
  audio: ['src'],
  video: ['src', 'poster'],
  track: ['src'],
  iframe: ['src'],
  embed: ['src'],
  object: ['data'],
  input: ['src'],
  image: ['href', 'xlink:href'],
  // SVG's other "this element draws an external resource" cases. `stripElement` looks the tag up as
  // `tagName.toLowerCase()`, so `feImage` is reached by the lowercase key however the parser cased
  // it. Both survive a profile sanitize: `feImage` is in DOMPurify's `svgFilters` tag set and
  // `href` in its `svg` attribute set, while `use` is on its disallowed list and therefore only
  // reaches this pass through the paths that sanitize nothing at all — a user's own `.html` file.
  feimage: ['href', 'xlink:href'],
  use: ['href', 'xlink:href'],
};

/**
 * URL-bearing attributes that fetch on whatever element carries them, so the per-tag table above
 * cannot reach them.
 *
 * `background` is the legacy image attribute of `<body>` and the table cells. It is in DOMPurify's
 * `html` attribute allow-list, so a sanitized document hands it over intact while `body` and `td`
 * have no row in the table to look it up in. `ping` fires a request when a link is activated.
 * Measured in Chrome on the exact profile `html-raster` uses: after sanitize + strip, a sandboxed
 * `srcdoc` iframe requested every `background` URL it was given and none of the `src` /
 * inline-`url()` ones.
 */
const GLOBAL_SUBRESOURCE_ATTRS = ['background', 'ping'];

/**
 * SVG elements that can rewrite a presentation attribute at render time. They have no place in a
 * static preview, and an animation can point a paint server at the network after the attributes
 * were checked.
 */
const ANIMATION_TAGS = new Set(['animate', 'animatecolor', 'animatemotion', 'animatetransform', 'set', 'discard']);

/**
 * True when the reference cannot reach the network.
 *
 * The browser strips tabs/newlines from URLs and treats `\` as `/`, so both are normalized before
 * the scheme test; a protocol-relative `//host` is remote even though it has no scheme. `data:` is
 * only local for raster image payloads — an SVG or HTML data URL can carry markup of its own.
 */
function isLocalUrl(value: string): boolean {
  // URL parsing drops leading/trailing C0 controls and spaces; `trim()` alone would leave NUL and
  // friends in place. A loop rather than a regex because ESLint's `no-control-regex` is right that
  // a control-character range is hard to read.
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) <= 0x20) start++;
  while (end > start && value.charCodeAt(end - 1) <= 0x20) end--;
  const trimmed = value.slice(start, end).replace(/[\t\n\r]/g, '');
  if (!trimmed || trimmed.startsWith('#')) return true;
  const slashed = trimmed.replace(/\\/g, '/');
  if (slashed.startsWith('//')) return false;
  const scheme = slashed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return true; // relative — resolves against the document, never the network
  const name = scheme[1].toLowerCase();
  if (name === 'data') {
    return /^data:image\/(?:png|jpe?g|gif|webp|bmp|avif|x-icon|vnd\.microsoft\.icon)\s*(?:[;,]|$)/i.test(slashed);
  }
  return name === 'blob' || name === 'about';
}

function stripRemoteSrcset(value: string): string | null {
  const kept = value
    .split(',')
    .map(candidate => candidate.trim())
    .filter(candidate => candidate && isLocalUrl(candidate.split(/\s+/)[0]));
  return kept.length > 0 ? kept.join(', ') : null;
}

/** Whitespace and comments are equivalent in CSS and may sit anywhere between tokens. */
function isCssWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

function isHexDigit(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}

function isIdentStart(ch: string): boolean {
  return /[a-zA-Z_-]/.test(ch) || ch === '\\' || ch.charCodeAt(0) >= 0x80;
}

function isIdentChar(ch: string): boolean {
  return /[a-zA-Z0-9_-]/.test(ch) || ch === '\\' || ch.charCodeAt(0) >= 0x80;
}

function skipCssComment(css: string, index: number): number {
  const end = css.indexOf('*/', index + 2);
  return end === -1 ? css.length : end + 2;
}

/** Decode one CSS escape starting at `index` (which points at the backslash). */
function readCssEscape(css: string, index: number): { value: string; next: number } {
  let p = index + 1;
  if (p >= css.length) return { value: '\uFFFD', next: p };
  const ch = css[p];
  if (ch === '\n' || ch === '\f') return { value: '', next: p + 1 };
  if (ch === '\r') return { value: '', next: css[p + 1] === '\n' ? p + 2 : p + 1 };
  if (isHexDigit(ch)) {
    let hex = '';
    while (p < css.length && hex.length < 6 && isHexDigit(css[p])) {
      hex += css[p];
      p += 1;
    }
    if (p < css.length && isCssWhitespace(css[p])) {
      p += css[p] === '\r' && css[p + 1] === '\n' ? 2 : 1;
    }
    const code = Number.parseInt(hex, 16);
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
      return { value: '\uFFFD', next: p };
    }
    return { value: String.fromCodePoint(code), next: p };
  }
  return { value: ch, next: p + 1 };
}

/** Read a CSS identifier, decoding escapes so `u\72 l` compares equal to `url`. */
function readCssIdent(css: string, index: number): { value: string; next: number } {
  let value = '';
  let p = index;
  while (p < css.length && isIdentChar(css[p])) {
    if (css[p] === '\\') {
      const escaped = readCssEscape(css, p);
      value += escaped.value;
      p = escaped.next;
    } else {
      value += css[p];
      p += 1;
    }
  }
  return { value: value.toLowerCase(), next: p };
}

/** Read a quoted string, decoding escapes; `next` stops at the quote, a newline, or end of input. */
function readCssString(css: string, index: number): { value: string; next: number } {
  const quote = css[index];
  let value = '';
  let p = index + 1;
  while (p < css.length) {
    const ch = css[p];
    if (ch === quote) return { value, next: p + 1 };
    if (ch === '\n' || ch === '\r' || ch === '\f') return { value, next: p };
    if (ch === '\\') {
      const escaped = readCssEscape(css, p);
      value += escaped.value;
      p = escaped.next;
      continue;
    }
    value += ch;
    p += 1;
  }
  return { value, next: p };
}

/** Index just past the `)` matching the `(` at `openIndex`, or end of input when unclosed. */
function findCssFunctionEnd(css: string, openIndex: number): number {
  let depth = 1;
  let p = openIndex + 1;
  while (p < css.length) {
    const ch = css[p];
    if (ch === '"' || ch === "'") {
      p = readCssString(css, p).next;
      continue;
    }
    if (ch === '/' && css[p + 1] === '*') {
      p = skipCssComment(css, p);
      continue;
    }
    if (ch === '\\') {
      p = readCssEscape(css, p).next;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return p + 1;
    }
    p += 1;
  }
  return css.length;
}

/** The URL argument of a `url(...)` function, with CSS escapes and outer quotes removed. */
function cssUrlValue(css: string, openIndex: number, endIndex: number): string {
  const stop = endIndex - 1;
  let p = openIndex + 1;
  while (p < stop) {
    if (isCssWhitespace(css[p])) {
      p += 1;
      continue;
    }
    if (css[p] === '/' && css[p + 1] === '*') {
      p = skipCssComment(css, p);
      continue;
    }
    break;
  }
  if (p < stop && (css[p] === '"' || css[p] === "'")) return readCssString(css, p).value.replace(/[\t\n\r]/g, '');
  let value = '';
  while (p < stop) {
    if (css[p] === '\\') {
      const escaped = readCssEscape(css, p);
      value += escaped.value;
      p = escaped.next;
      continue;
    }
    value += css[p];
    p += 1;
  }
  return value.replace(/[\t\n\r]/g, '');
}

/**
 * Whether an `image-set()` / `image()` body holds a remote candidate. Each quoted string in those
 * functions is an image URL; a nested `url()` is checked the same way.
 */
function bodyHasRemoteUrl(css: string, openIndex: number, endIndex: number): boolean {
  const stop = endIndex - 1;
  let p = openIndex + 1;
  while (p < stop) {
    const ch = css[p];
    if (ch === '"' || ch === "'") {
      const str = readCssString(css, p);
      if (!isLocalUrl(str.value)) return true;
      p = str.next;
      continue;
    }
    if (ch === '/' && css[p + 1] === '*') {
      p = skipCssComment(css, p);
      continue;
    }
    if (isIdentStart(ch)) {
      const ident = readCssIdent(css, p);
      if (css[ident.next] === '(') {
        const fnEnd = findCssFunctionEnd(css, ident.next);
        if (ident.value === 'url') {
          if (!isLocalUrl(cssUrlValue(css, ident.next, fnEnd))) return true;
          p = fnEnd;
        } else if (ident.value === 'image-set' || ident.value === '-webkit-image-set' || ident.value === 'image') {
          if (bodyHasRemoteUrl(css, ident.next, fnEnd)) return true;
          p = fnEnd;
        } else {
          // `var(--bg, url(...))` and `cross-fade(...)` can wrap a URL in a function whose name
          // says nothing about it; entering the body keeps that URL reachable to this scan.
          p = ident.next + 1;
        }
        continue;
      }
      p = ident.next > p ? ident.next : p + 1;
      continue;
    }
    if (ch === '\\') {
      p = readCssEscape(css, p).next;
      continue;
    }
    p += 1;
  }
  return false;
}

/** The URL argument of `@import`, whether written as a bare string or as `url(...)`. */
function readImportUrl(css: string, start: number): string | null {
  let p = start;
  while (p < css.length) {
    if (isCssWhitespace(css[p])) {
      p += 1;
      continue;
    }
    if (css[p] === '/' && css[p + 1] === '*') {
      p = skipCssComment(css, p);
      continue;
    }
    break;
  }
  if (p >= css.length) return null;
  if (css[p] === '"' || css[p] === "'") return readCssString(css, p).value;
  const ident = readCssIdent(css, p);
  if (ident.value !== 'url' || css[ident.next] !== '(') return null;
  return cssUrlValue(css, ident.next, findCssFunctionEnd(css, ident.next));
}

/** End of the whole `@import` at-rule, keeping parentheses and strings from ending it early. */
function findImportEnd(css: string, start: number): number {
  let p = start;
  while (p < css.length) {
    const ch = css[p];
    if (ch === '"' || ch === "'") {
      p = readCssString(css, p).next;
      continue;
    }
    if (ch === '/' && css[p + 1] === '*') {
      p = skipCssComment(css, p);
      continue;
    }
    if (ch === '(') {
      p = findCssFunctionEnd(css, p);
      continue;
    }
    if (ch === '\\') {
      p = readCssEscape(css, p).next;
      continue;
    }
    if (ch === ';') return p + 1;
    p += 1;
  }
  return css.length;
}

interface CssReplacement {
  start: number;
  end: number;
  text: string;
}

/**
 * Removes `url(...)`, `@import` and `image-set(...)` references that point at the network.
 *
 * Replacement spans are cut out of the original string, so a stylesheet that needed no change is
 * returned identically — escapes and comments in safe CSS survive instead of being normalized.
 */
export function stripRemoteCss(css: string): string {
  if (!/url|import|image|\\/i.test(css)) return css;

  const replacements: CssReplacement[] = [];
  let p = 0;
  while (p < css.length) {
    const ch = css[p];
    if (ch === '"' || ch === "'") {
      p = readCssString(css, p).next;
      continue;
    }
    if (ch === '/' && css[p + 1] === '*') {
      p = skipCssComment(css, p);
      continue;
    }
    if (ch === '@') {
      const ident = readCssIdent(css, p + 1);
      if (ident.value === 'import') {
        const ruleEnd = findImportEnd(css, ident.next);
        const url = readImportUrl(css, ident.next);
        if (url !== null && !isLocalUrl(url)) replacements.push({ start: p, end: ruleEnd, text: '' });
        p = ruleEnd;
        continue;
      }
      p = ident.next > p + 1 ? ident.next : p + 1;
      continue;
    }
    if (isIdentStart(ch)) {
      const ident = readCssIdent(css, p);
      if (css[ident.next] === '(') {
        const fnEnd = findCssFunctionEnd(css, ident.next);
        if (ident.value === 'url') {
          if (!isLocalUrl(cssUrlValue(css, ident.next, fnEnd))) {
            replacements.push({ start: p, end: fnEnd, text: 'none' });
          }
          p = fnEnd;
        } else if (ident.value === 'image-set' || ident.value === '-webkit-image-set' || ident.value === 'image') {
          if (bodyHasRemoteUrl(css, ident.next, fnEnd)) replacements.push({ start: p, end: fnEnd, text: 'none' });
          p = fnEnd;
        } else {
          // Walk the body of any other function: `var(--bg, url(...))` only fetches its fallback,
          // and a scanner that skipped the body would leave that reference in the document.
          p = ident.next + 1;
        }
        continue;
      }
      p = ident.next > p ? ident.next : p + 1;
      continue;
    }
    p += 1;
  }

  if (replacements.length === 0) return css;
  let cleaned = css;
  for (let i = replacements.length - 1; i >= 0; i -= 1) {
    const { start, end, text } = replacements[i];
    cleaned = cleaned.slice(0, start) + text + cleaned.slice(end);
  }
  return cleaned;
}

/** Drops `attr` when it carries a reference that can reach the network. */
function stripRemoteAttr(el: Element, attr: string): void {
  const value = el.getAttribute(attr);
  if (!value) return;
  // `ping` is a whitespace-separated list, so checking the whole value would let
  // `ping="/local https://remote"` through on the strength of its first token.
  if (attr === 'ping') {
    if (value.split(/\s+/).some(target => target && !isLocalUrl(target))) el.removeAttribute(attr);
    return;
  }
  if (!isLocalUrl(value)) el.removeAttribute(attr);
}

/**
 * Attributes that accept a CSS value on any element. SVG presentation attributes are the reason
 * this pass exists: `fill="url(https://…)"` is a paint-server reference, not a `src`.
 *
 * The `style` attribute and anything whose value *starts* like a CSS function are scanned too, so
 * an unknown presentation attribute written as `url(...)` is still reached.
 */
const CSS_VALUE_ATTRS = new Set([
  'style',
  'fill',
  'stroke',
  'filter',
  'clip-path',
  'mask',
  'marker',
  'marker-start',
  'marker-mid',
  'marker-end',
  'cursor',
  'background',
  'color-profile',
]);

function shouldScanAttribute(name: string, value: string): boolean {
  return CSS_VALUE_ATTRS.has(name) || /^\s*(?:url|image-set|-webkit-image-set|image)\s*\(/i.test(value);
}

function stripElement(el: Element): void {
  const tag = el.tagName.toLowerCase();

  if (tag === 'meta' && (el.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') {
    el.remove();
    return;
  }

  if (ANIMATION_TAGS.has(tag)) {
    el.remove();
    return;
  }

  // Two passes rather than one concatenated array: this runs once per element of a document that can
  // hold hundreds of thousands of them, and the spread would allocate on every one just to append a
  // single attribute name.
  for (const attr of SUBRESOURCE_ATTRS[tag] ?? []) stripRemoteAttr(el, attr);
  for (const attr of GLOBAL_SUBRESOURCE_ATTRS) stripRemoteAttr(el, attr);

  if (el.hasAttribute('srcdoc')) el.removeAttribute('srcdoc');

  const srcset = el.getAttribute('srcset');
  if (srcset) {
    const cleaned = stripRemoteSrcset(srcset);
    if (cleaned) el.setAttribute('srcset', cleaned);
    else el.removeAttribute('srcset');
  }

  for (const attr of Array.from(el.attributes)) {
    if (!shouldScanAttribute(attr.name, attr.value)) continue;
    const cleaned = stripRemoteCss(attr.value);
    if (cleaned === attr.value) continue;
    if (cleaned) el.setAttribute(attr.name, cleaned);
    else el.removeAttribute(attr.name);
  }

  if (tag === 'style' && el.textContent) {
    el.textContent = stripRemoteCss(el.textContent);
  }
}

/**
 * Returns the given HTML (whole document or fragment) with every network-reachable
 * resource reference removed: subresource attributes (per-tag, plus `background` / `ping`
 * on any element), srcset candidates, `<base>`, meta-refresh, `srcdoc`, animation elements,
 * remote `url()` / `image-set()` / `@import` in styles and presentation attributes, and
 * remote SVG image hrefs.
 *
 * Uses `DOMParser`, which is inert — parsing never loads resources or runs scripts —
 * and preserves the leading doctype so standards-mode rendering is unchanged.
 */
export function stripRemoteResources(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  while (walker.nextNode()) elements.push(walker.currentNode as Element);
  for (const el of elements) stripElement(el);

  const doctype = /^\s*(<!doctype[^>]*>)/i.exec(html)?.[1] ?? '';
  return doctype + doc.documentElement.outerHTML;
}
