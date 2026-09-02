import type { WorkBook } from 'xlsx';
import { escapeHtml } from '~/utils/core/html-document';

const PREVIEW_CSS = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    max-width: 860px;
    margin: 0 auto;
    padding: 24px;
    line-height: 1.6;
    color: #1f2937;
    word-wrap: break-word;
  }
  h2 { font-size: 15px; margin: 24px 0 8px; color: #111827; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 24px; font-size: 13px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  img { max-width: 100%; height: auto; }
`;

function wrapDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${PREVIEW_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** Render a DOCX blob as a standalone HTML document (for iframe srcdoc) */
export async function docxToPreviewHtml(blob: Blob): Promise<string> {
  const { default: docxToHtmlConverter } = await import('~/utils/converters/docx-to-html');
  const result = await docxToHtmlConverter.convert(blob);
  return result.blob.text();
}

/** Render every sheet of an XLSX/CSV workbook as HTML tables */
export async function xlsxToPreviewHtml(blob: Blob): Promise<string> {
  const [XLSX, buffer] = await Promise.all([import('xlsx'), blob.arrayBuffer()]);
  const workbook: WorkBook = XLSX.read(buffer, { type: 'array' });
  if (workbook.SheetNames.length === 0) {
    return wrapDocument('<p>No sheets found.</p>');
  }

  const parts: string[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    parts.push(`<h2>${escapeHtml(name)}</h2>`);
    parts.push(XLSX.utils.sheet_to_html(sheet, { editable: false }));
  }
  return wrapDocument(parts.join('\n'));
}
