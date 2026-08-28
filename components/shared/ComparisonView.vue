<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, onBeforeUnmount, nextTick } from 'vue';
import { Edit, View, CopyDocument, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { FileFormat } from '~/utils/core/types';
import type { ConvertResult } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { docxToPreviewHtml, xlsxToPreviewHtml } from '~/utils/core/preview';
import { useI18n } from '~/composables/useI18n';
import { STORAGE_KEYS, storageGet, storageSet } from '~/utils/storage';

const props = defineProps<{
  sourceFile: File | null;
  sourceFormat: FileFormat | null;
  result: ConvertResult | null;
  targetFormat: FileFormat | null;
}>();

const emit = defineEmits<{
  (e: 'update:result', result: ConvertResult): void;
}>();

const { t } = useI18n();

const sourceText = ref('');
const resultText = ref('');
const sourceImageUrl = ref('');
const resultImageUrl = ref('');
const sourcePdfUrl = ref('');
const resultPdfUrl = ref('');
const sourceDocHtml = ref('');
const resultDocHtml = ref('');
const isEditing = ref(false);
const syncScroll = ref(true);
const isSyncing = ref(false);

const sourcePanel = ref<HTMLElement | null>(null);
const resultPanel = ref<HTMLElement | null>(null);
const panelsContainer = ref<HTMLElement | null>(null);

// Draggable divider state
const splitPercent = ref(50);
const isDragging = ref(false);

const TEXT_FORMATS = new Set<FileFormat>([FileFormat.MD, FileFormat.HTML, FileFormat.TXT, FileFormat.CSV, FileFormat.JSON]);

const isSourceImage = computed(() => props.sourceFormat !== null && getFormatCategory(props.sourceFormat) === 'image');
const isResultImage = computed(() => props.targetFormat !== null && getFormatCategory(props.targetFormat) === 'image');
const isSourceText = computed(() => props.sourceFormat !== null && TEXT_FORMATS.has(props.sourceFormat));
const isResultText = computed(() => props.targetFormat !== null && TEXT_FORMATS.has(props.targetFormat));
const isSourcePdf = computed(() => props.sourceFormat === FileFormat.PDF);
const isResultPdf = computed(() => props.targetFormat === FileFormat.PDF);
const isSourceDocx = computed(() => props.sourceFormat === FileFormat.DOCX);
const isResultDocx = computed(() => props.targetFormat === FileFormat.DOCX);
const isSourceXlsx = computed(() => props.sourceFormat === FileFormat.XLSX);
const isResultXlsx = computed(() => props.targetFormat === FileFormat.XLSX);
const isResultHtml = computed(() => props.targetFormat === FileFormat.HTML);
const isResultEditable = computed(() => isResultText.value);

const htmlView = ref<'rendered' | 'source'>('rendered');

// Panel visibility derived from split position
const showSourcePanel = computed(() => !isResultOnly.value);
const showResultPanel = computed(() => !isSourceOnly.value);
const isSourceOnly = computed(() => splitPercent.value <= 5);
const isResultOnly = computed(() => splitPercent.value >= 95);

let editDebounce: ReturnType<typeof setTimeout> | undefined;
let lastEmittedBlob: Blob | null = null;

watch(
  () => [props.sourceFile, props.sourceFormat] as const,
  async ([file, format]) => {
    if (sourceImageUrl.value) URL.revokeObjectURL(sourceImageUrl.value);
    if (sourcePdfUrl.value) URL.revokeObjectURL(sourcePdfUrl.value);
    sourceImageUrl.value = '';
    sourcePdfUrl.value = '';
    sourceText.value = '';
    sourceDocHtml.value = '';
    if (!file || !format) return;
    if (getFormatCategory(format) === 'image') {
      sourceImageUrl.value = URL.createObjectURL(file);
    } else if (format === FileFormat.PDF) {
      sourcePdfUrl.value = URL.createObjectURL(file);
    } else if (format === FileFormat.DOCX) {
      try {
        sourceDocHtml.value = await docxToPreviewHtml(file);
      } catch { /* preview is best-effort */ }
    } else if (format === FileFormat.XLSX) {
      try {
        sourceDocHtml.value = await xlsxToPreviewHtml(file);
      } catch { /* preview is best-effort */ }
    } else if (TEXT_FORMATS.has(format)) {
      try {
        sourceText.value = await file.text();
      } catch { /* ignore */ }
    }
  },
  { immediate: true },
);

watch(
  () => [props.result, props.targetFormat] as const,
  async ([result, format]) => {
    if (!result || !format) {
      resultText.value = '';
      resultDocHtml.value = '';
      return;
    }
    if (result.blob === lastEmittedBlob) return;
    if (resultImageUrl.value) URL.revokeObjectURL(resultImageUrl.value);
    if (resultPdfUrl.value) URL.revokeObjectURL(resultPdfUrl.value);
    resultImageUrl.value = '';
    resultPdfUrl.value = '';
    resultText.value = '';
    resultDocHtml.value = '';
    if (getFormatCategory(format) === 'image') {
      resultImageUrl.value = URL.createObjectURL(result.blob);
    } else if (format === FileFormat.PDF) {
      resultPdfUrl.value = URL.createObjectURL(result.blob);
    } else if (format === FileFormat.DOCX) {
      try {
        resultDocHtml.value = await docxToPreviewHtml(result.blob);
      } catch { /* preview is best-effort */ }
    } else if (format === FileFormat.XLSX) {
      try {
        resultDocHtml.value = await xlsxToPreviewHtml(result.blob);
      } catch { /* preview is best-effort */ }
    } else if (TEXT_FORMATS.has(format)) {
      try {
        resultText.value = await result.blob.text();
      } catch { /* ignore */ }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (sourceImageUrl.value) URL.revokeObjectURL(sourceImageUrl.value);
  if (resultImageUrl.value) URL.revokeObjectURL(resultImageUrl.value);
  if (sourcePdfUrl.value) URL.revokeObjectURL(sourcePdfUrl.value);
  if (resultPdfUrl.value) URL.revokeObjectURL(resultPdfUrl.value);
  if (editDebounce !== undefined) clearTimeout(editDebounce);
  if (persistDebounce !== undefined) clearTimeout(persistDebounce);
  document.removeEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// --- Drag handlers (Pointer Events API) ---
let dragContainerRect: DOMRect | null = null;
let activePointerId: number | null = null;

function handleDragStart(e: PointerEvent): void {
  // Ignore if the click target is a button (let button clicks work normally)
  if ((e.target as HTMLElement).closest('.divider-btn')) return;

  e.preventDefault();
  const divider = e.currentTarget as HTMLElement;
  divider.setPointerCapture(e.pointerId);
  activePointerId = e.pointerId;
  isDragging.value = true;
  dragContainerRect = panelsContainer.value?.getBoundingClientRect() ?? null;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function handleDragMove(e: PointerEvent): void {
  if (!isDragging.value || !dragContainerRect || e.pointerId !== activePointerId) return;
  const percent = ((e.clientX - dragContainerRect.left) / dragContainerRect.width) * 100;
  splitPercent.value = Math.max(5, Math.min(95, percent));
}

function handleDragEnd(e: PointerEvent): void {
  if (e.pointerId !== activePointerId) return;
  const divider = e.currentTarget as HTMLElement;
  divider.releasePointerCapture(e.pointerId);
  isDragging.value = false;
  activePointerId = null;
  dragContainerRect = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  // Snap to center when close to 50%
  if (splitPercent.value > 47 && splitPercent.value < 53) {
    splitPercent.value = 50;
  }
}

// --- View mode shortcuts ---
function showSourceOnly(): void {
  splitPercent.value = 0;
}

function showSplitView(): void {
  splitPercent.value = 50;
}

function showResultOnly(): void {
  splitPercent.value = 100;
}

// --- Keyboard shortcuts ---
function handleKeydown(e: KeyboardEvent): void {
  // Don't intercept when user is typing in an input/textarea
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

  switch (e.key) {
    case '1': showSourceOnly(); break;
    case '2': showSplitView(); break;
    case '3': showResultOnly(); break;
    case 'ArrowLeft':
      e.preventDefault();
      splitPercent.value = Math.max(0, splitPercent.value - 5);
      break;
    case 'ArrowRight':
      e.preventDefault();
      splitPercent.value = Math.min(100, splitPercent.value + 5);
      break;
    default: return;
  }
}

// --- Split position persistence ---
let persistDebounce: ReturnType<typeof setTimeout> | undefined;

watch(splitPercent, (value) => {
  clearTimeout(persistDebounce);
  persistDebounce = setTimeout(() => {
    void storageSet(STORAGE_KEYS.splitPosition, value);
  }, 500);
});

onMounted(async () => {
  const saved = await storageGet<number>(STORAGE_KEYS.splitPosition, 50);
  if (saved >= 0 && saved <= 100) {
    splitPercent.value = saved;
  }
  document.addEventListener('keydown', handleKeydown);
});

// --- Scroll sync ---
function handleSourceScroll(): void {
  if (!syncScroll.value || isSyncing.value || !sourcePanel.value || !resultPanel.value) return;
  isSyncing.value = true;
  const src = sourcePanel.value;
  const dst = resultPanel.value;
  const maxSrc = src.scrollHeight - src.clientHeight;
  const maxDst = dst.scrollHeight - dst.clientHeight;
  if (maxSrc > 0 && maxDst > 0) {
    dst.scrollTop = (src.scrollTop / maxSrc) * maxDst;
  }
  nextTick(() => { isSyncing.value = false; });
}

function handleResultScroll(): void {
  if (!syncScroll.value || isSyncing.value || !sourcePanel.value || !resultPanel.value) return;
  isSyncing.value = true;
  const src = resultPanel.value;
  const dst = sourcePanel.value;
  const maxSrc = src.scrollHeight - src.clientHeight;
  const maxDst = dst.scrollHeight - dst.clientHeight;
  if (maxSrc > 0 && maxDst > 0) {
    dst.scrollTop = (src.scrollTop / maxSrc) * maxDst;
  }
  nextTick(() => { isSyncing.value = false; });
}

function handleResultEdit(value: string): void {
  resultText.value = value;
  if (!props.result) return;
  clearTimeout(editDebounce);
  editDebounce = setTimeout(() => {
    if (!props.result) return;
    const newBlob = new Blob([value], { type: props.result.blob.type });
    lastEmittedBlob = newBlob;
    emit('update:result', { blob: newBlob, filename: props.result.filename });
  }, 300);
}

async function copyResult(): Promise<void> {
  if (!resultText.value) return;
  try {
    await navigator.clipboard.writeText(resultText.value);
    ElMessage.success(t('comparison.copied'));
  } catch { /* ignore */ }
}

function toggleEdit(): void {
  isEditing.value = !isEditing.value;
}
</script>

<template>
  <div class="comparison-view">
    <div
      ref="panelsContainer"
      class="comparison-panels"
      :class="{ 'is-dragging': isDragging }"
    >
      <!-- Source Panel -->
      <div
        v-if="showSourcePanel"
        class="panel source-panel"
        :style="{ flexBasis: isSourceOnly ? '100%' : splitPercent + '%' }"
      >
        <div class="panel-header">
          <span class="panel-title">{{ t('comparison.sourceTitle') }}</span>
          <el-tag v-if="sourceFormat" size="small" effect="plain">
            {{ getFormatLabel(sourceFormat) }}
          </el-tag>
        </div>
        <div
          ref="sourcePanel"
          class="panel-body"
          @scroll="handleSourceScroll"
        >
          <!-- Image source -->
          <div v-if="isSourceImage && sourceImageUrl" class="image-content">
            <img :src="sourceImageUrl" :alt="sourceFile?.name ?? ''" />
          </div>
          <!-- PDF source -->
          <iframe
            v-else-if="isSourcePdf && sourcePdfUrl"
            class="pdf-frame"
            :src="sourcePdfUrl"
            :title="sourceFile?.name ?? ''"
          ></iframe>
          <!-- DOCX / XLSX source rendered preview -->
          <iframe
            v-else-if="(isSourceDocx || isSourceXlsx) && sourceDocHtml"
            class="doc-frame"
            sandbox=""
            :srcdoc="sourceDocHtml"
            :title="sourceFile?.name ?? ''"
          ></iframe>
          <div v-else-if="(isSourceDocx || isSourceXlsx) && sourceFile" class="docx-info">
            <p class="docx-name">{{ sourceFile.name }}</p>
            <p class="docx-size">{{ formatSize(sourceFile.size) }}</p>
            <p class="docx-hint">{{ t('preview.docxHint', { size: formatSize(sourceFile.size) }) }}</p>
          </div>
          <!-- Text source -->
          <pre v-else-if="isSourceText && sourceText" class="text-content">{{ sourceText }}</pre>
          <!-- Unsupported -->
          <div v-else class="no-preview">
            {{ t('comparison.noPreview') }}
          </div>
        </div>
      </div>

      <!-- Draggable Divider -->
      <div
        class="panel-divider"
        :class="{ dragging: isDragging }"
        @pointerdown="handleDragStart"
        @pointermove="handleDragMove"
        @pointerup="handleDragEnd"
        @pointercancel="handleDragEnd"
      >
        <div class="divider-handle">
          <span class="grip-dot"></span>
          <span class="grip-dot"></span>
          <span class="grip-dot"></span>
        </div>
        <button
          class="divider-btn"
          :class="{ active: isSourceOnly }"
          :title="t('comparison.sourceOnly')"
          type="button"
          @click.stop="showSourceOnly"
        >
          <el-icon :size="12">
            <ArrowLeft />
          </el-icon>
        </button>
        <button
          class="divider-btn"
          :class="{ active: !isSourceOnly && !isResultOnly }"
          :title="t('comparison.splitView')"
          type="button"
          @click.stop="showSplitView"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
        </button>
        <button
          class="divider-btn"
          :class="{ active: isResultOnly }"
          :title="t('comparison.resultOnly')"
          type="button"
          @click.stop="showResultOnly"
        >
          <el-icon :size="12">
            <ArrowRight />
          </el-icon>
        </button>
      </div>

      <!-- Result Panel -->
      <div
        v-if="showResultPanel"
        class="panel result-panel"
        :style="{ flexBasis: isResultOnly ? '100%' : (100 - splitPercent) + '%' }"
      >
        <div class="panel-header">
          <span class="panel-title">{{ t('comparison.resultTitle') }}</span>
          <el-tag v-if="targetFormat" size="small" type="success" effect="plain">
            {{ getFormatLabel(targetFormat) }}
          </el-tag>
          <div class="panel-actions">
            <!-- HTML view toggle (hidden when editing) -->
            <el-radio-group
              v-if="isResultHtml && !isEditing"
              v-model="htmlView"
              size="small"
            >
              <el-radio-button value="rendered">{{ t('comparison.rendered') }}</el-radio-button>
              <el-radio-button value="source">{{ t('comparison.source') }}</el-radio-button>
            </el-radio-group>
            <!-- Edit toggle for text formats -->
            <el-button
              v-if="isResultEditable"
              :icon="isEditing ? View : Edit"
              size="small"
              :type="isEditing ? 'primary' : 'default'"
              text
              @click="toggleEdit"
            >
              {{ isEditing ? t('comparison.viewMode') : t('comparison.editMode') }}
            </el-button>
            <!-- Copy button -->
            <el-button
              v-if="isResultText && resultText"
              :icon="CopyDocument"
              size="small"
              text
              type="primary"
              @click="copyResult"
            >
              {{ t('comparison.copy') }}
            </el-button>
          </div>
        </div>
        <div
          ref="resultPanel"
          class="panel-body"
          @scroll="handleResultScroll"
        >
          <!-- Image result -->
          <div v-if="isResultImage && resultImageUrl" class="image-content">
            <img :src="resultImageUrl" :alt="result?.filename ?? ''" />
          </div>
          <!-- PDF result -->
          <iframe
            v-else-if="isResultPdf && resultPdfUrl"
            class="pdf-frame"
            :src="resultPdfUrl"
            :title="result?.filename ?? ''"
          ></iframe>
          <!-- DOCX / XLSX result rendered preview -->
          <iframe
            v-else-if="(isResultDocx || isResultXlsx) && resultDocHtml"
            class="doc-frame"
            sandbox=""
            :srcdoc="resultDocHtml"
            :title="result?.filename ?? ''"
          ></iframe>
          <div v-else-if="(isResultDocx || isResultXlsx) && result" class="docx-info">
            <p class="docx-name">{{ result.filename }}</p>
            <p class="docx-size">{{ formatSize(result.blob.size) }}</p>
            <p class="docx-hint">{{ t('preview.docxHint', { size: formatSize(result.blob.size) }) }}</p>
          </div>
          <!-- Editable text (takes priority over rendered view) -->
          <div v-else-if="isResultEditable && isEditing" class="edit-content">
            <textarea
              class="edit-textarea"
              :value="resultText"
              :placeholder="t('preview.resultPlaceholder')"
              @input="handleResultEdit(($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </div>
          <!-- HTML rendered -->
          <iframe
            v-else-if="isResultHtml && htmlView === 'rendered' && resultText"
            class="html-frame"
            sandbox=""
            :srcdoc="resultText"
            :title="result?.filename ?? ''"
          ></iframe>
          <!-- Text view (includes HTML source view) -->
          <pre v-else-if="isResultText && resultText" class="text-content">{{ resultText }}</pre>
          <!-- Unsupported -->
          <div v-else class="no-preview">
            {{ t('comparison.noPreview') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer toolbar -->
    <div class="comparison-toolbar">
      <div class="view-modes">
        <button
          class="mode-btn"
          :class="{ active: isSourceOnly }"
          type="button"
          :title="t('comparison.sourceOnly') + ' (1)'"
          @click="showSourceOnly"
        >
          <el-icon :size="14">
            <ArrowLeft />
          </el-icon>
          <span>{{ t('comparison.sourceOnly') }}</span>
        </button>
        <button
          class="mode-btn"
          :class="{ active: !isSourceOnly && !isResultOnly }"
          type="button"
          :title="t('comparison.splitView') + ' (2)'"
          @click="showSplitView"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
          <span>{{ t('comparison.splitView') }}</span>
        </button>
        <button
          class="mode-btn"
          :class="{ active: isResultOnly }"
          type="button"
          :title="t('comparison.resultOnly') + ' (3)'"
          @click="showResultOnly"
        >
          <el-icon :size="14">
            <ArrowRight />
          </el-icon>
          <span>{{ t('comparison.resultOnly') }}</span>
        </button>
      </div>
      <label class="sync-toggle">
        <input
          v-model="syncScroll"
          type="checkbox"
        />
        <span>{{ t('comparison.syncScroll') }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.comparison-view {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-lg);
  overflow: hidden;
  background: var(--fat-bg-card);
}

.comparison-panels {
  display: flex;
  min-height: 400px;
  max-height: 80vh;
  position: relative;
}

.panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex-basis 0.2s ease;
}

.comparison-panels.is-dragging .panel {
  transition: none;
}

.panel-divider {
  width: 12px;
  flex-shrink: 0;
  background: var(--fat-surface);
  border-left: 1px solid var(--fat-border);
  border-right: 1px solid var(--fat-border);
  cursor: col-resize;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--fat-space-xs);
  padding: var(--fat-space-sm) 0;
  position: relative;
  user-select: none;
  touch-action: none;
  transition: background 0.15s ease;
}

.panel-divider:hover,
.panel-divider.dragging {
  background: var(--fat-surface-hover);
}

.panel-divider.dragging {
  background: var(--fat-primary-bg);
}

.divider-handle {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: var(--fat-space-sm) 0;
}

.grip-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--fat-text-placeholder);
  transition: background 0.15s ease;
}

.panel-divider:hover .grip-dot,
.panel-divider.dragging .grip-dot {
  background: var(--fat-primary);
}

.divider-btn {
  width: 20px;
  height: 20px;
  border-radius: var(--fat-radius-sm);
  border: 1px solid var(--fat-border);
  background: var(--fat-bg-card);
  color: var(--fat-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: var(--fat-transition-fast);
}

.divider-btn:hover {
  border-color: var(--fat-primary);
  color: var(--fat-primary);
  background: var(--fat-primary-bg);
}

.divider-btn.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary);
  color: #fff;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-sm) var(--fat-space-md);
  background: var(--fat-surface);
  border-bottom: 1px solid var(--fat-border);
  flex-shrink: 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fat-text-secondary);
  flex-shrink: 0;
}

.panel-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
}

.panel-body {
  flex: 1;
  overflow: auto;
  position: relative;
}

.image-content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--fat-space-md);
  min-height: 100%;
  background: var(--fat-surface-2);
}

.image-content img {
  max-width: 100%;
  object-fit: contain;
  border-radius: var(--fat-radius-sm);
}

.text-content {
  margin: 0;
  padding: var(--fat-space-md);
  font-family: var(--fat-font-mono);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  color: var(--fat-text-regular);
  min-height: 100%;
}

.html-frame {
  width: 100%;
  height: 100%;
  min-height: 350px;
  border: none;
  background: #fff;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  min-height: 350px;
  border: none;
  background: #fff;
}

.doc-frame {
  width: 100%;
  height: 100%;
  min-height: 350px;
  border: none;
  background: #fff;
}

.docx-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: var(--fat-space-xl);
  text-align: center;
  color: var(--fat-text-secondary);
}

.docx-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fat-text-regular);
  margin: 0 0 var(--fat-space-sm);
}

.docx-size {
  font-size: 12px;
  color: var(--fat-text-placeholder);
  margin: 0 0 var(--fat-space-md);
}

.docx-hint {
  font-size: 12px;
  color: var(--fat-text-secondary);
  margin: 0;
}

.edit-content {
  height: 100%;
  min-height: 350px;
}

.edit-textarea {
  width: 100%;
  height: 100%;
  min-height: 350px;
  padding: var(--fat-space-md);
  border: none;
  outline: none;
  resize: none;
  font-family: var(--fat-font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--fat-text-regular);
  background: var(--fat-bg-card);
  box-sizing: border-box;
}

.edit-textarea:focus {
  box-shadow: inset 0 0 0 2px rgb(var(--fat-primary-rgb) / 15%);
}

.no-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--fat-text-placeholder);
  font-size: 13px;
}

.comparison-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--fat-space-sm) var(--fat-space-md);
  background: var(--fat-surface);
  border-top: 1px solid var(--fat-border);
  gap: var(--fat-space-md);
}

.view-modes {
  display: flex;
  gap: 2px;
  background: var(--fat-surface-2);
  border-radius: var(--fat-radius-sm);
  padding: 2px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  padding: var(--fat-space-xs) var(--fat-space-sm);
  font-size: 12px;
  border: none;
  border-radius: calc(var(--fat-radius-sm) - 2px);
  background: transparent;
  color: var(--fat-text-secondary);
  cursor: pointer;
  transition: var(--fat-transition-fast);
  white-space: nowrap;
}

.mode-btn:hover {
  color: var(--fat-text-regular);
  background: var(--fat-bg-card);
}

.mode-btn.active {
  color: var(--fat-primary);
  background: var(--fat-bg-card);
  font-weight: 600;
  box-shadow: var(--fat-shadow-sm);
}

.sync-toggle {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  font-size: 12px;
  color: var(--fat-text-secondary);
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.sync-toggle input[type="checkbox"] {
  accent-color: var(--fat-primary);
}

.source-panel .panel-body {
  background: var(--fat-surface-2);
}

.result-panel .panel-body {
  background: var(--fat-bg-card);
}
</style>
