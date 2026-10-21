<script setup lang="ts">
import { useI18n } from '~/composables/useI18n';

/**
 * The "which file is it on" line, shared by both progress hosts.
 *
 * Announcement differs by host on purpose: the single-file card sits inside a `role="status"` region so
 * the name is read, while the batch card keeps it out of any live region — that line changes once per
 * file, up to the 200-file ceiling, and reading them all out is noise rather than information.
 */
defineProps<{
  /** Basename of the file the batch is on right now. */
  name: string;
  /**
   * Secondary counter for a mode whose unit is not a file, e.g. "image 2 of 5" while a merged PDF
   * is being assembled. Kept out of the name so the truncating half stays the one that can be long.
   */
  detail?: string | null;
}>();

const { t } = useI18n();
</script>

<template>
  <p
    class="current-file"
    :title="name"
  >
    <span class="current-file-name">{{ t('convert.currentFile', { name }) }}</span>
    <span
      v-if="detail"
      class="current-file-detail"
      >{{ detail }}</span
    >
  </p>
</template>

<style scoped>
.current-file {
  display: flex;
  align-items: baseline;
  gap: var(--fat-space-xs);
  margin: 0;
  max-width: 100%;
  font-size: 12px;
  color: var(--fat-text-secondary);
  font-family: var(--fat-font-mono);
}

.current-file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-file-detail {
  flex: none;
  opacity: 0.8;
}
</style>
