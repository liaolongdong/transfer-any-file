import { browser } from 'wxt/browser';

/** Keys used in browser.storage.local */
export const STORAGE_KEYS = {
  theme: 'fat:theme',
  colorMode: 'fat:colorMode',
  locale: 'fat:locale',
  history: 'fat:history',
  splitPosition: 'fat:splitPosition',
} as const;

/** Read a value from local storage with a fallback */
export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const result = await browser.storage.local.get(key);
    const value = result[key];
    return value === undefined ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

/** Write a value to local storage */
export async function storageSet<T>(key: string, value: T): Promise<void> {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch {
    // storage may be unavailable in some contexts; ignore
  }
}

/** Subscribe to changes on a single local storage key. Returns an unsubscribe fn. */
export function onStorageChange<T>(key: string, callback: (value: T) => void): () => void {
  // storage.onChanged is unavailable outside an extension context; no-op there.
  if (!browser?.storage?.onChanged) {
    return () => {}
  }
  const listener = (changes: Record<string, { newValue?: unknown }>, areaName: string): void => {
    if (areaName !== 'local') return
    if (key in changes) {
      callback(changes[key].newValue as T)
    }
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}
