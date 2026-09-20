import { normalizeSvgForRaster, stripSvgActiveContent, fitToMaxDim } from '~/utils/core/svg-raster-common';
import { loadImage, releaseCanvas } from '~/utils/core/image-utils';

/**
 * Rasterize one SVG markup string to a PNG data URL.
 *
 * `<img>` rendering does not execute scripts, but that is an argument about one renderer, not a
 * guarantee for the bytes we are about to write into someone's document — so the markup goes through
 * the svg profile first, the same gate `svg-to-html.ts` applies to an uploaded `.svg` file.
 */
async function rasterizeSvg(svgMarkup: string): Promise<string> {
  const { default: DOMPurify } = await import('dompurify');
  let clean = DOMPurify.sanitize(svgMarkup, { USE_PROFILES: { svg: true, svgFilters: true } }) as string;

  const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml');
  if (parsed.documentElement?.tagName.toLowerCase() === 'svg') {
    stripSvgActiveContent(parsed.documentElement);
    clean = new XMLSerializer().serializeToString(parsed.documentElement);
  }

  const { serialized, width, height } = normalizeSvgForRaster(clean);
  const objectUrl = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml' }));
  let img: HTMLImageElement;
  try {
    img = await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const { w, h } = fitToMaxDim(img.naturalWidth || width, img.naturalHeight || height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  try {
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) throw new Error('errors.renderFailed');
    // White ground: a transparent SVG would otherwise composite against nothing in Word.
    canvasCtx.fillStyle = '#FFFFFF';
    canvasCtx.fillRect(0, 0, w, h);
    canvasCtx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } finally {
    releaseCanvas(canvas);
  }
}

/**
 * Replace every inline `<svg>` in a document with a rasterized PNG `<img>`.
 *
 * Two boundaries need it, and for the same reason: neither consumer can draw inline SVG.
 * `html-docx-js-typescript` packs our markup into an MHT altChunk that Microsoft Word renders, and
 * Word's HTML import does not paint `<svg>` — while our own sanitize step runs an html profile that
 * contains no svg tag. Turndown has no rule for it either, so it collapsed the subtree to whatever
 * `<text>` nodes happened to be inside. Either way the graphic was gone before the file was
 * written, so an SVG→DOCX or md→DOCX batch reported success and handed the user a valid, blank
 * document. A raster always paints, at the cost of losing vector scaling, which is the accepted
 * trade.
 *
 * Documents without inline SVG are returned untouched, so the ordinary HTML→DOCX path keeps the
 * byte-for-byte behaviour it had before.
 */
export async function replaceInlineSvgWithPng(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const svgs = Array.from(doc.querySelectorAll('svg'));
  if (svgs.length === 0) return html;

  for (const node of svgs) {
    // A nested `<svg>` is already inside the parent's own markup, so it paints in the parent's
    // raster; rasterizing it a second time would only be wasted work on a node about to be detached.
    if (node.parentElement?.closest('svg')) continue;
    const markup = new XMLSerializer().serializeToString(node);
    let dataUrl: string;
    try {
      dataUrl = await rasterizeSvg(markup);
    } catch {
      // A single unpaintable diagram must not fail the whole document. Dropping it is what the old
      // behaviour did anyway; now at least the other images and all the text survive.
      node.remove();
      continue;
    }
    const imgEl = doc.createElement('img');
    imgEl.setAttribute('src', dataUrl);
    // `<title>` is the accessible name of an SVG; carrying it to the raster keeps the picture
    // describable in Word and in the markdown source instead of leaving an image with no text at all.
    imgEl.setAttribute('alt', (node.querySelector('title')?.textContent ?? '').replace(/\s+/g, ' ').trim());
    node.replaceWith(imgEl);
  }

  // `documentElement.outerHTML` drops the doctype DOMParser kept on the Document, and the altChunk
  // Word opens is sensitive to how the document is declared.
  const doctype = /^\s*(<!doctype[^>]*>)/i.exec(html)?.[1] ?? '';
  return doctype + doc.documentElement.outerHTML;
}
