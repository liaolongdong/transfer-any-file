import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertContext, ConvertResult } from '~/utils/core/types';
import { loadImage, encodeCanvas, releaseCanvas } from '~/utils/core/image-utils';
import { normalizeSvgForRaster, stripSvgActiveContent, fitToMaxDim } from '~/utils/core/svg-raster-common';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';

/**
 * Read an SVG upload and normalize it for rasterization. The shared size rules live in
 * `utils/core/svg-raster-common.ts` so the DOCX boundary paints an inline `<svg>` the same way.
 */
async function prepareSvg(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const text = await decodeTextBlobLenient(input);
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('errors.imageDecode');
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg') throw new Error('errors.imageDecode');

  // <img> rendering already disables scripts; remove them and event handler
  // attributes as defense in depth
  stripSvgActiveContent(svg);

  const { serialized, width, height } = normalizeSvgForRaster(new XMLSerializer().serializeToString(svg));
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

      const { w, h } = fitToMaxDim(img.naturalWidth || width, img.naturalHeight || height);

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
