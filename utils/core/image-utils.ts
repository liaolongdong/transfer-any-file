import type { ImageOutputOptions } from '~/utils/core/types';
import { MAX_CANVAS_EDGE, clampMaxEdge, clampQuality, clampTargetSizeKB } from '~/utils/core/output-options';

/** Largest canvas side to allocate; re-exported from the output-options limit so the two agree. */
export const MAX_DIM = MAX_CANVAS_EDGE;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('errors.imageDecode'));
    img.src = src;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
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

/**
 * Free a canvas's backing store as soon as it is no longer needed.
 *
 * The pixel buffer is `width * height * 4` bytes and lives as long as the element is reachable, so
 * simply losing the reference is not enough inside a converter that still holds it in scope. A tall
 * document rasterized at 2x pixelRatio (800×20000 CSS px) is around 1.3 GB, and the per-page slice
 * canvases add up on top of that — this is what turns a large HTML→PDF into an out-of-memory tab.
 */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/** Encoders that have a quality dial; `toBlob` ignores the argument for every other mime type. */
const LOSSY_MIME_TYPES = new Set(['image/jpeg', 'image/webp']);

/** Qualities walked downwards while chasing `targetSizeKB`, after the user's own value. */
const CHASE_QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4];

/** Rescales walked once the quality ladder alone cannot reach the target size. */
const CHASE_SCALES = [0.8, 0.65, 0.5, 0.4];

/** Quality used by the rescale passes — the tail of the ladder above, so size keeps shrinking. */
const CHASE_RESAMPLE_QUALITY = 0.4;

/**
 * Copy a canvas into a new one at `scale` of its size, keeping at least one pixel per side.
 *
 * The caller owns the returned canvas and must {@link releaseCanvas} it; `imageSmoothingQuality`
 * is set to `high` because this path is what a 6000px photo becomes when the user asks for 1280px,
 * and a bilinear downscale of that ratio visibly aliases.
 */
function resampleCanvas(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(canvas.width * scale));
  out.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = out.getContext('2d');
  if (!ctx) {
    releaseCanvas(out);
    throw new Error('errors.imageEncode');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/**
 * Encode a canvas to `mimeType`, honouring the user's output parameters.
 *
 * The single funnel every image-producing step goes through, so the four of them (image→image,
 * SVG→image, HTML→image, PDF→image) cannot drift apart on what "quality 70" means. `maxEdge`
 * downscales first, `quality` is passed straight to the encoder, and `targetSizeKB` walks the
 * quality ladder before it starts throwing pixels away — but it is a ceiling chased, never
 * guaranteed, so the smallest result is returned rather than an error when the target is
 * unreachable. The last two are lossy-container levers: a PNG has no quality dial, and the panel
 * offers it no target size either, so neither may act on one.
 *
 * Returns the exact bytes the previous callers produced when `options` carries nothing: each field
 * is checked for presence instead of defaulted, keeping untouched batches byte-identical.
 */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  options?: ImageOutputOptions,
): Promise<Blob> {
  // Re-clamped here rather than trusted from the picker: these values also arrive from storage.
  const quality = clampQuality(options?.quality);
  const maxEdge = clampMaxEdge(options?.maxEdge);
  const targetKB = clampTargetSizeKB(options?.targetSizeKB);
  const targetBytes = targetKB === undefined ? undefined : Math.round(targetKB * 1024);

  let sized: HTMLCanvasElement | null = null;
  try {
    const edge = Math.max(canvas.width, canvas.height);
    if (maxEdge !== undefined && edge > maxEdge) sized = resampleCanvas(canvas, maxEdge / edge);
    const source = sized ?? canvas;

    const best = await canvasToBlob(source, mimeType, quality);
    // A target size is a lossy-container lever: the panel only offers it for JPEG / WebP, so a value
    // left behind by an earlier target must not start throwing pixels away on a PNG that cannot show
    // it, let alone clear it.
    const lossy = LOSSY_MIME_TYPES.has(mimeType);
    if (targetBytes === undefined || !lossy || best.size <= targetBytes) return best;

    let closest = best;
    let lastQuality = quality;

    for (const candidate of CHASE_QUALITIES) {
      if (quality !== undefined && candidate >= quality) continue;
      const attempt = await canvasToBlob(source, mimeType, candidate);
      lastQuality = candidate;
      if (attempt.size < closest.size) closest = attempt;
      if (attempt.size <= targetBytes) return attempt;
    }

    for (const scale of CHASE_SCALES) {
      const next = resampleCanvas(source, scale);
      try {
        const useQuality = Math.min(lastQuality ?? 1, CHASE_RESAMPLE_QUALITY);
        const attempt = await canvasToBlob(next, mimeType, useQuality);
        if (attempt.size < closest.size) closest = attempt;
        if (attempt.size <= targetBytes) return attempt;
      } finally {
        releaseCanvas(next);
      }
    }

    return closest;
  } finally {
    if (sized) releaseCanvas(sized);
  }
}
