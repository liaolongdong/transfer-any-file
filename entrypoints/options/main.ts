import { createApp } from 'vue';
import { browser } from 'wxt/browser';
import '~/assets/styles/global.css';
import App from './App.vue';

const VALID_THEMES = new Set(['blue', 'green', 'purple', 'orange', 'rose', 'slate']);

// Apply the persisted theme before the app mounts to avoid flashing the default
async function applyStoredTheme(): Promise<void> {
  try {
    const stored = await browser.storage.local.get(['fat:theme', 'fat:colorMode']);
    const theme = stored['fat:theme'];
    document.documentElement.dataset.theme =
      typeof theme === 'string' && VALID_THEMES.has(theme as never) ? theme : 'blue';

    const mode = stored['fat:colorMode'];
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || ((mode === undefined || mode === 'system') && systemDark);
    if (dark) {
      document.documentElement.dataset.mode = 'dark';
    } else {
      delete document.documentElement.dataset.mode;
    }
  } catch {
    // storage unavailable; keep defaults
  }
}

await applyStoredTheme();
createApp(App).mount('#app');
