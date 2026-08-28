import { toPng } from 'html-to-image';
import DOMPurify from 'dompurify';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const RENDER_WIDTH = 800;

/** Wait until all images inside an element have loaded */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
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
          setTimeout(() => resolve(), 5000);
        }),
    ),
  );
  // Small delay to allow layout to settle
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/** Extract all CSS text from style elements and linked stylesheets in head */
function extractStyles(doc: Document): string {
  const styles: string[] = [];
  doc.querySelectorAll('style').forEach((el) => {
    styles.push(el.textContent || '');
  });
  return styles.join('\n');
}

export const htmlToPngConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.PNG,
  convert: async (blob: Blob): Promise<ConvertResult> => {
    const htmlString = await blob.text();
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    // Extract styles from the original document head
    const originalStyles = extractStyles(doc);

    // Create rendering container with original styles plus rendering defaults
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${RENDER_WIDTH}px;
      position: absolute;
      left: -9999px;
      top: 0;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
    `;

    // Inject original styles plus reset styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      ${originalStyles}
      body { margin: 0; padding: 16px; }
      * { box-sizing: border-box; }
      img { max-width: 100%; height: auto; }
    `;
    container.appendChild(styleEl);

    // Add the sanitized body content
    const content = document.createElement('div');
    content.style.padding = '16px';
    content.innerHTML = DOMPurify.sanitize(doc.body.innerHTML);
    container.appendChild(content);

    document.body.appendChild(container);

    try {
      await waitForImages(container);

      const dataUrl = await toPng(container, {
        width: RENDER_WIDTH,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: false,
        skipFonts: true,
      });

      // Verify the render produced a valid image (not blank)
      if (!dataUrl || dataUrl.length < 100) {
        throw new Error('Image rendering produced invalid output');
      }

      const res = await fetch(dataUrl);
      const pngBlob = await res.blob();

      if (pngBlob.size === 0) {
        throw new Error('Image rendering produced empty output');
      }

      return { blob: pngBlob, filename: 'converted.png' };
    } catch (error) {
      console.error('HTML to PNG conversion failed:', error);
      throw new Error('errors.imageEncode', { cause: error });
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  },
};
