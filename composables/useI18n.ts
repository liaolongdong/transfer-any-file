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
let seeded = false;
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
 * Tag the document with the language actually rendered: `<html lang>` and the tab title.
 *
 * `lang` drives screen-reader pronunciation and Chrome's translate prompt; the tab title is the one
 * piece of the workbench's identity that is visible while the page itself is not, and a hardcoded
 * English-only string there goes stale for every other language the app supports. Both halves come
 * from the resolved dictionary, so the brand reads in the same language as the page name next to it
 * and as what Chrome shows for that locale in its own UI. Both go stale on a runtime switch unless
 * they are set from here.
 */
export function applyDocumentLocale(locale: Locale): void {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.title = `${resolveKey(dict, 'appName')} · ${resolveKey(dict, 'options.title')}`;
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

/**
 * Put the resolved language into the shared state before the app mounts.
 *
 * `state.locale` starts at `DEFAULT_LOCALE` and `initLocale` only corrects it after a
 * `storage.local` round-trip, and nothing consumes `ready` to gate rendering — so without this
 * seed an English first run paints the whole workbench in Chinese for that window, which is the
 * exact failure `detectLocale` exists to prevent. `main.ts` already awaits the same resolution
 * for `<html lang>` and the tab title; seeding from that one value keeps the markup, the title
 * and the rendered strings in agreement instead of letting only two of the three be early.
 *
 * Seeding also marks the state as resolved, so `initLocale` skips the round trip that would
 * otherwise re-read the key it just read.
 */
export function seedLocale(locale: Locale): void {
  state.locale = locale;
  seeded = true;
}

async function initLocale(): Promise<void> {
  if (initialized) return;
  initialized = true;
  // Without a seed this is the boot path for the language; with one, `state.locale` already holds
  // what this key would return, so the read and the document update it drove are both redundant.
  if (!seeded) {
    state.locale = resolveLocale(await storageGet<unknown>(STORAGE_KEYS.locale, null));
    applyDocumentLocale(state.locale);
  }
  state.ready = true;
  unsubscribe = onStorageChange<Locale>(STORAGE_KEYS.locale, value => {
    if (value !== 'zh' && value !== 'en') return;
    state.locale = value;
    applyDocumentLocale(value);
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
    applyDocumentLocale(next);
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
