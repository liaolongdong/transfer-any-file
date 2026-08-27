import * as pdfjsLib from 'pdfjs-dist';
// Vite emits the worker script as a standalone asset; the returned URL is
// same-origin (chrome-extension://) so pdf.js can spawn it directly.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

function ensureWorker(): void {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }
}

const pdfToHtmlConverter: Converter = {
  from: FileFormat.PDF,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    ensureWorker();
    const arrayBuffer = await input.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    let htmlContent = '';

    try {
      const pdf = await loadingTask.promise;

      // Iterate through each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Build HTML from text items
        let pageHtml = '';
        let currentLine = '';
        let lastY: number | null = null;

        for (const item of textContent.items) {
          if ('str' in item) {
            const textItem = item as { str: string; transform: number[] };
            const y = textItem.transform[5];

            // Check if we're on a new line (Y coordinate changed significantly)
            if (lastY !== null && Math.abs(y - lastY) > 5) {
              // Process the accumulated line
              if (currentLine.trim()) {
                pageHtml += lineToHtml(currentLine);
              }
              currentLine = textItem.str;
            } else {
              // Same line, append text
              currentLine += textItem.str;
            }
            lastY = y;
          }
        }

        // Don't forget the last line
        if (currentLine.trim()) {
          pageHtml += lineToHtml(currentLine);
        }

        // Add page separator for multi-page documents
        if (pageNum < pdf.numPages) {
          pageHtml += `<hr style="page-break-after: always;" />\n`;
        }

        htmlContent += pageHtml;
      }
    } finally {
      // Release the worker-side document to avoid memory retention
      await loadingTask.destroy();
    }

    // Wrap in a complete HTML document
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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Heuristic: short ALL-CAPS Latin lines look like headings. Requires at
 * least one A-Z so caseless scripts (Chinese etc.) are never misdetected.
 */
function lineToHtml(line: string): string {
  const isHeading = line.length < 80 && /[A-Z]/.test(line) && line === line.toUpperCase();
  return isHeading ? `<h2>${escapeHtml(line)}</h2>\n` : `<p>${escapeHtml(line)}</p>\n`;
}

export default pdfToHtmlConverter;
