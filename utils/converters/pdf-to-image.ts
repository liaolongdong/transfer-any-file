import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { zipSync } from 'fflate';
import type { Zippable } from 'fflate';
import { FileFormat } from '~/utils/core/types';
import type { ConvertContext, Converter, ConvertResult } from '~/utils/core/types';
import { throwIfAborted } from '~/utils/core/abort';
import { MAX_DIM, encodeCanvas, releaseCanvas } from '~/utils/core/image-utils';
import { clampDpi, DEFAULT_PDF_DPI } from '~/utils/core/output-options';

/**
 * pdf.js renders at 1 unit per 1/72 inch, so a density in DPI is just `dpi / 72` in page scale.
 *
 * With no density set this returns {@link DEFAULT_PDF_DPI}, which is 2 — the scale this converter
 * used before the option existed, so an untouched batch still produces the same pixels.
 */
function pageScale(dpi?: number): number {
  return (clampDpi(dpi) ?? DEFAULT_PDF_DPI) / 72;
}

const MIME_TYPES: Partial<Record<FileFormat, string>> = {
  [FileFormat.PNG]: 'image/png',
  [FileFormat.JPG]: 'image/jpeg',
  [FileFormat.WEBP]: 'image/webp',
};

/**
 * PDF → raster converter factory.
 *
 * PNG, JPG and WEBP each get a direct edge: going through PNG first and re-encoding would pay
 * a full lossless round-trip only to lossy-compress afterwards, and the multi-page ZIP would
 * carry the wrong per-page extension.
 */
function createPdfToImageConverter(to: FileFormat): Converter {
  const mimeType = MIME_TYPES[to]!;
  return {
    from: FileFormat.PDF,
    to,

    async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
      const pdfjsLib = await import('pdfjs-dist');
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      }
      const arrayBuffer = await input.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

      // Parse failures get their own key: relabelling a corrupt PDF as "the browser cannot
      // encode this format" sends the user to the wrong fix, so the document load is hoisted
      // out of the render loop's try/catch below.
      let pdf: Awaited<typeof loadingTask.promise>;
      try {
        pdf = await loadingTask.promise;
      } catch (error) {
        await loadingTask.destroy();
        if (ctx?.signal?.aborted) throw new Error('errors.cancelled', { cause: error });
        throw new Error('errors.pdfParse', { cause: error });
      }

      const pageImages: Array<Uint8Array> = [];

      try {
        const renderScale = pageScale(ctx?.options?.dpi);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          // The only place cancellation can take effect: this loop is what makes a long PDF slow, and
          // the orchestrator has no way to interrupt it from outside.
          throwIfAborted(ctx?.signal);
          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          // Cap the scale so very large pages stay within canvas limits
          const scale = Math.min(renderScale, MAX_DIM / baseViewport.width, MAX_DIM / baseViewport.height);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          // Named apart from the `ctx` conversion context, which every converter now reserves.
          const canvasCtx = canvas.getContext('2d');
          if (!canvasCtx) throw new Error('errors.imageEncode');

          // PDF pages may have transparent backgrounds; fill white first
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

          try {
            await page.render({ canvas, viewport }).promise;

            const blob = await encodeCanvas(canvas, mimeType, ctx?.options);
            pageImages.push(new Uint8Array(await blob.arrayBuffer()));
          } finally {
            // The page is done with: its pixel buffer is the largest thing alive in this loop, and
            // `page.cleanup()` releases the font and image objects pdf.js caches per page.
            releaseCanvas(canvas);
            page.cleanup();
          }
        }
      } catch (error) {
        // Cancellation travels through the same catch as a real render failure. Relabelling it as
        // `imageEncode` would tell the user their browser cannot encode PNG because they hit cancel.
        if (ctx?.signal?.aborted) throw new Error('errors.cancelled', { cause: error });
        // The original failure travels with the thrown error via `cause`, so no
        // console output is needed here (runtime code must stay free of `console`).
        throw new Error('errors.imageEncode', { cause: error });
      } finally {
        await loadingTask.destroy();
      }

      if (pageImages.length === 0) {
        throw new Error('errors.imageEncode');
      }

      if (pageImages.length === 1) {
        const blob = new Blob([pageImages[0] as BlobPart], { type: mimeType });
        return { blob, filename: `converted.${to}`, containerExt: to };
      }

      // Multi-page PDFs export one image per page inside a ZIP
      const entries: Zippable = {};
      pageImages.forEach((bytes, index) => {
        entries[`page-${index + 1}.${to}`] = bytes;
      });
      const zipped = zipSync(entries, { level: 6 });
      const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
      // Declared rather than inferred: the nominal target is an image format, so without this the
      // caller would have to notice the ZIP by reading the extension out of `filename`.
      return { blob, filename: 'converted.zip', containerExt: 'zip' };
    },
  };
}

export const pdfToImageConverters: Converter[] = [
  createPdfToImageConverter(FileFormat.PNG),
  createPdfToImageConverter(FileFormat.JPG),
  createPdfToImageConverter(FileFormat.WEBP),
];
