import { ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import type { FileFormat } from '~/utils/core/types';

const MAX_RECENT = 6;

const recent: Ref<FileFormat[]> = ref([]);
let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function initRecent(): Promise<void> {
  if (initialized) return;
  const stored = await storageGet<FileFormat[]>(STORAGE_KEYS.recentTargets, []);
  initialized = true;
  recent.value = Array.isArray(stored) ? stored.slice(0, MAX_RECENT) : [];
  unsubscribe = onStorageChange<FileFormat[]>(STORAGE_KEYS.recentTargets, value => {
    recent.value = Array.isArray(value) ? value.slice(0, MAX_RECENT) : [];
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

export function useRecentTargets() {
  if (!initPromise) initPromise = initRecent();

  async function recordTarget(format: FileFormat): Promise<void> {
    await initPromise;
    const next = [format, ...recent.value.filter(f => f !== format)].slice(0, MAX_RECENT);
    recent.value = next;
    await storageSet(STORAGE_KEYS.recentTargets, next);
  }

  return { recent, recordTarget };
}
