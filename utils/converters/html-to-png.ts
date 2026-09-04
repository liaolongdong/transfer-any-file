import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { canvasToBlob } from '~/utils/core/image-utils';

/** Layout width used to render the document before rasterizing */
const RENDER_WIDTH = 800;

/** Wait until images and fonts inside the document have settled */
async function waitForAssets(doc: Document): Promise<void> {
  const images = Array.from(doc.images);

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

  await new Promise((resolve) => setTimeout(resolve, 100));
}

export const htmlToPngConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.PNG,

  async convert(input: Blob): Promise<ConvertResult> {
    const [htmlToImage, purifyModule] = await Promise.all([
      import('html-to-image'),
      import('dompurify'),
    ]);
    const { toCanvas } = htmlToImage;
    const DOMPurify = purifyModule.default;

    const htmlContent = await input.text();

    // Keep the WHOLE document (head, <style>, <link>) so the page renders
    // with its own layout/styles/images; scripts are stripped for safety.
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ['link', 'style'],
      ADD_ATTR: ['target', 'rel'],
    });

    // Render in a hidden same-origin iframe: unlike injecting into a bare
    // div, this keeps the document's own CSS from leaking into the
    // workbench page (e.g. a source `body { margin: 0 }` rule).
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

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('errors.imageEncode');
      }

      const pngBlob = await canvasToBlob(canvas, 'image/png');
      return { blob: pngBlob, filename: 'converted.png' };
    } catch (error) {
      throw new Error('errors.imageEncode', { cause: error });
    } finally {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  },
};
