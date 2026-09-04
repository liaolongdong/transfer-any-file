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
  }>(),
  { recentTargets: () => [] },
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

const formatGroups = computed(() => {
  const groups = new Map<FileCategory, FileFormatType[]>();
  for (const format of ALL_FORMATS) {
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

const conversionPathLabels = computed(() => {
  if (!props.targetFormat || props.sourceFormats.length === 0) return [];
  const source = props.sourceFormats[0];
  const steps = converterRegistry.findConversionPath(source, props.targetFormat);
  if (!steps || steps.length <= 1) return [];
  return steps.map(s => getFormatLabel(s.to));
});

function handleChange(format: FileFormat): void {
  emit('update:targetFormat', format);
}
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
        color="var(--fat-text-placeholder)"
      >
        <Right />
      </el-icon>
      <div class="target-select">
        <el-select
          :model-value="targetFormat"
          :placeholder="t('format.selectTarget')"
          size="default"
          style="width: 100%"
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
              <span :title="selectableSet.has(format) ? undefined : disabledReason(format)">
                {{ getFormatLabel(format) }}
              </span>
            </el-option>
          </el-option-group>
        </el-select>
      </div>
    </div>
    <div
      v-if="conversionPathLabels.length > 0"
      class="path-hint"
    >
      <span class="path-label">{{ t('format.conversionPath') }}</span>
      <span class="path-steps">
        {{ getFormatLabel(sourceFormats[0]) }} → {{ conversionPathLabels.join(' → ') }}
      </span>
    </div>
  </div>
  <div
    v-else-if="hasSource"
    class="format-selector"
  >
    <el-alert
      :title="t('format.noTarget')"
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

.path-hint {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  margin-top: var(--fat-space-sm);
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
</style>
