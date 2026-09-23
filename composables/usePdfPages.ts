import { computed, ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { MAX_PAGE_RANGE_SPEC, clampPageRangeSpec } from '~/utils/core/pdf-pages';

/**
 * Module-level singleton, like `useOutputOptions`: the output panel writes here and the conversion
 * orchestrator reads once per batch, so the selection needs no prop drilling.
 *
 * **Deliberately not persisted.** The value is a statement about the file currently loaded — "of
 * this PDF, take pages 1–3" — not a preference about how output should look. Saved to storage it
 * would survive a reload and silently truncate the next unrelated document, so session scope keeps
 * the safe default (the whole document) what a fresh session starts from, and it costs the mount
 * gate no extra `storage.local` round trip.
 *
 * Kept out of `ImageOutputOptions` for the same reason one level down: presets snapshot that object,
 * and a remembered "PNG at 1280 px" card must not carry a page selection into a different document.
 *
 * Three consumers, listed because they have to agree on when a selection is allowed to act —
 * `OutputOptions.vue` renders the field under that condition, `useConversion` reads it under the
 * same one plus "this file is the PDF", and `pdf-to-image` is the only converter that looks:
 */
const pageRange: Ref<string> = ref('');

export function usePdfPages() {
  /**
   * Whether a selection the converter must honor is in effect — i.e. {@link pageRange} holds
   * something that survives the boundary trim.
   *
   * `"   "` is the state after a user clears the field without releasing the caret: as text it is
   * still a page selection, which is exactly what `parsePageRange` reports as "nothing in it matches
   * this document" — a failure. Anything that asks "is a range in effect?" has to trim first, and
   * `clampPageRangeSpec` is the one place that rule lives.
   */
  const pageRangeSelected: ComputedRef<boolean> = computed(() => clampPageRangeSpec(pageRange.value).length > 0);

  /**
   * Store what the field holds, bounded but otherwise untouched.
   *
   * No trimming here: the input is controlled, so rewriting a value the user just typed moves their
   * caret — and a spec of `"1 3"` starts life as `"1 "`, which the trim would eat mid-keystroke.
   * `clampPageRangeSpec` runs again on read, which is where the whitespace actually gets handled.
   */
  function setPageRange(value: string): void {
    pageRange.value = typeof value === 'string' ? value.slice(0, MAX_PAGE_RANGE_SPEC) : '';
  }

  return { pageRange, pageRangeSelected, setPageRange };
}
