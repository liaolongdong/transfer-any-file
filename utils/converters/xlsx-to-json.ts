import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const xlsxToJsonConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.JSON,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, buffer] = await Promise.all([import('xlsx'), input.arrayBuffer()]);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames.filter(name => workbook.Sheets[name]);
    if (sheetNames.length === 0) {
      throw new Error('errors.xlsxEmpty');
    }

    const rowsOf = (name: string): Record<string, unknown>[] =>
      XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { raw: false });

    // One sheet keeps the familiar array-of-rows shape; several sheets are
    // grouped by sheet name so no worksheet is dropped
    const payload =
      sheetNames.length === 1
        ? rowsOf(sheetNames[0])
        : Object.fromEntries(sheetNames.map(name => [name, rowsOf(name)]));

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    return { blob, filename: 'converted.json' };
  },
};

export default xlsxToJsonConverter;
