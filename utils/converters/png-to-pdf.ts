import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { loadImage, releaseCanvas, MAX_DIM } from '~/utils/core/image-utils';

/**
 * Downscale an oversized image and hand back a PNG data URL.
 *
 * Deliberately a local fallback rather than a shared helper: this converter keeps the source PNG's
 * pixels lossless on the normal path, so it must not inherit the re-encode every other image → PDF
 * path performs, and transparency here has no white background to fill in.
 */
function downscaleToPngDataUrl(img: HTMLImageElement, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const canvasCtx = canvas.getContext('2d');
  if (!canvasCtx) throw new Error('errors.imageEncode');
  canvasCtx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/png');
  releaseCanvas(canvas);
  return dataUrl;
}

export const pngToPdfConverter: Converter = {
  from: FileFormat.PNG,
  to: FileFormat.PDF,
  convert: async (blob: Blob): Promise<ConvertResult> => {
    const { default: jsPDF } = await import('jspdf');
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImage(objectUrl);

      // naturalWidth, not width: the latter reports a CSS-adjusted box once any style touches the
      // element, which would size the page from a number unrelated to the picture.
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width === 0 || height === 0) throw new Error('errors.imageDecode');

      let source: string = objectUrl;
      if (width > MAX_DIM || height > MAX_DIM) {
        // Past the browser's canvas limits the PDF would be unrenderable, so this is the one case
        // where the source's own pixel grid is given up.
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        source = downscaleToPngDataUrl(img, width, height);
      }

      const widthPt = (width * 72) / 96;
      const heightPt = (height * 72) / 96;

      const pdf = new jsPDF({
        orientation: widthPt > heightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [widthPt, heightPt],
      });

      // 'FAST' is not optional. Without a compression argument jsPDF 4.2.1 stores the *decoded* PNG
      // samples with no filter at all: `checkCompressValue()` maps `undefined` to NONE, and the
      // auto-'SLOW' branch in `addImage` only fires when the document declares FlateEncode — which it
      // never does for an image, since `putImage` strips FlateEncode from the filter list first. A
      // 31 KB screenshot came out as a 2.9 MB PDF, and over five repo PNGs that unfiltered stream ran
      // 9.5x–95.6x the source. That much is a defect; which level to ask for instead is only a trade.
      // The argument picks one fixed PNG row filter plus a zlib level (FAST = Sub + 1, SLOW =
      // Paeth + 9, as recorded in `html-to-pdf.ts`, which ships SLOW). 'SLOW' is the smaller output on
      // real content — 454 KB against 505 KB over those five files, and 2.5x smaller on a flat icon —
      // for 4.2 s against 1.1 s. This converter takes no `ctx` and the deflate is synchronous, so that
      // difference is frozen-tab time on *every* file of a batch, and on a noisy image 'SLOW' hands
      // the bytes back as well: 20–35 % *larger* than 'FAST' on a synthetic grain pattern. At MAX_DIM
      // the gap closes (18.4 s against 18.1 s) because the PNG decode dominates — which is why the
      // measured range at ordinary sizes is what settles it: 10 % off the output for 3.8x the wait.
      // Either level stays lossless: un-filtering the 'FAST' stream reproduces the raw samples.
      pdf.addImage(source, 'PNG', 0, 0, widthPt, heightPt, undefined, 'FAST');
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: 'converted.pdf' };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  },
};
