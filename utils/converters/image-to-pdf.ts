import jsPDF from 'jspdf';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const MAX_DIM = 8192;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('errors.imageDecode'));
    img.src = src;
  });
}

function createImageToPdfConverter(from: FileFormat): Converter {
  return {
    from,
    to: FileFormat.PDF,
    async convert(input: Blob): Promise<ConvertResult> {
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

      // jsPDF only understands JPEG/PNG payloads, so WEBP/BMP must be
      // re-encoded via canvas or the PDF comes out corrupt.
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('errors.imageEncode');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      const isJpeg = input.type === 'image/jpeg';
      const dataUrl = canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.92);
      const pdfFormat = isJpeg ? 'JPEG' : 'PNG';

      const widthPt = (w * 72) / 96;
      const heightPt = (h * 72) / 96;

      const pdf = new jsPDF({
        orientation: widthPt > heightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [widthPt, heightPt],
      });

      pdf.addImage(dataUrl, pdfFormat, 0, 0, widthPt, heightPt);
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: 'converted.pdf' };
    },
  };
}

export const imageToPdfConverters: Converter[] = [
  createImageToPdfConverter(FileFormat.JPG),
  createImageToPdfConverter(FileFormat.WEBP),
  createImageToPdfConverter(FileFormat.BMP),
];
