<script setup lang="ts">
import { computed } from 'vue';
import { Right } from '@element-plus/icons-vue';
import { FileFormat } from '~/utils/core/types';
import type { FileFormat as FileFormatType } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory } from '~/utils/core/format-labels';
import { converterRegistry } from '~/utils/core/registry';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{
  sourceFormats: FileFormat[];
  availableTargets: FileFormat[];
  targetFormat: FileFormat | null;
}>();

const emit = defineEmits<{
  (e: 'update:targetFormat', format: FileFormat): void;
}>();

const { t } = useI18n();

const hasSource = computed(() => props.sourceFormats.length > 0);
const isMixed = computed(() => props.sourceFormats.length > 1);

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  document: 'format.categoryDocument',
  image: 'format.categoryImage',
  data: 'format.categoryData',
};

const formatGroups = computed(() => {
  const groups: Record<string, FileFormatType[]> = {};
  for (const format of props.availableTargets) {
    const category = getFormatCategory(format);
    if (!groups[category]) groups[category] = [];
    groups[category].push(format);
  }
  return Object.entries(groups).map(([key, options]) => ({
    label: t(CATEGORY_LABEL_KEYS[key] ?? key),
    options,
  }));
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
            v-for="group in formatGroups"
            :key="group.label"
            :label="group.label"
          >
            <el-option
              v-for="format in group.options"
              :key="format"
              :label="getFormatLabel(format)"
              :value="format"
            />
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
