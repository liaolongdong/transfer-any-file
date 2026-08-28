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

const DEFAULT_THEME: ThemeName = 'blue';
const DEFAULT_MODE: ColorMode = 'system';
const VALID_THEMES = new Set<ThemeName>(AVAILABLE_THEMES.map(t => t.value));
const VALID_MODES = new Set<ColorMode>(['light', 'dark', 'system']);

const state = reactive<{ theme: ThemeName; mode: ColorMode }>({
  theme: DEFAULT_THEME,
  mode: DEFAULT_MODE,
});

let initialized = false;
const darkMq = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function resolveMode(mode: ColorMode): 'light' | 'dark' {
  if (mode === 'system') {
    return darkMq?.matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

function applyMode(mode: ColorMode): void {
  const resolved = resolveMode(mode);
  if (resolved === 'dark') {
    document.documentElement.dataset.mode = 'dark';
  } else {
    delete document.documentElement.dataset.mode;
  }
}

async function initTheme(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const [storedTheme, storedMode] = await Promise.all([
    storageGet<ThemeName>(STORAGE_KEYS.theme, DEFAULT_THEME),
    storageGet<ColorMode>(STORAGE_KEYS.colorMode, DEFAULT_MODE),
  ]);

  state.theme = VALID_THEMES.has(storedTheme) ? storedTheme : DEFAULT_THEME;
  state.mode = VALID_MODES.has(storedMode) ? storedMode : DEFAULT_MODE;

  applyTheme(state.theme);
  applyMode(state.mode);

  darkMq?.addEventListener('change', () => {
    if (state.mode === 'system') applyMode('system');
  });

  onStorageChange<ThemeName>(STORAGE_KEYS.theme, value => {
    if (value && VALID_THEMES.has(value)) {
      state.theme = value;
      applyTheme(value);
    }
  });

  onStorageChange<ColorMode>(STORAGE_KEYS.colorMode, value => {
    if (value && VALID_MODES.has(value)) {
      state.mode = value;
      applyMode(value);
    }
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
