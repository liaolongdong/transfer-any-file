import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { wrapHtmlDocument } from '~/utils/core/html-document';

let markedConfigured = false;

const mdToHtmlConverter: Converter = {
  from: FileFormat.MD,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const [markedModule, purifyModule] = await Promise.all([import('marked'), import('dompurify')]);
    const { marked } = markedModule;
    const DOMPurify = purifyModule.default;
    if (!markedConfigured) {
      marked.setOptions({ gfm: true, breaks: false });
      markedConfigured = true;
    }

    const markdown = await decodeTextBlob(input, 'errors.unknown');
    const htmlBody = DOMPurify.sanitize(await marked(markdown), {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target'],
    });

    const blob = wrapHtmlDocument(htmlBody);
    return { blob, filename: 'converted.html' };
  },
};

export default mdToHtmlConverter;
