import { ref } from 'vue';
import type { Ref } from 'vue';
import type { ImageOutputOptions } from '~/utils/core/types';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { sanitizeImageOutputOptions } from '~/utils/core/output-options';

/**
 * Module-level singleton, like `useHistory` / `useRecentTargets`: the workbench, the output
 * panel and the conversion orchestrator all read the same object, so a change made in one place
 * is visible everywhere without prop drilling.
 */
const options: Ref<ImageOutputOptions> = ref({});

let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function initOutputOptions(): Promise<void> {
  if (initialized) return;
  const stored = await storageGet<unknown>(STORAGE_KEYS.outputOptions, {});
  initialized = true;
  options.value = sanitizeImageOutputOptions(stored);
  unsubscribe = onStorageChange<unknown>(STORAGE_KEYS.outputOptions, value => {
    options.value = sanitizeImageOutputOptions(value);
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

export function useOutputOptions() {
  if (!initPromise) initPromise = initOutputOptions();

  /**
   * Set or clear one parameter.
   *
   * `undefined` deletes the key rather than storing a nullish placeholder, because absence is what
   * "leave the encoder alone" means downstream — a written `null` would survive sanitization as a
   * missing field anyway and only add a second spelling of the same state.
   */
  async function setOption<K extends keyof ImageOutputOptions>(key: K, value: ImageOutputOptions[K]): Promise<void> {
    await initPromise;
    const next: ImageOutputOptions = { ...options.value };
    if (value === undefined) delete next[key];
    else next[key] = value;
    options.value = next;
    await storageSet(STORAGE_KEYS.outputOptions, next);
  }

  /** Forget every parameter, returning conversions to the built-in encoder behaviour. */
  async function resetOptions(): Promise<void> {
    await initPromise;
    options.value = {};
    await storageSet(STORAGE_KEYS.outputOptions, {});
  }

  /**
   * Replace the whole set in one write, the way a preset applies it.
   *
   * `setOption` cannot express "clear everything" — that would be one write per field, leaving a
   * window where a half-applied preset is live. The incoming value is re-sanitized because presets
   * come out of the same untrusted storage this module guards at its own boundary.
   */
  async function setOptions(next: ImageOutputOptions): Promise<void> {
    await initPromise;
    const sanitized = sanitizeImageOutputOptions(next);
    options.value = sanitized;
    await storageSet(STORAGE_KEYS.outputOptions, sanitized);
  }

  return { options, setOption, setOptions, resetOptions };
}
