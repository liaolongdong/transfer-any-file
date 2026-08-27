<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Component } from 'vue';
import { UploadFilled, Delete, Picture, Document, Grid } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { FileFormat } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { useFileDetect, SUPPORTED_EXTENSIONS } from '~/composables/useFileDetect';
import { useI18n } from '~/composables/useI18n';

const props = withDefaults(
  defineProps<{
    multiple?: boolean;
    /** Blocks all file intake (click/drop/paste), e.g. while converting */
    disabled?: boolean;
  }>(),
  { multiple: true, disabled: false },
);

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void;
}>();

const { detectFormat } = useFileDetect();
const { t } = useI18n();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const detectedFormats = ref<(FileFormat | null)[]>([]);
const isDragging = ref(false);

const acceptExtensions = SUPPORTED_EXTENSIONS.join(',');
const pasteKey = /mac/i.test(navigator.platform) ? '⌘V' : 'Ctrl+V';

const dropText = computed(() => (selectedFiles.value.length === 0 ? t('upload.drop') : t('upload.replace')));

/** Map clipboard image MIME to a filename extension for correct detection */
const PASTE_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
};

/** Turn clipboard contents (image files or plain text) into upload files */
function handlePaste(event: ClipboardEvent): void {
  if (props.disabled) return;
  const target = event.target as HTMLElement | null;
  // Don't hijack paste while the user is typing in an input or textarea
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  const clipboard = event.clipboardData;
  if (!clipboard) return;

  const files = Array.from(clipboard.files);
  if (files.length > 0) {
    event.preventDefault();
    const stamp = Date.now();
    // Clipboard images usually share the same name ("image.png") and may
    // carry the wrong extension; rename them from their MIME type
    const named = files.map((f, i) => {
      const ext = PASTE_EXTENSIONS[f.type];
      if (!ext) return f;
      return new File([f], `pasted-${stamp}-${i + 1}${ext}`, { type: f.type });
    });
    selectFiles(named);
    return;
  }

  const text = clipboard.getData('text/plain');
  if (text.trim()) {
    event.preventDefault();
    const file = new File([text], `pasted-${Date.now()}.txt`, { type: 'text/plain' });
    selectFiles([file]);
  }
}

onMounted(() => {
  document.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste);
});

function triggerFileInput(): void {
  if (props.disabled) return;
  fileInput.value?.click();
}

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length > 0) {
    selectFiles(files);
  }
  input.value = '';
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false;
  if (props.disabled) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length > 0) {
    selectFiles(files);
  }
}

function handleDragOver(): void {
  isDragging.value = true;
}

function handleDragLeave(): void {
  isDragging.value = false;
}

const MAX_WARN_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_REJECT_SIZE = 100 * 1024 * 1024; // 100MB

function selectFiles(files: File[]): void {
  const validFiles: File[] = [];
  for (const file of files) {
    if (file.size > MAX_REJECT_SIZE) {
      ElMessage.error(t('upload.tooLarge', { name: file.name }));
      continue;
    }
    if (file.size > MAX_WARN_SIZE) {
      ElMessage.warning(t('upload.largeWarning', { name: file.name, size: formatSize(file.size) }));
    }
    validFiles.push(file);
  }
  const next = props.multiple ? validFiles : validFiles.slice(0, 1);
  selectedFiles.value = next;
  detectedFormats.value = next.map(f => detectFormat(f));
  emit('update:files', next);
}

function removeFile(index: number): void {
  if (props.disabled) return;
  const newFiles = [...selectedFiles.value];
  newFiles.splice(index, 1);
  if (newFiles.length === 0) {
    selectedFiles.value = [];
    detectedFormats.value = [];
    emit('update:files', []);
  } else {
    selectFiles(newFiles);
  }
}

function getFileIcon(format: FileFormat | null): Component {
  if (!format) return Document;
  const category = getFormatCategory(format);
  if (category === 'image') return Picture;
  if (category === 'data') return Grid;
  return Document;
}

function getFormatLabelSafe(format: FileFormat | null): string {
  if (!format) return t('upload.unknownFormat');
  return getFormatLabel(format);
}
</script>

<template>
  <div class="file-upload">
    <div
      class="drop-zone"
      :class="{ dragging: isDragging, 'has-file': selectedFiles.length > 0, disabled: disabled }"
      role="button"
      tabindex="0"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
      @keydown.enter.prevent="triggerFileInput"
      @keydown.space.prevent="triggerFileInput"
    >
      <el-icon
        :size="36"
        color="var(--fat-primary)"
      >
        <UploadFilled />
      </el-icon>
      <p class="drop-text">{{ dropText }}</p>
      <p class="paste-hint">{{ t('upload.pasteHint', { key: pasteKey }) }}</p>
    </div>
    <input
      ref="fileInput"
      type="file"
      :multiple="multiple"
      :accept="acceptExtensions"
      style="display: none"
      @change="handleFileSelect"
    />

    <TransitionGroup
      v-if="selectedFiles.length > 0"
      name="file-list"
      tag="div"
      class="file-list"
    >
      <div class="file-list-header" key="header">
        <span>{{ t('upload.selectedCount', { count: selectedFiles.length }) }}</span>
      </div>
      <div
        v-for="(file, index) in selectedFiles"
        :key="file.name + index"
        class="file-item"
      >
        <el-icon
          class="file-icon"
          :size="18"
          color="var(--fat-text-secondary)"
        >
          <component :is="getFileIcon(detectedFormats[index])" />
        </el-icon>
        <div class="file-details">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-meta">
            {{ formatSize(file.size) }}
            <el-tag
              v-if="detectedFormats[index]"
              size="small"
              type="primary"
              style="margin-left: var(--fat-space-xs)"
            >
              {{ getFormatLabelSafe(detectedFormats[index]) }}
            </el-tag>
            <el-tag
              v-else
              size="small"
              type="danger"
              style="margin-left: var(--fat-space-xs)"
            >
              {{ t('upload.unknownFormat') }}
            </el-tag>
          </span>
        </div>
        <el-button
          :icon="Delete"
          size="small"
          text
          type="danger"
          @click.stop="removeFile(index)"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.file-upload {
  width: 100%;
}

.drop-zone {
  border: 2px dashed var(--fat-border);
  border-radius: var(--fat-radius-md);
  padding: var(--fat-space-xl);
  text-align: center;
  cursor: pointer;
  transition: var(--fat-transition);
  background: var(--fat-surface-2);
}

.drop-zone:hover,
.drop-zone:focus-visible {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  outline: none;
}

.drop-zone.dragging {
  border-color: var(--fat-primary);
  background: var(--fat-primary-border);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: var(--fat-primary-border);
  background: var(--fat-primary-bg);
  padding: var(--fat-space-lg);
}

.drop-text {
  color: var(--fat-text-secondary);
  margin: var(--fat-space-sm) 0 0;
  font-size: 13px;
}

.paste-hint {
  color: var(--fat-text-placeholder);
  margin: var(--fat-space-xs) 0 0;
  font-size: 12px;
}

.drop-zone.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.file-list {
  margin-top: var(--fat-space-sm);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-md);
  overflow: hidden;
}

.file-list-header {
  padding: var(--fat-space-xs) var(--fat-space-md);
  background: var(--fat-surface);
  font-size: 12px;
  color: var(--fat-text-secondary);
  border-bottom: 1px solid var(--fat-border);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-sm) var(--fat-space-md);
  transition: var(--fat-transition-fast);
}

.file-item:hover {
  background: var(--fat-bg-hover);
}

.file-item + .file-item {
  border-top: 1px solid var(--fat-border-light);
}

.file-icon {
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 13px;
  color: var(--fat-text-regular);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 11px;
  color: var(--fat-text-placeholder);
  display: flex;
  align-items: center;
}

.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.2s ease;
}

.file-list-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.file-list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.file-list-move {
  transition: transform 0.2s ease;
}
</style>
