import type { WorkBook } from 'xlsx';
import { escapeHtml } from '~/utils/core/html-document';
import { stripRemoteResources } from '~/utils/core/html-sanitize';
import { ownSheet } from '~/utils/core/xlsx-sheets';

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
  // No `lang` on purpose. The hardcoded `lang="en"` that used to sit here was measured on the built
  // page announcing a Chinese worksheet (`sample.xlsx`: 姓名 / 部门 / 张三) as English, and `<html
  // lang>` is exactly what a screen reader picks its pronunciation from. Left undeclared, the frame
  // falls back to its container's language per HTML's inherited-language rule, and the workbench's
  // own `<html lang>` is kept in step with the UI locale by `useI18n` — the same choice
  // `PreviewDialog.vue` already makes for its markdown/HTML shell.
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${PREVIEW_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Preview conversions are pure functions of a blob's bytes, and both preview surfaces hand over the
 * same `File` object — so reopening a preview used to run mammoth over the document again for nothing.
 *
 * The value stored is what a caller renders, and `cachedPreview` applies the subresource strip to it: the
 * strip is pure too, and leaving it at the call sites meant a cache hit still re-parsed and re-serialised
 * the whole document. That is not free — 0.22 ms warm for the 2.9 KB of HTML the DOCX fixture renders
 * to, and ≈0.1 ms per KB beyond that (6.04 ms at 61 KB, 22.4 ms at 228 KB), which is more than a hit is
 * otherwise worth. Stripping is idempotent, so a caller that wraps the result again is safe but wasteful.
 *
 * One cache per renderer, keyed on the blob: a shared map would let the DOCX rendering answer an XLSX
 * request for the same object. The map stays `WeakMap`-only and evicts by being replaced wholesale — a
 * queue of keys would hold strong references to uploaded files (and through them their bytes) long after
 * the batch was cleared, which is exactly the memory this layer must not pin. That is also why these two
 * ceilings are ceilings and not counts: collecting a key drops its entry without telling them, so the worst
 * they can do is reset the map one request early. The reset happens *before* storing because evicting
 * afterwards would throw away the very entry that overflowed, leaving a cache that answers the next open with
 * a recomputation. A rejection is likewise undone only in the map it was written to, since that map may
 * already have been replaced; it is never kept, because a failure is not a fact about the bytes and pinning
 * one would leave that file for ever without a preview.
 */
const PREVIEW_CACHE_LIMIT = 8;

/**
 * A second ceiling, because the count bounds how many previews are remembered and not how big they are: a
 * resolved `Promise<string>` retains its string, and a DOCX preview inlines every embedded picture as base64
 * (`utils/converters/docx-to-html.ts` hands mammoth an `imgElement` reader), so eight slots cap the cost at
 * eight copies of whatever the largest document renders to. Base64 is a third larger than the bytes it
 * encodes, so a document that fills the 100 MB upload limit costs ≈140 million characters per copy — a
 * footprint a count of eight cannot hold.
 *
 * Counted in UTF-16 code units — two bytes each at the worst (CJK prose), one for the base64 that dominates a
 * media-heavy rendering — and per renderer, of which there are two: the page-wide steady state is twice this
 * number. Four million sits well above the largest HTML anything here has been timed on (the 228 KB strip
 * measurement above), so the count is what binds on the ordinary path and this fires only once what is
 * remembered passes four million characters together. An entry over budget is still stored: refusing it on
 * arrival repeats the mistake the count cap already rules out, and answers the expensive case with a
 * recomputation every time. What it costs instead is the reset that follows it — the next open of a different
 * file replaces the map, so whatever was cached alongside it, and the big rendering itself on a second look,
 * are computed again. Without the ceiling, one document sets the footprint of every preview remembered after
 * it.
 *
 * Steady state, not peak: the tally is written when a rendering resolves and the ceiling is read when one
 * starts, so a burst of concurrent misses stays bounded only by the count — eight large documents opened
 * together still leave eight renderings resident. What changes is what a batch leaves behind once it stops
 * being touched, which is where a memoised preview could pin a file for the whole life of the page.
 */
const PREVIEW_CACHE_CHAR_BUDGET = 4_000_000;

function createPreviewCache() {
  let cache = new WeakMap<Blob, Promise<string>>();
  let entries = 0;
  let chars = 0;
  return function cachedPreview(blob: Blob, make: () => Promise<string>): Promise<string> {
    const seen = cache.get(blob);
    if (seen) return seen;

    if (entries >= PREVIEW_CACHE_LIMIT || chars >= PREVIEW_CACHE_CHAR_BUDGET) {
      cache = new WeakMap();
      entries = 0;
      chars = 0;
    }
    const target = cache;
    const pending = make().then(stripRemoteResources);
    target.set(blob, pending);
    entries++;

    pending.then(
      html => {
        if (target === cache) chars += html.length;
      },
      () => {
        target.delete(blob);
        if (target === cache) entries = Math.max(0, entries - 1);
      },
    );
    return pending;
  };
}

const cachedDocxPreview = createPreviewCache();
const cachedXlsxPreview = createPreviewCache();

/** Render a DOCX blob as a standalone HTML document, ready for an iframe `srcdoc` */
export async function docxToPreviewHtml(blob: Blob): Promise<string> {
  return cachedDocxPreview(blob, async () => {
    const { default: docxToHtmlConverter } = await import('~/utils/converters/docx-to-html');
    const result = await docxToHtmlConverter.convert(blob);
    return result.blob.text();
  });
}

/** Render every sheet of an XLSX/CSV workbook as HTML tables, ready for an iframe `srcdoc` */
export async function xlsxToPreviewHtml(blob: Blob): Promise<string> {
  return cachedXlsxPreview(blob, async () => {
    const [XLSX, buffer] = await Promise.all([import('xlsx'), blob.arrayBuffer()]);
    const workbook: WorkBook = XLSX.read(buffer, { type: 'array' });
    if (workbook.SheetNames.length === 0) {
      // Thrown rather than rendered as a note inside the preview document, which is what used to
      // happen — and that note was a hardcoded English literal, so no dictionary key could be
      // checked against it and a Chinese UI showed "No sheets found.". `errors.xlsxEmpty` is the key
      // the three XLSX converters already throw for this state, the dialog translates it, and the
      // preview cache drops a rejected blob instead of caching the failure.
      throw new Error('errors.xlsxEmpty');
    }

    const parts: string[] = [];
    for (const name of workbook.SheetNames) {
      const sheet = ownSheet(workbook, name);
      if (!sheet) continue;
      parts.push(`<h2>${escapeHtml(name)}</h2>`);
      parts.push(XLSX.utils.sheet_to_html(sheet, { editable: false }));
    }
    return wrapDocument(parts.join('\n'));
  });
}
