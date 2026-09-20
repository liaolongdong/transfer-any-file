import { createApp } from 'vue';
import '~/assets/styles/global.css';
import { STORAGE_KEYS, storageGet } from '~/utils/storage';
import { applyDocumentLocale, resolveLocale, seedLocale } from '~/composables/useI18n';
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

/**
 * Tag the document — and the shared locale state — with the language the first paint renders in.
 *
 * Same resolution order as `initLocale` — stored choice, then the browser language — so the two
 * cannot disagree, and running it pre-mount avoids a first frame announced in the wrong language
 * (both `<html lang>` and the tab title, which is what the browser chrome shows). The locale is
 * seeded into `useI18n` from the very same value, otherwise the markup says `en` while the body
 * still resolves every `t()` against the `zh` fallback until storage comes back.
 */
async function applyFirstPaintLanguage(): Promise<void> {
  const stored = await storageGet<unknown>(STORAGE_KEYS.locale, null);
  const locale = resolveLocale(stored);
  seedLocale(locale);
  applyDocumentLocale(locale);
}

await Promise.all([applyStoredTheme(), applyFirstPaintLanguage()]);
createApp(App).mount('#app');
