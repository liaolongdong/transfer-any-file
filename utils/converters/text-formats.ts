import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult, ConvertContext } from '~/utils/core/types';
import { wrapHtmlDocument } from '~/utils/core/html-document';
import { decodeTextBlob, decodeTextBlobLenient } from '~/utils/core/text-decode';

const txtToHtmlConverter: Converter = {
  from: FileFormat.TXT,
  to: FileFormat.HTML,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.unknown');
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const blob = wrapHtmlDocument(`<pre>${escaped}</pre>`, { sourceName: ctx?.source?.name });
    return { blob, filename: 'converted.html' };
  },
};

const txtToMdConverter: Converter = {
  from: FileFormat.TXT,
  to: FileFormat.MD,

  async convert(input: Blob): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.unknown');
    // Wrap in a code block to preserve formatting; extend the fence when
    // the content itself contains backtick runs. Reduced rather than spread into `Math.max`:
    // a text file of backticks yields one argument per run, and 200k of them was measured to
    // throw `RangeError: Maximum call stack size exceeded` out of a plain TXT→MD conversion.
    const runs = text.match(/`{3,}/g);
    const fenceLen = runs ? runs.reduce((max, run) => Math.max(max, run.length), 3) + 1 : 3;
    const fence = '`'.repeat(fenceLen);
    const md = `${fence}\n${text}\n${fence}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    return { blob, filename: 'converted.md' };
  },
};

// `ul` and `ol` are absent on purpose: `extractText` handles those two itself, because a list needs its
// children walked in order (numbering) rather than flattened into the generic text run.
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'tr',
  'table',
  'section',
  'article',
  'header',
  'footer',
  'blockquote',
  'pre',
]);

/**
 * Recursively extract readable text, mapping block elements to line breaks.
 *
 * `depth` is the number of enclosing list items, used to indent nested lists — plain text has no other
 * way to show that a list continues inside another.
 *
 * Ordered lists are numbered here rather than left to the reader: `1.` is generated from an `<li>`'s
 * position, so it is not a text node and the old walk dropped it, turning a numbered procedure into an
 * unordered one while keeping the newline that made it look intact. `<ul>` gets the same walk and no
 * marker, because a bullet is decoration and the line break already carries the separation. Decimal
 * numbering honours `start`, following the HTML rule that the attribute only counts when it parses to a
 * non-negative integer — `start=""` and `start="abc"` and `start="-2"` all restart at 1 rather than
 * emitting a `0.` or a `-2.` that no list actually has. `type` and `reversed` are ignored: the position
 * is the information, and neither a letter nor a roman numeral survives as anything a text file could
 * re-read.
 */
function extractText(node: Node, depth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'script' || tag === 'style' || tag === 'noscript') return '';
  if (tag === 'br') return '\n';
  if (tag === 'img') {
    const alt = el.getAttribute('alt')?.trim();
    return alt ? `[Image: ${alt}]\n` : '[Image]\n';
  }
  if (tag === 'ol' || tag === 'ul') {
    const numbered = tag === 'ol';
    const declared = el.getAttribute('start');
    const parsed = declared === null ? 1 : Number.parseInt(declared, 10);
    let index = Number.isInteger(parsed) && parsed >= 0 ? parsed : 1;
    // The leading newline is what makes a nested list its own line: written the other way, the
    // sub-list lands right after the parent item's text (`1. a  1. b`) and the indent — the only thing
    // plain text has to show continuation with — is stranded mid-line. It is gated on `depth` so a
    // top-level list keeps the separation it always had; inside an item, `depth > 0` is exactly the
    // nested case, and nothing else reaches this branch with a nonzero depth.
    let list = depth > 0 ? '\n' : '';
    // Indentation is capped, not derived: a document is free to nest lists thousands of levels deep,
    // and two spaces per level would then cost the file more leading blanks than content. Past the
    // cap the structure is still legible, because the numbers themselves keep counting.
    const indent = '  '.repeat(Math.min(depth, 6));
    for (const child of Array.from(el.children)) {
      if (child.tagName.toLowerCase() !== 'li') {
        // A list written directly inside a list (no wrapping `<li>`, which is how real documents
        // mis-nest) still has to count as a level, or every level shares one indent and numbering
        // restarts at 1 for the whole subtree.
        const childTag = child.tagName.toLowerCase();
        list += extractText(child, childTag === 'ol' || childTag === 'ul' ? depth + 1 : depth);
        continue;
      }
      list += (numbered ? `${indent}${index++}. ` : '') + extractText(child, depth + 1);
    }
    return `${list}\n`;
  }
  let text = '';
  for (const child of Array.from(el.childNodes)) {
    text += extractText(child, depth);
  }
  if (tag === 'a') {
    const href = el.getAttribute('href')?.trim();
    if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
      text += ` [${href}]`;
    }
  }
  if (tag === 'td' || tag === 'th') text += '\t';
  if (BLOCK_TAGS.has(tag)) text += '\n';
  return text;
}

const htmlToTxtConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.TXT,

  async convert(input: Blob): Promise<ConvertResult> {
    const html = await decodeTextBlobLenient(input);
    // DOMParser handles nested markup and all entities reliably,
    // unlike regex-based tag stripping
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = extractText(doc.body)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const blob = new Blob([text], { type: 'text/plain' });
    return { blob, filename: 'converted.txt' };
  },
};

const textFormatConverters: Converter[] = [txtToHtmlConverter, txtToMdConverter, htmlToTxtConverter];

export default textFormatConverters;
