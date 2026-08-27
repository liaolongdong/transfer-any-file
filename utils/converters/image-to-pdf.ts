import jsPDF from 'jspdf';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const MIME_TO_PDF_FORMAT: Record<string, 'PNG' | 'JPEG'> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'PNG',
  'image/bmp': 'PNG',
};

function createImageToPdfConverter(from: FileFormat): Converter {
  return {
    from,
    to: FileFormat.PDF,
    async convert(input: Blob): Promise<ConvertResult> {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(input);
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const widthPt = (img.width * 72) / 96;
      const heightPt = (img.height * 72) / 96;
      const pdfFormat = MIME_TO_PDF_FORMAT[input.type] ?? 'PNG';

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
