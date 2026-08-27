<script setup lang="ts">
import { computed, ref } from 'vue';
import { Setting, RefreshRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { initConverters } from '~/utils/converters';
import { useConversion, CONVERSION_ERROR_KEYS } from '~/composables/useConversion';
import { useI18n } from '~/composables/useI18n';
import { converterRegistry } from '~/utils/core/registry';
import { FileFormat } from '~/utils/core/types';
import { getFormatCategory } from '~/utils/core/format-labels';
import type { ConvertResult } from '~/utils/core/types';
import FileUpload from '~/components/shared/FileUpload.vue';
import FilePreview from '~/components/shared/FilePreview.vue';
import FormatSelector from '~/components/shared/FormatSelector.vue';
import ConversionProgress from '~/components/shared/ConversionProgress.vue';
import ResultDownload from '~/components/shared/ResultDownload.vue';
import ResultPreview from '~/components/shared/ResultPreview.vue';
import CollapsibleCard from '~/components/shared/CollapsibleCard.vue';
import PreferencesMenu from '~/components/shared/PreferencesMenu.vue';
import HistoryPanel from '~/components/options/HistoryPanel.vue';

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

// Right-side preview panels
const showFilePreview = computed(() => sourceFile.value !== null && sourceFormat.value !== null && isSingleFile.value);
const PREVIEWABLE_TEXT = new Set<FileFormat>([FileFormat.MD, FileFormat.HTML, FileFormat.TXT, FileFormat.CSV]);
const showResultPreview = computed(() => {
  if (!isDone.value || batchResults.value.length !== 1 || !targetFormat.value) return false;
  return getFormatCategory(targetFormat.value) === 'image' || PREVIEWABLE_TEXT.has(targetFormat.value);
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
      <section class="col col-main">
        <div class="card">
          <FileUpload
            :disabled="isConverting"
            @update:files="handleFilesUpdate"
          />
        </div>

        <Transition name="card" mode="out-in">
          <div
            v-if="hasFiles"
            key="format-selector"
            class="card"
          >
            <FormatSelector
              :source-formats="uniqueSourceFormats"
              :available-targets="availableTargets"
              :target-format="targetFormat"
              @update:target-format="setTargetFormat"
            />
          </div>
        </Transition>

        <Transition name="card" mode="out-in">
          <div
            v-if="hasFiles && targetFormat && !isDone"
            key="convert-btn"
            class="card"
          >
            <el-button
              type="primary"
              :icon="RefreshRight"
              :loading="isConverting"
              :disabled="!canConvert"
              class="convert-btn"
              @click="convert"
            >
              {{ convertButtonText }}
            </el-button>
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
      </section>

      <aside class="col col-side">
        <CollapsibleCard
          v-if="showFilePreview"
          :title="t('preview.fileTitle')"
        >
          <FilePreview
            :file="sourceFile"
            :format="sourceFormat"
          />
        </CollapsibleCard>

        <CollapsibleCard
          v-if="showResultPreview"
          :title="t('preview.resultTitle')"
        >
          <ResultPreview
            :result="batchResults[0]"
            :target-format="targetFormat"
            @update:result="handleResultUpdate"
          />
        </CollapsibleCard>

        <CollapsibleCard :title="t('history.title')">
          <HistoryPanel @reuse="handleReuse" />
        </CollapsibleCard>
      </aside>
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
  max-width: 1080px;
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
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--fat-space-lg);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--fat-space-lg);
  align-items: start;
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

.convert-btn,
.reset-btn {
  width: 100%;
}

.reset-btn {
  margin-top: var(--fat-space-sm);
}

.batch-progress {
  padding: var(--fat-space-sm) 0 0;
}

.footer {
  max-width: 1080px;
  margin: 0 auto;
  text-align: center;
  padding: var(--fat-space-lg);
  font-size: 12px;
  color: var(--fat-text-placeholder);
}

@media (width <= 900px) {
  .content {
    grid-template-columns: minmax(0, 1fr);
  }
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
</style>
