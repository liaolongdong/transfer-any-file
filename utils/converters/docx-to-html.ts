import type { Config as SanitizeConfig } from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult, ConvertContext } from '~/utils/core/types';
import { wrapHtmlDocument } from '~/utils/core/html-document';
import { stripRemoteResources } from '~/utils/core/html-sanitize';
import { extractAltChunkHtml } from '~/utils/core/alt-chunk';

const SANITIZE_OPTIONS: SanitizeConfig = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target'],
};

const docxToHtmlConverter: Converter = {
  from: FileFormat.DOCX,
  to: FileFormat.HTML,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    const [mammothModule, purifyModule] = await Promise.all([import('mammoth'), import('dompurify')]);
    const mammoth = mammothModule.default;
    const DOMPurify = purifyModule.default;

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
            'ul => ul:fresh',
            'ol => ol:fresh',
            'li => li:fresh',
          ],
          convertImage: mammoth.images.imgElement(async image => {
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
        const altHtml = await extractAltChunkHtml(new Uint8Array(arrayBuffer));
        if (altHtml) {
          const altDoc = new DOMParser().parseFromString(altHtml, 'text/html');
          htmlBody = DOMPurify.sanitize(altDoc.body?.innerHTML ?? '', SANITIZE_OPTIONS) as string;
        }
      }
    } catch (error) {
      throw new Error('errors.docxParse', { cause: error });
    }

    // Outside the catch on purpose: an empty result after both passes (Mammoth + altChunk
    // recovery) means the document genuinely has no convertible content, which is a different
    // report from a parse failure — and different from the old silent blank HTML.
    if (!htmlBody.trim()) throw new Error('errors.docxEmpty');

    // The same rule `html-to-docx.ts` applies in reverse, and for the same reason: this document is
    // opened by the user, so a reference left in it becomes a request their browser issues.
    //
    // Mammoth's own pass cannot produce one — `convertImage` above reads every embedded picture into a
    // `data:` URI, and an `<a href>` is content rather than a subresource — but the altChunk recovery
    // pass hands over markup this extension never wrote. Measured: a `.docx` whose `afchunk.mht` holds
    // `<img src="http://host/x.png">` produced a `.html` that fetched that URL on open. Sanitizing is
    // not enough here, because DOMPurify's job is executable markup and it keeps remote URLs by design.
    const wrapped = wrapHtmlDocument(htmlBody, { sourceName: ctx?.source?.name });
    const stripped = stripRemoteResources(await wrapped.text());
    return { blob: new Blob([stripped], { type: 'text/html' }), filename: 'converted.html' };
  },
};

export default docxToHtmlConverter;
