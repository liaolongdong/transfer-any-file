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
    // The svg profiles are here because an inline `<svg>` diagram in markdown *is* the content, and
    // an html-only profile deleted the entire graphic at this step — so md→html, md→docx and md→png
    // all silently lost it. Not a new trust decision: svg-to-html.ts already runs this same
    // `{ svg, svgFilters }` pair over user-uploaded SVG files, and the svg profile carries its own
    // deny list (`script`, `set`, `animate`, `foreignObject`, `use`) with `on*` stripped by
    // DOMPurify's defaults. Two boundaries were simply inconsistent.
    const htmlBody = DOMPurify.sanitize(await marked(markdown), {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      ADD_ATTR: ['target'],
    });

    const blob = wrapHtmlDocument(htmlBody);
    return { blob, filename: 'converted.html' };
  },
};

export default mdToHtmlConverter;
