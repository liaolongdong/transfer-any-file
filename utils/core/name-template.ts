/**
 * The output-file-name template: what the tokens mean, and the rules that keep a user-authored
 * pattern from producing a name the OS — or a ZIP extractor — refuses.
 *
 * Download names used to be hard-coded as `<source>_<YYYYMMDD>_<HHMMSS>.<ext>`, which is the right
 * default for a downloads folder but wrong for anything that gets archived, emailed or committed:
 * every file has to be renamed by hand. This module turns that one line into a pattern while
 * keeping the built-in shape as the default value, so an untouched installation produces exactly
 * the names it always did.
 *
 * Two layers of scrubbing, both here:
 * - `sanitizeNameTemplate` runs at the storage boundary (the value is user-authored content that
 *   survives a hand-edited `chrome.storage`) and on every keystroke in the panel.
 * - `applyNameTemplate` re-scrubs the *rendered* result, because `{name}` pulls in a filename this
 *   extension did not author — an entry from a Windows-authored ZIP can carry a backslash, and a
 *   dropped or pasted name is untrusted input like any other.
 *
 * The extension is deliberately not part of the template: which suffix the bytes actually need is
 * decided by the last converter step (`containerExt`), not by the pattern, and
 * `ResultDownload` / `isZipCompressible` both read the trailing component back out of the name.
 */

/** Today's hard-coded shape, kept as the default so the feature stays invisible until asked for. */
export const DEFAULT_NAME_TEMPLATE = '{name}_{date}_{time}';

/**
 * Ceiling for a rendered base name.
 *
 * Filesystems allow roughly 255 bytes per component, but that budget is UTF-8 bytes and a CJK
 * basename spends three of them per character. 120 characters stays under the limit for any script
 * and leaves room for the extension plus the collision suffix.
 */
export const NAME_TEMPLATE_MAX_LENGTH = 120;

/** Fallback base when a template renders to nothing legal at all (`{target}` alone is fine; `***` is not). */
const ANONYMOUS_BASE = 'converted';

/**
 * Code points removed from a name: `/` and `\` (separators — a ZIP entry containing them is a
 * path-traversal hazard on extraction), `:` `*` `?` `"` `<` `>` `|` (reserved on Windows) and 0x7f.
 * Controls below 0x20 are rejected separately by range.
 */
const ILLEGAL_CODE_POINTS: ReadonlySet<number> = new Set([0x5c, 0x2f, 0x3a, 0x2a, 0x3f, 0x22, 0x3c, 0x3e, 0x7c, 0x7f]);

/** A `{token}` is recognised only in this table; anything else in braces stays literal text. */
export type NameToken = 'name' | 'date' | 'time' | 'index' | 'target';

const KNOWN_TOKENS: readonly NameToken[] = ['name', 'date', 'time', 'index', 'target'];

/** True when `token` is one this module substitutes. */
function isKnownToken(token: string): boolean {
  return (KNOWN_TOKENS as readonly string[]).includes(token);
}

/**
 * Braced placeholders in `template` that are not tokens — the typo guard.
 *
 * Unknown braces stay literal on purpose (`{tile}` becoming `{tile}` in the filename is easier to
 * diagnose than a silently dropped segment), but the panel needs to say so before the user
 * downloads fifty files that all contain a stray brace pair.
 */
export function unknownTokens(template: string): string[] {
  const found: string[] = [];
  let cursor = template.indexOf('{');
  while (cursor >= 0) {
    const end = template.indexOf('}', cursor + 1);
    if (end < 0) break;
    const token = template.slice(cursor + 1, end);
    if (token && !isKnownToken(token) && !found.includes(token)) found.push(token);
    cursor = template.indexOf('{', end + 1);
  }
  return found;
}

/** Drop characters that cannot appear in a file component, and the control range below them. */
function dropIllegal(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x20 && !ILLEGAL_CODE_POINTS.has(code)) out += char;
  }
  return out;
}

/**
 * Bring one authored string (a template, or a value substituted into one) down to a legal base name.
 *
 * Leading dots are stripped so no name starts hidden or as `.` / `..`; trailing dots and spaces go
 * too, because Windows refuses them. Nothing is *renamed* here — only what the OS would reject is
 * removed.
 */
function toLegalBase(value: string): string {
  let out = dropIllegal(value).replace(/^\.+/, '').trimEnd();
  while (out.endsWith('.') || out.endsWith(' ')) out = out.slice(0, -1);
  return out.slice(0, NAME_TEMPLATE_MAX_LENGTH);
}

function two(n: number): string {
  return String(n).padStart(2, '0');
}

/** `20260914` — local date, matching the stamp the built-in name has always used. */
export function dateStamp(date: Date): string {
  return `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}`;
}

/** `153012` — local time to the second. A date-only stamp let two batches on one day overwrite each other. */
export function timeStamp(date: Date): string {
  return `${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
}

/** What a token needs to render itself. */
export interface NameContext {
  /** Source file name, extension included; `{name}` uses the part before the last dot. */
  source: string;
  /** 1-based position within this batch, for `{index}`. */
  index: number;
  /** Output format, for `{target}`. */
  target: string;
  /** Timestamp the `{date}` / `{time}` tokens render from, chosen by the caller per rendered name. */
  date: Date;
}

/** `report.md` -> `report`; a name with no dot is already a base. */
export function baseOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

/**
 * Render `template` into a base name, without the extension.
 *
 * Every substituted value is re-scrubbed, and the result is scrubbed again as a whole, so a token
 * whose value carries a separator cannot smuggle a path into a ZIP entry. An empty result is the
 * one case that gets a name assigned rather than reported: `saveAs` with an empty name makes the
 * browser invent one from the URL, which is worse than a generic label.
 */
export function applyNameTemplate(template: string, context: NameContext): string {
  const sourceBase = toLegalBase(baseOf(context.source)) || ANONYMOUS_BASE;
  // `{name}` last on purpose: a source called `{date}.md` is legal on macOS and Linux, and if its
  // value were substituted first the following passes would expand the braces that came from the
  // file name. Rendered after them, those braces stay the literal text they are.
  let rendered = template;
  rendered = rendered.split('{date}').join(dateStamp(context.date));
  rendered = rendered.split('{time}').join(timeStamp(context.date));
  rendered = rendered.split('{index}').join(String(context.index));
  rendered = rendered.split('{target}').join(toLegalBase(context.target));
  rendered = rendered.split('{name}').join(sourceBase);
  return toLegalBase(rendered) || ANONYMOUS_BASE;
}

/**
 * Read a stored or typed template back as a legal one.
 *
 * Anything unusable (missing, non-string, blank after scrubbing) resolves to the built-in pattern
 * rather than to `''`, because an empty template would silently rename every download after the
 * extension's own suffix.
 */
export function sanitizeNameTemplate(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_NAME_TEMPLATE;
  const legal = toLegalBase(value.trim());
  return legal || DEFAULT_NAME_TEMPLATE;
}
