<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import { queueCollapsedWrite, readCollapsedState } from '~/utils/core/collapsed-state';

const props = withDefaults(
  defineProps<{
    title: string;
    /** Initial expanded state, used only when no persisted state exists. */
    defaultOpen?: boolean;
    /**
     * Optional stable identifier; when set, the open/closed state is persisted
     * under STORAGE_KEYS.collapsedState and restored on next mount.
     */
    cardId?: string;
  }>(),
  { defaultOpen: true, cardId: '' },
);

const isOpen = ref(props.defaultOpen);
let persistDebounce: ReturnType<typeof setTimeout> | undefined;
let isMounted = false;
let userInteracted = false;

function toggle(): void {
  userInteracted = true;
  isOpen.value = !isOpen.value;
}

onMounted(async () => {
  isMounted = true;
  if (!props.cardId) return;
  const map = await readCollapsedState();
  // A click that lands while the read is in flight wins over the value it returns,
  // otherwise restoring late both reverts the panel and persists the stale state back.
  if (userInteracted) return;
  if (props.cardId in map) {
    isOpen.value = Boolean(map[props.cardId]);
  }
});

onUnmounted(() => {
  isMounted = false;
  if (persistDebounce !== undefined) {
    clearTimeout(persistDebounce);
    persistDebounce = undefined;
  }
});

watch(isOpen, value => {
  // Only a click has something to persist. The restore in `onMounted` fires this watcher too whenever
  // the stored value differs from `defaultOpen`, and writing back what was just read costs a read and
  // a write just after the first paint, for no change on disk.
  if (!props.cardId || !userInteracted) return;
  clearTimeout(persistDebounce);
  persistDebounce = setTimeout(() => {
    persistDebounce = undefined;
    // The component may have unmounted between the debounce and the callback
    if (!isMounted) return;
    queueCollapsedWrite(props.cardId, value);
  }, 200);
});
</script>

<template>
  <div class="collapsible-card">
    <button
      type="button"
      class="collapsible-head"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="collapsible-title">
        <slot name="title-icon" />
        {{ title }}
      </span>
      <span class="collapsible-side">
        <slot name="extra" />
        <el-icon
          :size="14"
          class="chevron"
          :class="{ open: isOpen }"
        >
          <ArrowDown />
        </el-icon>
      </span>
    </button>
    <!-- 0fr ↔ 1fr on a single grid row, so the panel grows to its own content height without a
         measured pixel value and without a `max-height` guess. The head used to be the only thing
         that moved: `v-show` snapped `display` on and off in one frame while the chevron rotated
         over 0.18s, so the animation contradicted the layout change instead of explaining it.

         This replaces `v-show`, and a clipped subtree is not the same as a removed one — content
         off-screen by `overflow` alone stays in the accessibility tree and stays in the tab order.
         `visibility` is what closes that gap, and it is worth being explicit about the mechanism:
         `visibility` transitions in one discrete step at whichever end of the duration the delay
         puts it there. On expand the delay is zero, so the content is available the moment the row
         starts growing; on collapse it is held visible for the length of the animation and hidden
         only once the row has closed. Both numbers come from the same token, so the reduced-motion
         blanket in global.css — which zeroes delays as well as durations — keeps the two in step. -->
    <div
      class="collapsible-panel"
      :class="{ open: isOpen }"
    >
      <div class="collapsible-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.collapsible-card {
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-lg);
  box-shadow: var(--fat-shadow-sm);
  overflow: hidden;
}

.collapsible-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-md);
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: var(--fat-text-regular);
  transition: var(--fat-transition);
}

.collapsible-head:hover {
  background: var(--fat-bg-page);
}

.collapsible-head:focus-visible {
  outline: 2px solid var(--fat-primary);
  outline-offset: -2px;
}

.collapsible-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.collapsible-side {
  display: inline-flex;
  align-items: center;
  gap: var(--fat-space-xs);
}

/* The chevron and the panel are one gesture, so they share one duration: rotating in 0.18s while
   the row closed in 0.25s left the arrow settled and the content still moving. */
.chevron {
  color: var(--fat-text-placeholder);
  transition: transform var(--fat-duration-slow) var(--fat-ease-standard);
}

.chevron.open {
  transform: rotate(180deg);
}

.collapsible-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--fat-duration-slow) var(--fat-ease-standard);
}

.collapsible-panel.open {
  grid-template-rows: 1fr;
}

/* A grid item's automatic minimum size is `min-content`, so without `min-height: 0` the closed
   `0fr` track clamps to the content height and the panel never actually closes. Opacity rides
   along with the height so a long card fades out at its end rather than shearing its own text off
   at the clip edge; it leads on the way in and trails on the way out, matching the asymmetry the
   rest of the workbench uses.

   The clip is `clip` + `overflow-clip-margin`, not `hidden`, because it stays in place once the
   panel is open — and this body has no top padding, so the first control in any card sits flush
   against the clip edge, where a plain `hidden` would shave the top half off its focus ring. The
   margin adds the ring's own extent back to the clip rect; the closed state cannot leak through it
   because `visibility: hidden` removes the subtree from painting entirely, in both motion tiers.
   `hidden` stays above `clip` as a parse-time fallback: `clip` reached Chrome 90, this manifest
   declares no minimum, and a dropped declaration would fall back to `visible` — a panel that no
   longer clips is a panel that never closes.

   What taking `visibility` over `display` costs, measured so this does not have to be re-derived: a
   `display: none` subtree is laid out by nobody, and a `visibility: hidden` one still is. On a
   50-row panel, a layout pass that invalidates the panel goes from 0.02ms to 0.8ms (headless Chrome,
   1280×900, 300 forced reflows) — i.e. a closed card now costs what an open one does. That is paid
   only when the subtree is invalidated (resize, a language switch, a history row appended), never
   per frame, which is the trade the growth animation is worth. `content-visibility: hidden` would
   skip that layout and was tried: it cannot be held open across the collapse, because the discrete
   flip lands on the first frame regardless of the delay, `transition-behavior: allow-discrete`
   included, so the row would animate an empty box shut. Getting both back would take a
   `transitionend` state machine around the resting value, and the failure modes it adds (a missed
   end event leaves the card blank) cost more than 0.8ms on a resize frame. */
.collapsible-body {
  overflow: hidden;
  overflow: clip;
  overflow-clip-margin: var(--fat-focus-ring-inset);
  min-height: 0;
  padding: 0 var(--fat-space-md) var(--fat-space-md);
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0s linear var(--fat-duration-slow),
    opacity var(--fat-duration-base) var(--fat-ease-leave);
}

.collapsible-panel.open .collapsible-body {
  visibility: visible;
  opacity: 1;
  transition:
    visibility 0s linear,
    opacity var(--fat-duration-slow) var(--fat-ease-enter);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
