import { nextTick, ref } from 'vue';
import type { Ref } from 'vue';

/**
 * Proportionally mirror one scroll container onto another.
 *
 * Proportional rather than a raw `scrollTop` copy: the two panes almost never have the same content
 * height (an MD source and its rendered PDF differ by pages), and copying pixels would leave the
 * taller pane pinned at a fraction of its own length.
 */
function scrollProportionally(src: HTMLElement, dst: HTMLElement): void {
  const maxSrc = src.scrollHeight - src.clientHeight;
  const maxDst = dst.scrollHeight - dst.clientHeight;
  if (maxSrc > 0 && maxDst > 0) {
    dst.scrollTop = (src.scrollTop / maxSrc) * maxDst;
  }
}

/**
 * Two-way scroll sync between the comparison panes.
 *
 * Both directions share one `isSyncing` latch, which is what stops the panes from chasing each
 * other: writing `dst.scrollTop` fires `scroll` on the destination, whose own handler would write
 * back into the source, and so on. The latch is released on `nextTick` rather than immediately,
 * because the scroll event the write provokes arrives after the current handler returns.
 *
 * The null guards are load-bearing, not defensive noise: the panes are rendered with `v-if`, so a
 * panel that is off screen has no element behind its template ref, and a scroll event can still be
 * in flight while one side is being unmounted.
 */
export function useSyncedScroll(
  sourcePanel: Ref<HTMLElement | null>,
  resultPanel: Ref<HTMLElement | null>,
  enabled: Ref<boolean>,
) {
  const isSyncing = ref(false);

  function handleSourceScroll(): void {
    if (!enabled.value || isSyncing.value || !sourcePanel.value || !resultPanel.value) return;
    isSyncing.value = true;
    scrollProportionally(sourcePanel.value, resultPanel.value);
    nextTick(() => {
      isSyncing.value = false;
    });
  }

  function handleResultScroll(): void {
    if (!enabled.value || isSyncing.value || !sourcePanel.value || !resultPanel.value) return;
    isSyncing.value = true;
    scrollProportionally(resultPanel.value, sourcePanel.value);
    nextTick(() => {
      isSyncing.value = false;
    });
  }

  return { handleSourceScroll, handleResultScroll };
}
