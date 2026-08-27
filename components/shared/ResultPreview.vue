<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import { CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { FileFormat } from '~/utils/core/types';
import type { ConvertResult } from '~/utils/core/types';
import { getFormatCategory as getCategory } from '~/utils/core/format-labels';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{
  result: ConvertResult | null;
  targetFormat: FileFormat | null;
}>();

const emit = defineEmits<{
  (e: 'update:result', result: ConvertResult): void;
}>();

const { t } = useI18n();

const textContent = ref('');
// Untruncated text kept for the rendered HTML iframe
const fullText = ref('');
const imageUrl = ref('');
const isTruncated = ref(false);
// 'rendered' | 'source' view for HTML results
const htmlView = ref<'rendered' | 'source'>('rendered');
// Only true text formats are previewable/editable; binary documents
// (PDF/DOCX/XLSX) must never be read as text or overwritten by edits.
const TEXT_FORMATS = new Set<FileFormat>([FileFormat.MD, FileFormat.HTML, FileFormat.TXT, FileFormat.CSV]);
const isTextFormat = computed(() => {
  if (!props.targetFormat) return false;
  return TEXT_FORMATS.has(props.targetFormat);
});
const isHtmlFormat = computed(() => props.targetFormat === FileFormat.HTML);
const isImageFormat = computed(() => {
  if (!props.targetFormat) return false;
  return getCategory(props.targetFormat) === 'image';
});
const isPreviewable = computed(() => isTextFormat.value || isImageFormat.value);

// Blob we last emitted from an edit; skip re-reading it in the watcher so
// typing doesn't reset the textarea (cursor jump / lost keystrokes)
let lastEmittedBlob: Blob | null = null;

watch(
  () => [props.result, props.targetFormat] as const,
  async ([result, format], _old, onCleanup) => {
    if (result && result.blob === lastEmittedBlob) return;
    let stale = false;
    onCleanup(() => {
      stale = true;
    });

    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value);
      imageUrl.value = '';
    }
    textContent.value = '';
    fullText.value = '';
    isTruncated.value = false;

    if (!result || !format) return;

    if (getCategory(format) === 'image') {
      imageUrl.value = URL.createObjectURL(result.blob);
    } else if (TEXT_FORMATS.has(format)) {
      try {
        const text = await result.blob.text();
        if (stale) return;
        fullText.value = text;
        isTruncated.value = text.length > 10000;
        textContent.value = isTruncated.value ? text.slice(0, 10000) + '\n' + t('preview.truncated') : text;
      } catch {
        if (!stale) textContent.value = t('preview.readResultFail');
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  if (editDebounce !== undefined) {
    clearTimeout(editDebounce);
  }
});

let editDebounce: ReturnType<typeof setTimeout> | undefined;

function handleTextEdit(value: string): void {
  textContent.value = value;
  // Editing a truncated preview would overwrite the full result with a fragment
  if (!props.result || isTruncated.value) return;
  fullText.value = value;
  clearTimeout(editDebounce);
  editDebounce = setTimeout(() => {
    if (!props.result) return;
    const newBlob = new Blob([value], { type: props.result.blob.type });
    lastEmittedBlob = newBlob;
    emit('update:result', {
      blob: newBlob,
      filename: props.result.filename,
    });
  }, 300);
}

async function copyToClipboard(): Promise<void> {
  if (!textContent.value) return;
  try {
    await navigator.clipboard.writeText(textContent.value);
    ElMessage.success(t('preview.copied'));
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = textContent.value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    ElMessage.success(t('preview.copied'));
  }
}
</script>

<template>
  <div
    v-if="result && targetFormat && isPreviewable"
    class="result-preview"
  >
    <div class="preview-header">
      <span
        class="preview-title"
        :title="result.filename"
      >{{ result.filename }}</span>
      <div class="preview-actions">
        <el-radio-group
          v-if="isHtmlFormat"
          v-model="htmlView"
          size="small"
        >
          <el-radio-button value="rendered">{{ t('preview.renderedTab') }}</el-radio-button>
          <el-radio-button value="source">{{ t('preview.sourceTab') }}</el-radio-button>
        </el-radio-group>
        <el-button
          v-if="isTextFormat && textContent"
          :icon="CopyDocument"
          size="small"
          text
          type="primary"
          @click="copyToClipboard"
        >
          {{ t('preview.copy') }}
        </el-button>
      </div>
    </div>

    <!-- Image preview -->
    <div
      v-if="isImageFormat && imageUrl"
      class="preview-image"
    >
      <img
        :src="imageUrl"
        :alt="result.filename"
      />
    </div>

    <!-- Rendered HTML preview (sandboxed, no scripts) -->
    <iframe
      v-else-if="isHtmlFormat && htmlView === 'rendered'"
      class="preview-frame"
      sandbox=""
      :srcdoc="fullText"
      :title="result.filename"
    ></iframe>

    <!-- Editable text preview -->
    <div
      v-else-if="isTextFormat"
      class="preview-text"
    >
      <el-input
        :model-value="textContent"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 10 }"
        :readonly="isTruncated"
        :placeholder="t('preview.resultPlaceholder')"
        @input="handleTextEdit"
      />
    </div>
  </div>
</template>

<style scoped>
.result-preview {
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-md);
  overflow: hidden;
  background: var(--fat-surface-2);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--fat-space-sm) var(--fat-space-md);
  background: var(--fat-surface);
  border-bottom: 1px solid var(--fat-border);
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fat-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: var(--fat-space-sm);
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  flex-shrink: 0;
}

.preview-frame {
  display: block;
  width: 100%;
  height: 280px;
  border: none;
  background: #fff;
}

.preview-image {
  max-height: 200px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--fat-space-sm);
}

.preview-image img {
  max-width: 100%;
  max-height: 184px;
  object-fit: contain;
  border-radius: var(--fat-radius-sm);
}

.preview-text {
  padding: var(--fat-space-sm);
}

.preview-text :deep(.el-textarea__inner) {
  font-family: var(--fat-font-mono);
  font-size: 12px;
  line-height: 1.5;
  border-radius: var(--fat-radius-sm) !important;
}
</style>
