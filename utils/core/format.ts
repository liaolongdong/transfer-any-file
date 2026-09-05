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

/** Extensions whose bytes deflate actually shrinks: everything this extension emits is
 *  either one of these, or an already-compressed container (PNG / JPEG / WebP / PDF /
 *  XLSX / DOCX). Measured with fflate on 7 MB of CSV alongside 6 MB of incompressible
 *  data: storing every entry gave a 13.28 MB archive in 56 ms, deflating every entry
 *  gave 7.04 MB in 1169 ms. The whole win comes from the text entry (~10x smaller);
 *  on the container it is pure CPU for no gain, and can even add a few bytes. */
const ZIP_COMPRESSIBLE_EXT = new Set(['txt', 'csv', 'json', 'html', 'htm', 'md', 'svg', 'xml']);

/** Decide the ZIP method per entry rather than globally, so a mixed batch pays only for
 *  the entries that benefit. Files without a recognised extension are stored — the safe
 *  default, since a wrong guess there costs nothing but a missed saving. */
export function isZipCompressible(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  return ZIP_COMPRESSIBLE_EXT.has(filename.slice(dot + 1).toLowerCase());
}
