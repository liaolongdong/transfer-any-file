import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const MIME_TYPES: Record<string, string> = {
  [FileFormat.PNG]: 'image/png',
  [FileFormat.JPG]: 'image/jpeg',
  [FileFormat.WEBP]: 'image/webp',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('errors.imageDecode'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('errors.imageEncode'));
      },
      mimeType,
      quality,
    );
  });
}

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

      const MAX_DIM = 8192;
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

// BMP can be decoded as a source, but Canvas cannot encode image/bmp in
// most browsers, so BMP is intentionally NOT an output target.
const sourceFormats = [FileFormat.PNG, FileFormat.JPG, FileFormat.WEBP, FileFormat.BMP];
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
