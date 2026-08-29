import { asBlob } from 'html-docx-js-typescript';
import DOMPurify from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const htmlToDocxConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.DOCX,

  async convert(input: Blob): Promise<ConvertResult> {
    const htmlString = await input.text();

    const sanitized = DOMPurify.sanitize(htmlString, {
      WHOLE_DOCUMENT: true,
      USE_PROFILES: { html: true },
      ADD_TAGS: ['link', 'style', 'meta'],
      ADD_ATTR: ['target'],
    }) as string;

    let blob: Blob;
    try {
      const result = await asBlob(sanitized);
      if (!(result instanceof Blob)) {
        throw new Error('errors.docxGen');
      }
      blob = result;
    } catch (error) {
      console.error('DOCX generation failed:', error);
      throw new Error('errors.docxGen', { cause: error });
    }

    return { blob, filename: 'converted.docx' };
  },
};

export default htmlToDocxConverter;
