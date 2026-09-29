<script setup lang="ts">
import { computed } from 'vue';
import { CopyDocument } from '@element-plus/icons-vue';
import type { JsonCell, JsonTable } from '~/utils/core/json-view';
import { copyText } from '~/utils/core/clipboard';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{ table: JsonTable }>();

/** Raised for a `{ 3 }` or `[ 2 ]` cell: the tree owns expansion, so drilling into a container
 *  happens there and the dialog routes the jump. */
const emit = defineEmits<{ 'open-node': [id: number] }>();

const { t } = useI18n();

const stats = computed(() =>
  t('preview.jsonTableStats', {
    rows: props.table.rows.length,
    columns: props.table.columns.length,
    total: props.table.rows.length + props.table.droppedRows,
  }),
);

/** A cell is a link only when it stands for a container — a scalar is already fully shown. */
function isDrillable(cell: JsonCell): boolean {
  return cell.id >= 0 && (cell.kind === 'object' || cell.kind === 'array');
}

async function copySourcePath(): Promise<void> {
  if (await copyText(props.table.sourcePath)) {
    ElMessage.success(t('preview.copied'));
  } else {
    ElMessage.error(t('preview.copyFailed'));
  }
}
</script>

<template>
  <div class="json-table">
    <div class="json-table-head">
      <span class="json-table-path">
        <code>{{ table.sourcePath }}</code>
        <button
          class="json-copy"
          type="button"
          :title="t('preview.copyPath')"
          :aria-label="t('preview.copyPath')"
          @click="copySourcePath"
        >
          <CopyDocument />
        </button>
      </span>
      <span class="json-table-stats">{{ stats }}</span>
    </div>

    <p
      v-if="table.droppedRows > 0"
      class="json-table-notice"
      role="status"
    >
      {{ t('preview.jsonTableRowsDropped', { extra: table.droppedRows }) }}
    </p>

    <div class="json-table-scroll">
      <table class="json-grid">
        <caption class="sr-only">
          {{
            t('preview.jsonTableCaption', { path: table.sourcePath })
          }}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="json-index"
            >
              #
            </th>
            <th
              v-for="column in table.columns"
              :key="column"
              scope="col"
              :title="column"
            >
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in table.rows"
            :key="rowIndex"
          >
            <th
              scope="row"
              class="json-index"
            >
              {{ rowIndex + 1 }}
            </th>
            <td
              v-for="(cell, columnIndex) in row"
              :key="columnIndex"
              :class="['is-' + cell.kind, { 'is-absent': cell.id < 0 }]"
            >
              <button
                v-if="isDrillable(cell)"
                class="json-drill"
                type="button"
                :title="t('preview.jsonOpenInTree')"
                @click="emit('open-node', cell.id)"
              >
                {{ cell.text }}
              </button>
              <span
                v-else-if="cell.id >= 0"
                :title="cell.text"
                >{{ cell.text }}</span
              >
              <span
                v-else
                class="json-absent"
                :title="t('preview.jsonCellAbsent')"
                >–</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.json-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.json-table-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--fat-space-sm);
  padding-bottom: var(--fat-space-sm);
  border-bottom: 1px solid var(--fat-border-light);
}

.json-table-path {
  display: inline-flex;
  align-items: center;
  gap: var(--fat-space-xs);
  min-width: 0;
  font-family: var(--fat-font-mono);
  font-size: 12px;
  color: var(--fat-text-regular);
}

.json-table-path code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-copy {
  display: inline-flex;
  flex: none;
  padding: 2px;
  border: 0;
  border-radius: var(--fat-radius-sm);
  background: none;
  color: var(--fat-text-secondary);
  cursor: pointer;
}

/* Icons take the accent on hover, and the accent has to be the one this project guarantees at 3:1
   against the card in both modes — `--fat-focus-ring`. `--fat-primary` is 2.54:1 in light green and
   3.56:1 in light orange, which is under even that non-text floor. */
.json-copy:hover {
  color: var(--fat-focus-ring);
}

.json-copy:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 1px;
}

.json-table-stats {
  margin-left: auto;
  font-size: 12px;
  color: var(--fat-text-secondary);
  white-space: nowrap;
}

.json-table-notice {
  margin: var(--fat-space-xs) 0 0;
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.json-table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* `max-content` lets a wide payload scroll instead of squeezing every column to a sliver; the model
   already caps a scalar at `maxScalarChars` and the grid at `maxTableCols`, so the table cannot grow
   without bound. */
.json-grid {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-family: var(--fat-font-mono);
  font-size: 12px;
  line-height: 1.5;
}

.json-grid th,
.json-grid td {
  max-width: 260px;
  padding: var(--fat-space-xs) var(--fat-space-sm);
  border-bottom: 1px solid var(--fat-border-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* The header sticks to this scroll container, so the column names stay readable while the rows
   scroll; the surface token is what the rows use underneath, so a cell cannot show through the gap. */
.json-grid thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--fat-surface-2);
  color: var(--fat-text-regular);
  font-weight: 600;
}

/* Row ordinals are informational text, so they take the informational ink. `--fat-text-placeholder`
   measured 2.56:1 on the card in light and 3.36:1 in dark — under 1.4.3, and outside the three cases
   `tokens.css` reserves that token for (input placeholders, disabled controls, ARIA-carried decoration). */
.json-index {
  width: 1%;
  color: var(--fat-text-secondary);
  font-weight: 400;
  text-align: right;
}

.json-grid tbody tr:nth-child(even) {
  background: var(--fat-surface-2);
}

.json-grid td.is-string {
  color: var(--fat-json-string);
}

.json-grid td.is-number {
  color: var(--fat-json-number);
}

.json-grid td.is-boolean {
  color: var(--fat-json-boolean);
}

.json-grid td.is-null {
  color: var(--fat-json-null);
}

/* An absent key and an explicit `null` look different on purpose: `–` is not a value. The difference
   is carried by the glyph and the `title`, not by the ink — the placeholder colour that used to sit
   here measured 2.56:1 light / 3.36:1 dark, and "this row has no such field" is information, not
   decoration, so it has to clear 1.4.3 like every other cell in the grid. */
.json-grid td.is-absent {
  color: var(--fat-text-secondary);
}

.json-drill {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

/* The affordance on hover is the underline turning solid, not the ink turning accent-coloured: a
   drill cell is 12px text, so it owes 4.5:1, and no theme accent pays it in both modes (light green
   is 2.54:1 as `--fat-primary`, 3.77:1 even as `--fat-primary-active`). The cell keeps the ink of the
   kind it holds — which every JSON ink token was chosen to keep readable on every surface here. */
.json-drill:hover {
  text-decoration-line: underline;
  text-decoration-style: solid;
}

.json-drill:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 1px;
}
</style>
