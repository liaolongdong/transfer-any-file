import type { WorkSheet } from 'xlsx';

/**
 * CSV formula-injection guard.
 *
 * A CSV cell whose text begins with `=`, `+`, `-`, `@`, TAB or CR is re-parsed as a *formula*
 * when the file is opened in Excel, so data this extension emits (from JSON objects or from
 * string worksheet cells) can execute on the user's spreadsheet afterward. Prefixing an
 * apostrophe makes Excel render the value literally; numbers are untouched because they are
 * typed as numeric cells upstream and never reach the string branch.
 */
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/** Guard a single string destined for CSV output. */
export function guardCsvValue(value: string): string {
  return DANGEROUS_PREFIX.test(value) ? `'${value}` : value;
}

/**
 * Neutralize dangerous string cells of a worksheet in place before `sheet_to_csv`.
 *
 * Only `t: 's'` cells are touched — numeric, date, boolean and formula-result cells are
 * serialized from their typed values, not re-parsed as text by Excel. The stale cached
 * formatted text (`w`) is dropped so the emitted CSV shows the guarded value.
 */
export function guardFormulaCells(sheet: WorkSheet): WorkSheet {
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const cell = sheet[key];
    if (cell && cell.t === 's' && typeof cell.v === 'string' && DANGEROUS_PREFIX.test(cell.v)) {
      cell.v = `'${cell.v}`;
      delete cell.w;
    }
  }
  return sheet;
}
