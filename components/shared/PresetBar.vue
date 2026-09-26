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
    <TransitionGroup
      v-if="presets.length"
      tag="div"
      name="preset"
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
    </TransitionGroup>
    <Transition name="fat-fade">
      <p
        v-if="!presets.length"
        class="preset-empty"
      >
        {{ t('preset.empty') }}
      </p>
    </Transition>

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

/* Saving the first preset mounts the chip row while this hint is still fading out, and both are
   items of the wrapping `.preset-bar` — with `min-width: 200px` on a 12px line of text, the bar
   gains a row and everything below it shifts down for the length of the fade. Entering keeps the
   fade (nothing else occupies the slot then); leaving is a cut, since the row replacing it already
   carries the motion. Specificity is `.preset-empty` + the state class, so no `!important` is
   needed over the shared `.fat-fade-leave-active`. */
.preset-empty.fat-fade-leave-active {
  display: none;
  transition: none;
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

/* `addPreset` prepends, so without this the new chip materialises at the left and everything else
     teleports one slot to the right. `-move` is what turns that teleport into a slide, and the
     enter is scale+fade from `--fat-enter-scale` rather than a horizontal push because the row
     wraps: a chip landing on the second line has no left edge to arrive from. */
.preset-enter-active {
  transition:
    opacity var(--fat-duration-base) var(--fat-ease-standard),
    transform var(--fat-duration-base) var(--fat-ease-standard);
}

.preset-enter-from {
  opacity: 0;
  transform: scale(var(--fat-enter-scale));
}

/* A departing chip has nowhere honest to go, for the same reason the staged-file rows have
   none: kept in flow it holds its slot for the whole duration and the survivors jump once at the
   end; lifted out of flow it lands on the container's first line because the row wraps. So it goes
   on the spot — `transition: none` here also cancels the `--fat-transition` the chip carries
   itself, which <TransitionGroup> would otherwise wait out — and `-move` alone closes the gap. */
.preset-leave-active {
  transition: none;
}

.preset-move {
  transition: transform var(--fat-duration-base) var(--fat-ease-standard);
}

@media (prefers-reduced-motion: reduce) {
  .preset-chip {
    transition: none;
  }

  .preset-move {
    transition: none;
  }
}

@media (width <= 640px) {
  .preset-create {
    margin-left: 0;
  }
}
</style>
