import { ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import type { FileFormat } from '~/utils/core/types';

export interface HistoryRecord {
  id: string;
  time: number;
  fileName: string;
  sourceFormat: FileFormat;
  targetFormat: FileFormat;
  fileSize: number;
  resultSize: number;
  fileCount: number;
}

const MAX_RECORDS = 50;

const records: Ref<HistoryRecord[]> = ref([]);

let initialized = false;
let initPromise: Promise<void> | null = null;

async function initHistory(): Promise<void> {
  if (initialized) return;
  initialized = true;
  records.value = await storageGet<HistoryRecord[]>(STORAGE_KEYS.history, []);
  onStorageChange<HistoryRecord[]>(STORAGE_KEYS.history, value => {
    records.value = Array.isArray(value) ? value : [];
  });
}

export function useHistory() {
  if (!initPromise) initPromise = initHistory();

  async function addRecord(record: Omit<HistoryRecord, 'id' | 'time'>): Promise<void> {
    await initPromise;
    const entry: HistoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  return { records, addRecord, removeRecord, clear };
}
