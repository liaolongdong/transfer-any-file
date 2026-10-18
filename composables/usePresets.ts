import { ref } from 'vue';
import type { Ref } from 'vue';
import type { ConversionPreset } from '~/utils/core/types';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { MAX_PRESETS, sanitizePresets } from '~/utils/core/presets';

/**
 * Saved conversion presets, as a module-level singleton like `useHistory` / `useRecentTargets`.
 *
 * The bar that lists them and the workbench that applies them are different components, and the
 * list has to stay in sync with `chrome.storage` for both — passing it down as a prop would only
 * move the problem to whichever component mounts first.
 */
const presets: Ref<ConversionPreset[]> = ref([]);

let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function initPresets(): Promise<void> {
  if (initialized) return;
  const stored = await storageGet<unknown>(STORAGE_KEYS.presets, []);
  initialized = true;
  presets.value = sanitizePresets(stored);
  unsubscribe = onStorageChange<unknown>(STORAGE_KEYS.presets, value => {
    presets.value = sanitizePresets(value);
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

export function usePresets() {
  if (!initPromise) initPromise = initPresets();

  /**
   * Store a new preset ahead of the existing ones; the cap drops the oldest, newest first.
   *
   * Resolves to whether the list reached storage, because the bar that calls this tells the user the
   * preset is saved. Without the outcome that sentence is a promise the code cannot keep: the chip is
   * in memory either way, so a quota failure only shows up as the preset vanishing after a reload.
   */
  async function addPreset(preset: ConversionPreset): Promise<boolean> {
    await initPromise;
    const next = [preset, ...presets.value].slice(0, MAX_PRESETS);
    presets.value = next;
    return storageSet(STORAGE_KEYS.presets, next);
  }

  /** Same outcome contract as `addPreset`, for the matching 「已删除」 message. */
  async function removePreset(id: string): Promise<boolean> {
    await initPromise;
    const next = presets.value.filter(preset => preset.id !== id);
    if (next.length === presets.value.length) return true;
    presets.value = next;
    return storageSet(STORAGE_KEYS.presets, next);
  }

  return { presets, addPreset, removePreset };
}
