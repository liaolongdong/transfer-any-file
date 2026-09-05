<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowDown, ArrowRight, CircleCloseFilled, CopyDocument } from '@element-plus/icons-vue';
import type { ConversionFailure } from '~/composables/useConversion';
import { CONVERSION_ERROR_KEYS } from '~/composables/useConversion';
import { useI18n } from '~/composables/useI18n';
import { getFormatLabel } from '~/utils/core/format-labels';

const props = defineProps<{
  failure: ConversionFailure;
}>();

const { t } = useI18n();

const expanded = ref(false);

/** True when the failure has any diagnostic context worth showing. */
const hasPath = computed(() => props.failure.path.length >= 2);
const hasStep = computed(() => props.failure.failedStep !== undefined && props.failure.path.length >= 2);

/** Localised reason text — falls back to the raw string for non-i18n-key errors. */
const reasonText = computed(() => {
  const reason = props.failure.reason;
  return CONVERSION_ERROR_KEYS.has(reason) ? t(reason) : reason;
});

/** Per-segment data for rendering the chain with the failed step marked. */
const pathSegments = computed(() => {
  if (!hasPath.value) return [];
  return props.failure.path.map((format, idx) => {
    const isFailedStep =
      hasStep.value && props.failure.failedStep === idx;
    return {
      format,
      label: getFormatLabel(format),
      isSource: idx === 0,
      isTarget: idx === props.failure.path.length - 1,
      isFailedStep,
    };
  });
});

/** Total steps in the chain (path.length - 1). Inline getter so the template
 *  can read it as a plain number and pass it to t() without vue-tsc complaints. */
function getStepTotal(): number {
  return Math.max(0, props.failure.path.length - 1);
}

/** Localised "Step X of Y" text, empty when no failed step is recorded. */
const stepText = computed(() => {
  if (props.failure.failedStep === undefined) return '';
  return t('result.failureStepOf', { current: props.failure.failedStep, total: getStepTotal() });
});

/**
 * Plain-text diagnostic snapshot for the clipboard. Kept locale-free and
 * machine-parseable so a user can paste it into an issue and a maintainer
 * can grep it.
 */
function buildDiagnosticText(): string {
  const lines: string[] = [];
  lines.push(`file: ${props.failure.fileName}`);
  lines.push(`reason: ${props.failure.reason}`);
  if (hasPath.value) {
    lines.push(`path: ${props.failure.path.join(' -> ')}`);
  }
  if (hasStep.value) {
    lines.push(`failedStep: ${props.failure.failedStep} of ${getStepTotal()}`);
  }
  return lines.join('\n');
}

async function copyDiagnostic(): Promise<void> {
  const text = buildDiagnosticText();
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('result.diagnosticCopied'));
  } catch {
    // Clipboard API can be denied in some contexts; fall back to legacy execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      ElMessage.success(t('result.diagnosticCopied'));
    } catch {
      ElMessage.error(t('result.diagnosticCopyFail'));
    }
  }
}

function toggle(): void {
  expanded.value = !expanded.value;
}
</script>

<template>
  <div
    class="failure-item"
    :class="{ expanded }"
  >
    <div
      class="failure-summary"
      :aria-label="t('result.failureSummary', { file: failure.fileName })"
    >
      <el-icon
        :size="14"
        color="var(--el-color-danger)"
        class="failure-icon"
      >
        <CircleCloseFilled />
      </el-icon>
      <span
        class="failure-name"
        :title="failure.fileName"
      >{{ failure.fileName }}</span>
      <span class="failure-reason">{{ reasonText }}</span>
      <el-button
        v-if="hasPath"
        text
        size="small"
        type="primary"
        class="failure-toggle"
        :aria-expanded="expanded"
        @click="toggle"
      >
        {{ expanded ? t('result.collapseDetails') : t('result.expandDetails') }}
        <el-icon
          :size="12"
          class="failure-chevron"
        >
          <ArrowDown />
        </el-icon>
      </el-button>
    </div>

    <div
      v-if="expanded && hasPath"
      class="failure-details"
    >
      <div class="failure-path-row">
        <span class="failure-path-label">{{ t('result.failurePath') }}</span>
        <span class="failure-path">
          <template
            v-for="(seg, idx) in pathSegments"
            :key="idx"
          >
            <span
              class="path-segment"
              :class="{
                'is-source': seg.isSource,
                'is-target': seg.isTarget,
                'is-failed': seg.isFailedStep,
              }"
            >{{ seg.label }}</span>
            <el-icon
              v-if="idx < pathSegments.length - 1"
              :size="12"
              class="path-arrow"
            >
              <ArrowRight />
            </el-icon>
          </template>
        </span>
      </div>
      <div
        v-if="hasStep"
        class="failure-step-row"
      >
        <span class="failure-step-label">{{ t('result.failureAtStep') }}</span>
        <span class="failure-step">{{ stepText }}</span>
      </div>
      <div class="failure-actions">
        <el-button
          :icon="CopyDocument"
          size="small"
          text
          type="primary"
          @click="copyDiagnostic"
        >
          {{ t('result.copyDiagnostic') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.failure-item {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-xs);
  padding: var(--fat-space-xs) 0;
  border-bottom: 1px solid var(--fat-border-light, transparent);
}

.failure-item:last-child {
  border-bottom: none;
}

.failure-summary {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  font-size: 12px;
  flex-wrap: wrap;
}

.failure-icon {
  flex-shrink: 0;
}

.failure-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-color-danger);
  font-weight: 500;
}

.failure-reason {
  flex-shrink: 0;
  color: var(--el-color-danger);
}

.failure-toggle {
  flex-shrink: 0;
  margin-left: var(--fat-space-xs);
}

.failure-chevron {
  transition: transform 0.18s ease;
}

.failure-item.expanded .failure-chevron {
  transform: rotate(180deg);
}

.failure-details {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-xs);
  padding: var(--fat-space-xs) var(--fat-space-sm);
  margin-left: 22px;
  background: var(--fat-bg-hover);
  border-radius: var(--fat-radius-sm);
  font-size: 12px;
}

.failure-path-row,
.failure-step-row {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  flex-wrap: wrap;
}

.failure-path-label,
.failure-step-label {
  color: var(--fat-text-secondary);
  flex-shrink: 0;
}

.failure-path {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.path-segment {
  padding: 1px 6px;
  border-radius: var(--fat-radius-sm);
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-border);
  font-size: 11px;
  color: var(--fat-text-regular);
}

/* Source and target endpoints are highlighted identically; only the mid-path
   segments stay neutral. */
.path-segment.is-source,
.path-segment.is-target {
  border-color: var(--fat-primary-border, var(--fat-primary));
  color: var(--fat-primary);
}

.path-segment.is-failed {
  background: var(--el-color-danger-light-9, rgb(253 226 226));
  border-color: var(--el-color-danger);
  color: var(--el-color-danger);
  font-weight: 600;
}

.path-arrow {
  color: var(--fat-text-placeholder);
  flex-shrink: 0;
}

.failure-step {
  color: var(--el-color-danger);
  font-weight: 600;
}

.failure-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
