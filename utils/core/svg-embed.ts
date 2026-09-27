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
 *
 * `svgCount` is what the UI discloses: how many drawings this call actually replaced with a raster.
 * Nested `<svg>` nodes are not counted — they sit inside their parent's markup and paint in the
 * parent's raster — and neither is a diagram whose rasterization failed, because the note the count
 * drives says the drawing was written into the result as a bitmap, and a dropped one was written into
 * nothing. A caller that must describe the bytes it hands back still has to check its own output: see
 * `html-to-md.ts`, where a diagram inside a table cell is flattened to text and never arrives.
 */
export async function replaceInlineSvgWithPng(html: string): Promise<{ html: string; svgCount: number }> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // A nested `<svg>` is already inside the parent's own markup, so it paints in the parent's
  // raster; rasterizing it a second time would only be wasted work on a node about to be detached.
  const svgs = Array.from(doc.querySelectorAll('svg')).filter(node => !node.parentElement?.closest('svg'));
  if (svgs.length === 0) return { html, svgCount: 0 };

  let replaced = 0;
  for (const node of svgs) {
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
    replaced++;
  }

  // `documentElement.outerHTML` drops the doctype DOMParser kept on the Document, and the altChunk
  // Word opens is sensitive to how the document is declared.
  const doctype = /^\s*(<!doctype[^>]*>)/i.exec(html)?.[1] ?? '';
  return { html: doctype + doc.documentElement.outerHTML, svgCount: replaced };
}
