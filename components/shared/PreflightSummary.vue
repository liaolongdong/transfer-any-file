<script setup lang="ts">
import { computed } from 'vue';
import { CircleCheck, WarningFilled, InfoFilled } from '@element-plus/icons-vue';
import { useI18n } from '~/composables/useI18n';
import type { PreflightReport } from '~/utils/core/preflight';

/**
 * The batch plan, stated before anything runs.
 *
 * It sits beside the target picker because that is the decision it describes, and it reports only
 * counts the run will actually honour: `ready` and `totalSteps` come from the same `resolvePath`
 * calls `useConversion` makes, so a file listed here as convertible cannot fail for a routing reason
 * a moment later. Caveats about what a route *keeps* stay in `FormatSelector` — repeating them here
 * would say the same thing twice, one line apart.
 */
const props = withDefaults(
  defineProps<{
    report: PreflightReport;
    /** Pages the merged PDF will have, or `null` when merge is off / unavailable. */
    mergedPages?: number | null;
    /** A staged GIF has more than one frame, so raster routes keep the first one only. */
    animatedGif?: boolean;
  }>(),
  { mergedPages: null, animatedGif: false },
);

const { t } = useI18n();

const hasWarning = computed(() => props.report.unreachable > 0 || props.animatedGif);
</script>

<template>
  <div
    class="preflight"
    :class="{ 'is-warning': hasWarning }"
  >
    <span class="preflight-title">
      <el-icon :size="13"><InfoFilled /></el-icon>
      {{ t('preflight.title') }}
    </span>
    <span
      v-if="report.ready > 0"
      class="pf-chip pf-chip--ok"
    >
      <el-icon :size="12"><CircleCheck /></el-icon>
      {{ t('preflight.ready', { count: report.ready }) }}
    </span>
    <span
      v-if="report.unreachable > 0"
      class="pf-chip pf-chip--warn"
    >
      <el-icon :size="12"><WarningFilled /></el-icon>
      {{ t('preflight.unreachable', { count: report.unreachable }) }}
    </span>
    <span
      v-if="report.multiStep > 0"
      class="pf-chip"
    >
      {{ t('preflight.multiStep', { count: report.multiStep, max: report.maxSteps }) }}
    </span>
    <span
      v-if="mergedPages !== null"
      class="pf-chip"
    >
      {{ t('preflight.merged', { pages: mergedPages }) }}
    </span>
    <span
      v-if="animatedGif"
      class="pf-chip pf-chip--warn"
    >
      <el-icon :size="12"><WarningFilled /></el-icon>
      {{ t('preflight.animatedGif') }}
    </span>
  </div>
</template>

<style scoped>
/* One quiet line, not another card: this is a read-out of the decision above it, so it borrows the
   action bar's own padding and only draws a hairline between the two. */
.preflight {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-xs) var(--fat-space-sm);
  margin-top: var(--fat-space-sm);
  padding-top: var(--fat-space-sm);
  border-top: 1px dashed var(--fat-border);
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.preflight-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: var(--fat-text-regular);
}

.pf-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-pill);
  background: var(--fat-surface-2);
  white-space: nowrap;
}

/* Green and amber are the two states the reader has to be able to tell apart at a glance. Both use
   the theme's own accent ink rather than a literal, so the six themes keep their contract, and the
   warning keeps a filled icon as well so the difference does not rest on hue alone. */
.pf-chip--ok {
  color: var(--fat-state-ink-success);
  border-color: var(--el-color-success-light-7);
  background: var(--el-color-success-light-9);
}

.pf-chip--warn {
  color: var(--fat-state-ink-warning);
  border-color: var(--el-color-warning-light-7);
  background: var(--el-color-warning-light-9);
}

@media (width <= 640px) {
  .preflight-title {
    width: 100%;
  }
}
</style>
