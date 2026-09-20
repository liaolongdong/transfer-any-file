import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';
import { replaceInlineSvgWithPng } from '~/utils/core/svg-embed';

/**
 * Serialize a `<table>` as a GFM pipe table.
 *
 * Turndown's default rules drop table content silently, and tabular data — the payload of
 * CSV/XLSX/JSON→HTML round-trips — is exactly what must survive. The whole table is handled in
 * one rule so `tr`/`td` children never need to coordinate row state; cell text is flattened,
 * which loses inline markdown inside cells but keeps every value readable.
 */
function tableToMarkdown(table: HTMLTableElement): string {
  const escapeCell = (cell: Element): string =>
    (cell.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const grid = Array.from(table.rows).map(row => Array.from(row.cells).map(escapeCell));
  const columns = Math.max(0, ...grid.map(cells => cells.length));
  if (columns === 0) return '';
  const line = (cells: string[]) => `| ${cells.join(' | ')} |\n`;
  // Ragged rows are legal HTML but break GFM rendering; short rows pad, the header row defines the count.
  const rows = grid.map(cells => line([...cells, ...Array<string>(columns - cells.length).fill('')]));
  const separator = line(Array.from({ length: columns }, () => '---'));
  const [header, ...body] = rows;
  return `\n${header}${separator}${body.join('')}\n`;
}

const htmlToMdConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.MD,

  async convert(input: Blob): Promise<ConvertResult> {
    const { default: TurndownService } = await import('turndown');
    // Turndown has no rule for an inline `<svg>`: the whole subtree collapsed to its `<text>` nodes,
    // so SVG→Markdown used to hand back a file with the diagram missing. Rasterizing first turns it
    // into an `<img>`, which the rule below already keeps as `![alt](src)`.
    const html = await replaceInlineSvgWithPng(await decodeTextBlobLenient(input));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const bodyHtml = doc.body?.innerHTML ?? html;

    // Images are kept as ![alt](src) so image/docx→MD outputs preserve
    // content instead of coming out empty.
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    turndown.addRule('gfmTable', {
      // Nested tables are serialized as plain text inside their outer row already — only the
      // outermost `<table>` gets the rule, or the inner content would be counted twice.
      filter: (node): boolean => node.nodeName === 'TABLE' && node.parentElement?.nodeName !== 'TABLE',
      replacement: (_content, node) => tableToMarkdown(node as HTMLTableElement),
    });
    const markdown = turndown.turndown(bodyHtml);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    return { blob, filename: 'converted.md' };
  },
};

export default htmlToMdConverter;
