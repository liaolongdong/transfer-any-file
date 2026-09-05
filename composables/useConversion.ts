import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { saveAs } from 'file-saver';
import { Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { FileFormat } from '~/utils/core/types';
import type { ConvertResult } from '~/utils/core/types';
import { converterRegistry } from '~/utils/core/registry';
import { getBlockedReason } from '~/utils/core/conversion-policy';
import { useFileDetect } from '~/composables/useFileDetect';
import { useHistory } from '~/composables/useHistory';
import { useRecentTargets } from '~/composables/useRecentTargets';
import { useNotification } from '~/composables/useNotification';
import { useConfirmConvert } from '~/composables/useConfirmConvert';
import { useI18n } from '~/composables/useI18n';
import { formatSize, isZipCompressible } from '~/utils/core/format';
import { getFormatLabel } from '~/utils/core/format-labels';

// F15 — pre-conversion confirmation thresholds. Any of these triggers the dialog.
const CONFIRM_FILE_COUNT = 5;
const CONFIRM_TOTAL_BYTES = 20 * 1024 * 1024;

/** i18n keys for known conversion errors */
export const CONVERSION_ERROR_KEYS = new Set([
  'errors.noFileOrTarget',
  'errors.noPath',
  'errors.unknown',
  'errors.unknownFormat',
  'errors.docxParse',
  'errors.docxGen',
  'errors.xlsxEmpty',
  'errors.csvDecode',
  'errors.imageDecode',
  'errors.imageEncode',
  'errors.zipFail',
  'errors.jsonParse',
  'errors.jsonNotArray',
  'errors.htmlToJson',
]);

/** A single file that failed during batch conversion */
export interface ConversionFailure {
  fileName: string;
  /** Either an i18n key from CONVERSION_ERROR_KEYS or a raw error message */
  reason: string;
  /**
   * Planned conversion path including start (`path[0]`) and end (`path[path.length - 1]`).
   * Empty when the chain never ran (unknown source format, no path found).
   */
  path: FileFormat[];
  /**
   * 1-indexed step that failed within the chain (e.g. 2 of 3 for MD→HTML→PNG
   * when the HTML→PNG step throws). Undefined when no chain ran.
   */
  failedStep?: number;
}

export function useConversion() {
  const { detectFormat } = useFileDetect();
  const { addRecord } = useHistory();
  const { recordTarget } = useRecentTargets();
  const { t } = useI18n();
  const { notify } = useNotification();
  const { isEnabled: confirmConvertEnabled } = useConfirmConvert();

  const sourceFiles: Ref<File[]> = ref([]);
  const sourceFormats: Ref<(FileFormat | null)[]> = ref([]);
  const targetFormat: Ref<FileFormat | null> = ref(null);
  const isConverting: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  const batchResults: Ref<ConvertResult[]> = ref([]);
  const batchFailures: Ref<ConversionFailure[]> = ref([]);
  const currentIndex: Ref<number> = ref(-1);
  const completedCount: Ref<number> = ref(0);

  // Undo: snapshot of the previous successful batch (results + failures + target).
  // null when nothing to undo. The snapshot is only meaningful for the file set and
  // target it was taken under, so EVERY operation that wipes the results —
  // setFiles / setTargetFormat / clearResults / reset — must drop it too; otherwise
  // hasUndo stays true and undo() restores results belonging to files that are no
  // longer selected. It is overwritten whenever a new convert() replaces a populated batch.
  interface BatchSnapshot {
    results: ConvertResult[];
    failures: ConversionFailure[];
    completedCount: number;
    currentIndex: number;
    target: FileFormat;
  }
  const previousBatch: Ref<BatchSnapshot | null> = ref(null);

  let abortController: AbortController | null = null;

  const sourceFile: ComputedRef<File | null> = computed(() => sourceFiles.value[0] ?? null);
  const sourceFormat: ComputedRef<FileFormat | null> = computed(() => sourceFormats.value[0] ?? null);
  const totalCount: ComputedRef<number> = computed(() => sourceFiles.value.length);

  /** Unique detected source formats (unknown files excluded) */
  const uniqueSourceFormats: ComputedRef<FileFormat[]> = computed(() => {
    const known = sourceFormats.value.filter((f): f is FileFormat => f !== null);
    return [...new Set(known)];
  });

  /**
   * Targets reachable from EVERY detected source format (intersection),
   * so a mixed-format batch only offers targets valid for all files.
   * Formats already present in the sources are excluded, as are pairs blocked by the
   * semantic conversion policy (e.g. image -> data), which are reachable in the graph
   * but always fail or yield a useless placeholder.
   */
  const availableTargets: ComputedRef<FileFormat[]> = computed(() => {
    const formats = uniqueSourceFormats.value;
    if (formats.length === 0) return [];
    let targets = converterRegistry.getAllSupportedTargets(formats[0]);
    for (const format of formats.slice(1)) {
      const reachable = new Set(converterRegistry.getAllSupportedTargets(format));
      targets = targets.filter(t => reachable.has(t));
    }
    return targets.filter(t => !formats.includes(t) && !formats.some(f => getBlockedReason(f, t) !== null));
  });

  function setFiles(files: File[]): void {
    sourceFiles.value = files;
    sourceFormats.value = files.map(f => detectFormat(f));
    targetFormat.value = null;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    completedCount.value = 0;
    currentIndex.value = -1;
    previousBatch.value = null;
  }

  function setTargetFormat(format: FileFormat): void {
    targetFormat.value = format;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    previousBatch.value = null;
  }

  async function convert(): Promise<void> {
    const target = targetFormat.value;
    if (sourceFiles.value.length === 0 || !target) {
      error.value = 'errors.noFileOrTarget';
      return;
    }
    if (isConverting.value) return;

    // F15 — pre-conversion confirmation. The user opts in once via the
    // PreferencesMenu toggle (stored as fat:confirmConvert, default true); the value is
    // read from the useConfirmConvert singleton so the menu and this gate cannot drift.
    // Skip the dialog entirely when the toggle is off OR when the batch is small
    // (≤5 files AND ≤20MB). Most conversions are multi-step under the hood, so
    // multi-step alone is not a trigger — it only changes the message wording, which is
    // why the BFS lookups happen inside the branch instead of on every convert().
    const files = [...sourceFiles.value];
    const formats = [...sourceFormats.value];
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    const overThreshold =
      files.length > CONFIRM_FILE_COUNT || totalBytes > CONFIRM_TOTAL_BYTES;
    if (overThreshold && confirmConvertEnabled.value) {
      const hasMultiStep = formats.some((fmt): boolean => {
        if (fmt === null) return false;
        const steps = converterRegistry.findConversionPath(fmt, target);
        return !!steps && steps.length > 1;
      });
      try {
        const messageKey = hasMultiStep ? 'convert.confirmSummaryMultiStep' : 'convert.confirmSummary';
        await ElMessageBox.confirm(
          t(messageKey, {
            count: files.length,
            size: formatSize(totalBytes),
            target: getFormatLabel(target),
          }),
          t('convert.confirmTitle'),
          {
            confirmButtonText: t('convert.confirmOk'),
            cancelButtonText: t('convert.confirmCancel'),
            type: 'info',
          },
        );
      } catch {
        ElMessage.info(t('convert.confirmCancelled'));
        return;
      }
    }

    // Capture the current batch as the undo target before this run overwrites it.
    // Only snapshot when there's something to restore AND the target is known
    // (a snapshot with target=null wouldn't be useful to undo).
    if (targetFormat.value !== null && (batchResults.value.length > 0 || batchFailures.value.length > 0)) {
      previousBatch.value = {
        results: [...batchResults.value],
        failures: [...batchFailures.value],
        completedCount: completedCount.value,
        currentIndex: currentIndex.value,
        target: targetFormat.value,
      };
    } else {
      previousBatch.value = null;
    }

    isConverting.value = true;
    error.value = null;
    batchResults.value = [];
    batchFailures.value = [];
    completedCount.value = 0;
    // Defensive: a leftover controller (e.g. if reset() was called mid-flight)
    // would otherwise orphan its signal. Aborting it lets the abandoned loop
    // break at its next signal check instead of doing wasted work.
    if (abortController && !abortController.signal.aborted) {
      abortController.abort();
    }
    abortController = new AbortController();

    const results: ConvertResult[] = [];
    const failures: ConversionFailure[] = [];

    // Keep output names unique with timestamp; suffix only when a name is already taken
    const usedNames = new Set<string>();
    function uniqueName(base: string, ext: string): string {
      const now = new Date();
      const timestamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        '_',
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join('');
      let name = `${base}_${timestamp}.${ext}`;
      let n = 2;
      while (usedNames.has(name)) {
        name = `${base}_${timestamp}_${n}.${ext}`;
        n++;
      }
      usedNames.add(name);
      return name;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        if (abortController.signal.aborted) break;
        currentIndex.value = i;
        const file = files[i];
        const format = formats[i];
        // Closure-local diagnostic state: written by the inner step-level catch
        // and read by the outer per-file catch so the UI can show the planned
        // path and which step blew up. Stays []/undefined when the chain never ran.
        let stepPath: FileFormat[] = [];
        let stepFailedAt: number | undefined;
        try {
          if (!format) throw new Error('errors.unknownFormat');

          // Each file resolves its own path so mixed-format batches stay correct
          const steps = converterRegistry.findConversionPath(format, target);
          if (!steps || steps.length === 0) throw new Error('errors.noPath');

          // Build the format chain: every step's `to`, prefixed with the source format.
          // path[0] is the source, path[path.length-1] is the target, path.length-1 is the
          // number of steps — handy for F19's diagnostic panel.
          stepPath = [format, ...steps.map(s => s.to)];

          let currentBlob: Blob = file;
          // The final step's filename carries the real container extension
          // (e.g. a multi-sheet XLSX→CSV yields a .zip, not a .csv)
          // Regex picks up only the trailing extension; names without a dot fall back to target.
          let outExt: string = target;
          for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
            if (abortController.signal.aborted) break;
            const step = steps[stepIndex];
            try {
              const stepResult = await step.converter.convert(currentBlob);
              currentBlob = stepResult.blob;
              const m = /\.([^.]+)$/.exec(stepResult.filename);
              if (m && m[1]) outExt = m[1];
            } catch (stepError) {
              stepFailedAt = stepIndex + 1;
              throw stepError;
            }
          }
          if (abortController.signal.aborted) break;

          const base = file.name.replace(/\.[^.]+$/, '');
          results.push({ blob: currentBlob, filename: uniqueName(base, outExt) });
        } catch (e) {
          // Isolate per-file errors: keep converting the remaining files
          const failure: ConversionFailure = {
            fileName: file.name,
            reason: e instanceof Error && e.message ? e.message : 'errors.unknown',
            path: stepPath,
            failedStep: stepFailedAt,
          };
          failures.push(failure);
          batchFailures.value.push(failure);
        }
        completedCount.value = i + 1;
      }
      // B2: assign once after the loop so Vue only fires one reactive update
      batchResults.value = results;

      // Record successful conversions in history (metadata only, no blob);
      // a storage failure must never leave the UI stuck in "converting"
      const firstFormat = formats.find((f): f is FileFormat => f !== null) ?? null;
      if (results.length > 0 && firstFormat) {
        try {
          const totalSourceSize = files.reduce((sum, f) => sum + f.size, 0);
          const totalResultSize = results.reduce((sum, r) => sum + r.blob.size, 0);
          // For a batch, fold the remaining count into the stored name so the raw
          // history field stays self-describing (UI and tooltip both render it as-is).
          const firstName = files[0].name;
          const batchName = files.length > 1 ? `${firstName} + ${files.length - 1}` : firstName;
          await addRecord({
            fileName: batchName,
            // Full list alongside the label so search and the row tooltip can reach the
            // files the label hides. Bounded by MAX_BATCH_FILES (200).
            fileNames: files.map(f => f.name),
            sourceFormat: firstFormat,
            targetFormat: target,
            fileSize: totalSourceSize,
            resultSize: totalResultSize,
            fileCount: files.length,
          });
        } catch {
          // History is best-effort; ignore storage errors
        }
        // Refresh the recently-used list for the FormatSelector quick-pick group.
        // Best-effort, fire-and-forget: failures here cannot affect the batch.
        void recordTarget(target);
      }
    } finally {
      const wasCancelled = abortController?.signal.aborted ?? false;
      isConverting.value = false;
      currentIndex.value = -1;
      abortController = null;
      // Desktop notification on natural completion (skip when user cancelled or batch was empty).
      // The composable internally no-ops if permission is missing or the tab is already focused.
      if (!wasCancelled && (results.length > 0 || failures.length > 0)) {
        const title = t('prefs.notificationTitle');
        let body: string;
        if (failures.length === 0) {
          body = t('prefs.notificationBodyAllOk', { count: results.length });
        } else if (results.length === 0) {
          body = t('prefs.notificationBodyAllFail', { count: failures.length });
        } else {
          body = t('prefs.notificationBodyPartial', { ok: results.length, fail: failures.length });
        }
        // No onClick handler: useNotification already calls window.focus() before
        // invoking it, so passing one would focus the window twice.
        notify(title, body);
      }
    }
  }

  function cancelConversion(): void {
    abortController?.abort();
  }

  function downloadResult(index: number = 0): void {
    const r = batchResults.value[index];
    if (!r) return;
    saveAs(r.blob, r.filename);
  }

  /** Bundle all results into a single ZIP so the browser fires one download.
   *  Uses fflate's streaming Zip so entries are fed one at a time rather than building
   *  the whole entry map up front.
   *  Each entry picks its own method: text results are deflated (a 7 MB CSV comes out
   *  ~10x smaller), while PNG / JPEG / WebP / PDF / XLSX / DOCX are stored — deflate
   *  cannot shrink an already-compressed container, it only burns CPU and can add a
   *  few bytes. See `isZipCompressible` for the measured trade-off.
   *  The blocking cost stays bounded per entry: each blob is `await`ed before being
   *  pushed, so the event loop gets a turn between files and only one oversized text
   *  result can stall it (fflate deflates ~7 MB in roughly a second on desktop).
   *  Note the emitted chunks are still accumulated into a single Blob, so peak memory
   *  is roughly the final archive size. */
  async function downloadAllZip(): Promise<void> {
    const items = batchResults.value;
    if (items.length === 0) return;
    if (items.length === 1) {
      downloadResult(0);
      return;
    }
    try {
      const chunks: BlobPart[] = [];
      await new Promise<void>((resolve, reject) => {
        const zipStream = new Zip((err, chunk, final) => {
          if (err) { reject(err); return; }
          if (chunk) chunks.push(chunk);
          if (final) resolve();
        });
        (async () => {
          try {
            for (const r of items) {
              const entry = isZipCompressible(r.filename)
                ? new ZipDeflate(r.filename, { level: 6 })
                : new ZipPassThrough(r.filename);
              zipStream.add(entry);
              entry.push(new Uint8Array(await r.blob.arrayBuffer()), true);
            }
            zipStream.end();
          } catch (e) {
            reject(e);
          }
        })();
      });
      const stamp = new Date().toISOString().slice(0, 10);
      saveAs(new Blob(chunks, { type: 'application/zip' }), `converted-${stamp}.zip`);
    } catch {
      error.value = 'errors.zipFail';
    }
  }

  function updateResult(index: number, newResult: ConvertResult): void {
    if (index >= 0 && index < batchResults.value.length) {
      batchResults.value[index] = newResult;
    }
  }

  /** Clear results/target but keep the selected files, e.g. "convert again" */
  function clearResults(): void {
    targetFormat.value = null;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    completedCount.value = 0;
    currentIndex.value = -1;
    previousBatch.value = null;
  }

  function reset(): void {
    sourceFiles.value = [];
    sourceFormats.value = [];
    targetFormat.value = null;
    isConverting.value = false;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    completedCount.value = 0;
    currentIndex.value = -1;
    previousBatch.value = null;
  }

  /** Restore the previously converted batch. Returns true on success, false if
   *  there's nothing to undo or the snapshot doesn't apply (e.g. files were
   *  swapped in the meantime). */
  function undo(): boolean {
    if (isConverting.value) return false;
    const snap = previousBatch.value;
    if (!snap) return false;
    batchResults.value = snap.results;
    batchFailures.value = snap.failures;
    completedCount.value = snap.completedCount;
    currentIndex.value = snap.currentIndex;
    targetFormat.value = snap.target;
    error.value = null;
    previousBatch.value = null;
    return true;
  }

  const hasUndo: ComputedRef<boolean> = computed(() => previousBatch.value !== null && !isConverting.value);

  return {
    sourceFile,
    sourceFormat,
    sourceFiles,
    sourceFormats,
    uniqueSourceFormats,
    availableTargets,
    targetFormat,
    isConverting,
    error,
    batchResults,
    batchFailures,
    currentIndex,
    completedCount,
    totalCount,
    setFiles,
    setTargetFormat,
    convert,
    cancelConversion,
    downloadResult,
    downloadAllZip,
    updateResult,
    clearResults,
    reset,
    undo,
    hasUndo,
  };
}
