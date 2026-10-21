<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, Delete, Edit } from '@element-plus/icons-vue';
import type { ConversionPreset, ImageOutputOptions } from '~/utils/core/types';
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
const { presets, addPreset, removePreset, updatePreset } = usePresets();
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
  // The two branches are not the same message with a different colour. The chip is added either way,
  // so a storage failure looks exactly like a success until the page is reloaded and it disappears;
  // saying so is the only way the user learns the card was never written to disk.
  if (await addPreset(preset)) {
    ElMessage.success(t('preset.saved', { name: preset.name }));
  } else {
    ElMessage.warning(t('preset.saveFailed', { name: preset.name }));
  }
}

async function handleRemove(preset: ConversionPreset): Promise<void> {
  if (await removePreset(preset.id)) {
    ElMessage.info(t('preset.removed', { name: preset.name }));
  } else {
    ElMessage.warning(t('preset.removeFailed', { name: preset.name }));
  }
}

/**
 * The edit dialog only stages the name; target and options are changed on the workbench and then
 * pulled in with 「用当前设置更新」, so there is no second copy of the target picker here to keep
 * in sync with the real one.
 */
const editing = ref<ConversionPreset | null>(null);
const editName = ref('');
const editBusy = ref(false);

const editOpen = computed({
  get: () => editing.value !== null,
  set: open => {
    if (!open) editing.value = null;
  },
});

const canEdit = computed(() => !editBusy.value && !props.disabled);
const canUseCurrent = computed(() => canEdit.value && props.targetFormat !== null);

function openEdit(preset: ConversionPreset): void {
  editing.value = preset;
  editName.value = preset.name;
}

async function applyEditPatch(patch: {
  name?: string;
  target?: FileFormat;
  options?: ImageOutputOptions;
}): Promise<void> {
  const preset = editing.value;
  if (!preset || !canEdit.value) return;
  editBusy.value = true;
  const ok = await updatePreset(preset.id, patch);
  editBusy.value = false;

  // On failure the composable has already rolled the list back; mirroring the stored entry keeps
  // the dialog from showing a change that only exists in the input box.
  const stored = presets.value.find(item => item.id === preset.id) ?? null;
  if (stored) {
    editing.value = stored;
    editName.value = stored.name;
  } else {
    editing.value = null;
  }

  if (ok && stored) {
    ElMessage.success(t('preset.updated', { name: stored.name }));
  } else {
    ElMessage.warning(t('preset.updateFailed', { name: preset.name }));
  }
}

async function handleUseCurrent(): Promise<void> {
  const target = props.targetFormat;
  if (target === null || !canUseCurrent.value) return;
  // `optionsToCapture` carries the same predicate as saving one: a non-image target stores `{}`
  // rather than inheriting image parameters left over from an earlier batch.
  await applyEditPatch({ target, options: optionsToCapture.value });
}

async function handleRename(): Promise<void> {
  if (!canEdit.value) return;
  await applyEditPatch({ name: editName.value });
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
          class="preset-edit"
          :disabled="disabled"
          :aria-label="t('preset.edit', { name: preset.name })"
          :title="t('preset.editTitle')"
          @click="openEdit(preset)"
        >
          <el-icon :size="12">
            <Edit />
          </el-icon>
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

    <el-dialog
      v-model="editOpen"
      :title="t('preset.editTitle')"
      width="min(420px, 92vw)"
      align-center
      append-to-body
      :close-on-click-modal="false"
    >
      <template v-if="editing">
        <div class="preset-edit-field">
          <label
            class="preset-edit-label"
            for="preset-edit-name"
            >{{ t('preset.editName') }}</label
          >
          <el-input
            id="preset-edit-name"
            v-model="editName"
            size="small"
            :maxlength="PRESET_NAME_MAX"
            :disabled="editBusy"
            @keyup.enter="handleRename"
          />
        </div>
        <div class="preset-edit-field">
          <span class="preset-edit-label">{{ t('preset.editSummary') }}</span>
          <span class="preset-edit-summary">{{ describePreset(editing.target, editing.options, t) }}</span>
        </div>
        <p class="preset-edit-hint">
          {{ t('preset.editHint') }}
        </p>
      </template>
      <template #footer>
        <div class="preset-edit-footer">
          <el-button
            size="small"
            :disabled="!canUseCurrent"
            :title="targetFormat === null ? t('preset.needTarget') : undefined"
            @click="handleUseCurrent"
          >
            {{ t('preset.useCurrent') }}
          </el-button>
          <div class="preset-edit-footer-end">
            <el-button
              size="small"
              :disabled="editBusy"
              @click="editOpen = false"
            >
              {{ t('common.cancel') }}
            </el-button>
            <el-button
              size="small"
              type="primary"
              :loading="editBusy"
              :disabled="!canEdit"
              @click="handleRename"
            >
              {{ t('preset.saveName') }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
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

  /* WCAG 2.5.8 asks for a 24×24 pointer target; a one-character preset name is narrower than that
     without a floor, and the chip would still look the same height. */
  min-width: 24px;
  min-height: 24px;
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

.preset-edit,
.preset-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Same 24×24 floor; the 12px icon plus 6px on each side is the target. */
  min-width: 24px;
  min-height: 24px;
  padding: 0;
  border: none;
  background: none;
  color: var(--fat-text-secondary);
  cursor: pointer;
}

.preset-edit:hover:not(:disabled) {
  color: var(--fat-primary);
}

.preset-remove:hover:not(:disabled) {
  color: var(--el-color-danger);
}

.preset-edit:disabled,
.preset-remove:disabled {
  cursor: not-allowed;
}

.preset-apply:focus-visible,
.preset-edit:focus-visible,
.preset-remove:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: -2px;
}

.preset-edit-field {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-xs);
  margin-bottom: var(--fat-space-md);
}

.preset-edit-label {
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.preset-edit-summary {
  font-size: 13px;
  line-height: 1.5;
  color: var(--fat-text-regular);
}

.preset-edit-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--fat-text-secondary);
}

/* Wraps instead of squeezing the update button against the cancel/save pair on a narrow
   dialog — the two groups are distinct actions, not one row that happens to fit. */
.preset-edit-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-sm);
}

.preset-edit-footer-end {
  display: flex;
  gap: var(--fat-space-xs);
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
    opacity var(--fat-duration-base) var(--fat-ease-enter),
    transform var(--fat-duration-base) var(--fat-ease-enter);
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
