import * as XLSX from 'xlsx';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';

const csvToXlsxConverter: Converter = {
  from: FileFormat.CSV,
  to: FileFormat.XLSX,

  async convert(input: Blob): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.csvDecode');
    if (!text.trim()) {
      throw new Error('errors.csvDecode');
    }
    const workbook = XLSX.read(text, { type: 'string' });
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx',
    });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return { blob, filename: 'converted.xlsx' };
  },
};

export default csvToXlsxConverter;
