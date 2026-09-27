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
}>();

const { t } = useI18n();
</script>

<template>
  <p
    class="current-file"
    :title="name"
  >
    {{ t('convert.currentFile', { name }) }}
  </p>
</template>

<style scoped>
.current-file {
  margin: 0;
  max-width: 100%;
  font-size: 12px;
  color: var(--fat-text-secondary);
  font-family: var(--fat-font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
