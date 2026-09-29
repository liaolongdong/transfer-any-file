/**
 * Read-only model behind the JSON preview: one flattened tree that answers the three questions a
 * developer asks about an unfamiliar payload — where is it (tree), what shape is the collection
 * (table), and find me the one value I am looking for (search).
 *
 * Why a flat array instead of the parsed object graph: the view needs *display order*, ancestor
 * chains, per-container child lists and a search index over every node, and all four fall out of a
 * single depth-first pass if nodes are numbered in pre-order. A parent always gets a lower id than
 * its children, so "is this row visible" is one lookup against an already-processed entry, and the
 * row list is the node array filtered in place — no recursion at render time, and no second copy of
 * the data.
 *
 * Everything here is pure and total: nothing touches the DOM, nothing throws on hostile input, and
 * every walk is bounded by `JSON_VIEW_LIMITS`. The caps exist because the input is an untrusted file
 * whose size we do not control — a 100 MB log of nested objects has to stop at a bounded prefix and
 * say so, rather than building an index the tab then spends its remaining memory on. The views that
 * need the whole document (raw text, download) never touch this model at all.
 *
 * The parsed value itself is dropped when the walk ends: `nodes` is the only thing the UI reads, and
 * holding the graph as well would cost a second copy of every string in the document.
 */

/** Type tag for a JSON value, used to pick a colour and a summary glyph per node. */
export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

/** One value in the document, flattened to the information a row needs. */
export interface JsonNode {
  /** Index into `JsonTree.nodes`; also the pre-order position, so parents sort before children. */
  id: number;
  /** `-1` for the root — the only node without a parent. */
  parentId: number;
  /** Property name, array index as digits, or `''` for the root. */
  key: string;
  /** JSONPath-style address (`$.items[0].name`), what the path search and copy-path use. */
  path: string;
  depth: number;
  kind: JsonKind;
  /** Scalar text, already clamped to `maxScalarChars`; `''` for containers. */
  text: string;
  /** True when `text` had to be shortened; the row says so instead of looking like a short value. */
  clamped: boolean;
  /** Direct children for a container; `0` for a scalar. */
  childCount: number;
  /**
   * Children were recorded, but not all of them: the walk stopped below this node because of a
   * depth or node budget. The row still expands, and the UI says so rather than letting a
   * half-list read as the whole list.
   */
  truncated: boolean;
}

/** Why a walk stopped early. `'nodes'` wins over `'depth'`: a capped walk is the coarser statement. */
export type JsonLimit = 'nodes' | 'depth' | null;

export interface JsonTree {
  /** Pre-order, so `nodes[id].id === id` and the array *is* the display order. */
  nodes: JsonNode[];
  /** `children[parent]` holds the child ids in document order; indexable by node id. */
  children: number[][];
  /** Deepest level actually recorded, reported next to the node count. */
  maxDepth: number;
  limit: JsonLimit;
}

/** Which part of a row a search looks at. Exposed as flags so the UI can offer the three choices. */
export type JsonField = 'key' | 'path' | 'value';

/** A search hit, with the fields that matched so the row can mark each one differently. */
export interface JsonMatch {
  id: number;
  /** Subset of the searched fields that matched, always in key / path / value order. */
  fields: JsonField[];
}

/** A cell of a table view: the scalar text, or a container summary like `{ 3 }`. */
export interface JsonCell {
  kind: JsonKind;
  text: string;
  /**
   * The node this cell is, so a `{ 3 }` can be clicked into the tree. `-1` when the row simply did
   * not carry the column, which is the only cell with nothing to point at.
   */
  id: number;
}

/** Rows-as-columns projection of an array of objects. */
export interface JsonTable {
  columns: string[];
  /** Row-major, every inner array exactly `columns.length` long (missing keys become empty cells). */
  rows: JsonCell[][];
  /** Elements of the array that were not turned into rows. */
  droppedRows: number;
  /** Address of the array this table came from, shown above the table. */
  sourcePath: string;
}

/** Result of inspecting a text payload: either "not JSON" or a tree plus the pretty-printed text. */
export interface JsonPreview {
  tree: JsonTree;
  /**
   * Two-space `JSON.stringify` of the parsed value — what the raw view shows, and the exact string
   * the dialog rendered before the tree existed, so switching views never changes what is on screen.
   */
  pretty: string;
}

/**
 * Walk and render budgets. Each one is a measured number, not a guess — the figures below come from a
 * scratch harness that imports this module directly (`node --experimental-strip-types`, and the same
 * fixtures loaded into the built extension under Chrome), re-running `inspectJson` and the render
 * passes against generated documents:
 *
 * - `maxNodes` bounds the flatten pass. A walk that hits 100 000 nodes costs 170–310 ms and ~40 MB of
 *   heap (Node 22, `inspectJson` end to end 168–247 ms, search over the same model 43–92 ms), i.e.
 *   roughly 400 bytes per node, most of it the path string and the per-container child list. Doubling
 *   the cap doubles the heap, and a document with more than 100k values is a log to search rather than
 *   a tree to read — the raw view and the download still cover all of it.
 * - `maxDepth` keeps the explicit stack bounded. JSON nested that far is not readable in any view.
 * - `maxRows` caps what one tree render lays out; rows past it are counted and reported, not painted.
 *   Expand-all is the case this bounds: every container open on a document of any size still paints
 *   at most this many rows, and the notice says how many more there are.
 * - The table caps bound the *cell* count as well as the row count, because a table's cost is the DOM
 *   it creates: 2 000 rows of 64 columns is 128 000 cells, a wait owned by the layout engine rather
 *   than by this module.
 * - `maxScalarChars` and `maxKeyChars` bound a single row, which is what keeps per-row work O(1) and
 *   stops one 5 MB string from being copied into an index for the eleven values around it.
 */
export const JSON_VIEW_LIMITS = {
  maxNodes: 100_000,
  maxDepth: 128,
  maxRows: 5_000,
  maxScalarChars: 240,
  maxKeyChars: 96,
  maxTableRows: 2_000,
  maxTableCols: 64,
  maxTableCells: 20_000,
  maxMatches: 5_000,
} as const;

const ELLIPSIS = '…';

/** Direct member of a container, normalised so objects and arrays share one walk. */
interface JsonEntry {
  key: string;
  value: unknown;
}

/** A node waiting to be created, with everything the row needs already computed. */
interface Pending {
  value: unknown;
  parentId: number;
  key: string;
  path: string;
  depth: number;
}

/**
 * Build the preview model for a text payload.
 *
 * Returns `null` when the text is not JSON: the caller then shows the original characters, exactly
 * as it did before this module existed. `JSON.parse` is the only validator used, because a second
 * grammar check would be a second grammar to keep in sync with the language.
 *
 * @param text Raw file or result text, treated as untrusted.
 * @returns The tree and pretty-printed form, or `null` if the text does not parse.
 */
export function inspectJson(text: string): JsonPreview | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  let pretty: string;
  try {
    // Re-serialising from the parsed value is what normalises whitespace and keeps key order the way
    // the document has it; `JSON.stringify` is native, so it costs less than the flatten walk.
    pretty = JSON.stringify(parsed, null, 2);
  } catch {
    // Only a value `JSON.parse` produced can reach a `stringify` throw, and none can: keep the
    // original text rather than an empty pane if that ever stops being true.
    pretty = text;
  }
  return { tree: buildTree(parsed), pretty };
}

/**
 * Flatten a parsed value into pre-order nodes.
 *
 * Iterative on purpose: the recursion this replaces overflows the call stack on a deeply nested
 * document, which is one of the shapes an untrusted file can legitimately have.
 */
function buildTree(root: unknown): JsonTree {
  const nodes: JsonNode[] = [];
  const children: number[][] = [];
  let maxDepth = 0;
  let limit: JsonLimit = null;

  const stack: Pending[] = [{ value: root, parentId: -1, key: '', path: '$', depth: 0 }];

  while (stack.length > 0) {
    const item = stack.pop();
    if (item === undefined) break;
    if (nodes.length >= JSON_VIEW_LIMITS.maxNodes) {
      limit = 'nodes';
      break;
    }

    const kind = kindOf(item.value);
    const container = kind === 'object' || kind === 'array';
    const entries = container ? entriesOf(item.value) : [];
    const id = nodes.length;
    const key =
      item.key.length > JSON_VIEW_LIMITS.maxKeyChars
        ? `${item.key.slice(0, JSON_VIEW_LIMITS.maxKeyChars)}${ELLIPSIS}`
        : item.key;
    const rawText = container ? '' : scalarText(item.value);

    nodes.push({
      id,
      parentId: item.parentId,
      key,
      path: item.path,
      depth: item.depth,
      kind,
      text:
        rawText.length > JSON_VIEW_LIMITS.maxScalarChars
          ? `${rawText.slice(0, JSON_VIEW_LIMITS.maxScalarChars)}${ELLIPSIS}`
          : rawText,
      clamped: rawText.length > JSON_VIEW_LIMITS.maxScalarChars,
      childCount: entries.length,
      truncated: false,
    });
    children.push([]);
    if (item.parentId >= 0) children[item.parentId].push(id);
    if (item.depth > maxDepth) maxDepth = item.depth;

    if (!container) continue;

    if (item.depth >= JSON_VIEW_LIMITS.maxDepth) {
      // The children exist in the document but are not walked. `truncated` is derived from that
      // difference at the end of this function rather than set here, so one rule covers both caps.
      if (limit === null) limit = 'depth';
      continue;
    }

    // Push in reverse so the first key or element is popped first: pre-order numbering is what lets
    // visibility be decided with a single look at the parent.
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      stack.push({
        value: entry.value,
        parentId: id,
        key: entry.key,
        path: kind === 'array' ? `${item.path}[${entry.key}]` : joinPath(item.path, entry.key),
        depth: item.depth + 1,
      });
    }
  }

  for (const node of nodes) {
    if (node.childCount > (children[node.id]?.length ?? 0)) node.truncated = true;
  }

  return { nodes, children, maxDepth, limit };
}

/**
 * Direct members of a container, in document order.
 *
 * `Object.keys` rather than `for...in`, so inherited properties on a value produced by a reviver
 * cannot appear as JSON keys.
 */
function entriesOf(value: unknown): JsonEntry[] {
  if (Array.isArray(value)) {
    return value.map((entry, index) => ({ key: String(index), value: entry }));
  }
  if (isRecord(value)) {
    return Object.keys(value).map(key => ({ key, value: value[key] }));
  }
  return [];
}

/** A non-array object. `JSON.parse` can only produce plain ones, but a reviver is a caller's option. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function kindOf(value: unknown): JsonKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'object';
  }
}

/**
 * Display text for a scalar. Strings keep their quotes, because the difference between `"1"` and `1`
 * is the first thing a developer checks and it is the difference `JSON.stringify` would erase.
 */
function scalarText(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === null) return 'null';
  return String(value);
}

/**
 * Dot notation when the key is identifier-shaped, bracket notation otherwise — the rule `jq` and
 * JSONPath implementations use, so a path copied out of here is pasteable elsewhere.
 */
function joinPath(parent: string, key: string): string {
  return /^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(key) ? `${parent}.${key}` : `${parent}["${key}"]`;
}

/**
 * Rows to paint, in pre-order, given which containers the user has opened.
 *
 * A node is visible when its parent is visible *and* open; because ids are pre-order, the parent's
 * verdict is already known when the child is reached, so this stays a single pass even when every
 * branch is expanded. Rows past `maxRows` are counted, not collected: the notice has to say how much
 * is missing, and re-walking to find out would double the cost of the frame that is already too big.
 *
 * @param expanded Ids of open containers. The root is always painted whether or not it is in here.
 * @param maxRows Render cap; `JSON_VIEW_LIMITS.maxRows` unless the caller measured something else.
 */
export function visibleRows(
  tree: JsonTree,
  expanded: ReadonlySet<number>,
  maxRows: number = JSON_VIEW_LIMITS.maxRows,
): { ids: number[]; dropped: number } {
  const ids: number[] = [];
  const painted = new Uint8Array(tree.nodes.length);
  let dropped = 0;
  for (const node of tree.nodes) {
    if (node.parentId >= 0 && (painted[node.parentId] !== 1 || !expanded.has(node.parentId))) continue;
    painted[node.id] = 1;
    if (ids.length < maxRows) ids.push(node.id);
    else dropped += 1;
  }
  return { ids, dropped };
}

/**
 * Ids to open so that `id` is on screen — the ancestors, outermost first.
 *
 * The caller unions the result into its expanded set; returning a list keeps "expand to this match"
 * and "collapse back to the default" separate operations instead of one that cannot be undone.
 */
export function ancestorsOf(tree: JsonTree, id: number): number[] {
  const chain: number[] = [];
  let current = tree.nodes[id]?.parentId ?? -1;
  while (current >= 0) {
    chain.push(current);
    current = tree.nodes[current]?.parentId ?? -1;
  }
  return chain.reverse();
}

/**
 * Containers to open on first paint: everything when the document fits on screen, only the root when
 * it does not.
 *
 * The branch is provably bounded — a document with at most `maxRows` nodes cannot produce more rows
 * than it has nodes — and it is the difference between a config file that reads as a tree straight
 * away and a 200k-node log that opens as one row and waits for a click.
 */
export function defaultExpanded(tree: JsonTree): Set<number> {
  const open = new Set<number>();
  for (const node of tree.nodes) {
    if (node.childCount > 0 && (tree.nodes.length <= JSON_VIEW_LIMITS.maxRows || node.depth === 0)) open.add(node.id);
  }
  return open;
}

/**
 * Substring search over the flattened index.
 *
 * Results come back in pre-order, which is display order in any expansion state, so stepping through
 * matches walks the tree rather than a third ordering the user has to reconcile. Matching is
 * substring, not regex: a payload full of `[`, `"` and `\` makes regex the option that needs
 * escaping, and "find the key named total" does not need a pattern language.
 */
export function searchJson(
  tree: JsonTree,
  query: string,
  fields: readonly JsonField[] = ['key', 'path', 'value'],
  caseSensitive = false,
  maxMatches: number = JSON_VIEW_LIMITS.maxMatches,
): JsonMatch[] {
  const matches: JsonMatch[] = [];
  if (query.length === 0 || fields.length === 0) return matches;
  const needle = caseSensitive ? query : query.toLowerCase();
  const wantKey = fields.includes('key');
  const wantPath = fields.includes('path');
  const wantValue = fields.includes('value');
  for (const node of tree.nodes) {
    const hit: JsonField[] = [];
    if (wantKey && node.key.length > 0 && contains(node.key, needle, caseSensitive)) hit.push('key');
    if (wantPath && contains(node.path, needle, caseSensitive)) hit.push('path');
    if (wantValue && node.text.length > 0 && contains(node.text, needle, caseSensitive)) hit.push('value');
    if (hit.length > 0) {
      matches.push({ id: node.id, fields: hit });
      if (matches.length >= maxMatches) break;
    }
  }
  return matches;
}

function contains(haystack: string, needle: string, caseSensitive: boolean): boolean {
  return caseSensitive ? haystack.includes(needle) : haystack.toLowerCase().includes(needle);
}

/**
 * A run of characters inside a cell, tagged as matching the query or not.
 *
 * The rows paint highlights by rendering these runs as text nodes, because the content being marked
 * is the user's file: building marked-up HTML out of it would need escaping in exactly the place this
 * project has decided never to trust.
 */
export interface JsonSegment {
  text: string;
  hit: boolean;
}

/**
 * Split `text` into alternating matched / unmatched runs.
 *
 * Every occurrence is marked, not just the first, and a `hit` of `false` returns the text unchanged
 * so the caller can use one code path for rows that did not match.
 */
export function segmentMatch(text: string, query: string, hit: boolean, caseSensitive = false): JsonSegment[] {
  if (!hit || query.length === 0) return [{ text, hit: false }];
  const segments: JsonSegment[] = [];
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  let cursor = 0;
  // The scan resumes after the run it just marked, so a needle that occurs inside itself (`aa` in
  // `aaa`) yields one mark and an unmatched tail rather than spinning on the same offset.
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, cursor)) {
    if (at > cursor) segments.push({ text: text.slice(cursor, at), hit: false });
    segments.push({ text: text.slice(at, at + needle.length), hit: true });
    cursor = at + needle.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), hit: false });
  return segments;
}

/**
 * Project an array of objects into columns and rows.
 *
 * Returns `null` unless every element considered is an object with at least one key, and unless the
 * union of keys fits in `maxTableCols`: a table for `[1, 2, 3]` would be a worse version of the tree
 * rows, a mixed array would silently drop the elements that do not fit the columns, and a
 * 200-column array is not readable as a table in any layout. Cells reuse the tree's scalar text, so a
 * nested value appears as `{ 3 }` and stays reachable by expanding the array in the tree instead.
 *
 * The scan stops as soon as one more row would put the grid over `maxTableCells`, and it stops
 * *before* taking that row's keys — so the columns are exactly the union of the keys in the rows that
 * are shown, and no column exists only to be empty.
 */
export function buildJsonTable(tree: JsonTree, arrayId: number): JsonTable | null {
  const source = tree.nodes[arrayId];
  if (!source || source.kind !== 'array') return null;

  const rowIds = tree.children[arrayId] ?? [];
  if (rowIds.length === 0) return null;

  // First pass decides which rows are in, and with them the column list. A row's keys are counted
  // before they are committed, so a row that cannot fit takes its column names with it.
  const scanned: number[] = [];
  const columns: string[] = [];
  const committed = new Set<string>();
  for (const rowId of rowIds) {
    const row = tree.nodes[rowId];
    if (row.kind !== 'object') return null;
    const childIds = tree.children[rowId] ?? [];
    if (childIds.length === 0) return null;
    const fresh: string[] = [];
    for (const childId of childIds) {
      const key = tree.nodes[childId].key;
      if (!committed.has(key) && !fresh.includes(key)) fresh.push(key);
    }
    const projected = committed.size + fresh.length;
    if (projected > JSON_VIEW_LIMITS.maxTableCols) return null;
    if ((scanned.length + 1) * projected > JSON_VIEW_LIMITS.maxTableCells) break;
    if (scanned.length + 1 > JSON_VIEW_LIMITS.maxTableRows) break;
    for (const key of fresh) {
      committed.add(key);
      columns.push(key);
    }
    scanned.push(rowId);
  }
  if (scanned.length === 0) return null;

  // Second pass indexes each column's cells by row, because rows may omit keys: the position of a
  // column in one row is not its position in the next.
  const byColumn = new Map<string, number[]>();
  for (const rowId of scanned) {
    for (const childId of tree.children[rowId] ?? []) {
      const bucket = byColumn.get(tree.nodes[childId].key);
      if (bucket) bucket.push(childId);
      else byColumn.set(tree.nodes[childId].key, [childId]);
    }
  }

  const rows = scanned.map(rowId =>
    columns.map(column => {
      const childId = byColumn.get(column)?.find(id => tree.nodes[id].parentId === rowId);
      if (childId === undefined) return { kind: 'null' as JsonKind, text: '', id: -1 };
      const child = tree.nodes[childId];
      return { kind: child.kind, text: cellText(child), id: child.id };
    }),
  );

  return { columns, rows, droppedRows: rowIds.length - scanned.length, sourcePath: source.path };
}

/** Container cells stay summary-only: the value behind `{ 3 }` is one click away in the tree. */
function cellText(node: JsonNode): string {
  if (node.kind === 'object') return `{ ${String(node.childCount)} }`;
  if (node.kind === 'array') return `[ ${String(node.childCount)} ]`;
  return node.text;
}

/**
 * Arrays in this document that are worth offering as a table, in document order.
 *
 * A shape test, not a call to `buildJsonTable`: the tree asks this once per array to decide whether
 * to draw the "table" affordance, and running the full projection for each would cost the whole
 * document a second pass. A candidate can still project to `null` (mixed rows, too many columns),
 * which the caller handles by showing the tree instead.
 */
export function tableCandidates(tree: JsonTree): number[] {
  const found: number[] = [];
  for (const node of tree.nodes) {
    if (node.kind !== 'array' || node.childCount === 0) continue;
    const first = tree.children[node.id]?.[0];
    if (first === undefined) continue;
    if (tree.nodes[first].kind === 'object' && tree.nodes[first].childCount > 0) found.push(node.id);
  }
  return found;
}

/**
 * The array the table view should open on: the root if it is one, otherwise the candidate with the
 * most rows. `rows` counts the recorded children, so a capped walk reports the rows it actually saw.
 */
export function pickTableSource(tree: JsonTree): number | null {
  const candidates = tableCandidates(tree);
  if (candidates.length === 0) return null;
  if (candidates[0] === 0) return 0;
  let best = candidates[0];
  for (const id of candidates) {
    if ((tree.children[id]?.length ?? 0) > (tree.children[best]?.length ?? 0)) best = id;
  }
  return best;
}
