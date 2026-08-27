<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import { FileFormat } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{
  file: File | null;
  format: FileFormat | null;
}>();

const { t } = useI18n();

const textContent = ref('');
const htmlSource = ref('');
const imageUrl = ref('');
const isLoading = ref(false);
const isImage = computed(() => props.format !== null && getFormatCategory(props.format) === 'image');
const isHtml = computed(() => props.format === FileFormat.HTML);

watch(
  () => [props.file, props.format] as const,
  async ([file, format]) => {
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value);
      imageUrl.value = '';
    }
    textContent.value = '';
    htmlSource.value = '';
    if (!file || !format) return;
    const category = getFormatCategory(format);
    if (category === 'image') {
      imageUrl.value = URL.createObjectURL(file);
    } else if (format === FileFormat.HTML) {
      // Render HTML as-is in a fully sandboxed iframe (no scripts)
      isLoading.value = true;
      try {
        htmlSource.value = await file.text();
      } catch {
        textContent.value = t('preview.readFileFail');
      } finally {
        isLoading.value = false;
      }
    } else if (format === FileFormat.MD || format === FileFormat.TXT || format === FileFormat.CSV) {
      isLoading.value = true;
      try {
        const text = await file.text();
        textContent.value = text.length > 5000 ? text.slice(0, 5000) + '\n' + t('preview.truncated') : text;
      } catch {
        textContent.value = t('preview.readFileFail');
      } finally {
        isLoading.value = false;
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
});
</script>

<template>
  <div
    v-if="file && format"
    class="file-preview"
  >
    <div class="preview-header">
      <span
        class="preview-title"
        :title="file.name"
      >{{ file.name }}</span>
      <el-tag
        size="small"
        type="info"
      >
        {{ getFormatLabel(format) }}
      </el-tag>
    </div>
    <div
      v-if="isImage && imageUrl"
      class="preview-image"
    >
      <img
        :src="imageUrl"
        :alt="file.name"
      />
    </div>
    <iframe
      v-else-if="isHtml && htmlSource"
      class="preview-frame"
      sandbox=""
      :srcdoc="htmlSource"
      :title="file.name"
    ></iframe>
    <div
      v-else-if="textContent"
      class="preview-text"
    >
      <pre>{{ textContent }}</pre>
    </div>
    <div
      v-else-if="isLoading"
      class="preview-loading"
    >
      <span>{{ t('preview.reading') }}</span>
    </div>
    <div
      v-else
      class="preview-info"
    >
      <div class="info-row">
        <span class="info-label">{{ t('preview.fileName') }}</span>
        <span class="info-value">{{ file.name }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('preview.size') }}</span>
        <span class="info-value">{{ formatSize(file.size) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('preview.format') }}</span>
        <span class="info-value">{{ getFormatLabel(format) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-preview {
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
  max-height: 200px;
  overflow: auto;
  padding: var(--fat-space-sm) var(--fat-space-md);
}

.preview-frame {
  display: block;
  width: 100%;
  height: 280px;
  border: none;
  background: #fff;
}

.preview-text pre {
  margin: 0;
  font-family: var(--fat-font-mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--fat-text-regular);
}

.preview-loading {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-lg);
  color: var(--fat-text-placeholder);
  font-size: 13px;
  animation: fat-pulse 1.5s ease-in-out infinite;
}

.preview-info {
  padding: var(--fat-space-md);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--fat-space-xs) 0;
}

.info-row + .info-row {
  border-top: 1px solid var(--fat-border-light);
}

.info-label {
  font-size: 12px;
  color: var(--fat-text-placeholder);
}

.info-value {
  font-size: 12px;
  color: var(--fat-text-regular);
  font-weight: 500;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
