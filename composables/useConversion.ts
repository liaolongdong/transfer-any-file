import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { saveAs } from 'file-saver';
import { zip } from 'fflate';
import type { Zippable } from 'fflate';
import { FileFormat } from '~/utils/core/types';
import type { ConvertResult } from '~/utils/core/types';
import { converterRegistry } from '~/utils/core/registry';
import { useFileDetect } from '~/composables/useFileDetect';
import { useHistory } from '~/composables/useHistory';

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
}

export function useConversion() {
  const { detectFormat } = useFileDetect();
  const { addRecord } = useHistory();

  const sourceFiles: Ref<File[]> = ref([]);
  const sourceFormats: Ref<(FileFormat | null)[]> = ref([]);
  const targetFormat: Ref<FileFormat | null> = ref(null);
  const isConverting: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  const batchResults: Ref<ConvertResult[]> = ref([]);
  const batchFailures: Ref<ConversionFailure[]> = ref([]);
  const currentIndex: Ref<number> = ref(-1);
  const completedCount: Ref<number> = ref(0);

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
   * Formats already present in the sources are excluded.
   */
  const availableTargets: ComputedRef<FileFormat[]> = computed(() => {
    const formats = uniqueSourceFormats.value;
    if (formats.length === 0) return [];
    let targets = converterRegistry.getAllSupportedTargets(formats[0]);
    for (const format of formats.slice(1)) {
      const reachable = new Set(converterRegistry.getAllSupportedTargets(format));
      targets = targets.filter(t => reachable.has(t));
    }
    return targets.filter(t => !formats.includes(t));
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
  }

  function setTargetFormat(format: FileFormat): void {
    targetFormat.value = format;
    batchResults.value = [];
    batchFailures.value = [];
    error.value = null;
  }

  async function convert(): Promise<void> {
    const target = targetFormat.value;
    if (sourceFiles.value.length === 0 || !target) {
      error.value = 'errors.noFileOrTarget';
      return;
    }
    if (isConverting.value) return;

    isConverting.value = true;
    error.value = null;
    batchResults.value = [];
    batchFailures.value = [];
    completedCount.value = 0;
    abortController = new AbortController();

    // Snapshot the batch so uploads/pastes during conversion can't mutate it mid-loop
    const files = [...sourceFiles.value];
    const formats = [...sourceFormats.value];

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
        try {
          if (!format) throw new Error('errors.unknownFormat');

          // Each file resolves its own path so mixed-format batches stay correct
          const steps = converterRegistry.findConversionPath(format, target);
          if (!steps || steps.length === 0) throw new Error('errors.noPath');

          let currentBlob: Blob = file;
          // The final step's filename carries the real container extension
          // (e.g. a multi-sheet XLSX→CSV yields a .zip, not a .csv)
          let outExt: string = target;
          for (const step of steps) {
            if (abortController.signal.aborted) break;
            const stepResult = await step.converter.convert(currentBlob);
            currentBlob = stepResult.blob;
            outExt = stepResult.filename.split('.').pop() || target;
          }
          if (abortController.signal.aborted) break;

          const base = file.name.replace(/\.[^.]+$/, '');
          results.push({ blob: currentBlob, filename: uniqueName(base, outExt) });
          batchResults.value = [...results];
        } catch (e) {
          // Isolate per-file errors: keep converting the remaining files
          failures.push({
            fileName: file.name,
            reason: e instanceof Error && e.message ? e.message : 'errors.unknown',
          });
          batchFailures.value = [...failures];
        }
        completedCount.value = i + 1;
      }

      // Record successful conversions in history (metadata only, no blob);
      // a storage failure must never leave the UI stuck in "converting"
      const firstFormat = formats.find((f): f is FileFormat => f !== null) ?? null;
      if (results.length > 0 && firstFormat) {
        try {
          const totalSourceSize = files.reduce((sum, f) => sum + f.size, 0);
          const totalResultSize = results.reduce((sum, r) => sum + r.blob.size, 0);
          await addRecord({
            fileName: files[0].name,
            sourceFormat: firstFormat,
            targetFormat: target,
            fileSize: totalSourceSize,
            resultSize: totalResultSize,
            fileCount: files.length,
          });
        } catch {
          // History is best-effort; ignore storage errors
        }
      }
    } finally {
      isConverting.value = false;
      currentIndex.value = -1;
      abortController = null;
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

  /** Bundle all results into a single ZIP so the browser fires one download */
  async function downloadAllZip(): Promise<void> {
    const items = batchResults.value;
    if (items.length === 0) return;
    if (items.length === 1) {
      downloadResult(0);
      return;
    }
    try {
      const entries: Zippable = {};
      for (const r of items) {
        entries[r.filename] = new Uint8Array(await r.blob.arrayBuffer());
      }
      const zipped = await new Promise<Uint8Array>((resolve, reject) => {
        zip(entries, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)));
      });
      const stamp = new Date().toISOString().slice(0, 10);
      saveAs(new Blob([zipped as BlobPart], { type: 'application/zip' }), `converted-${stamp}.zip`);
    } catch {
      error.value = 'errors.zipFail';
    }
  }

  function updateResult(index: number, newResult: ConvertResult): void {
    if (index >= 0 && index < batchResults.value.length) {
      batchResults.value[index] = newResult;
      batchResults.value = [...batchResults.value];
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
  }

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
  };
}
