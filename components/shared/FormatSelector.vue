<script setup lang="ts">
import { computed } from 'vue';
import { Right } from '@element-plus/icons-vue';
import { FileFormat } from '~/utils/core/types';
import type { FileFormat as FileFormatType, FileCategory } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory, FORMAT_INFO } from '~/utils/core/format-labels';
import { converterRegistry } from '~/utils/core/registry';
import { getBlockedReason } from '~/utils/core/conversion-policy';
import { useI18n } from '~/composables/useI18n';

const props = withDefaults(
  defineProps<{
    sourceFormats: FileFormat[];
    availableTargets: FileFormat[];
    targetFormat: FileFormat | null;
    /** Most recently used targets, ordered newest-first. */
    recentTargets?: FileFormat[];
    /** Blocks target switching while a batch is running — mid-batch changes would clear the
     *  in-flight results and leave them re-labelled under the new target. */
    disabled?: boolean;
  }>(),
  { recentTargets: () => [], disabled: false },
);

const emit = defineEmits<{
  (e: 'update:targetFormat', format: FileFormat): void;
}>();

const { t } = useI18n();

const hasSource = computed(() => props.sourceFormats.length > 0);
const isMixed = computed(() => props.sourceFormats.length > 1);

const CATEGORY_LABEL_KEYS: Record<FileCategory, string> = {
  document: 'format.categoryDocument',
  image: 'format.categoryImage',
  data: 'format.categoryData',
};

/** Fixed display order keeps the dropdown layout stable regardless of the source */
const CATEGORY_ORDER: FileCategory[] = ['document', 'image', 'data'];

/** Every known format, so unsupported targets are shown greyed-out instead of hidden */
const ALL_FORMATS = Object.keys(FORMAT_INFO) as FileFormatType[];

/** Targets that are actually selectable: reachable in the graph AND semantically valid */
const selectableSet = computed(() => new Set(props.availableTargets));

/** Why an option is disabled: same as source, blocked by policy, or simply unreachable */
function disabledReason(format: FileFormatType): string {
  if (props.sourceFormats.includes(format)) return t('format.disabledSameSource');
  if (props.sourceFormats.length === 1) {
    const blocked = getBlockedReason(props.sourceFormats[0], format);
    if (blocked) return t(blocked);
  }
  return t('format.disabledUnsupported');
}

/** F17: recent targets that are still selectable for the current source. */
const recentOptions = computed<FileFormatType[]>(() => {
  return props.recentTargets.filter(f => selectableSet.value.has(f));
});

/** A format lives in exactly one group. Element Plus caches options by value, so rendering the same
 *  value twice (recent + category) leaves the category copy unregistered once the recent copy
 *  unmounts — selecting it then paints the raw enum (`html`) instead of the label (measured
 *  2026-10-17: every target that had dropped out of the six-entry recent list showed this). */
const recentSet = computed(() => new Set(recentOptions.value));

const formatGroups = computed(() => {
  const groups = new Map<FileCategory, FileFormatType[]>();
  for (const format of ALL_FORMATS) {
    if (recentSet.value.has(format)) continue;
    const category = getFormatCategory(format);
    const list = groups.get(category);
    if (list) list.push(format);
    else groups.set(category, [format]);
  }
  return CATEGORY_ORDER.filter(category => groups.has(category)).map(category => ({
    label: t(CATEGORY_LABEL_KEYS[category]),
    options: groups.get(category) ?? [],
  }));
});

const conversionPathLabels = computed(() => {
  if (!props.targetFormat || props.sourceFormats.length === 0) return [];
  // Each file in a mixed batch resolves its own chain, so no single path describes the batch.
  if (isMixed.value) return [];
  const source = props.sourceFormats[0];
  const steps = converterRegistry.findConversionPath(source, props.targetFormat);
  if (!steps || steps.length <= 1) return [];
  return steps.map(s => getFormatLabel(s.to));
});

function handleChange(format: FileFormat): void {
  emit('update:targetFormat', format);
}

/**
 * Why there is nothing to pick. The parent only mounts this component once a batch exists, so an
 * empty `sourceFormats` means none of those files was recognized — a different dead end from
 * "recognized, but no target they all share", and the fix differs too.
 */
const noTargetTitle = computed(() => (hasSource.value ? t('format.noTarget') : t('format.noRecognizedSource')));
</script>

<template>
  <div
    v-if="hasSource && availableTargets.length > 0"
    class="format-selector"
  >
    <div class="format-row">
      <div class="source-badge">
        <el-tag
          v-if="!isMixed"
          size="small"
          effect="plain"
        >
          {{ getFormatLabel(sourceFormats[0]) }}
        </el-tag>
        <el-tooltip
          v-else
          :content="sourceFormats.map(f => getFormatLabel(f)).join(' / ')"
          placement="top"
        >
          <el-tag
            size="small"
            effect="plain"
            type="warning"
          >
            {{ t('format.mixedSource', { count: sourceFormats.length }) }}
          </el-tag>
        </el-tooltip>
      </div>
      <el-icon
        :size="14"
        color="var(--fat-text-secondary)"
      >
        <Right />
      </el-icon>
      <div class="target-select">
        <el-select
          :model-value="targetFormat"
          :placeholder="t('format.selectTarget')"
          :aria-label="t('a11y.targetFormat')"
          filterable
          :disabled="disabled"
          :no-match-text="t('format.noMatch')"
          size="default"
          style="width: 100%"
          popper-class="fat-format-popper"
          @change="handleChange"
        >
          <el-option-group
            v-if="recentOptions.length > 0"
            :key="'recent'"
            :label="t('format.recentUsed')"
          >
            <el-option
              v-for="format in recentOptions"
              :key="`recent-${format}`"
              :label="getFormatLabel(format)"
              :value="format"
            >
              {{ getFormatLabel(format) }}
            </el-option>
          </el-option-group>
          <el-option-group
            v-for="group in formatGroups"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="format in group.options"
              :key="format"
              :label="getFormatLabel(format)"
              :value="format"
              :disabled="!selectableSet.has(format)"
            >
              <!-- `title` answers the mouse; the reason is also real, visible text inside the row.
                  It used to be `sr-only`, which left sighted keyboard users with no way to read why
                  an option was greyed out — a tooltip is not reachable without a pointer. The second
                  line does not affect the closed select, whose text comes from the `:label` prop. -->
              <span
                class="option-label"
                :title="selectableSet.has(format) ? undefined : disabledReason(format)"
              >
                {{ getFormatLabel(format) }}
              </span>
              <span
                v-if="!selectableSet.has(format)"
                class="option-reason"
              >
                {{ disabledReason(format) }}
              </span>
            </el-option>
          </el-option-group>
        </el-select>
      </div>
    </div>
    <Transition name="fat-expand">
      <div
        v-if="conversionPathLabels.length > 0"
        class="fat-expand path-hint-expand"
      >
        <div class="path-hint">
          <span class="path-label">{{ t('format.conversionPath') }}</span>
          <span class="path-steps">
            {{ getFormatLabel(sourceFormats[0]) }} → {{ conversionPathLabels.join(' → ') }}
          </span>
        </div>
      </div>
    </Transition>
  </div>
  <div
    v-else
    class="format-selector"
  >
    <el-alert
      :title="noTargetTitle"
      type="warning"
      :closable="false"
      show-icon
    />
  </div>
</template>

<style scoped>
.format-selector {
  width: 100%;
}

.format-row {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
}

.source-badge {
  flex-shrink: 0;
}

.target-select {
  flex: 1;
  min-width: 0;
}

/* The gap belongs to the expanding wrapper, not to `.path-hint`: `fat-expand` clamps the row to
   zero, but an item's own margin still displaces its clipped box, which would leave a 8px strip
   where the closed hint sits. See the note on `.fat-expand` in global.css. */
.path-hint-expand {
  margin-top: var(--fat-space-sm);
}

.path-hint {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  padding: var(--fat-space-xs) var(--fat-space-sm);
  background: var(--fat-primary-bg);
  border: 1px solid var(--fat-primary-border);
  border-radius: var(--fat-radius-sm);
  font-size: 12px;
}

.path-label {
  color: var(--fat-text-secondary);
  flex-shrink: 0;
}

.path-steps {
  color: var(--fat-primary);
  font-weight: 500;
  font-family: var(--fat-font-mono);
}

/* The dropdown is teleported to <body>, so scoped rules cannot reach it; the popper class is the
   stable hook. `height: auto` lets the reason wrap under the label instead of being clipped by
   Element Plus's fixed 34px option row, and `white-space: normal` undoes the library's nowrap —
   without it the reason extends past the row and is hidden by `overflow: hidden` rather than
   wrapping. `overflow-wrap` covers a token longer than the row itself. */
:global(.fat-format-popper .el-select-dropdown__item) {
  height: auto;
  min-height: 34px;
  line-height: 1.4;
  padding-top: 6px;
  padding-bottom: 6px;
  white-space: normal;
  overflow-wrap: anywhere;
}

:global(.fat-format-popper .el-select-dropdown__item .option-label) {
  display: block;
}

:global(.fat-format-popper .el-select-dropdown__item .option-reason) {
  display: block;
  font-size: 11px;
  color: var(--fat-text-secondary);
}
</style>
