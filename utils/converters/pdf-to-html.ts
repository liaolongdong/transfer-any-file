import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

function ensureWorker(): void {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }
}

interface LinkRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  url: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function findLinkForPosition(x: number, y: number, links: LinkRect[]): string | null {
  for (const link of links) {
    if (x >= link.x1 && x <= link.x2 && y >= link.y2 && y <= link.y1) {
      return link.url;
    }
  }
  return null;
}

function lineToHtml(segments: Array<{ text: string; url: string | null }>): string {
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

  return isHeading ? `<h2>${inner}</h2>\n` : `<p>${inner}</p>\n`;
}

const pdfToHtmlConverter: Converter = {
  from: FileFormat.PDF,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    ensureWorker();
    const arrayBuffer = await input.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    let htmlContent = '';

    try {
      const pdf = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const annotations = await page.getAnnotations();
        const links: LinkRect[] = [];
        for (const annotation of annotations) {
          if (annotation.subtype === 'Link' && annotation.url) {
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
            pageHtml += lineToHtml(lineSegments);
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
      }
    } finally {
      await loadingTask.destroy();
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
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
