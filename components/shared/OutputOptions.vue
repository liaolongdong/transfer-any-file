<script setup lang="ts">
import { computed } from 'vue';
import type { ImageOutputOptions } from '~/utils/core/types';
import { FileFormat } from '~/utils/core/types';
import {
  isImageOutputFormat,
  isLossyImageFormat,
  hasOutputOptions,
  DEFAULT_PDF_DPI,
} from '~/utils/core/output-options';
import { useOutputOptions } from '~/composables/useOutputOptions';
import { useI18n } from '~/composables/useI18n';

const props = withDefaults(
  defineProps<{
    targetFormat: FileFormat | null;
    /** Distinct source formats of the batch, used to decide whether DPI means anything. */
    sourceFormats: FileFormat[];
    /** Locked while a batch is running: the orchestrator re-reads the options per file. */
    disabled?: boolean;
  }>(),
  { disabled: false },
);

type OptionKey = keyof ImageOutputOptions;

/**
 * Sentinel for "leave this alone".
 *
 * Element Plus treats `''`, `null` and `undefined` as an empty select and falls back to the
 * placeholder, which would render the most common state — no output tuning — as a blank box.
 */
const OFF = 'off';

interface Choice {
  value: number | typeof OFF;
  label: string;
}

interface Field {
  key: OptionKey;
  label: string;
  value: number | typeof OFF;
  choices: Choice[];
}

const { options, setOption, resetOptions } = useOutputOptions();
const { t } = useI18n();

/** The panel exists only while the target is an image — nothing else has these levers. */
const visible = computed(() => isImageOutputFormat(props.targetFormat));
const lossy = computed(() => isLossyImageFormat(props.targetFormat));
/** DPI only affects PDF rasterization, so it is hidden for a batch that cannot reach it. */
const hasPdfSource = computed(() => props.sourceFormats.includes(FileFormat.PDF));

function numbered(values: number[], format: (value: number) => string, offLabel: string, current?: number): Choice[] {
  const choices = values.map(value => ({ value, label: format(value) }));
  // A value that is legal but not on the dial still has to be shown: an empty box next to a
  // live parameter tells the user the opposite of the truth.
  if (current !== undefined && !choices.some(choice => choice.value === current)) {
    choices.unshift({ value: current, label: format(current) });
  }
  return [{ value: OFF, label: offLabel }, ...choices];
}

const fields = computed<Field[]>(() => {
  const current = options.value;
  const list: Field[] = [];

  if (lossy.value) {
    list.push({
      key: 'quality',
      label: t('output.quality'),
      value: current.quality ?? OFF,
      choices: numbered(
        [0.9, 0.8, 0.7, 0.6, 0.5, 0.4],
        v => t('output.percent', { value: Math.round(v * 100) }),
        t('output.qualityDefault'),
        current.quality,
      ),
    });
  }

  list.push({
    key: 'maxEdge',
    label: t('output.maxEdge'),
    value: current.maxEdge ?? OFF,
    choices: numbered(
      [4096, 2560, 1920, 1600, 1280, 800],
      v => t('output.pixels', { value: v }),
      t('output.edgeOriginal'),
      current.maxEdge,
    ),
  });

  if (lossy.value) {
    list.push({
      key: 'targetSizeKB',
      label: t('output.targetSize'),
      value: current.targetSizeKB ?? OFF,
      choices: numbered(
        [2000, 1000, 500, 200, 100, 50, 20],
        v => t('output.kilobytes', { value: v }),
        t('output.sizeNone'),
        current.targetSizeKB,
      ),
    });
  }

  if (hasPdfSource.value) {
    list.push({
      key: 'dpi',
      label: t('output.dpi'),
      value: current.dpi ?? OFF,
      choices: numbered(
        [300, 200, DEFAULT_PDF_DPI, 96],
        v => t('output.dpiValue', { value: v }),
        t('output.dpiDefault'),
        current.dpi,
      ),
    });
  }

  return list;
});

const showReset = computed(() => hasOutputOptions(options.value));

/** The OFF sentinel and any non-number both mean "clear the field", which is how absence is stored. */
async function handleFieldChange(key: OptionKey, raw: unknown): Promise<void> {
  await setOption(key, typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined);
}
</script>

<template>
  <div
    v-if="visible"
    class="output-options"
  >
    <el-tooltip
      :content="t('output.hint')"
      placement="top"
    >
      <span class="output-title">{{ t('output.title') }}</span>
    </el-tooltip>
    <label
      v-for="field in fields"
      :key="field.key"
      class="output-field"
    >
      <span class="output-label">{{ field.label }}</span>
      <el-select
        :model-value="field.value"
        size="small"
        class="output-select"
        :disabled="disabled"
        @change="handleFieldChange(field.key, $event)"
      >
        <el-option
          v-for="choice in field.choices"
          :key="String(choice.value)"
          :label="choice.label"
          :value="choice.value"
        />
      </el-select>
    </label>
    <el-button
      v-if="showReset"
      link
      type="primary"
      size="small"
      class="output-reset"
      :disabled="disabled"
      @click="resetOptions()"
    >
      {{ t('output.reset') }}
    </el-button>
  </div>
</template>

<style scoped>
.output-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--fat-border-light);
}

.output-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fat-text-secondary);
  cursor: help;
}

.output-field {
  display: flex;
  gap: 6px;
  align-items: center;
}

.output-label {
  font-size: 12px;
  color: var(--fat-text-secondary);
  white-space: nowrap;
}

.output-select {
  width: 96px;
}

.output-reset {
  font-size: 12px;
}
</style>
