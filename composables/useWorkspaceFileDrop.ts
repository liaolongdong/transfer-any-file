import { onMounted, onUnmounted, ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

/**
 * Options for {@linkcode useWorkspaceFileDrop}.
 */
export interface WorkspaceFileDropOptions {
  /**
   * Whether a drop must be swallowed. While it is true the overlay is never shown and nothing reaches
   * the uploader — a batch in flight freezes the file list, and a modal on screen must not have a
   * `z-index: 9999` veil painted over it.
   *
   * A getter is accepted alongside a ref because part of that answer lives in the DOM rather than in
   * reactive state: see `~/utils/core/modal-lock`. Every read here happens inside a drag event, so a
   * getter is evaluated on demand instead of caching a stale answer the way a `computed` would.
   */
  isLocked: MaybeRefOrGetter<boolean>;
  /**
   * Receives the dropped `DataTransfer` itself rather than a file list, because folders are read
   * through the `DataTransfer`; whatever consumes it decides what can actually be taken in.
   */
  onFilesDropped: (dataTransfer: DataTransfer | null) => void;
}

/**
 * Page-wide file drop for the workbench.
 *
 * `FileUpload` has its own drop zone, but on a tall page people miss it, so a drop anywhere counts.
 * The listeners sit on `document` and the enter/leave counter tolerates the nested enter/leave pairs
 * the browser fires for every element the cursor crosses — a plain `mouseleave` would flicker the
 * overlay off as soon as the pointer reached a child.
 *
 * Extracted from `entrypoints/options/App.vue`, which only keeps the overlay markup and the drop
 * target; the `v-if` there reads the same `isWorkspaceDragging` ref this returns.
 */
export function useWorkspaceFileDrop({ isLocked, onFilesDropped }: WorkspaceFileDropOptions) {
  const isWorkspaceDragging = ref(false);
  let dragCounter = 0;

  /** True only for a drag carrying files, so dragging text or a link never raises the overlay. */
  function isFileDrag(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    // DataTransferItemList is array-like, DataTransfer.types is DOMStringList in
    // some engines; Array.from covers both.
    return Array.from(types).includes('Files');
  }

  function handleDragEnter(event: DragEvent): void {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragCounter += 1;
    if (!toValue(isLocked)) isWorkspaceDragging.value = true;
  }

  function handleDragOver(event: DragEvent): void {
    if (!isFileDrag(event)) return;
    // Without preventDefault the browser refuses the drop
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = toValue(isLocked) ? 'none' : 'copy';
  }

  function handleDragLeave(event: DragEvent): void {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) isWorkspaceDragging.value = false;
  }

  function handleDrop(event: DragEvent): void {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragCounter = 0;
    isWorkspaceDragging.value = false;
    if (toValue(isLocked)) return;
    // The drop zone's own handler has already seen this event if the drop landed on it; the guard
    // inside `intakeDrop` is what makes the second visit a no-op.
    onFilesDropped(event.dataTransfer);
  }

  onMounted(() => {
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
  });

  onUnmounted(() => {
    document.removeEventListener('dragenter', handleDragEnter);
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);
  });

  return { isWorkspaceDragging };
}
