import { reactive } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';
import {
  DEFAULT_SHORTCUTS,
  canonicalize,
  formatBinding,
  matchEvent,
  normalizeMap,
} from '~/utils/core/shortcut';
import type { ShortcutAction, ShortcutMap } from '~/utils/core/shortcut';

/**
 * F16 — user-customisable keyboard shortcuts.
 *
 * Reactive, persisted wrapper only: parsing, validation, canonicalisation and
 * event matching are pure logic and live in `utils/core/shortcut.ts`. Module-level
 * state makes this a cross-component singleton (PreferencesMenu edits it, App.vue
 * reads it), with `onStorageChange` keeping tabs in sync and HMR dispose cleaning up.
 */

const state = reactive<{ shortcuts: ShortcutMap }>({
  shortcuts: { ...DEFAULT_SHORTCUTS },
});

let initialized = false;
let storageUnsub: (() => void) | null = null;

async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const stored = await storageGet<Partial<ShortcutMap>>(STORAGE_KEYS.shortcuts, {});
  state.shortcuts = { ...DEFAULT_SHORTCUTS, ...normalizeMap(stored) };
  storageUnsub = onStorageChange<Partial<ShortcutMap>>(STORAGE_KEYS.shortcuts, value => {
    state.shortcuts = { ...DEFAULT_SHORTCUTS, ...normalizeMap(value) };
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    storageUnsub?.();
    storageUnsub = null;
    initialized = false;
  });
}

export function useShortcuts() {
  void init();

  function getBinding(action: ShortcutAction): string {
    return state.shortcuts[action] || DEFAULT_SHORTCUTS[action];
  }

  function formatAction(action: ShortcutAction): string {
    return formatBinding(getBinding(action));
  }

  async function setBinding(action: ShortcutAction, binding: string): Promise<void> {
    const canonical = canonicalize(binding);
    if (!canonical) throw new Error('invalid');
    state.shortcuts = { ...state.shortcuts, [action]: canonical };
    await storageSet(STORAGE_KEYS.shortcuts, { ...state.shortcuts });
  }

  async function resetAction(action: ShortcutAction): Promise<void> {
    const next: ShortcutMap = { ...state.shortcuts, [action]: DEFAULT_SHORTCUTS[action] };
    state.shortcuts = next;
    await storageSet(STORAGE_KEYS.shortcuts, next);
  }

  function matches(action: ShortcutAction, event: KeyboardEvent): boolean {
    return matchEvent(getBinding(action), event);
  }

  return {
    getBinding,
    formatAction,
    setBinding,
    resetAction,
    matches,
  };
}
