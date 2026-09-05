<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { useTheme } from '~/composables/useTheme';
import type { ThemeName, ColorMode } from '~/composables/useTheme';
import { useI18n, availableLocales } from '~/composables/useI18n';
import type { Locale } from '~/composables/useI18n';
import { useNotification } from '~/composables/useNotification';
import { useConfirmConvert } from '~/composables/useConfirmConvert';
import { useShortcuts } from '~/composables/useShortcuts';
import { eventToBinding, validateBinding } from '~/utils/core/shortcut';
import type { ShortcutAction } from '~/utils/core/shortcut';

const { theme, colorMode, setTheme, setColorMode, themes } = useTheme();
const { t, locale, setLocale } = useI18n();
const { enabled: notifyEnabled, permission: notifyPermission, enable: enableNotify, disable: disableNotify } = useNotification();
const { isEnabled: confirmEnabled, setEnabled: setConfirmEnabled } = useConfirmConvert();
const shortcuts = useShortcuts();

/** F16 — shortcut recording state. Only one action can be recorded at a time;
 *  while recording, the next keydown is captured globally. */
const recording = ref<ShortcutAction | null>(null);

function startRecording(action: ShortcutAction): void {
  recording.value = action;
}

async function stopRecording(): Promise<void> {
  recording.value = null;
}

async function captureKey(event: KeyboardEvent): Promise<void> {
  if (!recording.value) return;
  // Escape cancels — stop recording without saving.
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    await stopRecording();
    return;
  }
  // Don't fire while user is still holding a modifier before pressing the key.
  if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Shift' || event.key === 'Alt') {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const action = recording.value;
  await stopRecording();
  const binding = eventToBinding(event);
  if (!binding) {
    ElMessage.warning(t('prefs.shortcutInvalid'));
    return;
  }
  const reason = validateBinding(binding);
  if (reason === 'invalid') {
    ElMessage.warning(t('prefs.shortcutInvalid'));
    return;
  }
  if (reason === 'reserved') {
    ElMessage.warning(t('prefs.shortcutReserved'));
    return;
  }
  try {
    await shortcuts.setBinding(action, binding);
  } catch {
    ElMessage.error(t('prefs.shortcutError'));
  }
}

async function resetShortcut(action: ShortcutAction): Promise<void> {
  await shortcuts.resetAction(action);
  ElMessage.success(t('prefs.shortcutResetDone'));
}

// Capture-phase listener so recording a shortcut never reaches App.vue's bubbling
// convert handler (captureKey calls stopPropagation before it can fire).
document.addEventListener('keydown', captureKey, true);
onBeforeUnmount(() => {
  document.removeEventListener('keydown', captureKey, true);
});

const COLOR_MODES: { value: ColorMode; labelKey: string }[] = [
  { value: 'light', labelKey: 'prefs.modeLight' },
  { value: 'dark', labelKey: 'prefs.modeDark' },
  { value: 'system', labelKey: 'prefs.modeSystem' },
];

function handleTheme(name: ThemeName): void {
  void setTheme(name);
}

function handleMode(mode: ColorMode): void {
  void setColorMode(mode);
}

function handleLocale(next: Locale): void {
  void setLocale(next);
}

/** User toggled the switch. When turning on, request browser permission first;
 *  when turning off, just persist the preference (no permission change). */
async function handleNotifyToggle(value: string | number | boolean): Promise<void> {
  const next = value === true;
  if (next) {
    await enableNotify();
  } else {
    await disableNotify();
  }
}

/** F15 — toggle the pre-conversion confirmation preference. */
async function handleConfirmToggle(value: string | number | boolean): Promise<void> {
  await setConfirmEnabled(value === true);
}

/** Small status hint shown beneath the toggle. Empty string means "no hint", so the
 *  template can guard with `v-if` without a non-null assertion.
 *  `Notification` support never changes at runtime, so reading it inside a computed is
 *  safe — the reactive deps that trigger re-evaluation are the permission/enabled refs. */
const notifyStatusKey = computed<string>(() => {
  if (typeof window.Notification !== 'function') {
    return 'prefs.notifyUnsupported';
  }
  if (notifyPermission.value === 'denied') {
    return 'prefs.notifyDenied';
  }
  if (notifyEnabled.value) {
    return 'prefs.notifyGranted';
  }
  return '';
});
</script>

<template>
  <div class="preferences-menu">
    <div class="pref-section">
      <span class="pref-label">{{ t('prefs.theme') }}</span>
      <div class="theme-grid">
        <button
          v-for="item in themes"
          :key="item.value"
          class="theme-item"
          :class="{ active: theme === item.value }"
          type="button"
          :aria-pressed="theme === item.value"
          :aria-label="t('a11y.theme', { name: t('prefs.themeNames.' + item.value) })"
          @click="handleTheme(item.value)"
        >
          <span
            class="swatch"
            :style="{ background: item.color }"
          >
            <el-icon
              v-if="theme === item.value"
              :size="14"
              color="#fff"
            >
              <Check />
            </el-icon>
          </span>
          <span class="swatch-label">{{ t('prefs.themeNames.' + item.value) }}</span>
        </button>
      </div>
    </div>

    <div class="pref-section">
      <span class="pref-label">{{ t('prefs.mode') }}</span>
      <div class="lang-options">
        <button
          v-for="item in COLOR_MODES"
          :key="item.value"
          class="lang-btn"
          :class="{ active: colorMode === item.value }"
          type="button"
          :aria-pressed="colorMode === item.value"
          :aria-label="t('a11y.mode', { name: t(item.labelKey) })"
          @click="handleMode(item.value)"
        >
          {{ t(item.labelKey) }}
        </button>
      </div>
    </div>

    <div class="pref-section">
      <span class="pref-label">{{ t('prefs.language') }}</span>
      <div class="lang-options">
        <button
          v-for="item in availableLocales"
          :key="item.value"
          class="lang-btn"
          :class="{ active: locale === item.value }"
          type="button"
          :aria-pressed="locale === item.value"
          :aria-label="t('a11y.language', { name: item.label })"
          @click="handleLocale(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="pref-section">
      <div class="notify-row">
        <span class="pref-label notify-label">{{ t('prefs.notifyOnComplete') }}</span>
        <el-switch
          :model-value="notifyEnabled"
          :disabled="notifyPermission === 'denied'"
          @update:model-value="handleNotifyToggle"
        />
      </div>
      <span
        v-if="notifyStatusKey"
        class="notify-status"
      >{{ t(notifyStatusKey) }}</span>
    </div>

    <div class="pref-section">
      <div class="notify-row">
        <span class="pref-label notify-label">{{ t('prefs.confirmConvert') }}</span>
        <el-switch
          :model-value="confirmEnabled"
          :aria-label="t('prefs.confirmConvert')"
          @update:model-value="handleConfirmToggle"
        />
      </div>
    </div>

    <div class="pref-section">
      <span class="pref-label">{{ t('prefs.shortcutsTitle') }}</span>
      <div class="shortcut-row">
        <span class="shortcut-action-label">{{ t('prefs.shortcutAction.convert') }}</span>
        <div class="shortcut-controls">
          <button
            v-if="recording !== 'convert'"
            type="button"
            class="shortcut-key"
            :aria-label="t('prefs.shortcutChange') + ': ' + shortcuts.formatAction('convert')"
            @click="startRecording('convert')"
          >
            {{ shortcuts.formatAction('convert') }}
          </button>
          <span
            v-else
            class="shortcut-key recording"
            role="status"
            aria-live="polite"
          >{{ t('prefs.shortcutRecording') }}</span>
          <button
            v-if="recording !== 'convert'"
            type="button"
            class="shortcut-reset"
            :aria-label="t('prefs.shortcutReset')"
            @click="resetShortcut('convert')"
          >{{ t('prefs.shortcutReset') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preferences-menu {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-lg);
  min-width: 200px;
}

.pref-section {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
}

.pref-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--fat-text-primary);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--fat-space-sm);
}

.theme-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: var(--fat-space-xs);
  border-radius: var(--fat-radius-md);
  transition: var(--fat-transition-fast);
  border: 2px solid transparent;
  background: none;
}

.theme-item:hover {
  background: var(--fat-surface-hover);
}

.theme-item.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
}

.theme-item:focus-visible {
  outline: 2px solid var(--fat-primary);
  outline-offset: 2px;
}

.swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgb(0 0 0 / 8%);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--fat-transition-fast);
  flex-shrink: 0;
}

.theme-item:hover .swatch {
  transform: scale(1.08);
}

.theme-item.active .swatch {
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--fat-bg-card), 0 0 0 4px var(--fat-primary);
}

.swatch-label {
  font-size: 11px;
  color: var(--fat-text-secondary);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.theme-item.active .swatch-label {
  color: var(--fat-text-primary);
  font-weight: 600;
}

.lang-options {
  display: flex;
  gap: var(--fat-space-sm);
}

.lang-btn {
  flex: 1;
  padding: var(--fat-space-sm) var(--fat-space-md);
  font-size: 13px;
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
  background: var(--fat-bg-card);
  color: var(--fat-text-regular);
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.lang-btn:hover {
  border-color: var(--fat-primary);
  color: var(--fat-primary);
}

.lang-btn.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  color: var(--fat-text-primary);
  font-weight: 600;
}

:root[data-mode='dark'] .theme-item.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  box-shadow: 0 0 0 1px var(--fat-primary-border);
}

:root[data-mode='dark'] .lang-btn.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  color: var(--fat-primary);
  font-weight: 600;
}

.notify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-md);
}

.notify-label {
  flex: 1;
  min-width: 0;
}

.notify-status {
  font-size: 12px;
  color: var(--fat-text-secondary);
  line-height: 1.4;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-md);
}

.shortcut-action-label {
  flex: 1;
  font-size: 13px;
  color: var(--fat-text-primary);
  min-width: 0;
}

.shortcut-controls {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 88px;
  justify-content: center;
  padding: 4px var(--fat-space-sm);
  font-family: var(--fat-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  line-height: 1.4;
  color: var(--fat-text-primary);
  background: var(--fat-bg-card);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.shortcut-key:hover {
  border-color: var(--fat-primary);
  color: var(--fat-primary);
}

.shortcut-key:focus-visible {
  outline: 2px solid var(--fat-primary);
  outline-offset: 2px;
}

.shortcut-key.recording {
  cursor: default;
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  color: var(--fat-primary);
  font-style: italic;
  animation: shortcut-pulse 1.4s ease-in-out infinite;
}

.shortcut-key.recording:hover {
  border-color: var(--fat-primary);
  color: var(--fat-primary);
}

@keyframes shortcut-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

.shortcut-reset {
  padding: 4px var(--fat-space-sm);
  font-size: 12px;
  color: var(--fat-text-secondary);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--fat-radius-sm);
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.shortcut-reset:hover {
  color: var(--fat-primary);
  border-color: var(--fat-border);
}

.shortcut-reset:focus-visible {
  outline: 2px solid var(--fat-primary);
  outline-offset: 2px;
}
</style>
