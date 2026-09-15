import { FileFormat } from '~/utils/core/types';
import type { ConvertContext, Converter, ConvertResult } from '~/utils/core/types';
import { throwIfAborted } from '~/utils/core/abort';
import { releaseCanvas } from '~/utils/core/image-utils';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';
import { renderHtmlToCanvas } from '~/utils/core/html-raster';

const htmlToPdfConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.PDF,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    const jspdfModule = await import('jspdf');
    const jsPDF = jspdfModule.default;

    // A GBK-exported HTML file is unreadable as UTF-8, and rasterizing the mojibake would
    // produce a PDF of mojibake that looks like a successful conversion.
    const htmlContent = await decodeTextBlobLenient(input);
    const canvas = await renderHtmlToCanvas(htmlContent, ctx?.signal);

    // Create PDF from canvas — slice into A4-sized pages
    const imgWidth = 210; // A4 width in mm
    const pageHeightMm = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const totalPages = Math.ceil(imgHeight / pageHeightMm);
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageCanvas = document.createElement('canvas');
    try {
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) throw new Error('errors.renderFailed');
      const sliceHeightPx = Math.round((pageHeightMm / imgWidth) * canvas.width);

      for (let page = 0; page < totalPages; page++) {
        // Slicing a tall document page by page is the long part of this converter, and the
        // rasterizing above it cannot be interrupted from outside — this is the only gap where a
        // cancel can take effect. The `finally` below still frees both canvases when we throw.
        throwIfAborted(ctx?.signal);
        if (page > 0) pdf.addPage();

        const yStart = page * sliceHeightPx;
        const remainingH = Math.min(sliceHeightPx, canvas.height - yStart);

        pageCanvas.width = canvas.width;
        pageCanvas.height = remainingH;
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, canvas.width, remainingH);
        pageCtx.drawImage(canvas, 0, yStart, canvas.width, remainingH, 0, 0, canvas.width, remainingH);

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
        const pageImgHeightMm = (remainingH * imgWidth) / canvas.width;
        pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeightMm, undefined, 'FAST');
      }
    } finally {
      // Both buffers are live for the whole loop; releasing them is what keeps a 100-page
      // document from holding the source canvas and every slice at once.
      releaseCanvas(pageCanvas);
      releaseCanvas(canvas);
    }

    // Get PDF as blob
    const pdfBlob = pdf.output('blob');
    return { blob: pdfBlob, filename: 'converted.pdf' };
  },
};

export default htmlToPdfConverter;
