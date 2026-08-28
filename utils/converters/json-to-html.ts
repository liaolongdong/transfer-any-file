import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { DOCUMENT_CSS } from '~/utils/converters/md-to-html';
import { decodeTextBlob } from '~/utils/core/text-decode';

const JSON_VIEWER_CSS = `
  .json-viewer { font-family: "SF Mono", Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; }
  .json-key { color: #881391; font-weight: 600; }
  .json-string { color: #1a7f37; }
  .json-number { color: #0550ae; }
  .json-boolean { color: #cf222e; }
  .json-null { color: #6e7781; font-style: italic; }
  .json-bracket { color: #333; font-weight: 600; }
  .json-comma { color: #666; }
  .json-summary { color: #666; font-style: italic; font-size: 12px; }
  .json-line { margin: 1px 0; }
  details.json-group { margin-left: 20px; }
  details.json-group > summary { cursor: pointer; list-style: none; display: inline; user-select: none; }
  details.json-group > summary::-webkit-details-marker { display: none; }
  details.json-group > summary::before { content: "▼"; display: inline-block; width: 14px; font-size: 10px; color: #666; transition: transform 0.15s; }
  details.json-group:not([open]) > summary::before { transform: rotate(-90deg); }
  details.json-group > summary:hover { background: #f0f0f0; border-radius: 3px; }
`;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderJsonValue(value: unknown): string {
  if (value === null) {
    return `<span class="json-null">null</span>`;
  }

  if (typeof value === 'string') {
    return `<span class="json-string">"${escapeHtml(value)}"</span>`;
  }

  if (typeof value === 'number') {
    return `<span class="json-number">${value}</span>`;
  }

  if (typeof value === 'boolean') {
    return `<span class="json-boolean">${value}</span>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `<span class="json-bracket">[]</span>`;
    const items = value
      .map((item, i) => {
        const comma = i < value.length - 1 ? `<span class="json-comma">,</span>` : '';
        return `<div class="json-line">${renderJsonValue(item)}${comma}</div>`;
      })
      .join('');
    return `<details class="json-group" open><summary><span class="json-bracket">[</span> <span class="json-summary">Array(${value.length})</span></summary>${items}<span class="json-bracket">]</span></details>`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `<span class="json-bracket">{}</span>`;
    const props = entries
      .map(([key, val], i) => {
        const comma = i < entries.length - 1 ? `<span class="json-comma">,</span>` : '';
        return `<div class="json-line"><span class="json-key">"${escapeHtml(key)}"</span>: ${renderJsonValue(val)}${comma}</div>`;
      })
      .join('');
    return `<details class="json-group" open><summary><span class="json-bracket">{</span> <span class="json-summary">Object(${entries.length})</span></summary>${props}<span class="json-bracket">}</span></details>`;
  }

  return `<span>${escapeHtml(String(value))}</span>`;
}

const jsonToHtmlConverter: Converter = {
  from: FileFormat.JSON,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.unknown');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('errors.jsonParse');
    }

    const body = `<div class="json-viewer">${renderJsonValue(parsed)}</div>`;

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JSON Document</title>
  <style>${DOCUMENT_CSS}${JSON_VIEWER_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html' });
    return { blob, filename: 'converted.html' };
  },
};

const htmlToJsonConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.JSON,

  async convert(input: Blob): Promise<ConvertResult> {
    const html = await input.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
      const result: Record<string, unknown>[] = [];
      const table = tables[0];
      const headers: string[] = [];
      const headerRow = table.querySelector('tr');
      if (headerRow) {
        headerRow.querySelectorAll('th, td').forEach(cell => {
          headers.push(cell.textContent?.trim() ?? '');
        });
      }
      const rows = table.querySelectorAll('tr');
      for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, string> = {};
        const cells = rows[i].querySelectorAll('td');
        cells.forEach((cell, j) => {
          if (j < headers.length) {
            obj[headers[j]] = cell.textContent?.trim() ?? '';
          }
        });
        if (Object.keys(obj).length > 0) result.push(obj);
      }
      if (result.length > 0) {
        const jsonStr = JSON.stringify(result, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        return { blob, filename: 'converted.json' };
      }
    }

    const pre = doc.querySelector('pre');
    const code = doc.querySelector('code');
    const textContent = pre?.textContent ?? code?.textContent ?? doc.body?.textContent ?? '';
    const trimmed = textContent.trim();

    try {
      JSON.parse(trimmed);
      const formatted = JSON.stringify(JSON.parse(trimmed), null, 2);
      const blob = new Blob([formatted], { type: 'application/json' });
      return { blob, filename: 'converted.json' };
    } catch {
      throw new Error('errors.htmlToJson');
    }
  },
};

export { jsonToHtmlConverter, htmlToJsonConverter };
