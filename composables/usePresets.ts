import { ref } from 'vue';
import type { Ref } from 'vue';
import type { ConversionPreset, FileFormat, ImageOutputOptions } from '~/utils/core/types';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { MAX_PRESETS, PRESET_NAME_MAX, sanitizePresets } from '~/utils/core/presets';
import { isImageOutputFormat, sanitizeImageOutputOptions } from '~/utils/core/output-options';

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

  /**
   * Change one preset in place — a rename, or a re-capture of the live target and options.
   *
   * The list is written optimistically and rolled back when `storageSet` refuses, so the bar never
   * keeps showing a state the next reload would undo. An id that is already gone (deleted in another
   * tab while the edit dialog was open) resolves to `false` instead of resurrecting the entry.
   */
  async function updatePreset(
    id: string,
    patch: { name?: string; target?: FileFormat; options?: ImageOutputOptions },
  ): Promise<boolean> {
    await initPromise;
    const previous = presets.value;
    const index = previous.findIndex(preset => preset.id === id);
    if (index === -1) return false;

    const current = previous[index];
    const target = patch.target ?? current.target;
    const name =
      patch.name === undefined ? current.name : patch.name.trim().slice(0, PRESET_NAME_MAX) || target.toUpperCase();
    const options = isImageOutputFormat(target) ? sanitizeImageOutputOptions(patch.options ?? current.options) : {};

    const next = previous.slice();
    next[index] = { id, name, target, options };
    presets.value = next;

    if (await storageSet(STORAGE_KEYS.presets, next)) return true;
    presets.value = previous;
    return false;
  }

  /** Same outcome contract as `addPreset`, for the matching 「已删除」 message. */
  async function removePreset(id: string): Promise<boolean> {
    await initPromise;
    const next = presets.value.filter(preset => preset.id !== id);
    if (next.length === presets.value.length) return true;
    presets.value = next;
    return storageSet(STORAGE_KEYS.presets, next);
  }

  return { presets, addPreset, removePreset, updatePreset };
}
