import { ref, computed, h } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { saveAs } from 'file-saver';
import { FileFormat } from '~/utils/core/types';
import type { ConvertContext, ConvertResult } from '~/utils/core/types';
import { converterRegistry } from '~/utils/core/registry';
import { getBlockedReason } from '~/utils/core/conversion-policy';
import { isImageOutputFormat, optionsForStep } from '~/utils/core/output-options';
import { useOutputOptions } from '~/composables/useOutputOptions';
import { useFileDetect } from '~/composables/useFileDetect';
import { useHistory } from '~/composables/useHistory';
import { useRecentTargets } from '~/composables/useRecentTargets';
import { useNotification } from '~/composables/useNotification';
import { useConfirmConvert } from '~/composables/useConfirmConvert';
import { useI18n } from '~/composables/useI18n';
import { formatSize, isZipCompressible } from '~/utils/core/format';
import { getFormatLabel } from '~/utils/core/format-labels';
import { loadFflate } from '~/utils/core/zip';

// F15 — pre-conversion confirmation thresholds. Any of these triggers the dialog.
const CONFIRM_FILE_COUNT = 5;
const CONFIRM_TOTAL_BYTES = 20 * 1024 * 1024;

/** A single file that failed during batch conversion */
export interface ConversionFailure {
  fileName: string;
  /** Either an i18n key from `CONVERSION_ERROR_KEYS` (~/utils/core/error-keys) or a raw error message */
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
  /**
   * Raw message the classified `reason` was raised from, i.e. `Error.cause` of the thrown error.
   *
   * Converters translate the failure into one of `CONVERSION_ERROR_KEYS` for the headline, which
   * by design drops what pdf.js / jsPDF / the canvas actually complained about. This keeps that
   * reachable in the expanded diagnostic instead of discarding it.
   */
  detail?: string;
}

/**
 * Trailing extension of a filename, or `null` when it carries none.
 *
 * Only a fallback: a converter that returns a container other than its nominal target should
 * declare `containerExt` instead of relying on this.
 */
function extensionOf(filename: string): string | null {
  return /\.([^.]+)$/.exec(filename)?.[1] ?? null;
}

/**
 * Underlying message behind a classified error, taken from `Error.cause`.
 *
 * `undefined` for anything that did not keep one, and for a cause with no text — the diagnostics
 * row is dropped entirely rather than rendered empty.
 */
function causeDetailOf(error: unknown): string | undefined {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error) return cause.message || undefined;
  return typeof cause === 'string' && cause ? cause : undefined;
}

/**
 * Second-precision local timestamp (`20260914_153012`) used to keep download names unique.
 *
 * Shared by the per-file names and the ZIP name: a date-only stamp is not enough, because two
 * batches on the same day would overwrite each other in the OS downloads folder.
 */
function nameStamp(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '_',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join('');
}

export function useConversion() {
  const { detectFormat } = useFileDetect();
  const { addRecord } = useHistory();
  const { recordTarget } = useRecentTargets();
  const { t } = useI18n();
  const { notify } = useNotification();
  const { isEnabled: confirmConvertEnabled, setEnabled: setConfirmConvertEnabled } = useConfirmConvert();
  const { options: outputOptions } = useOutputOptions();

  const sourceFiles: Ref<File[]> = ref([]);
  const sourceFormats: Ref<(FileFormat | null)[]> = ref([]);
  const targetFormat: Ref<FileFormat | null> = ref(null);
  const isConverting: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  const batchResults: Ref<ConvertResult[]> = ref([]);
  const batchFailures: Ref<ConversionFailure[]> = ref([]);
  const currentIndex: Ref<number> = ref(-1);
  const completedCount: Ref<number> = ref(0);
  /**
   * True when the last batch ended because the user cancelled it.
   *
   * The UI has to be able to tell "here are your results" apart from "here is whatever finished
   * before you stopped it" — otherwise a truncated batch is presented exactly like a complete one,
   * and a cancel pressed before the first file finished shows nothing at all.
   */
  const cancelled: Ref<boolean> = ref(false);

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
  // Re-entrancy lock covering the pre-conversion confirm dialog: `isConverting` only turns true
  // after the dialog resolves, so without this a second Ctrl+Enter during the dialog would open
  // another one and run two batches over each other's state.
  let convertLocked = false;
  // Bumped by `reset()`, the one operation that clears the workspace while a batch may still be
  // running. The batch compares epochs before its tail writes so an abandoned loop cannot
  // resurrect state the user just threw away.
  let workspaceEpoch = 0;

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
    cancelled.value = false;
    completedCount.value = 0;
    currentIndex.value = -1;
    previousBatch.value = null;
  }

  function setTargetFormat(format: FileFormat): void {
    targetFormat.value = format;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    cancelled.value = false;
    previousBatch.value = null;
  }

  async function convert(): Promise<void> {
    const target = targetFormat.value;
    if (sourceFiles.value.length === 0 || !target) {
      error.value = 'errors.noFileOrTarget';
      return;
    }
    if (isConverting.value || convertLocked) return;

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
    const overThreshold = files.length > CONFIRM_FILE_COUNT || totalBytes > CONFIRM_TOTAL_BYTES;
    const epochAtConfirm = workspaceEpoch;
    if (overThreshold && confirmConvertEnabled.value) {
      convertLocked = true;
      const hasMultiStep = formats.some((fmt): boolean => {
        if (fmt === null) return false;
        const steps = converterRegistry.findConversionPath(fmt, target);
        return !!steps && steps.length > 1;
      });
      const messageKey = hasMultiStep ? 'convert.confirmSummaryMultiStep' : 'convert.confirmSummary';
      const summaryText = t(messageKey, {
        count: files.length,
        size: formatSize(totalBytes),
        target: getFormatLabel(target),
      });
      // "Don't ask again" lives in the dialog because that is the only moment the question is
      // on screen; the Preferences toggle stays the way to turn it back on. A native input is
      // used instead of ElCheckbox so the dialog does not pull in another component, and the
      // preference is only written when the batch is actually confirmed.
      const dontAsk = ref(false);
      const setDontAsk = (event: Event) => {
        dontAsk.value = (event.target as HTMLInputElement).checked;
      };
      try {
        await ElMessageBox.confirm(
          h('div', { class: 'confirm-batch' }, [
            h('p', { class: 'confirm-batch__summary' }, summaryText),
            h('label', { class: 'confirm-batch__dont-ask' }, [
              h('input', { type: 'checkbox', checked: dontAsk.value, onChange: setDontAsk }),
              h('span', t('convert.confirmDontAsk')),
            ]),
          ]),
          t('convert.confirmTitle'),
          {
            confirmButtonText: t('convert.confirmOk'),
            cancelButtonText: t('convert.confirmCancel'),
            type: 'info',
          },
        );
        if (dontAsk.value) await setConfirmConvertEnabled(false);
      } catch {
        convertLocked = false;
        ElMessage.info(t('convert.confirmCancelled'));
        return;
      }
      convertLocked = false;
      // Everything awaited above happened while the dialog had the screen. If the workspace was
      // reset or re-targeted in that window, the summary the user confirmed no longer describes
      // this batch — drop it instead of converting under a stale target.
      if (workspaceEpoch !== epochAtConfirm || targetFormat.value !== target) return;
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
    cancelled.value = false;
    batchResults.value = [];
    batchFailures.value = [];
    completedCount.value = 0;
    // Defensive: a leftover controller (e.g. if reset() was called mid-flight)
    // would otherwise orphan its signal. Aborting it lets the abandoned loop
    // break at its next signal check instead of doing wasted work.
    if (abortController && !abortController.signal.aborted) {
      abortController.abort();
    }
    // Snapshot the controller for this batch: `reset()` may swap the module-level reference
    // while the loop runs, and the batch must obey its own signal, not whoever holds the slot.
    const controller = new AbortController();
    const signal = controller.signal;
    abortController = controller;

    const results: ConvertResult[] = [];
    const failures: ConversionFailure[] = [];
    // History accounting follows what actually converted: a failed file must not inflate the
    // stored fileCount / fileNames / source size of an otherwise successful batch.
    const converted: Array<{ name: string; size: number; format: FileFormat }> = [];

    // Read once for the whole batch: the panel is disabled while converting, but a snapshot also
    // keeps one batch from being encoded under two different settings if the value ever changes.
    // Gated on the *batch* target — MD→PDF and XLSX→…→PNG→PDF rasterize along the way, and a
    // leftover 800px cap must not quietly degrade an output the user never asked to shrink.
    const batchOptions = isImageOutputFormat(target) ? { ...outputOptions.value } : undefined;

    // Keep output names unique with timestamp; suffix only when a name is already taken
    const usedNames = new Set<string>();
    function uniqueName(base: string, ext: string): string {
      const timestamp = nameStamp(new Date());
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
        if (signal.aborted) break;
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

          // Each file resolves its own path so mixed-format batches stay correct. This is also the
          // policy gate now, so a target that never went through the dropdown cannot run a
          // conversion the UI deliberately greys out.
          const steps = converterRegistry.resolvePath(format, target);

          // Build the format chain: every step's `to`, prefixed with the source format.
          // path[0] is the source, path[path.length-1] is the target, path.length-1 is the
          // number of steps — handy for F19's diagnostic panel.
          stepPath = [format, ...steps.map(s => s.to)];

          let currentBlob: Blob = file;
          // The last step decides the real container: a multi-sheet XLSX→CSV and a multi-page
          // PDF→PNG both hand back a ZIP while the nominal target still says CSV / PNG. `containerExt`
          // is how a converter declares that; scanning the returned filename is only the fallback for
          // converters that have not declared it.
          let outExt: string = target;
          // Which step decided the outcome is a fact about the route, not about the source format:
          // the same GIF comes out animated through `gif→html` and flattened through `gif→png`.
          // Whether there was an animation to flatten is a fact about the bytes, so the step that
          // decoded them reports it and this carries it up — the same way `svgRasterized` does.
          let lostFrames = false;
          // An intermediate step can be the one that flattens the source's vector artwork — a
          // `md→html→docx` chain rasterizes inside the `html→docx` step, never the `md→html` one — so
          // the fact has to be carried up from whichever step reported it.
          let svgRasterized = false;
          for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
            if (signal.aborted) break;
            const step = steps[stepIndex];
            // Built per step because only the final encode may honour `quality` and `targetSizeKB`;
            // the signal and the source identity stay the same across the whole chain.
            const ctx: ConvertContext = {
              signal,
              source: file,
              options: optionsForStep(batchOptions, stepIndex === steps.length - 1),
            };
            try {
              const stepResult = await step.converter.convert(currentBlob, ctx);
              currentBlob = stepResult.blob;
              outExt = stepResult.containerExt ?? extensionOf(stepResult.filename) ?? outExt;
              lostFrames ||= stepResult.lostFrames === true;
              svgRasterized ||= stepResult.svgRasterized === true;
            } catch (stepError) {
              stepFailedAt = stepIndex + 1;
              throw stepError;
            }
          }
          if (signal.aborted) break;

          const base = file.name.replace(/\.[^.]+$/, '');
          results.push({
            blob: currentBlob,
            filename: uniqueName(base, outExt),
            lostFrames,
            svgRasterized,
          });
          converted.push({ name: file.name, size: file.size, format });
        } catch (e) {
          // A cancel surfacing from inside a long step is not a failure of that file: the user
          // asked to stop and the batch ends here anyway. Recording it would put a "Conversion
          // cancelled" row in the failures list beside the results still worth downloading.
          if (signal.aborted) break;
          // Isolate per-file errors: keep converting the remaining files
          const failure: ConversionFailure = {
            fileName: file.name,
            reason: e instanceof Error && e.message ? e.message : 'errors.unknown',
            path: stepPath,
            failedStep: stepFailedAt,
            detail: causeDetailOf(e),
          };
          failures.push(failure);
          batchFailures.value.push(failure);
        }
        completedCount.value = i + 1;
      }
      // B2: assign once after the loop so Vue only fires one reactive update. Skipped when the
      // workspace was reset mid-batch — `reset()` already cleared it, and writing the abandoned
      // batch's results back would resurrect a results panel for files that are gone.
      if (workspaceEpoch === epochAtConfirm) batchResults.value = results;

      // Record successful conversions in history (metadata only, no blob); a storage failure
      // must never leave the UI stuck in "converting". The accounting runs over `converted`, not
      // the input list, so failed files cannot inflate a record of an otherwise good batch.
      if (converted.length > 0) {
        try {
          const totalSourceSize = converted.reduce((sum, c) => sum + c.size, 0);
          const totalResultSize = results.reduce((sum, r) => sum + r.blob.size, 0);
          // For a batch, fold the remaining count into the stored name so the raw
          // history field stays self-describing (UI and tooltip both render it as-is).
          const firstName = converted[0].name;
          const batchName = converted.length > 1 ? `${firstName} + ${converted.length - 1}` : firstName;
          await addRecord({
            fileName: batchName,
            // Full list alongside the label so search and the row tooltip can reach the
            // files the label hides. Bounded by MAX_BATCH_FILES (200).
            fileNames: converted.map(c => c.name),
            sourceFormat: converted[0].format,
            targetFormat: target,
            fileSize: totalSourceSize,
            resultSize: totalResultSize,
            fileCount: converted.length,
          });
        } catch {
          // History is best-effort; ignore storage errors
        }
        // Refresh the recently-used list for the FormatSelector quick-pick group.
        // Best-effort, fire-and-forget: failures here cannot affect the batch.
        void recordTarget(target);
      }
    } finally {
      if (abortController === controller) abortController = null;
      // A `reset()` mid-batch already normalized isConverting/currentIndex/cancelled when it
      // cleared the workspace; re-stamping them (and notifying) from the abandoned loop would
      // paint the discarded batch's state back onto the empty screen.
      if (workspaceEpoch === epochAtConfirm) {
        const wasCancelled = signal.aborted;
        // Publish the fact for the UI: `isDone` alone cannot tell a finished batch from one the user
        // stopped halfway, and a cancel before the first result used to render an empty screen.
        cancelled.value = wasCancelled;
        isConverting.value = false;
        currentIndex.value = -1;
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
   *  the whole entry map up front; the library itself is loaded here, not at module scope,
   *  so it stays off the first screen (see `~/utils/core/zip`).
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
      const { Zip, ZipDeflate, ZipPassThrough } = await loadFflate();
      const chunks: BlobPart[] = [];
      await new Promise<void>((resolve, reject) => {
        const zipStream = new Zip((err, chunk, final) => {
          if (err) {
            reject(err);
            return;
          }
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
      saveAs(new Blob(chunks, { type: 'application/zip' }), `converted-${nameStamp(new Date())}.zip`);
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
    cancelled.value = false;
    completedCount.value = 0;
    currentIndex.value = -1;
    previousBatch.value = null;
  }

  function reset(): void {
    // Abandon any in-flight batch: the abort stops its loop at the next signal check, and the
    // epoch bump keeps the abandoned batch's tail writes (cancelled/results/notification) from
    // landing on this cleared workspace. `isConverting` is normalized right here.
    abortController?.abort();
    workspaceEpoch++;
    sourceFiles.value = [];
    sourceFormats.value = [];
    targetFormat.value = null;
    isConverting.value = false;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    cancelled.value = false;
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
    // The restored snapshot is a batch that ran to completion; leaving `cancelled` set would
    // keep the header and the live region describing a stopped batch over intact results.
    cancelled.value = false;
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
    cancelled,
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
