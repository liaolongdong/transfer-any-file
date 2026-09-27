<script setup lang="ts">
import { useI18n } from '~/composables/useI18n';
import CurrentFileHint from '~/components/shared/CurrentFileHint.vue';
import StepProgressHint from '~/components/shared/StepProgressHint.vue';

defineProps<{
  isConverting: boolean;
  error: string | null;
  /** Name of the file currently being processed (batch progress hint). */
  currentFileName?: string | null;
  /** 1-indexed position inside the current file's conversion chain; 0 when unknown. */
  currentStep?: number;
  /** Steps in the resolved chain; ≤ 1 hides the line, so single-step routes look unchanged. */
  stepTotal?: number;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="conversion-progress">
    <div
      v-if="isConverting"
      class="loading-state"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <el-icon
        class="is-loading"
        :size="24"
        color="var(--fat-primary)"
      >
        <svg
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M512 64a448 448 0 1 0 448 448h-64a384 384 0 1 1-384-384V64z"
            fill="currentColor"
          />
        </svg>
      </el-icon>
      <p>{{ t('convert.inProgress') }}</p>
      <CurrentFileHint
        v-if="currentFileName"
        :name="currentFileName"
      />
      <StepProgressHint
        v-if="(stepTotal ?? 0) > 1"
        :current="currentStep ?? 0"
        :total="stepTotal ?? 0"
      />
    </div>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
  </div>
</template>

<style scoped>
.conversion-progress {
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-md) 0;
  color: var(--fat-text-secondary);
  font-size: 13px;
}

/* The one loop in the workbench, and the one place where collapsing the duration ladder is not
   enough on its own: `infinite` survives a 0.01ms duration as a near-stroboscopic spin, so the
   blanket's `animation-iteration-count: 1` is what actually stops it. Routing the period through
   `--fat-duration-spin` instead of a literal is what makes the two spinners agree — Element Plus
   hardcodes 2s for `.el-icon.is-loading` (ruled at the bottom of global.css), so a loading icon
   inside a dialog used to turn at half the speed of the one on this card, two thirds of a second
   apart on every revolution. */
.loading-state .is-loading {
  animation: fat-spin var(--fat-duration-spin) linear infinite;
}
</style>
