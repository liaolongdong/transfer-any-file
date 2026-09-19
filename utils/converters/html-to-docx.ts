import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';
import { stripRemoteResources } from '~/utils/core/html-sanitize';

const htmlToDocxConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.DOCX,

  async convert(input: Blob): Promise<ConvertResult> {
    const [{ asBlob }, purifyModule] = await Promise.all([
      import('html-docx-js-typescript'),
      import('dompurify'),
    ]);
    const DOMPurify = purifyModule.default;

    const htmlString = await decodeTextBlobLenient(input);

    // DOMPurify keeps remote URLs by design — its job is executable markup, not egress. Here the
    // markup is not rendered by us: `asBlob` packs it into an MHT altChunk that Microsoft Word
    // fetches *on the user's machine* when they open the file. A remote <img> therefore becomes a
    // tracking pixel issued by a different application, outside every CSP and outside what
    // `verify:offline` can see, from a tool whose stated guarantee is that nothing is requested.
    // Same boundary rule already applied at html-raster.ts:84 and in both preview components.
    const sanitized = stripRemoteResources(
      DOMPurify.sanitize(htmlString, {
        WHOLE_DOCUMENT: true,
        USE_PROFILES: { html: true },
        ADD_TAGS: ['link', 'style', 'meta'],
        ADD_ATTR: ['target'],
      }) as string,
    );

    let blob: Blob;
    try {
      const result = await asBlob(sanitized);
      if (!(result instanceof Blob)) {
        throw new Error('errors.docxGen');
      }
      blob = result;
    } catch (error) {
      throw new Error('errors.docxGen', { cause: error });
    }

    return { blob, filename: 'converted.docx' };
  },
};

export default htmlToDocxConverter;
