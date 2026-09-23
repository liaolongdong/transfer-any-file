<script setup lang="ts">
import { useI18n } from '~/composables/useI18n';

/**
 * The "how far into this file are we" line, shared by both progress hosts.
 *
 * A conversion is a chain, not a step: MD→PDF is `md→html` then `html→pdf`, and the per-file bar
 * cannot move until the whole chain returns. Before this, the only motion on a single-file
 * multi-step conversion was a spinner. The orchestrator already counts steps to record which one
 * failed in the diagnostics panel, so this publishes numbers that exist rather than adding a second
 * source of truth.
 *
 * The parent decides whether to render it, and only does so above one step — a single-step route
 * gains no line, so the common case looks exactly as it did before.
 */
defineProps<{
  /** 1-indexed position inside the current file's chain. */
  current: number;
  /** Steps the resolved path has; values ≤ 1 mean there is nothing to break down. */
  total: number;
}>();

const { t } = useI18n();
</script>

<template>
  <p class="step-progress">
    {{ t('convert.stepProgress', { current, total }) }}
  </p>
</template>

<style scoped>
/* `tabular-nums` keeps the line from jittering sideways as "1 / 3" becomes "2 / 3" — the widths
   stay put, which matters on a surface that redraws once per step. */
.step-progress {
  margin: 0;
  font-size: 12px;
  color: var(--fat-text-secondary);
  font-variant-numeric: tabular-nums;
}
</style>
