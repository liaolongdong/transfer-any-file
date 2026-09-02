<script setup lang="ts">
import { Check } from '@element-plus/icons-vue';
import { useTheme } from '~/composables/useTheme';
import type { ThemeName, ColorMode } from '~/composables/useTheme';
import { useI18n, availableLocales } from '~/composables/useI18n';
import type { Locale } from '~/composables/useI18n';

const { theme, colorMode, setTheme, setColorMode, themes } = useTheme();
const { t, locale, setLocale } = useI18n();

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
          @click="handleLocale(item.value)"
        >
          {{ item.label }}
        </button>
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

:global(:root[data-mode='dark']) .theme-item.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  box-shadow: 0 0 0 1px var(--fat-primary-border);
}

:global(:root[data-mode='dark']) .lang-btn.active {
  border-color: var(--fat-primary);
  background: var(--fat-primary-bg);
  color: var(--fat-primary);
  font-weight: 600;
}
</style>
