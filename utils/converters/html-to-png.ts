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

export const htmlToPngConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.PNG,
  convert: async (blob: Blob): Promise<ConvertResult> => {
    const htmlString = await blob.text();
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    // Set up rendering styles
    const style = doc.createElement('style');
    style.textContent = `
      body { margin: 0; padding: 16px; font-family: -apple-system, sans-serif; background: #fff; }
      * { box-sizing: border-box; }
    `;
    doc.head.appendChild(style);

    const container = document.createElement('div');
    container.style.cssText = `width: ${RENDER_WIDTH}px; position: absolute; left: -9999px; top: 0;`;
    container.innerHTML = DOMPurify.sanitize(doc.body.innerHTML);
    document.body.appendChild(container);

    try {
      await waitForImages(container);
      const dataUrl = await toPng(container, {
        width: RENDER_WIDTH,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      const pngBlob = await res.blob();
      return { blob: pngBlob, filename: 'converted.png' };
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  },
};
