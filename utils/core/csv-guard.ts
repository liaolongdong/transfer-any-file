import type { WorkSheet } from 'xlsx';

/**
 * Spreadsheet cell → artifact value policy.
 *
 * Four things decide what a CSV or spreadsheet cell contributes to an artifact, and each one has
 * measured behaviour that contradicts the option name:
 *
 * - {@link typeNumericCells} — which CSV fields are numbers at all. Read with `raw: true` every field
 *   arrives as text, so this is the only place a value can regain its type without the reader's
 *   inferrer rewriting dates, zip codes and account numbers on the way in.
 * - `guardCsvValue` / `guardFormulaCells` — whether the emitted text can be re-executed by Excel
 *   when the artifact is opened (CSV formula injection).
 * - `normalizeDateCells` — which rendering of a date is the cell's *value*. A date cell's stored
 *   value is a day serial, which is worthless in CSV/JSON, so the read-time rendering is the value;
 *   the two-form rule below is what makes it machine-readable.
 *
 * Numbers, booleans and text always come out as the stored value rather than the cached display
 * text; {@link sheetToValueCsv} is the serializer that keeps that promise on the way out.
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

/** Strict decimal shape. Not the discriminator — see {@link isExactNumber}. */
const DECIMAL_SHAPE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * How many significant digits Excel renders. Beyond this the display is rounded, and a wide integer
 * switches to scientific notation as well — `4111111111111111` shows as `4.11111111111111E+15` —
 * which is a property of the spreadsheet's display, not of the stored double.
 */
const MAX_EXCEL_SIGNIFICANT_DIGITS = 15;

/**
 * Count the significant digits a decimal literal spells out: sign, decimal point and exponent are
 * dropped, and the leading zeros of the mantissa are not significant.
 *
 * Leading zeros are excluded because they are not part of the number — `0.0001234567890123` carries 17
 * digit characters but 13 significant ones, and all 13 fit inside a 15-digit display. Trailing zeros
 * are *included*, because a value written out to 16 characters claims 16 digits of precision, and
 * scientific notation makes a real trailing zero (`4111111111111110`) indistinguishable from a dropped
 * one.
 *
 * The exponent is excluded because Excel's precision is defined on the mantissa. Only literals of
 * magnitude >= 1e21 or < 1e-6 print in exponent form at all — the round trip rejects the others, since
 * `1e20` comes back as `100000000000000000000` — and those display in scientific notation whatever
 * their width, so the only live question is how many mantissa digits survive: `1.23456789012345e+21`
 * keeps all fifteen, `1.234567890123456e+21` is the sixteenth Excel rounds away. Folding the exponent
 * into the count would instead textify `1e+21`, whose single significant digit its own display
 * reproduces exactly.
 */
function significantDigits(literal: string): number {
  const mantissa = literal.split(/[eE]/)[0].replace(/[-.]/g, '');
  return mantissa.replace(/^0+(?=\d)/, '').length;
}

/**
 * A CSV field becomes a numeric cell on two conditions: parsing it and re-printing it returns the
 * exact same characters, *and* it spells out no more than {@link MAX_EXCEL_SIGNIFICANT_DIGITS}
 * significant digits.
 *
 * The round trip is the cheap, general gate. It keeps `00424` (-> `424`), `1.50` (-> `1.5`), `1e5`
 * (-> `100000`), `-0` (-> `0`), `1e21` (-> `1e+21`) and the 20-digit `12345678901234567890` (->
 * `12345678901234567000`) as text without a pile of special cases: none of them reproduce
 * themselves. The shape test before it is a bail and a statement of intent, not a second gate —
 * `String(Number(x))` only ever prints this shape, so anything that passes the round trip matched it
 * already.
 *
 * The digit limit covers what the round trip structurally cannot. Whatever passes it is by
 * construction an exactly representable double, so the *stored* cell is faithful — but the user reads
 * the file through Excel, and Excel renders 15 significant digits. The 16th digit of a bank card
 * number is the case that matters, and it is the common one: measured over 300k sampled integers per
 * digit length, 12–15 digits pass the round trip 100% of the time, 16 digits 94.5%, 17 37.4%, 18
 * 7.6%, 19 1.2%, 20 0.2%. So `4111111111111111` and `6222021234567890` both sailed through the round
 * trip as numbers and opened as `4.11111111111111E+15` / `6.22202123456789E+15` — the same silent
 * misread the round trip exists to prevent, just one digit width narrower, and 16 digits is exactly
 * where card numbers, long IDs and many account numbers live.
 *
 * Cost, accepted deliberately: a value of 16+ significant digits stops being summable. That width is
 * already unreadable in a spreadsheet, so text is the only form that survives it intact, and nothing
 * at or below 15 digits is touched — every value under 1e15 and every ordinary measurement keeps its
 * number type. See `e2e-test.mjs → CSV Typing Fidelity` for the boundary fixtures.
 */
function isExactNumber(value: string): boolean {
  if (!DECIMAL_SHAPE.test(value)) return false;
  const n = Number(value);
  if (!Number.isFinite(n) || String(n) !== value) return false;
  return significantDigits(value) <= MAX_EXCEL_SIGNIFICANT_DIGITS;
}

/**
 * Give every text cell of a raw-read sheet back its numeric type, and return the sheet.
 *
 * A CSV parsed with `raw: true` arrives entirely as text — that is the point, since the reader's
 * inferrer otherwise rewrites `00424`, `2024-01-05` and `=1+1` before any converter sees them. This
 * is the one pass that re-types what genuinely was a number, so the two ways out of a CSV (→ XLSX and
 * → JSON) agree on which fields are numeric instead of each inventing its own rule.
 */
export function typeNumericCells(sheet: WorkSheet): WorkSheet {
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const cell = sheet[key];
    if (!cell || cell.t !== 's' || typeof cell.v !== 'string') continue;
    if (isExactNumber(cell.v)) {
      cell.t = 'n';
      cell.v = Number(cell.v);
    }
  }
  return sheet;
}

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

/**
 * Serialize a worksheet to CSV from cell *values* rather than display text.
 *
 * `sheet_to_csv` cannot do this: it delegates every cell to `format_cell`, which returns the cached
 * `cell.w` whenever one exists — and `w` is built while parsing, from the read options. So
 * `sheet_to_csv(sheet, { raw: true })` is measured (xlsx 0.18.5) to be byte-identical to
 * `sheet_to_csv(sheet, { raw: false })` and to the bare call: `1234.5` formatted as `#,##0.00` comes
 * out as the quoted `"1,234.50"` and `0.25` as `25.0%`, which is what a cell LOOKS like rather than
 * what it holds. `raw` is not a documented read option either, so it cannot be moved to the read.
 *
 * The display-text path is not only a formatting difference. Measured on a sheet built by
 * `aoa_to_sheet` from parsed JSON, `sheet_to_csv` rewrote `1727000000000` to `1.727E+12`,
 * `3.14159265358979` to `3.141592654` and `true` to `TRUE` — so every route that emits CSV goes
 * through here rather than calling `sheet_to_csv` directly.
 *
 * Dates are not a `Date` here — {@link normalizeDateCells} has already replaced them with two-form
 * ISO text, which is the only date rendering that is stable across timezones. Quoting follows
 * RFC 4180 and matches `sheet_to_csv`'s own rules, measured: a field is quoted when it contains a
 * quote, the separator or a line break, and leading/trailing spaces are deliberately not quoted.
 */
export function sheetToValueCsv(XLSX: typeof import('xlsx'), sheet: WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  return rows
    .map(cells =>
      cells
        .map(cell => {
          const text = typeof cell === 'string' ? cell : String(cell ?? '');
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
}
