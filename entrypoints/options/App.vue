<script setup lang="ts">
import { computed, ref, watch, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { Setting, RefreshRight, CircleClose, UploadFilled } from '@element-plus/icons-vue';
import { initConverters } from '~/utils/converters';
import { useConversion } from '~/composables/useConversion';
import { CONVERSION_ERROR_KEYS } from '~/utils/core/error-keys';
import { useI18n } from '~/composables/useI18n';
import { useRecentTargets } from '~/composables/useRecentTargets';
import { useOutputOptions } from '~/composables/useOutputOptions';
import { useShortcuts } from '~/composables/useShortcuts';
import { converterRegistry } from '~/utils/core/registry';
import { FileFormat } from '~/utils/core/types';
import type { ConversionPreset, ConvertResult, ImageOutputOptions } from '~/utils/core/types';
import FileUpload from '~/components/shared/FileUpload.vue';
import ConversionProgress from '~/components/shared/ConversionProgress.vue';
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

const { t } = useI18n();
const { recent: recentTargets } = useRecentTargets();
const { setOptions } = useOutputOptions();
const { matches: shortcutMatches, formatAction: formatConvertShortcut } = useShortcuts();

const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);

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
  batchFailures,
  completedCount,
  totalCount,
  currentIndex,
  setFiles,
  setTargetFormat,
  convert,
  cancelConversion,
  downloadResult,
  downloadAllZip,
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
 * fire before any file is uploaded, and `setFiles` clears the target on every upload, so the choice
 * has to survive in here until the files land. `options` is `null` for a history record, which
 * remembers a format only and must leave the live output parameters alone; a preset always carries
 * an object, and an empty one means "these are the defaults for this workflow".
 */
interface PendingApplication {
  target: FileFormat;
  options: ImageOutputOptions | null;
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
const showBatchProgress = computed(() => isConverting.value && sourceFiles.value.length > 1);
const batchProgressPercent = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((completedCount.value / totalCount.value) * 100);
});
/** Name of the file currently being processed, for the F6 single-file progress hint. */
const currentFileName = computed(() => {
  if (!isConverting.value) return null;
  const idx = currentIndex.value;
  if (idx < 0 || idx >= sourceFiles.value.length) return null;
  return sourceFiles.value[idx]?.name ?? null;
});
// At least one recognizable file is enough; unknown ones fail per-file
const canConvert = computed(
  () => !isConverting.value && uniqueSourceFormats.value.length > 0 && targetFormat.value !== null,
);

// Comparison view: shown when single file conversion is done
const showComparison = computed(() => {
  return isDone.value && isSingleFile.value && batchResults.value.length === 1 && targetFormat.value !== null;
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
    return cancelRequested.value
      ? t('convert.cancelling')
      : t('convert.converting', { done: completedCount.value, total: totalCount.value });
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

function progressFormat(): string {
  return `${completedCount.value}/${totalCount.value}`;
}

function handleFilesUpdate(files: File[]): void {
  // Freeze the file source while a batch is running
  if (isConverting.value) return;
  if (files.length === 0) {
    reset();
  } else {
    setFiles(files);
  }
  if (pendingApplication.value && hasFiles.value) {
    const pending = pendingApplication.value;
    pendingApplication.value = null;
    applyApplication(pending);
  }
}

/** Adopt a remembered target, and with it any output parameters it carried. */
function applyApplication(pending: PendingApplication): void {
  if (!availableTargets.value.includes(pending.target)) {
    ElMessage.warning(t(pending.unavailableKey));
    return;
  }
  setTargetFormat(pending.target);
  if (pending.options) void setOptions(pending.options);
}

function handleResultUpdate(result: ConvertResult): void {
  updateResult(0, result);
}

function handleReuse(payload: { sourceFormat: FileFormat; targetFormat: FileFormat }): void {
  const pending: PendingApplication = {
    target: payload.targetFormat,
    options: null,
    unavailableKey: 'history.reuseUnavailable',
  };
  if (hasFiles.value) {
    // Apply immediately, or tell the user why it can't be applied
    applyApplication(pending);
    return;
  }
  // No files yet: remember the target and apply it after the next upload
  pendingApplication.value = pending;
  ElMessage.info(t('history.reusePending'));
}

function handleApplyPreset(preset: ConversionPreset): void {
  const pending: PendingApplication = {
    target: preset.target,
    options: { ...preset.options },
    unavailableKey: 'preset.unavailable',
  };
  if (hasFiles.value) {
    applyApplication(pending);
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

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (!shortcutMatches('convert', event)) return;
  const target = event.target as HTMLElement | null;
  // Don't steal the shortcut while the user is typing somewhere
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  if (!canConvert.value) return;
  event.preventDefault();
  convert();
}

// --- Workspace-level drag-and-drop ---------------------------------------
// The FileUpload's own drop zone works, but users often miss it on a tall
// page. A page-wide overlay lets them drop anywhere. The counter pattern
// tolerates nested enter/leave events fired on every child element.
const isWorkspaceDragging = ref(false);
let dragCounter = 0;

function isFileDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  // DataTransferItemList is array-like, DataTransfer.types is DOMStringList in
  // some engines; Array.from covers both.
  return Array.from(types).includes('Files');
}

function handleWorkspaceDragEnter(event: DragEvent): void {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragCounter += 1;
  if (!isConverting.value) isWorkspaceDragging.value = true;
}

function handleWorkspaceDragOver(event: DragEvent): void {
  if (!isFileDrag(event)) return;
  // Without preventDefault the browser refuses the drop
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = isConverting.value ? 'none' : 'copy';
}

function handleWorkspaceDragLeave(event: DragEvent): void {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) isWorkspaceDragging.value = false;
}

function handleWorkspaceDrop(event: DragEvent): void {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragCounter = 0;
  isWorkspaceDragging.value = false;
  if (isConverting.value) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) return;
  fileUploadRef.value?.addFiles(files);
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('dragenter', handleWorkspaceDragEnter);
  document.addEventListener('dragover', handleWorkspaceDragOver);
  document.addEventListener('dragleave', handleWorkspaceDragLeave);
  document.addEventListener('drop', handleWorkspaceDrop);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', warnBeforeLeave);
  document.removeEventListener('keydown', handleGlobalKeydown);
  document.removeEventListener('dragenter', handleWorkspaceDragEnter);
  document.removeEventListener('dragover', handleWorkspaceDragOver);
  document.removeEventListener('dragleave', handleWorkspaceDragLeave);
  document.removeEventListener('drop', handleWorkspaceDrop);
});
</script>

<template>
  <div class="workbench">
    <a
      href="#main-content"
      class="skip-link"
      >{{ t('a11y.skipToContent') }}</a
    >

    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-name">{{ t('appName') }}</span>
          <span class="brand-tag">{{ t('options.subtitle') }}</span>
        </div>
        <!-- persistent=false: the default keeps the content mounted after the first open,
             which would leave PreferencesMenu's shortcut-recording state (and its document
             keydown listener) alive while the popover is closed. -->
        <el-popover
          :width="260"
          trigger="click"
          placement="bottom-end"
          :persistent="false"
        >
          <template #reference>
            <el-button
              :icon="Setting"
              circle
              :title="t('options.preferences')"
              :aria-label="t('options.preferences')"
            />
          </template>
          <PreferencesMenu />
        </el-popover>
      </div>
    </header>

    <main
      id="main-content"
      class="content"
      tabindex="-1"
    >
      <div class="col col-main">
        <div class="card">
          <FileUpload
            ref="fileUploadRef"
            :disabled="isConverting"
            @update:files="handleFilesUpdate"
          />
        </div>

        <!-- F10 — live region for conversion status. Visually hidden, but
             announced by screen readers whenever statusAnnouncement changes. -->
        <div
          class="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ statusAnnouncement ?? '' }}
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
            <div class="action-row">
              <FormatSelector
                :source-formats="uniqueSourceFormats"
                :available-targets="availableTargets"
                :target-format="targetFormat"
                :recent-targets="recentTargets"
                :disabled="isConverting"
                @update:target-format="setTargetFormat"
              />
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
            </div>
            <OutputOptions
              :source-formats="uniqueSourceFormats"
              :target-format="targetFormat"
              :disabled="isConverting"
            />
            <div
              v-if="showBatchProgress"
              class="batch-progress"
            >
              <el-progress
                :percentage="batchProgressPercent"
                :stroke-width="6"
                :format="progressFormat"
              />
            </div>
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
              :failures="batchFailures"
              :cancelled="cancelled"
              :total-count="totalCount"
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
            :result="batchResults[0]"
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

    <footer class="footer">
      {{ t('footer.stats', { formats: formatCount, paths: pathCount }) }}
    </footer>

    <Transition name="fade">
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
  z-index: 10000;
  padding: var(--fat-space-xs) var(--fat-space-sm);
  background: var(--fat-bg-card);
  color: var(--fat-text-primary);
  border: 1px solid var(--fat-text-primary);
  border-radius: var(--fat-radius-sm);
  box-shadow: var(--fat-shadow-lg);
  text-decoration: none;
  font-weight: 600;
  transform: translateY(-200%);
  transition: transform 0.15s ease;
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

/* Visually hidden but exposed to assistive tech (live region, screen-reader-only
   labels, etc.). Standard 1px clip pattern — display:none / visibility:hidden
   would actually hide the content from screen readers as well. */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.topbar {
  background: var(--fat-topbar-bg);
}

.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--fat-space-lg);
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

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--fat-space-lg);
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

.action-row {
  display: flex;
  align-items: center;
  gap: var(--fat-space-md);
}

.action-row :deep(.format-selector) {
  flex: 1;
  min-width: 0;
}

.convert-btn {
  flex-shrink: 0;
  min-width: 140px;
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
  gap: var(--fat-space-sm);
  margin-top: var(--fat-space-sm);
}

.result-actions .reset-btn,
.result-actions .undo-btn {
  flex: 1;
  margin-top: 0;
}

.batch-progress {
  padding: var(--fat-space-sm) 0 0;
}

.footer {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  padding: var(--fat-space-lg);
  font-size: 12px;
  color: var(--fat-text-placeholder);
}

.card-enter-active,
.card-leave-active {
  transition: all 0.25s ease;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.card-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Workspace-wide drag-and-drop hint. The wrapper is pointer-events: none so
   the browser still receives the drop on the underlying element. */
.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fat-primary-bg);
  border: 4px dashed var(--fat-primary);
  pointer-events: none;
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
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (width <= 640px) {
  .action-row {
    flex-direction: column;
    align-items: stretch;
  }

  .convert-btn {
    width: 100%;
  }
}
</style>
