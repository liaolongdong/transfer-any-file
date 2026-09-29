<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, onUnmounted } from 'vue';
import { ZoomIn, ZoomOut, Download, Loading } from '@element-plus/icons-vue';
import { FileFormat } from '~/utils/core/types';
import { getFormatLabel } from '~/utils/core/format-labels';
import { formatSize } from '~/utils/core/format';
import { asErrorKey } from '~/utils/core/error-keys';
import { docxToPreviewHtml, xlsxToPreviewHtml } from '~/utils/core/preview';
import { buildJsonTable, inspectJson, pickTableSource, type JsonPreview } from '~/utils/core/json-view';
import { DOCUMENT_CSS } from '~/utils/core/html-document';
import { stripRemoteResources } from '~/utils/core/html-sanitize';
import JsonTreeView from '~/components/shared/JsonTreeView.vue';
import JsonTableView from '~/components/shared/JsonTableView.vue';
import { useI18n } from '~/composables/useI18n';

const props = defineProps<{
  visible: boolean;
  blob: Blob | null;
  format: FileFormat;
  filename: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const { t } = useI18n();

const scale = ref(1);
const textContent = ref('');
const imageUrl = ref('');
const pdfUrl = ref('');
const renderedHtml = ref('');
const htmlView = ref<'rendered' | 'source'>('rendered');
/** Holds the key to translate once the body is in its error state: a converter's own
 *  `errors.*` key when the failure carries one (so an empty workbook says so, in both languages),
 *  and `preview.renderFailed` for everything else — a library message has no translation to show. */
const renderError = ref<string | null>(null);

/**
 * JSON preview state. `jsonPreview` is the model (`inspectJson` runs once per file, in the watcher
 * below); `tableTarget` is the array the table view was asked to project, `null` meaning "whatever
 * the document's own biggest array is"; `treeRef` exists only so a `{ 3 }` cell in the table can
 * hand its node id to the view that owns expansion.
 *
 * `shallowRef`, deliberately: the model is a flat array of up to 100 000 node objects that is written
 * once and read in tight loops, and `ref` would deep-wrap it — every `tree.nodes[id].parentId` in
 * `buildJsonTable`, `visibleRows` and `searchJson` then goes through a reactive proxy that also
 * registers a dependency. Measured on a 384 KiB / 26 000-node document in headed Chrome, opening the
 * dialog that way took 21 s of blocked main thread; the model never changes after `inspectJson`
 * returns, so there is nothing for that deep tracking to be worth. Replacement is the only mutation,
 * and `shallowRef` fires on exactly that.
 */
const jsonPreview = shallowRef<JsonPreview | null>(null);
const jsonView = ref<'tree' | 'table' | 'raw'>('tree');
const tableTarget = ref<number | null>(null);
const treeRef = ref<InstanceType<typeof JsonTreeView> | null>(null);

const isText = computed(() => [FileFormat.TXT, FileFormat.CSV, FileFormat.JSON].includes(props.format));
const isJson = computed(() => props.format === FileFormat.JSON);
const isMarkdown = computed(() => props.format === FileFormat.MD);
const isHtml = computed(() => props.format === FileFormat.HTML);
const isImage = computed(() =>
  [FileFormat.PNG, FileFormat.JPG, FileFormat.WEBP, FileFormat.BMP, FileFormat.GIF, FileFormat.SVG].includes(
    props.format,
  ),
);
const isPdf = computed(() => props.format === FileFormat.PDF);
const isDocx = computed(() => props.format === FileFormat.DOCX);
const isXlsx = computed(() => props.format === FileFormat.XLSX);
const isRenderedDoc = computed(() => isHtml.value || isMarkdown.value || isDocx.value || isXlsx.value);

const jsonTree = computed(() => jsonPreview.value?.tree ?? null);

/**
 * The projected table: the array the user picked from the tree, else the document's own best
 * candidate. Derived rather than stored so a file switch cannot leave a table built from the
 * previous document's node ids on screen.
 */
const jsonTable = computed(() => {
  const tree = jsonTree.value;
  if (!tree) return null;
  const id = tableTarget.value ?? pickTableSource(tree);
  return id === null ? null : buildJsonTable(tree, id);
});

/** True when the body is one of the two structured JSON panes, which need a fixed-height frame. */
const jsonPane = computed(() => isJson.value && jsonTree.value !== null && jsonView.value !== 'raw');

/** A table request the projection refused (a mixed or over-wide array) shows the tree, and the
 *  notice above it says why — the radio would otherwise read as a control that does nothing. */
const effectiveView = computed(() =>
  jsonView.value === 'table' && jsonTable.value === null ? 'tree' : jsonView.value,
);

/** The table tab is selectable once there is something to project: the document's own best array, or
 *  one the user pointed at from the tree. A payload of scalars has neither, so the tab stays out of
 *  reach instead of being a button that changes nothing. */
const tableSelectable = computed(() => jsonTable.value !== null || tableTarget.value !== null);

function openTable(arrayId: number): void {
  tableTarget.value = arrayId;
  jsonView.value = 'table';
}

/** The tree is kept mounted with `v-show` precisely so this jump can arrive with the expansion
 *  state and the search query still intact; `nextTick` because the pane is hidden until this frame. */
function openNode(id: number): void {
  jsonView.value = 'tree';
  void nextTick(() => treeRef.value?.revealId(id));
}

watch(
  [() => props.visible, () => props.blob],
  async ([vis, blob], _prev, onCleanup) => {
    if (!vis || !blob) return;
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
    imageUrl.value = '';
    pdfUrl.value = '';
    textContent.value = '';
    renderedHtml.value = '';
    renderError.value = null;
    htmlView.value = 'rendered';
    jsonPreview.value = null;
    jsonView.value = 'tree';
    tableTarget.value = null;

    // Drop the result of this watch run if a newer run starts or the component
    // is torn down before the async pipeline finishes.
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    if (isText.value) {
      const raw = await blob.text();
      if (cancelled) return;
      if (props.format === FileFormat.JSON) {
        // One synchronous, bounded pass (`inspectJson` caps its walk at `JSON_VIEW_LIMITS`) yields
        // both the model and the pretty text, so the raw view is byte-identical to what this branch
        // printed before the tree existed. Invalid JSON keeps the original text, exactly as before.
        // No `cancelled` check follows it: the call cannot yield, so nothing can interleave here.
        const preview = inspectJson(raw);
        jsonPreview.value = preview;
        textContent.value = preview ? preview.pretty : raw;
      } else {
        textContent.value = raw;
      }
    } else if (isMarkdown.value || isHtml.value) {
      try {
        textContent.value = await blob.text();
        if (cancelled) return;
        const purifyModule = await import('dompurify');
        const DOMPurify = purifyModule.default;
        let source = textContent.value;
        if (isMarkdown.value) {
          // The dialog mounts with the file list, so a static import here would put 41 KB of
          // `marked` on every boot; only the markdown tab needs the parser.
          const { marked } = await import('marked');
          source = await marked(textContent.value);
        }
        const htmlBody = DOMPurify.sanitize(source, { USE_PROFILES: { html: true } });
        if (cancelled) return;
        renderedHtml.value = stripRemoteResources(
          `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${DOCUMENT_CSS}</style></head><body>${htmlBody}</body></html>`,
        );
      } catch {
        // Same shape as the docx/xlsx branches: a markdown or HTML file the parser chokes on
        // has to end in the error state, not in a watcher rejection and a permanent spinner.
        if (!cancelled) renderError.value = 'preview.renderFailed';
      }
    } else if (isImage.value) {
      imageUrl.value = URL.createObjectURL(blob);
      scale.value = 1;
    } else if (isPdf.value) {
      pdfUrl.value = URL.createObjectURL(blob);
    } else if (isDocx.value) {
      try {
        const html = await docxToPreviewHtml(blob);
        if (cancelled) return;
        renderedHtml.value = html;
      } catch (error) {
        if (!cancelled) renderError.value = asErrorKey(error) ?? 'preview.renderFailed';
      }
    } else if (isXlsx.value) {
      try {
        const html = await xlsxToPreviewHtml(blob);
        if (cancelled) return;
        renderedHtml.value = html;
      } catch (error) {
        if (!cancelled) renderError.value = asErrorKey(error) ?? 'preview.renderFailed';
      }
    }
  },
  { immediate: true },
);
// `immediate` is what lets the dialog be created already open: FileUpload mounts this component on
// the same click that sets `visible`, and without the initial run a watcher would see no change to
// react to and the body would stay empty. The run on a closed mount returns at the guard above.

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
});

function close(): void {
  emit('update:visible', false);
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  imageUrl.value = '';
  pdfUrl.value = '';
}

function download(): void {
  if (!props.blob) return;
  const url = URL.createObjectURL(props.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = props.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    width="min(1200px, 92vw)"
    align-center
    destroy-on-close
    class="preview-dialog"
    @update:model-value="emit('update:visible', $event)"
    @close="close"
  >
    <template #header="{ titleId }">
      <div class="preview-header">
        <div class="preview-title">
          <!-- EP leaves `aria-labelledby` pointing at this id whenever no `title` prop is
               passed, which is the case here — a custom #header that ignores titleId
               renders a dialog with no accessible name. -->
          <span
            :id="titleId"
            class="filename"
            >{{ filename }}</span
          >
          <ElTag
            size="small"
            type="primary"
            >{{ getFormatLabel(format) }}</ElTag
          >
          <span class="file-size">{{ blob ? formatSize(blob.size) : '0 B' }}</span>
        </div>
        <div class="preview-actions">
          <ElRadioGroup
            v-if="isJson && jsonTree"
            v-model="jsonView"
            size="small"
          >
            <ElRadioButton value="tree">{{ t('preview.treeTab') }}</ElRadioButton>
            <ElRadioButton
              value="table"
              :disabled="!tableSelectable"
            >
              {{ t('preview.tableTab') }}
            </ElRadioButton>
            <ElRadioButton value="raw">{{ t('preview.rawTab') }}</ElRadioButton>
          </ElRadioGroup>
          <!-- A payload that does not parse keeps the plain text body it always had; saying so is
               what stops the missing tree from reading as a broken preview. -->
          <span
            v-else-if="isJson && textContent"
            class="json-hint"
            role="status"
            >{{ t('preview.jsonNotJson') }}</span
          >
          <ElRadioGroup
            v-if="(isHtml || isMarkdown) && textContent"
            v-model="htmlView"
            size="small"
          >
            <ElRadioButton value="rendered">{{ t('preview.renderedTab') }}</ElRadioButton>
            <ElRadioButton value="source">{{ t('preview.sourceTab') }}</ElRadioButton>
          </ElRadioGroup>
          <ElButton
            v-if="isImage"
            text
            :title="t('preview.zoomOut')"
            :aria-label="t('preview.zoomOut')"
            @click="scale = Math.max(scale - 0.25, 0.25)"
          >
            <ZoomOut />
          </ElButton>
          <ElButton
            v-if="isImage"
            text
            :title="t('preview.zoomIn')"
            :aria-label="t('preview.zoomIn')"
            @click="scale = Math.min(scale + 0.25, 3)"
          >
            <ZoomIn />
          </ElButton>
          <ElButton
            text
            :aria-label="t('preview.download')"
            @click="download"
          >
            <Download /> {{ t('preview.download') }}
          </ElButton>
        </div>
      </div>
    </template>

    <div
      class="preview-content"
      :class="{ 'is-json-pane': jsonPane }"
    >
      <!-- JSON: tree, array table, or the same pretty-printed text the dialog always showed. The
           tree is the guard here rather than `jsonPane`, because `v-if` on a `<template>` is what
           lets the two children below take `jsonTree` / `jsonTable` as their required props. -->
      <template v-if="isJson && jsonTree && jsonView !== 'raw'">
        <p
          v-if="jsonView === 'table' && !jsonTable"
          class="json-note"
          role="status"
        >
          {{ t('preview.jsonNoTable') }}
        </p>
        <JsonTreeView
          v-show="effectiveView === 'tree'"
          ref="treeRef"
          :tree="jsonTree"
          @open-table="openTable"
        />
        <!-- Exactly one pane paints at a time, and the conditions say why they are written
           differently: the tree is `v-show` because it owns expansion and the search query, which a
           jump from the table must not lose; the table has no state of its own, so it is `v-if` and
           pays for nothing while the tree is up. -->
        <JsonTableView
          v-if="jsonTable && effectiveView === 'table'"
          :table="jsonTable"
          @open-node="openNode"
        />
      </template>
      <!-- Plain text / csv source -->
      <pre
        v-else-if="isText"
        class="text-preview"
        >{{ textContent }}</pre>
      <!-- Markdown: rendered iframe or raw source -->
      <iframe
        v-else-if="isMarkdown && htmlView === 'rendered' && renderedHtml"
        class="doc-frame"
        sandbox=""
        :srcdoc="renderedHtml"
        :title="filename"
      ></iframe>
      <pre
        v-else-if="isMarkdown && htmlView === 'source'"
        class="text-preview"
        >{{ textContent }}</pre>
      <!-- HTML: rendered iframe or raw source -->
      <iframe
        v-else-if="isHtml && htmlView === 'rendered' && renderedHtml"
        class="doc-frame"
        sandbox=""
        :srcdoc="renderedHtml"
        :title="filename"
      ></iframe>
      <pre
        v-else-if="isHtml && htmlView === 'source'"
        class="text-preview"
        >{{ textContent }}</pre>
      <!-- DOCX / XLSX rendered to HTML -->
      <iframe
        v-else-if="(isDocx || isXlsx) && renderedHtml"
        class="doc-frame"
        sandbox=""
        :srcdoc="renderedHtml"
        :title="filename"
      ></iframe>
      <div
        v-else-if="renderError"
        class="render-error"
      >
        {{ t(renderError ?? 'preview.renderFailed') }}
      </div>
      <div
        v-else-if="isRenderedDoc"
        class="render-loading"
        role="status"
        :aria-label="t('preview.reading')"
      >
        <ElIcon class="is-loading"><Loading /></ElIcon>
      </div>
      <!-- Image -->
      <div
        v-else-if="isImage"
        class="image-preview"
      >
        <img
          :src="imageUrl"
          :alt="filename"
          class="preview-image"
          :style="{ transform: `scale(${scale})` }"
        />
      </div>
      <!-- PDF -->
      <iframe
        v-else-if="isPdf"
        :src="pdfUrl"
        class="pdf-preview"
        :title="filename"
      />
    </div>

    <template #footer>
      <div class="preview-footer">
        <span class="file-size">{{ blob ? formatSize(blob.size) : '0 B' }}</span>
        <ElButton @click="close">{{ t('common.close') }}</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--fat-space-md);
  flex-wrap: wrap;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: var(--fat-space-sm);
  min-width: 0;
}

.filename {
  font-size: 16px;
  font-weight: 600;
  color: var(--fat-text-primary, #1f2937);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: var(--fat-space-xs);
}

.preview-content {
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
}

/* The structured JSON panes scroll inside themselves so the toolbar and the notices stay put while
   the rows move — the same reason `.doc-frame` takes a fixed height instead of growing the dialog.
   `min-height` from the rule above still wins on a short viewport, and the panes flex to whatever
   the frame actually is. */
.preview-content.is-json-pane {
  display: flex;
  flex-direction: column;
  height: 70vh;
  overflow: hidden;
}

.preview-content.is-json-pane > * {
  flex: 1;
  min-height: 0;
}

.preview-content.is-json-pane > .json-note {
  flex: none;
}

.json-note {
  margin: 0 0 var(--fat-space-sm);
  padding: var(--fat-space-xs) var(--fat-space-sm);
  border-radius: var(--fat-radius-sm);
  background: var(--fat-surface-2);
  font-size: 12px;
  color: var(--fat-text-secondary);
}

/* The "this file is not JSON" line sits in the header row, where the view switcher would otherwise
   be; it has to be readable as a status, not as a control that went missing. */
.json-hint {
  font-size: 12px;
  color: var(--fat-text-secondary);
}

.text-preview {
  margin: 0;
  padding: var(--fat-space-md);
  background: var(--fat-surface-2, #fafbfc);
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: var(--fat-radius-md, 8px);
  font-family: var(--fat-font-mono, 'SF Mono', Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  color: var(--fat-text-regular, #303133);
}

.doc-frame {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: var(--fat-radius-md, 8px);
  background: #fff;
}

.render-loading,
.render-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: var(--fat-text-secondary);
  font-size: 13px;
}

.image-preview {
  display: flex;
  justify-content: center;
  padding: var(--fat-space-md);
  background: var(--fat-surface, #f0f2f5);
  border-radius: var(--fat-radius-md, 8px);
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  transform-origin: top center;
  transition: transform var(--fat-duration-base) var(--fat-ease-standard);
  border-radius: var(--fat-radius-md, 8px);
  box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
}

.pdf-preview {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--fat-border, #ebeef5);
  border-radius: var(--fat-radius-md, 8px);
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.file-size {
  font-size: 12px;
  color: var(--fat-text-secondary);
}
</style>
