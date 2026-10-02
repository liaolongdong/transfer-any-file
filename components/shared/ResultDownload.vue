<script setup lang="ts">
import { computed, ref } from 'vue';
import { Download, View, CopyDocument } from '@element-plus/icons-vue';
import type { ConvertResult } from '~/utils/core/types';
import type { ConversionFailure } from '~/composables/useConversion';
import { useI18n } from '~/composables/useI18n';
import { formatFromFilename } from '~/utils/core/file-detect';
import { formatSize, TEXT_FORMATS } from '~/utils/core/format';
import { copyText } from '~/utils/core/clipboard';
import { createRowKey } from '~/utils/core/row-key';
import { FileFormat } from '~/utils/core/types';
import PreviewDialog from '~/components/shared/PreviewDialog.vue';
import FailureDiagnosticItem from '~/components/shared/FailureDiagnosticItem.vue';

const props = withDefaults(
  defineProps<{
    results: ConvertResult[];
    /** The source `File` behind each result, index-aligned — see `useConversion`'s `resultOwners`. */
    owners: File[];
    failures: ConversionFailure[];
    /** True when the batch ended because the user cancelled it, so the header must not read as complete. */
    cancelled?: boolean;
    /** Files the batch planned to process; only meaningful together with `cancelled`. */
    totalCount?: number;
    /** True while the ZIP is being assembled — blocking CPU work that otherwise looks like a dead button. */
    packaging?: boolean;
  }>(),
  { cancelled: false, totalCount: 0, packaging: false },
);

const emit = defineEmits<{
  (e: 'download', index: number): void;
  (e: 'downloadAll'): void;
}>();

const { t } = useI18n();

const hasFailures = computed(() => props.failures.length > 0);
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
  const { results, owners } = props;
  if (results.length < 2 || owners.length !== results.length) return null;
  let sourceSize = 0;
  let resultSize = 0;
  results.forEach((result, index) => {
    sourceSize += owners[index]?.size ?? 0;
    resultSize += result.blob.size;
  });
  if (sourceSize === 0 || resultSize === sourceSize) return null;
  return { source: formatSize(sourceSize), result: formatSize(resultSize) };
});

/**
 * Row identity for the `<TransitionGroup>`: the source `File` behind each result, falling back to the
 * result object when a row has no owner. Both survive a retry merge, which is what `applyRetryMerge`
 * needs — it appends recovered rows to the ones already on screen. Position cannot be the key here for
 * the same reason it is not the staged file list's: see `~/utils/core/row-key`.
 */
const rowKey = createRowKey('result');
const resultKey = (result: ConvertResult, index: number): string => rowKey(props.owners[index] ?? result);

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
const hasPdfResult = computed(() => props.results.some(r => formatFromFilename(r.filename) === FileFormat.PDF));

/**
 * Which route a file took is invisible from the result: the name is rebuilt from the source basename
 * plus the new extension. The orchestrator therefore marks the files whose chain decoded an animated
 * source onto a canvas, and this discloses it — a GIF that went to HTML kept moving, one that went to
 * PNG did not.
 */
const lostFrames = computed(() => props.results.some(r => r.lostFrames));

/**
 * Whether a document loses its vector artwork is a fact about that document, not about the route —
 * an HTML→DOCX batch with no `<svg>` in it keeps everything — so only the converter can report it.
 * The orchestrator carries that up from whichever step did the rasterizing.
 */
const svgRasterized = computed(() => props.results.some(r => r.svgRasterized));

/**
 * A document that references pictures by URL, or by a path next to the file, asked for images this
 * offline conversion does not have. The renderer counts them and each replaced reference keeps its
 * position as an outlined box; a reference that only failed while the clone was being built leaves that
 * position empty instead. Either way the note has to say how many, because without it the reader takes
 * the gaps for part of the author's layout. The orchestrator carries the fact up from whichever step did
 * the rendering, exactly as `svgRasterized`, and a batch adds its files together.
 */
const imagesDroppedCount = computed(() => props.results.reduce((sum, r) => sum + (r.imagesDropped ?? 0), 0));

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
    <el-alert
      :title="alertTitle"
      :type="alertType"
      :closable="false"
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
            v-for="(result, index) in results"
            :key="resultKey(result, index)"
            class="result-item"
          >
            <span class="result-name">{{ result.filename }}</span>
            <span class="result-size">{{ formatSize(result.blob.size) }}</span>
            <el-button
              v-if="formatFromFilename(result.filename)"
              :icon="View"
              size="small"
              text
              type="primary"
              :title="t('result.preview')"
              :aria-label="t('a11y.preview')"
              @click="openPreview(result)"
            />
            <el-button
              v-if="isTextResult(result)"
              :icon="CopyDocument"
              size="small"
              text
              type="primary"
              :title="t('result.copy')"
              :aria-label="t('a11y.copy')"
              @click="copyResult(result)"
            />
            <el-button
              v-if="results.length > 1"
              :icon="Download"
              size="small"
              text
              type="primary"
              :title="t('result.download')"
              :aria-label="t('a11y.download')"
              @click="emit('download', index)"
            />
          </div>
        </TransitionGroup>
        <p
          v-if="sizeSummary"
          class="result-summary"
        >
          {{ t('result.sizeTotals', { source: sizeSummary.source, result: sizeSummary.result }) }}
        </p>
        <template
          v-for="(failure, index) in failures"
          :key="index"
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

.result-item {
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

.result-size {
  flex-shrink: 0;
  color: var(--fat-text-secondary);
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
