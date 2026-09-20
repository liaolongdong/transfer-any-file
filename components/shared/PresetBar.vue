<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import type { ConversionPreset } from '~/utils/core/types';
import { FileFormat } from '~/utils/core/types';
import { isImageOutputFormat } from '~/utils/core/output-options';
import { MAX_PRESETS, PRESET_NAME_MAX, createPreset, describePreset } from '~/utils/core/presets';
import { useOutputOptions } from '~/composables/useOutputOptions';
import { usePresets } from '~/composables/usePresets';
import { useI18n } from '~/composables/useI18n';

const props = withDefaults(
  defineProps<{
    /** Format the save control captures; the control is inert until one is chosen. */
    targetFormat: FileFormat | null;
    /** Locked while a batch is running, like the rest of the workbench. */
    disabled?: boolean;
  }>(),
  { disabled: false },
);

// Applying is deliberately *not* decided here. Reachability depends on the current batch and on
// whether files have been added at all — both of which the workbench already owns, and which it
// handles the same way it handles a reused history record.
const emit = defineEmits<{
  (e: 'apply', preset: ConversionPreset): void;
}>();

const { options } = useOutputOptions();
const { presets, addPreset, removePreset } = usePresets();
const { t } = useI18n();

const nameDraft = ref('');

const hasRoom = computed(() => presets.value.length < MAX_PRESETS);

/**
 * Only image targets carry output parameters.
 *
 * The panel hides those controls for every other target, so capturing the live options for a
 * PDF→DOCX preset would store leftovers from an earlier image batch under a preset that cannot
 * show them — and quietly re-apply them the next time the user picks a PNG target.
 */
const optionsToCapture = computed(() =>
  props.targetFormat !== null && isImageOutputFormat(props.targetFormat) ? options.value : {},
);

const canSave = computed(() => hasRoom.value && props.targetFormat !== null && !props.disabled);

const saveTitle = computed(() => {
  if (props.targetFormat === null) return t('preset.needTarget');
  if (!hasRoom.value) return t('preset.limit', { max: MAX_PRESETS });
  return null;
});

async function handleSave(): Promise<void> {
  const target = props.targetFormat;
  if (target === null || !canSave.value) return;

  const preset = createPreset(nameDraft.value, target, optionsToCapture.value, t);
  nameDraft.value = '';
  await addPreset(preset);
  ElMessage.success(t('preset.saved', { name: preset.name }));
}

async function handleRemove(preset: ConversionPreset): Promise<void> {
  await removePreset(preset.id);
  ElMessage.info(t('preset.removed', { name: preset.name }));
}
</script>

<template>
  <div class="preset-bar">
    <div
      v-if="presets.length"
      class="preset-chips"
    >
      <span
        v-for="preset in presets"
        :key="preset.id"
        class="preset-chip"
      >
        <button
          type="button"
          class="preset-apply"
          :disabled="disabled"
          :title="describePreset(preset.target, preset.options, t)"
          @click="emit('apply', preset)"
        >
          {{ preset.name }}
        </button>
        <button
          type="button"
          class="preset-remove"
          :disabled="disabled"
          :aria-label="t('preset.remove', { name: preset.name })"
          @click="handleRemove(preset)"
        >
          <el-icon :size="12">
            <Delete />
          </el-icon>
        </button>
      </span>
    </div>
    <p
      v-else
      class="preset-empty"
    >
      {{ t('preset.empty') }}
    </p>

    <div class="preset-create">
      <template v-if="hasRoom">
        <el-input
          v-model="nameDraft"
          size="small"
          class="preset-name"
          :maxlength="PRESET_NAME_MAX"
          :placeholder="t('preset.namePlaceholder')"
          :disabled="disabled"
          @keyup.enter="handleSave"
        />
        <el-button
          size="small"
          type="primary"
          plain
          :icon="Plus"
          :disabled="!canSave"
          :title="saveTitle ?? undefined"
          @click="handleSave"
        >
          {{ t('preset.save') }}
        </el-button>
      </template>
      <span
        v-else
        class="preset-limit"
      >
        {{ t('preset.limit', { max: MAX_PRESETS }) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.preset-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-sm) var(--fat-space-md);
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fat-space-xs);
  min-width: 0;
}

.preset-chip {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-md);
  background: var(--fat-bg-page);
  transition: var(--fat-transition);
}

.preset-chip:hover {
  border-color: var(--fat-primary);
}

.preset-apply {
  max-width: 220px;
  padding: 4px var(--fat-space-sm);
  overflow: hidden;
  border: none;
  background: none;
  color: var(--fat-text-regular);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-apply:disabled {
  cursor: not-allowed;
  color: var(--fat-text-placeholder);
}

.preset-remove {
  display: inline-flex;
  align-items: center;
  padding: 4px 6px 4px 2px;
  border: none;
  background: none;
  color: var(--fat-text-secondary);
  cursor: pointer;
}

.preset-remove:hover:not(:disabled) {
  color: var(--el-color-danger);
}

.preset-remove:disabled {
  cursor: not-allowed;
}

.preset-apply:focus-visible,
.preset-remove:focus-visible {
  outline: 2px solid var(--fat-primary);
  outline-offset: -2px;
}

.preset-empty {
  flex: 1;
  min-width: 200px;
  margin: 0;
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.preset-create {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  margin-left: auto;
}

.preset-name {
  width: 150px;
}

.preset-limit {
  font-size: 12px;
  color: var(--fat-text-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .preset-chip {
    transition: none;
  }
}

@media (width <= 640px) {
  .preset-create {
    margin-left: 0;
  }
}
</style>
