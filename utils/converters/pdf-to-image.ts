import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { zipSync } from 'fflate';
import type { Zippable } from 'fflate';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { MAX_DIM, canvasToBlob } from '~/utils/core/image-utils';

/** Base render scale at 72dpi PDF units (2 ≈ 144dpi output) */
const BASE_SCALE = 2;

const pdfToPngConverter: Converter = {
  from: FileFormat.PDF,
  to: FileFormat.PNG,

  async convert(input: Blob): Promise<ConvertResult> {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    const arrayBuffer = await input.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    const pagePngs: Array<Uint8Array> = [];

    try {
      const pdf = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        // Cap the scale so very large pages stay within canvas limits
        const scale = Math.min(
          BASE_SCALE,
          MAX_DIM / baseViewport.width,
          MAX_DIM / baseViewport.height,
        );
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('errors.imageEncode');

        // PDF pages may have transparent backgrounds; fill white first
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas, viewport }).promise;

        const blob = await canvasToBlob(canvas, 'image/png');
        pagePngs.push(new Uint8Array(await blob.arrayBuffer()));
      }
    } catch (error) {
      console.error('PDF to PNG conversion failed:', error);
      throw new Error('errors.imageEncode', { cause: error });
    } finally {
      await loadingTask.destroy();
    }

    if (pagePngs.length === 0) {
      throw new Error('errors.imageEncode');
    }

    if (pagePngs.length === 1) {
      const blob = new Blob([pagePngs[0] as BlobPart], { type: 'image/png' });
      return { blob, filename: 'converted.png' };
    }

    // Multi-page PDFs export one PNG per page inside a ZIP
    const entries: Zippable = {};
    pagePngs.forEach((bytes, index) => {
      entries[`page-${index + 1}.png`] = bytes;
    });
    const zipped = zipSync(entries, { level: 6 });
    const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
    return { blob, filename: 'converted.zip' };
  },
};

export default pdfToPngConverter;
