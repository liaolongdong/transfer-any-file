<script setup lang="ts">
import { computed } from 'vue';
import { Delete, Right } from '@element-plus/icons-vue';
import { useHistory } from '~/composables/useHistory';
import type { HistoryRecord } from '~/composables/useHistory';
import { useI18n } from '~/composables/useI18n';
import { getFormatLabel } from '~/utils/core/format-labels';
import type { FileFormat } from '~/utils/core/types';

const emit = defineEmits<{
  (e: 'reuse', payload: { sourceFormat: FileFormat; targetFormat: FileFormat }): void;
}>();

const { records, removeRecord, clear } = useHistory();
const { t } = useI18n();

const hasRecords = computed(() => records.value.length > 0);

/** Fixed YYYY-MM-DD HH:mm:ss (24h) — locale-independent so both zh/en UIs stay aligned */
function formatTime(time: number): string {
  const d = new Date(time);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Machine-readable ISO timestamp backing the semantic `<time>` element */
function isoTime(time: number): string {
  return new Date(time).toISOString();
}

function handleReuse(record: HistoryRecord): void {
  emit('reuse', {
    sourceFormat: record.sourceFormat,
    targetFormat: record.targetFormat,
  });
}

function handleRemove(id: string): void {
  void removeRecord(id);
}

async function handleClear(): Promise<void> {
  try {
    await ElMessageBox.confirm(t('history.clearConfirm'), t('history.clear'), {
      confirmButtonText: t('history.clear'),
      cancelButtonText: t('common.close'),
      type: 'warning',
    });
    await clear();
  } catch {
    // user cancelled
  }
}
</script>

<template>
  <div class="history-panel">
    <!-- Title lives in the surrounding collapsible card header -->
    <div
      v-if="hasRecords"
      class="history-head"
    >
      <el-button
        text
        size="small"
        type="info"
        @click="handleClear"
      >
        {{ t('history.clear') }}
      </el-button>
    </div>

    <div
      v-if="!hasRecords"
      class="history-empty"
    >
      {{ t('history.empty') }}
    </div>

    <ul
      v-else
      class="history-list"
    >
      <li
        v-for="record in records"
        :key="record.id"
        class="history-item"
      >
        <div class="history-main">
          <div class="history-formats">
            <span class="fmt-badge">{{ getFormatLabel(record.sourceFormat) }}</span>
            <el-icon
              :size="12"
              color="var(--fat-text-placeholder)"
            >
              <Right />
            </el-icon>
            <span class="fmt-badge target">{{ getFormatLabel(record.targetFormat) }}</span>
          </div>
          <div class="history-meta">
            <span
              class="history-name"
              :title="record.fileName"
            >
              {{ record.fileName }}
            </span>
            <span
              v-if="record.fileCount > 1"
              class="history-count"
            >
              {{ t('history.filesCount', { count: record.fileCount }) }}
            </span>
            <time
              class="history-time"
              :datetime="isoTime(record.time)"
            >
              {{ formatTime(record.time) }}
            </time>
          </div>
        </div>
        <div class="history-actions">
          <el-button
            text
            size="small"
            type="primary"
            @click="handleReuse(record)"
          >
            {{ t('history.reuse') }}
          </el-button>
          <el-button
            :icon="Delete"
            text
            size="small"
            type="danger"
            :title="t('history.delete')"
            @click="handleRemove(record.id)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.history-empty {
  padding: var(--fat-space-xl) 0;
  text-align: center;
  color: var(--fat-text-placeholder);
  font-size: 13px;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-sm);
  border: 1px solid var(--fat-border);
  border-radius: var(--fat-radius-md);
  background: var(--fat-bg-card);
  transition: var(--fat-transition-fast);
}

.history-item:hover {
  border-color: var(--fat-primary-border);
  background: var(--fat-bg-hover);
}

.history-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-xs);
}

.history-formats {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
}

.fmt-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--fat-text-regular);
}

.fmt-badge.target {
  color: var(--fat-primary);
}

.history-meta {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  font-size: 12px;
  color: var(--fat-text-secondary);
  min-width: 0;
}

/* Dot separator between meta items — robust to the conditional file-count */
.history-meta > *:not(:first-child)::before {
  content: '·';
  margin-right: var(--fat-space-xs);
  color: var(--fat-text-placeholder);
}

.history-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-count {
  flex-shrink: 0;
}

.history-time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.history-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
