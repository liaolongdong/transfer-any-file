import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { loadImage, canvasToBlob, MAX_DIM } from '~/utils/core/image-utils';

const DEFAULT_DIM = 1024;

/**
 * Normalize an SVG document for rasterization: strip scripts, and give the
 * root element explicit pixel dimensions (from width/height attrs or the
 * viewBox) so <img> reports a usable intrinsic size.
 */
async function prepareSvg(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const text = await input.text();
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

  let width = parseFloat(svg.getAttribute('width') ?? '');
  let height = parseFloat(svg.getAttribute('height') ?? '');
  const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
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
    async convert(input: Blob): Promise<ConvertResult> {
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
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('errors.imageEncode');

      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      const outBlob = await canvasToBlob(canvas, mimeType);
      return { blob: outBlob, filename: `converted.${to}` };
    },
  };
}

export const svgRasterConverters: Converter[] = [
  createSvgRasterConverter(FileFormat.PNG),
  createSvgRasterConverter(FileFormat.JPG),
  createSvgRasterConverter(FileFormat.WEBP),
];
