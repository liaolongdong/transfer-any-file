/**
 * Subresource stripping for untrusted HTML rendered inside the extension.
 *
 * DOMPurify removes executable markup but deliberately keeps remote URLs: a sanitized
 * `<img src="https://…">` or `<link rel="stylesheet" href="https://…">` still makes the browser
 * issue a network request when the markup is rendered (srcdoc iframes load subresources even
 * without scripts, and `html-to-image` with `cacheBust` re-fetches what it finds in the DOM).
 * For an offline-first extension that is both a privacy leak and a broken promise, so every
 * render boundary strips remote references before the markup reaches an iframe or the rasterizer.
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
 * have no row in the table to look it up in. Measured in Chrome on the exact profile
 * `html-raster` uses: after sanitize + strip, a sandboxed `srcdoc` iframe requested every
 * `background` URL it was given and none of the `src` / inline-`url()` ones.
 */
const GLOBAL_SUBRESOURCE_ATTRS = ['background'];

/** Schemes the browser resolves locally; nothing here can reach the network. */
function isLocalUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;
  const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return true; // relative — resolves against the (extension) document, never the network
  const name = scheme[1].toLowerCase();
  return name === 'data' || name === 'blob' || name === 'about';
}

function stripRemoteSrcset(value: string): string | null {
  const kept = value
    .split(',')
    .map(candidate => candidate.trim())
    .filter(candidate => candidate && isLocalUrl(candidate.split(/\s+/)[0]));
  return kept.length > 0 ? kept.join(', ') : null;
}

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'"]*?)\1\s*\)/gi;
const CSS_IMPORT_PATTERN = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s]+)\1\s*\)?[^;]*;?/gi;

/** Removes `url(...)` and `@import` references that point at the network. */
export function stripRemoteCss(css: string): string {
  return css
    .replace(CSS_URL_PATTERN, (match, _quote: string, inner: string) => (isLocalUrl(inner) ? match : 'none'))
    .replace(CSS_IMPORT_PATTERN, (match, _quote: string, inner: string) => (isLocalUrl(inner) ? match : ''));
}

/** Drops `attr` when it carries a reference that can reach the network. */
function stripRemoteAttr(el: Element, attr: string): void {
  const value = el.getAttribute(attr);
  if (value && !isLocalUrl(value)) el.removeAttribute(attr);
}

function stripElement(el: Element): void {
  const tag = el.tagName.toLowerCase();

  if (tag === 'meta' && (el.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') {
    el.remove();
    return;
  }

  // Two passes rather than one concatenated array: this runs once per element of a document that can
  // hold hundreds of thousands of them, and the spread would allocate on every one just to append a
  // single attribute name.
  for (const attr of SUBRESOURCE_ATTRS[tag] ?? []) stripRemoteAttr(el, attr);
  for (const attr of GLOBAL_SUBRESOURCE_ATTRS) stripRemoteAttr(el, attr);

  const srcset = el.getAttribute('srcset');
  if (srcset) {
    const cleaned = stripRemoteSrcset(srcset);
    if (cleaned) el.setAttribute('srcset', cleaned);
    else el.removeAttribute('srcset');
  }

  const style = el.getAttribute('style');
  if (style) {
    const cleaned = stripRemoteCss(style);
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  }

  if (tag === 'style' && el.textContent) {
    el.textContent = stripRemoteCss(el.textContent);
  }
}

/**
 * Returns the given HTML (whole document or fragment) with every network-reachable
 * resource reference removed: subresource attributes (per-tag, plus the `background`
 * attribute any element may carry), srcset candidates, `<base>`, meta-refresh,
 * remote `url()` / `@import` in styles, and remote SVG image hrefs.
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
