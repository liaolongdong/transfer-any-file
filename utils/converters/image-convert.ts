import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertContext, ConvertResult } from '~/utils/core/types';
import { loadImage, encodeCanvas, releaseCanvas, MAX_DIM } from '~/utils/core/image-utils';
import { hasMultipleFrames } from '~/utils/core/animated-image';

const MIME_TYPES: Record<string, string> = {
  [FileFormat.PNG]: 'image/png',
  [FileFormat.JPG]: 'image/jpeg',
  [FileFormat.WEBP]: 'image/webp',
};

function createImageConverter(from: FileFormat, to: FileFormat, mimeType: string): Converter {
  return {
    from,
    to,
    async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
      // The `drawImage` below keeps one frame, which is only a loss when the source had more than
      // one. GIF is the format the reader answers for: a plain PNG or JPEG has nothing to lose, and
      // `image-to-html` never comes through here because it embeds the original bytes with the
      // animation intact. Animated WebP and APNG inputs lose frames too — see the scope note in
      // `utils/core/animated-image.ts` for why that one is not measured yet.
      const lostFrames = from === FileFormat.GIF && (await hasMultipleFrames(input));
      // Object URLs avoid the base64 memory overhead of data URLs
      const objectUrl = URL.createObjectURL(input);
      let img: HTMLImageElement;
      try {
        img = await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      let { naturalWidth: w, naturalHeight: h } = img;
      // Some decoders report a successful load with zero intrinsic size (truncated files, odd
      // BMP/GIF variants); a 0×0 canvas encodes to a corrupt-looking blob instead of an error.
      if (!w || !h) throw new Error('errors.imageDecode');
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

      // For JPEG, fill white background (no transparency support)
      if (mimeType === 'image/jpeg') {
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      }

      canvasCtx.drawImage(img, 0, 0, w, h);

      try {
        const blob = await encodeCanvas(canvas, mimeType, ctx?.options);
        return { blob, filename: `converted.${to}`, lostFrames };
      } finally {
        releaseCanvas(canvas);
      }
    },
  };
}

// GIF decodes its first frame via <img>; BMP can be decoded as a source, but
// Canvas cannot encode image/bmp in most browsers, so BMP is intentionally
// NOT an output target.
const sourceFormats = [FileFormat.PNG, FileFormat.JPG, FileFormat.WEBP, FileFormat.BMP, FileFormat.GIF];
const targetFormats = [FileFormat.PNG, FileFormat.JPG, FileFormat.WEBP];

const imageConverters: Converter[] = [];
for (const fromFmt of sourceFormats) {
  for (const toFmt of targetFormats) {
    if (fromFmt !== toFmt) {
      imageConverters.push(createImageConverter(fromFmt, toFmt, MIME_TYPES[toFmt]));
    }
  }
}

export default imageConverters;
