import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertContext, ConvertResult } from '~/utils/core/types';
import { loadImage, encodeCanvas, releaseCanvas, MAX_DIM } from '~/utils/core/image-utils';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';

const DEFAULT_DIM = 1024;

/**
 * Normalize an SVG document for rasterization: strip scripts, and give the
 * root element explicit pixel dimensions (from width/height attrs or the
 * viewBox) so <img> reports a usable intrinsic size.
 */
async function prepareSvg(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const text = await decodeTextBlobLenient(input);
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('errors.imageDecode');
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') throw new Error('errors.imageDecode');

  // <img> rendering already disables scripts; remove them and event handler
  // attributes as defense in depth
  svg.querySelectorAll('script').forEach(el => el.remove());
  svg.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  });

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

  const serialized = new XMLSerializer().serializeToString(svg);
  return { blob: new Blob([serialized], { type: 'image/svg+xml' }), width, height };
}

const MIME_TYPES: Partial<Record<FileFormat, string>> = {
  [FileFormat.PNG]: 'image/png',
  [FileFormat.JPG]: 'image/jpeg',
  [FileFormat.WEBP]: 'image/webp',
};

function createSvgRasterConverter(to: FileFormat): Converter {
  const mimeType = MIME_TYPES[to]!;
  return {
    from: FileFormat.SVG,
    to,
    async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
      const { blob, width, height } = await prepareSvg(input);

      const objectUrl = URL.createObjectURL(blob);
      let img: HTMLImageElement;
      try {
        img = await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      let w = img.naturalWidth || width;
      let h = img.naturalHeight || height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      // Named apart from the `ctx` conversion context, which every converter now reserves.
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) throw new Error('errors.imageEncode');

      if (mimeType === 'image/jpeg') {
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.fillRect(0, 0, w, h);
      }
      canvasCtx.drawImage(img, 0, 0, w, h);

      try {
        const outBlob = await encodeCanvas(canvas, mimeType, ctx?.options);
        return { blob: outBlob, filename: `converted.${to}` };
      } finally {
        releaseCanvas(canvas);
      }
    },
  };
}

export const svgRasterConverters: Converter[] = [
  createSvgRasterConverter(FileFormat.PNG),
  createSvgRasterConverter(FileFormat.JPG),
  createSvgRasterConverter(FileFormat.WEBP),
];
