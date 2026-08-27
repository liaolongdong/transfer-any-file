import jsPDF from 'jspdf';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

export const pngToPdfConverter: Converter = {
  from: FileFormat.PNG,
  to: FileFormat.PDF,
  convert: async (blob: Blob): Promise<ConvertResult> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    const widthPt = (img.width * 72) / 96;
    const heightPt = (img.height * 72) / 96;

    const pdf = new jsPDF({
      orientation: widthPt > heightPt ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [widthPt, heightPt],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, widthPt, heightPt);
    const pdfBlob = pdf.output('blob');
    return { blob: pdfBlob, filename: 'converted.pdf' };
  },
};
