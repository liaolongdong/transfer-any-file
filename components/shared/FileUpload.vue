<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import { UploadFilled, Delete, Plus, Picture, Document, Grid, View, Loading } from '@element-plus/icons-vue';
import { FileFormat } from '~/utils/core/types';
import { getFormatLabel, getFormatCategory } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { loadFflate, declaredEntryCount, MAX_ZIP_ENTRIES } from '~/utils/core/zip';
import { isMac } from '~/utils/core/platform';
import { detectFormat, SUPPORTED_EXTENSIONS } from '~/utils/core/file-detect';
import { collectDropped, snapshotDrop } from '~/utils/core/folder-drop';
import { createRowKey } from '~/utils/core/row-key';
import { createSampleFile, SAMPLE_TARGETS } from '~/utils/core/sample-files';
import type { SampleKind } from '~/utils/core/sample-files';
import { useI18n } from '~/composables/useI18n';

// Heavy component — only loaded when the user actually opens a source preview,
// so the document/image rendering deps stay out of the initial bundle.
const PreviewDialog = defineAsyncComponent(() => import('~/components/shared/PreviewDialog.vue'));

const props = withDefaults(
  defineProps<{
    multiple?: boolean;
    /** Blocks all file intake (click/drop/paste), e.g. while converting */
    disabled?: boolean;
    /** Registry counts rendered under the drop hint. Passed in rather than computed here because the
     * workbench's own numbers are the provenance the outward docs cite for "14 formats / 48+ paths". */
    formats?: number;
    paths?: number;
    /** Blocks reordering while the current results still describe the old order (e.g. a merged PDF) */
    reorderDisabled?: boolean;
  }>(),
  { multiple: true, disabled: false, formats: 0, paths: 0, reorderDisabled: false },
);

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void;
  /**
   * A reorder is a list edit like removal, but it keeps every file — so it gets its own event
   * instead of `update:files`: the workbench must announce the move, not "loaded N files".
   */
  (e: 'reorder', files: File[], name: string, position: number, total: number): void;
  /** A sample was staged; the workbench adopts the target it was built to demonstrate. */
  (e: 'sample-loaded', target: FileFormat): void;
}>();

const { t, locale } = useI18n();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const detectedFormats = ref<(FileFormat | null)[]>([]);
const isDragging = ref(false);
const appendMode = ref(false);

/**
 * Fixed-height windowing for the staged-file list.
 *
 * `content-visibility` on the rows only skips their layout and paint; the 200-row batch still spent
 * its long task mounting 200 rows × (name + tag + two `el-button`s). Above the threshold below, only
 * the rows near the viewport are mounted, with two spacer divs keeping the list exactly as tall as
 * the full one. Below it, every row is rendered as before — the phone-book semantics this costs
 * (Ctrl+F does not see an unmounted name, and Tab cannot reach an unmounted row's buttons) are only
 * accepted for batches that are already past the point of reading row by row.
 *
 * Heights are fixed by the CSS: 54px for the first row, 55px for every row that carries the 1px
 * separator, so the spacers can be computed without measuring anything.
 */
const WINDOW_THRESHOLD = 100;
const FIRST_ROW_HEIGHT = 54;
const ROW_HEIGHT = 55;
const WINDOW_OVERSCAN = 16;

const listEl = ref<HTMLElement | null>(null);
const headerEl = ref<HTMLElement | null>(null);
const windowStart = ref(0);
const windowEnd = ref(0);
let windowFrame = 0;

const windowed = computed(() => selectedFiles.value.length > WINDOW_THRESHOLD);

const visibleStart = computed(() => (windowed.value ? windowStart.value : 0));
const visibleEnd = computed(() => (windowed.value ? windowEnd.value : selectedFiles.value.length));

const visibleRows = computed(() => {
  const start = visibleStart.value;
  return selectedFiles.value.slice(start, visibleEnd.value).map((file, index) => ({
    file,
    index: start + index,
    format: detectedFormats.value[start + index] ?? null,
  }));
});

/** Border-box height of `count` rows starting at index 0, separator included. */
function rowsHeight(count: number): number {
  return count <= 0 ? 0 : FIRST_ROW_HEIGHT + ROW_HEIGHT * (count - 1);
}

const topSpacer = computed(() => rowsHeight(visibleStart.value));
const bottomSpacer = computed(() => Math.max(0, rowsHeight(selectedFiles.value.length) - rowsHeight(visibleEnd.value)));

function windowSpan(): number {
  return Math.ceil(window.innerHeight / ROW_HEIGHT) + 1 + WINDOW_OVERSCAN * 2;
}

/**
 * Recompute the slice from the list's own position rather than from the rendered rows: with zero
 * rows mounted the row container has no usable top, while the list and its header are always in flow
 * and keep the position the full list would have.
 */
function updateWindow(): void {
  const count = selectedFiles.value.length;
  if (count <= WINDOW_THRESHOLD) {
    windowStart.value = 0;
    windowEnd.value = count;
    return;
  }
  const list = listEl.value;
  const header = headerEl.value;
  if (!list || !header) return;
  const rowsTop = list.getBoundingClientRect().top + list.clientTop + header.offsetHeight;
  // The overscan is split above and below the viewport: mounting only below leaves a scroll-up
  // showing spacer for the frame between the scroll event and this update. The lower clamp keeps
  // a full window at the end of the list instead of a handful of rows.
  const span = windowSpan();
  const visible = Math.floor(Math.max(0, -rowsTop) / ROW_HEIGHT);
  const start = Math.max(0, Math.min(visible - WINDOW_OVERSCAN, count - span));
  windowStart.value = start;
  windowEnd.value = Math.min(count, start + span);
}

function scheduleWindow(): void {
  if (!windowed.value || windowFrame) return;
  windowFrame = requestAnimationFrame(() => {
    windowFrame = 0;
    updateWindow();
  });
}

/**
 * Give a freshly replaced list a first window before it paints. Without this the first render has
 * `windowEnd === 0` and mounts spacers only, so the rows would arrive a frame late — exactly the
 * frame the measurement is about.
 */
function primeWindow(count: number): void {
  if (count <= WINDOW_THRESHOLD) return;
  if (windowEnd.value > windowStart.value && windowStart.value < count) return;
  windowStart.value = 0;
  windowEnd.value = Math.min(count, windowSpan());
}

watch(
  () => selectedFiles.value.length,
  async () => {
    updateWindow();
    await nextTick();
    updateWindow();
  },
);

const acceptExtensions = [...SUPPORTED_EXTENSIONS, '.zip'].join(',');
// Shared platform detection — see ~/utils/core/platform for why UA sniffing alone is
// not enough (it misses iPadOS and Chromium builds with a reduced UA).
const pasteKey = isMac ? '⌘V' : 'Ctrl+V';

/** One chip per built-in sample; the target is read from the same table the generator uses. */
const SAMPLE_CHIPS: readonly { kind: SampleKind; labelKey: string }[] = [
  { kind: 'markdown', labelKey: 'upload.sampleMarkdown' },
  { kind: 'csv', labelKey: 'upload.sampleCsv' },
  { kind: 'image', labelKey: 'upload.sampleImage' },
];
const sampleBusyKind = ref<SampleKind | null>(null);
const sampleBusy = computed(() => sampleBusyKind.value !== null);

const dropText = computed(() => (selectedFiles.value.length === 0 ? t('upload.drop') : t('upload.replace')));

/**
 * Stable v-for key for the staged-file list. The `File` instance is the only identity these rows have —
 * `removeFile()` rebuilds the array but carries the same objects straight through it — and the reason
 * a position would not do is written up in `~/utils/core/row-key`.
 */
const rowKey = createRowKey('file');

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
  window.addEventListener('scroll', scheduleWindow, { passive: true });
  window.addEventListener('resize', scheduleWindow);
});

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste);
  window.removeEventListener('scroll', scheduleWindow);
  window.removeEventListener('resize', scheduleWindow);
  if (windowFrame) cancelAnimationFrame(windowFrame);
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
 * A counter rather than a boolean: a folder drop runs `collectDropped` and then starts the
 * `expandArchives` pipeline, and each half has its own `finally`. Nesting them keeps the status
 * line up until the last one settles instead of blinking off between the two.
 */
const intakeDepth = ref(0);
const isIntaking = computed(() => intakeDepth.value > 0);

function beginIntake(): void {
  intakeDepth.value++;
}

function endIntake(): void {
  intakeDepth.value = Math.max(0, intakeDepth.value - 1);
}

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

  beginIntake();
  try {
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
  } finally {
    endIntake();
  }
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
  // The entry count comes from the archive's own footer and `unzip` walks it in one synchronous
  // loop no filter can interrupt, so a claim that is not true is checked here rather than discovered there.
  if ((declaredEntryCount(buffer) ?? 0) > MAX_ZIP_ENTRIES) throw new Error('archive claims too many entries');
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
          // Charged against both declared fields, not just the uncompressed one: a *stored* entry is
          // copied out of the buffer at its compressed length (`slc` clamps to the archive, so a
          // large claim yields a large allocation without any inflate), and every entry is free to
          // point at the same bytes. Measured on the real page with 400 entries each declaring
          // `originalSize` 1 against one shared 2 MiB blob: charging `originalSize` let the batch run
          // to the 200-entry cap, materialising 400 MiB out of a 2 MiB archive. Charging both fields
          // stops it at 100 entries — the 200 MiB budget, reached by real bytes this time.
          const charge = Math.max(info.size, info.originalSize);
          if (charge > MAX_REJECT_SIZE || declaredTotal + charge > ZIP_TOTAL_BUDGET || kept >= MAX_BATCH_FILES) {
            truncated = true;
            return false;
          }
          declaredTotal += charge;
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

// Last-write-wins across the `expandArchives` await: two rapid selections (second drop while
// the first archive is still inflating) would otherwise resolve out of order and the older,
// slower one would clobber the newer list on completion.
let applyGeneration = 0;
/** The selection currently being inflated, so a removal can wait for it instead of racing it. */
let pendingApply: Promise<boolean> | null = null;

/**
 * Returns whether this run was the one that reached the list. A superseded run (a newer selection
 * started while an archive was inflating) and a run that hit `disabled` both return `false`; the
 * caller that staged a sample uses that to avoid announcing a target for a file that never landed.
 */
async function expandAndApply(files: File[]): Promise<boolean> {
  beginIntake();
  try {
    const generation = ++applyGeneration;
    const expanded = await expandArchives(files);
    if (generation !== applyGeneration) return false;
    // The entry guards above all refuse while a batch is running; `expandArchives` is the one await
    // between the refusal and the write, and a folder or ZIP still inflating when the user pressed
    // 开始转换 would otherwise land here and replace the list under the running batch. The batch keeps
    // converting its own snapshot, so what breaks is everything that reads the list by position: the
    // name in the progress row, and the file a failure row blames. Refusing late costs the user the
    // drop they could not make while the panel was disabled anyway.
    if (props.disabled) return false;
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
    primeWindow(next.length);
    const unknownCount = detectedFormats.value.filter(f => f === null).length;
    if (unknownCount > 0) {
      ElMessage.warning(t('upload.unknownFormatNotice', { count: unknownCount }));
    }
    emit('update:files', next);
    return true;
  } finally {
    endIntake();
  }
}

/**
 * `expandAndApply` with the one piece of bookkeeping a removal needs: it hands back the promise, so
 * a click on ✕ while an archive is still inflating can land on the list that expansion produces
 * rather than on the pre-drop list, which the in-flight apply would otherwise overwrite a second
 * later — taking the user's removal with it.
 */
function applyFiles(files: File[]): Promise<boolean> {
  const run = expandAndApply(files);
  pendingApply = run;
  const settled = () => {
    if (pendingApply === run) pendingApply = null;
  };
  void run.then(settled, settled);
  return run;
}

function selectFiles(files: File[]): void {
  void applyFiles(files);
}

/**
 * Stage one built-in sample and tell the workbench which target it was made for.
 *
 * `selectFiles` only starts the asynchronous pipeline; the target is emitted immediately and lands
 * before the `update:files` microtask, so `setFiles` sees a target that is already selected. The
 * target is a suggestion in the same sense as the empty-picker chips: it is set because the user
 * clicked a sample built to demonstrate that route, not as a new default for real uploads.
 */
async function loadSample(kind: SampleKind): Promise<void> {
  if (props.disabled || sampleBusy.value) return;
  sampleBusyKind.value = kind;
  try {
    const file = await createSampleFile(kind, locale.value);
    // Wait for the staging pipeline, not just the generator: a newer selection or a disabled panel
    // can still drop this file, and the target must not outlive the sample it was chosen for.
    const applied = await applyFiles([file]);
    if (!applied || !selectedFiles.value.includes(file)) return;
    emit('sample-loaded', SAMPLE_TARGETS[kind]);
  } catch {
    ElMessage.warning(t('upload.sampleFailed'));
  } finally {
    sampleBusyKind.value = null;
  }
}

/**
 * Drop one staged row.
 *
 * This used to route through `selectFiles()`, which is a *selection*: the whole list re-runs the size
 * and count guards, so every file over 20 MB shows its warning toast a second time and the unknown-
 * format notice is re-counted for a batch the user already read. It also opens an `await` between the
 * click and the write — the window in which an expansion still in flight lands afterwards and
 * overwrites the removal. Neither is needed: `expandArchives` swaps a ZIP for its entries, so the rows
 * already hold the `File` objects the batch converts, and those same objects are what
 * `~/utils/core/row-key` keys the list by. A removal is a list edit, not a re-read.
 */
async function removeFile(index: number): Promise<void> {
  if (props.disabled) return;
  const target = selectedFiles.value[index];
  if (!target) return;
  await pendingApply;
  // Both re-checked after the wait: the list may have been replaced by the expansion this removal was
  // waiting on, and a batch may have started while it ran. `indexOf` on the captured object is what
  // keeps the row the user pointed at the row that gets dropped, whichever list it landed in.
  if (props.disabled) return;
  const at = selectedFiles.value.indexOf(target);
  if (at === -1) return;
  const next = [...selectedFiles.value];
  next.splice(at, 1);
  selectedFiles.value = next;
  detectedFormats.value = next.map(f => detectFormat(f));
  emit('update:files', next);
}

// --- Reordering -----------------------------------------------------------
// Order is not cosmetic: a merged image→PDF writes its pages in list order. Reordering is
// therefore locked while results exist, because those results were produced from the old order
// and nothing on screen would say so — the user would download a PDF whose page order no longer
// matches the list they can see. A plain batch has no such coupling, so only results lock it.
const canReorder = computed(() => props.multiple && !props.disabled && !props.reorderDisabled);
const reorderHint = computed(() => (props.reorderDisabled ? t('upload.reorderLocked') : t('upload.reorderHint')));

/**
 * Accessible name for a row's handle.
 *
 * While reordering is locked the reason goes into the name rather than only the tooltip: the handle
 * stays focusable on purpose (`aria-disabled`, not `disabled`), because a keyboard user has to be
 * able to reach the row to learn why it will not move.
 */
function handleLabel(name: string, index: number): string {
  const params = { name, position: index + 1, total: selectedFiles.value.length };
  return t(canReorder.value ? 'upload.reorderHandle' : 'upload.reorderHandleLocked', params);
}
const draggingIndex = ref<number | null>(null);
/** Insertion boundary in the *current* array (0…length), not a row index. */
const dropSlot = ref<number | null>(null);

function clearDragState(): void {
  draggingIndex.value = null;
  dropSlot.value = null;
}

function onDragStart(index: number, event: DragEvent): void {
  if (!canReorder.value) {
    event.preventDefault();
    return;
  }
  draggingIndex.value = index;
  dropSlot.value = null;
  const transfer = event.dataTransfer;
  if (transfer) {
    transfer.effectAllowed = 'move';
    transfer.setData('text/plain', String(index));
    const row = (event.currentTarget as HTMLElement | null)?.closest('.file-item');
    if (row) transfer.setDragImage(row, 24, 20);
  }
}

function onRowDragOver(index: number, event: DragEvent): void {
  const from = draggingIndex.value;
  if (from === null) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const after = event.clientY > rect.top + rect.height / 2;
  const slot = index + (after ? 1 : 0);
  // Dropping on the row itself or right below it changes nothing; showing a line there would
  // promise a move that the drop handler would then refuse to make.
  dropSlot.value = slot === from || slot === from + 1 ? null : slot;
}

function onRowDrop(event: DragEvent): void {
  const from = draggingIndex.value;
  const slot = dropSlot.value;
  clearDragState();
  if (from === null || slot === null) return;
  event.preventDefault();
  commitMove(from, slot);
}

/**
 * Scroll the document so a given row sits inside the viewport.
 *
 * The mounted window is *derived* from the scroll position (`updateWindow`), so a keyboard move
 * across a windowed list has to move the scroll. Writing `windowStart` by hand instead leaves the
 * viewport showing blank spacer, and the scroll event that follows re-derives the window and
 * unmounts the very row that was just focused — so focus lands on `<body>` and the next arrow key
 * reaches nobody.
 */
function scrollRowIntoView(index: number): void {
  const list = listEl.value;
  const header = headerEl.value;
  if (!list || !header) return;
  const docTop = list.getBoundingClientRect().top + list.clientTop + header.offsetHeight + window.scrollY;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  // 96 px of context above the row keeps it clear of the viewport edge and of anything sticky.
  window.scrollTo({ top: Math.min(Math.max(0, docTop + rowsHeight(index) - 96), max), behavior: 'auto' });
}

function focusHandle(index: number): void {
  const handle = listEl.value?.querySelector<HTMLElement>(`[data-file-index="${index}"] .file-handle`);
  if (!handle) return;
  handle.focus({ preventScroll: true });
  handle.scrollIntoView({ block: 'nearest' });
}

/** Follow a keyboard move with focus — after the window has been re-derived from the new scroll. */
function focusRow(index: number): void {
  if (!windowed.value) {
    void nextTick(() => focusHandle(index));
    return;
  }
  scrollRowIntoView(index);
  requestAnimationFrame(() => {
    updateWindow();
    void nextTick(() => focusHandle(index));
  });
}

/**
 * Move one file to an insertion boundary.
 *
 * `slot` is where the moved row lands *before* it is taken out, which is what the drop line shows;
 * shifting it back by one when moving down is the whole difference between "after row 5" and the
 * index the row would have once row 5 is gone.
 */
function commitMove(from: number, slot: number): number | null {
  if (!canReorder.value) return null;
  const count = selectedFiles.value.length;
  if (from < 0 || from >= count || slot < 0 || slot > count) return null;
  if (slot === from || slot === from + 1) return null;
  const target = slot > from ? slot - 1 : slot;
  const next = [...selectedFiles.value];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  const formats = [...detectedFormats.value];
  const [format] = formats.splice(from, 1);
  formats.splice(target, 0, format);
  selectedFiles.value = next;
  detectedFormats.value = formats;
  emit('reorder', next, moved.name, target + 1, count);
  return target;
}

function onHandleKeydown(event: KeyboardEvent, index: number): void {
  const count = selectedFiles.value.length;
  let slot: number | null = null;
  if (event.key === 'ArrowUp') slot = index - 1;
  else if (event.key === 'ArrowDown') slot = index + 2;
  else if (event.key === 'Home') slot = 0;
  else if (event.key === 'End') slot = count;
  if (slot === null) return;
  event.preventDefault();
  // Only keyboard moves pull focus back: a mouse drop already leaves the handle where the user
  // dropped it, and a programmatic focus() there paints a ring nobody asked for.
  const target = commitMove(index, slot);
  if (target !== null) focusRow(target);
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
  <div
    class="file-upload"
    :class="{ 'is-filled': selectedFiles.length > 0 }"
  >
    <div
      class="drop-zone"
      :class="{ dragging: isDragging, 'has-file': selectedFiles.length > 0, disabled: disabled }"
      role="button"
      tabindex="0"
      :aria-disabled="disabled"
      :aria-busy="isIntaking"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="() => triggerFileInput()"
      @keydown.enter.prevent="() => triggerFileInput()"
      @keydown.space.prevent="() => triggerFileInput()"
    >
      <el-icon color="var(--fat-primary)">
        <UploadFilled />
      </el-icon>
      <p class="drop-text">{{ dropText }}</p>
      <p class="paste-hint">{{ t('upload.pasteHint', { key: pasteKey }) }}</p>
      <!-- A zero would be a lie, and an empty registry is reachable if this ever renders before
           `initConverters()` — so the line is gated on both counts, not printed as "0 formats".
           It also leaves once a file is staged: the whole block becomes a card whose body is the
           file list, and the capability line belongs to the empty plate that asks what can be
           converted at all. -->
      <p
        v-if="formats > 0 && paths > 0 && selectedFiles.length === 0"
        class="drop-stats"
      >
        {{ t('upload.stats', { formats, paths }) }}
      </p>
    </div>
    <Transition name="fat-fade">
      <p
        v-if="isIntaking"
        class="intake-status"
        role="status"
        aria-live="polite"
      >
        <el-icon
          class="is-loading"
          :size="14"
        >
          <Loading />
        </el-icon>
        <span>{{ t('upload.reading') }}</span>
      </p>
    </Transition>
    <Transition name="fat-fade">
      <div
        v-if="selectedFiles.length === 0"
        class="sample-strip"
        role="group"
        :aria-label="t('upload.sampleTitle')"
      >
        <div class="sample-copy">
          <span class="sample-title">{{ t('upload.sampleTitle') }}</span>
          <span class="sample-hint">{{ t('upload.sampleHint') }}</span>
        </div>
        <div class="sample-actions">
          <button
            v-for="sample in SAMPLE_CHIPS"
            :key="sample.kind"
            type="button"
            class="sample-chip"
            :disabled="disabled || isIntaking || sampleBusy"
            @click="loadSample(sample.kind)"
          >
            <el-icon
              v-if="sampleBusyKind === sample.kind"
              class="is-loading"
              :size="12"
            >
              <Loading />
            </el-icon>
            <span class="sample-label">{{ t(sample.labelKey) }}</span>
            <span
              class="sample-arrow"
              aria-hidden="true"
              >→</span
            >
            <span class="sample-target">{{ getFormatLabel(SAMPLE_TARGETS[sample.kind]) }}</span>
          </button>
        </div>
      </div>
    </Transition>
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

    <Transition name="fat-expand">
      <div
        v-if="selectedFiles.length > 0"
        class="fat-expand file-list-expand"
      >
        <div
          ref="listEl"
          class="file-list"
        >
          <div
            ref="headerEl"
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
            v-if="topSpacer > 0"
            class="file-spacer"
            aria-hidden="true"
            :style="{ height: `${topSpacer}px` }"
          />
          <!-- `css` goes off once the list is windowed. Every window shift unmounts and mounts edge
               rows, and a CSS leave transition keeps the unmounted row in flow for the double-rAF it
               runs through — which the spacer heights do not account for. It also replayed the
               shared enter fade on rows a scrollbar jump revealed. Move classes stay on: a user
               deletion still closes the gap smoothly. -->
          <TransitionGroup
            name="fat-list"
            tag="div"
            class="file-rows"
            :css="!windowed"
          >
            <div
              v-for="row in visibleRows"
              :key="rowKey(row.file)"
              class="file-item"
              :class="{
                'file-item--divided': row.index > 0,
                'file-item--drag-source': draggingIndex === row.index,
                'file-item--drop-before': dropSlot === row.index,
                'file-item--drop-after': dropSlot === row.index + 1,
              }"
              :data-file-index="row.index"
              @dragover="onRowDragOver(row.index, $event)"
              @drop="onRowDrop"
            >
              <button
                v-if="multiple"
                type="button"
                class="file-handle"
                draggable="true"
                :aria-disabled="!canReorder"
                :title="reorderHint"
                :aria-label="handleLabel(row.file.name, row.index)"
                @click.stop
                @dragstart="onDragStart(row.index, $event)"
                @dragend="clearDragState"
                @keydown="onHandleKeydown($event, row.index)"
              >
                <!-- Six dots, not the four-way `Rank` arrow: at 14 px that arrow reads as a plus,
                     and this row already has an add-files button a screen above it. -->
                <svg
                  class="file-handle__grip"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle
                    cx="6"
                    cy="3.5"
                    r="1.35"
                  />
                  <circle
                    cx="10"
                    cy="3.5"
                    r="1.35"
                  />
                  <circle
                    cx="6"
                    cy="8"
                    r="1.35"
                  />
                  <circle
                    cx="10"
                    cy="8"
                    r="1.35"
                  />
                  <circle
                    cx="6"
                    cy="12.5"
                    r="1.35"
                  />
                  <circle
                    cx="10"
                    cy="12.5"
                    r="1.35"
                  />
                </svg>
              </button>
              <el-icon
                class="file-icon"
                :size="18"
                color="var(--fat-text-secondary)"
              >
                <component :is="getFileIcon(row.format)" />
              </el-icon>
              <div class="file-details">
                <span class="file-name">{{ row.file.name }}</span>
                <span class="file-meta">
                  {{ formatSize(row.file.size) }}
                  <el-tag
                    v-if="row.format"
                    size="small"
                    type="primary"
                    style="margin-left: var(--fat-space-xs)"
                  >
                    {{ getFormatLabelSafe(row.format) }}
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
                v-if="row.format"
                :icon="View"
                size="small"
                text
                type="primary"
                :title="t('upload.preview')"
                :aria-label="t('a11y.preview')"
                @click.stop="previewFile(row.index)"
              />
              <el-button
                :icon="Delete"
                size="small"
                text
                type="danger"
                :aria-label="t('a11y.remove')"
                @click.stop="removeFile(row.index)"
              />
            </div>
          </TransitionGroup>
          <div
            v-if="bottomSpacer > 0"
            class="file-spacer"
            aria-hidden="true"
            :style="{ height: `${bottomSpacer}px` }"
          />
        </div>
      </div>
    </Transition>

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
/* Empty, this is a dashed plate asking for files. With anything staged the whole block becomes one
   card: the drop zone collapses into a 44px replace bar and the list runs full-bleed below it, so a
   loaded workbench reads as one object rather than a drop box stacked on a separate file card. */
.file-upload {
  width: 100%;
}

.file-upload.is-filled {
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-lg);
  background: var(--fat-bg-card);
  box-shadow: var(--fat-shadow-sm);
}

/* The shared list names the eight properties that actually change on hover, focus, press or
   selection anywhere in this UI, and `all` used to cover a ninth by accident: this zone is the only
   surface whose *state* is also a change of size, and `.drop-zone.has-file` collapsing the plate
   into the 44px bar used to tween because `all` tweened whatever else happened to change. Appending
   the one property keeps that movement; restoring `all` would put every future property back up for
   grabs, and a layout property in the list costs a reflow per frame. */
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px dashed var(--fat-border);
  border-radius: var(--fat-radius-lg);
  padding: var(--fat-space-xl) calc(var(--fat-space-xl) + var(--fat-space-sm));
  text-align: center;
  cursor: pointer;
  transition:
    padding var(--fat-duration-base) var(--fat-ease-standard),
    var(--fat-transition);
  background: var(--fat-surface-2);
}

.drop-zone > .el-icon {
  font-size: 36px;
}

/* The border/background shift is the *hover* affordance, and it doubled as the focus affordance
   only while the zone was empty: `.drop-zone.has-file` below has the same specificity and comes
   later, so with files loaded it overrode both declarations back to their already-applied values.
   Measured on the built page with real Tab focus, in blue/light, green/light, green/dark and
   slate/dark: the focused zone computed the same border, background and outline as the unfocused
   one, because the `outline: none` that used to sit here cancelled the global `:focus-visible`
   ring. That left the common state — anything loaded — with no focus indicator, which WCAG 2.4.7
   does not allow. The empty plate keeps the colour pair; the staged bar gets its own hover fill
   below and relies on the global ring. */
.drop-zone:not(.has-file):hover,
.drop-zone:not(.has-file):focus-visible {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
}

.drop-zone.dragging {
  border-color: var(--fat-primary);
  background: var(--fat-primary-border);
}

/* The staged state: a compact bar inside the card. It owns no border except the hairline that
   separates it from the list, and none of the plate's padding — the min-height is the hit target.
   The bar is still the whole click surface for replacing the batch, and its copy says so. */
.drop-zone.has-file {
  flex-direction: row;
  justify-content: flex-start;
  gap: var(--fat-space-sm);
  min-height: 44px;
  border: none;
  border-bottom: 1px solid var(--fat-border-light);
  border-radius: var(--fat-radius-lg) var(--fat-radius-lg) 0 0;
  padding: 0 var(--fat-space-md);
  background: transparent;
  text-align: left;
}

.drop-zone.has-file > .el-icon {
  font-size: 16px;
}

.drop-zone.has-file:hover,
.drop-zone.has-file:focus-visible {
  background: var(--fat-bg-hover);
}

.drop-text {
  color: var(--fat-text-secondary);
  margin: var(--fat-space-sm) 0 0;
  font-size: 14px;
  font-weight: 500;
}

.drop-zone.has-file .drop-text {
  margin: 0;
  color: var(--fat-text-regular);
  font-size: 13px;
}

.paste-hint {
  color: var(--fat-text-secondary);
  margin: var(--fat-space-xs) 0 0;
  font-size: 12px;
}

.drop-zone.has-file .paste-hint {
  margin: 0;
}

/* The capability line sits with the drop hint rather than in a page footer: the doubt it answers
   ("我这格式能不能转") arises before anything is placed, and the footer was below the fold in a
   900px window. Same ink and size as its sibling above, so the contrast contract keeps sampling
   one shape — `.drop-stats` took `.footer`'s place in that list. It renders only on the empty
   plate; once a batch is staged the list is the subject and this line leaves. */
.drop-stats {
  color: var(--fat-text-secondary);
  margin: var(--fat-space-xs) 0 0;
  font-size: 12px;
}

/* The status line sits below the plate rather than inside it: the plate's children are
   `pointer-events: none` so the whole surface stays one click target, and a spinner inside would
   also inherit the dashed border's padding and make the plate jump when it appears. */
.intake-status {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  margin: 0;
  padding: var(--fat-space-xs) var(--fat-space-xs) 0;
  color: var(--fat-text-secondary);
  font-size: 12px;
}

.intake-status .el-icon {
  color: var(--fat-primary-ink);
}

/* Sample chips live outside the drop plate for the same pointer-events reason. The row is the
   empty-state's second act: the plate asks for a file, this answers "what if I don't have one". */
.sample-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-sm) var(--fat-space-md);
  margin-top: var(--fat-space-sm);
  padding: 0 var(--fat-space-xs);
}

.sample-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sample-title {
  color: var(--fat-text-regular);
  font-size: 12px;
  font-weight: 600;
}

.sample-hint {
  color: var(--fat-text-secondary);
  font-size: 11px;
}

.sample-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fat-space-xs);
}

.sample-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 10px;
  color: var(--fat-text-regular);
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: var(--fat-transition);
  animation: fat-sample-in var(--fat-duration-slow) var(--fat-ease-enter) both;
}

.sample-chip:nth-child(2) {
  animation-delay: 45ms;
}

.sample-chip:nth-child(3) {
  animation-delay: 90ms;
}

.sample-chip:hover:not(:disabled) {
  background: var(--fat-primary-bg);
  border-color: var(--fat-primary);
  transform: translateY(-1px);
}

.sample-chip:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

.sample-chip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.sample-arrow {
  color: var(--fat-primary-ink);
  font-weight: 600;
}

.sample-target {
  color: var(--fat-text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

/* One-shot, from-only: the row ends on its resting style, so a reduced-motion pass has nothing
   left to undo beyond the collapsed duration and lift tokens in global.css. */
@keyframes fat-sample-in {
  from {
    opacity: 0;
    transform: translateY(var(--fat-lift-sm));
  }
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

/* No gap here: the list is part of the card the bar tops, not a second surface beneath it. */
.file-list-expand {
  margin-top: 0;
}

/* The card's outer border already surrounds this list, so the only edges left to own are the
   bottom corners, where a full-bleed row hover has to stop at the rounded outline. `hidden` is
   deliberate for the same reason as before: `clip` plus a clip margin would let rows paint over
   the corner. Nothing is lost to a focus ring — the header pads its content by 4px and the rows by
   8px, both at least the ring's own extent (`--fat-focus-ring-inset`, 4px = 2px outline + 2px
   offset), so a ring reaches the padding box, which is the clip edge, and no farther. */
.file-list {
  border-radius: 0 0 var(--fat-radius-lg) var(--fat-radius-lg);
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

/* A batch can hold 200 rows, and every one of them used to be laid out and painted at insertion —
   the offscreen ones included. `content-visibility: auto` skips that work until a row approaches the
   viewport, and `contain-intrinsic-size` keeps the scrollbar honest in the meantime. 38px is the
   *content* height of a row (54px border-box minus the 8px padding above and below); the 1px separator
   `.file-item + .file-item` adds is a border, so it does not belong here. The `auto` keyword makes
   Chrome replace the placeholder with the real height once a row has been rendered. Scroll produced
   no long tasks in either direction (measured 2026-10-20 on a 200-file batch), so this is about the
   initial batch, not scrolling. */
.file-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 38px;
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-sm) var(--fat-space-md);
  transition: var(--fat-transition-fast);
}

.file-item:hover {
  background: var(--fat-bg-hover);
}

/* A grab handle rather than making the whole row draggable: the row already carries two buttons
   and a filename users select, and a drag that starts on those reads as a misfire. The icon stays
   quiet until the row is hovered or the handle is focused, but it is never `visibility: hidden` —
   the hit target has to exist before the first hover. */
.file-handle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 26px;
  padding: 0;
  margin-left: -6px;
  color: var(--fat-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--fat-radius-sm);
  cursor: grab;
  opacity: 0.55;
  transition: var(--fat-transition-fast);
}

.file-handle__grip {
  fill: currentcolor;
}

.file-item:hover .file-handle:not([aria-disabled='true']),
.file-handle:focus-visible {
  opacity: 1;
}

.file-handle:hover:not([aria-disabled='true']) {
  color: var(--fat-primary-ink);
  background: var(--fat-primary-bg);
}

.file-handle:active:not([aria-disabled='true']) {
  cursor: grabbing;
}

/* The glyph is 22×26 to keep the row's rhythm, but the grab target extends 3px on every side:
   a pointer should not have to land on the icon itself, and a transparent overlay moves nothing. */
.file-handle::after {
  content: '';
  position: absolute;
  inset: -3px;
}

.file-handle:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

/* Locked is `aria-disabled`, not `disabled`: the row's handle must stay reachable so that its
   name can carry the reason. `cursor` and the faded glyph say "not grabbable" without taking the
   element out of the tab order. */
.file-handle[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.22;
}

/* The drop indicator is a line in the 1px separator's own place, so a row does not appear to
   change height while the pointer moves over it. */
.file-item--drop-before::before,
.file-item--drop-after::after {
  content: '';
  position: absolute;
  right: var(--fat-space-md);
  left: var(--fat-space-md);
  z-index: 2;
  height: 2px;
  background: var(--fat-primary);
  border-radius: var(--fat-radius-pill);
  box-shadow: 0 0 0 3px var(--fat-primary-bg);
  pointer-events: none;
}

.file-item--drop-before::before {
  top: -1px;
}

.file-item--drop-after::after {
  bottom: -1px;
}

.file-item--drag-source {
  opacity: 0.55;
}

/* The separator used to come from `.file-item + .file-item`. With a window mounted at an
   arbitrary start index, sibling position no longer tells a row whether the full list would
   divide it from the row above — the first mounted row of a scrolled window lost its line, and
   its 1px is part of the spacer arithmetic (first row 54px, every divided row 55px). The class
   carries the absolute index instead, so both window edges keep the exact full-list geometry. */
.file-item--divided {
  border-top: 1px solid var(--fat-border-light);
}

/* Unmounted stand-ins. Their height comes from `rowsHeight()`, which follows the same 54/55 row
   geometry, so the list keeps the height — and therefore the scrollbar and the scroll position the
   user is aiming at — it would have with all 200 rows in flow. `content-visibility` keeps rendered
   offscreen rows out of layout; these keep them out of the DOM, which is what removes the per-row
   mount cost (measured 2026-10-20 on the CV-only build: the 200-row batch still spent 171.7 ms in
   program code and 39.0 ms in the Vue render helper). */
.file-spacer {
  pointer-events: none;
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

/* The row motion itself is `name="fat-list"`, declared once in `assets/styles/global.css` next to
   the history rows that share it. What matters here is the *key*: these rows are keyed by file
   identity, not by index, because an index key remounts every row below a removed one — that is
   what used to flicker, and no transition can smooth a remount. */

@media (width <= 640px) {
  .sample-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .sample-actions {
    width: 100%;
  }

  .sample-chip {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
