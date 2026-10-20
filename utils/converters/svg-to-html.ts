import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult, ConvertContext } from '~/utils/core/types';
import { wrapHtmlDocument } from '~/utils/core/html-document';
import { stripRemoteResources } from '~/utils/core/html-sanitize';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';

const IMAGE_DOC_CSS = `
    body { text-align: center; }
    svg { max-width: 100%; height: auto; }
`;

const svgToHtmlConverter: Converter = {
  from: FileFormat.SVG,
  to: FileFormat.HTML,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    const { default: DOMPurify } = await import('dompurify');
    const svgText = await decodeTextBlobLenient(input);
    // svgFilters profile keeps gradients/filters while dropping scripts and
    // foreign event handlers
    const cleanSvg = DOMPurify.sanitize(svgText, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    if (!cleanSvg.trim()) throw new Error('errors.imageDecode');

    // The profile's job is executable markup, and it leaves the network alone on purpose: `<image
    // href>`, `feImage href` and a `style`/`fill="url(...)"` reference all survive it. Here nothing
    // renders the markup for us — the user does, by opening the file — so a remote reference left in
    // the artifact becomes a request their browser issues the moment they look at the result. Measured
    // before this line existed: an SVG naming four remote targets produced a document that asked for
    // all four on open. Same boundary rule as `html-to-docx.ts` (Word must not fetch while opening a
    // file) and `html-raster.ts` (a srcdoc iframe fetches even with scripts sandboxed off).
    //
    // It also removes the SMIL animation elements the svg profile allows — `animateTransform`,
    // `animateMotion`, `animateColor` — which is the other reason to run it: an animation can repoint
    // a paint server at the network after the attributes were checked.
    const wrapped = wrapHtmlDocument(cleanSvg, { sourceName: ctx?.source?.name, extraCss: IMAGE_DOC_CSS });
    const stripped = stripRemoteResources(await wrapped.text());
    return { blob: new Blob([stripped], { type: 'text/html' }), filename: 'converted.html' };
  },
};

export default svgToHtmlConverter;
