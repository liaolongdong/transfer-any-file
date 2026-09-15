import { reactive, computed, readonly } from 'vue';
import zh from '~/utils/i18n/zh';
import en from '~/utils/i18n/en';
import { STORAGE_KEYS, storageGet, storageSet, onStorageChange } from '~/utils/storage';

export type Locale = 'zh' | 'en';
export type Messages = typeof zh;

const messages: Record<Locale, Messages> = { zh, en };
const DEFAULT_LOCALE: Locale = 'zh';

// Shared reactive state across all component instances
const state = reactive<{ locale: Locale; ready: boolean }>({
  locale: DEFAULT_LOCALE,
  ready: false,
});

let initialized = false;
let unsubscribe: (() => void) | null = null;

function resolveKey(dict: Messages, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : path;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in params ? String(params[key]) : `{${key}}`));
}

/**
 * Keep `<html lang>` in step with the language actually rendered — it drives screen-reader
 * pronunciation and Chrome's translate prompt, and goes stale on a runtime switch otherwise.
 */
export function applyDocumentLang(locale: Locale): void {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
}

/**
 * Language a first run starts on.
 *
 * The browser's own UI language is the only signal available to an offline extension, and opening
 * a non-Chinese user on Chinese text makes the workbench look broken until they find the switch.
 */
export function detectLocale(): Locale {
  const preferred = (navigator.languages ?? [navigator.language])[0] ?? '';
  return preferred.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** An explicit stored choice wins; anything else — including a corrupt value — is detected. */
export function resolveLocale(stored: unknown): Locale {
  return stored === 'zh' || stored === 'en' ? stored : detectLocale();
}

async function initLocale(): Promise<void> {
  if (initialized) return;
  initialized = true;
  state.locale = resolveLocale(await storageGet<unknown>(STORAGE_KEYS.locale, null));
  applyDocumentLang(state.locale);
  state.ready = true;
  unsubscribe = onStorageChange<Locale>(STORAGE_KEYS.locale, value => {
    if (value !== 'zh' && value !== 'en') return;
    state.locale = value;
    applyDocumentLang(value);
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribe?.();
    unsubscribe = null;
    initialized = false;
  });
}

export function useI18n() {
  void initLocale();

  const locale = computed<Locale>(() => state.locale);

  function t(key: string, params?: Record<string, string | number>): string {
    const dict = messages[state.locale] ?? messages[DEFAULT_LOCALE];
    return interpolate(resolveKey(dict, key), params);
  }

  async function setLocale(next: Locale): Promise<void> {
    state.locale = next;
    applyDocumentLang(next);
    await storageSet(STORAGE_KEYS.locale, next);
  }

  return {
    locale,
    ready: readonly(computed(() => state.ready)),
    t,
    setLocale,
  };
}

/** Standalone helper for non-setup contexts */
export const availableLocales: { value: Locale; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];
