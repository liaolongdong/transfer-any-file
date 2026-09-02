import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { wrapHtmlDocument } from '~/utils/core/html-document';

const IMAGE_DOC_CSS = `
    body { text-align: center; }
    svg { max-width: 100%; height: auto; }
`;

const svgToHtmlConverter: Converter = {
  from: FileFormat.SVG,
  to: FileFormat.HTML,

  async convert(input: Blob): Promise<ConvertResult> {
    const { default: DOMPurify } = await import('dompurify');
    const svgText = await input.text();
    // svgFilters profile keeps gradients/filters while dropping scripts and
    // foreign event handlers
    const cleanSvg = DOMPurify.sanitize(svgText, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    if (!cleanSvg.trim()) throw new Error('errors.imageDecode');

    const blob = wrapHtmlDocument(cleanSvg, { title: 'SVG Document', extraCss: IMAGE_DOC_CSS });
    return { blob, filename: 'converted.html' };
  },
};

export default svgToHtmlConverter;
