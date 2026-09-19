import { FileFormat } from '~/utils/core/types';
import type { ConvertContext, Converter, ConvertResult } from '~/utils/core/types';
import { encodeCanvas, releaseCanvas } from '~/utils/core/image-utils';
import { decodeTextBlobLenient } from '~/utils/core/text-decode';
import { renderHtmlToCanvas } from '~/utils/core/html-raster';

export const htmlToPngConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.PNG,
  // Explicitly behind html→pdf for tied image targets; see html-to-pdf.ts.
  edgePreference: 10,

  async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
    // A GBK-exported HTML file is unreadable as UTF-8, and the rasterizer would happily
    // turn the mojibake into a picture of mojibake.
    const htmlContent = await decodeTextBlobLenient(input);
    const canvas = await renderHtmlToCanvas(htmlContent, ctx?.signal);

    try {
      const pngBlob = await encodeCanvas(canvas, 'image/png', ctx?.options);
      return { blob: pngBlob, filename: 'converted.png' };
    } finally {
      releaseCanvas(canvas);
    }
  },
};
