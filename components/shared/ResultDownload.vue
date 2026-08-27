<script setup lang="ts">
import { computed, ref } from 'vue';
import { Download, View, CircleCloseFilled } from '@element-plus/icons-vue';
import type { ConvertResult } from '~/utils/core/types';
import type { ConversionFailure } from '~/composables/useConversion';
import { CONVERSION_ERROR_KEYS } from '~/composables/useConversion';
import { useI18n } from '~/composables/useI18n';
import { useFileDetect } from '~/composables/useFileDetect';
import { formatSize } from '~/utils/core/format';
import { FileFormat } from '~/utils/core/types';
import PreviewDialog from '~/components/shared/PreviewDialog.vue';

const props = defineProps<{
  results: ConvertResult[];
  failures: ConversionFailure[];
}>();

const emit = defineEmits<{
  (e: 'download', index: number): void;
  (e: 'downloadAll'): void;
}>();

const { t } = useI18n();
const { detectFormat } = useFileDetect();

const hasFailures = computed(() => props.failures.length > 0);
const alertType = computed(() => {
  if (props.results.length === 0) return 'error';
  return hasFailures.value ? 'warning' : 'success';
});
const alertTitle = computed(() => {
  if (props.results.length === 0) return t('result.doneNone');
  if (hasFailures.value) {
    return t('result.donePartial', { ok: props.results.length, fail: props.failures.length });
  }
  if (props.results.length === 1) return t('result.doneSingle');
  return t('result.doneMulti', { count: props.results.length });
});
const downloadButtonText = computed(() => {
  if (props.results.length === 1) return t('result.download');
  return t('result.downloadZip', { count: props.results.length });
});

function failureReason(reason: string): string {
  return CONVERSION_ERROR_KEYS.has(reason) ? t(reason) : reason;
}

function handleDownload(): void {
  if (props.results.length === 1) {
    emit('download', 0);
  } else {
    emit('downloadAll');
  }
}

function detectFormatFromFilename(name: string): FileFormat {
  return detectFormat(new File([], name)) ?? FileFormat.HTML;
}

const previewVisible = ref(false);
const previewBlob = ref<Blob | null>(null);
const previewFormat = ref(FileFormat.HTML);
const previewFilename = ref('');

function openPreview(result: ConvertResult): void {
  previewBlob.value = result.blob;
  previewFormat.value = detectFormatFromFilename(result.filename);
  previewFilename.value = result.filename;
  previewVisible.value = true;
}
</script>

<template>
  <div
    v-if="results.length > 0 || failures.length > 0"
    class="result-download"
  >
    <el-alert
      :title="alertTitle"
      :type="alertType"
      :closable="false"
      show-icon
    >
      <div class="result-list">
        <div
          v-for="(result, index) in results"
          :key="index"
          class="result-item"
        >
          <span class="result-name">{{ result.filename }}</span>
          <span class="result-size">{{ formatSize(result.blob.size) }}</span>
          <el-button
            :icon="View"
            size="small"
            text
            type="primary"
            :title="t('result.preview')"
            @click="openPreview(result)"
          />
          <el-button
            v-if="results.length > 1"
            :icon="Download"
            size="small"
            text
            type="primary"
            :title="t('result.download')"
            @click="emit('download', index)"
          />
        </div>
        <div
          v-for="(failure, index) in failures"
          :key="index"
          class="result-item failed"
        >
          <el-icon
            :size="14"
            color="var(--el-color-danger)"
          >
            <CircleCloseFilled />
          </el-icon>
          <span class="result-name">{{ failure.fileName }}</span>
          <span class="result-reason">{{ failureReason(failure.reason) }}</span>
        </div>
      </div>
    </el-alert>

    <div
      v-if="results.length > 0"
      class="download-actions"
    >
      <el-button
        type="primary"
        :icon="Download"
        style="width: 100%"
        @click="handleDownload"
      >
        {{ downloadButtonText }}
      </el-button>
    </div>

    <PreviewDialog
      v-model:visible="previewVisible"
      :blob="previewBlob"
      :format="previewFormat"
      :filename="previewFilename"
    />
  </div>
</template>

<style scoped>
.result-download {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-md);
}

.result-list {
  margin-top: var(--fat-space-xs);
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-xs);
}

.result-item {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  font-size: 12px;
}

.result-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-size {
  flex-shrink: 0;
  color: var(--fat-text-secondary);
}

.result-item.failed .result-name {
  color: var(--el-color-danger);
}

.result-reason {
  flex-shrink: 0;
  color: var(--el-color-danger);
}

.download-actions {
  display: flex;
}
</style>
