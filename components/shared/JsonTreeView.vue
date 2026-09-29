<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, CopyDocument, Grid } from '@element-plus/icons-vue';
import {
  ancestorsOf,
  defaultExpanded,
  JSON_VIEW_LIMITS,
  searchJson,
  segmentMatch,
  tableCandidates,
  visibleRows,
  type JsonField,
  type JsonSegment,
  type JsonTree,
} from '~/utils/core/json-view';
import { copyText } from '~/utils/core/clipboard';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{ tree: JsonTree }>();

/** Raised when the user asks to see one array as rows and columns; the dialog owns that view. */
const emit = defineEmits<{ 'open-table': [arrayId: number] }>();

const { t } = useI18n();

/** Open containers. A reactive `Set`, because Vue tracks `has` per key and an array copy of the same
 *  state would re-render every row on a single toggle. */
const expanded = reactive<Set<number>>(defaultExpanded(props.tree));

/**
 * Search state lives here rather than in the dialog because the matches, the ancestors the search
 * forced open, and the rows that actually paint have to agree with each other.
 */
const query = ref('');
const caseSensitive = ref(false);
/** Element Plus models a checkbox group as `(string | number | boolean)[]`, so the raw value is kept
 *  wide and narrowed on the way into the search. */
const checkedFields = ref<string[]>(['key', 'path', 'value']);
const searchFields = computed<JsonField[]>(() =>
  checkedFields.value.filter((field): field is JsonField => field === 'key' || field === 'path' || field === 'value'),
);
const needle = computed(() => query.value.trim());
const activeIndex = ref(0);
const bodyRef = ref<HTMLElement | null>(null);

const matches = computed(() => searchJson(props.tree, needle.value, searchFields.value, caseSensitive.value));
const cappedMatches = computed(() => matches.value.length >= JSON_VIEW_LIMITS.maxMatches);
const activeMatch = computed(() => matches.value[activeIndex.value] ?? null);

/** A row marked by a jump from the table view rather than by the search. It is a separate ref because
 *  it answers a different question — "you asked me to show you this one" — and must not be overwritten
 *  the next time the match cursor moves. */
const spotlight = ref<number | null>(null);

/** The single row that carries the active styling: a jump wins over the match cursor, because the jump
 *  is the more recent request, and the match position is still readable in the counter next to it. */
const activeId = computed(() => spotlight.value ?? activeMatch.value?.id ?? -1);

/** id → the fields that hit, so a row marks only the columns the search actually matched. */
const matchById = computed(() => {
  const map = new Map<number, JsonField[]>();
  for (const match of matches.value) map.set(match.id, match.fields);
  return map;
});

const tableIds = computed(() => new Set(tableCandidates(props.tree)));
const rows = computed(() => visibleRows(props.tree, expanded));

const summary = computed(() => t('preview.jsonStats', { nodes: props.tree.nodes.length, depth: props.tree.maxDepth }));

/** Every budget the model ran into, said out loud. A tree that quietly stopped at 100 000 nodes
 *  would read as the whole document, which is the one thing this view must not do. */
const notices = computed(() => {
  const list: string[] = [];
  if (props.tree.limit === 'nodes') list.push(t('preview.jsonNodeCapped', { max: JSON_VIEW_LIMITS.maxNodes }));
  else if (props.tree.limit === 'depth') list.push(t('preview.jsonDepthCapped', { max: JSON_VIEW_LIMITS.maxDepth }));
  if (rows.value.dropped > 0) {
    list.push(t('preview.jsonRowsCapped', { max: JSON_VIEW_LIMITS.maxRows, extra: rows.value.dropped }));
  }
  return list;
});

/** The row's key or value column, split into matched and plain runs for the highlight. */
function segmentsOf(id: number, field: JsonField): JsonSegment[] {
  const node = props.tree.nodes[id];
  const text = field === 'key' ? node.key : node.text;
  const hit = matchById.value.get(id)?.includes(field) ?? false;
  return segmentMatch(text, needle.value, hit, caseSensitive.value);
}

function summaryOf(id: number): string {
  const node = props.tree.nodes[id];
  return node.kind === 'array' ? `[ ${String(node.childCount)} ]` : `{ ${String(node.childCount)} }`;
}

function toggle(id: number): void {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
}

function expandAll(): void {
  for (const node of props.tree.nodes) {
    if (node.childCount > 0) expanded.add(node.id);
  }
}

function collapseAll(): void {
  expanded.clear();
  expanded.add(0);
}

/** Back to what the tree opened with — the one state that is derived rather than chosen. */
function resetExpanded(): void {
  expanded.clear();
  for (const id of defaultExpanded(props.tree)) expanded.add(id);
}

function step(delta: number): void {
  if (matches.value.length === 0) return;
  spotlight.value = null;
  activeIndex.value = (activeIndex.value + delta + matches.value.length) % matches.value.length;
  revealActive();
}

/** Open the ancestors of the current match, then bring its row to the middle of the pane. */
function revealActive(): void {
  const match = matches.value[activeIndex.value];
  if (!match) return;
  for (const id of ancestorsOf(props.tree, match.id)) expanded.add(id);
  void nextTick(() => scrollToRow(match.id));
}

function scrollToRow(id: number): void {
  const pane = bodyRef.value;
  const row = pane?.querySelector<HTMLElement>(`[data-row="${String(id)}"]`);
  if (!pane || !row) return;
  // A row past the render cap is not in the DOM: the notice above already says rows are hidden,
  // and scrolling to something that is not painted would move the pane for no visible reason.
  pane.scrollTo({ top: Math.max(0, row.offsetTop - pane.clientHeight / 2) });
}

/**
 * Open the branch that holds `id` — and `id` itself, when it is a container — and mark it, for a jump
 * coming from the table view's `{ 3 }` cell. Exposed because the two views are siblings and only this
 * one owns expansion state.
 *
 * The cell that starts the jump is the subtree's summary, and the action reads 「在树中展开」. Landing on
 * that row still folded would show the same `{ 3 }` the table already showed and leave the verb
 * unfulfilled, so the drill opens one level more than a plain reveal would.
 */
function revealId(id: number): void {
  if (id < 0) return;
  for (const ancestor of ancestorsOf(props.tree, id)) expanded.add(ancestor);
  if (props.tree.nodes[id].childCount > 0) expanded.add(id);
  spotlight.value = id;
  void nextTick(() => scrollToRow(id));
}

defineExpose({ revealId });

function onQueryChange(): void {
  spotlight.value = null;
  activeIndex.value = 0;
  if (matches.value.length > 0) revealActive();
}

async function copyPath(id: number): Promise<void> {
  if (await copyText(props.tree.nodes[id].path)) {
    ElMessage.success(t('preview.copied'));
  } else {
    ElMessage.error(t('preview.copyFailed'));
  }
}

// A new file means a new tree, and the previous expansion ids would address someone else's nodes.
watch(
  () => props.tree,
  () => {
    resetExpanded();
    query.value = '';
    activeIndex.value = 0;
    spotlight.value = null;
  },
);
</script>

<template>
  <div class="json-tree">
    <div class="json-toolbar">
      <ElInput
        v-model="query"
        class="json-search"
        size="small"
        clearable
        :placeholder="t('preview.jsonSearchPlaceholder')"
        :aria-label="t('preview.jsonSearchPlaceholder')"
        @input="onQueryChange"
        @keydown.down.prevent="step(1)"
        @keydown.up.prevent="step(-1)"
        @keydown.enter.prevent="step(1)"
      />
      <ElCheckboxGroup
        v-model="checkedFields"
        class="json-fields"
      >
        <ElCheckbox value="key">{{ t('preview.jsonFieldKey') }}</ElCheckbox>
        <ElCheckbox value="path">{{ t('preview.jsonFieldPath') }}</ElCheckbox>
        <ElCheckbox value="value">{{ t('preview.jsonFieldValue') }}</ElCheckbox>
      </ElCheckboxGroup>
      <ElCheckbox
        v-model="caseSensitive"
        class="json-case"
      >
        {{ t('preview.jsonCaseSensitive') }}
      </ElCheckbox>
      <span
        class="json-count"
        role="status"
        aria-live="polite"
      >
        <template v-if="needle">
          <template v-if="matches.length">
            {{ t('preview.jsonMatchPosition', { index: activeIndex + 1, total: matches.length }) }}
            <template v-if="cappedMatches">
              {{ t('preview.jsonMatchesCapped', { max: JSON_VIEW_LIMITS.maxMatches }) }}
            </template>
          </template>
          <template v-else>{{ t('preview.jsonNoMatches') }}</template>
        </template>
        <template v-else>{{ summary }}</template>
      </span>
      <div class="json-tools">
        <ElButton
          v-if="matches.length"
          size="small"
          text
          :title="t('preview.jsonPrevMatch')"
          :aria-label="t('preview.jsonPrevMatch')"
          @click="step(-1)"
        >
          <ArrowUp />
        </ElButton>
        <ElButton
          v-if="matches.length"
          size="small"
          text
          :title="t('preview.jsonNextMatch')"
          :aria-label="t('preview.jsonNextMatch')"
          @click="step(1)"
        >
          <ArrowDown />
        </ElButton>
        <ElButton
          size="small"
          text
          @click="expandAll"
          >{{ t('preview.jsonExpandAll') }}</ElButton
        >
        <ElButton
          size="small"
          text
          @click="resetExpanded"
          >{{ t('preview.jsonReset') }}</ElButton
        >
        <ElButton
          size="small"
          text
          @click="collapseAll"
          >{{ t('preview.jsonCollapseAll') }}</ElButton
        >
      </div>
    </div>

    <p
      v-for="notice in notices"
      :key="notice"
      class="json-notice"
      role="status"
    >
      {{ notice }}
    </p>

    <div
      ref="bodyRef"
      class="json-body"
      role="tree"
      :aria-label="t('preview.jsonTreeAria')"
    >
      <div
        v-for="id in rows.ids"
        :key="id"
        :data-row="id"
        class="json-row"
        :class="{ 'is-active': activeId === id }"
        role="treeitem"
        :aria-level="tree.nodes[id].depth + 1"
        :aria-expanded="tree.nodes[id].childCount > 0 ? expanded.has(id) : undefined"
        :aria-selected="activeId === id || undefined"
        :style="{ '--fat-indent': `${tree.nodes[id].depth}rem` }"
      >
        <button
          v-if="tree.nodes[id].childCount > 0"
          class="json-caret"
          type="button"
          :aria-label="t(expanded.has(id) ? 'preview.jsonCollapseRow' : 'preview.jsonExpandRow')"
          @click="toggle(id)"
        >
          <ElIcon
            class="json-chevron"
            :class="{ 'is-collapsed': !expanded.has(id) }"
            :size="12"
          >
            <ArrowDown />
          </ElIcon>
        </button>
        <span
          v-else
          class="json-caret json-caret--leaf"
          aria-hidden="true"
        />

        <span
          v-if="tree.nodes[id].parentId >= 0"
          class="json-key"
        >
          <component
            :is="segment.hit ? 'mark' : 'span'"
            v-for="(segment, index) in segmentsOf(id, 'key')"
            :key="index"
            >{{ segment.text }}</component
          >
          <i class="json-sep">:</i>
        </span>

        <span
          v-if="tree.nodes[id].childCount > 0"
          class="json-sum"
        >
          {{ summaryOf(id) }}
          <i
            v-if="tree.nodes[id].truncated"
            class="json-partial"
            :title="t('preview.jsonPartialChildren')"
            >+</i
          >
        </span>
        <span
          v-else
          class="json-val"
          :class="`is-${tree.nodes[id].kind}`"
          ><component
            :is="segment.hit ? 'mark' : 'span'"
            v-for="(segment, index) in segmentsOf(id, 'value')"
            :key="index"
            >{{ segment.text }}</component
          ></span
        >

        <span class="json-actions">
          <button
            v-if="tableIds.has(id)"
            class="json-action"
            type="button"
            :title="t('preview.jsonOpenTable')"
            :aria-label="t('preview.jsonOpenTable')"
            @click="emit('open-table', id)"
          >
            <Grid />
          </button>
          <button
            class="json-action"
            type="button"
            :title="t('preview.copyPath')"
            :aria-label="t('preview.copyPath')"
            @click="copyPath(id)"
          >
            <CopyDocument />
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.json-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-sm);
  padding-bottom: var(--fat-space-sm);
  border-bottom: 1px solid var(--fat-border-light);
}

.json-search {
  flex: 0 1 260px;
  width: 260px;
}

.json-count {
  font-size: 12px;
  color: var(--fat-text-secondary);
  white-space: nowrap;
}

.json-tools {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
  margin-left: auto;
}

.json-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-top: var(--fat-space-xs);
  font-family: var(--fat-font-mono);
  font-size: 13px;
  line-height: 1.5;
}

/* `max-content` keeps a long value readable by scrolling the pane sideways instead of cutting it
   off at the dialog edge; the model already caps a scalar at `maxScalarChars`, so a row cannot be
   pathologically wide. `--fat-indent` is set per row from the node's depth in the template — it is
   the one value here that is data rather than design, so it is not declared in `tokens.css`. */
.json-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: max-content;
  min-width: 100%;
  padding-right: var(--fat-space-sm);
  padding-left: var(--fat-indent, 0);
  border-radius: var(--fat-radius-sm);
}

.json-row:hover {
  background: var(--fat-bg-hover);
}

.json-row.is-active {
  background: var(--fat-primary-bg);
  box-shadow: inset 0 0 0 1px var(--fat-primary-border);
}

.json-caret {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fat-text-secondary);
  cursor: pointer;
}

.json-caret--leaf {
  cursor: default;
}

/* One glyph, rotated — the same convention `CollapsibleCard` uses, so the tree does not introduce a
   second caret shape. Collapsed points right, which is where every other disclosure in this UI
   points when it is closed. */
.json-chevron {
  transition: transform var(--fat-duration-base) var(--fat-ease-standard);
}

.json-chevron.is-collapsed {
  transform: rotate(-90deg);
}

.json-key {
  color: var(--fat-json-key);
  white-space: pre;
}

.json-sep {
  font-style: normal;
  color: var(--fat-text-secondary);
}

.json-sum {
  color: var(--fat-text-secondary);
  white-space: pre;
}

.json-val {
  white-space: pre;
}

.json-val.is-string {
  color: var(--fat-json-string);
}

.json-val.is-number {
  color: var(--fat-json-number);
}

.json-val.is-boolean {
  color: var(--fat-json-boolean);
}

.json-val.is-null {
  color: var(--fat-json-null);
}

/* The `+` is a disclosure, not decoration: it is the only thing on the row that says the children
   below were never parsed. `--fat-text-placeholder` measured 2.56:1 on the card in light and 3.36:1
   in dark, which is under WCAG 1.4.3 and outside what `tokens.css` reserves that token for. */
.json-partial {
  font-style: normal;
  color: var(--fat-text-secondary);
}

.json-actions {
  display: flex;
  gap: 2px;
  margin-left: var(--fat-space-sm);
  opacity: 0;
  transition: opacity var(--fat-duration-fast) var(--fat-ease-standard);
}

/* The buttons keep their box when hidden, so revealing them cannot shift the row's own text. */
.json-row:hover .json-actions,
.json-row:focus-within .json-actions {
  opacity: 1;
}

.json-action {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 0;
  border-radius: var(--fat-radius-sm);
  background: none;
  color: var(--fat-text-secondary);
  cursor: pointer;
}

/* An icon, so the floor is WCAG 1.4.11's 3:1 rather than 4.5:1 — and `--fat-focus-ring` is the token
   this project already guarantees clears 3:1 against the card in both modes and all 6 themes (light
   green resolves it to `--fat-primary-active` at 3.77:1 precisely because `--fat-primary` is 2.54:1
   there). A bare `--fat-primary` hover ink would have failed that floor in two themes. */
.json-action:hover {
  color: var(--fat-focus-ring);
}

.json-action:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 1px;
}

.json-body mark {
  padding: 0 1px;
  border-radius: 2px;
  background: var(--fat-mark-bg);
  color: var(--fat-mark-text);
}
</style>
