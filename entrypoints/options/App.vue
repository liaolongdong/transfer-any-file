<script setup lang="ts">
import { computed, ref, defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { Setting, RefreshRight, CircleClose } from '@element-plus/icons-vue';
import { initConverters } from '~/utils/converters';
import { useConversion, CONVERSION_ERROR_KEYS } from '~/composables/useConversion';
import { useI18n } from '~/composables/useI18n';
import { converterRegistry } from '~/utils/core/registry';
import { FileFormat } from '~/utils/core/types';
import type { ConvertResult } from '~/utils/core/types';
import FileUpload from '~/components/shared/FileUpload.vue';
import ConversionProgress from '~/components/shared/ConversionProgress.vue';
import CollapsibleCard from '~/components/shared/CollapsibleCard.vue';
import PreferencesMenu from '~/components/shared/PreferencesMenu.vue';
import HistoryPanel from '~/components/options/HistoryPanel.vue';

// Rendered only after files are uploaded / conversion finishes, so their code
// (including the heavy document-preview chain) stays out of the initial bundle
const FormatSelector = defineAsyncComponent(() => import('~/components/shared/FormatSelector.vue'));
const ResultDownload = defineAsyncComponent(() => import('~/components/shared/ResultDownload.vue'));
const ComparisonView = defineAsyncComponent(() => import('~/components/shared/ComparisonView.vue'));

initConverters();

const { t } = useI18n();

const {
  sourceFile,
  sourceFormat,
  sourceFiles,
  uniqueSourceFormats,
  availableTargets,
  targetFormat,
  isConverting,
  error,
  batchResults,
  batchFailures,
  completedCount,
  totalCount,
  setFiles,
  setTargetFormat,
  convert,
  cancelConversion,
  downloadResult,
  downloadAllZip,
  updateResult,
  clearResults,
  reset,
} = useConversion();

const registeredPairs = converterRegistry.getRegisteredFormats();
const uniqueFormats = new Set<FileFormat>();
registeredPairs.forEach(p => {
  uniqueFormats.add(p.from);
  uniqueFormats.add(p.to);
});
const formatCount = uniqueFormats.size;
const pathCount = registeredPairs.length;

// prefilled format pair reused from history (shown as a hint)
const reusedTarget = ref<FileFormat | null>(null);

const hasFiles = computed(() => sourceFiles.value.length > 0);
const hasResults = computed(() => batchResults.value.length > 0);
const hasFailures = computed(() => batchFailures.value.length > 0);
// Only "done" once the whole batch finished, so progress UI stays visible
const isDone = computed(() => !isConverting.value && (hasResults.value || hasFailures.value));
const isSingleFile = computed(() => sourceFiles.value.length === 1);
const showBatchProgress = computed(() => isConverting.value && sourceFiles.value.length > 1);
const batchProgressPercent = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((completedCount.value / totalCount.value) * 100);
});
// At least one recognizable file is enough; unknown ones fail per-file
const canConvert = computed(
  () => !isConverting.value && uniqueSourceFormats.value.length > 0 && targetFormat.value !== null,
);

// Comparison view: shown when single file conversion is done
const showComparison = computed(() => {
  return isDone.value && isSingleFile.value && batchResults.value.length === 1 && targetFormat.value !== null;
});

const convertButtonText = computed(() => {
  if (isConverting.value) return t('convert.converting', { done: completedCount.value, total: totalCount.value });
  if (sourceFiles.value.length > 1) return t('convert.startMulti', { count: sourceFiles.value.length });
  return t('convert.start');
});

const displayError = computed(() => {
  if (!error.value) return null;
  return CONVERSION_ERROR_KEYS.has(error.value) ? t(error.value) : error.value;
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
  // apply reused target format if it is reachable from the new source
  if (reusedTarget.value && hasFiles.value) {
    if (availableTargets.value.includes(reusedTarget.value)) {
      setTargetFormat(reusedTarget.value);
    }
    reusedTarget.value = null;
  }
}

function handleResultUpdate(result: ConvertResult): void {
  updateResult(0, result);
}

function handleReuse(payload: { sourceFormat: FileFormat; targetFormat: FileFormat }): void {
  if (hasFiles.value) {
    // Apply immediately, or tell the user why it can't be applied
    if (availableTargets.value.includes(payload.targetFormat)) {
      setTargetFormat(payload.targetFormat);
    } else {
      ElMessage.warning(t('history.reuseUnavailable'));
    }
    reusedTarget.value = null;
    return;
  }
  // No files yet: remember the target and apply it after the next upload
  reusedTarget.value = payload.targetFormat;
  ElMessage.info(t('history.reusePending'));
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
  const target = event.target as HTMLElement | null;
  // Don't steal the shortcut while the user is typing somewhere
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  if (!canConvert.value) return;
  event.preventDefault();
  convert();
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="workbench">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <span class="brand-name">{{ t('appName') }}</span>
          <span class="brand-tag">{{ t('options.subtitle') }}</span>
        </div>
        <el-popover
          :width="260"
          trigger="click"
          placement="bottom-end"
        >
          <template #reference>
            <el-button
              :icon="Setting"
              circle
              :title="t('options.preferences')"
            />
          </template>
          <PreferencesMenu />
        </el-popover>
      </div>
    </header>

    <main class="content">
      <div class="col col-main">
        <div class="card">
          <FileUpload
            :disabled="isConverting"
            @update:files="handleFilesUpdate"
          />
        </div>

        <Transition name="card" mode="out-in">
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
                @update:target-format="setTargetFormat"
              />
              <el-button
                type="primary"
                :icon="RefreshRight"
                :loading="isConverting"
                :disabled="!canConvert"
                class="convert-btn"
                :title="t('convert.shortcutHint')"
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
                @click="cancelConversion"
              >
                {{ t('convert.cancel') }}
              </el-button>
            </div>
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

        <Transition name="card" mode="out-in">
          <div
            v-if="(isConverting && !showBatchProgress) || displayError"
            key="conversion-progress"
            class="card"
          >
            <ConversionProgress
              :is-converting="isConverting"
              :error="displayError"
            />
          </div>
        </Transition>

        <Transition name="card" mode="out-in">
          <div
            v-if="isDone"
            key="result-download"
            class="card"
          >
            <ResultDownload
              :results="batchResults"
              :failures="batchFailures"
              @download="downloadResult"
              @download-all="downloadAllZip"
            />
            <el-button
              text
              type="info"
              class="reset-btn"
              @click="clearResults"
            >
              {{ t('convert.reconvert') }}
            </el-button>
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

        <CollapsibleCard :title="t('history.title')">
          <HistoryPanel @reuse="handleReuse" />
        </CollapsibleCard>
      </div>
    </main>

    <footer class="footer">
      {{ t('footer.stats', { formats: formatCount, paths: pathCount }) }}
    </footer>
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

.topbar {
  background: var(--fat-primary);
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
  color: #fff;
}

.brand-tag {
  font-size: 12px;
  color: rgb(255 255 255 / 85%);
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
