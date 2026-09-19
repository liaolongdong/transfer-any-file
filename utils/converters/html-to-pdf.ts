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

        // PNG, not JPEG, for the reasons the switch recorded: a document routed on to an image
        // target was JPEG-compressed twice, and glyph edges are exactly where JPEG ringing shows.
        // Measured against the JPEG slice it replaced (same encoder quality, identical pixels per
        // document, this loop over the real `renderHtmlToCanvas` output): text and data pages come
        // out 13%–31% *smaller* than JPEG, colorized-JSON pages 14%–37% larger, and photographic
        // pages 2.9×–4.6× larger — a two-page gradient+grain sample goes 1.20 MB → 5.47 MB. Lossless
        // cannot follow DCT on noise, so that last figure is the price of the format, not of a
        // setting; no compression level recovers it.
        //
        // For PNG, jsPDF's last argument selects a zlib level plus a PNG predictor (FAST = 1/Sub,
        // MEDIUM = 6/Average, SLOW = 9/Paeth; NONE stores raw samples and measures 9.6×–89× the JPEG
        // size, so it is not a compression setting at all). SLOW is the level to ship: it is smaller
        // than FAST on *every* one of the ten measured documents (1%–8%, −3.6% in total), where
        // MEDIUM only wins by trading cases away — +13%…+21% on text and JSON pages to buy
        // −5%…−10% on the two photo pages. The price is encode CPU: per-page `addImage` runs
        // 1.6×–3.3× slower, ≈0.3 s → ≈0.9 s for a full-height 1600 px page on an idle machine. The
        // `throwIfAborted` above is the only cancel point, so one page is the granularity a user
        // waits on: still under a second, but three times the wait it was at FAST.
        const pageImgData = pageCanvas.toDataURL('image/png');
        const pageImgHeightMm = (remainingH * imgWidth) / canvas.width;
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageImgHeightMm, undefined, 'SLOW');
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
