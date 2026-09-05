import { createApp } from 'vue';
import '~/assets/styles/global.css';
import { STORAGE_KEYS, storageGet } from '~/utils/storage';
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  VALID_MODES,
  VALID_THEMES,
  applyMode,
  applyTheme,
  type ColorMode,
  type ThemeName,
} from '~/composables/useTheme';
import App from './App.vue';

/**
 * Apply the persisted theme before the app mounts so the first paint already carries
 * the right tokens instead of flashing the default theme.
 *
 * Storage is untrusted input and `storageGet` only casts without verifying, so both
 * values are re-validated here with the same whitelists `useTheme` uses. Divergent
 * fallbacks would be re-applied by `initTheme` after mount as a visible flash.
 */
async function applyStoredTheme(): Promise<void> {
  const [theme, mode] = await Promise.all([
    storageGet<ThemeName>(STORAGE_KEYS.theme, DEFAULT_THEME),
    storageGet<ColorMode>(STORAGE_KEYS.colorMode, DEFAULT_MODE),
  ]);

  applyTheme(VALID_THEMES.has(theme) ? theme : DEFAULT_THEME);
  applyMode(VALID_MODES.has(mode) ? mode : DEFAULT_MODE);
}

await applyStoredTheme();
createApp(App).mount('#app');
