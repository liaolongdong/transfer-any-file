import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { wrapHtmlDocument, escapeHtml } from '~/utils/core/html-document';
import { normalizeDateCells, XLSX_TEXT_DATE_FORMAT } from '~/utils/core/csv-guard';
import type { WorkBook } from 'xlsx';

/** sheet_to_html wraps output in a nested html/head/body; keep only tables */
function tablesOnly(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (tables.length === 0) return html;
  return Array.from(tables)
    .map(t => t.outerHTML)
    .join('\n');
}

async function workbookToHtmlBody(XLSX: typeof import('xlsx'), workbook: WorkBook): Promise<string> {
  const parts: string[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    if (workbook.SheetNames.length > 1) {
      parts.push(`<h2>${escapeHtml(name)}</h2>`);
    }
    // `editable: false` keeps the workbook's own cell rendering, which is what a document wants —
    // but `w` is built while parsing, so a date cell renders as `1/5/24` unless
    // {@link normalizeDateCells} has replaced it first. The read options that make that possible are
    // on the callers; `raw` is not one of them, so nothing here leans on it.
    parts.push(tablesOnly(XLSX.utils.sheet_to_html(normalizeDateCells(sheet), { editable: false })));
  }
  if (parts.length === 0) throw new Error('errors.xlsxEmpty');
  // sheet_to_html's output is structurally safe (tables only) but the cell
  // values flow in raw; sanitize once here so the wrapped document and any
  // downstream converter (DOCX/PDF/PNG) starts from trusted HTML.
  const purifyModule = await import('dompurify');
  const DOMPurify = purifyModule.default;
  return DOMPurify.sanitize(parts.join('\n'), { USE_PROFILES: { html: true } }) as string;
}

/**
 * CSV → HTML bridges the data cluster into all document formats.
 *
 * `raw: true` for the same reason csv→xlsx and csv→json read that way: without it the inferrer had
 * already turned `2024-01-05` into the serial 45296.33383101852 before this converter saw it, and
 * `sheet_to_html` then printed both — `1/5/24` as the cell's text and the raw serial in its
 * `data-v`. A CSV carries no formatting, so the field's own characters are the faithful rendering.
 */
const csvToHtmlConverter: Converter = {
  from: FileFormat.CSV,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.csvDecode')]);
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const blob = wrapHtmlDocument(await workbookToHtmlBody(XLSX, workbook));
    return { blob, filename: 'converted.html' };
  },
};

const xlsxToHtmlConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, buffer] = await Promise.all([import('xlsx'), input.arrayBuffer()]);
    // Read options shared with xlsx→csv and xlsx→json: `cellDates` flags the date cells and `dateNF`
    // decides how they are rendered, and both only take effect while parsing.
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: XLSX_TEXT_DATE_FORMAT });
    const blob = wrapHtmlDocument(await workbookToHtmlBody(XLSX, workbook));
    return { blob, filename: 'converted.html' };
  },
};

export { csvToHtmlConverter, xlsxToHtmlConverter };
