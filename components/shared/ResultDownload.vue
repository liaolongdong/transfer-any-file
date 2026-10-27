<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Download, View, CopyDocument, Search } from '@element-plus/icons-vue';
import type { BatchResult, ConvertResult } from '~/utils/core/types';
import type { ConversionFailure } from '~/composables/useConversion';
import { useI18n } from '~/composables/useI18n';
import { formatFromFilename } from '~/utils/core/file-detect';
import { formatDuration, formatSize, TEXT_FORMATS } from '~/utils/core/format';
import { getFormatLabel } from '~/utils/core/format-labels';
import { copyText } from '~/utils/core/clipboard';
import { createRowKey } from '~/utils/core/row-key';
import { FileFormat } from '~/utils/core/types';
import PreviewDialog from '~/components/shared/PreviewDialog.vue';
import FailureDiagnosticItem from '~/components/shared/FailureDiagnosticItem.vue';

const props = withDefaults(
  defineProps<{
    /** One row per produced file, each carrying its own target and source owners. */
    results: BatchResult[];
    failures: ConversionFailure[];
    /** The selector's current target, used only to explain rows produced under another one. */
    currentTarget?: FileFormat | null;
    /** True when the batch ended because the user cancelled it, so the header must not read as complete. */
    cancelled?: boolean;
    /** Files the batch planned to process; only meaningful together with `cancelled`. */
    totalCount?: number;
    /** True while the ZIP is being assembled — blocking CPU work that otherwise looks like a dead button. */
    packaging?: boolean;
    /** Milliseconds the batch loop took, or `null` when nothing settled. Reported on the summary
     *  line for any batch size — unlike the size totals, which a single file already prints on its
     *  own row, a one-file conversion is exactly the case where "how long did that take" is useful. */
    elapsedMs?: number | null;
  }>(),
  { cancelled: false, totalCount: 0, packaging: false, elapsedMs: null, currentTarget: null },
);

const emit = defineEmits<{
  (e: 'download', index: number): void;
  (e: 'downloadAll'): void;
}>();

const { t } = useI18n();

const hasFailures = computed(() => props.failures.length > 0);

type ResultFilter = 'all' | 'ok' | 'fail';
interface FilterOption {
  value: ResultFilter;
  label: string;
  count: number;
}

/**
 * A view filter over the finished batch, not a second result list.
 *
 * It appears once the card is long enough to need it — either a batch above eight rows or any
 * failure, because failures sit after every success today and on a 200-file run that is a scroll
 * no one makes. Defaults are inert: the first render is still "all rows, no query".
 */
const activeFilter = ref<ResultFilter>('all');
const searchQuery = ref('');
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());
const totalEntries = computed(() => props.results.length + props.failures.length);
const showFilter = computed(() => totalEntries.value > 8 || hasFailures.value);
const filterActive = computed(() => activeFilter.value !== 'all' || normalizedQuery.value !== '');

/**
 * Bytes the row was produced from. A merged PDF has several owners; every other row has one, and
 * the sum is the figure the row's own `−N%` is computed against.
 */
function sourceBytes(entry: BatchResult): number {
  return entry.owners.reduce((sum, owner) => sum + owner.size, 0);
}

/**
 * The saving a row can honestly claim. Growth and equality print nothing — a badge is a claim that
 * the output is smaller, and a 1% rounding of two near-equal files would not be worth the space.
 */
function savingLabel(entry: BatchResult): string | null {
  const source = sourceBytes(entry);
  const result = entry.result.blob.size;
  if (source <= 0 || result >= source) return null;
  const raw = Math.round((1 - result / source) * 100);
  // A non-empty result must not round to −100%; that reads as a zero-byte file. The compressor page
  // caps the same number at the same place.
  const percent = result > 0 ? Math.min(99, raw) : raw;
  return percent >= 1 ? t('result.savedPercent', { percent }) : null;
}

const visibleResults = computed(() => {
  if (activeFilter.value === 'fail') return [];
  const query = normalizedQuery.value;
  return props.results
    .map((entry, index) => ({ entry, index, saving: savingLabel(entry) }))
    .filter(row => {
      if (query === '') return true;
      // Search the source names as well as the produced name: a name template can replace the
      // basename, so the file the user actually dropped would otherwise never match its own row.
      const names = [row.entry.result.filename, ...row.entry.owners.map(owner => owner.name)];
      return names.some(name => name.toLowerCase().includes(query));
    });
});

const visibleFailures = computed(() => {
  if (activeFilter.value === 'ok') return [];
  const query = normalizedQuery.value;
  return props.failures.filter(failure => query === '' || failure.fileName.toLowerCase().includes(query));
});

const visibleCount = computed(() => visibleResults.value.length + visibleFailures.value.length);

const filterShowing = computed(() =>
  filterActive.value ? t('result.filterShowing', { shown: visibleCount.value, total: totalEntries.value }) : '',
);

const filterOptions = computed<FilterOption[]>(() => {
  const options: FilterOption[] = [
    { value: 'all', label: t('result.filterAll'), count: totalEntries.value },
    { value: 'ok', label: t('result.filterOk'), count: props.results.length },
  ];
  if (hasFailures.value) {
    options.push({ value: 'fail', label: t('result.filterFail'), count: props.failures.length });
  }
  return options;
});

// A retry can turn the last failure into a success; a filter left on an empty category would then
// keep the card blank with no visible cause.
watch(
  () => [props.results.length, props.failures.length] as const,
  () => {
    if (activeFilter.value === 'fail' && !hasFailures.value) activeFilter.value = 'all';
  },
);

// Dropping rows can take the card below the threshold that shows the toolbar. Reset the controls
// at the same moment they leave the screen: otherwise the remaining rows stay filtered with no
// visible way to clear the query.
watch(showFilter, visible => {
  if (visible) return;
  activeFilter.value = 'all';
  searchQuery.value = '';
});

function clearFilter(): void {
  activeFilter.value = 'all';
  searchQuery.value = '';
}
const alertType = computed(() => {
  if (props.cancelled) return props.results.length > 0 ? 'warning' : 'info';
  if (props.results.length === 0) return 'error';
  return hasFailures.value ? 'warning' : 'success';
});
const alertTitle = computed(() => {
  // A truncated batch must not read as a finished one; the counts still tell how much is usable.
  if (props.cancelled) {
    return props.results.length > 0
      ? t('result.cancelledPartial', { done: props.results.length, total: props.totalCount })
      : t('result.cancelledNone');
  }
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

/**
 * What the batch weighs now, against what it weighed on disk.
 *
 * Summed here, off the same two arrays the rows are drawn from, rather than read out of the history
 * record: a retry appends its recovered files to what is on screen, and a line carried up from the
 * batch that ran before it would then be describing a different set of files than the one above it.
 *
 * Multi-file batches only. One file already prints its result size on its own row and the alert title
 * carries the count, so the line would restate the panel; a batch whose size did not change at all
 * has nothing to say either.
 */
const sizeSummary = computed(() => {
  const { results } = props;
  // One source and one output already prints both figures on the row itself. A merged PDF is the
  // exception even though it is one result: it was written from N sources, and the source total is
  // exactly what the reader cannot reconstruct from a single row.
  if (results.length === 1 && results[0].owners.length === 1) return null;
  let sourceSize = 0;
  let resultSize = 0;
  for (const entry of results) {
    for (const owner of entry.owners) sourceSize += owner.size;
    resultSize += entry.result.blob.size;
  }
  if (sourceSize === 0 || resultSize === sourceSize) return null;
  const raw = Math.round((1 - resultSize / sourceSize) * 100);
  const percent = resultSize > 0 ? Math.min(99, raw) : raw;
  return { source: formatSize(sourceSize), result: formatSize(resultSize), percent: percent >= 1 ? percent : null };
});

/**
 * Targets the rows were produced under that no longer match the selector.
 *
 * Derived per entry rather than stored: the selector can move back and forth, and an entry's own
 * `target` is the only thing that knows what its bytes are.
 */
const staleTargets = computed<FileFormat[]>(() => {
  const current = props.currentTarget;
  if (!current) return [];
  const stale = new Set<FileFormat>();
  for (const entry of props.results) {
    if (entry.target !== current) stale.add(entry.target);
  }
  return [...stale];
});

const staleDismissed = ref(false);
// A fresh run, a target change, or an undo all produce a different set; an explanation the user
// has already waved away should not silently reappear as if it were a new fact.
watch(staleTargets, () => {
  staleDismissed.value = false;
});

const staleNotice = computed(() => {
  const current = props.currentTarget;
  if (!current || staleTargets.value.length === 0 || staleDismissed.value) return null;
  return t('result.staleNotice', {
    current: getFormatLabel(current),
    stale: staleTargets.value.map(format => getFormatLabel(format)).join(t('common.listSeparator')),
  });
});

/** The merged row's own sentence: how many images went in and how many pages came out. */
const mergedSummary = computed(() => {
  const merged = props.results.find(entry => entry.merged);
  if (!merged || !merged.merged) return null;
  return t('result.mergedSummary', { images: merged.owners.length, pages: merged.merged.pageCount });
});

/**
 * The elapsed half of the summary line. `formatDuration` returns `''` outside its domain, and a
 * missing prop means "no batch has settled here" — both print nothing rather than `耗时  s`.
 */
const elapsedText = computed(() => {
  const ms = props.elapsedMs;
  if (ms === null || typeof ms !== 'number') return '';
  const time = formatDuration(ms);
  return time ? t('result.elapsed', { time }) : '';
});

/**
 * Size totals and elapsed time as one line, joined here rather than in the template: the separator
 * only exists when both halves do, and the template stays a single interpolation Prettier never has
 * to break across lines. A batch that produced neither prints no `<p>` at all — same as today.
 */
const summaryLine = computed(() => {
  const parts: string[] = [];
  if (sizeSummary.value) {
    parts.push(t('result.sizeTotals', { source: sizeSummary.value.source, result: sizeSummary.value.result }));
    if (sizeSummary.value.percent !== null) {
      parts.push(t('result.savedTotal', { percent: sizeSummary.value.percent }));
    }
  }
  if (elapsedText.value) parts.push(elapsedText.value);
  return parts.join(' · ');
});

/**
 * Row identity for the `<TransitionGroup>`: the source `File` behind each result, falling back to the
 * result object when a row has no owner. Both survive a retry merge, which is what `applyRetryMerge`
 * needs — it appends recovered rows to the ones already on screen. Position cannot be the key here for
 * the same reason it is not the staged file list's: see `~/utils/core/row-key`.
 */
const rowKey = createRowKey('result');
// The first owner is the batch identity of the entry: a retry appends entries rather than
// reordering them, and the merged row's first image is the one whose name the output carries.
const resultKey = (entry: BatchResult): string => rowKey(entry.owners[0] ?? entry.result);

/**
 * `FailureDiagnosticItem` keeps its own `expanded` state, so the failure rows need an identity that
 * outlives a list edit too: with position as the key, a retry merge that drops one failure re-parents
 * every diagnostic below it, and the row the user had opened shows a different error while staying open.
 */
const failureKey = createRowKey('fail');

function handleDownload(): void {
  if (props.results.length === 1) {
    emit('download', 0);
  } else {
    emit('downloadAll');
  }
}

function isTextResult(result: ConvertResult): boolean {
  const format = formatFromFilename(result.filename);
  return format !== null && TEXT_FORMATS.has(format);
}

/**
 * Every PDF this app writes is a page image (`addImage`, never text operators), so the
 * "no text layer" disclosure keys off the result format rather than off how it was made.
 */
const hasPdfResult = computed(() =>
  props.results.some(entry => formatFromFilename(entry.result.filename) === FileFormat.PDF),
);

/**
 * Which route a file took is invisible from the result: the name is rebuilt from the source basename
 * plus the new extension. The orchestrator therefore marks the files whose chain decoded an animated
 * source onto a canvas, and this discloses it — a GIF that went to HTML kept moving, one that went to
 * PNG did not.
 */
const lostFrames = computed(() => props.results.some(entry => entry.result.lostFrames));

/**
 * Whether a document loses its vector artwork is a fact about that document, not about the route —
 * an HTML→DOCX batch with no `<svg>` in it keeps everything — so only the converter can report it.
 * The orchestrator carries that up from whichever step did the rasterizing.
 */
const svgRasterized = computed(() => props.results.some(entry => entry.result.svgRasterized));

/**
 * A document that references pictures by URL, or by a path next to the file, asked for images this
 * offline conversion does not have. The renderer counts them and each replaced reference keeps its
 * position as an outlined box; a reference that only failed while the clone was being built leaves that
 * position empty instead. Either way the note has to say how many, because without it the reader takes
 * the gaps for part of the author's layout. The orchestrator carries the fact up from whichever step did
 * the rendering, exactly as `svgRasterized`, and a batch adds its files together.
 */
const imagesDroppedCount = computed(() =>
  props.results.reduce((sum, entry) => sum + (entry.result.imagesDropped ?? 0), 0),
);

async function copyResult(result: ConvertResult): Promise<void> {
  if (!isTextResult(result)) {
    ElMessage.warning(t('result.copyUnavailable'));
    return;
  }
  try {
    const text = await result.blob.text();
    // `copyText` keeps the legacy `execCommand` route, so a denied Clipboard API now copies the text
    // instead of landing in the error branch below — the same two toasts, reached less often.
    if (await copyText(text)) {
      ElMessage.success(t('preview.copied'));
    } else {
      ElMessage.error(t('errors.unknown'));
    }
  } catch {
    ElMessage.error(t('errors.unknown'));
  }
}

const previewVisible = ref(false);
const previewBlob = ref<Blob | null>(null);
const previewFormat = ref(FileFormat.HTML);
const previewFilename = ref('');

function openPreview(result: ConvertResult): void {
  const format = formatFromFilename(result.filename);
  if (!format) return;
  previewBlob.value = result.blob;
  previewFormat.value = format;
  previewFilename.value = result.filename;
  previewVisible.value = true;
}
</script>

<template>
  <div
    v-if="results.length > 0 || failures.length > 0 || cancelled"
    class="result-download"
  >
    <!-- Explains a card whose badge disagrees with the selector. A notice rather than a forced
         re-run: changing the target must never cost CPU the user did not ask for. -->
    <el-alert
      v-if="staleNotice"
      :title="staleNotice"
      type="info"
      show-icon
      :closable="true"
      @close="staleDismissed = true"
    />
    <!-- The filter sits outside the alert on purpose: `el-alert` is a `role="alert"` live region,
         and a text field inside it would make every keystroke a new announcement. -->
    <div
      v-if="showFilter"
      class="result-filter"
    >
      <el-input
        v-model="searchQuery"
        class="result-filter-search"
        size="small"
        clearable
        :prefix-icon="Search"
        :placeholder="t('result.filterSearch')"
        :aria-label="t('result.filterSearch')"
      />
      <div
        class="result-filter-group"
        role="group"
        :aria-label="t('result.filterGroup')"
      >
        <button
          v-for="option in filterOptions"
          :key="option.value"
          type="button"
          class="result-filter-btn"
          :class="{ active: activeFilter === option.value }"
          :aria-pressed="activeFilter === option.value"
          @click="activeFilter = option.value"
        >
          {{ option.label }}
          <span class="result-filter-count">{{ option.count }}</span>
        </button>
      </div>
      <span
        v-if="filterShowing"
        class="result-filter-showing"
        >{{ filterShowing }}</span
      >
    </div>
    <p
      v-if="filterActive && visibleCount === 0"
      class="result-filter-empty"
    >
      {{ t('result.filterEmpty') }}
      <button
        type="button"
        class="result-filter-reset"
        @click="clearFilter"
      >
        {{ t('result.filterReset') }}
      </button>
    </p>
    <el-alert
      :title="alertTitle"
      :type="alertType"
      :closable="false"
      :class="{ 'result-alert--success': alertType === 'success' }"
      show-icon
    >
      <div class="result-list">
        <!-- Keyed on the row's source file rather than its position: a retry appends recovered files and
             a dropped file takes a row out of the middle, and with position keys the whole tail after
             that point leaves and re-enters instead of one row doing so. See `~/utils/core/row-key`. -->
        <TransitionGroup
          tag="div"
          name="fat-list"
          class="result-rows"
        >
          <div
            v-for="row in visibleResults"
            :key="resultKey(row.entry)"
            class="result-item"
          >
            <span class="result-name">{{ row.entry.result.filename }}</span>
            <!-- The row says what its own bytes are, which the selector above cannot: after a
                 target switch the two deliberately disagree until the next run. -->
            <span class="result-target">{{ getFormatLabel(row.entry.target) }}</span>
            <span class="result-size"
              >{{ formatSize(row.entry.result.blob.size)
              }}<span
                v-if="row.saving"
                class="result-save"
                >{{ row.saving }}</span
              ></span
            >
            <el-button
              v-if="formatFromFilename(row.entry.result.filename)"
              :icon="View"
              size="small"
              text
              type="primary"
              :title="t('result.preview')"
              :aria-label="t('a11y.preview')"
              @click="openPreview(row.entry.result)"
            />
            <el-button
              v-if="isTextResult(row.entry.result)"
              :icon="CopyDocument"
              size="small"
              text
              type="primary"
              :title="t('result.copy')"
              :aria-label="t('a11y.copy')"
              @click="copyResult(row.entry.result)"
            />
            <el-button
              v-if="results.length > 1"
              :icon="Download"
              size="small"
              text
              type="primary"
              :title="t('result.download')"
              :aria-label="t('a11y.download')"
              @click="emit('download', row.index)"
            />
          </div>
        </TransitionGroup>
        <p
          v-if="mergedSummary"
          class="result-summary"
        >
          {{ mergedSummary }}
        </p>
        <p
          v-if="summaryLine"
          class="result-summary"
        >
          {{ summaryLine }}
        </p>
        <template
          v-for="failure in visibleFailures"
          :key="failureKey(failure)"
        >
          <FailureDiagnosticItem :failure="failure" />
        </template>
        <p
          v-if="lostFrames"
          class="result-note"
        >
          {{ t('result.gifFirstFrame') }}
        </p>
        <p
          v-if="svgRasterized"
          class="result-note"
        >
          {{ t('result.svgRasterized') }}
        </p>
        <p
          v-if="imagesDroppedCount > 0"
          class="result-note"
        >
          {{ t('result.imagesDropped', { count: imagesDroppedCount }) }}
        </p>
        <p
          v-if="hasPdfResult"
          class="result-note"
        >
          {{ t('result.pdfNoTextLayer') }}
        </p>
      </div>
    </el-alert>

    <div
      v-if="results.length > 0"
      class="download-actions"
    >
      <el-button
        type="primary"
        :icon="Download"
        :loading="packaging"
        :disabled="packaging"
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

/* The toolbar is a view control, so it stays on the alert's own tint: neutral borders and
   `--fat-text-primary` ink keep it readable over every semantic hue the alert can take. The active
   filter uses the accent as ink on its soft fill instead of a solid accent block, because white on
   the light-theme blue is the known 2.54:1 pair. */
.result-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-xs) var(--fat-space-sm);
}

.result-filter-search {
  flex: 1 1 160px;
  max-width: 240px;
}

.result-filter-group {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
}

.result-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 8px;
  color: var(--fat-text-primary);
  background: transparent;
  border: 0;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.result-filter-btn + .result-filter-btn {
  border-left: 1px solid var(--fat-border);
}

.result-filter-btn:hover,
.result-filter-btn.active {
  color: var(--fat-primary-ink);
  background: var(--fat-primary-bg);
}

.result-filter-btn.active {
  font-weight: 600;
}

.result-filter-btn:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: -2px;
}

.result-filter-count {
  color: var(--fat-text-secondary);
  font-variant-numeric: tabular-nums;
}

.result-filter-btn.active .result-filter-count {
  color: inherit;
}

.result-filter-showing {
  color: var(--fat-text-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.result-filter-empty {
  margin: 0;
  color: var(--fat-text-primary);
  font-size: 12px;
}

.result-filter-reset {
  padding: 0;
  color: var(--fat-primary-ink);
  background: none;
  border: 0;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}

.result-filter-reset:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

/* A one-shot arrival for the success state. The check already carries the meaning; this only lets
   the eye land on it without a full-card animation, and it ends on the resting style. */
.result-alert--success :deep(.el-alert__icon) {
  animation: fat-success-pop var(--fat-duration-slow) var(--fat-ease-enter) both;
}

@keyframes fat-success-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

/* The rows sit inside a `<TransitionGroup>` so a retry's recovered files can animate in, which adds
   one box between the alert's content and the filename that ellipsizes — hence `min-width: 0` for
   the same reason `.el-alert__content` carries it. The rows shared a gap with the failures and notes
   below them; inside their own container they need the same gap restated, or they merge into one
   block the moment the animation is applied. */
.result-rows {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--fat-space-xs);
}

/* The alert's content box is a flex item, and its default `min-width: auto` let the file row set a
   floor the whole card had to obey — from ~460px down the download buttons hung past the right edge
   of the tab, clipped rather than scrollable. `0` hands shrinking to `.result-name`, which already
   ellipsizes, and changes nothing while there is room. */
.result-download :deep(.el-alert__content) {
  min-width: 0;
}

/* Element Plus centres the status icon against the whole alert, and this alert grows with its
   content — a batch with a file list and a note measures ~119px tall. The 28px icon then floats to
   the vertical middle (measured 2026-10-20: icon top 604 vs title top 566), reading as if it
   belonged to the fourth row rather than the title. Top-aligning puts it back beside its title;
   the small single-line alert in this card is unaffected because there the content box is one line. */
.result-download :deep(.el-alert) {
  align-items: flex-start;
}

/* Same containment as `.file-item` in `FileUpload`, for the same reason: a 200-file batch appends
   one result row per file, and rows below the fold have no reason to be painted. 24px is the
   measured border-box height; `auto` lets Chrome remember the real one. The row still animates
   (`.fat-list-enter-active` / `-move` live on the same element), which is why the containment has to
   survive a transitional `transform` — measured with a single-row append and delete. */
.result-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 24px;
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  font-size: 12px;

  /* Without this the filename inherits the alert's semantic hue — `is-light` paints
     --el-color-success as text on its own 10 % tint, which measures 2.04–2.80:1.
     The type and the icon already carry the state; the text only has to be readable. */
  color: var(--fat-text-primary);
}

.result-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The target badge reads as a property of the file, not as a status: a neutral chip rather than a
   semantic hue, which inside an alert would borrow the alert's own meaning. */
.result-target {
  flex-shrink: 0;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  color: var(--fat-text-secondary);
  background: var(--fat-surface-2);
  border-radius: var(--fat-radius-sm);
}

.result-size {
  flex-shrink: 0;
  color: var(--fat-text-secondary);
  white-space: nowrap;
}

/* A saving is a property of this row's bytes, so it sits inside the size cell instead of adding a
   fourth flex item that would squeeze the filename. `--fat-state-ink-success` is the token measured
   for semantic text on a 10% tint (worst pair 5.13:1), which is exactly this alert. */
.result-save {
  margin-left: 4px;
  color: var(--fat-state-ink-success);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* Same ink as `.result-item` and for the same reason: this sits on the alert's own 10 % tint, which
   no contrast measurement covers at secondary hue. `tabular-nums` because a retry appends rows and
   re-sums this line, and the two figures shifting sideways mid-animation is the one thing a readout
   like this should not do. */
.result-summary {
  margin: 0;
  font-size: 12px;
  color: var(--fat-text-primary);
  font-variant-numeric: tabular-nums;
}

/* Same reason as `.result-item`: the alert paints its own 10 % semantic tint behind this,
   so the secondary ink would sit on a backdrop the contrast gate has never measured. */
.result-note {
  margin: var(--fat-space-xs) 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--fat-text-primary);
}

.download-actions {
  display: flex;
}
</style>
