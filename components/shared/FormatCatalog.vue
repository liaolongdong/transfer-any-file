<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowRight, Select } from '@element-plus/icons-vue';
import { FileFormat } from '~/utils/core/types';
import type { FileFormat as FileFormatType, FileCategory } from '~/utils/core/types';
import { FORMAT_INFO, getFormatLabel, getFormatShortLabel, getFormatCategory } from '~/utils/core/format-labels';
import { converterRegistry } from '~/utils/core/registry';
import { getBlockedReason } from '~/utils/core/conversion-policy';
import { useI18n } from '~/composables/useI18n';

const emit = defineEmits<{
  /** The reader chose a target before staging anything; the workbench holds it for the next batch. */
  (e: 'pick', target: FileFormat): void;
}>();

const { t } = useI18n();

const CATEGORY_LABEL_KEYS: Record<FileCategory, string> = {
  document: 'format.categoryDocument',
  image: 'format.categoryImage',
  data: 'format.categoryData',
};

const CATEGORY_ORDER: FileCategory[] = ['document', 'image', 'data'];

/**
 * Targets a source can actually be offered, which is reachability minus the semantically invalid
 * pairs. Both halves come from the same two modules the picker uses, so this panel cannot advertise
 * a combination `FormatSelector` would grey out — the 27 policy-blocked pairs (image → text/data,
 * PDF → data) are absent here rather than shown as dead chips.
 */
function targetsFor(source: FileFormatType): FileFormatType[] {
  return converterRegistry.getAllSupportedTargets(source).filter(target => !getBlockedReason(source, target));
}

/** Only formats with at least one offerable target: a chip that opens an empty panel is a dead end. */
const sourceGroups = computed(() => {
  const groups = new Map<FileCategory, FileFormatType[]>();
  for (const format of Object.keys(FORMAT_INFO) as FileFormatType[]) {
    if (targetsFor(format).length === 0) continue;
    const category = getFormatCategory(format);
    const list = groups.get(category);
    if (list) list.push(format);
    else groups.set(category, [format]);
  }
  return CATEGORY_ORDER.filter(category => groups.has(category)).map(category => ({
    category,
    label: t(CATEGORY_LABEL_KEYS[category]),
    formats: groups.get(category) ?? [],
  }));
});

/** Opens on Markdown so the panel demonstrates itself instead of asking for a click first. */
const activeSource = ref<FileFormatType>(FileFormat.MD);
const activeTarget = ref<FileFormatType | null>(null);

const activeTargets = computed(() => targetsFor(activeSource.value));

/** Step count per target, so a two-hop route is labelled before it is chosen rather than after. */
const stepCounts = computed(() => {
  const counts = new Map<FileFormatType, number>();
  for (const target of activeTargets.value) {
    counts.set(target, converterRegistry.findConversionPath(activeSource.value, target)?.length ?? 1);
  }
  return counts;
});

/** The chain for the chosen target, written only when there is more than one hop to explain. */
const activePath = computed(() => {
  const target = activeTarget.value;
  if (!target) return null;
  const steps = converterRegistry.findConversionPath(activeSource.value, target);
  if (!steps || steps.length <= 1) return null;
  return [getFormatShortLabel(activeSource.value), ...steps.map(step => getFormatShortLabel(step.to))].join(' → ');
});

function selectSource(format: FileFormatType): void {
  if (activeSource.value === format) return;
  activeSource.value = format;
  // The chosen target belonged to the previous source's list; keeping it would label a route this
  // source may not even have.
  activeTarget.value = null;
}

function pickTarget(target: FileFormatType): void {
  activeTarget.value = target;
  emit('pick', target);
}
</script>

<template>
  <div class="catalog">
    <p class="catalog-lead">{{ t('catalog.hint') }}</p>

    <div
      class="source-groups"
      role="group"
      :aria-label="t('catalog.sourceLabel')"
    >
      <template
        v-for="group in sourceGroups"
        :key="group.category"
      >
        <span class="group-label">{{ group.label }}</span>
        <div class="chip-row">
          <button
            v-for="format in group.formats"
            :key="format"
            type="button"
            class="source-chip"
            :class="{ active: activeSource === format }"
            :aria-pressed="activeSource === format"
            :title="getFormatLabel(format)"
            @click="selectSource(format)"
          >
            {{ getFormatShortLabel(format) }}
          </button>
        </div>
      </template>
    </div>

    <div class="catalog-answer">
      <!-- The only part of the answer worth announcing: switching a source chip replaces the whole
           target row below, and reading ten new chips aloud is worse than saying what changed. Picking
           a target leaves this line untouched, so it does not talk over the workbench's own
           announcement of the held target. -->
      <div
        class="answer-head"
        aria-live="polite"
      >
        <span class="answer-source">{{ getFormatLabel(activeSource) }}</span>
        <el-icon
          class="answer-arrow"
          :size="14"
          aria-hidden="true"
        >
          <ArrowRight />
        </el-icon>
        <span class="answer-count">{{ t('catalog.targetCount', { count: activeTargets.length }) }}</span>
      </div>
      <!-- Keyed on the source so switching it replays the chip stagger: the answer is a new list, not
           the same list with different words in it. -->
      <div
        :key="activeSource"
        class="chip-row target-row"
        role="group"
        :aria-label="t('catalog.ariaTargets')"
      >
        <button
          v-for="(target, index) in activeTargets"
          :key="target"
          type="button"
          class="target-chip"
          :class="{ chosen: activeTarget === target }"
          :style="{ '--fat-chip-index': index }"
          :aria-pressed="activeTarget === target"
          :title="t('catalog.pickHint', { target: getFormatLabel(target) })"
          @click="pickTarget(target)"
        >
          <el-icon
            v-if="activeTarget === target"
            class="chip-check"
            :size="12"
            aria-hidden="true"
          >
            <Select />
          </el-icon>
          <span>{{ getFormatShortLabel(target) }}</span>
          <span
            v-if="(stepCounts.get(target) ?? 1) > 1"
            class="chip-steps"
            >{{ t('catalog.steps', { count: stepCounts.get(target) ?? 1 }) }}</span
          >
        </button>
      </div>
      <Transition name="fat-expand">
        <div
          v-if="activePath"
          class="fat-expand path-expand"
        >
          <p class="catalog-path">
            <span class="path-label">{{ t('format.conversionPath') }}</span>
            <span class="path-steps">{{ activePath }}</span>
          </p>
        </div>
      </Transition>
      <p class="catalog-foot">{{ t('catalog.foot') }}</p>
    </div>
  </div>
</template>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-md);
}

.catalog-lead {
  margin: 0;
  color: var(--fat-text-secondary);
  font-size: 12px;
}

/* One grid for all three rows, not one grid per row: the label column has to be shared for the chip
   rows to line up on their first chip, and `max-content` is what lets it fit the widest label instead
   of a guessed width. A fixed 44px column measured 56px of "Document" in English, so the word ran
   12px past its box and into the 8px gap — overlapping the first chip at every width above 640px.
   Sizing each row independently would fix the overflow and break the alignment, which is the whole
   reason the column exists. */
.source-groups {
  display: grid;
  grid-template-columns: max-content 1fr;
  align-items: baseline;
  gap: var(--fat-space-sm);
}

.group-label {
  color: var(--fat-text-secondary);
  font-size: 12px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fat-space-xs);
  min-width: 0;
}

.source-chip {
  min-height: 28px;
  padding: 4px 10px;
  color: var(--fat-text-regular);
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: var(--fat-transition);
}

.source-chip:hover {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  transform: translateY(-1px);
}

.source-chip.active {
  color: var(--fat-on-btn-solid);
  background: var(--fat-btn-solid);
  border-color: var(--fat-btn-solid);
  font-weight: 600;
}

.source-chip.active:hover {
  background: var(--fat-btn-solid-hover);
  border-color: var(--fat-btn-solid-hover);
}

.source-chip:focus-visible,
.target-chip:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

/* The answer half is tinted so it reads as the result of the choice above it rather than a second
   list of the same kind. */
.catalog-answer {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-md);
  background: var(--fat-surface-2);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-md);
}

.answer-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-xs);
  font-size: 12px;
}

.answer-source {
  color: var(--fat-text-primary);
  font-weight: 600;
}

.answer-arrow {
  color: var(--fat-primary-ink);
}

.answer-count {
  color: var(--fat-text-secondary);
}

.target-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 4px 10px;
  color: var(--fat-primary-ink);
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-primary-border);
  border-radius: var(--fat-radius-sm);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: var(--fat-transition);
  animation: fat-chip-in var(--fat-duration-slow) var(--fat-ease-enter) both;
  animation-delay: calc(var(--fat-chip-index) * 22ms);
}

.target-chip:hover {
  background: var(--fat-primary-bg);
  border-color: var(--fat-primary);
  transform: translateY(-1px);
}

.target-chip.chosen {
  color: var(--fat-on-btn-solid);
  background: var(--fat-btn-solid);
  border-color: var(--fat-btn-solid);
  font-weight: 600;
}

.target-chip.chosen:hover {
  background: var(--fat-btn-solid-hover);
  border-color: var(--fat-btn-solid-hover);
}

.chip-check {
  flex-shrink: 0;
}

/* The hop count is decoration on an already-labelled control, so it rides the muted ink rather than
   the chip's own — except on the chosen chip, where it has to follow the fill's ink instead. */
.chip-steps {
  color: var(--fat-text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.target-chip.chosen .chip-steps {
  color: var(--fat-on-btn-solid);
}

/* One-shot and `from`-only, so it ends on the resting style and the reduced-motion block has nothing
   to undo beyond the collapsed duration and lift. The delay is a multiple of a token-free 22ms
   because it is a stagger step, not a distance; the blanket block zeroes `animation-delay` too. */
@keyframes fat-chip-in {
  from {
    opacity: 0;
    transform: translateY(var(--fat-lift-sm));
  }
}

.path-expand {
  margin: 0;
}

.catalog-path {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--fat-space-xs);
  margin: 0;
  font-size: 12px;
}

.path-label {
  color: var(--fat-text-secondary);
}

.path-steps {
  color: var(--fat-primary-ink);
  font-family: var(--fat-font-mono);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.catalog-foot {
  margin: 0;
  color: var(--fat-text-secondary);
  font-size: 11px;
}

@media (width <= 640px) {
  .source-groups {
    grid-template-columns: 1fr;
    gap: var(--fat-space-xs);
  }
}
</style>
