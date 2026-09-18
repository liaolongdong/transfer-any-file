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
};

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
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate && isLocalUrl(candidate.split(/\s+/)[0]));
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

function stripElement(el: Element): void {
  const tag = el.tagName.toLowerCase();

  if (tag === 'meta' && (el.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') {
    el.remove();
    return;
  }

  for (const attr of SUBRESOURCE_ATTRS[tag] ?? []) {
    const value = el.getAttribute(attr);
    if (value && !isLocalUrl(value)) el.removeAttribute(attr);
  }

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
 * resource reference removed: subresource attributes, srcset candidates, `<base>`,
 * meta-refresh, remote `url()` / `@import` in styles, and remote SVG image hrefs.
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
