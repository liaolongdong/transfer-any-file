<script setup lang="ts">
import { useI18n } from '~/composables/useI18n';

defineProps<{
  isConverting: boolean;
  error: string | null;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="conversion-progress">
    <div
      v-if="isConverting"
      class="loading-state"
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

.loading-state .is-loading {
  animation: fat-spin 1s linear infinite;
}
</style>
