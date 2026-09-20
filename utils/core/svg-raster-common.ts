import { MAX_DIM } from '~/utils/core/image-utils';

/** Square canvas for an SVG that declares neither dimensions nor a viewBox. */
const DEFAULT_DIM = 1024;

/**
 * Remove scripts and event handler attributes from an SVG element.
 *
 * Defense in depth: rendering through `<img>` already disables scripts, and DOMPurify's svg profile
 * is the primary gate where one has run. Both rasterizing callers do this, so it lives here rather
 * than being copied twice.
 */
export function stripSvgActiveContent(svg: Element): void {
  svg.querySelectorAll('script').forEach(el => el.remove());
  svg.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    }
  });
}

/**
 * Normalize an SVG document for rasterization: give the root element explicit pixel dimensions
 * (from its `width`/`height` attributes or the viewBox) so `<img>` reports a usable intrinsic size.
 *
 * Split out of `svg-rasterize.ts` because the DOCX boundary has to rasterize an inline `<svg>` with
 * the *same* size rules, and copying the fallback chain would give one of the two a bug of its own.
 * Active-content stripping is the caller's job and happens first: this reads the markup it is
 * handed as if it were already safe to paint.
 */
export function normalizeSvgForRaster(svgText: string): { serialized: string; width: number; height: number } {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('errors.imageDecode');
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') throw new Error('errors.imageDecode');

  // Relative units carry no meaning for a raster canvas, but `parseFloat` would happily read
  // "100%" as 100 and "20em" as 20 — anything that is not a plain number or px length counts as
  // missing and falls back to the viewBox (or the default square).
  const pixelAttr = (name: string): number => {
    const raw = svg.getAttribute(name)?.trim() ?? '';
    return /^\d+(?:\.\d+)?(?:px)?$/i.test(raw) ? parseFloat(raw) : NaN;
  };
  let width = pixelAttr('width');
  let height = pixelAttr('height');
  const viewBox = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!Number.isFinite(width) || width <= 0) width = viewBox && viewBox[2] > 0 ? viewBox[2] : DEFAULT_DIM;
  if (!Number.isFinite(height) || height <= 0) height = viewBox && viewBox[3] > 0 ? viewBox[3] : DEFAULT_DIM;
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  return { serialized: new XMLSerializer().serializeToString(svg), width, height };
}

/** Scale to fit `MAX_DIM` on the longest edge; never upscales. */
export function fitToMaxDim(w: number, h: number): { w: number; h: number } {
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }
  return { w, h };
}
