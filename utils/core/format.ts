import { FileFormat } from '~/utils/core/types';

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
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

/** Extensions whose bytes deflate actually shrinks. Measured with fflate on 7 MB of CSV
 *  alongside 6 MB of incompressible data: storing every entry gave a 13.28 MB archive in
 *  56 ms, deflating every entry gave 7.04 MB in 1169 ms — the whole win comes from the
 *  text entry (~10x smaller).
 *
 *  Images were left out on the belief that deflate has nothing to take there. It has:
 *  level 6 over the 12 pages of a multi-page PDF export came out 39.3 % smaller for
 *  `→ PNG` and 58.6 % for `→ JPEG`, costing 118 ms and 60 ms for those 12 pages together
 *  (node's zlib reproduces both figures to within half a point). The gain tracks the
 *  page, not the container — a high-entropy page gave 3.7 % (PNG) and −0.0 % (JPEG), and
 *  that is the shape the previous record measured and then generalised to every image.
 *  `webp` is unmeasured. Document pages are mostly uniform, so on the exports that grow
 *  to 100 pages this set is costing the user roughly 40 % of the download.
 *
 *  `png` / `jpg` are still absent, because moving them is one change with three carriers:
 *  this set is the single switch deciding which entries `useConversion` hands to
 *  `ZipDeflate`, and two outward sentences describe the current answer (README's
 *  "already-compressed targets are stored as-is", CHANGELOG's per-entry bullet). */
const ZIP_COMPRESSIBLE_EXT = new Set(['txt', 'csv', 'json', 'html', 'htm', 'md', 'svg', 'xml']);

/** Decide the ZIP method per entry rather than globally, so a mixed batch pays only for
 *  the entries that benefit. Files without a recognised extension are stored — the safe
 *  default, since a wrong guess there costs nothing but a missed saving. */
export function isZipCompressible(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  return ZIP_COMPRESSIBLE_EXT.has(filename.slice(dot + 1).toLowerCase());
}
