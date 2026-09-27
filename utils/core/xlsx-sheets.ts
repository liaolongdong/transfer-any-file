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
