import { ref, computed, h } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { saveAs } from 'file-saver';
import { FileFormat } from '~/utils/core/types';
import type { ConvertContext, ConvertResult } from '~/utils/core/types';
import { converterRegistry } from '~/utils/core/registry';
import { getBlockedReason } from '~/utils/core/conversion-policy';
import { isImageOutputFormat, optionsForStep } from '~/utils/core/output-options';
import { detectFormat } from '~/utils/core/file-detect';
import { useOutputOptions } from '~/composables/useOutputOptions';
import { useNameTemplate } from '~/composables/useNameTemplate';
import { applyNameTemplate } from '~/utils/core/name-template';
import { usePdfPages } from '~/composables/usePdfPages';
import { useHistory } from '~/composables/useHistory';
import { useRecentTargets } from '~/composables/useRecentTargets';
import { useNotification } from '~/composables/useNotification';
import { useConfirmConvert } from '~/composables/useConfirmConvert';
import { useI18n } from '~/composables/useI18n';
import { formatSize, isZipCompressible } from '~/utils/core/format';
import { getFormatLabel } from '~/utils/core/format-labels';
import { loadFflate } from '~/utils/core/zip';
import { clearAttention, markBatchComplete } from '~/utils/core/tab-attention';

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
  /**
   * Index of the failed file inside the batch it came from, or `undefined` when the chain never
   * got far enough to be attributed.
   *
   * Only `retryFailedFiles` reads it, and it needs an index rather than a name: two files in one
   * batch can legitimately be called `report.md`, and matching by name would re-run the wrong one
   * (or re-run the right one twice) and show the user a duplicate of a file that already worked.
   */
  fileIndex?: number;
}

/**
 * What a retry pass ended up doing, so the caller can tell "the user changed their mind at the
 * confirmation dialog" apart from "the retried files failed again".
 *
 * `ran` is false whenever the retry never started or was abandoned because the workspace was reset
 * underneath it; in that case the counts are meaningless and must not be announced.
 */
export interface RetryOutcome {
  ran: boolean;
  recovered: number;
  stillFailing: number;
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
 * Source name the archive is named from, as `{name}` resolves it.
 *
 * The archive is the deliverable a user renaming a download looks at first, so it follows the same
 * pattern as the files inside it rather than keeping its own hard-coded spelling. `{index}` stays 1
 * — there is one archive per click — and its `{target}` is the literal `zip`, because `FileFormat`
 * has no ZIP member and the archive's container is not one of the convertible formats.
 */
const ARCHIVE_SOURCE = 'converted';

export function useConversion() {
  const { addRecord } = useHistory();
  const { recordTarget } = useRecentTargets();
  const { t } = useI18n();
  const { notify } = useNotification();
  const { isEnabled: confirmConvertEnabled, setEnabled: setConfirmConvertEnabled } = useConfirmConvert();
  const { options: outputOptions } = useOutputOptions();
  const { currentTemplate } = useNameTemplate();
  const { pageRange, pageRangeSelected } = usePdfPages();

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
   * Position inside the current file's conversion chain (1-indexed), and how many steps that chain
   * has. Both are 0 whenever there is nothing to attribute — before the path resolves, after the
   * file returns, and always for a single-file idle workspace.
   *
   * The step loop already keeps these numbers to record `failedStep` in the diagnostics panel; they
   * were simply never published. Surfacing them is what lets a multi-step route (MD→PDF is
   * `md→html` then `html→pdf`) show movement inside a file instead of a spinner that cannot change
   * until the whole chain returns — the only progress a single-file batch ever had.
   */
  const currentStep: Ref<number> = ref(0);
  const stepTotal: Ref<number> = ref(0);
  /**
   * True while "download all" is assembling a ZIP. Packing is synchronous CPU work per entry
   * (fflate deflates ~7 MB in about a second), so without this the button looks dead and the
   * click that "did nothing" gets pressed again.
   */
  const isPackaging: Ref<boolean> = ref(false);
  /** True while `retryFailedFiles` is re-running the failed subset. */
  const isRetrying: Ref<boolean> = ref(false);
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
    owners: File[];
  }
  const previousBatch: Ref<BatchSnapshot | null> = ref(null);

  /**
   * The source `File` behind each entry of `batchResults`, index-aligned.
   *
   * `ConvertResult` deliberately carries no source identity — its `filename` is rebuilt from the
   * source basename plus the new extension — so once a file leaves the batch nothing is left to say
   * which result was its. Without this array the only honest response to an edit of the file list
   * is to throw every result away; with it, just the orphaned rows go.
   */
  let resultOwners: File[] = [];

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

  /**
   * Drop everything that describes *a run* — results, failures, progress, undo — leaving the
   * selected files and the conversion flag alone. `keepTarget` is for the one caller that is
   * clearing the run but not the choice it ran under, i.e. `setFiles` on a batch that has nothing
   * on screen yet.
   *
   * `setFiles`, `clearResults` and `reset` all need exactly this, and each of them used to spell it
   * out field by field. Centralising it is what guarantees the per-step progress counters are
   * cleared on every one of those paths too: a stale `stepTotal` would keep drawing a "step 2 / 3"
   * line over a workspace that has no batch in it.
   */
  function clearBatchState(keepTarget = false): void {
    if (!keepTarget) targetFormat.value = null;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
    cancelled.value = false;
    completedCount.value = 0;
    currentIndex.value = -1;
    currentStep.value = 0;
    stepTotal.value = 0;
    previousBatch.value = null;
    resultOwners = [];
  }

  /**
   * Adopt a new file list, keeping whatever on screen still describes a file that is there.
   *
   * Removing one row out of a ten-file batch used to cost the other nine their results, and adding
   * one reset the target the user had just picked. Both are only required when the batch itself
   * stops supporting what is on screen, so that is the single condition that still wipes it:
   * `availableTargets` is the intersection over the new list, and a target that fell out of it
   * would either fail per file or produce the placeholder `conversion-policy` greys out.
   */
  function setFiles(files: File[]): void {
    const previousFiles = sourceFiles.value;
    sourceFiles.value = files;
    sourceFormats.value = files.map(f => detectFormat(f));
    const target = targetFormat.value;
    if (!target) {
      clearBatchState();
      return;
    }
    if (!availableTargets.value.includes(target)) {
      clearBatchState();
      ElMessage.warning(t('convert.targetDropped'));
      return;
    }
    if (batchResults.value.length === 0 && batchFailures.value.length === 0) {
      clearBatchState(true);
      return;
    }

    // Identity, not name: two files in one batch can be called `report.md`, and `uniqueName` only
    // makes the *output* names distinct, so matching rows by name can drop the wrong one.
    const newIndexByFile = new Map(files.map((file, index) => [file, index] as const));
    const keptResults: ConvertResult[] = [];
    const keptOwners: File[] = [];
    batchResults.value.forEach((result, index) => {
      const owner = resultOwners[index];
      if (owner !== undefined && newIndexByFile.has(owner)) {
        keptResults.push(result);
        keptOwners.push(owner);
      }
    });
    const keptFailures = batchFailures.value.flatMap(failure => {
      // A row that never got a `fileIndex` says nothing about which file it came from, so it cannot
      // be shown to be stale. `retryFailedFiles` already skips it and 重新转换 drops it.
      if (failure.fileIndex === undefined) return [failure];
      const index = newIndexByFile.get(previousFiles[failure.fileIndex]);
      return index === undefined ? [] : [{ ...failure, fileIndex: index }];
    });

    batchResults.value = keptResults;
    resultOwners = keptOwners;
    batchFailures.value = keptFailures;
    // What is left is a finished batch over the surviving files, so the counters follow it. The
    // progress bar itself is gated on `isConverting`, so only the rows and the retry set matter.
    completedCount.value = keptResults.length + keptFailures.length;
    currentIndex.value = -1;
    currentStep.value = 0;
    stepTotal.value = 0;
    error.value = null;
    // Same reason as before: the snapshot is a batch over the list as it was, and restoring it
    // would put back the results of files the user has just removed.
    previousBatch.value = null;
  }

  function setTargetFormat(format: FileFormat): void {
    targetFormat.value = format;
    batchResults.value = [];
    resultOwners = [];
    batchFailures.value = [];
    error.value = null;
    cancelled.value = false;
    currentStep.value = 0;
    stepTotal.value = 0;
    previousBatch.value = null;
  }

  /**
   * Run one batch over `sourceFiles` toward `targetFormat`.
   *
   * Resolves to whether the batch actually ran: `false` covers "nothing selected", "already
   * running" and "the user backed out of the confirmation dialog", which `retryFailedFiles` needs
   * to tell apart from a batch that ran and failed.
   */
  async function convert(): Promise<boolean> {
    const target = targetFormat.value;
    if (sourceFiles.value.length === 0 || !target) {
      error.value = 'errors.noFileOrTarget';
      return false;
    }
    if (isConverting.value || convertLocked) return false;

    // A new run supersedes an unread completion, so its tab marker must not survive into this one.
    // In practice the user had to come back to press the button, which clears it on its own; this
    // is the belt-and-braces side of that.
    clearAttention();

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
            cancelButtonText: t('common.cancel'),
            type: 'info',
          },
        );
        if (dontAsk.value) await setConfirmConvertEnabled(false);
      } catch {
        convertLocked = false;
        ElMessage.info(t('convert.confirmCancelled'));
        return false;
      }
      convertLocked = false;
      // Everything awaited above happened while the dialog had the screen. If the workspace was
      // reset or re-targeted in that window, the summary the user confirmed no longer describes
      // this batch — drop it instead of converting under a stale target.
      if (workspaceEpoch !== epochAtConfirm || targetFormat.value !== target) return false;
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
        owners: [...resultOwners],
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
    const owners: File[] = [];
    const failures: ConversionFailure[] = [];
    // History accounting follows what actually converted: a failed file must not inflate the
    // stored fileCount / fileNames / source size of an otherwise successful batch.
    const converted: Array<{ name: string; size: number; format: FileFormat }> = [];

    // Read once for the whole batch: the panel is disabled while converting, but a snapshot also
    // keeps one batch from being encoded under two different settings if the value ever changes.
    // Gated on the *batch* target — MD→PDF and XLSX→…→PNG→PDF rasterize along the way, and a
    // leftover 800px cap must not quietly degrade an output the user never asked to shrink.
    const batchOptions = isImageOutputFormat(target) ? { ...outputOptions.value } : undefined;
    // The page selection is gated the same way, and for the same reason: the field that writes it is
    // not on screen once the target stops being an image, and a batch the user cannot see they
    // narrowed is the failure mode with no undo. This is only the *batch* half of the rule — whether
    // this particular file is the PDF is checked per file where `ctx` is built below.
    const batchPageRange = isImageOutputFormat(target) && pageRangeSelected.value ? pageRange.value : undefined;

    // Snapshot with the rest of the batch: a pattern changed mid-run must not name the first half
    // of a delivery one way and the second half another.
    const batchNameTemplate = await currentTemplate();
    // Typed here rather than read inside `uniqueName`: the closure below cannot see that the guard
    // at the top of `convert()` already ruled out a null target.
    const batchTarget: string = target;

    // Render the name, then suffix only when that name is already taken in this batch — two files
    // can legitimately be called `report.md`, and one of them has to arrive as `report_…_2.md`.
    const usedNames = new Set<string>();
    function uniqueName(source: string, ext: string, index: number): string {
      const base = applyNameTemplate(batchNameTemplate, { source, index, target: batchTarget, date: new Date() });
      let name = `${base}.${ext}`;
      let n = 2;
      while (usedNames.has(name)) {
        name = `${base}_${n}.${ext}`;
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
        // Cleared before the path resolves so a file with no route never inherits the previous
        // file's step line, and stays at 0 / 0 — the value the progress hints hide themselves on.
        currentStep.value = 0;
        stepTotal.value = 0;
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
          stepTotal.value = steps.length;

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
            currentStep.value = stepIndex + 1;
            const step = steps[stepIndex];
            // Built per step because only the final encode may honour `quality` and `targetSizeKB`;
            // the signal and the source identity stay the same across the whole chain.
            const ctx: ConvertContext = {
              signal,
              source: file,
              options: optionsForStep(batchOptions, stepIndex === steps.length - 1),
              // The other half of the visibility rule. `format` is what the user uploaded, while
              // `step` is what this converter receives, and those differ for `md→html→pdf→png`: the
              // PDF in that chain was generated from their markdown a moment ago, and applying a
              // leftover `2` to it would drop pages of a document the field never referred to.
              pageRange: format === FileFormat.PDF ? batchPageRange : undefined,
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

          results.push({
            blob: currentBlob,
            filename: uniqueName(file.name, outExt, i + 1),
            lostFrames,
            svgRasterized,
          });
          owners.push(file);
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
            fileIndex: i,
          };
          failures.push(failure);
          batchFailures.value.push(failure);
        }
        completedCount.value = i + 1;
      }
      // B2: assign once after the loop so Vue only fires one reactive update. Skipped when the
      // workspace was reset mid-batch — `reset()` already cleared it, and writing the abandoned
      // batch's results back would resurrect a results panel for files that are gone.
      if (workspaceEpoch === epochAtConfirm) {
        batchResults.value = results;
        resultOwners = owners;
      }

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
        currentStep.value = 0;
        stepTotal.value = 0;
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
          // The other half of the same signal. The desktop notification is opt-in and self-suppresses
          // while this tab is focused, so a batch that finished after the user switched tabs used to
          // produce nothing at all for the default configuration.
          markBatchComplete(t('convert.tabDone', { title: document.title }));
        }
      }
    }
    return true;
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
    // Only the multi-entry path can block long enough to need telling the user about; a single
    // result goes straight to `saveAs` above, and flashing a spinner for one synchronous call
    // would only teach the eye to ignore it.
    isPackaging.value = true;
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
      const archiveTemplate = await currentTemplate();
      const archiveName = `${applyNameTemplate(archiveTemplate, {
        source: ARCHIVE_SOURCE,
        index: 1,
        target: 'zip',
        date: new Date(),
      })}.zip`;
      saveAs(new Blob(chunks, { type: 'application/zip' }), archiveName);
    } catch {
      error.value = 'errors.zipFail';
    } finally {
      isPackaging.value = false;
    }
  }

  /**
   * Re-run only the files that failed in the last batch, keeping the results that succeeded.
   *
   * Until now the only way to act on "完成 3 个，失败 2 个" was 重新转换, which wipes the good
   * results and converts all five again — so a 200-file batch that lost one file cost the whole
   * batch to recover one file. This swaps in the failed subset, hands it to the ordinary
   * `convert()` (so the confirmation gate, cancellation, per-file error isolation, policy checks and
   * history accounting all behave exactly as they do for a normal run), then puts the files back and
   * prepends the results that were already on screen.
   *
   * Two deliberate consequences of reusing `convert()` rather than writing a second loop: the batch
   * record written to history describes the retried files only, and a re-run that fails again
   * replaces its own earlier diagnostic row instead of stacking a second copy of the same file.
   */
  async function retryFailedFiles(): Promise<RetryOutcome> {
    const target = targetFormat.value;
    if (isConverting.value || convertLocked || target === null) return { ran: false, recovered: 0, stillFailing: 0 };
    const indexes = [
      ...new Set(
        batchFailures.value
          .map(f => f.fileIndex)
          .filter((i): i is number => i !== undefined && i >= 0 && i < sourceFiles.value.length),
      ),
    ].sort((a, b) => a - b);
    if (indexes.length === 0) return { ran: false, recovered: 0, stillFailing: 0 };

    const heldResults = [...batchResults.value];
    const heldOwners = [...resultOwners];
    const heldFailures = [...batchFailures.value];
    const heldFiles = [...sourceFiles.value];
    const heldFormats = [...sourceFormats.value];
    // Undo across the retry: `convert()` snapshots whatever is on screen before it clears it, and
    // the workspace is empty by then, so it would drop the snapshot and leave 撤销 dead.
    const snapshot: BatchSnapshot = {
      results: [...heldResults],
      failures: [...heldFailures],
      completedCount: completedCount.value,
      currentIndex: currentIndex.value,
      target,
      owners: [...heldOwners],
    };
    const epochAtRetry = workspaceEpoch;

    isRetrying.value = true;
    sourceFiles.value = indexes.map(i => heldFiles[i]);
    sourceFormats.value = indexes.map(i => heldFormats[i]);
    batchResults.value = [];
    batchFailures.value = [];
    // Kept separately from the snapshot because `convert()` only reaches its own `cancelled` write
    // after the confirmation dialog: if the batch never runs, nothing else puts this back, and a
    // panel that read "转换已取消" would quietly relabel itself as a normal finished batch.
    const heldCancelled = cancelled.value;
    cancelled.value = false;
    try {
      const ran = await convert();
      // Backing out of the retry's own confirmation dialog must cost nothing: without putting this
      // back, saying "not yet" to the dialog would have replaced a panel of finished results with a
      // selection of only the files that failed. Skipped once the epoch moved, because `reset()` in
      // that window already cleared the workspace on purpose and restoring it would undo the user.
      if (!ran) {
        if (workspaceEpoch === epochAtRetry) {
          sourceFiles.value = heldFiles;
          sourceFormats.value = heldFormats;
          batchResults.value = heldResults;
          resultOwners = heldOwners;
          batchFailures.value = heldFailures;
          cancelled.value = heldCancelled;
        }
        return { ran: false, recovered: 0, stillFailing: 0 };
      }
      // `reset()` mid-retry already cleared the workspace and bumped the epoch; putting these files
      // back would resurrect a workspace the user deliberately threw away.
      if (workspaceEpoch !== epochAtRetry) return { ran: false, recovered: 0, stillFailing: 0 };
      sourceFiles.value = heldFiles;
      sourceFormats.value = heldFormats;
      batchResults.value = [...heldResults, ...batchResults.value];
      resultOwners = [...heldOwners, ...resultOwners];
      // `convert()` numbered the failures it just produced against the subset it was handed, and by
      // now the workspace is back to the full list — so those numbers point at the wrong files. A
      // second retry without this would re-run an already-successful file and leave the still-broken
      // one on screen. Translating here keeps `fileIndex` meaning exactly one thing: a position in
      // `sourceFiles`, which is what every reader of it assumes.
      batchFailures.value = batchFailures.value.map(failure =>
        failure.fileIndex === undefined || failure.fileIndex >= indexes.length
          ? failure
          : { ...failure, fileIndex: indexes[failure.fileIndex] },
      );
      previousBatch.value = snapshot;
      return {
        ran: true,
        recovered: batchResults.value.length - heldResults.length,
        stillFailing: batchFailures.value.length,
      };
    } finally {
      isRetrying.value = false;
    }
  }

  function updateResult(index: number, newResult: ConvertResult): void {
    if (index >= 0 && index < batchResults.value.length) {
      batchResults.value[index] = newResult;
    }
  }

  /** Clear results/target but keep the selected files, e.g. "convert again" */
  function clearResults(): void {
    clearBatchState();
  }

  function reset(): void {
    // Abandon any in-flight batch: the abort stops its loop at the next signal check, and the
    // epoch bump keeps the abandoned batch's tail writes (cancelled/results/notification) from
    // landing on this cleared workspace. `isConverting` is normalized right here.
    abortController?.abort();
    workspaceEpoch++;
    sourceFiles.value = [];
    sourceFormats.value = [];
    isConverting.value = false;
    clearBatchState();
  }

  /** Restore the previously converted batch. Returns true on success, false if
   *  there's nothing to undo or the snapshot doesn't apply (e.g. files were
   *  swapped in the meantime). */
  function undo(): boolean {
    if (isConverting.value) return false;
    const snap = previousBatch.value;
    if (!snap) return false;
    batchResults.value = snap.results;
    resultOwners = snap.owners;
    batchFailures.value = snap.failures;
    completedCount.value = snap.completedCount;
    currentIndex.value = snap.currentIndex;
    currentStep.value = 0;
    stepTotal.value = 0;
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
    currentStep,
    stepTotal,
    isPackaging,
    isRetrying,
    totalCount,
    setFiles,
    setTargetFormat,
    convert,
    cancelConversion,
    downloadResult,
    downloadAllZip,
    retryFailedFiles,
    updateResult,
    clearResults,
    reset,
    undo,
    hasUndo,
  };
}
