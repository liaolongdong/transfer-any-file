import type { WorkBook, WorkSheet } from 'xlsx';

/**
 * Worksheet lookup for untrusted workbook names.
 *
 * `SheetNames` and `Sheets` both come out of a parsed file, so a sheet literally named `toString`,
 * `constructor` or `valueOf` makes `workbook.Sheets[name]` resolve to something inherited from
 * `Object.prototype` — truthy, but not a worksheet. Every consumer here treats "the name has a
 * sheet" as the gate for rendering or serializing it, so the inherited value passes the gate and
 * the converter then produces an empty phantom sheet (or throws inside SheetJS) for a document that
 * has no such sheet at all. Same rule `utils/core/file-detect.ts` applies to its lookup tables.
 */
export function ownSheet(workbook: WorkBook, name: string): WorkSheet | undefined {
  return Object.hasOwn(workbook.Sheets, name) ? workbook.Sheets[name] : undefined;
}

/** The workbook's sheet names that actually address a worksheet, in document order. */
export function ownSheetNames(workbook: WorkBook): string[] {
  return workbook.SheetNames.filter(name => Object.hasOwn(workbook.Sheets, name));
}

/**
 * Serialization budget, counted in cells of the rectangle the serializer walks.
 *
 * SheetJS trusts `!ref` — the `<dimension>` element of the file — for `sheet_to_json`,
 * `sheet_to_html` and `sheet_to_csv`. A 1.5 KB workbook can declare `A1:XFD1048576` while holding
 * one cell, and each of those functions then walks 17 179 869 184 coordinates: measured here as a
 * conversion that never returns. The cells actually present are the honest extent, so a worksheet
 * whose declared rectangle runs past them is narrowed instead of believed.
 *
 * The budget is about work, not data: the rectangle is what gets walked, so a genuinely dense
 * sheet over the limit is refused as well. Failing with one clear message beats freezing the
 * workbench, and beats the alternative of silently truncating a document the user asked to keep.
 */
const MAX_SHEET_CELLS = 500_000;

/** Sheets are serialized one after another, so a per-sheet cap alone still lets many files add up. */
const MAX_WORKBOOK_CELLS = 1_000_000;

interface CellRange {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/** Cell keys SheetJS generates: letters, then a 1-based row. Bounded so a hostile key cannot be long. */
const CELL_KEY = /^([A-Z]{1,6})([1-9]\d{0,8})$/;

/** A1-style reference from `!ref`, with optional `$` anchors and an optional range half. */
const REF = /^\$?([A-Za-z]{1,6})\$?([1-9]\d{0,8})(?::\$?([A-Za-z]{1,6})\$?([1-9]\d{0,8}))?$/;

/** `A` -> 0, `Z` -> 25, `AA` -> 26. */
function columnIndex(letters: string): number {
  let index = 0;
  for (const letter of letters.toUpperCase()) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function encodeColumn(index: number): string {
  let letters = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function encodeRange(range: CellRange): string {
  const start = `${encodeColumn(range.c0)}${range.r0 + 1}`;
  if (range.r0 === range.r1 && range.c0 === range.c1) return start;
  return `${start}:${encodeColumn(range.c1)}${range.r1 + 1}`;
}

function parseRef(ref: unknown): CellRange | null {
  if (typeof ref !== 'string' || ref.length > 40) return null;
  const match = REF.exec(ref.trim());
  if (!match) return null;
  const r0 = Number(match[2]) - 1;
  const c0 = columnIndex(match[1]);
  const r1 = match[4] === undefined ? r0 : Number(match[4]) - 1;
  const c1 = match[3] === undefined ? c0 : columnIndex(match[3]);
  return { r0: Math.min(r0, r1), c0: Math.min(c0, c1), r1: Math.max(r0, r1), c1: Math.max(c0, c1) };
}

/** The rectangle covered by the cells that are actually in the sheet object. */
function cellRange(sheet: WorkSheet): CellRange | null {
  let r0 = Number.POSITIVE_INFINITY;
  let c0 = Number.POSITIVE_INFINITY;
  let r1 = -1;
  let c1 = -1;
  for (const key of Object.keys(sheet)) {
    if (key.charCodeAt(0) === 33) continue; // `!ref`, `!merges`, …
    const match = CELL_KEY.exec(key);
    if (!match) continue;
    const row = Number(match[2]) - 1;
    const column = columnIndex(match[1]);
    if (row < r0) r0 = row;
    if (row > r1) r1 = row;
    if (column < c0) c0 = column;
    if (column > c1) c1 = column;
  }
  return r1 >= 0 ? { r0, c0, r1, c1 } : null;
}

/**
 * The rectangle a serializer should walk: the declared top-left (so leading blank rows and columns
 * keep their meaning) and the last cell that actually exists, never the declared far corner.
 *
 * When the declared range is missing or malformed the sparse extent becomes the range outright — a
 * file that cannot describe its own dimensions does not get to have one. Cells outside the declared
 * range stay outside, exactly as SheetJS already treats them.
 */
function effectiveRange(declared: CellRange | null, cells: CellRange | null): CellRange | null {
  if (!cells) return declared ? { r0: declared.r0, c0: declared.c0, r1: declared.r0, c1: declared.c0 } : null;
  if (!declared) return cells;
  return {
    r0: declared.r0,
    c0: declared.c0,
    r1: Math.max(declared.r0, Math.min(declared.r1, cells.r1)),
    c1: Math.max(declared.c0, Math.min(declared.c1, cells.c1)),
  };
}

/** Narrow one sheet's `!ref` and return the number of cells its serializer will walk. */
function boundSheet(sheet: WorkSheet): number {
  const range = effectiveRange(parseRef(sheet['!ref']), cellRange(sheet));
  if (!range) return 0;
  const cells = (range.r1 - range.r0 + 1) * (range.c1 - range.c0 + 1);
  if (!Number.isFinite(cells) || cells > MAX_SHEET_CELLS) throw new Error('errors.sheetTooLarge');
  sheet['!ref'] = encodeRange(range);
  return cells;
}

/**
 * Apply {@link boundSheet} to every worksheet and enforce the workbook-wide budget.
 *
 * Call this immediately after `XLSX.read` and before any `sheet_to_*` call, including the preview
 * renderer: those functions are the ones that walk `!ref`, and a forged dimension reaches them
 * through every converter that accepts a workbook.
 */
export function boundWorkbook(workbook: WorkBook): void {
  let total = 0;
  for (const name of ownSheetNames(workbook)) {
    const sheet = ownSheet(workbook, name);
    if (!sheet) continue;
    total += boundSheet(sheet);
    if (total > MAX_WORKBOOK_CELLS) throw new Error('errors.sheetTooLarge');
  }
}
