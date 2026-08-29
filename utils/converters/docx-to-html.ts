import mammoth from 'mammoth';
import DOMPurify, { type Config as SanitizeConfig } from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { DOCUMENT_CSS } from '~/utils/converters/md-to-html';
import { extractAltChunkHtml } from '~/utils/core/alt-chunk';

const SANITIZE_OPTIONS: SanitizeConfig = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target'],
};

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
              const blob = new Blob([buffer], { type: image.contentType });
              return new Promise<{ src: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ src: reader.result as string });
                reader.onerror = () => reject(new Error('Failed to encode image'));
                reader.readAsDataURL(blob);
              });
          }),
        },
      );
      htmlBody = DOMPurify.sanitize(sanitizeResult.value, SANITIZE_OPTIONS) as string;
      if (!htmlBody.trim()) {
        // mammoth ignores altChunk documents (html-docx-js output, including
        // this app's own HTML→DOCX results); recover the embedded MHT HTML
        const altHtml = extractAltChunkHtml(new Uint8Array(arrayBuffer));
        if (altHtml) {
          const altDoc = new DOMParser().parseFromString(altHtml, 'text/html');
          htmlBody = DOMPurify.sanitize(altDoc.body?.innerHTML ?? '', SANITIZE_OPTIONS) as string;
        }
      }
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
  <style>${DOCUMENT_CSS}</style>
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
