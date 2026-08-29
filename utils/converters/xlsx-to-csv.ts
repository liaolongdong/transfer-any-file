import * as XLSX from 'xlsx';
import { zipSync, strToU8 } from 'fflate';
import type { Zippable } from 'fflate';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

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

const xlsxToCsvConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.CSV,

  async convert(input: Blob): Promise<ConvertResult> {
    const buffer = await input.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
    const sheetNames = workbook.SheetNames.filter(name => workbook.Sheets[name]);
    if (sheetNames.length === 0) {
      throw new Error('errors.xlsxEmpty');
    }

    // Single sheet keeps the classic single-CSV output
    if (sheetNames.length === 1) {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetNames[0]], {
        FS: ',',
        RS: '\n',
        dateNF: 'yyyy-mm-dd',
      });
      return { blob: csvBlob(csv), filename: 'converted.csv' };
    }

    // Multi-sheet workbooks export every sheet as its own CSV inside a ZIP,
    // so no worksheet data is silently dropped
    const entries: Zippable = {};
    const taken = new Set<string>();
    for (const name of sheetNames) {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name], {
        FS: ',',
        RS: '\n',
        dateNF: 'yyyy-mm-dd',
      });
      entries[safeEntryName(name, taken)] = strToU8('\ufeff' + csv);
    }
    const zipped = zipSync(entries, { level: 6 });
    const blob = new Blob([zipped as BlobPart], { type: 'application/zip' });
    return { blob, filename: 'converted.zip' };
  },
};

export default xlsxToCsvConverter;
