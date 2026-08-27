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
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('errors.unknown'));
        iframe.srcdoc = sanitizedHtml;
      });

      const doc = iframe.contentDocument;
      if (!doc || !doc.documentElement) throw new Error('errors.unknown');

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

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Calculate how many pages we need
      const totalPages = Math.ceil(imgHeight / pageHeight);
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

      // Add additional pages if needed
      for (let page = 1; page < totalPages; page++) {
        pdf.addPage();
        // For subsequent pages, we need to shift the image up
        const yOffset = -(page * pageHeight);
        pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, imgHeight, undefined, 'FAST');
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
