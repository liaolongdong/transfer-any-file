<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { ZoomIn, ZoomOut, Download } from '@element-plus/icons-vue'
import { FileFormat } from '~/utils/core/types'
import { getFormatLabel } from '~/utils/core/format-labels'
import { formatSize } from '~/utils/core/format'
import { useI18n } from '~/composables/useI18n'

const props = defineProps<{
  visible: boolean
  blob: Blob | null
  format: FileFormat
  filename: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

const scale = ref(1)
const textContent = ref('')
const imageUrl = ref('')
const pdfUrl = ref('')

const isText = computed(() => [FileFormat.MD, FileFormat.HTML, FileFormat.TXT, FileFormat.CSV].includes(props.format))
const isImage = computed(() => [FileFormat.PNG, FileFormat.JPG, FileFormat.WEBP, FileFormat.BMP].includes(props.format))
const isPdf = computed(() => props.format === FileFormat.PDF)
const isDocx = computed(() => props.format === FileFormat.DOCX)

watch([() => props.visible, () => props.blob], async ([vis, blob]) => {
  if (!vis || !blob) return
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  if (isText.value) textContent.value = await blob.text()
  else if (isImage.value) { imageUrl.value = URL.createObjectURL(blob); scale.value = 1 }
  else if (isPdf.value) pdfUrl.value = URL.createObjectURL(blob)
  else if (isDocx.value) textContent.value = t('preview.docxPlaceholder', { filename: props.filename, size: formatSize(blob.size) })
})

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
})

function close() {
  emit('update:visible', false)
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
}

function download() {
  if (!props.blob) return
  const url = URL.createObjectURL(props.blob)
  const a = document.createElement('a')
  a.href = url; a.download = props.filename; a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    @close="close"
    width="85%"
    destroy-on-close
    class="preview-dialog"
  >
    <template #header>
      <div class="preview-header">
        <div class="preview-title">
          <span class="filename">{{ filename }}</span>
          <ElTag size="small" type="primary">{{ getFormatLabel(format) }}</ElTag>
        </div>
        <div class="preview-actions">
          <ElButton v-if="isImage" text @click="scale = Math.max(scale - 0.25, 0.25)">
            <ZoomOut />
          </ElButton>
          <ElButton v-if="isImage" text @click="scale = Math.min(scale + 0.25, 3)">
            <ZoomIn />
          </ElButton>
          <ElButton text @click="download">
            <Download /> {{ t('preview.download') }}
          </ElButton>
        </div>
      </div>
    </template>

    <div class="preview-content">
      <pre v-if="isText" class="text-preview">{{ textContent }}</pre>
      <div v-if="isImage" class="image-preview">
        <img
          :src="imageUrl"
          :alt="filename"
          class="preview-image"
          :style="{ transform: `scale(${scale})` }"
        />
      </div>
      <iframe v-if="isPdf" :src="pdfUrl" class="pdf-preview" />
      <div v-if="isDocx" class="docx-preview">{{ textContent }}</div>
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
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filename {
  font-size: 16px;
  font-weight: 600;
  color: var(--fat-text-primary, #1f2937);
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-content {
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
}

.text-preview {
  margin: 0;
  padding: 16px;
  background: var(--fat-surface-2, #fafbfc);
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: 8px;
  font-family: var(--fat-font-mono, 'SF Mono', Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--fat-text-regular, #303133);
}

.image-preview {
  display: flex;
  justify-content: center;
  padding: 16px;
  background: var(--fat-surface, #f0f2f5);
  border-radius: 8px;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  transform-origin: top center;
  transition: transform 0.2s ease;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.pdf-preview {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: 8px;
}

.docx-preview {
  text-align: center;
  padding: 48px;
  color: var(--fat-text-secondary, #6b7280);
  white-space: pre-wrap;
  line-height: 1.6;
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
