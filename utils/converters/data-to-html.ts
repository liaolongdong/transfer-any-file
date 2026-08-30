import * as XLSX from 'xlsx';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { DOCUMENT_CSS } from '~/utils/converters/md-to-html';

function wrapHtmlDocument(body: string): Blob {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>${DOCUMENT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
  return new Blob([html], { type: 'text/html' });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** sheet_to_html wraps output in a nested html/head/body; keep only tables */
function tablesOnly(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  if (tables.length === 0) return html;
  return Array.from(tables).map(t => t.outerHTML).join('\n');
}

function workbookToHtmlBody(workbook: XLSX.WorkBook): string {
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
    const text = await decodeTextBlob(input, 'errors.csvDecode');
    const workbook = XLSX.read(text, { type: 'string', raw: false });
    const blob = wrapHtmlDocument(workbookToHtmlBody(workbook));
    return { blob, filename: 'converted.html' };
  },
};

const xlsxToHtmlConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const buffer = await input.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: false });
    const blob = wrapHtmlDocument(workbookToHtmlBody(workbook));
    return { blob, filename: 'converted.html' };
  },
};

export { csvToHtmlConverter, xlsxToHtmlConverter };
