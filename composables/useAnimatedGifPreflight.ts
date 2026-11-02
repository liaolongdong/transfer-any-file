import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import { SNIFF_LIMIT, hasMultipleFrames } from '~/utils/core/animated-image';
import { detectFormat } from '~/utils/core/file-detect';
import { FileFormat } from '~/utils/core/types';

/**
 * How many bytes this scan may read before the user has asked for anything, counted in head reads.
 *
 * `hasMultipleFrames` stops at the second image descriptor, so an animated GIF is normally settled
 * inside the first window and only a *single*-frame file pays for more. Charging one window per file
 * therefore buys the coverage the budget is for — enough to answer eight GIFs before it runs out —
 * while the residual worst case stays a single full read, for the one file whose header was
 * inconclusive. A file the budget cannot cover is skipped and the smaller ones after it are still
 * examined; skipping is a false negative on the caveat, which is the cheaper of the two mistakes
 * before a conversion has even been requested.
 */
const GIF_PREFLIGHT_HEAD_BUDGET = 32 * 1024 * 1024;

/**
 * Whether the staged batch contains a GIF that actually has more than one frame.
 *
 * Feeds the preflight caveat in `FormatSelector`: a one-frame GIF loses nothing when a raster target
 * keeps the first frame, so the note must not fire on it. That distinction is read off the bytes for
 * the same reason the post-run disclosure reads them (`utils/core/animated-image.ts`, used by
 * `image-convert` and `image-pdf`) — an extension cannot tell the two apart.
 *
 * Kept out of `App.vue` because it is a side effect with its own cancellation, cache and budget; the
 * assembly layer only wires the result into the selector. Answers are cached per `File` in a `WeakMap`
 * so reordering or removing files re-reads nothing, and the scan returns at the first animated file.
 *
 * @param sourceFiles The staged files, as `useConversion` holds them.
 * @returns True while some staged file is an animated GIF.
 */
export function useAnimatedGifPreflight(sourceFiles: Ref<File[]>): Ref<boolean> {
  const hasAnimatedGif = ref(false);
  const gifFrameCache = new WeakMap<File, boolean>();
  let scanToken = 0;

  watch(
    sourceFiles,
    async files => {
      const token = ++scanToken;
      hasAnimatedGif.value = false;
      let budget = GIF_PREFLIGHT_HEAD_BUDGET;
      for (const file of files) {
        // A newer list landed while this scan was awaiting a read; what it finds is no longer the answer.
        if (token !== scanToken) return;
        if (detectFormat(file) !== FileFormat.GIF) continue;
        let animated = gifFrameCache.get(file);
        if (animated === undefined) {
          if (budget < SNIFF_LIMIT) continue;
          budget -= SNIFF_LIMIT;
          animated = await hasMultipleFrames(file).catch(() => false);
          if (token !== scanToken) return;
          gifFrameCache.set(file, animated);
        }
        if (animated) {
          hasAnimatedGif.value = true;
          return;
        }
      }
    },
    { immediate: true },
  );

  return hasAnimatedGif;
}
