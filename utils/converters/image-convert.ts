import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { loadImage, canvasToBlob, MAX_DIM } from '~/utils/core/image-utils';

const MIME_TYPES: Record<string, string> = {
  [FileFormat.PNG]: 'image/png',
  [FileFormat.JPG]: 'image/jpeg',
  [FileFormat.WEBP]: 'image/webp',
};

function createImageConverter(from: FileFormat, to: FileFormat, mimeType: string): Converter {
  return {
    from,
    to,
    async convert(input: Blob): Promise<ConvertResult> {
      // Object URLs avoid the base64 memory overhead of data URLs
      const objectUrl = URL.createObjectURL(input);
      let img: HTMLImageElement;
      try {
        img = await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      let { naturalWidth: w, naturalHeight: h } = img;
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

      // For JPEG, fill white background (no transparency support)
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, w, h);

      const blob = await canvasToBlob(canvas, mimeType);
      return { blob, filename: `converted.${to}` };
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
