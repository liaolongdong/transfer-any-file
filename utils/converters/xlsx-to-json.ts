import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { normalizeDateCells, XLSX_TEXT_DATE_FORMAT } from '~/utils/core/csv-guard';

const xlsxToJsonConverter: Converter = {
  from: FileFormat.XLSX,
  to: FileFormat.JSON,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, buffer] = await Promise.all([import('xlsx'), input.arrayBuffer()]);
    // Same read options as xlsx→csv: `cellDates` flags date cells and `dateNF` decides how they are
    // rendered, and both only work at parse time.
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: XLSX_TEXT_DATE_FORMAT });
    const sheetNames = workbook.SheetNames.filter(name => workbook.Sheets[name]);
    if (sheetNames.length === 0) {
      throw new Error('errors.xlsxEmpty');
    }

    // raw:true so JSON carries real numbers and booleans. With raw:false every value came back as
    // SheetJS's cached display text — `1,234.50` and `25.0%` as strings, `TRUE` for a boolean, and
    // not a single number in the whole document, which defeats the point of converting to JSON.
    // Dates go through normalizeDateCells first because `raw:true` would otherwise hand back the
    // serial (or a `Date` whose value drifts by up to a minute with the reader's timezone).
    //
    // No CSV formula guard here on purpose: an apostrophe is an Excel affordance, and JSON is not
    // opened by Excel. A formula cell contributes its cached value, which is what it holds; anything
    // that leaves this converter as a string is re-guarded on the way out if it is ever converted to
    // CSV (see json→csv).
    const rowsOf = (name: string): Record<string, unknown>[] =>
      XLSX.utils.sheet_to_json<Record<string, unknown>>(normalizeDateCells(workbook.Sheets[name]), {
        raw: true,
      });

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
