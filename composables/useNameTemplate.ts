import { ref } from 'vue';
import type { Ref } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import { DEFAULT_NAME_TEMPLATE, sanitizeNameTemplate } from '~/utils/core/name-template';

/**
 * Module-level singleton, like `useOutputOptions` / `useConfirmConvert`: the preferences panel
 * writes the pattern and the conversion orchestrator reads it, with no prop drilling between them.
 */
const template: Ref<string> = ref(DEFAULT_NAME_TEMPLATE);

let initialized = false;
let initPromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function initNameTemplate(): Promise<void> {
  if (initialized) return;
  // The stored value is user-authored and can be hand-edited, so it enters through the same
  // sanitizer the panel uses; anything unusable resolves to the built-in pattern.
  const stored = await storageGet<unknown>(STORAGE_KEYS.nameTemplate, DEFAULT_NAME_TEMPLATE);
  initialized = true;
  template.value = sanitizeNameTemplate(stored);
  unsubscribe = onStorageChange<unknown>(STORAGE_KEYS.nameTemplate, value => {
    template.value = sanitizeNameTemplate(value);
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

export function useNameTemplate() {
  if (!initPromise) initPromise = initNameTemplate();

  async function setTemplate(value: string): Promise<void> {
    await initPromise;
    const next = sanitizeNameTemplate(value);
    template.value = next;
    await storageSet(STORAGE_KEYS.nameTemplate, next);
  }

  /**
   * The pattern to name this batch with, once storage has answered.
   *
   * `convert()` snapshots it at the start of a batch — reading the ref directly would let a batch
   * that begins within the storage round trip of a cold load name itself with the default, silently
   * ignoring a pattern the user has been using for months.
   */
  async function currentTemplate(): Promise<string> {
    await initPromise;
    return template.value;
  }

  return { template, setTemplate, currentTemplate };
}
