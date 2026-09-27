import { reactive, computed } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';

export type ThemeName = 'blue' | 'green' | 'purple' | 'orange' | 'rose' | 'slate';
export type ColorMode = 'light' | 'dark' | 'system';

export const AVAILABLE_THEMES: { value: ThemeName; color: string }[] = [
  { value: 'blue', color: '#2563eb' },
  { value: 'green', color: '#16a34a' },
  { value: 'purple', color: '#7c3aed' },
  { value: 'orange', color: '#ea580c' },
  { value: 'rose', color: '#e11d48' },
  { value: 'slate', color: '#475569' },
];

/**
 * Defaults and whitelists are exported so `entrypoints/options/main.ts` can validate
 * persisted values with the exact same rules before the app mounts. It seeds the result back
 * through `seedTheme`, so a divergent rule here would not be corrected by a later read — the
 * two paths have to agree by construction.
 */
export const DEFAULT_THEME: ThemeName = 'blue';
export const DEFAULT_MODE: ColorMode = 'system';
export const VALID_THEMES = new Set<ThemeName>(AVAILABLE_THEMES.map(t => t.value));
export const VALID_MODES = new Set<ColorMode>(['light', 'dark', 'system']);

const state = reactive<{ theme: ThemeName; mode: ColorMode }>({
  theme: DEFAULT_THEME,
  mode: DEFAULT_MODE,
});

let initialized = false;
let seeded = false;
const darkMq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let darkModeListener: ((event: MediaQueryListEvent) => void) | null = null;
const storageUnsubs: Array<() => void> = [];

function resolveMode(mode: ColorMode): 'light' | 'dark' {
  if (mode === 'system') {
    return darkMq?.matches ? 'dark' : 'light';
  }
  return mode;
}

/** Write the theme token set onto `<html>`; shared with the pre-mount bootstrap. */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

/** Resolve `system` against the OS preference and toggle `data-mode` on `<html>`. */
export function applyMode(mode: ColorMode): void {
  const resolved = resolveMode(mode);
  if (resolved === 'dark') {
    document.documentElement.dataset.mode = 'dark';
  } else {
    delete document.documentElement.dataset.mode;
  }
}

/**
 * Put the already-resolved theme and colour mode into the shared state.
 *
 * `main.ts` reads both keys pre-mount anyway — a theme that corrects itself after the first frame is a
 * visible flash — so this module already holds the answer twice over. Without the seed, `initTheme`
 * fetches the same pair again and `state.theme` sits at `DEFAULT_THEME` until that resolves: the
 * preferences popover is `persistent=false`, so the first open paints the picker on the wrong theme and
 * flips it a round trip later. Seeding marks the state as resolved so the read is skipped, and both paths
 * apply the same whitelists because the caller validates before it calls.
 */
export function seedTheme(theme: ThemeName, mode: ColorMode): void {
  state.theme = theme;
  state.mode = mode;
  seeded = true;
}

async function initTheme(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!seeded) {
    const [storedTheme, storedMode] = await Promise.all([
      storageGet<ThemeName>(STORAGE_KEYS.theme, DEFAULT_THEME),
      storageGet<ColorMode>(STORAGE_KEYS.colorMode, DEFAULT_MODE),
    ]);

    state.theme = VALID_THEMES.has(storedTheme) ? storedTheme : DEFAULT_THEME;
    state.mode = VALID_MODES.has(storedMode) ? storedMode : DEFAULT_MODE;

    applyTheme(state.theme);
    applyMode(state.mode);
  }

  darkModeListener = () => {
    if (state.mode === 'system') applyMode('system');
  };
  darkMq?.addEventListener('change', darkModeListener);

  storageUnsubs.push(
    onStorageChange<ThemeName>(STORAGE_KEYS.theme, value => {
      if (value && VALID_THEMES.has(value)) {
        state.theme = value;
        applyTheme(value);
      }
    }),
    onStorageChange<ColorMode>(STORAGE_KEYS.colorMode, value => {
      if (value && VALID_MODES.has(value)) {
        state.mode = value;
        applyMode(value);
      }
    }),
  );
}

// HMR: detach the media-query listener and storage subscriptions so hot
// replacement doesn't pile up duplicates.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (darkMq && darkModeListener) {
      darkMq.removeEventListener('change', darkModeListener);
      darkModeListener = null;
    }
    for (const off of storageUnsubs) off();
    storageUnsubs.length = 0;
    initialized = false;
    seeded = false;
  });
}

export function useTheme() {
  void initTheme();

  const theme = computed<ThemeName>(() => state.theme);
  const colorMode = computed<ColorMode>(() => state.mode);

  async function setTheme(next: ThemeName): Promise<void> {
    if (!VALID_THEMES.has(next)) return;
    state.theme = next;
    applyTheme(next);
    await storageSet(STORAGE_KEYS.theme, next);
  }

  async function setColorMode(next: ColorMode): Promise<void> {
    if (!VALID_MODES.has(next)) return;
    state.mode = next;
    applyMode(next);
    await storageSet(STORAGE_KEYS.colorMode, next);
  }

  return { theme, colorMode, setTheme, setColorMode, themes: AVAILABLE_THEMES };
}
