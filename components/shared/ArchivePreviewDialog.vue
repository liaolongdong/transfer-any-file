<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Download, View, Loading } from '@element-plus/icons-vue';
import { saveAs } from 'file-saver';
import { formatSize } from '~/utils/core/format';
import { formatFromFilename } from '~/utils/core/file-detect';
import { getFormatLabel } from '~/utils/core/format-labels';
import { listZipEntries, inflateZipEntry, type ZipEntryInfo } from '~/utils/core/zip-entries';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{
  visible: boolean;
  /** The archive blob, exactly as the batch produced it. */
  blob: Blob | null;
  /** Archive file name, shown in the header. */
  filename: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  /** One entry decoded, handed up so the single-file preview can render it with its own sanitizer. */
  'preview-entry': [{ blob: Blob; filename: string }];
}>();

const { t } = useI18n();

/**
 * The last component of an archive path.
 *
 * The name inside a ZIP is untrusted — it can carry separators a Windows download folder would
 * treat as a path, or `..` segments — so it is reduced to a basename before it is shown or handed to
 * `saveAs`. The directory prefix is kept separately for display, where a plain text node is safe.
 */
function basename(name: string): string {
  const trimmed = name.replace(/\/+$/, '');
  const slash = trimmed.lastIndexOf('/');
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

function dirname(name: string): string {
  const trimmed = name.replace(/\/+$/, '');
  const slash = trimmed.lastIndexOf('/');
  return slash <= 0 ? '' : trimmed.slice(0, slash);
}

interface ArchiveRow {
  name: string;
  base: string;
  dir: string;
  size: number;
  label: string | null;
}

const loading = ref(false);
const failed = ref(false);
const rows = ref<ArchiveRow[]>([]);
const total = ref(0);
const truncated = ref(false);

/** The archive bytes, read once per open so the central directory and every later extraction share it. */
let bytes: Uint8Array | null = null;
// Guards an open that resolves after a newer open (or a close): only the newest token may write state.
let token = 0;

watch(
  [() => props.visible, () => props.blob],
  async ([vis, blob], _prev, onCleanup) => {
    if (!vis || !blob) return;
    const my = ++token;
    onCleanup(() => {
      // Invalidate this run so a late resolve cannot paint over a newer archive or a closed dialog.
      token++;
    });
    loading.value = true;
    failed.value = false;
    rows.value = [];
    total.value = 0;
    truncated.value = false;
    bytes = null;
    try {
      const data = new Uint8Array(await blob.arrayBuffer());
      if (my !== token) return;
      const listing = await listZipEntries(data);
      if (my !== token) return;
      bytes = data;
      rows.value = listing.entries.map(toRow);
      total.value = listing.total;
      truncated.value = listing.truncated;
    } catch {
      if (my === token) failed.value = true;
    } finally {
      if (my === token) loading.value = false;
    }
  },
  { immediate: true },
);

function toRow(entry: ZipEntryInfo): ArchiveRow {
  const base = basename(entry.name);
  const format = formatFromFilename(base);
  return {
    name: entry.name,
    base,
    dir: dirname(entry.name),
    size: entry.originalSize,
    label: format ? getFormatLabel(format) : null,
  };
}

/** True once the current rows are previewable — the entry's own bytes decide, not the archive's. */
function previewable(row: ArchiveRow): boolean {
  return formatFromFilename(row.base) !== null;
}

/** The row's total when the archive itself knows its size, else the sum of what was listed. */
const shownCount = computed(() => rows.value.length);

async function openRow(row: ArchiveRow): Promise<void> {
  if (!bytes || !previewable(row)) return;
  try {
    const data = await inflateZipEntry(bytes, row.name);
    // A download name from an untrusted archive is reduced to a basename for the same reason as
    // `saveRow` — never a path.
    emit('preview-entry', { blob: new Blob([data as BlobPart]), filename: row.base });
  } catch {
    // A single entry the archive cannot decode must not take the whole listing down with it: the
    // rest of the rows are still valid, so this is a toast, not the read-failed terminal state.
    ElMessage.error(t('archive.readFailed'));
  }
}

function saveRow(row: ArchiveRow): void {
  if (!bytes) return;
  void inflateZipEntry(bytes, row.name)
    .then(data => saveAs(new Blob([data as BlobPart]), row.base))
    .catch(() => {
      ElMessage.error(t('archive.readFailed'));
    });
}

function close(): void {
  emit('update:visible', false);
  // Drop the decoded copy held for on-demand extraction. `arrayBuffer()` already cloned the archive's
  // bytes once; keeping that clone alive after the dialog closes would double what the batch holds for
  // an archive the user is no longer looking at. The next open re-reads.
  bytes = null;
  rows.value = [];
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    width="min(760px, 92vw)"
    align-center
    destroy-on-close
    class="archive-dialog"
    @update:model-value="emit('update:visible', $event)"
    @close="close"
  >
    <template #header="{ titleId }">
      <div class="archive-header">
        <span
          :id="titleId"
          class="archive-title"
          :title="filename"
          >{{ filename }}</span
        >
        <span
          v-if="!loading && !failed && shownCount"
          class="archive-count"
          >{{ t('archive.entryCount', { count: total }) }}</span
        >
      </div>
    </template>

    <div class="archive-body">
      <div
        v-if="loading"
        class="archive-state"
        role="status"
      >
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>{{ t('preview.reading') }}</span>
      </div>
      <p
        v-else-if="failed"
        class="archive-state is-error"
        role="alert"
      >
        {{ t('archive.readFailed') }}
      </p>
      <p
        v-else-if="shownCount === 0"
        class="archive-state"
      >
        {{ t('archive.empty') }}
      </p>
      <template v-else>
        <ul class="archive-list">
          <li
            v-for="row in rows"
            :key="row.name"
            class="archive-entry"
          >
            <span
              class="archive-entry-name"
              :title="row.name"
            >
              <span class="archive-entry-base">{{ row.base }}</span>
              <span
                v-if="row.dir"
                class="archive-entry-dir"
                >{{ row.dir }}</span
              >
            </span>
            <span
              v-if="row.label"
              class="archive-entry-format"
              >{{ row.label }}</span
            >
            <span class="archive-entry-size">{{ formatSize(row.size) }}</span>
            <el-button
              v-if="row.label"
              :icon="View"
              size="small"
              text
              type="primary"
              :title="t('result.preview')"
              :aria-label="t('a11y.preview')"
              @click="openRow(row)"
            />
            <el-button
              :icon="Download"
              size="small"
              text
              type="primary"
              :title="t('archive.extract')"
              :aria-label="t('a11y.download')"
              @click="saveRow(row)"
            />
          </li>
        </ul>
        <p
          v-if="truncated"
          class="archive-truncated"
        >
          {{ t('archive.truncated', { shown: shownCount, total }) }}
        </p>
      </template>
    </div>
  </ElDialog>
</template>

<style scoped>
.archive-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  gap: var(--fat-space-md);
  min-width: 0;
}

.archive-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 600;
  color: var(--fat-text-primary);
}

.archive-count {
  flex: none;
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.archive-body {
  max-height: 60vh;
  overflow: auto;
}

.archive-state {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  margin: 0;
  padding: var(--fat-space-lg) 0;
  justify-content: center;
  color: var(--fat-text-secondary);
  font-size: 14px;
}

.archive-state.is-error {
  color: var(--el-color-danger);
}

.archive-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The entry is a grid, not flex, so the name column takes the leftover width and its ellipsis can
   fire; a flex name without `min-width: 0` would push the badges off the right edge — the same
   failure the result rows guard against. */
.archive-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-xs) var(--fat-space-sm);
  border-radius: var(--fat-radius-sm);
}

.archive-entry:hover {
  background: var(--fat-bg-hover);
}

.archive-entry-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.archive-entry-base {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--fat-text-primary);
}

.archive-entry-dir {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--fat-text-hint);
}

.archive-entry-format {
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.archive-entry-size {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.archive-truncated {
  margin: var(--fat-space-sm) 0 0;
  padding-top: var(--fat-space-sm);
  border-top: 1px solid var(--fat-border-light);
  font-size: 12px;
  color: var(--fat-text-secondary);
}
</style>
