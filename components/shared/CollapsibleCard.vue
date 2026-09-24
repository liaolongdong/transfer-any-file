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
    <div
      v-show="isOpen"
      class="collapsible-body"
    >
      <slot />
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

.chevron {
  color: var(--fat-text-placeholder);
  transition: transform var(--fat-duration-base) var(--fat-ease-standard);
}

.chevron.open {
  transform: rotate(180deg);
}

.collapsible-body {
  padding: 0 var(--fat-space-md) var(--fat-space-md);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
