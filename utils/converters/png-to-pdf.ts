import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { loadImage } from '~/utils/core/image-utils';

export const pngToPdfConverter: Converter = {
  from: FileFormat.PNG,
  to: FileFormat.PDF,
  convert: async (blob: Blob): Promise<ConvertResult> => {
    const { default: jsPDF } = await import('jspdf');
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImage(objectUrl);

      const widthPt = (img.width * 72) / 96;
      const heightPt = (img.height * 72) / 96;

      const pdf = new jsPDF({
        orientation: widthPt > heightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [widthPt, heightPt],
      });

      pdf.addImage(objectUrl, 'PNG', 0, 0, widthPt, heightPt);
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: 'converted.pdf' };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  },
};
