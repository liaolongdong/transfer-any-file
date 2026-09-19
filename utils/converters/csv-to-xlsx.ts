import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { guardCsvValue } from '~/utils/core/csv-guard';

/** Strict decimal shape. Not the discriminator — see `isExactNumber`. */
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
 * CSV → XLSX without re-typing the data.
 *
 * The previous implementation was `XLSX.read(text, { type: 'string' })` straight into `write`, which
 * handed every field to SheetJS's type inferrer. Measured on one row of
 * `00424,12345678901234567890,=1+1,2024-01-05,1/2`: leading zeros dropped to `424`, a 20-digit
 * account widened to `12345678901234567000`, `=1+1` emitted as a LIVE FORMULA
 * (`<c r="C2"><f>1+1</f></c>`) that Excel computes the moment the workbook opens, the date replaced
 * by the serial `45296.33383101852`, and `1/2` turned into the serial for 2001-01-02. Each of those
 * destroys the one column a user cared about — zip, IBAN, account number, date of birth — and the
 * formula is precisely the vector `csv-guard` exists to stop, re-armed on the way out.
 *
 * `raw: true` is the switch. The reader stores every field as a string cell *before* its boolean,
 * numeric, date and formula branches run, so the sheet arrives verbatim while still going through
 * the same RFC 4180 tokenizer the previous call used — quoted commas, embedded newlines and the
 * `sep=` prefix keep working, and `"1,234.50"` no longer collapses to `1234.5`. Cells are then
 * re-typed here under the two conditions `isExactNumber` states, and date-like strings are never
 * guessed.
 *
 * Every remaining text cell pins `z: '@'`, which the writer emits as the built-in `numFmtId="49"`:
 * without it Excel re-infers on open and undoes the whole exercise.
 */
const csvToXlsxConverter: Converter = {
  from: FileFormat.CSV,
  to: FileFormat.XLSX,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.csvDecode')]);
    if (!text.trim()) {
      throw new Error('errors.csvDecode');
    }
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) {
      throw new Error('errors.csvDecode');
    }

    for (const key of Object.keys(sheet)) {
      if (key.startsWith('!')) continue;
      const cell = sheet[key];
      if (cell.t !== 's' || typeof cell.v !== 'string') continue;
      // Numeric first, guard second. A numeric cell cannot be re-read as a formula, so guarding
      // before this test would cost every negative number its type: `-42` matches the dangerous
      // prefix `-` and would land in the workbook as the text `'-42`.
      if (isExactNumber(cell.v)) {
        cell.t = 'n';
        cell.v = Number(cell.v);
        continue;
      }
      cell.v = guardCsvValue(cell.v);
      cell.z = '@';
    }

    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return { blob, filename: 'converted.xlsx' };
  },
};

export default csvToXlsxConverter;
