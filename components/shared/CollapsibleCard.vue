<script setup lang="ts">
import { ref } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    title: string;
    /** Initial expanded state */
    defaultOpen?: boolean;
  }>(),
  { defaultOpen: true },
);

const isOpen = ref(props.defaultOpen);

function toggle(): void {
  isOpen.value = !isOpen.value;
}
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
  transition: transform 0.2s ease;
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
