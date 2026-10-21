import type { jsPDF } from 'jspdf';
import { FileFormat } from '~/utils/core/types';
import type { ConvertResult } from '~/utils/core/types';
import { hasMultipleFrames } from '~/utils/core/animated-image';
import { loadImage, MAX_DIM, releaseCanvas } from '~/utils/core/image-utils';
import { throwIfAborted } from '~/utils/core/abort';

/**
 * Shared image → PDF page pipeline.
 *
 * Both single-image converters and the merged-PDF builder go through here, so the encoding decision
 * per format exists exactly once: PNG keeps its own pixels, JPEG is passed through as a DCT, and the
 * three formats the browser cannot hand to jsPDF directly (WebP / BMP / GIF) are decoded and
 * re-encoded on a white-filled canvas.
 */

/** Ceiling for one merged document; the file list itself is capped at the same number. */
export const MAX_MERGED_PAGES = 200;

/** Formats the merged mode accepts. SVG is excluded: it rasterizes through a different route. */
export const MERGEABLE_IMAGE_FORMATS: ReadonlySet<FileFormat> = new Set([
  FileFormat.PNG,
  FileFormat.JPG,
  FileFormat.WEBP,
  FileFormat.BMP,
  FileFormat.GIF,
]);

/** A page decoded and sized, with `release` freeing the object URL a PNG pass-through still holds. */
export interface PdfImagePage {
  source: string;
  format: 'PNG' | 'JPEG';
  widthPt: number;
  heightPt: number;
  lostFrames: boolean;
  release: () => void;
}

function pointsOf(px: number): number {
  return (px * 72) / 96;
}

function orientationOf(widthPt: number, heightPt: number): 'landscape' | 'portrait' {
  return widthPt > heightPt ? 'landscape' : 'portrait';
}

/**
 * Downscale an oversized PNG and hand back a data URL.
 *
 * No white fill here: this branch keeps the source's transparency, which the pass-through path also
 * preserves, so a PNG must not gain a background just because it crossed the canvas limit.
 */
function downscalePngToDataUrl(img: HTMLImageElement, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    releaseCanvas(canvas);
    throw new Error('errors.imageEncode');
  }
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/png');
  releaseCanvas(canvas);
  return dataUrl;
}

export async function preparePdfImagePage(blob: Blob, from: FileFormat): Promise<PdfImagePage> {
  if (from === FileFormat.PNG) {
    const objectUrl = URL.createObjectURL(blob);
    let keepUrl = false;
    try {
      const img = await loadImage(objectUrl);

      // naturalWidth, not width: the latter reports a CSS-adjusted box once any style touches the
      // element, which would size the page from a number unrelated to the picture.
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width === 0 || height === 0) throw new Error('errors.imageDecode');

      if (width > MAX_DIM || height > MAX_DIM) {
        // Past the browser's canvas limits the PDF would be unrenderable, so this is the one case
        // where the source's own pixel grid is given up.
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        return {
          source: downscalePngToDataUrl(img, width, height),
          format: 'PNG',
          widthPt: pointsOf(width),
          heightPt: pointsOf(height),
          lostFrames: false,
          release: () => {},
        };
      }

      keepUrl = true;
      return {
        source: objectUrl,
        format: 'PNG',
        widthPt: pointsOf(width),
        heightPt: pointsOf(height),
        lostFrames: false,
        release: () => URL.revokeObjectURL(objectUrl),
      };
    } finally {
      if (!keepUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  // `drawImage` below keeps a single frame, which is a loss only if the source had a second one to
  // keep. See `utils/core/animated-image.ts` for the scope of that check.
  const lostFrames = from === FileFormat.GIF && (await hasMultipleFrames(blob));
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);

    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (width === 0 || height === 0) throw new Error('errors.imageDecode');
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // Re-encoding here is a choice, not a limitation: jsPDF 4.2.1 does carry WEBP and BMP decoders
    // (`processWEBP` / `processBMP`), but both force the pixels through a quality-100 JPEG, which
    // ignores the white fill added below, leaves no knob for quality, and writes a stream larger
    // than the source file it came from.
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      releaseCanvas(canvas);
      throw new Error('errors.imageEncode');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // `from` is the contract the converter is registered under. `blob.type` is sniffed from the
    // uploaded file and can be empty or wrong, and in a multi-step chain the intermediate blob
    // carries no type at all — either miss re-encodes a JPEG as lossless PNG and inflates the PDF.
    const isJpeg = from === FileFormat.JPG;
    const dataUrl = canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.92);
    releaseCanvas(canvas);

    return {
      source: dataUrl,
      format: isJpeg ? 'JPEG' : 'PNG',
      widthPt: pointsOf(width),
      heightPt: pointsOf(height),
      lostFrames,
      release: () => {},
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Append one prepared page.
 *
 * `first` uses the document's initial page (created by the constructor with this exact size);
 * every later page declares its own dimensions so a mixed-orientation batch keeps each picture's
 * shape instead of forcing every page to the first one's.
 *
 * The compression argument is what keeps a PNG payload from being written *uncompressed*: jsPDF's
 * `putImage` strips FlateEncode from the filter list and `checkCompressValue()` maps an omitted
 * argument to NONE, so the default stored the decoded samples raw — 9.5x–95.6x the source over the
 * five repo PNGs measured for the single-image path. 'FAST' rather than 'SLOW': a fixed Paeth filter
 * plus a level-9 deflate wins on flat pictures, loses on busy ones (20–35 % larger on a synthetic
 * grain pattern), and costs several times the synchronous encode time at sizes people actually
 * convert (4.2 s against 1.1 s over those files). Harmless on the JPEG branch, which is a DCT
 * pass-through and never reads the argument — measured on a real JPEG, the two PDFs differ only in
 * the 60 bytes of the trailer's `/ID`, image stream included.
 */
export function appendPdfImagePage(pdf: jsPDF, page: PdfImagePage, first: boolean): void {
  try {
    if (!first) {
      pdf.addPage([page.widthPt, page.heightPt], orientationOf(page.widthPt, page.heightPt));
    }
    pdf.addImage(page.source, page.format, 0, 0, page.widthPt, page.heightPt, undefined, 'FAST');
  } finally {
    page.release();
  }
}

/**
 * The single-image path, shared by every image format that reaches PDF directly.
 *
 * Kept here rather than in each converter so the page they write is byte-for-byte the page a merged
 * document would contain for the same input.
 */
export async function convertImageToPdf(blob: Blob, from: FileFormat): Promise<ConvertResult> {
  const { default: jsPDF } = await import('jspdf');
  const page = await preparePdfImagePage(blob, from);
  const pdf = new jsPDF({
    orientation: orientationOf(page.widthPt, page.heightPt),
    unit: 'pt',
    format: [page.widthPt, page.heightPt],
  });
  appendPdfImagePage(pdf, page, true);
  return { blob: pdf.output('blob'), filename: 'converted.pdf', lostFrames: page.lostFrames };
}

export interface MergedPdfImage {
  file: File;
  from: FileFormat;
}

export interface MergedPdfOutput {
  blob: Blob;
  pageCount: number;
  lostFrames: boolean;
}

/**
 * Which image broke a merged run.
 *
 * The builder is atomic, so the orchestrator records one failure for the whole group; without this
 * index that row would have to name the first image, and the diagnostic would point at a file that
 * decoded fine. `inner` is the thrown error itself so the caller's existing `causeDetailOf` can walk
 * it instead of this class duplicating that logic.
 */
export class MergedPdfPageError extends Error {
  constructor(
    readonly index: number,
    readonly inner: unknown,
  ) {
    super(inner instanceof Error && inner.message ? inner.message : 'errors.unknown');
    this.name = 'MergedPdfPageError';
  }
}

/**
 * Write every image into one PDF, one page per file.
 *
 * Pages are prepared and appended one at a time and each canvas is released before the next decode —
 * holding N full-size canvases would exceed what a 200-image batch is allowed to allocate. A cancel
 * between pages throws the whole document away; there is no partial output, which is why the caller
 * records nothing on that path.
 */
export async function buildMergedPdf(
  images: readonly MergedPdfImage[],
  signal: AbortSignal,
  onProgress?: (index: number, total: number) => void,
): Promise<MergedPdfOutput> {
  if (images.length === 0) throw new Error('errors.noFileOrTarget');
  if (images.length > MAX_MERGED_PAGES) throw new Error('errors.mergeTooManyPages');

  const { default: jsPDF } = await import('jspdf');
  let pdf: jsPDF | null = null;
  let lostFrames = false;

  for (let i = 0; i < images.length; i++) {
    throwIfAborted(signal);
    onProgress?.(i, images.length);
    let page: PdfImagePage;
    try {
      page = await preparePdfImagePage(images[i].file, images[i].from);
    } catch (e) {
      // An abort is the user's own doing, not this image's failure — let the orchestrator see the
      // bare `errors.cancelled` so it can end the batch instead of filing a diagnostic row.
      if (signal.aborted) throw e;
      throw new MergedPdfPageError(i, e);
    }
    lostFrames ||= page.lostFrames;
    if (!pdf) {
      pdf = new jsPDF({
        orientation: orientationOf(page.widthPt, page.heightPt),
        unit: 'pt',
        format: [page.widthPt, page.heightPt],
      });
      appendPdfImagePage(pdf, page, true);
    } else {
      appendPdfImagePage(pdf, page, false);
    }
  }

  // A cancel that arrives while the last page is being appended still has to win over a finished
  // document: the user asked for no output, and an atomic mode has nothing partial to fall back on.
  throwIfAborted(signal);
  if (!pdf) throw new Error('errors.noFileOrTarget');
  return { blob: pdf.output('blob'), pageCount: images.length, lostFrames };
}
