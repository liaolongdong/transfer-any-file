import * as XLSX from 'xlsx';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const xlsxToCsvConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.CSV,

  async convert(input: Blob): Promise<ConvertResult> {
    const buffer = await input.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('errors.xlsxEmpty');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    // UTF-8 BOM so Excel opens the CSV with the correct encoding
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    return { blob, filename: 'converted.csv' };
  },
};

export default xlsxToCsvConverter;
