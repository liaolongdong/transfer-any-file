import type { WorkSheet } from 'xlsx';

/**
 * Worksheet cell → serialized text policy.
 *
 * Three things decide what a spreadsheet cell contributes to a text artifact, and each one has
 * measured behaviour that contradicts the option name:
 *
 * - `guardCsvValue` / `guardFormulaCells` — whether the emitted text can be re-executed by Excel
 *   when the artifact is opened (CSV formula injection).
 * - `normalizeDateCells` — which rendering of a date is the cell's *value*. A date cell's stored
 *   value is a day serial, which is worthless in CSV/JSON, so the read-time rendering is the value;
 *   the two-form rule below is what makes it machine-readable.
 *
 * Numbers, booleans and text always come out as the stored value rather than the cached display
 * text; that part lives in the converters (`raw: true`), not here.
 */
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/**
 * Read-time `dateNF` both XLSX→value converters must pass, and the reason {@link normalizeDateCells}
 * can recognize a plain date by its trailing ` 00:00:00`.
 *
 * It is a *read* option: SheetJS builds `cell.w` while parsing, and `format_cell` returns that cached
 * text whenever it exists. Passing `dateNF` to the serializer instead has no effect on a cell that
 * already has `w`, which is every date cell.
 */
export const XLSX_TEXT_DATE_FORMAT = 'yyyy-mm-dd hh:mm:ss';

/** With {@link XLSX_TEXT_DATE_FORMAT} in force, a date with no time component renders with this suffix. */
const DATE_ONLY_SUFFIX = ' 00:00:00';

/** Guard a single string destined for CSV output. */
export function guardCsvValue(value: string): string {
  return DANGEROUS_PREFIX.test(value) ? `'${value}` : value;
}

/**
 * Rewrite date cells in place as text cells carrying a two-form ISO date, and return the sheet.
 *
 * The date's *stored* value is the day serial (`45296`), so `raw: true` alone would put serials in
 * the artifact. Reading with `cellDates: true` is what flags those cells (`t: 'd'`), but it is used
 * as a flag only: its `Date` object is unusable as a formatting source. SheetJS converts serial →
 * `Date` through a local-time calculation whose error is the seconds part of the reader's historical
 * local mean time offset, measured on xlsx 0.18.5 at −43 s in Asia/Shanghai, +20 s in
 * Pacific/Kiritimati and −10 s in Asia/Kolkata. For the plain date 2024-01-05 that lands the `Date`
 * at 2024-01-04 23:59:17 local, so formatting it by local getters would emit **the day before**.
 *
 * `cell.w` has no such problem: it is rendered from the serial during parsing, never through a
 * `Date`, and was byte-identical across those three zones plus UTC. So this function reads `w`, and
 * drops the zero time that {@link XLSX_TEXT_DATE_FORMAT} appends to a date with no time component —
 * `2024-01-05` for a plain date, `2024-01-05 14:30:00` for a real timestamp, so a midnight
 * timestamp is indistinguishable from a date. Formats the workbook author chose explicitly are
 * respected rather than overridden (`[h]:mm:ss` durations stay `124:48:00`, not a calendar date);
 * `dateNF` only replaces the built-in date formats that silently drop the time.
 *
 * A date cell with no `w` at all is left untouched rather than guessed at: every caller here parses
 * with the default `cellText: true`, so the branch only fires for a cell that was built in memory,
 * where inventing a value would be worse than leaving it.
 */
export function normalizeDateCells(sheet: WorkSheet): WorkSheet {
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const cell = sheet[key];
    if (!cell || cell.t !== 'd') continue;
    if (typeof cell.w !== 'string' || !cell.w) continue;
    cell.t = 's';
    cell.v = cell.w.endsWith(DATE_ONLY_SUFFIX) ? cell.w.slice(0, -DATE_ONLY_SUFFIX.length) : cell.w;
    delete cell.w;
  }
  return sheet;
}

/**
 * Neutralize dangerous cells of a worksheet in place before serialization.
 *
 * Two distinct vectors, and the first version of this function handled one of them:
 *
 * 1. A cell whose text starts with `=`, `+`, `-`, `@`, TAB or CR is re-parsed as a formula by Excel
 *    on open. Prefixing an apostrophe makes Excel render it literally.
 * 2. A cell carrying `f` — a formula. The earlier version skipped those on the documented assumption
 *    that "formula-result cells are serialized from their typed values, not re-parsed as text by
 *    Excel". Measured on xlsx 0.18.5, that premise holds only while the *serializer* is
 *    `sheet_to_csv` *and* the cell has a cached display text: `format_cell` falls back to the
 *    formula source when a cell carries `f` with no value, so `sheet_to_csv` writes `=A2*2` straight
 *    into the CSV and this function becomes the channel that re-arms vector 1. What the reader does
 *    with the formula on disk decides the rest, and it is not one behaviour: `<f>` with a cached
 *    value survives as `{ t: 'n', v: 2469, f: 'A2*2', w: '2,469.00' }` (so the cell exports the
 *    *stale formatted text*, `2,469.00`, instead of 2469), `<f>` with an empty cached value survives
 *    as `{ t: 's', v: '', f }`, and openpyxl's `<f>` with no cached value at all is dropped by the
 *    reader before this function ever sees it — nothing in the artifact can be lost for that shape,
 *    because there is no cell to lose.
 *
 * So: any cell carrying `f` loses `f` and its cached text. A cell that has a value keeps it with its
 * own type, which is the value fidelity the same read gives numbers; a cell with `f` and nothing but
 * an empty cached value is rewritten to the guarded formula source, because an empty column is a
 * silent loss and this branch is the only place the user can still see what was there.
 */
export function guardFormulaCells(sheet: WorkSheet): WorkSheet {
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const cell = sheet[key];
    if (!cell) continue;
    if (cell.f !== undefined) {
      if (cell.v === undefined || cell.v === null || cell.v === '') {
        cell.t = 's';
        cell.v = `=${cell.f}`;
      }
      delete cell.f;
      delete cell.w;
    }
    if (typeof cell.v === 'string' && DANGEROUS_PREFIX.test(cell.v)) {
      cell.v = `'${cell.v}`;
      delete cell.w;
    }
  }
  return sheet;
}
