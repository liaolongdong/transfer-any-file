<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { ZoomIn, ZoomOut, Download, Loading } from '@element-plus/icons-vue';
import { marked } from 'marked';
import { FileFormat } from '~/utils/core/types';
import { getFormatLabel } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { docxToPreviewHtml, xlsxToPreviewHtml } from '~/utils/core/preview';
import { DOCUMENT_CSS } from '~/utils/converters/md-to-html';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{
  visible: boolean;
  blob: Blob | null;
  format: FileFormat;
  filename: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const { t } = useI18n();

const scale = ref(1);
const textContent = ref('');
const imageUrl = ref('');
const pdfUrl = ref('');
const renderedHtml = ref('');
const htmlView = ref<'rendered' | 'source'>('rendered');
const renderError = ref(false);

const isText = computed(() =>
  [FileFormat.TXT, FileFormat.CSV].includes(props.format),
);
const isMarkdown = computed(() => props.format === FileFormat.MD);
const isHtml = computed(() => props.format === FileFormat.HTML);
const isImage = computed(() =>
  [FileFormat.PNG, FileFormat.JPG, FileFormat.WEBP, FileFormat.BMP].includes(props.format),
);
const isPdf = computed(() => props.format === FileFormat.PDF);
const isDocx = computed(() => props.format === FileFormat.DOCX);
const isXlsx = computed(() => props.format === FileFormat.XLSX);
const isRenderedDoc = computed(() => isHtml.value || isMarkdown.value || isDocx.value || isXlsx.value);

watch([() => props.visible, () => props.blob], async ([vis, blob]) => {
  if (!vis || !blob) return;
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  imageUrl.value = '';
  pdfUrl.value = '';
  textContent.value = '';
  renderedHtml.value = '';
  renderError.value = false;
  htmlView.value = 'rendered';

  if (isText.value) {
    textContent.value = await blob.text();
  } else if (isMarkdown.value) {
    textContent.value = await blob.text();
    const htmlBody = await marked(textContent.value);
    renderedHtml.value = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOCUMENT_CSS}</style></head><body>${htmlBody}</body></html>`;
  } else if (isHtml.value) {
    textContent.value = await blob.text();
    renderedHtml.value = textContent.value;
  } else if (isImage.value) {
    imageUrl.value = URL.createObjectURL(blob);
    scale.value = 1;
  } else if (isPdf.value) {
    pdfUrl.value = URL.createObjectURL(blob);
  } else if (isDocx.value) {
    try {
      renderedHtml.value = await docxToPreviewHtml(blob);
    } catch {
      renderError.value = true;
    }
  } else if (isXlsx.value) {
    try {
      renderedHtml.value = await xlsxToPreviewHtml(blob);
    } catch {
      renderError.value = true;
    }
  }
});

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
});

function close(): void {
  emit('update:visible', false);
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  imageUrl.value = '';
  pdfUrl.value = '';
}

function download(): void {
  if (!props.blob) return;
  const url = URL.createObjectURL(props.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = props.filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    width="85%"
    destroy-on-close
    class="preview-dialog"
    @update:model-value="emit('update:visible', $event)"
    @close="close"
  >
    <template #header>
      <div class="preview-header">
        <div class="preview-title">
          <span class="filename">{{ filename }}</span>
          <ElTag size="small" type="primary">{{ getFormatLabel(format) }}</ElTag>
          <span class="file-size">{{ blob ? formatSize(blob.size) : '0 B' }}</span>
        </div>
        <div class="preview-actions">
          <ElRadioGroup
            v-if="(isHtml || isMarkdown) && textContent"
            v-model="htmlView"
            size="small"
          >
            <ElRadioButton value="rendered">{{ t('preview.renderedTab') }}</ElRadioButton>
            <ElRadioButton value="source">{{ t('preview.sourceTab') }}</ElRadioButton>
          </ElRadioGroup>
          <ElButton v-if="isImage" text :title="t('preview.zoomOut')" @click="scale = Math.max(scale - 0.25, 0.25)">
            <ZoomOut />
          </ElButton>
          <ElButton v-if="isImage" text :title="t('preview.zoomIn')" @click="scale = Math.min(scale + 0.25, 3)">
            <ZoomIn />
          </ElButton>
          <ElButton text @click="download">
            <Download /> {{ t('preview.download') }}
          </ElButton>
        </div>
      </div>
    </template>

    <div class="preview-content">
      <!-- Plain text / csv source -->
      <pre v-if="isText" class="text-preview">{{ textContent }}</pre>
      <!-- Markdown: rendered iframe or raw source -->
      <iframe
        v-else-if="isMarkdown && htmlView === 'rendered' && renderedHtml"
        class="doc-frame"
        sandbox=""
        :srcdoc="renderedHtml"
        :title="filename"
      ></iframe>
      <pre v-else-if="isMarkdown && htmlView === 'source'" class="text-preview">{{ textContent }}</pre>
      <!-- HTML: rendered iframe or raw source -->
      <iframe
        v-else-if="isHtml && htmlView === 'rendered' && renderedHtml"
        class="doc-frame"
        sandbox=""
        :srcdoc="renderedHtml"
        :title="filename"
      ></iframe>
      <pre v-else-if="isHtml && htmlView === 'source'" class="text-preview">{{ textContent }}</pre>
      <!-- DOCX / XLSX rendered to HTML -->
      <iframe
        v-else-if="(isDocx || isXlsx) && renderedHtml"
        class="doc-frame"
        sandbox=""
        :srcdoc="renderedHtml"
        :title="filename"
      ></iframe>
      <div v-else-if="(isDocx || isXlsx) && renderError" class="render-error">
        {{ t('preview.renderFailed') }}
      </div>
      <div v-else-if="isRenderedDoc" class="render-loading">
        <ElIcon class="is-loading"><Loading /></ElIcon>
      </div>
      <!-- Image -->
      <div v-else-if="isImage" class="image-preview">
        <img
          :src="imageUrl"
          :alt="filename"
          class="preview-image"
          :style="{ transform: `scale(${scale})` }"
        />
      </div>
      <!-- PDF -->
      <iframe v-else-if="isPdf" :src="pdfUrl" class="pdf-preview" :title="filename" />
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-size">{{ blob ? formatSize(blob.size) : '0 B' }}</span>
        <ElButton @click="close">{{ t('common.close') }}</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--fat-space-md);
  flex-wrap: wrap;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  min-width: 0;
}

.filename {
  font-size: 16px;
  font-weight: 600;
  color: var(--fat-text-primary, #1f2937);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
}

.preview-content {
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
}

.text-preview {
  margin: 0;
  padding: var(--fat-space-md);
  background: var(--fat-surface-2, #fafbfc);
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: var(--fat-radius-md, 8px);
  font-family: var(--fat-font-mono, 'SF Mono', Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  color: var(--fat-text-regular, #303133);
}

.doc-frame {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: var(--fat-radius-md, 8px);
  background: #fff;
}

.render-loading,
.render-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: var(--fat-text-placeholder, #909399);
  font-size: 13px;
}

.image-preview {
  display: flex;
  justify-content: center;
  padding: var(--fat-space-md);
  background: var(--fat-surface, #f0f2f5);
  border-radius: var(--fat-radius-md, 8px);
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  transform-origin: top center;
  transition: transform 0.2s ease;
  border-radius: var(--fat-radius-md, 8px);
  box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
}

.pdf-preview {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: var(--fat-radius-md, 8px);
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.file-size {
  font-size: 12px;
  color: var(--fat-text-placeholder, #909399);
}
</style>
