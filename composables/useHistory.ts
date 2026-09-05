import { ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { FileFormat } from '~/utils/core/types';
import type { FileFormat as FileFormatT } from '~/utils/core/types';

export interface HistoryRecord {
  id: string;
  time: number;
  fileName: string;
  /** Every file name in the batch, in selection order.
   *
   *  `fileName` is a *display label* — for a multi-file batch it is
   *  `"<first> + N"`, which hides every other member from search and tooltips.
   *  This field carries the real names so both can reach them again.
   *
   *  Optional and purely additive: records written before it existed, and records
   *  imported from an older export, simply have no value and fall back to the
   *  label. Bounded by `MAX_BATCH_FILES` (200) in FileUpload, so 50 records can
   *  never grow storage beyond a few hundred KB. */
  fileNames?: string[];
  sourceFormat: FileFormatT;
  targetFormat: FileFormatT;
  fileSize: number;
  resultSize: number;
  fileCount: number;
}

const MAX_RECORDS = 50;
/** Bumped on breaking changes to the export shape so old imports fail loudly.
 *  Deliberately NOT bumped when `fileNames` was added: the field is optional, so
 *  old exports still import cleanly and new exports still open in an older build
 *  (its `isHistoryRecord` ignores unknown keys). Bumping would turn a compatible
 *  addition into a hard rejection for no benefit. */
const HISTORY_EXPORT_VERSION = 1;

export interface HistoryExport {
  version: number;
  records: HistoryRecord[];
}

/** i18n keys for the failures `importData` reports. Mirrors `CONVERSION_ERROR_KEYS` in
 *  useConversion: the thrown `Error.message` is a translation key, and callers check
 *  membership before deciding whether to translate it or show it verbatim — internal
 *  tokens like `version-mismatch` must never reach the user untranslated. */
export const HISTORY_IMPORT_ERROR_KEYS = new Set([
  'history.importErrPayload',
  'history.importErrVersion',
  'history.importErrRecords',
]);

const VALID_FORMATS = new Set<string>(Object.values(FileFormat));

/** A payload record that satisfied every required-field check. The index signature says
 *  what is actually true at this point — it also carries whatever else the file had, and
 *  `normalizeRecord` is what decides whether any of it survives. */
type LooseHistoryRecord = HistoryRecord & { [key: string]: unknown };

function isHistoryRecord(o: unknown): o is LooseHistoryRecord {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return false;
  if (typeof r.time !== 'number' || !Number.isFinite(r.time)) return false;
  if (typeof r.fileName !== 'string' || !r.fileName) return false;
  if (typeof r.sourceFormat !== 'string' || !VALID_FORMATS.has(r.sourceFormat)) return false;
  if (typeof r.targetFormat !== 'string' || !VALID_FORMATS.has(r.targetFormat)) return false;
  if (typeof r.fileSize !== 'number' || !Number.isFinite(r.fileSize)) return false;
  if (typeof r.resultSize !== 'number' || !Number.isFinite(r.resultSize)) return false;
  if (typeof r.fileCount !== 'number' || !Number.isFinite(r.fileCount)) return false;
  return true;
}

/** Strip a malformed optional field instead of rejecting the record. `fileNames` is a
 *  progressive enhancement — losing search-by-any-file is a far better outcome than
 *  silently dropping an otherwise-valid entry the user exported. Unknown keys are
 *  discarded too, so a hand-edited payload cannot smuggle extra data into storage. */
function normalizeRecord(o: LooseHistoryRecord): HistoryRecord {
  // Every field below is already narrowed by `isHistoryRecord`, which runs first.
  const base: HistoryRecord = {
    id: o.id,
    time: o.time,
    fileName: o.fileName,
    sourceFormat: o.sourceFormat,
    targetFormat: o.targetFormat,
    fileSize: o.fileSize,
    resultSize: o.resultSize,
    fileCount: o.fileCount,
  };
  const names: unknown = o.fileNames;
  if (Array.isArray(names) && names.length > 0 && names.every(n => typeof n === 'string' && n)) {
    base.fileNames = names as string[];
  }
  return base;
}

/** Names a record can be matched against: every file in the batch for records saved by
 *  current versions, otherwise just the display label. Reads through `unknown` because
 *  records restored straight from storage never pass through `normalizeRecord`. */
export function searchableFileNames(r: HistoryRecord): string[] {
  const names: unknown = r.fileNames;
  if (Array.isArray(names) && names.length > 0 && names.every(n => typeof n === 'string')) {
    return names as string[];
  }
  return [r.fileName];
}

const records: Ref<HistoryRecord[]> = ref([]);

let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function initHistory(): Promise<void> {
  if (initialized) return;
  const stored = await storageGet<HistoryRecord[]>(STORAGE_KEYS.history, []);
  // Set the guard AFTER the read so a transient storage failure lets the next caller retry.
  initialized = true;
  records.value = Array.isArray(stored) ? stored : [];
  unsubscribe = onStorageChange<HistoryRecord[]>(STORAGE_KEYS.history, value => {
    records.value = Array.isArray(value) ? value : [];
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribe?.();
    unsubscribe = null;
    initialized = false;
    initPromise = null;
  });
}

export function useHistory() {
  if (!initPromise) initPromise = initHistory();

  async function addRecord(record: Omit<HistoryRecord, 'id' | 'time'>): Promise<void> {
    await initPromise;
    const entry: HistoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      time: Date.now(),
    };
    // Newest first, LRU cap
    const next = [entry, ...records.value].slice(0, MAX_RECORDS);
    records.value = next;
    await storageSet(STORAGE_KEYS.history, next);
  }

  async function removeRecord(id: string): Promise<void> {
    const next = records.value.filter(r => r.id !== id);
    records.value = next;
    await storageSet(STORAGE_KEYS.history, next);
  }

  async function clear(): Promise<void> {
    records.value = [];
    await storageSet(STORAGE_KEYS.history, []);
  }

  /** Snapshot the current history for export. Returns a plain object so the caller
   *  can JSON-serialize without holding a live ref. */
  function exportData(): HistoryExport {
    return {
      version: HISTORY_EXPORT_VERSION,
      records: [...records.value],
    };
  }

  /** Merge imported records into the current history. Dedup is by id (incoming wins).
   *  Result is sorted by time desc and capped at MAX_RECORDS. Throws an Error whose
   *  message is a key from HISTORY_IMPORT_ERROR_KEYS when the payload is unusable. */
  async function importData(payload: unknown): Promise<{ merged: number; total: number }> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('history.importErrPayload');
    }
    const p = payload as { version?: unknown; records?: unknown };
    if (p.version !== HISTORY_EXPORT_VERSION) {
      throw new Error('history.importErrVersion');
    }
    if (!Array.isArray(p.records)) {
      throw new Error('history.importErrRecords');
    }
    const incoming = p.records.filter(isHistoryRecord).map(normalizeRecord);
    if (incoming.length === 0) {
      return { merged: 0, total: records.value.length };
    }
    // Build a map keyed by id, seeding with current records. Incoming entries
    // overwrite existing ones (newer wins). New ids are appended in import order
    // so the resulting Map orders: [kept old] ∪ [new ids in import order].
    const merged = new Map<string, HistoryRecord>();
    for (const r of records.value) merged.set(r.id, r);
    for (const r of incoming) merged.set(r.id, r);
    const next = [...merged.values()]
      .sort((a, b) => b.time - a.time)
      .slice(0, MAX_RECORDS);
    records.value = next;
    await storageSet(STORAGE_KEYS.history, next);
    return { merged: incoming.length, total: next.length };
  }

  return { records, addRecord, removeRecord, clear, exportData, importData };
}
