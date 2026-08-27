import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const mdToHtmlConverter: Converter = {
  from: FileFormat.MD,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const markdown = await input.text();
    // Sanitize so scripts embedded in Markdown never land in the output file
    const htmlBody = DOMPurify.sanitize(await marked(markdown), {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target'],
    });

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
    pre {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      padding: 0;
    }
    img { max-width: 100%; }
    blockquote {
      border-left: 4px solid #ddd;
      margin-left: 0;
      padding-left: 1rem;
      color: #666;
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html' });
    return { blob, filename: 'converted.html' };
  },
};

export default mdToHtmlConverter;
