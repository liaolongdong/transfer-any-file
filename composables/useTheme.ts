import { reactive, computed } from 'vue';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';

export type ThemeName = 'blue' | 'green' | 'purple' | 'orange' | 'rose' | 'slate';

export const AVAILABLE_THEMES: { value: ThemeName; color: string }[] = [
  { value: 'blue', color: '#2563eb' },
  { value: 'green', color: '#16a34a' },
  { value: 'purple', color: '#7c3aed' },
  { value: 'orange', color: '#ea580c' },
  { value: 'rose', color: '#e11d48' },
  { value: 'slate', color: '#475569' },
];

const DEFAULT_THEME: ThemeName = 'blue';
const VALID = new Set<ThemeName>(AVAILABLE_THEMES.map(t => t.value));

const state = reactive<{ theme: ThemeName }>({ theme: DEFAULT_THEME });

let initialized = false;

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

async function initTheme(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const stored = await storageGet<ThemeName>(STORAGE_KEYS.theme, DEFAULT_THEME);
  state.theme = VALID.has(stored) ? stored : DEFAULT_THEME;
  applyTheme(state.theme);
  onStorageChange<ThemeName>(STORAGE_KEYS.theme, value => {
    if (value && VALID.has(value)) {
      state.theme = value;
      applyTheme(value);
    }
  });
}

export function useTheme() {
  void initTheme();

  const theme = computed<ThemeName>(() => state.theme);

  async function setTheme(next: ThemeName): Promise<void> {
    if (!VALID.has(next)) return;
    state.theme = next;
    applyTheme(next);
    await storageSet(STORAGE_KEYS.theme, next);
  }

  return { theme, setTheme, themes: AVAILABLE_THEMES };
}
