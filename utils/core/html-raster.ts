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

/**
 * Anything in a stylesheet, an inline `style`, or a tag that can still be moving the page at capture time:
 * an `animation…:` / `transition…:` declaration — vendor-prefixed or not, and including the first one inside
 * `style="…"`, which no `{` or `;` precedes — an `<animate…>` element, or a `<marquee…>`. Deliberately wide:
 * a missed shape costs a picture caught mid-motion, an extra one costs 100 ms.
 */
const MOTION_RE = /[{;"']\s*(?:-[a-z]+-)?(?:animation|transition)[-a-z]*\s*:|<animate|<marquee/i;

/**
 * A subresource the asset wait above never waits for, so its paint or its box can still change after that
 * wait returns: `doc.images` is HTMLImageElement-only, which leaves an SVG `<image>` out of it, and a
 * `<video>` whose src survived the strip (`data:`, `blob:`, a relative path) takes its box from metadata
 * arriving on its own schedule. Two absences are deliberate. `<audio>` keeps a fixed control box, so nothing
 * on the page moves when it loads. And a legacy HTML `<image>` is not waiting on here because the parser
 * turns it into an `<img>` before the sanitizer serializes the document, which `doc.images` already counts.
 * A `<video>` whose remote src *was* stripped matches too — it sits at the default 300×150 and gains nothing
 * — which is the direction this predicate is meant to err: a false match costs a tenth of a second, a missed
 * one costs a picture of a page still laying itself out. A literal tag name sitting inside an attribute value
 * (`title="a <video>"`) matches for the same reason — HTML serialization escapes text nodes but not `<` in an
 * attribute — which is an exposure {@link MOTION_RE} has always had, via `alt="transition: all"`.
 */
const UNWAITED_ASSET_RE = /<(?:image|video)/i;

/**
 * Whether this document is owed the {@link LAYOUT_SETTLE_MS} pause.
 *
 * The sleep covers layout that lands *after* the asset wait returns: an image whose decoded size
 * reflows its neighbours, or a `@font-face` swapping metrics. Both are readable without touching
 * geometry — `doc.images.length` and `doc.fonts.size` force no layout — and remote references are
 * already stripped by this point, so a src-less `<img>` still counted there errs on the side of
 * waiting: a document that no longer needs the pause keeps it, and one that does is never dropped.
 * The font count is read optionally because the wait above already treats a missing FontFaceSet as
 * survivable; a predicate that assumed it exists would turn that tolerance into a thrown conversion.
 * Motion is the third case — CSS `animation` / `transition`, SMIL, `marquee` — and a subresource the
 * wait does not cover is the fourth; both wait on purpose, since a page captured mid-motion or
 * mid-paint is a worse picture and the alternative costs one tenth of a second.
 *
 * The checked string is the **sanitized** HTML, so {@link MOTION_RE} and {@link UNWAITED_ASSET_RE} only
 * have to cover shapes that survive sanitisation — and in the shipped DOMPurify configuration they do:
 * `style` attributes and `<style>` blocks are kept, and `marquee`, `video` and the SVG `image` are all
 * on its allow-list; the SMIL alternatives {@link MOTION_RE} matches are exactly `animateTransform` /
 * `animateMotion` / `animateColor`, the three on its SVG allow-list (a plain `<animate>` is stripped, so
 * that branch of the alternation is a superset rather than a claim). The shapes a bare `[{;]` anchor
 * would have missed are exactly the ones a hand-written document tends to carry: the first declaration
 * of an inline `style`, a vendor-prefixed property, a SMIL transform.
 *
 * For everything else the pause buys nothing, and that was measured against the built artifact
 * rather than reasoned: seven document shapes (plain, long, inline image, sized image, animation,
 * transition, `@font-face`) rendered byte-identical PNGs with a 100 ms pause and with none.
 */
function needsLayoutSettle(doc: Document, html: string): boolean {
  return doc.images.length > 0 || (doc.fonts?.size ?? 0) > 0 || MOTION_RE.test(html) || UNWAITED_ASSET_RE.test(html);
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
