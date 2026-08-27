import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('errors.imageDecode'));
    img.src = src;
  });
}

function createImageToPngConverter(from: FileFormat): Converter {
  return {
    from,
    to: FileFormat.PNG,
    async convert(input: Blob): Promise<ConvertResult> {
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

      ctx.drawImage(img, 0, 0, w, h);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('errors.imageEncode')), 'image/png');
      });
      return { blob: pngBlob, filename: 'converted.png' };
    },
  };
}

export const imageToPngConverters: Converter[] = [
  createImageToPngConverter(FileFormat.JPG),
  createImageToPngConverter(FileFormat.WEBP),
  createImageToPngConverter(FileFormat.BMP),
];
