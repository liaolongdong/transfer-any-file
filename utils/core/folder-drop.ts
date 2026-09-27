import { formatFromFilename } from '~/utils/core/file-detect';

/**
 * One item of a drop, as far as the intake pipeline cares.
 *
 * `directory` keeps the raw entry because that is the only handle to its children; `file` is
 * already the `File` the pipeline consumes, so a drop with no folders in it costs nothing extra.
 */
export type DroppedItem =
  { kind: 'file'; file: File } | { kind: 'directory'; name: string; entry: FileSystemDirectoryEntry };

export interface CollectedDrop {
  files: File[];
  /** How many of `files` came out of a folder rather than being dropped directly. */
  fromFolders: number;
  /**
   * Why the walk stopped early, or `null` when it finished:
   *
   * - `'cap'`: `limit` importable files were collected and the rest was left behind.
   * - `'scan'`: the scan budget ran out, or a directory sat below {@link MAX_DEPTH}.
   */
  truncated: 'cap' | 'scan' | null;
}

/**
 * Directories below this depth are not walked.
 *
 * The entry API resolves symlinks into the tree, so a folder containing a link to one of its own
 * ancestors is an infinite descent; a bound also keeps a pathological drop from running forever.
 * Real document trees that a user drags in are single digits deep.
 */
const MAX_DEPTH = 12;
/** Entries read from directory readers before giving up, so a huge unsupported tree costs a
 *  bounded scan instead of the whole folder. Counts batches, not kept files. */
const SCAN_BUDGET = 5000;

/** The same accept list the picker offers: everything convertible, plus archives to expand. */
function isImportable(name: string): boolean {
  return name.toLowerCase().endsWith('.zip') || formatFromFilename(name) !== null;
}

function readBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise(resolve => {
    // A failed read yields an empty batch: the walk stops at that directory rather than
    // rejecting the whole drop over one unreadable subfolder.
    reader.readEntries(resolve, () => resolve([]));
  });
}

function fileOf(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise(resolve => {
    entry.file(
      file => resolve(file),
      () => resolve(null),
    );
  });
}

/**
 * Read a drop event into items the pipeline can work with.
 *
 * **This has to run while the `drop` handler is still on the stack.** `webkitGetAsEntry()` only
 * answers before the event is over — once the handler returns, the browser has revoked the entries
 * and every one of them comes back `null` — so the asynchronous walk takes this array as its
 * argument instead of reaching into the event itself.
 */
export function snapshotDrop(dataTransfer: DataTransfer | null): DroppedItem[] {
  const items = dataTransfer?.items;
  if (!items || items.length === 0) {
    return Array.from(dataTransfer?.files ?? []).map(file => ({ kind: 'file' as const, file }));
  }
  const out: DroppedItem[] = [];
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry();
    if (entry?.isDirectory) {
      out.push({ kind: 'directory', name: entry.name, entry: entry as FileSystemDirectoryEntry });
      continue;
    }
    const file = item.getAsFile();
    if (file) out.push({ kind: 'file', file });
  }
  return out;
}

/**
 * Flatten the folders in a drop into the files they hold.
 *
 * Only names the picker would have accepted are kept, mirroring how an archive's entries are
 * filtered: dropping a downloads folder should contribute its documents and images, not spend the
 * batch cap on every `.exe` and `.tmp` next to them. Dotfiles and `__MACOSX` are skipped for the
 * same reason they are skipped when unzipping.
 *
 * `readEntries()` reports a directory in chunks (the browser caps each call), so a folder is only
 * fully read once a call comes back empty — reading one batch is how a directory of 300 files
 * silently becomes 100.
 */
export async function collectDropped(items: DroppedItem[], limit: number): Promise<CollectedDrop> {
  const files: File[] = [];
  let scanned = 0;
  let truncated: CollectedDrop['truncated'] = null;
  let stopped = false;
  const queue = items
    .filter((item): item is Extract<DroppedItem, { kind: 'directory' }> => item.kind === 'directory')
    .map(item => ({ ...item, depth: 0 }));

  for (const item of items) {
    if (item.kind === 'file') {
      if (files.length >= limit) {
        truncated = 'cap';
        break;
      }
      files.push(item.file);
    }
  }
  const loose = files.length;

  while (queue.length > 0 && !stopped) {
    const dir = queue.shift()!;
    if (dir.depth >= MAX_DEPTH) {
      truncated ??= 'scan';
      continue;
    }
    const children: FileSystemEntry[] = [];
    const reader = dir.entry.createReader();
    for (;;) {
      const batch = await readBatch(reader);
      if (batch.length === 0) break;
      children.push(...batch);
      scanned += batch.length;
      if (scanned > SCAN_BUDGET) {
        truncated ??= 'scan';
        stopped = true;
        break;
      }
    }
    for (const child of children) {
      if (child.name.startsWith('.') || child.name === '__MACOSX') continue;
      if (child.isDirectory) {
        queue.push({
          kind: 'directory',
          name: child.name,
          entry: child as FileSystemDirectoryEntry,
          depth: dir.depth + 1,
        });
        continue;
      }
      if (!isImportable(child.name)) continue;
      if (files.length >= limit) {
        truncated ??= 'cap';
        stopped = true;
        break;
      }
      const file = await fileOf(child as FileSystemFileEntry);
      if (file) files.push(file);
    }
  }

  return { files, fromFolders: files.length - loose, truncated };
}
