import { ref, computed } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';

// F15 — pre-conversion confirmation toggle. Module-level singleton so the
// PreferencesMenu and the convert() gate see the same value.
const enabled = ref<boolean>(true);
let initialized = false;
let storageUnsub: (() => void) | null = null;

async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;
  enabled.value = await storageGet<boolean>(STORAGE_KEYS.confirmConvert, true);
  storageUnsub = onStorageChange<boolean>(STORAGE_KEYS.confirmConvert, value => {
    if (typeof value === 'boolean') enabled.value = value;
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    storageUnsub?.();
    storageUnsub = null;
    initialized = false;
  });
}

export function useConfirmConvert() {
  void init();
  const isEnabled = computed<boolean>(() => enabled.value);

  async function setEnabled(value: boolean): Promise<void> {
    enabled.value = value;
    await storageSet(STORAGE_KEYS.confirmConvert, value);
  }

  return { isEnabled, setEnabled };
}
