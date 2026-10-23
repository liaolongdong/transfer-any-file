<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { useTheme } from '~/composables/useTheme';
import type { ThemeName, ColorMode } from '~/composables/useTheme';
import { useI18n, availableLocales } from '~/composables/useI18n';
import type { Locale } from '~/composables/useI18n';
import { useNotification } from '~/composables/useNotification';
import { useConfirmConvert } from '~/composables/useConfirmConvert';
import { useNameTemplate } from '~/composables/useNameTemplate';
import { useShortcuts } from '~/composables/useShortcuts';
import { eventToBinding, validateBinding } from '~/utils/core/shortcut';
import {
  DEFAULT_NAME_TEMPLATE,
  applyNameTemplate,
  sanitizeNameTemplate,
  unknownTokens,
} from '~/utils/core/name-template';
import type { ShortcutAction } from '~/utils/core/shortcut';

const { theme, colorMode, setTheme, setColorMode, themes } = useTheme();
const { t, locale, setLocale } = useI18n();
const {
  enabled: notifyEnabled,
  permission: notifyPermission,
  enable: enableNotify,
  disable: disableNotify,
} = useNotification();
const { isEnabled: confirmEnabled, setEnabled: setConfirmEnabled } = useConfirmConvert();
const shortcuts = useShortcuts();

/** F16 — shortcut recording state. Only one action can be recorded at a time;
 *  while recording, the next keydown is captured globally. */
const recording = ref<ShortcutAction | null>(null);

function startRecording(action: ShortcutAction): void {
  recording.value = action;
  // The listener lives only while recording: a permanently attached capture-phase handler
  // would keep swallowing keystrokes if the dialog ever closed mid-recording.
  // Capture phase so recording a shortcut never reaches App.vue's bubbling convert handler
  // (captureKey calls stopPropagation before it can fire).
  document.addEventListener('keydown', captureKey, true);
}

async function stopRecording(): Promise<void> {
  recording.value = null;
  document.removeEventListener('keydown', captureKey, true);
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

// The capture-phase listener is attached by startRecording and detached by stopRecording;
// this is the safety net for unmount-while-recording (the dialog destroys this component
// once closed, but a hot-reload or view swap can still cut it mid-capture).
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

/* F5 — output file names. `draft` is what is being typed; the singleton only sees a commit, so a
   half-written pattern can never name a file. */
const { template: savedNameTemplate, setTemplate: setNameTemplate } = useNameTemplate();
const nameTemplateDraft = ref(savedNameTemplate.value);

// Storage answers a few milliseconds after this component mounts. If the dialog was opened inside
// that window the draft would still show the default, and committing it would discard a pattern the
// user had saved — so a draft nobody has touched follows the stored value when it arrives.
watch(savedNameTemplate, value => {
  if (nameTemplateDraft.value === DEFAULT_NAME_TEMPLATE) nameTemplateDraft.value = value;
});

/** What a download would be called with the pattern being typed, extension included. */
const nameTemplateExample = computed<string>(
  () =>
    `${applyNameTemplate(sanitizeNameTemplate(nameTemplateDraft.value), {
      source: 'report.md',
      index: 1,
      target: 'pdf',
      date: new Date(),
    })}.pdf`,
);

/** Braced placeholders the pattern uses but this build does not know — kept literal, so say so. */
const nameTemplateUnknown = computed<string>(() =>
  // Joined here rather than in the mustache: a literal `}}` inside `{{ … }}` closes the
  // interpolation, and every token here is spelled with braces.
  unknownTokens(sanitizeNameTemplate(nameTemplateDraft.value))
    .map(token => `{${token}}`)
    .join(' '),
);

async function commitNameTemplate(): Promise<void> {
  await setNameTemplate(nameTemplateDraft.value);
  // Re-read what was stored: the sanitizer may have trimmed characters the field still shows.
  nameTemplateDraft.value = savedNameTemplate.value;
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
    <section class="pref-group">
      <h3 class="pref-group-title">{{ t('prefs.appearance') }}</h3>

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
              <span
                v-if="theme === item.value"
                class="swatch-check"
              >
                <el-icon
                  :size="12"
                  :color="item.color"
                >
                  <Check />
                </el-icon>
              </span>
            </span>
            <span class="swatch-label">{{ t('prefs.themeNames.' + item.value) }}</span>
          </button>
        </div>
      </div>

      <div class="pref-section">
        <span class="pref-label">{{ t('prefs.mode') }}</span>
        <div
          class="lang-options"
          role="group"
          :aria-label="t('prefs.mode')"
        >
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
        <div
          class="lang-options"
          role="group"
          :aria-label="t('prefs.language')"
        >
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
    </section>

    <section class="pref-group">
      <h3 class="pref-group-title">{{ t('prefs.general') }}</h3>

      <div class="pref-section">
        <div class="notify-row">
          <span class="pref-label notify-label">{{ t('prefs.notifyOnComplete') }}</span>
          <el-switch
            :model-value="notifyEnabled"
            :aria-label="t('prefs.notifyOnComplete')"
            :disabled="notifyPermission === 'denied'"
            @update:model-value="handleNotifyToggle"
          />
        </div>
        <span
          v-if="notifyStatusKey"
          class="notify-status"
          >{{ t(notifyStatusKey) }}</span
        >
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
    </section>

    <section class="pref-group">
      <h3 class="pref-group-title">{{ t('prefs.conversion') }}</h3>

      <div class="pref-section">
        <span class="pref-label">{{ t('prefs.nameTemplate') }}</span>
        <el-input
          v-model="nameTemplateDraft"
          class="name-input"
          size="small"
          :placeholder="DEFAULT_NAME_TEMPLATE"
          :aria-label="t('prefs.nameTemplate')"
          @change="commitNameTemplate"
        />
        <span class="name-hint">
          {{ t('prefs.nameTemplateHint') }}
          <code>{{ nameTemplateExample }}</code>
        </span>
        <span
          v-if="nameTemplateUnknown"
          class="name-warning"
        >
          {{ t('prefs.nameTemplateUnknown', { tokens: nameTemplateUnknown }) }}
        </span>
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
              >{{ t('prefs.shortcutRecording') }}</span
            >
            <button
              v-if="recording !== 'convert'"
              type="button"
              class="shortcut-reset"
              :aria-label="t('prefs.shortcutReset')"
              @click="resetShortcut('convert')"
            >
              {{ t('prefs.shortcutReset') }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* The dialog's own frame reserves 54px of header and 16px of body padding above and below this
   panel, and it is centred, so 220px keeps the whole surface inside a 500px-tall window. Past that
   cap the menu scrolls inside itself rather than pushing the dialog off-screen. The 4px padding
   (canceled by the negative margin, so it costs no space) gives edge controls' 2px outline plus
   2px offset somewhere to paint — without it the scroll box clips the ring on focus. */
.preferences-menu {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-lg);
  min-width: 200px;
  max-height: calc(100vh - 220px);
  padding: var(--fat-space-xs);
  margin: calc(var(--fat-space-xs) * -1);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pref-group {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-md);
}

.pref-group-title {
  margin: 0;
  padding-bottom: var(--fat-space-xs);
  border-bottom: 1px solid var(--fat-border-light);
  color: var(--fat-text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pref-section {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
}

.pref-label {
  color: var(--fat-text-primary);
  font-size: 13px;
  font-weight: 600;
}

/* Six swatches across, which is the whole theme list in one row: the previous 3×2 grid read as
   two unrelated groups. The label is what carries the name; the swatch only has to be big enough
   to see the colour and the selection badge. */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--fat-space-xs);
}

/* Six name labels no longer fit one row once the dialog is near phone width, and an ellipsis cuts
   exactly the character that tells 森林绿 from 经典蓝. Three columns keep each name whole. */
@media (width <= 420px) {
  .theme-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.theme-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--fat-space-xs) 2px;
  border: none;
  border-radius: var(--fat-radius-sm);
  background: none;
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.theme-item:hover {
  background: var(--fat-surface-hover);
}

.theme-item:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

.swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: var(--fat-transition-fast);
}

/* The one size change in this menu, and it is a token rather than a literal so the reduced-motion
   block can take the growth away without taking the hover background with it. */
.theme-item:hover .swatch {
  transform: scale(var(--fat-swatch-scale));
}

/* A single ring in the same colour the keyboard ring uses — no second, theme-coloured ring and no
   tinted plate behind the item, which is what made the old 3×2 grid look like a set of cards. The
   ring is declared transparent above so only its colour animates. */
.theme-item.active .swatch {
  outline-color: var(--fat-focus-ring);
}

.swatch-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;

  /* Deliberately not a token: the plate is a cut-out in the swatch's own colour, so it has to stay
     white in dark mode — `--fat-bg-card` would turn it into another disc. */
  background: #fff;
}

.swatch-label {
  overflow: hidden;
  max-width: 100%;
  color: var(--fat-text-secondary);
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-item.active .swatch-label {
  color: var(--fat-text-primary);
  font-weight: 600;
}

/* Segmented control. The selected segment is a raised card rather than a tinted one: the theme
   colour is not legible as small text on a light background in the green and orange themes
   (2.54:1 and 3.56:1), and `--fat-text-primary` keeps every theme above 4.5:1 in both modes. */
.lang-options {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
  background: var(--fat-surface-2);
}

.lang-btn {
  flex: 1;
  padding: 5px var(--fat-space-sm);
  border: 1px solid transparent;
  border-radius: calc(var(--fat-radius-sm) - 2px);
  background: transparent;
  color: var(--fat-text-regular);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.lang-btn:hover {
  color: var(--fat-text-primary);
}

.lang-btn:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 1px;
}

.lang-btn.active {
  border-color: var(--fat-border);
  background: var(--fat-bg-card);
  box-shadow: var(--fat-shadow-sm);
  color: var(--fat-text-primary);
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
  color: var(--fat-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.name-input {
  width: 100%;
}

.name-hint {
  color: var(--fat-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.name-hint code {
  color: var(--fat-text-primary);
  font-family: var(--fat-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  word-break: break-all;
}

/* The same red `FailureDiagnosticItem` uses for a line the user has to act on — an unknown
   placeholder is kept literal rather than dropped, so the pattern needs to say so out loud. */
.name-warning {
  color: var(--el-color-danger);
  font-size: 12px;
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
  min-width: 0;
  color: var(--fat-text-primary);
  font-size: 13px;
}

.shortcut-controls {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
}

/* Reads as a key cap: the inset grey is what separates it from the dialog's card surface, so the
   control does not look like another input row. */
.shortcut-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 88px;
  padding: 4px var(--fat-space-sm);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-sm);
  background: var(--fat-surface-2);
  color: var(--fat-text-primary);
  font-family: var(--fat-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.shortcut-key:hover {
  border-color: var(--fat-primary);
  color: var(--fat-primary);
}

.shortcut-key:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

.shortcut-key.recording {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  color: var(--fat-primary);
  font-style: italic;
  cursor: default;
  animation: shortcut-pulse 1.4s ease-in-out infinite;
}

.shortcut-key.recording:hover {
  border-color: var(--fat-primary);
  color: var(--fat-primary);
}

@keyframes shortcut-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.65;
  }
}

.shortcut-reset {
  padding: 4px var(--fat-space-sm);
  border: 1px solid transparent;
  border-radius: var(--fat-radius-sm);
  background: none;
  color: var(--fat-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: var(--fat-transition-fast);
}

.shortcut-reset:hover {
  border-color: var(--fat-border);
  color: var(--fat-primary);
}

.shortcut-reset:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}
</style>
