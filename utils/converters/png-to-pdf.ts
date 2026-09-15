import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { loadImage, releaseCanvas, MAX_DIM } from '~/utils/core/image-utils';

/**
 * Downscale an oversized image and hand back a PNG data URL.
 *
 * Deliberately a local fallback rather than a shared helper: this converter embeds the source PNG
 * byte-for-byte on the normal path, so it must not inherit the re-encode every other image → PDF
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
        // where the lossless embed is given up.
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

      pdf.addImage(source, 'PNG', 0, 0, widthPt, heightPt);
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: 'converted.pdf' };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  },
};
