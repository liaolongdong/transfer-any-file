import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertContext, ConvertResult } from '~/utils/core/types';
import { throwIfAborted } from '~/utils/core/abort';
import { escapeHtml, escapeAttr, documentTitle } from '~/utils/core/html-document';

interface LinkRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  url: string;
}

/**
 * Locate the link annotation covering a text item's origin.
 *
 * `annotation.rect` arrives already normalized: pdf.js runs every annotation rect through
 * `Util.normalizeRect`, which swaps the y pair when needed, so `rect[1] <= rect[3]` holds for any
 * input PDF regardless of how its `/Rect` was written. Both coordinates are PDF user space with the
 * y axis pointing up, the same space `textContent` items report their baseline in. The comparison
 * below was the other way round, which made the test unsatisfiable for every non-degenerate
 * annotation and silently dropped every hyperlink on this route.
 */
function findLinkForPosition(x: number, y: number, links: LinkRect[]): string | null {
  for (const link of links) {
    if (x >= link.x1 && x <= link.x2 && y >= link.y1 && y <= link.y2) {
      return link.url;
    }
  }
  return null;
}

/**
 * Scheme allowlist for PDF link annotations.
 *
 * `annotation.url` is attacker-controlled text from the PDF; escaping alone would still ship a
 * `javascript:` or `data:` href in the downloaded HTML, executable the moment a reader clicks it.
 */
const SAFE_LINK_SCHEME = /^(?:https?:|mailto:|tel:)/i;

/**
 * One flattened bookmark: how deep it sat in the outline tree, the line it should light up, and the
 * page its destination resolves to (`null` when it does not resolve, or when the destination is a
 * name rather than an explicit reference).
 */
interface Bookmark {
  depth: number;
  key: string;
  pageNumber: number | null;
  consumed: boolean;
}

/**
 * Outline depth is clamped because the mapping is `depth + 1` onto `h1`–`h6`; a seventh level would
 * either wrap to `h7` (which has no meaning and no style) or need a rule nobody asked for.
 */
const MAX_BOOKMARK_DEPTH = 5;

/**
 * Code points, because a title truncated in the middle of a surrogate pair leaves a lone half — and
 * a lone half can never equal a normalized line, so the bookmark would silently stop matching.
 */
const MAX_KEY_CHARS = 120;

/**
 * Canonicalize a line and a bookmark title into the same key so they can be compared exactly.
 *
 * Whitespace collapses to one space, a trailing dot leader (`…` or `. . .`) and the page number behind
 * it are dropped because Word writes them into the outline title while the body line does not carry
 * them, and the whole thing is lowercased. No prefix matching: a bookmark that does not equal a line
 * lights up nothing, because an invented heading is worse than a missing one.
 */
function outlineKey(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  const noLeader = collapsed.replace(/(?:\s*[.。…])+(?:\s*\d+)?\s*$/, '');
  const lowered = noLeader.toLowerCase();
  const chars = Array.from(lowered);
  return chars.length > MAX_KEY_CHARS ? chars.slice(0, MAX_KEY_CHARS).join('') : lowered;
}

/**
 * The outline node as this converter needs it.
 *
 * `getOutline()`'s declared type elides `items` to an untyped array, so the tree is walked through
 * this structural shape — the same idiom the text loop below uses for `textContent.items` — and every
 * field is read as `unknown` because the values come out of a document the user dropped in.
 */
interface OutlineNodeLike {
  title: unknown;
  dest: unknown;
  url: unknown;
  items: unknown;
}

/** A `{num, gen}` page reference — the shape `getPageIndex` expects (pdf.js calls it `RefProxy`). */
interface PageRef {
  num: number;
  gen: number;
}

/** A destination is only usable as a page lookup when it carries both halves of the reference. */
function isPageRef(value: unknown): value is PageRef {
  if (typeof value !== 'object' || value === null) return false;
  const ref = value as Record<string, unknown>;
  return typeof ref.num === 'number' && typeof ref.gen === 'number';
}

/**
 * Flatten the outline tree into pre-order bookmarks.
 *
 * `getOutline()` hands back plain objects: `title` is `""` when the dictionary value is not a string,
 * `dest` is an array whose first element is a `{num, gen}` reference for an explicit target and a
 * string for a named one, `url` is set for a bookmark that jumps outside the document. `getPageIndex`
 * throws on anything that is not a reference, so every page lookup here is guarded — a bookmark whose
 * page cannot be resolved degrades to whole-document matching instead of being dropped, because its
 * title is still the document's own heading text.
 */
async function readOutline(pdf: PDFDocumentProxy): Promise<Bookmark[]> {
  const bookmarks: Bookmark[] = [];

  async function walk(nodes: OutlineNodeLike[], depth: number): Promise<void> {
    for (const node of nodes) {
      const title = typeof node.title === 'string' ? node.title.trim() : '';
      const isLink = typeof node.url === 'string' && node.url.length > 0;
      if (title && !isLink && depth <= MAX_BOOKMARK_DEPTH) {
        let pageNumber: number | null = null;
        const dest = node.dest;
        if (Array.isArray(dest) && isPageRef(dest[0])) {
          try {
            pageNumber = (await pdf.getPageIndex(dest[0])) + 1;
          } catch {
            pageNumber = null;
          }
        }
        bookmarks.push({ depth, key: outlineKey(title), pageNumber, consumed: false });
      }
      const children = node.items;
      if (Array.isArray(children) && children.length > 0 && depth < MAX_BOOKMARK_DEPTH) {
        await walk(children as OutlineNodeLike[], depth + 1);
      }
    }
  }

  // A damaged `/Outlines` tree resolves to nothing here rather than failing the conversion: the
  // outline is a bonus on top of the text extraction, and `getOutline()` is also the only call in this
  // function that a malformed catalog dictionary can reject from.
  const outline = (await pdf.getOutline().catch(() => null)) as OutlineNodeLike[] | null;
  if (!outline) return bookmarks;
  await walk(outline, 0);
  return bookmarks;
}

/**
 * Turn one extracted line into markup.
 *
 * `headingLevel` comes from the document's outline when a bookmark title matches this line exactly;
 * `0` means "no bookmark", and the all-caps heuristic below is then the only thing that can promote a
 * line — which is the whole behaviour of a PDF that has no outline, unchanged.
 */
function lineToHtml(segments: Array<{ text: string; url: string | null }>, headingLevel = 0): string {
  const fullText = segments.map(s => s.text).join('');
  const trimmed = fullText.trim();
  if (!trimmed) return '';

  const isHeading = trimmed.length < 80 && /[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase();

  let inner = '';
  for (const seg of segments) {
    const escaped = escapeHtml(seg.text);
    if (seg.url) {
      inner += `<a href="${escapeAttr(seg.url)}">${escaped}</a>`;
    } else {
      inner += escaped;
    }
  }

  if (headingLevel > 0) return `<h${headingLevel}>${inner}</h${headingLevel}>\n`;
  return isHeading ? `<h2>${inner}</h2>\n` : `<p>${inner}</p>\n`;
}

const pdfToHtmlConverter: Converter = {
  from: FileFormat.PDF,
  to: FileFormat.HTML,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    const arrayBuffer = await input.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    // Parse failures get their own key rather than the library's raw `InvalidPDFException`
    // string (same reasoning as `pdf-to-image`): a corrupt PDF is not a render problem.
    let pdf: Awaited<typeof loadingTask.promise>;
    try {
      pdf = await loadingTask.promise;
    } catch (error) {
      await loadingTask.destroy();
      if (ctx?.signal?.aborted) throw new Error('errors.cancelled', { cause: error });
      throw new Error('errors.pdfParse', { cause: error });
    }

    // Read once per document, before the page loop: an outline is a document-level object, and a
    // damaged `/Outlines` tree must not be able to fail a page halfway through a batch.
    const bookmarks = await readOutline(pdf);
    // The fallback bucket for bookmarks whose destination did not resolve: they may light up the
    // first exact line match anywhere in the document, but only after every page-local candidate had
    // its chance, so a bookmark that does know its page can never be stolen by another page's line.
    const unmatched = bookmarks.filter(bookmark => bookmark.pageNumber === null);
    /** Take the unconsumed bookmark for this page whose title equals this line, as its heading level. */
    const takeBookmark = (pageNum: number, rawLine: string): number => {
      const key = outlineKey(rawLine);
      if (!key) return 0;
      for (const bookmark of bookmarks) {
        if (!bookmark.consumed && bookmark.pageNumber === pageNum && bookmark.key === key) {
          bookmark.consumed = true;
          return bookmark.depth + 1;
        }
      }
      for (const bookmark of unmatched) {
        if (!bookmark.consumed && bookmark.key === key) {
          bookmark.consumed = true;
          return bookmark.depth + 1;
        }
      }
      return 0;
    };

    let htmlContent = '';

    try {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // Extraction on a long PDF is the slow part of this converter, so cancellation can only
        // take effect from inside the loop.
        throwIfAborted(ctx?.signal);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const annotations = await page.getAnnotations();
        const links: LinkRect[] = [];
        for (const annotation of annotations) {
          if (annotation.subtype === 'Link' && annotation.url && SAFE_LINK_SCHEME.test(annotation.url)) {
            const rect = annotation.rect;
            if (rect && rect.length === 4) {
              links.push({
                x1: rect[0],
                y1: rect[1],
                x2: rect[2],
                y2: rect[3],
                url: annotation.url,
              });
            }
          }
        }

        let pageHtml = '';
        let lineSegments: Array<{ text: string; url: string | null }> = [];
        let lastX: number | null = null;
        let lastWidth = 0;
        let lastY: number | null = null;

        const flushLine = (): void => {
          if (lineSegments.some(s => s.text.trim())) {
            pageHtml += lineToHtml(lineSegments, takeBookmark(pageNum, lineSegments.map(s => s.text).join('')));
          }
          lineSegments = [];
        };

        for (const item of textContent.items) {
          if (!('str' in item)) continue;
          const textItem = item as { str: string; transform: number[]; width?: number; hasEOL?: boolean };
          const x = textItem.transform[4];
          const y = textItem.transform[5];

          if (lastY !== null && Math.abs(y - lastY) > 5) {
            flushLine();
          } else if (
            lineSegments.length > 0 &&
            lastX !== null &&
            x > lastX + lastWidth + 0.3 &&
            !lineSegments[lineSegments.length - 1].text.endsWith(' ') &&
            !textItem.str.startsWith(' ')
          ) {
            lineSegments.push({ text: ' ', url: null });
          }

          const linkUrl = links.length > 0 ? findLinkForPosition(x, y, links) : null;
          lineSegments.push({ text: textItem.str, url: linkUrl });

          if (textItem.hasEOL) {
            flushLine();
            lastX = null;
            lastWidth = 0;
            lastY = null;
            continue;
          }
          lastX = x;
          lastWidth = textItem.width ?? 0;
          lastY = y;
        }

        flushLine();

        if (pageNum < pdf.numPages) {
          pageHtml += `<hr style="page-break-after: always;" />\n`;
        }

        htmlContent += pageHtml;
        // Releases the fonts/images pdf.js caches per page; if the loop aborts mid-page the
        // `destroy()` below covers it.
        page.cleanup();
      }
    } finally {
      await loadingTask.destroy();
    }

    // No `lang` on the root: the extracted text is in whatever language the document is, and
    // `lang="en"` was a claim screen readers act on. Title = the user's own file name, same as
    // `wrapHtmlDocument` (this route builds its own shell because of the per-page layout below).
    const title = escapeHtml(documentTitle(ctx?.source?.name));
    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin: 0.5em 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html' });
    return { blob, filename: 'converted.html' };
  },
};

export default pdfToHtmlConverter;
