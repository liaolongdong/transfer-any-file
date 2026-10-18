import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult, ConvertContext } from '~/utils/core/types';
import { wrapHtmlDocument, escapeHtml } from '~/utils/core/html-document';
import { decodeTextBlob, decodeTextBlobLenient } from '~/utils/core/text-decode';

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

/**
 * Serialize a parsed JSON value as the collapsible viewer markup.
 *
 * Iterative on purpose. The document already survived `JSON.parse`, so a recursive renderer here was
 * the second stack in the pipeline and the shallower one — a nested-enough file threw `RangeError`
 * from the renderer and reached the user as a conversion failure with the stack trace as its only
 * explanation. The work list also drops the string concatenation the recursion did at every level.
 *
 * Markup is unchanged from the recursive version: every child line, comma and `<details>` wrapper is
 * emitted in the same order, because the produced document's own CSS (`JSON_VIEWER_CSS`) selects
 * `.json-line` and `.json-group`.
 */
function renderJsonValue(root: unknown): string {
  const out: string[] = [];
  // Two task kinds are all this needs: literal markup goes straight to the output, a value is
  // expanded into the tasks around it. Children are pushed in reverse because the stack pops first
  // in, and the opening tag has to leave before the children it wraps.
  const tasks: Array<{ text: string } | { value: unknown }> = [{ value: root }];

  while (tasks.length > 0) {
    const task = tasks.pop() as { text: string } | { value: unknown };
    if ('text' in task) {
      out.push(task.text);
      continue;
    }
    const value = task.value;

    if (value === null) {
      out.push(`<span class="json-null">null</span>`);
      continue;
    }
    if (typeof value === 'string') {
      out.push(`<span class="json-string">"${escapeHtml(value)}"</span>`);
      continue;
    }
    if (typeof value === 'number') {
      out.push(`<span class="json-number">${value}</span>`);
      continue;
    }
    if (typeof value === 'boolean') {
      out.push(`<span class="json-boolean">${value}</span>`);
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        out.push(`<span class="json-bracket">[]</span>`);
        continue;
      }
      out.push(
        `<details class="json-group" open><summary><span class="json-bracket">[</span> ` +
          `<span class="json-summary">Array(${value.length})</span></summary>`,
      );
      tasks.push({ text: `<span class="json-bracket">]</span></details>` });
      for (let i = value.length - 1; i >= 0; i--) {
        tasks.push({ text: '</div>' });
        if (i < value.length - 1) tasks.push({ text: `<span class="json-comma">,</span>` });
        tasks.push({ value: value[i] });
        tasks.push({ text: `<div class="json-line">` });
      }
      continue;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        out.push(`<span class="json-bracket">{}</span>`);
        continue;
      }
      out.push(
        `<details class="json-group" open><summary><span class="json-bracket">{</span> ` +
          `<span class="json-summary">Object(${entries.length})</span></summary>`,
      );
      tasks.push({ text: `<span class="json-bracket">}</span></details>` });
      for (let i = entries.length - 1; i >= 0; i--) {
        tasks.push({ text: '</div>' });
        if (i < entries.length - 1) tasks.push({ text: `<span class="json-comma">,</span>` });
        tasks.push({ value: entries[i][1] });
        tasks.push({ text: `<div class="json-line"><span class="json-key">"${escapeHtml(entries[i][0])}"</span>: ` });
      }
      continue;
    }

    out.push(`<span>${escapeHtml(String(value))}</span>`);
  }

  return out.join('');
}

const jsonToHtmlConverter: Converter = {
  from: FileFormat.JSON,
  to: FileFormat.HTML,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.decodeFail');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('errors.jsonParse');
    }

    const body = `<div class="json-viewer">${renderJsonValue(parsed)}</div>`;
    const blob = wrapHtmlDocument(body, { sourceName: ctx?.source?.name, extraCss: JSON_VIEWER_CSS });
    return { blob, filename: 'converted.html' };
  },
};

const htmlToJsonConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.JSON,

  async convert(input: Blob): Promise<ConvertResult> {
    const html = await decodeTextBlobLenient(input);
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
      const parseTable = (table: Element): Record<string, string>[] => {
        const result: Record<string, string>[] = [];
        const headers: string[] = [];
        // A table's own rows only. `querySelectorAll('tr')` descends, so a document holding a table
        // inside a cell had its inner rows emitted as outer data rows — measured to fabricate
        // `{"a":"x","b":"y"}` entries out of a nested table's markup. `:scope > …` covers both the
        // authored form and the one the parser rewrites `<tr>` children into (it inserts a `tbody`).
        const ownRows = (root: Element): Element[] =>
          Array.from(
            root.querySelectorAll(':scope > tr, :scope > tbody > tr, :scope > thead > tr, :scope > tfoot > tr'),
          );
        // Same reasoning for cells, and `th` belongs in the list: a row of `<th>苹果</th><td>3</td>`
        // read with `td` alone shifted every value one column left and dropped the row label.
        const ownCells = (row: Element): Element[] => Array.from(row.querySelectorAll(':scope > th, :scope > td'));

        const rows = ownRows(table);
        const first = rows[0];
        if (first) {
          ownCells(first).forEach(cell => {
            headers.push(cell.textContent?.trim() ?? '');
          });
        }
        for (let i = 1; i < rows.length; i++) {
          const obj: Record<string, string> = {};
          ownCells(rows[i]).forEach((cell, j) => {
            if (j < headers.length) {
              obj[headers[j]] = cell.textContent?.trim() ?? '';
            }
          });
          if (Object.keys(obj).length > 0) result.push(obj);
        }
        return result;
      };

      if (tables.length === 1) {
        const result = parseTable(tables[0]);
        if (result.length > 0) {
          const jsonStr = JSON.stringify(result, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          return { blob, filename: 'converted.json' };
        }
      } else {
        const sheets: Record<string, Record<string, string>[]> = {};
        const headings = doc.querySelectorAll('h2');
        tables.forEach((table, idx) => {
          const name = headings[idx]?.textContent?.trim() || `Sheet${idx + 1}`;
          const rows = parseTable(table);
          if (rows.length > 0) sheets[name] = rows;
        });
        if (Object.keys(sheets).length > 0) {
          const jsonStr = JSON.stringify(sheets, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          return { blob, filename: 'converted.json' };
        }
      }
    }

    const pre = doc.querySelector('pre');
    const code = doc.querySelector('code');
    const textContent = pre?.textContent ?? code?.textContent ?? doc.body?.textContent ?? '';
    const trimmed = textContent.trim();

    try {
      const parsed = JSON.parse(trimmed);
      const formatted = JSON.stringify(parsed, null, 2);
      const blob = new Blob([formatted], { type: 'application/json' });
      return { blob, filename: 'converted.json' };
    } catch {
      throw new Error('errors.htmlToJson');
    }
  },
};

export { jsonToHtmlConverter, htmlToJsonConverter };
