import { FileFormat } from '~/utils/core/types';

/** Byte count to a one-decimal label. Domain is a non-negative size — negative input makes
 *  `Math.log` return NaN, so callers reading numbers from storage clamp first (see
 *  `normalizeRecord` in `~/composables/useHistory`). The table tops out at PB and the index is
 *  clamped to it: an unclamped index reads past the end and renders `4.5 undefined`, which is what
 *  a stored `fileSize` of 1e15 used to show in the history trend chart. */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/** Formats that can be safely read as text and copied to the clipboard. */
export const TEXT_FORMATS = new Set<FileFormat>([
  FileFormat.MD,
  FileFormat.HTML,
  FileFormat.TXT,
  FileFormat.CSV,
  FileFormat.JSON,
]);

/** Extensions whose bytes deflate actually shrinks. Read against what this app can write: of the
 *  eleven targets, the eight that are not containers (`txt` / `csv` / `json` / `html` / `md` / `png`
 *  / `jpg` / `webp`) are all in here, and the three that carry bytes their own encoders already
 *  packed (`pdf` / `xlsx` / `docx`) are deliberately not — see the caveat at the bottom. `htm`,
 *  `svg` and `xml` finish out the recognised-text group; none of the three is a target this build
 *  can produce.
 *
 *  Text, from the run that first set this table: 7 MB of CSV alongside 6 MB of incompressible data,
 *  storing every entry gave a 13.28 MB archive in 56 ms, deflating every entry gave 7.04 MB in
 *  1169 ms — the whole win came from the text entry (~10× smaller).
 *
 *  Images were left out on the belief that deflate has nothing to take there. Two measurements say
 *  otherwise. Both are packed the way `downloadAllZip` packs (fflate `Zip` with `ZipDeflate({ level:
 *  6 })` per entry vs `ZipPassThrough`), and the percentage is the deflated archive against the
 *  stored one for the same entries:
 *  - 2026-09-25, the 12 pages of a real multi-page PDF export — `→ PNG` 39.3 % smaller, `→ JPEG`
 *    58.6 %, costing 118 ms and 60 ms for those 12 pages together (node's zlib reproduced both
 *    figures to within half a point). A high-entropy page in the same document gave 3.7 % and
 *    −0.0 %, which is the shape the old belief measured and then generalised to every image.
 *  - 2026-10-03, pages encoded through the encoder this app itself calls (`canvas.toBlob`), which
 *    separates the container from the page — a document page (1200×1800, white ground, text bars)
 *    gives PNG 49.9 %, JPEG 91.1 %, WebP 50.0 %; 100 pages of that shape pack from 5.13 MB to
 *    2.57 MB in 0.63 s; fourteen real store screenshots give 6.9 %.
 *
 *  The side where there is nothing to take is measured too, because that is what the switch is paid
 *  for: a 2400×1600 gradient-plus-grain image comes out 0.014 % larger as PNG and 0.010 % as WebP,
 *  and 0.022 % smaller as JPEG — deflate's stored-block overhead, in both directions — at about
 *  130 ms of packing per MB (10.6 MB of photographic PNG: 1.36 s). That time is not a frozen page:
 *  measured in the loaded package, the worst main-thread round trip across a 40 MB deflate was 9 ms,
 *  against 1462 ms for the same bytes compressed synchronously — the shape fflate falls back to if
 *  its inline worker ever failed to start under extension CSP. So the cost lands on the 「下载全部」
 *  loading state that already covers packaging.
 *
 *  Still stored, and deliberately: `pdf` / `xlsx` / `docx`. The argument that sank the image belief
 *  applies to them as well — the repository's fixtures deflate by 67–78 % — but those are text-heavy
 *  kilobyte files, not the image-carrying multi-megabyte outputs this app actually produces, and
 *  nothing of that shape has been measured. Until one is, the previous call stands. */
const ZIP_COMPRESSIBLE_EXT = new Set(['txt', 'csv', 'json', 'html', 'htm', 'md', 'svg', 'xml', 'png', 'jpg', 'webp']);

/** Decide the ZIP method per entry rather than globally, so a mixed batch pays only for
 *  the entries that benefit. Files without a recognised extension are stored — the safe
 *  default, since a wrong guess there costs nothing but a missed saving. */
export function isZipCompressible(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  return ZIP_COMPRESSIBLE_EXT.has(filename.slice(dot + 1).toLowerCase());
}

/**
 * Milliseconds to a duration label: `< 0.1 s` / `0.4 s` / `3.2 s` / `1 min 04 s`.
 *
 * Three tiers and nothing above them — a batch that runs for an hour keeps counting minutes
 * (`72 min 30 s`) because the one question this answers is "how long did this take on this
 * machine", and reading `1 h 12 m 30 s` costs more than the extra digits. Units stay Latin, exactly
 * like `formatSize`: the Chinese UI shows `8.7 MB`, so `3.2 s` is the same convention rather than an
 * untranslated leftover.
 *
 * The sub-100 ms floor is not decoration. `toFixed(1)` rounds a 30 ms batch down to `0.0 s`, and a
 * row that reads `0.0 s` is indistinguishable, on the surface, from a row that measured nothing —
 * the one reading this field must never be able to produce. `< 0.1 s` says what was actually
 * observed: it ran, and it ran faster than the smallest unit this function reports.
 *
 * Returns `''` for anything outside its domain (`NaN`, `Infinity`, negatives). Those only arrive from
 * storage — a hand-edited export or a future writer that forgot to clamp — and an empty string means
 * the caller prints nothing, which is the honest answer to "we do not know how long this took".
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const seconds = ms / 1000;
  if (seconds < 0.1) return '< 0.1 s';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds - minutes * 60);
  return `${minutes} min ${String(rest).padStart(2, '0')} s`;
}
