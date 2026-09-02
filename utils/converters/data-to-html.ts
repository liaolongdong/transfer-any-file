import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { wrapHtmlDocument, escapeHtml } from '~/utils/core/html-document';
import type { WorkBook } from 'xlsx';

/** sheet_to_html wraps output in a nested html/head/body; keep only tables */
function tablesOnly(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (tables.length === 0) return html;
  return Array.from(tables).map(t => t.outerHTML).join('\n');
}

function workbookToHtmlBody(XLSX: typeof import('xlsx'), workbook: WorkBook): string {
  const parts: string[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    if (workbook.SheetNames.length > 1) {
      parts.push(`<h2>${escapeHtml(name)}</h2>`);
    }
    // Use editable: false to preserve formatting, and the sheet already has formatted values from raw:false
    parts.push(tablesOnly(XLSX.utils.sheet_to_html(sheet, { editable: false })));
  }
  if (parts.length === 0) throw new Error('errors.xlsxEmpty');
  return parts.join('\n');
}

/** CSV → HTML bridges the data cluster into all document formats */
const csvToHtmlConverter: Converter = {
  from: FileFormat.CSV,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.csvDecode')]);
    const workbook = XLSX.read(text, { type: 'string', raw: false });
    const blob = wrapHtmlDocument(workbookToHtmlBody(XLSX, workbook));
    return { blob, filename: 'converted.html' };
  },
};

const xlsxToHtmlConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, buffer] = await Promise.all([import('xlsx'), input.arrayBuffer()]);
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const blob = wrapHtmlDocument(workbookToHtmlBody(XLSX, workbook));
    return { blob, filename: 'converted.html' };
  },
};

export { csvToHtmlConverter, xlsxToHtmlConverter };
