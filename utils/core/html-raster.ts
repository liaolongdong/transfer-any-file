import { throwIfAborted } from '~/utils/core/abort';
import { asErrorKey } from '~/utils/core/error-keys';

/** Layout width used to render the document before rasterizing */
const RENDER_WIDTH = 800;

/** Budget for the iframe's own load, before the document can even be measured */
const LOAD_TIMEOUT_MS = 10_000;

/** Budget for each image inside the document to either load or fail */
const ASSET_TIMEOUT_MS = 5_000;

/** Pause after the assets settle, giving the layout one last reflow */
const LAYOUT_SETTLE_MS = 100;

/**
 * Wait until the images and fonts inside the document have settled.
 *
 * Every failure mode here resolves rather than rejects: an image that 404s or a font API the
 * browser does not expose should produce a partially-rendered picture, not kill the conversion.
 */
async function waitForAssets(doc: Document, signal?: AbortSignal): Promise<void> {
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
          setTimeout(() => resolve(), ASSET_TIMEOUT_MS);
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

  throwIfAborted(signal);
  await new Promise((resolve) => setTimeout(resolve, LAYOUT_SETTLE_MS));
}

/**
 * Rasterize an HTML document into a canvas, sized to the document's full height.
 *
 * The document renders in a hidden same-origin iframe rather than a bare `<div>`: an iframe keeps
 * the source's own CSS (`body { margin: 0 }`, global resets) from leaking into the workbench page.
 * Sanitizing happens here so no caller can reach the live DOM with unsanitized markup, and the
 * iframe is always removed, including on the throw paths.
 *
 * Throws `errors.renderTimeout` when the document never loads, `errors.cancelled` when `signal`
 * fires, and `errors.renderFailed` for anything else — with the original error kept as `cause` so
 * the failure diagnostic can show what the browser actually said.
 *
 * The caller owns the returned canvas and must {@link releaseCanvas} it: the backing store is
 * `width * height * 4` bytes, which for a long document at 2x pixelRatio is well over a GB.
 */
export async function renderHtmlToCanvas(html: string, signal?: AbortSignal): Promise<HTMLCanvasElement> {
  const [purifyModule, htmlToImage] = await Promise.all([import('dompurify'), import('html-to-image')]);
  const DOMPurify = purifyModule.default;
  const { toCanvas } = htmlToImage;

  // Keep the WHOLE document (head, <style>, <link>) so the page renders with its own
  // layout/styles/images; scripts are stripped for safety.
  const sanitizedHtml = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['link', 'style'],
    ADD_ATTR: ['target', 'rel'],
  });

  throwIfAborted(signal);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position: fixed; left: -9999px; top: 0; width: ${RENDER_WIDTH}px; height: 100px; border: none;`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('errors.renderTimeout')), LOAD_TIMEOUT_MS);
      iframe.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      iframe.onerror = () => {
        clearTimeout(timer);
        reject(new Error('errors.renderFailed'));
      };
      iframe.srcdoc = sanitizedHtml;
    });

    const doc = iframe.contentDocument;
    if (!doc || !doc.documentElement) throw new Error('errors.renderFailed');

    await waitForAssets(doc, signal);

    // Expand the iframe to the full content height before capturing
    const fullHeight = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0, 1);
    iframe.style.height = `${fullHeight}px`;

    // Tall documents drop to a lower ratio so the canvas stays inside the browser's size limits.
    const pixelRatio = fullHeight > 4000 ? 1 : fullHeight > 2000 ? 1.5 : 2;
    const canvas = await toCanvas(doc.documentElement, {
      width: RENDER_WIDTH,
      height: fullHeight,
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    if (canvas.width === 0 || canvas.height === 0) throw new Error('errors.renderFailed');
    return canvas;
  } catch (error) {
    if (signal?.aborted) throw new Error('errors.cancelled', { cause: error });
    // `renderTimeout` / `renderFailed` are already classified; only foreign errors get relabelled.
    if (asErrorKey(error)) throw error;
    throw new Error('errors.renderFailed', { cause: error });
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}
