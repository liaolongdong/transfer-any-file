<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import { UploadFilled, Delete, Plus, Picture, Document, Grid, View } from '@element-plus/icons-vue';
import { FileFormat } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { loadFflate } from '~/utils/core/zip';
import { isMac } from '~/utils/core/platform';
import { detectFormat, SUPPORTED_EXTENSIONS } from '~/utils/core/file-detect';
import { collectDropped, snapshotDrop } from '~/utils/core/folder-drop';
import { useI18n } from '~/composables/useI18n';

// Heavy component — only loaded when the user actually opens a source preview,
// so the document/image rendering deps stay out of the initial bundle.
const PreviewDialog = defineAsyncComponent(() => import('~/components/shared/PreviewDialog.vue'));

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

const { t } = useI18n();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const detectedFormats = ref<(FileFormat | null)[]>([]);
const isDragging = ref(false);
const appendMode = ref(false);

const acceptExtensions = [...SUPPORTED_EXTENSIONS, '.zip'].join(',');
// Shared platform detection — see ~/utils/core/platform for why UA sniffing alone is
// not enough (it misses iPadOS and Chromium builds with a reduced UA).
const pasteKey = isMac ? '⌘V' : 'Ctrl+V';

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

function triggerFileInput(append = false): void {
  if (props.disabled) return;
  appendMode.value = append;
  fileInput.value?.click();
}

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  const append = appendMode.value;
  appendMode.value = false;
  if (files.length > 0) {
    if (append && selectedFiles.value.length > 0) {
      void applyFiles([...selectedFiles.value, ...files]);
    } else {
      selectFiles(files);
    }
  }
  input.value = '';
}

function clearAll(): void {
  if (props.disabled) return;
  selectedFiles.value = [];
  detectedFormats.value = [];
  emit('update:files', []);
}

/** The `DataTransfer` already consumed by {@link intakeDrop}, see the deduplication note there. */
let takenDrop: DataTransfer | null = null;

/**
 * Take everything a drop offers through the one intake pipeline.
 *
 * **Must be entered synchronously from the `drop` handler**: the folder entries `snapshotDrop`
 * reads are revoked as soon as the handler returns, so they are captured here, before the first
 * await, and the walk continues afterwards.
 *
 * One physical drop reaches this function twice — the drop zone's own handler runs first and the
 * event then bubbles to the page-wide overlay in `entrypoints/options/App.vue`. For loose files
 * that was invisible (both calls ended in the same list), but a folder is a directory walk with
 * messages of its own, so the `DataTransfer` already taken this dispatch is refused. Those objects
 * are created per drag and never reused, and a `File` is a disk handle rather than file contents, so
 * holding the last one costs nothing.
 */
async function intakeDrop(dataTransfer: DataTransfer | null): Promise<void> {
  if (props.disabled || !dataTransfer || dataTransfer === takenDrop) return;
  takenDrop = dataTransfer;
  const items = snapshotDrop(dataTransfer);
  if (items.length === 0) return;

  const collected = await collectDropped(items, MAX_BATCH_FILES);
  // A truncated walk always says which limit it hit: `{max}` is interpolated by the batch-cap
  // message and simply ignored by the depth/scan one. `folderEmpty` is kept for the case where the
  // folder really did hold nothing convertible — claiming that after refusing entries for a limit
  // would name the wrong reason.
  if (collected.truncated) {
    const key = collected.truncated === 'cap' ? 'upload.batchCap' : 'upload.folderTruncated';
    ElMessage.warning(t(key, { max: MAX_BATCH_FILES }));
  }
  if (collected.files.length === 0) {
    if (!collected.truncated) ElMessage.warning(t('upload.folderEmpty'));
    return;
  }
  if (collected.fromFolders > 0) ElMessage.success(t('upload.folderImported', { count: collected.fromFolders }));
  selectFiles(collected.files);
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false;
  void intakeDrop(event.dataTransfer);
}

function handleDragOver(): void {
  // No highlight while intake is blocked: the drop itself is refused, so lighting the
  // zone up would invite an action that cannot happen.
  if (props.disabled) return;
  isDragging.value = true;
}

function handleDragLeave(): void {
  isDragging.value = false;
}

const MAX_WARN_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_REJECT_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_BATCH_FILES = 200;
/** Ceiling for the declared uncompressed size of one archive, checked against the ZIP
 *  central directory before any inflate happens so a small bomb is refused, not expanded. */
const ZIP_TOTAL_BUDGET = 200 * 1024 * 1024; // 200MB

/**
 * Decompress an archive down to the supported entries it may contribute.
 *
 * The filter consults each entry's declared sizes in the central directory before anything is
 * inflated: entries above the per-file limit, past the batch file cap, or pushing the archive
 * past {@link ZIP_TOTAL_BUDGET} are skipped rather than decoded. `truncated` reports that a
 * supported entry was refused for budget reasons (as opposed to being an unsupported type).
 */
async function readArchive(file: File): Promise<{ entries: Record<string, Uint8Array>; truncated: boolean }> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const { unzip } = await loadFflate();
  let declaredTotal = 0;
  let kept = 0;
  let truncated = false;
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(
      buffer,
      {
        filter: info => {
          if (info.name.endsWith('/') || info.name.startsWith('__MACOSX/')) return false;
          const base = info.name.split('/').pop() ?? info.name;
          const dot = base.lastIndexOf('.');
          const ext = dot === -1 ? '' : base.slice(dot).toLowerCase();
          if (!SUPPORTED_EXTENSIONS.includes(ext)) return false;
          if (
            info.originalSize > MAX_REJECT_SIZE ||
            declaredTotal + info.originalSize > ZIP_TOTAL_BUDGET ||
            kept >= MAX_BATCH_FILES
          ) {
            truncated = true;
            return false;
          }
          declaredTotal += info.originalSize;
          kept++;
          return true;
        },
      },
      (err, files) => (err ? reject(err) : resolve(files)),
    );
  });
  return { entries, truncated };
}

/** Unpack .zip uploads so archives of documents/images convert as a batch */
async function expandArchives(files: File[]): Promise<File[]> {
  const out: File[] = [];
  // `done` short-circuits both the inner entries loop and the outer zip loop,
  // so a cap hit stops processing every remaining archive instead of silently
  // pushing past MAX_BATCH_FILES.
  let done = false;
  for (const file of files) {
    if (done) break;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      out.push(file);
      if (out.length >= MAX_BATCH_FILES) done = true;
      continue;
    }
    try {
      // Gate the archive itself before decompressing: an oversized .zip can only yield
      // oversized or refused entries, so reading it at all is wasted (and dangerous) work.
      if (file.size > MAX_REJECT_SIZE) {
        ElMessage.error(t('upload.tooLarge', { name: file.name }));
        continue;
      }
      const { entries, truncated } = await readArchive(file);
      let added = 0;
      for (const [entryName, data] of Object.entries(entries)) {
        const base = entryName.split('/').pop() ?? entryName;
        // fflate's loose `Unzipped` typing allows SharedArrayBuffer-backed views; it always
        // allocates plain ArrayBuffers, which is what BlobPart requires.
        out.push(new File([data as BlobPart], base));
        added++;
        if (out.length >= MAX_BATCH_FILES) {
          done = true;
          break;
        }
      }
      if (added === 0) ElMessage.warning(t('upload.zipNoFiles', { name: file.name }));
      else {
        ElMessage.success(t('upload.zipExtracted', { name: file.name, count: added }));
        if (truncated) ElMessage.warning(t('upload.zipBudget', { name: file.name }));
      }
    } catch {
      ElMessage.error(t('upload.zipReadFail', { name: file.name }));
    }
  }
  return out;
}

function selectFiles(files: File[]): void {
  void applyFiles(files);
}

// Last-write-wins across the `expandArchives` await: two rapid selections (second drop while
// the first archive is still inflating) would otherwise resolve out of order and the older,
// slower one would clobber the newer list on completion.
let applyGeneration = 0;

async function applyFiles(files: File[]): Promise<void> {
  const generation = ++applyGeneration;
  const expanded = await expandArchives(files);
  if (generation !== applyGeneration) return;
  const validFiles: File[] = [];
  for (const file of expanded) {
    if (file.size > MAX_REJECT_SIZE) {
      ElMessage.error(t('upload.tooLarge', { name: file.name }));
      continue;
    }
    if (file.size > MAX_WARN_SIZE) {
      ElMessage.warning(t('upload.largeWarning', { name: file.name, size: formatSize(file.size) }));
    }
    validFiles.push(file);
  }
  let next = props.multiple ? validFiles : validFiles.slice(0, 1);
  if (next.length > MAX_BATCH_FILES) {
    next = next.slice(0, MAX_BATCH_FILES);
    ElMessage.warning(t('upload.batchCap', { max: MAX_BATCH_FILES }));
  }
  selectedFiles.value = next;
  detectedFormats.value = next.map(f => detectFormat(f));
  const unknownCount = detectedFormats.value.filter(f => f === null).length;
  if (unknownCount > 0) {
    ElMessage.warning(t('upload.unknownFormatNotice', { count: unknownCount }));
  }
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

// --- Source file preview (F12) -------------------------------------------
// Lets users confirm they picked the right file before committing to a
// (potentially long) conversion. The dialog reuses PreviewDialog and is only
// opened when the source format is known.
const previewVisible = ref(false);
const previewBlob = ref<Blob | null>(null);
const previewFormat = ref<FileFormat>(FileFormat.TXT);
const previewFilename = ref('');

/**
 * Whether the preview dialog exists yet.
 *
 * `defineAsyncComponent` defers the component, not its chunks: mounted under a plain
 * `v-model:visible` it resolved during this component's first render, so four requests — three
 * scripts and the stylesheet the dialog injects, which makes them render-blocking — landed inside
 * the workbench's first-paint window even though an empty workbench has nothing to preview. This
 * flag is what makes the comment above the import true. The first preview click arms it, so no
 * click can be the reason a dialog did not open — the dialog fills itself from an `immediate`
 * watcher precisely so that being created by that same click still renders it; otherwise the
 * first contentful paint does, which is the only moment that is actually late enough — an idle
 * callback proved to fire inside that same window.
 */
const previewMounted = ref(false);
let paintObserver: PerformanceObserver | null = null;

onMounted(() => {
  try {
    paintObserver = new PerformanceObserver(entries => {
      // `first-paint` is not good enough: on this page it can land while `#app` is still empty, and
      // arming then puts the four requests back inside the window they were meant to leave.
      if (!entries.getEntries().some(entry => entry.name === 'first-contentful-paint')) return;
      previewMounted.value = true;
      paintObserver?.disconnect();
      paintObserver = null;
    });
    // `buffered` is what makes this correct in the remount case: the paint has usually already
    // happened by now, and the entry still arrives. A tab that never paints never warms the dialog
    // up, which costs nothing — nothing is being looked at.
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // A warm-up that cannot arm must not take the upload card down with it. Left false, the gate
    // simply keeps every dialog request out of the boot until a click arms it.
    paintObserver?.disconnect();
    paintObserver = null;
  }
});

onUnmounted(() => paintObserver?.disconnect());

function previewFile(index: number): void {
  const file = selectedFiles.value[index];
  const format = detectedFormats.value[index];
  if (!file || !format) {
    ElMessage.warning(t('upload.previewUnsupported'));
    return;
  }
  previewMounted.value = true;
  previewBlob.value = file;
  previewFormat.value = format;
  previewFilename.value = file.name;
  previewVisible.value = true;
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

/** Public entry point: let the parent hand us a whole drop — the folder walk, the archive-expand,
 *  size-validate and batch-cap pipeline and the duplicate-drop guard all live behind this call. */
defineExpose({
  intakeDrop,
});
</script>

<template>
  <div class="file-upload">
    <div
      class="drop-zone"
      :class="{ dragging: isDragging, 'has-file': selectedFiles.length > 0, disabled: disabled }"
      role="button"
      tabindex="0"
      :aria-disabled="disabled"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="() => triggerFileInput()"
      @keydown.enter.prevent="() => triggerFileInput()"
      @keydown.space.prevent="() => triggerFileInput()"
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
      id="file-upload-input"
      ref="fileInput"
      type="file"
      :multiple="multiple"
      :accept="acceptExtensions"
      :aria-label="t('upload.ariaLabel')"
      style="display: none"
      @change="handleFileSelect"
    />

    <TransitionGroup
      v-if="selectedFiles.length > 0"
      name="file-list"
      tag="div"
      class="file-list"
    >
      <div
        key="header"
        class="file-list-header"
      >
        <span>{{ t('upload.selectedCount', { count: selectedFiles.length }) }}</span>
        <span class="header-actions">
          <el-button
            v-if="multiple"
            class="add-files-btn"
            size="small"
            text
            type="primary"
            :icon="Plus"
            :disabled="disabled"
            @click.stop="triggerFileInput(true)"
          >
            {{ t('upload.addMore') }}
          </el-button>
          <el-button
            class="clear-files-btn"
            size="small"
            text
            type="danger"
            :icon="Delete"
            :disabled="disabled"
            @click.stop="clearAll"
          >
            {{ t('upload.clearAll') }}
          </el-button>
        </span>
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
          v-if="detectedFormats[index]"
          :icon="View"
          size="small"
          text
          type="primary"
          :title="t('upload.preview')"
          :aria-label="t('a11y.preview')"
          @click.stop="previewFile(index)"
        />
        <el-button
          :icon="Delete"
          size="small"
          text
          type="danger"
          :aria-label="t('a11y.remove')"
          @click.stop="removeFile(index)"
        />
      </div>
    </TransitionGroup>

    <PreviewDialog
      v-if="previewMounted"
      v-model:visible="previewVisible"
      :blob="previewBlob"
      :format="previewFormat"
      :filename="previewFilename"
    />
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
  color: var(--fat-text-secondary);
  margin: var(--fat-space-xs) 0 0;
  font-size: 12px;
}

.drop-zone.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Children must not intercept drag events, or dragleave fires when the
   pointer crosses them and the highlight flickers */
.drop-zone > * {
  pointer-events: none;
}

.file-list {
  margin-top: var(--fat-space-sm);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-md);
  overflow: hidden;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-xs) var(--fat-space-md);
  background: var(--fat-surface);
  font-size: 12px;
  color: var(--fat-text-secondary);
  border-bottom: 1px solid var(--fat-border);
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--fat-space-xs);
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
  color: var(--fat-text-secondary);
  display: flex;
  align-items: center;
}

.file-list-enter-active,
.file-list-leave-active {
  transition: all var(--fat-duration-base) var(--fat-ease-standard);
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
  transition: transform var(--fat-duration-base) var(--fat-ease-standard);
}
</style>
