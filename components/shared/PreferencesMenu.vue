<script setup lang="ts">
import { Check } from '@element-plus/icons-vue';
import { useTheme } from '~/composables/useTheme';
import type { ThemeName } from '~/composables/useTheme';
import { useI18n, availableLocales } from '~/composables/useI18n';
import type { Locale } from '~/composables/useI18n';

const { theme, setTheme, themes } = useTheme();
const { t, locale, setLocale } = useI18n();

function handleTheme(name: ThemeName): void {
  void setTheme(name);
}

function handleLocale(next: Locale): void {
  void setLocale(next);
}
</script>

<template>
  <div class="preferences-menu">
    <div class="pref-section">
      <span class="pref-label">{{ t('prefs.theme') }}</span>
      <div class="theme-swatches">
        <button
          v-for="item in themes"
          :key="item.value"
          class="swatch"
          :class="{ active: theme === item.value }"
          :style="{ background: item.color }"
          :title="t('prefs.themeNames.' + item.value)"
          :aria-label="t('prefs.themeNames.' + item.value)"
          type="button"
          @click="handleTheme(item.value)"
        >
          <el-icon
            v-if="theme === item.value"
            :size="12"
            color="#fff"
          >
            <Check />
          </el-icon>
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
  gap: var(--fat-space-md);
  min-width: 200px;
}

.pref-section {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
}

.pref-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--fat-text-secondary);
}

.theme-swatches {
  display: flex;
  gap: var(--fat-space-sm);
  flex-wrap: wrap;
}

.swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--fat-transition-fast);
}

.swatch:hover {
  transform: scale(1.12);
}

.swatch.active {
  border-color: var(--fat-text-regular);
}

.swatch:focus-visible {
  outline: 2px solid var(--fat-primary);
  outline-offset: 2px;
}

.lang-options {
  display: flex;
  gap: var(--fat-space-xs);
}

.lang-btn {
  flex: 1;
  padding: var(--fat-space-xs) var(--fat-space-sm);
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
  color: var(--fat-primary);
  font-weight: 600;
}
</style>
