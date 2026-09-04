import { ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { FileFormat } from '~/utils/core/types';
import type { FileFormat as FileFormatT } from '~/utils/core/types';

export interface HistoryRecord {
  id: string;
  time: number;
  fileName: string;
  sourceFormat: FileFormatT;
  targetFormat: FileFormatT;
  fileSize: number;
  resultSize: number;
  fileCount: number;
}

const MAX_RECORDS = 50;
/** Bumped on breaking changes to the export shape so old imports fail loudly. */
const HISTORY_EXPORT_VERSION = 1;

export interface HistoryExport {
  version: number;
  records: HistoryRecord[];
}

const VALID_FORMATS = new Set<string>(Object.values(FileFormat));

function isHistoryRecord(o: unknown): o is HistoryRecord {
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
   *  Result is sorted by time desc and capped at MAX_RECORDS. Throws on invalid payload. */
  async function importData(payload: unknown): Promise<{ merged: number; total: number }> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('payload-not-object');
    }
    const p = payload as { version?: unknown; records?: unknown };
    if (p.version !== HISTORY_EXPORT_VERSION) {
      throw new Error('version-mismatch');
    }
    if (!Array.isArray(p.records)) {
      throw new Error('records-not-array');
    }
    const incoming = p.records.filter(isHistoryRecord);
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
