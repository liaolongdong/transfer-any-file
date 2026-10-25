<script setup lang="ts">
import { computed, ref, watch, nextTick, defineAsyncComponent, onMounted, onUnmounted, shallowRef } from 'vue';
import type { Component } from 'vue';
import { Setting, InfoFilled, RefreshRight, CircleClose, UploadFilled } from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import enUs from 'element-plus/es/locale/lang/en';
import { browser } from 'wxt/browser';
import { initConverters } from '~/utils/converters';
import { useConversion } from '~/composables/useConversion';
import { CONVERSION_ERROR_KEYS } from '~/utils/core/error-keys';
import { useI18n } from '~/composables/useI18n';
import { useRecentTargets } from '~/composables/useRecentTargets';
import { useOutputOptions } from '~/composables/useOutputOptions';
import { useNameTemplate } from '~/composables/useNameTemplate';
import { useShortcuts } from '~/composables/useShortcuts';
import { useWorkspaceFileDrop } from '~/composables/useWorkspaceFileDrop';
import { converterRegistry } from '~/utils/core/registry';
import { isImageOutputFormat } from '~/utils/core/output-options';
import { MAX_MERGED_PAGES } from '~/utils/core/image-pdf';
import { getFormatLabel } from '~/utils/core/format-labels';
import { FileFormat } from '~/utils/core/types';
import type { ConversionPreset, ConvertResult, ImageOutputOptions } from '~/utils/core/types';
import type { HistoryRecord } from '~/composables/useHistory';
import FileUpload from '~/components/shared/FileUpload.vue';
import ConversionProgress from '~/components/shared/ConversionProgress.vue';
import CurrentFileHint from '~/components/shared/CurrentFileHint.vue';
import StepProgressHint from '~/components/shared/StepProgressHint.vue';
import CollapsibleCard from '~/components/shared/CollapsibleCard.vue';
import PreferencesMenu from '~/components/shared/PreferencesMenu.vue';
import PresetBar from '~/components/shared/PresetBar.vue';
import HistoryPanel from '~/components/options/HistoryPanel.vue';

// Rendered only after files are uploaded / conversion finishes, so their code
// (including the heavy document-preview chain) stays out of the initial bundle
const FormatSelector = defineAsyncComponent(() => import('~/components/shared/FormatSelector.vue'));
const OutputOptions = defineAsyncComponent(() => import('~/components/shared/OutputOptions.vue'));
const ResultDownload = defineAsyncComponent(() => import('~/components/shared/ResultDownload.vue'));
const ComparisonView = defineAsyncComponent(() => import('~/components/shared/ComparisonView.vue'));

initConverters();

/** The version actually loaded, so the number a bug report quotes is the one on screen. */
const appVersion = browser.runtime.getManifest().version;

const { t, locale } = useI18n();
const { recent: recentTargets } = useRecentTargets();
const { setOptions } = useOutputOptions();
const { setTemplate } = useNameTemplate();
const { matches: shortcutMatches, formatAction: formatConvertShortcut } = useShortcuts();

/**
 * Element Plus carries its own string table, and its default is English — so without this
 * the dialog close button reads "Close this dialog" and the clearable input's button reads
 * "Clear" inside a Chinese UI. ElConfigProvider renders no wrapper element, only the slot.
 */
const epLocale = computed(() => (locale.value === 'zh' ? zhCn : enUs));

const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);

/** Drives the centred preferences dialog. Opening it also locks the uploader and the page-wide drop
 *  overlay: the overlay's z-index (9999) sits above Element Plus's modal stack (2000+), so a file
 *  dragged over an open dialog would otherwise paint the "drop here" veil on top of it. */
const prefsOpen = ref(false);

/** The About drawer's component, fetched on first open rather than at first paint. Mounting it a
 *  tick before the model flips is what keeps Element Plus's enter transition: a drawer that first
 *  renders with `visible` already true opens with no animation (its Transition has no `appear`). */
const AboutDrawer = shallowRef<Component>();
const aboutOpen = ref(false);

/** Any open modal overlay. It keeps the convert shortcut off, disables the uploader and suppresses
 *  the page-wide drop veil, whose z-index sits above Element Plus's modal stack. */
const overlayOpen = computed(() => prefsOpen.value || aboutOpen.value);

async function openAbout(): Promise<void> {
  if (!AboutDrawer.value) {
    AboutDrawer.value = (await import('~/components/options/AboutDrawer.vue')).default;
    await nextTick();
  }
  aboutOpen.value = true;
}

const {
  sourceFile,
  sourceFormat,
  sourceFiles,
  uniqueSourceFormats,
  availableTargets,
  targetFormat,
  isConverting,
  cancelled,
  error,
  batchResults,
  resultsStale,
  batchFailures,
  totalCount,
  currentIndex,
  currentStep,
  stepTotal,
  plannedSteps,
  stepsDone,
  elapsedMs,
  isPackaging,
  isRetrying,
  mergeImages,
  canMergeImages,
  mergeProgress,
  setMergeImages,
  setFiles,
  setTargetFormat,
  convert,
  cancelConversion,
  downloadResult,
  downloadAllZip,
  retryFailedFiles,
  updateResult,
  clearResults,
  reset,
  undo,
  hasUndo,
} = useConversion();

const registeredPairs = converterRegistry.getRegisteredFormats();
const uniqueFormats = new Set<FileFormat>();
registeredPairs.forEach(p => {
  uniqueFormats.add(p.from);
  uniqueFormats.add(p.to);
});
const formatCount = uniqueFormats.size;
const pathCount = registeredPairs.length;

/**
 * A target the workbench should adopt for the *next* batch, plus the output parameters that came
 * with it.
 *
 * Both entry points that preselect a target — reusing a history record and applying a preset — can
 * fire before any file is uploaded, when there is no batch yet to judge the target against, so the
 * choice has to survive in here until the files land. `options` is `null` wherever the entry point carried
 * no output parameters at all — a history record remembers a format only, and a preset whose target
 * is not an image never captured any (the same rule `PresetBar` applies when it stores) — and `null`
 * means "leave the live parameters alone". An image preset always carries an object, and an empty
 * one is that preset speaking: "these are the defaults for this workflow".
 */
interface PendingApplication {
  target: FileFormat;
  options: ImageOutputOptions | null;
  /** `null` leaves the live pattern alone — a preset carries none. */
  nameTemplate: string | null;
  /** Shown when the batch that finally arrives cannot reach this target. */
  unavailableKey: string;
}

const pendingApplication = ref<PendingApplication | null>(null);

const hasFiles = computed(() => sourceFiles.value.length > 0);
const hasResults = computed(() => batchResults.value.length > 0);
const hasFailures = computed(() => batchFailures.value.length > 0);
// Only "done" once the whole batch finished, so progress UI stays visible. A cancelled
// batch counts even with nothing in it, otherwise the cancel leaves no trace on screen.
const isDone = computed(() => !isConverting.value && (hasResults.value || hasFailures.value || cancelled.value));
const isSingleFile = computed(() => sourceFiles.value.length === 1);
const showBatchProgress = computed(
  // Two new conjuncts, both about a bar that would be reading nothing:
  // - `plannedSteps > 1` is the half that lets a single file on a multi-step chain show a bar at all —
  //   the case that used to be a spinner with nothing to read. A single file on a single step still
  //   shows no bar, exactly as before.
  // - `plannedSteps > 0` keeps the bar off screen for a batch whose routes all failed to resolve
  //   (policy-blocked preset applied to this file set, and nothing else in it). There is no
  //   denominator to report there, so the spinner card takes the row instead — as it already does
  //   for every single-file batch today.
  // `totalCount` is `sourceFiles.length` (`useConversion.ts:227`), so the first half is the same
  // test this line has always made.
  () => isConverting.value && plannedSteps.value > 0 && (totalCount.value > 1 || plannedSteps.value > 1),
);
const batchProgressPercent = computed(() => {
  if (plannedSteps.value === 0) return 0;
  return Math.round((stepsDone.value / plannedSteps.value) * 100);
});
/** Name of the file currently being processed, shown on whichever progress host is on screen. */
const currentFileName = computed(() => {
  if (!isConverting.value) return null;
  const idx = currentIndex.value;
  if (idx < 0 || idx >= sourceFiles.value.length) return null;
  return sourceFiles.value[idx]?.name ?? null;
});
/**
 * Whether the running file sits on a multi-step chain.
 *
 * Gated on `> 1` so a single-step route renders exactly what it rendered before — the extra line is
 * only worth its space when the per-file counter above it cannot move, which is precisely the case
 * `MD→PDF` and the rest of the multi-step routes used to leave as a static spinner.
 */
const showStepProgress = computed(() => isConverting.value && stepTotal.value > 1);
/**
 * The per-image counter of a merged run, translated here rather than inside the composable so the
 * conversion layer stays free of UI strings. `null` outside a merged batch, which hides the line.
 */
const mergeDetail = computed(() => {
  const progress = mergeProgress.value;
  return progress ? t('convert.mergeProgress', progress) : null;
});
const mergeHint = computed(() => t('convert.mergeImagesHint', { max: MAX_MERGED_PAGES }));
// At least one recognizable file is enough; unknown ones fail per-file
const canConvert = computed(
  () => !isConverting.value && uniqueSourceFormats.value.length > 0 && targetFormat.value !== null,
);

// Comparison view: shown when single file conversion is done.
// A stale result is deliberately excluded: the selector has moved on to another target, and the
// comparison panel would label the old file with the new format on both sides of the split.
const showComparison = computed(() => {
  return (
    !resultsStale.value &&
    isDone.value &&
    isSingleFile.value &&
    batchResults.value.length === 1 &&
    targetFormat.value !== null
  );
});

// A long converter step keeps running for a moment after 取消转换 is clicked. Without any
// acknowledgement the button just carries on counting, so people click it again or give up
// and close the tab. `cancelled` only lands when the batch is already over, hence this
// UI-side flag for the in-between window.
const cancelRequested = ref(false);

function handleCancelConversion(): void {
  cancelRequested.value = true;
  cancelConversion();
}

// Fires for every batch transition: resets the pending-cancel label and, while a batch is
// running, warns before the tab goes away. Uploaded files live only in memory and nothing is
// persisted, so a stray reload mid-conversion would otherwise discard the whole batch quietly.
function warnBeforeLeave(event: BeforeUnloadEvent): void {
  event.preventDefault();
}

watch(isConverting, running => {
  if (running) {
    cancelRequested.value = false;
    window.addEventListener('beforeunload', warnBeforeLeave);
  } else {
    window.removeEventListener('beforeunload', warnBeforeLeave);
  }
});

const convertButtonText = computed(() => {
  if (isConverting.value) {
    if (cancelRequested.value) return t('convert.cancelling');
    // A retry counts against the failed subset, not the original batch, and says so — otherwise
    // "(1/1)" over a five-file workspace reads like the other four vanished. That still holds with
    // steps: `retryFailedFiles` calls `convert()`, so the pre-pass ran over exactly that subset.
    // Both numbers come from the same pair the bar reads, so the label on the button and the bar
    // above it are never describing different work. A batch whose steps are all one layer deep gives
    // the identical figures the file count used to give, which is why no unit word is needed here.
    const counts = { done: stepsDone.value, total: plannedSteps.value };
    return isRetrying.value ? t('convert.retrying', counts) : t('convert.converting', counts);
  }
  if (sourceFiles.value.length > 1) return t('convert.startMulti', { count: sourceFiles.value.length });
  return t('convert.start');
});

const displayError = computed(() => {
  if (!error.value) return null;
  return CONVERSION_ERROR_KEYS.has(error.value) ? t(error.value) : error.value;
});

// F10 — live region announcement. Only flips when the message actually changes,
// so screen readers don't re-read it on every intermediate state tick.
const statusAnnouncement = computed<string | null>(() => {
  if (isConverting.value) {
    return t('a11y.converting', {
      current: Math.min(currentIndex.value + 1, totalCount.value || 1),
      total: totalCount.value || 1,
    });
  }
  // Ahead of the completion counts: a truncated batch must never be announced as done.
  if (cancelled.value) {
    const done = batchResults.value.length;
    return done > 0 ? t('a11y.convertCancelledPartial', { done, total: totalCount.value }) : t('a11y.convertCancelled');
  }
  if (isDone.value) {
    const ok = batchResults.value.length;
    const fail = batchFailures.value.length;
    const total = ok + fail;
    if (total === 0) return null;
    if (fail === 0) return t('a11y.convertAllOk', { count: ok });
    if (ok === 0) return t('a11y.convertAllFail', { count: fail });
    return t('a11y.convertCompleted', { ok, fail });
  }
  return null;
});

/**
 * Status for changes outside the conversion lifecycle. The file list is what the workbench
 * revolves around, yet its count changes silently — a screen-reader user who dropped or removed
 * a file has no way to tell the action took effect (WCAG 4.1.3). Conversion state keeps priority
 * while a batch is in flight, which is why this is the fallback of one region, not a second one.
 */
const listAnnouncement = ref<string | null>(null);

/** Clear before writing: a live region only speaks on DOM change, so a repeated message needs the gap. */
function announce(text: string): void {
  listAnnouncement.value = null;
  void nextTick(() => {
    listAnnouncement.value = text;
  });
}

const liveRegionText = computed(() => statusAnnouncement.value ?? listAnnouncement.value);

function progressFormat(): string {
  return `${stepsDone.value}/${plannedSteps.value}`;
}

function handleFilesUpdate(files: File[]): void {
  // Freeze the file source while a batch is running
  if (isConverting.value) return;
  if (files.length === 0) {
    reset();
    announce(t('a11y.filesCleared'));
  } else {
    setFiles(files);
    announce(t('a11y.filesLoaded', { count: files.length }));
  }
  if (pendingApplication.value && hasFiles.value) {
    const pending = pendingApplication.value;
    pendingApplication.value = null;
    if (!applyApplication(pending)) ElMessage.warning(t(pending.unavailableKey));
  }
}

/**
 * A reorder keeps every file, so it must not take the "loaded N files" announcement with it.
 * `setFiles` still runs — it re-derives the target intersection and keeps the selected target —
 * but the only thing a screen reader hears is where the row went.
 */
function handleReorder(files: File[], name: string, position: number, total: number): void {
  if (isConverting.value) return;
  setFiles(files);
  announce(t('a11y.fileMoved', { name, position, total }));
}

/**
 * Adopt a remembered target, and with it any output parameters and name pattern it carried.
 *
 * Returns whether the target was reachable. The callers decide how to say so: a pending request
 * that arrives with a file list has a different story from a click on a row that is on screen.
 */
function applyApplication(pending: PendingApplication): boolean {
  if (!availableTargets.value.includes(pending.target)) return false;
  setTargetFormat(pending.target);
  if (pending.options) void setOptions(pending.options);
  if (pending.nameTemplate) void setTemplate(pending.nameTemplate);
  return true;
}

function handleResultUpdate(result: ConvertResult): void {
  updateResult(0, result);
}

/**
 * Name what a history record is about to restore, beyond the target.
 *
 * Reuse is a one-click action with no dialog, so the toast is the only place the user can see
 * that a stored `maxEdge` or pattern came back with it — and the only way to tell a record that
 * carried settings apart from an old one that did not.
 */
function describeHistorySettings(record: HistoryRecord): string {
  const settings = record.settings;
  if (!settings) return '';
  const parts: string[] = [];
  const options = settings.outputOptions;
  if (options) {
    const params: string[] = [];
    if (options.quality !== undefined) {
      params.push(t('history.paramQuality', { value: Math.round(options.quality * 100) }));
    }
    if (options.maxEdge !== undefined) params.push(t('history.paramMaxEdge', { value: options.maxEdge }));
    if (options.dpi !== undefined) params.push(t('history.paramDpi', { value: options.dpi }));
    if (options.targetSizeKB !== undefined) {
      params.push(t('history.paramTargetSize', { value: options.targetSizeKB }));
    }
    if (params.length > 0) {
      parts.push(t('history.reuseDetailOptions', { options: params.join(t('common.listSeparator')) }));
    }
  }
  if (settings.nameTemplate) parts.push(t('history.reuseDetailTemplate', { template: settings.nameTemplate }));
  return parts.join('');
}

function handleReuse(record: HistoryRecord): void {
  const pending: PendingApplication = {
    target: record.targetFormat,
    // Both guards are the write-side rules restated for a payload that may be hand-edited: image
    // parameters only exist for image targets, and a missing `settings` object is an old record.
    options:
      isImageOutputFormat(record.targetFormat) && record.settings?.outputOptions
        ? { ...record.settings.outputOptions }
        : null,
    nameTemplate: record.settings?.nameTemplate ?? null,
    unavailableKey: 'history.reuseUnavailable',
  };
  const target = getFormatLabel(record.targetFormat);
  const details = describeHistorySettings(record);
  if (hasFiles.value) {
    if (!applyApplication(pending)) {
      ElMessage.warning(t('history.reuseUnavailable'));
      return;
    }
    ElMessage.success(t('history.reuseApplied', { target, details }));
    return;
  }
  // No files yet: remember everything and apply it after the next upload
  pendingApplication.value = pending;
  ElMessage.info(t('history.reusePending', { target, details }));
}

function handleApplyPreset(preset: ConversionPreset): void {
  const pending: PendingApplication = {
    target: preset.target,
    // The predicate `PresetBar` stores with: a non-image preset captured no parameters, and
    // `setOptions` replaces the whole set, so applying its stored `{}` wiped the maxEdge/quality
    // the user was working with. Parameters a hand-edited store attaches to a non-image target are
    // ignored here for the same reason the capture rule never writes them.
    options: isImageOutputFormat(preset.target) ? { ...preset.options } : null,
    nameTemplate: null,
    unavailableKey: 'preset.unavailable',
  };
  if (hasFiles.value) {
    if (!applyApplication(pending)) ElMessage.warning(t(pending.unavailableKey));
    return;
  }
  pendingApplication.value = pending;
  ElMessage.info(t('preset.pending'));
}

function handleUndo(): void {
  if (undo()) {
    ElMessage.success(t('convert.undone'));
  } else {
    ElMessage.info(t('convert.undoUnavailable'));
  }
}

/**
 * Re-run only the files that failed, then say what came back.
 *
 * The results panel updates itself, but it sits below the fold on a tall batch and does not scroll
 * into view — so a retry that recovered one file out of two hundred could easily finish unseen. The
 * summary is also the only place the *retry* outcome reads as its own event: the panel's headline
 * counts the merged batch, which cannot show "the one you just retried worked".
 */
async function handleRetryFailed(): Promise<void> {
  const outcome = await retryFailedFiles();
  if (!outcome.ran) return;
  const message = t('result.retrySummary', { ok: outcome.recovered, fail: outcome.stillFailing });
  if (outcome.recovered > 0) ElMessage.success(message);
  else ElMessage.warning(message);
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  // Both overlays are modal; a batch must not start behind either.
  if (overlayOpen.value) return;
  if (!shortcutMatches('convert', event)) return;
  const target = event.target as HTMLElement | null;
  // Don't steal the shortcut while the user is typing somewhere
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  if (!canConvert.value) return;
  event.preventDefault();
  convert();
}

// The overlay markup lives with this state below; the counter, the `Files`-type guard and the
// four document-level listeners are all in the composable.
const { isWorkspaceDragging } = useWorkspaceFileDrop({
  isLocked: computed(() => isConverting.value || overlayOpen.value),
  onFilesDropped: dataTransfer => void fileUploadRef.value?.intakeDrop(dataTransfer),
});

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', warnBeforeLeave);
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <ElConfigProvider :locale="epLocale">
    <div class="workbench">
      <a
        href="#main-content"
        class="skip-link"
        >{{ t('a11y.skipToContent') }}</a
      >

      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-line">
              <span class="brand-name">{{ t('appName') }}</span>
              <!-- The card-coloured pill the skip link and the preferences button already use: its ink
                   is `--fat-text-primary` on `--fat-bg-card`, and those two flip together with the mode,
                   so the chip needs no contrast measurement of its own on any of the six headers. -->
              <span
                class="brand-version"
                :title="t('options.versionHint', { version: appVersion })"
                >v{{ appVersion }}</span
              >
            </div>
            <!-- The top bar carries no off-site anchor: every outbound address, including the store
                 and the latest release, lives in the About drawer. Clicking one there is the only way
                 the interface reaches the network, and the browser opens it — not this page. -->
            <span class="brand-tag">{{ t('options.subtitle') }}</span>
          </div>
          <!-- Two capsules on the right: the drawer of exits, then preferences. Both share the
               card-coloured chrome and collapse to icon-only below 640px, where the topbar has no
               room for the words. -->
          <div class="topbar-actions">
            <el-button
              class="about-trigger"
              round
              :icon="InfoFilled"
              :title="t('about.open')"
              :aria-label="t('about.open')"
              @click="openAbout"
            >
              <span class="about-trigger-label">{{ t('about.open') }}</span>
            </el-button>
            <el-button
              class="prefs-trigger"
              round
              :icon="Setting"
              :title="t('options.preferences')"
              :aria-label="t('options.preferences')"
              @click="prefsOpen = true"
            >
              <span class="prefs-trigger-label">{{ t('options.preferences') }}</span>
            </el-button>
          </div>
        </div>
      </header>

      <!-- destroy-on-close is what keeps PreferencesMenu's document-level shortcut listener from
           outliving the panel, and close-on-click-modal stays off because a stray click on the veil
           must not discard a half-typed shortcut or name pattern. -->
      <el-dialog
        v-model="prefsOpen"
        class="prefs-dialog"
        :title="t('options.preferences')"
        width="min(520px, calc(100vw - 32px))"
        align-center
        :close-on-click-modal="false"
        destroy-on-close
      >
        <PreferencesMenu />
      </el-dialog>

      <component
        :is="AboutDrawer"
        v-if="AboutDrawer"
        v-model="aboutOpen"
        :version="appVersion"
      />

      <main
        id="main-content"
        class="content"
        tabindex="-1"
      >
        <div class="col col-main">
          <!-- No card wrapper: FileUpload paints its own empty/filled surface, so a staged file
               list is one panel instead of a card inside a card. -->
          <FileUpload
            ref="fileUploadRef"
            :disabled="isConverting || overlayOpen"
            :reorder-disabled="batchResults.length > 0 || batchFailures.length > 0"
            :formats="formatCount"
            :paths="pathCount"
            @update:files="handleFilesUpdate"
            @reorder="handleReorder"
          />

          <!-- F10 — live region for status. Visually hidden, but announced by screen readers
             whenever statusAnnouncement (conversion) or listAnnouncement (file list) changes. -->
          <div
            class="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {{ liveRegionText ?? '' }}
          </div>

          <Transition
            name="card"
            mode="out-in"
          >
            <div
              v-if="hasFiles"
              key="action-bar"
              class="card action-bar"
            >
              <FormatSelector
                :source-formats="uniqueSourceFormats"
                :available-targets="availableTargets"
                :target-format="targetFormat"
                :recent-targets="recentTargets"
                :disabled="isConverting"
                @update:target-format="setTargetFormat"
              >
                <template #actions>
                  <el-button
                    type="primary"
                    :icon="RefreshRight"
                    :loading="isConverting"
                    :disabled="!canConvert"
                    class="convert-btn"
                    :title="t('convert.shortcutHint', { shortcut: formatConvertShortcut('convert') })"
                    @click="convert"
                  >
                    {{ convertButtonText }}
                  </el-button>
                  <Transition name="chip">
                    <el-button
                      v-if="isConverting"
                      :icon="CircleClose"
                      type="danger"
                      plain
                      class="cancel-btn"
                      :disabled="cancelRequested"
                      @click="handleCancelConversion"
                    >
                      {{ t('convert.cancel') }}
                    </el-button>
                  </Transition>
                </template>
              </FormatSelector>
              <!-- Hidden when the batch cannot merge (non-PDF target, one file, an SVG in the
                   mix). The choice itself stays in memory, so switching back to PDF restores it. -->
              <Transition name="reveal">
                <div
                  v-if="canMergeImages"
                  class="merge-row"
                >
                  <el-checkbox
                    :model-value="mergeImages"
                    :disabled="isConverting"
                    @update:model-value="setMergeImages($event === true)"
                  >
                    {{ t('convert.mergeImages') }}
                  </el-checkbox>
                  <span class="merge-hint">{{ mergeHint }}</span>
                </div>
              </Transition>
              <OutputOptions
                :source-formats="uniqueSourceFormats"
                :target-format="targetFormat"
                :disabled="isConverting"
              />
              <Transition name="reveal">
                <div
                  v-if="showBatchProgress"
                  class="batch-progress"
                >
                  <el-progress
                    :percentage="batchProgressPercent"
                    :stroke-width="6"
                    :show-text="totalCount > 1"
                    :format="progressFormat"
                  />
                  <CurrentFileHint
                    v-if="currentFileName"
                    :name="currentFileName"
                    :detail="mergeDetail"
                  />
                  <StepProgressHint
                    v-if="showStepProgress"
                    :current="currentStep"
                    :total="stepTotal"
                  />
                </div>
              </Transition>
            </div>
          </Transition>

          <CollapsibleCard
            card-id="presets"
            :title="t('preset.title')"
            :default-open="false"
          >
            <PresetBar
              :target-format="targetFormat"
              :disabled="isConverting"
              @apply="handleApplyPreset"
            />
          </CollapsibleCard>

          <Transition
            name="card"
            mode="out-in"
          >
            <div
              v-if="(isConverting && !showBatchProgress) || displayError"
              key="conversion-progress"
              class="card"
            >
              <ConversionProgress
                :is-converting="isConverting"
                :error="displayError"
                :current-file-name="currentFileName"
                :current-detail="mergeDetail"
                :current-step="currentStep"
                :step-total="stepTotal"
              />
            </div>
          </Transition>

          <Transition
            name="card"
            mode="out-in"
          >
            <div
              v-if="isDone"
              key="result-download"
              class="card"
            >
              <ResultDownload
                :results="batchResults"
                :current-target="targetFormat"
                :failures="batchFailures"
                :cancelled="cancelled"
                :total-count="totalCount"
                :packaging="isPackaging"
                :elapsed-ms="elapsedMs"
                @download="downloadResult"
                @download-all="downloadAllZip"
              />
              <div class="result-actions">
                <el-button
                  text
                  type="info"
                  class="reset-btn"
                  @click="clearResults"
                >
                  {{ t('convert.reconvert') }}
                </el-button>
                <!--
                  The alternative until now was 重新转换, which drops the results that worked and
                  converts every file again — so recovering one file out of a large batch cost the
                  whole batch. Placed between the two actions it sits alongside rather than in front
                  of them: 重新转换 keeps the left slot and 撤销 the right one, so a batch with no
                  failures lays this row out exactly as it did before.
                  No `:disabled` guard on purpose — this whole card is unmounted while `isConverting`,
                  so a retry is already in flight whenever the button cannot be seen, and
                  `retryFailedFiles()` refuses a second call regardless.
                -->
                <el-button
                  v-if="hasFailures"
                  text
                  type="primary"
                  :icon="RefreshRight"
                  class="retry-btn"
                  @click="handleRetryFailed"
                >
                  {{ t('result.retryFailed', { count: batchFailures.length }) }}
                </el-button>
                <el-button
                  v-if="hasUndo"
                  text
                  type="warning"
                  class="undo-btn"
                  @click="handleUndo"
                >
                  {{ t('convert.undo') }}
                </el-button>
              </div>
            </div>
          </Transition>

          <Transition name="card">
            <ComparisonView
              v-if="showComparison"
              key="comparison"
              :source-file="sourceFile"
              :source-format="sourceFormat"
              :result="batchResults[0]?.result ?? null"
              :target-format="targetFormat"
              @update:result="handleResultUpdate"
            />
          </Transition>

          <CollapsibleCard
            card-id="history"
            :title="t('history.title')"
          >
            <HistoryPanel @reuse="handleReuse" />
          </CollapsibleCard>
        </div>
      </main>

      <Transition name="fat-fade">
        <div
          v-if="isWorkspaceDragging"
          class="drop-overlay"
          aria-hidden="true"
        >
          <div class="drop-overlay-inner">
            <el-icon :size="64">
              <UploadFilled />
            </el-icon>
            <p>{{ t('workspace.dropHint') }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </ElConfigProvider>
</template>

<style scoped>
.workbench {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--fat-bg-page);
  font-family: var(--fat-font-family);
  color: var(--fat-text-regular);
}

/* F10 — visually hidden until focused. Skip link lets keyboard users jump
   past the topbar to the main content area in one keystroke.
   Inverted chip (`--fat-bg-card` on `--fat-text-primary`): 17.85:1 in light and
   11.34:1 in dark — AAA in all 6 themes × 2 modes, and theme-independent, so a
   future palette change cannot silently break it. It used to be `#fff` on
   `--fat-primary`, which measured 2.54:1 (light green) and 1.69–2.67:1 (every
   dark theme) because the dark primaries are deliberately light tints. */
.skip-link {
  position: absolute;
  top: var(--fat-space-sm);
  left: var(--fat-space-sm);
  z-index: var(--fat-z-skip-link);
  padding: var(--fat-space-xs) var(--fat-space-sm);
  background: var(--fat-bg-card);
  color: var(--fat-text-primary);
  border: 1px solid var(--fat-text-primary);
  border-radius: var(--fat-radius-sm);
  box-shadow: var(--fat-shadow-lg);
  text-decoration: none;
  font-weight: 600;
  transform: translateY(-200%);
  transition: transform var(--fat-duration-fast) var(--fat-ease-standard);
}

/* Double ring. The chip can land on the coloured topbar OR on the page, and no single
   ring colour clears the 3:1 non-text minimum against both (text-primary is 2.36:1 on
   light slate and 1.17–1.84:1 on the dark topbar). Pairing a text-primary band with a
   bg-card band keeps a ≥11:1 boundary on one side whichever surface is behind. */
.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--fat-text-primary);
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px var(--fat-bg-card),
    var(--fat-shadow-lg);
}

.topbar {
  background: var(--fat-topbar-bg);
}

.topbar-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--fat-space-md) var(--fat-space-lg);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--fat-on-primary);
}

/* Full-strength rather than the previous 85% alpha: at 12px that translucent white
   measured 4.20:1 on light blue and 3.71:1 on light rose, both under the 4.5:1 body-text
   floor. Hierarchy is already carried by the size difference. */
.brand-tag {
  font-size: 12px;
  color: var(--fat-on-primary);
}

/* Name and its version on one line. The chip is the smaller of the two, so it rides the name's
   baseline and wraps under it when the header gets narrow, rather than joining the subtitle line. */
.brand-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-sm);
}

.brand-version {
  padding: 2px var(--fat-space-sm);
  background: var(--fat-bg-card);
  border-radius: var(--fat-radius-pill);
  color: var(--fat-text-primary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* The topbar's right-hand controls. They travel as one flex item so the header keeps a two-sided
   `space-between` layout instead of spreading three children across it. */
.topbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--fat-space-sm);
}

/* Both capsules the topbar can show, and the one piece of chrome that must stay legible against six
   different coloured headers. The double band is the same contract the skip link uses: a card-
   coloured ring fills the outline's 2px offset, so the focus-ring colour is always separated from
   the header by an opaque band — a blue ring directly on the blue header would vanish. */
.prefs-trigger,
.about-trigger {
  flex-shrink: 0;
  border-radius: var(--fat-radius-pill) !important;
  background: var(--fat-bg-card);
  color: var(--fat-text-primary);
  font-weight: 600;
}

/* Hover keeps the label on --fat-text-primary: tinting it with the accent would drop green to
   2.54:1 and orange to 3.56:1 on the card-coloured capsule, below the 4.5:1 this UI holds body
   text to. The border carries the state instead. */
.prefs-trigger:hover,
.about-trigger:hover {
  border-color: var(--fat-primary);
  background: var(--fat-bg-card);
  color: var(--fat-text-primary);
}

.prefs-trigger:focus-visible,
.about-trigger:focus-visible {
  outline: 2px solid var(--fat-focus-ring) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 2px var(--fat-bg-card);
}

.content {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--fat-space-xl) var(--fat-space-lg);
}

.col {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-md);
  min-width: 0;
}

.card {
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-lg);
  box-shadow: var(--fat-shadow-sm);
  padding: var(--fat-space-md);
}

.action-bar {
  padding: var(--fat-space-md);
}

/* Sits between the target row and the output parameters, which is where the decision it changes
   lives. Wraps instead of truncating: the hint is the only place the 200-page ceiling is stated. */
.merge-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-sm);
  margin-top: var(--fat-space-sm);
}

.merge-hint {
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.convert-btn {
  flex-shrink: 0;
  min-width: 140px;
}

/* The one moment this button has no signal for is the moment it becomes usable: `canConvert` flips
   the instant a target is picked and the only thing that changes is a colour. A ring that collapses
   into the button once says "this is now the thing to press" without leaving anything on screen —
   deliberately a `from`-only keyframe, so it ends on the resting style rather than on a state it has
   to hold.
   Written as an animation on `:not([disabled])` because that is the condition, not a class we would
   have to manage: a CSS animation starts when an element begins matching, so this fires on the
   disabled→enabled edge and on nothing else. Element Plus puts the real `disabled` attribute on the
   `<button>` for both `:disabled` and `:loading`, which covers the second case that matters — the
   button becoming usable again once a batch ends, or once `undo` puts its target back. What it never
   does is play over a button that cannot be pressed, because the card it lives in only exists once
   files are staged. Where that card mounts with a target already chosen — the previous batch kept
   one — the ring plays at mount instead of on an edge, which is the same announcement either way.
   No `all`, and no transform: the flat-design rule for `.el-button` is colour shift only, and a
   lifting or shrinking primary button would contradict the note above that rule in global.css. */
@keyframes fat-ready {
  from {
    box-shadow: 0 0 0 3px rgb(var(--fat-primary-rgb) / 32%);
  }
}

.convert-btn:not([disabled]) {
  animation: fat-ready var(--fat-duration-slow) var(--fat-ease-leave);
}

.cancel-btn {
  flex-shrink: 0;
}

.reset-btn {
  width: 100%;
  margin-top: var(--fat-space-sm);
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fat-space-sm);
  margin-top: var(--fat-space-sm);
}

/* Three slots when a batch lost a file, two when it did not; `flex: 1` on all of them keeps 重新转换
   and 撤销 in the same place either way. Wrap is unconditional because it is inert while the row fits
   (`flex: 1` means `1 1 0%`, so the break decision uses each label's min-content width, and
   `.reset-btn`'s `width: 100%` never wins the main size). Measured 2026-10-20 with a batch that lost
   one file (`重新转换` + `重试失败项 (1)` / `Convert Again` + `Retry failed files (1)`): the Chinese pair
   fits at every width — at 360px it spans 29..331 inside a 302px row and at 320px 29..291 inside 262px,
   `scrollWidth` equal to the row both times. Element Plus buttons are `white-space: nowrap`, so the
   English pair does not fit: at 360px it needed 309px and overhung its own box by 7px, and at 320px it
   reached x=338 against a card ending at 304, which grew the whole page to `scrollWidth` 338 inside a
   320px viewport. The suite reproduces that last case with a classic scrollbar in place — with the rule
   deleted it printed `retry right 338 vs card right 300, document scrollWidth 337 vs clientWidth 316` —
   and with wrap both locales report `scrollWidth == clientWidth` at 360, 320 and every wider step, the
   layout at 390px and above unchanged in both. */
.result-actions .reset-btn,
.result-actions .retry-btn,
.result-actions .undo-btn {
  flex: 1;
  margin-top: 0;
}

.batch-progress {
  padding: var(--fat-space-sm) 0 0;
}

/* The new step line carries its own offset instead of the container switching to a gap layout, so
   the bar and the file name above it keep exactly the spacing they had before. Matches the
   `--fat-space-xs` rhythm the file name itself uses inside the other progress host. */
.batch-progress .step-progress {
  margin-top: var(--fat-space-xs);
}

/* Theme and light/dark switching rewrite every `--fat-*` colour in one frame. The interactive
   surfaces already tween their colours, so a theme change visibly fell apart into two groups: the
   buttons, chips and inputs slid over 0.18s while the page, the topbar and the cards snapped
   instantly. These are the permanently-painted surfaces that carry the theme, and they were
   the ones left out.
   Three named properties rather than `--fat-transition`: that shorthand also carries `transform`,
   and `.card` is the element the `card` transition below animates — a competing transform transition
   here would be resolved by source order, which is not a thing to leave to chance. 0.25s is one rung
   above the buttons because a whole-page recolour is one event, not a per-control reaction, and it
   stays inside the settle window the contrast measurements in `scripts/e2e-test.mjs` wait out. */
.workbench,
.topbar,
.card {
  transition:
    background-color var(--fat-duration-slow) var(--fat-ease-standard),
    border-color var(--fat-duration-slow) var(--fat-ease-standard),
    color var(--fat-duration-slow) var(--fat-ease-standard);
}

/* Enter and leave used to share one shorthand — `all`, one duration, one easing — so a card leaving
   decelerated like a card arriving. A departure should accelerate: the eye is already tracking where
   the new content will be, and an ease-out removal reads as the card hesitating. The split also buys
   back time — with `mode="out-in"` the three cards in this column hand off sequentially, so total
   swap cost is leave + enter, and fast + slow is a fifth less dead air than the two slow rungs it
   replaced were.
   `all` named nothing it needed to: this transition only ever carries opacity and transform, and
   `all` on a card also tweened the border and background that `--fat-ease-*` cannot express. */
.card-enter-active {
  transition:
    opacity var(--fat-duration-slow) var(--fat-ease-enter),
    transform var(--fat-duration-slow) var(--fat-ease-enter);
}

.card-leave-active {
  transition:
    opacity var(--fat-duration-fast) var(--fat-ease-leave),
    transform var(--fat-duration-fast) var(--fat-ease-leave);
}

.card-enter-from {
  opacity: 0;
  transform: translateY(var(--fat-lift-md));
}

.card-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--fat-lift-md) * -1));
}

/* Small surfaces that appear inside an already-mounted card — the cancel button is the one here.
   They used to pop in at zero duration and shove their row apart. Scale rather than translate,
   because a control arriving inside a flex row has nowhere honest to slide from, and the arrival
   takes the entry's own vocabulary: `--fat-ease-enter` and `--fat-enter-scale`, the same pair
   `PresetBar.vue` sizes its chips with. */
.chip-enter-active {
  transition:
    opacity var(--fat-duration-base) var(--fat-ease-enter),
    transform var(--fat-duration-base) var(--fat-ease-enter);
}

.chip-leave-active {
  transition:
    opacity var(--fat-duration-fast) var(--fat-ease-leave),
    transform var(--fat-duration-fast) var(--fat-ease-leave);
}

.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(var(--fat-enter-scale));
}

/* A block that reveals below its trigger: the batch-progress region and the multi-step path hint.
   The displacement is upward and small so the block reads as unfolding from the control that
   caused it rather than falling into place. */
.reveal-enter-active {
  transition:
    opacity var(--fat-duration-slow) var(--fat-ease-enter),
    transform var(--fat-duration-slow) var(--fat-ease-enter);
}

.reveal-leave-active {
  transition:
    opacity var(--fat-duration-fast) var(--fat-ease-leave),
    transform var(--fat-duration-fast) var(--fat-ease-leave);
}

.reveal-enter-from,
.reveal-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--fat-lift-sm) * -1));
}

/* Workspace-wide drag-and-drop hint. The wrapper is pointer-events: none so
   the browser still receives the drop on the underlying element. */
.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--fat-z-drop-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fat-primary-bg);
  border: 4px dashed var(--fat-primary);
  pointer-events: none;
}

/* The plate settles into place while the veil behind it fades. It needs no class management: the
   element mounts with the overlay, and a mount is when a CSS animation starts. Both distances come
   from tokens rather than literals, because the reduce block collapses a duration to 0.01ms without
   removing a displacement — a hard-coded 0.96 here would put the plate on screen two frames' worth
   of scale short, which is the one-frame artifact that block exists to prevent. */
@keyframes fat-place {
  from {
    opacity: 0;
    transform: scale(var(--fat-enter-scale)) translateY(var(--fat-lift-sm));
  }
}

.drop-overlay-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--fat-space-md);
  padding: var(--fat-space-xl) calc(var(--fat-space-xl) * 1.5);
  background: var(--fat-bg-card);
  border-radius: var(--fat-radius-lg);
  box-shadow: var(--fat-shadow-lg);
  color: var(--fat-primary);
  font-size: 18px;
  font-weight: 600;
  animation: fat-place var(--fat-duration-slow) var(--fat-ease-enter);
}

@media (width <= 640px) {
  /* The topbar keeps the icons and drops the words; the title and aria-label still name them. */
  .prefs-trigger-label,
  .about-trigger-label {
    display: none;
  }

  .prefs-trigger,
  .about-trigger {
    padding-right: 10px;
    padding-left: 10px;
  }

  .convert-btn,
  .cancel-btn {
    width: 100%;
  }
}
</style>
