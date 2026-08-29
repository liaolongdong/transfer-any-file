import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { DOCUMENT_CSS } from '~/utils/converters/md-to-html';
import { decodeTextBlob } from '~/utils/core/text-decode';

const txtToHtmlConverter: Converter = {
  from: FileFormat.TXT,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.unknown');
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>${DOCUMENT_CSS}</style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    return { blob, filename: 'converted.html' };
  },
};

const txtToMdConverter: Converter = {
  from: FileFormat.TXT,
  to: FileFormat.MD,

  async convert(input: Blob): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.unknown');
    // Wrap in a code block to preserve formatting; extend the fence when
    // the content itself contains backtick runs
    const runs = text.match(/`{3,}/g);
    const fenceLen = runs ? Math.max(...runs.map(s => s.length)) + 1 : 3;
    const fence = '`'.repeat(fenceLen);
    const md = `${fence}\n${text}\n${fence}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    return { blob, filename: 'converted.md' };
  },
};

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
  'ul',
  'ol',
  'table',
  'section',
  'article',
  'header',
  'footer',
  'blockquote',
  'pre',
]);

/** Recursively extract readable text, mapping block elements to line breaks */
function extractText(node: Node): string {
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
  let text = '';
  for (const child of Array.from(el.childNodes)) {
    text += extractText(child);
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
    const html = await input.text();
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
