import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const docxToHtmlConverter: Converter = {
  from: FileFormat.DOCX,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const arrayBuffer = await input.arrayBuffer();

    let htmlBody: string;
    try {
      const sanitizeResult = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Title'] => h1.title:fresh",
            "p[style-name='Subtitle'] => h2.subtitle:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em",
            "ul => ul:fresh",
            "ol => ol:fresh",
            "li => li:fresh",
          ],
          convertImage: mammoth.images.imgElement(async (image) => {
              const buffer = await image.readAsArrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = '';
              const CHUNK = 0x8000;
              for (let i = 0; i < bytes.length; i += CHUNK) {
                binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
              }
              const base64 = btoa(binary);
              return { src: `data:${image.contentType};base64,${base64}` };
          }),
        },
      );
      htmlBody = DOMPurify.sanitize(sanitizeResult.value, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target'],
      });
    } catch (error) {
      console.error('DOCX parse failed:', error);
      throw new Error('errors.docxParse', { cause: error });
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
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.3;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    p { margin: 0.8em 0; }
    ul, ol {
      padding-left: 2em;
      margin: 0.8em 0;
    }
    li { margin: 0.3em 0; }
    strong, b { font-weight: 600; }
    em, i { font-style: italic; }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    pre {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
      line-height: 1.5;
    }
    code {
      background: #f5f5f5;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }
    pre code {
      background: none;
      padding: 0;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin-left: 0;
      padding-left: 1rem;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    hr {
      border: none;
      border-top: 1px solid #eee;
      margin: 2em 0;
    }
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

export default docxToHtmlConverter;
