<script setup lang="ts">
import { ref, computed } from 'vue';
import { Delete, Download, Right, Search, Upload } from '@element-plus/icons-vue';
import { saveAs } from 'file-saver';
import { useHistory } from '~/composables/useHistory';
import type { HistoryRecord } from '~/composables/useHistory';
import { useI18n } from '~/composables/useI18n';
import { getFormatLabel } from '~/utils/core/format-labels';
import type { FileFormat } from '~/utils/core/types';
import HistoryTrendChart from '~/components/shared/HistoryTrendChart.vue';

const emit = defineEmits<{
  (e: 'reuse', payload: { sourceFormat: FileFormat; targetFormat: FileFormat }): void;
}>();

const { records, removeRecord, clear, exportData, importData } = useHistory();
const { t } = useI18n();

const importInput = ref<HTMLInputElement | null>(null);

type FilterMode = 'all' | 'source' | 'target';
const search = ref('');
const filterMode = ref<FilterMode>('all');
const filterFormat = ref<FileFormat | ''>('');

const hasRecords = computed(() => records.value.length > 0);

/** Distinct formats present in the current history, used to populate the format filter dropdown. */
const availableFormats = computed<FileFormat[]>(() => {
  const set = new Set<FileFormat>();
  for (const r of records.value) {
    set.add(r.sourceFormat);
    set.add(r.targetFormat);
  }
  return [...set];
});

const filteredRecords = computed<HistoryRecord[]>(() => {
  const query = search.value.trim().toLowerCase();
  const mode = filterMode.value;
  const fmt = filterFormat.value;
  return records.value.filter(r => {
    if (query && !r.fileName.toLowerCase().includes(query)) return false;
    if (fmt) {
      if (mode === 'source' && r.sourceFormat !== fmt) return false;
      if (mode === 'target' && r.targetFormat !== fmt) return false;
    }
    return true;
  });
});

function resetFilter(): void {
  search.value = '';
  filterFormat.value = '';
  filterMode.value = 'all';
}

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

function handleExport(): void {
  if (records.value.length === 0) {
    ElMessage.warning(t('history.exportEmpty'));
    return;
  }
  const data = exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  saveAs(blob, `file-any-transfer-history-${stamp}.json`);
  ElMessage.success(t('history.exportSuccess', { count: data.records.length }));
}

function triggerImport(): void {
  importInput.value?.click();
}

async function handleImportChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  // Always reset so the same file can be re-selected after a failed import
  input.value = '';
  if (!file) return;
  let payload: unknown;
  try {
    const text = await file.text();
    payload = JSON.parse(text);
  } catch {
    ElMessage.error(t('history.importInvalid'));
    return;
  }
  try {
    await ElMessageBox.confirm(t('history.importConfirm'), t('history.import'), {
      confirmButtonText: t('history.import'),
      cancelButtonText: t('common.close'),
      type: 'info',
    });
  } catch {
    return;
  }
  try {
    const result = await importData(payload);
    if (result.merged === 0) {
      ElMessage.warning(t('history.importInvalid'));
      return;
    }
    ElMessage.success(t('history.importSuccess', { count: result.merged }));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    ElMessage.error(t('history.importFailed', { error: detail }));
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
      <HistoryTrendChart
        v-if="records.length >= 2"
        :records="records"
        class="history-trend"
      />
      <div class="history-head-actions">
        <el-button
          :icon="Download"
          text
          size="small"
          type="info"
          @click="handleExport"
        >
          {{ t('history.export') }}
        </el-button>
        <el-button
          :icon="Upload"
          text
          size="small"
          type="info"
          @click="triggerImport"
        >
          {{ t('history.import') }}
        </el-button>
        <el-button
          text
          size="small"
          type="info"
          @click="handleClear"
        >
          {{ t('history.clear') }}
        </el-button>
      </div>
    </div>

    <div
      v-if="hasRecords"
      class="history-filter"
    >
      <el-input
        v-model="search"
        size="small"
        clearable
        :prefix-icon="Search"
        :placeholder="t('history.searchPlaceholder')"
        class="history-search"
      />
      <el-radio-group
        v-model="filterMode"
        size="small"
      >
        <el-radio-button value="all">{{ t('history.filterAll') }}</el-radio-button>
        <el-radio-button value="source">{{ t('history.filterSource') }}</el-radio-button>
        <el-radio-button value="target">{{ t('history.filterTarget') }}</el-radio-button>
      </el-radio-group>
      <el-select
        v-model="filterFormat"
        size="small"
        clearable
        :placeholder="t('history.filterAll')"
        class="history-format"
      >
        <el-option
          v-for="fmt in availableFormats"
          :key="fmt"
          :value="fmt"
          :label="getFormatLabel(fmt)"
        />
      </el-select>
    </div>

    <div
      v-if="!hasRecords"
      class="history-empty"
    >
      {{ t('history.empty') }}
    </div>

    <div
      v-else-if="filteredRecords.length === 0"
      class="history-empty"
    >
      {{ t('history.noMatch') }}
      <el-button
        text
        size="small"
        type="primary"
        @click="resetFilter"
      >
        {{ t('history.filterAll') }}
      </el-button>
    </div>

    <ul
      v-else
      class="history-list"
    >
      <li
        v-for="record in filteredRecords"
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
            :aria-label="t('a11y.delete')"
            @click="handleRemove(record.id)"
          />
        </div>
      </li>
    </ul>

    <input
      ref="importInput"
      type="file"
      accept="application/json,.json"
      class="hidden-file-input"
      :aria-label="t('a11y.import')"
      @change="handleImportChange"
    >
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
  justify-content: space-between;
  gap: var(--fat-space-sm);
}

.history-trend {
  flex: 0 0 auto;
}

.history-filter {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  flex-wrap: wrap;
}

.history-search {
  flex: 1 1 160px;
  min-width: 120px;
}

.history-format {
  width: 130px;
  flex-shrink: 0;
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

.history-time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.history-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.history-head-actions {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  flex-shrink: 0;
}

.hidden-file-input {
  display: none;
}
</style>
