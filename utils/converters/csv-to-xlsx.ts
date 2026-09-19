import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { guardCsvValue } from '~/utils/core/csv-guard';

/** Strict decimal shape. Not the discriminator — see `isExactNumber`. */
const DECIMAL_SHAPE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * A field is worth storing as a number only if parsing it and re-printing it returns the exact same
 * characters. That one test keeps `00424` (-> `424`), `1.50` (-> `1.5`), `1e5` (-> `100000`), `-0`
 * (-> `0`), `1e21` (-> `1e+21`) and the 20-digit `12345678901234567890` (-> `1.2345678901234568e+19`)
 * as text, without a pile of special cases: none of them reproduce themselves.
 *
 * The shape test is a cheap bail and a statement of intent, not a second gate — `String(Number(x))`
 * only ever prints this shape, so anything that passes the round trip already matches it.
 *
 * Known residual, accepted: what passes is by construction an exactly representable double, so the
 * stored file is faithful, but Excel's *display* rounds past 15 significant digits — a 16-digit ID
 * typed as a number renders `1.23457E+15`. Measured pass rates are 94.5% of 16-digit integers and
 * 0.2% of 20-digit ones. A digit-count rule would close that at the cost of every long-number column
 * losing summability, and the spec names the round trip as the sole criterion (「往返检查为唯一判据」).
 */
function isExactNumber(value: string): boolean {
  if (!DECIMAL_SHAPE.test(value)) return false;
  const n = Number(value);
  return Number.isFinite(n) && String(n) === value;
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
 * re-typed here under exactly one rule, and date-like strings are never guessed.
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
