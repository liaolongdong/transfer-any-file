import { ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { FileFormat } from '~/utils/core/types';

const MAX_RECENT = 6;

/** Storage is untrusted input (it can be edited by hand or left over from an older
 *  version), so every element is checked against the enum before it reaches the UI —
 *  an unknown string would otherwise render as a blank format chip. */
const VALID_FORMATS = new Set<string>(Object.values(FileFormat));

function sanitizeList(value: unknown): FileFormat[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is FileFormat => typeof v === 'string' && VALID_FORMATS.has(v))
    .slice(0, MAX_RECENT);
}

const recent: Ref<FileFormat[]> = ref([]);
let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function initRecent(): Promise<void> {
  if (initialized) return;
  const stored = await storageGet<unknown>(STORAGE_KEYS.recentTargets, []);
  initialized = true;
  recent.value = sanitizeList(stored);
  unsubscribe = onStorageChange<unknown>(STORAGE_KEYS.recentTargets, value => {
    recent.value = sanitizeList(value);
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
