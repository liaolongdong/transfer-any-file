import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { loadImage, releaseCanvas, MAX_DIM } from '~/utils/core/image-utils';
import { hasMultipleFrames } from '~/utils/core/animated-image';

function createImageToPdfConverter(from: FileFormat): Converter {
  return {
    from,
    to: FileFormat.PDF,
    async convert(input: Blob): Promise<ConvertResult> {
      // The `drawImage` below keeps a single frame, which is a loss only if the source had a second
      // one to keep. See `utils/core/animated-image.ts` for the scope of that check.
      const lostFrames = from === FileFormat.GIF && (await hasMultipleFrames(input));
      const { default: jsPDF } = await import('jspdf');
      const objectUrl = URL.createObjectURL(input);
      let img: HTMLImageElement;
      try {
        img = await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w === 0 || h === 0) throw new Error('errors.imageDecode');
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      // Re-encoding here is a choice, not a limitation: jsPDF 4.2.1 does carry WEBP and BMP decoders
      // (`processWEBP` / `processBMP`), but both force the pixels through a quality-100 JPEG, which
      // ignores the white fill added below, leaves no knob for quality, and writes a stream larger
      // than the source file it came from.
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('errors.imageEncode');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // `from` is the contract this converter is registered under. `input.type` is sniffed from the
      // uploaded file and can be empty or wrong, and in a multi-step chain the intermediate blob
      // carries no type at all — either miss re-encodes a JPEG as lossless PNG and inflates the PDF.
      const isJpeg = from === FileFormat.JPG;
      const dataUrl = canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.92);
      releaseCanvas(canvas);
      const pdfFormat = isJpeg ? 'JPEG' : 'PNG';

      const widthPt = (w * 72) / 96;
      const heightPt = (h * 72) / 96;

      const pdf = new jsPDF({
        orientation: widthPt > heightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [widthPt, heightPt],
      });

      // The compression argument is what keeps a PNG payload from being written *uncompressed*:
      // jsPDF's `putImage` strips FlateEncode from the filter list and `checkCompressValue()` maps an
      // omitted argument to NONE, so the default stored the decoded samples raw — 9.5x–95.6x the
      // source in `png-to-pdf.ts`, which makes the same call. 'FAST' rather than 'SLOW' for the
      // reason spelled out there: a fixed Paeth filter plus a level-9 deflate wins on flat pictures,
      // loses on busy ones, and costs several times the synchronous encode time at the sizes people
      // actually convert. Harmless on the JPEG branch, which is a DCT pass-through and never reads the
      // argument: measured on a real JPEG, the two PDFs differ only in the 60 bytes of the trailer's
      // `/ID`, image stream included.
      pdf.addImage(dataUrl, pdfFormat, 0, 0, widthPt, heightPt, undefined, 'FAST');
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: 'converted.pdf', lostFrames };
    },
  };
}

export const imageToPdfConverters: Converter[] = [
  createImageToPdfConverter(FileFormat.JPG),
  createImageToPdfConverter(FileFormat.WEBP),
  createImageToPdfConverter(FileFormat.BMP),
  createImageToPdfConverter(FileFormat.GIF),
];
