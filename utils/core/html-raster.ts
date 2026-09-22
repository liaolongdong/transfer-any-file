import { throwIfAborted } from '~/utils/core/abort';
import { asErrorKey } from '~/utils/core/error-keys';
import { stripRemoteResources } from '~/utils/core/html-sanitize';

/** Layout width used to render the document before rasterizing */
const RENDER_WIDTH = 800;

/** Budget for the iframe's own load, before the document can even be measured */
const LOAD_TIMEOUT_MS = 10_000;

/** Budget for each image inside the document to either load or fail */
const ASSET_TIMEOUT_MS = 5_000;

/** Pause after the assets settle, giving the layout one last reflow — only where one can still land */
const LAYOUT_SETTLE_MS = 100;

/** A declaration that can still be moving the page at capture time: `animation…:` or `transition…:`. */
const MOTION_DECL_RE = /[{;]\s*(?:animation|transition)[-a-z]*\s*:/i;

/**
 * Whether this document is owed the {@link LAYOUT_SETTLE_MS} pause.
 *
 * The sleep covers layout that lands *after* the asset wait returns: an image whose decoded size
 * reflows its neighbours, or a `@font-face` swapping metrics. Both are readable without touching
 * geometry — `doc.images.length` and `doc.fonts.size` force no layout — and remote references are
 * already stripped by this point, so a src-less `<img>` still counted there is the conservative
 * direction: it keeps a document waiting that no longer needs it, never the reverse. A CSS animation
 * or transition is the third case, and it is kept waiting on purpose: capturing a page mid-motion is
 * a worse picture.
 *
 * For everything else the pause buys nothing, and that was measured against the built artifact
 * rather than reasoned: seven document shapes (plain, long, inline image, sized image, animation,
 * transition, `@font-face`) rendered byte-identical PNGs with a 100 ms pause and with none.
 */
function needsLayoutSettle(doc: Document, html: string): boolean {
  return doc.images.length > 0 || doc.fonts.size > 0 || MOTION_DECL_RE.test(html);
}

/**
 * Wait until the images and fonts inside the document have settled.
 *
 * Every failure mode here resolves rather than rejects: an image that 404s or a font API the
 * browser does not expose should produce a partially-rendered picture, not kill the conversion.
 */
async function waitForAssets(doc: Document, html: string, signal?: AbortSignal): Promise<void> {
  const images = Array.from(doc.images);

  await Promise.all(
    images.map(
      img =>
        new Promise<void>(resolve => {
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
    images.map(img => (typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve())),
  );

  try {
    await doc.fonts.ready;
  } catch {
    // fonts API unavailable; proceed
  }

  throwIfAborted(signal);
  // A wall-clock pause, deliberately: this runs in the workbench tab, and `requestAnimationFrame`
  // stops firing there the moment the user switches away, which would stall the conversion.
  if (needsLayoutSettle(doc, html)) await new Promise(resolve => setTimeout(resolve, LAYOUT_SETTLE_MS));
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
  const purified = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['link', 'style'],
    ADD_ATTR: ['target', 'rel'],
  });
  // Sanitizing keeps remote URLs — strip them so rendering this untrusted document
  // cannot make the offline extension issue a single network request.
  const sanitizedHtml = stripRemoteResources(purified);

  throwIfAborted(signal);

  const iframe = document.createElement('iframe');
  // `allow-same-origin` keeps `contentDocument` reachable; scripts stay blocked by the
  // sandbox on top of DOMPurify's script removal.
  iframe.setAttribute('sandbox', 'allow-same-origin');
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

    await waitForAssets(doc, sanitizedHtml, signal);

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
