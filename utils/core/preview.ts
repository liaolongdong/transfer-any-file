import type { WorkBook } from 'xlsx';
import { escapeHtml } from '~/utils/core/html-document';
import { stripRemoteResources } from '~/utils/core/html-sanitize';

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
 * the batch was cleared, which is exactly the memory this layer must not pin. So `entries` has to count
 * the live map exactly, which means evicting *before* storing: dropping the map afterwards would throw
 * away the very request that overflowed, leaving a full cache that answers the next open with a
 * recomputation. A rejection is likewise undone only in the map it was written to, since that map may
 * already have been replaced; it is never kept, because a failure is not a fact about the bytes and
 * pinning one would leave that file for ever without a preview.
 */
const PREVIEW_CACHE_LIMIT = 8;

function createPreviewCache() {
  let cache = new WeakMap<Blob, Promise<string>>();
  let entries = 0;
  return function cachedPreview(blob: Blob, make: () => Promise<string>): Promise<string> {
    const seen = cache.get(blob);
    if (seen) return seen;

    if (entries >= PREVIEW_CACHE_LIMIT) {
      cache = new WeakMap();
      entries = 0;
    }
    const target = cache;
    const pending = make().then(stripRemoteResources);
    target.set(blob, pending);
    entries++;

    pending.catch(() => {
      target.delete(blob);
      if (target === cache) entries = Math.max(0, entries - 1);
    });
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
  });
}
