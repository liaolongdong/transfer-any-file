import { createApp } from 'vue';
import '~/assets/styles/global.css';
import { STORAGE_KEYS, storageGetMany } from '~/utils/storage';
import { applyDocumentLocale, resolveLocale, seedLocale } from '~/composables/useI18n';
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  VALID_MODES,
  VALID_THEMES,
  applyMode,
  applyTheme,
  seedTheme,
  type ColorMode,
  type ThemeName,
} from '~/composables/useTheme';
import App from './App.vue';

/**
 * Paint in the theme, colour mode and language the user left behind.
 *
 * All three have to be applied before `mount()` — a token or `<html lang>` that corrects itself
 * afterwards is a visible flash for a theme, and a first frame announced in the wrong language for
 * the locale, which is what `seedLocale` exists to prevent. Storage is untrusted input and the
 * reads only cast, so both theme values are re-validated here with the same whitelists `useTheme`
 * uses — and because they are seeded into that module's state below, an unvalidated value would no
 * longer be corrected by a later read, it would just be the theme.
 *
 * One round trip, not three: this top-level await is the workbench's mount gate, and each
 * `storageGet` is its own `storage.local.get`. All three keys are seeded onward, so nothing reads
 * them a second time; the language resolution order — stored choice, then browser language — is
 * shared with `initLocale` through `resolveLocale`, so the two cannot disagree, and seeding from
 * this one value keeps the markup, the tab title and every rendered string in agreement instead of
 * letting only two of the three be early.
 */
const stored = await storageGetMany<{
  [STORAGE_KEYS.theme]: ThemeName;
  [STORAGE_KEYS.colorMode]: ColorMode;
  [STORAGE_KEYS.locale]: unknown;
}>({
  [STORAGE_KEYS.theme]: DEFAULT_THEME,
  [STORAGE_KEYS.colorMode]: DEFAULT_MODE,
  [STORAGE_KEYS.locale]: null,
});

const theme = VALID_THEMES.has(stored[STORAGE_KEYS.theme]) ? stored[STORAGE_KEYS.theme] : DEFAULT_THEME;
const mode = VALID_MODES.has(stored[STORAGE_KEYS.colorMode]) ? stored[STORAGE_KEYS.colorMode] : DEFAULT_MODE;
applyTheme(theme);
applyMode(mode);
// The same two values, handed to the module that owns the reactive state: without this seed
// `initTheme` reads both keys again — when the preferences popover first opens, on the way to
// reproducing what is already on `<html>`.
seedTheme(theme, mode);

const locale = resolveLocale(stored[STORAGE_KEYS.locale]);
seedLocale(locale);
applyDocumentLocale(locale);

createApp(App).mount('#app');
