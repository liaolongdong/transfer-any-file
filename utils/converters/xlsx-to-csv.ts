import type { Zippable } from 'fflate';
import type { WorkSheet } from 'xlsx';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { guardFormulaCells, normalizeDateCells, sheetToValueCsv, XLSX_TEXT_DATE_FORMAT } from '~/utils/core/csv-guard';
import { loadFflate } from '~/utils/core/zip';
import { ownSheetNames } from '~/utils/core/xlsx-sheets';

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
    const sheetNames = ownSheetNames(workbook);
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
    const { zipSync, strToU8 } = await loadFflate();
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
