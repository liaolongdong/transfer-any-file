import { FileFormat } from '~/utils/core/types';
import type { ImageOutputOptions } from '~/utils/core/types';

/**
 * Accepted domain for the image output parameters, plus the clamps that enforce it.
 *
 * Two consumers need the same rules: `useOutputOptions` sanitizes what comes back out of
 * `chrome.storage` (hand-edited or written by a future version), and the encoder re-checks before
 * trusting a number. Keeping the bounds here means the two can never disagree about what a legal
 * quality or longest edge is.
 */

/** Encoders are told to keep at least this much of a side — below it the picture is a thumbnail. */
const MIN_EDGE = 16;

/**
 * Largest canvas side the browser reliably allocates. A cap above it is not a cap, so
 * `clampMaxEdge` trims to the limit itself — and `MAX_DIM` in `image-utils.ts` re-exports this same
 * number, so the panel's ceiling and the encoders' safety clamp cannot drift apart.
 */
export const MAX_CANVAS_EDGE = 8192;

/** Below this density a PDF page stops being readable; above it the canvas limits take over anyway. */
const MIN_DPI = 72;
const MAX_DPI = 600;

/** Render density used when the user leaves DPI alone — matches the historical 2x pdf.js scale. */
export const DEFAULT_PDF_DPI = 144;

/** 1 KB .. 50 MB, which covers "under the 2 MB upload limit" through "essentially uncompressed". */
const MIN_TARGET_KB = 1;
const MAX_TARGET_KB = 50_000;

/** Formats whose encoder accepts a quality argument (PNG has none). */
const LOSSY_IMAGE_FORMATS: ReadonlySet<FileFormat> = new Set([FileFormat.JPG, FileFormat.WEBP]);

/** Formats the output-parameters panel is offered for. */
const IMAGE_OUTPUT_FORMATS: ReadonlySet<FileFormat> = new Set([FileFormat.PNG, ...LOSSY_IMAGE_FORMATS]);

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Encoder quality in `(0, 1]`, or `undefined` for "let the browser decide". */
export function clampQuality(value: unknown): number | undefined {
  const raw = positiveNumber(value);
  return raw === undefined ? undefined : Math.min(raw, 1);
}

/** Longest edge in pixels, trimmed into `[MIN_EDGE, MAX_CANVAS_EDGE]`. */
export function clampMaxEdge(value: unknown): number | undefined {
  const raw = positiveNumber(value);
  return raw === undefined ? undefined : Math.round(Math.min(Math.max(raw, MIN_EDGE), MAX_CANVAS_EDGE));
}

/** Render density for PDF sources, trimmed into `[72, 600]`. */
export function clampDpi(value: unknown): number | undefined {
  const raw = positiveNumber(value);
  return raw === undefined ? undefined : Math.min(Math.max(raw, MIN_DPI), MAX_DPI);
}

/** Target file size in kilobytes, trimmed into `[1, 50000]`. */
export function clampTargetSizeKB(value: unknown): number | undefined {
  const raw = positiveNumber(value);
  return raw === undefined ? undefined : Math.min(Math.max(raw, MIN_TARGET_KB), MAX_TARGET_KB);
}

/**
 * Reduce an untrusted value (a storage payload, typically) to a legal options object.
 *
 * Unknown keys are dropped and illegal fields are removed rather than coerced to a default: an
 * absent field is what "unchanged behaviour" looks like downstream, so guessing here would turn a
 * corrupt entry into a silent conversion the user did not ask for.
 */
export function sanitizeImageOutputOptions(value: unknown): ImageOutputOptions {
  if (typeof value !== 'object' || value === null) return {};
  const source = value as Record<string, unknown>;
  const next: ImageOutputOptions = {};

  const quality = clampQuality(source.quality);
  if (quality !== undefined) next.quality = quality;
  const maxEdge = clampMaxEdge(source.maxEdge);
  if (maxEdge !== undefined) next.maxEdge = maxEdge;
  const dpi = clampDpi(source.dpi);
  if (dpi !== undefined) next.dpi = dpi;
  const targetSizeKB = clampTargetSizeKB(source.targetSizeKB);
  if (targetSizeKB !== undefined) next.targetSizeKB = targetSizeKB;

  return next;
}

/** Whether the batch's target is an image, i.e. whether the output parameters apply at all. */
export function isImageOutputFormat(format: FileFormat | null): boolean {
  return format !== null && IMAGE_OUTPUT_FORMATS.has(format);
}

/** Whether an image format has a quality dial to expose for it. */
export function isLossyImageFormat(format: FileFormat | null): boolean {
  return format !== null && LOSSY_IMAGE_FORMATS.has(format);
}

/** True when any parameter is set, which is what the reset control is gated on. */
export function hasOutputOptions(options: ImageOutputOptions): boolean {
  return (
    options.quality !== undefined ||
    options.maxEdge !== undefined ||
    options.dpi !== undefined ||
    options.targetSizeKB !== undefined
  );
}

/**
 * Narrow the run's options to what one step of a multi-step chain may honour.
 *
 * `quality` and `targetSizeKB` describe the file the user downloads, so they belong to the last
 * encode only: PDF→JPEG rasterizes a PNG along the way, and chasing a 50 KB ceiling on that
 * intermediate spends a ladder of encodes throwing away detail the JPEG step would then have had.
 * `maxEdge` and `dpi` are geometric — an early cap is the same picture, less work — so they travel
 * with every step.
 */
export function optionsForStep(
  options: ImageOutputOptions | undefined,
  isFinalStep: boolean,
): ImageOutputOptions | undefined {
  if (!options || isFinalStep) return options;
  const next: ImageOutputOptions = {};
  if (options.maxEdge !== undefined) next.maxEdge = options.maxEdge;
  if (options.dpi !== undefined) next.dpi = options.dpi;
  return next;
}
