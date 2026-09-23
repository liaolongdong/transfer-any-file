/**
 * Pure rules behind "which pages of a PDF source should be converted".
 *
 * The value is text the user typed, and it is interpreted in two places and nowhere else: the length
 * bound is this module's boundary, and the page numbers themselves are resolved against a document
 * by {@link parsePageRange} — only the converter knows `numPages`, so only it can clamp `7` in a
 * three-page file. Splitting it this way keeps a half-typed or out-of-range spec from ever reaching
 * a render loop.
 */

/** Longest stored spec. Beyond this a "range" is a paste accident, not something worth parsing. */
export const MAX_PAGE_RANGE_SPEC = 64;

/** Separators between page tokens, including the full-width ones Chinese and Japanese IMEs emit. */
const SEPARATORS = /[,，、;；\s]+/;

/** Whitespace on either side of a dash, so `1 - 3` and `1-3` mean the same range. */
const DASH_SPACING = /\s*([-–~])\s*/g;

/** `12`, `12-15`, `12~15`, `12–15`. */
const RANGE_TOKEN = /^(\d+)(?:[-–~](\d+))?$/;

/**
 * Reduce an untrusted value (a storage payload, or what the text field just held) to a storable spec.
 *
 * Deliberately not a validity check: characters that cannot be a page token are left alone so the
 * field keeps showing what the user typed instead of wiping it under their cursor. {@link
 * parsePageRange} is where such a spec stops meaning anything.
 */
export function clampPageRangeSpec(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_PAGE_RANGE_SPEC);
}

/**
 * Expand a spec into ascending, de-duplicated page numbers clamped to `[1, total]`.
 *
 * Three outcomes, and the caller has to tell them apart:
 * - `undefined` — no selection at all, so the document converts whole. This is what every batch
 *   that never touched the control gets, and it walks exactly the pages, in the order, the loop
 *   walked before the field existed.
 * - a non-empty array — the pages to read, in document order.
 * - an empty array — a selection was made but nothing in it survives this document (`9` in a
 *   three-page PDF, or a spec of only punctuation). Failing loudly beats converting every page,
 *   which would hand the user a file they did not ask for and never mention the range they set.
 */
export function parsePageRange(spec: string | undefined, total: number): number[] | undefined {
  const clean = clampPageRangeSpec(spec);
  if (!clean) return undefined;

  const pages = new Set<number>();
  for (const token of clean.replace(DASH_SPACING, '$1').split(SEPARATORS)) {
    if (!token) continue;
    const match = RANGE_TOKEN.exec(token);
    if (!match) continue;
    const first = Number(match[1]);
    const second = match[2] === undefined ? first : Number(match[2]);
    // Reversed pairs (`15-12`) are a slip of the same hand, not a request for nothing.
    const lo = Math.max(1, Math.min(first, second));
    const hi = Math.min(total, Math.max(first, second));
    for (let page = lo; page <= hi; page++) pages.add(page);
  }

  return [...pages].sort((a, b) => a - b);
}
