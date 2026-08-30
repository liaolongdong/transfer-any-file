import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import DOMPurify from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

/** Layout width used to render the document before rasterizing */
const RENDER_WIDTH = 800;

/** Wait until images and fonts inside the document have settled */
async function waitForAssets(doc: Document): Promise<void> {
  const images = Array.from(doc.images);

  // Wait for all images to either load or fail
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          // Fallback timeout in case neither event fires
          setTimeout(() => resolve(), 5000);
        }),
    ),
  );

  // Also decode images for rendering readiness
  await Promise.all(
    images.map((img) =>
      typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve(),
    ),
  );

  try {
    await doc.fonts.ready;
  } catch {
    // fonts API unavailable; proceed
  }

  // Small delay to allow layout to settle after images load
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const htmlToPdfConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.PDF,

  async convert(input: Blob): Promise<ConvertResult> {
    const htmlContent = await input.text();

    // Keep the WHOLE document (head, <style>, <link>) so the page renders
    // with its own layout/styles/images; scripts are stripped for safety.
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ['link', 'style'],
      ADD_ATTR: ['target', 'rel'],
    });

    // Render in a hidden same-origin iframe: unlike injecting into a bare
    // div, this preserves the document's own CSS without leaking it into
    // the workbench page.
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position: fixed; left: -9999px; top: 0; width: ${RENDER_WIDTH}px; height: 100px; border: none;`;
    document.body.appendChild(iframe);

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('errors.imageEncode')), 10_000);
        iframe.onload = () => { clearTimeout(timer); resolve(); };
        iframe.onerror = () => { clearTimeout(timer); reject(new Error('errors.imageEncode')); };
        iframe.srcdoc = sanitizedHtml;
      });

      const doc = iframe.contentDocument;
      if (!doc || !doc.documentElement) throw new Error('errors.imageEncode');

      await waitForAssets(doc);

      // Expand the iframe to the full content height before capturing
      const fullHeight = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0, 1);
      iframe.style.height = `${fullHeight}px`;

      const pixelRatio = fullHeight > 4000 ? 1 : fullHeight > 2000 ? 1.5 : 2;
      const canvas = await toCanvas(doc.documentElement, {
        width: RENDER_WIDTH,
        height: fullHeight,
        pixelRatio,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // Create PDF from canvas — slice into A4-sized pages
      const imgWidth = 210; // A4 width in mm
      const pageHeightMm = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeight / pageHeightMm);
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) throw new Error('errors.imageEncode');
      const sliceHeightPx = Math.round((pageHeightMm / imgWidth) * canvas.width);

      for (let page = 0; page < totalPages; page++) {
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

      // Get PDF as blob
      const pdfBlob = pdf.output('blob');
      return { blob: pdfBlob, filename: 'converted.pdf' };
    } finally {
      // Clean up the hidden iframe
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  },
};

export default htmlToPdfConverter;
