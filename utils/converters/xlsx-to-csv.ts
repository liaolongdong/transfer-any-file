import { zipSync, strToU8 } from 'fflate';
import type { Zippable } from 'fflate';
import type { WorkSheet } from 'xlsx';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { guardFormulaCells, normalizeDateCells, XLSX_TEXT_DATE_FORMAT } from '~/utils/core/csv-guard';

function csvBlob(csv: string): Blob {
  // UTF-8 BOM so Excel opens the CSV with the correct encoding
  return new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
}

function safeEntryName(name: string, taken: Set<string>): string {
  const base = name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'sheet';
  let candidate = `${base}.csv`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}_${n}.csv`;
    n++;
  }
  taken.add(candidate);
  return candidate;
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
 * `sheet_to_json` is the one serializer that honours `raw`, hence the route through it. Dates are not
 * a `Date` here — {@link normalizeDateCells} has already replaced them with two-form ISO text, which
 * is the only date rendering that is stable across timezones. Quoting follows RFC 4180 and matches
 * `sheet_to_csv`'s own rules, measured: a field is quoted when it contains a quote, the separator or
 * a line break, and leading/trailing spaces are deliberately not quoted.
 */
function sheetToValueCsv(XLSX: typeof import('xlsx'), sheet: WorkSheet): string {
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

/** A sheet's cells, with dates and formulas made safe to serialize as text. */
function valueSheet(sheet: WorkSheet): WorkSheet {
  return guardFormulaCells(normalizeDateCells(sheet));
}

const xlsxToCsvConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.CSV,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, buffer] = await Promise.all([import('xlsx'), input.arrayBuffer()]);
    // `dateNF` belongs here and not on the serializer, because it only has an effect while parsing;
    // the `raw: false` this call used to carry is not a read option at all and is discarded by
    // option normalization, so it never had the documented effect of "use values".
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: XLSX_TEXT_DATE_FORMAT });
    const sheetNames = workbook.SheetNames.filter(name => workbook.Sheets[name]);
    if (sheetNames.length === 0) {
      throw new Error('errors.xlsxEmpty');
    }

    // Single sheet keeps the classic single-CSV output
    if (sheetNames.length === 1) {
      const csv = sheetToValueCsv(XLSX, valueSheet(workbook.Sheets[sheetNames[0]]));
      return { blob: csvBlob(csv), filename: 'converted.csv', containerExt: 'csv' };
    }

    // Multi-sheet workbooks export every sheet as its own CSV inside a ZIP,
    // so no worksheet data is silently dropped
    const entries: Zippable = {};
    const taken = new Set<string>();
    for (const name of sheetNames) {
      const csv = sheetToValueCsv(XLSX, valueSheet(workbook.Sheets[name]));
      entries[safeEntryName(name, taken)] = strToU8('\ufeff' + csv);
    }
    const zipped = zipSync(entries, { level: 6 });
    const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
    // Nominal target is CSV, real container is a ZIP — declared so the caller never has to infer it.
    return { blob, filename: 'converted.zip', containerExt: 'zip' };
  },
};

export default xlsxToCsvConverter;
