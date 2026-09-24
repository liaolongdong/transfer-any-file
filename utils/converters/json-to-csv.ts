import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { guardCsvValue, typeNumericCells } from '~/utils/core/csv-guard';

const jsonToCsvConverter: Converter = {
  from: FileFormat.JSON,
  to: FileFormat.CSV,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.unknown')]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('errors.jsonParse');
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('errors.jsonNotArray');
    }

    const headers = new Set<string>();
    for (const item of parsed) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const key of Object.keys(item as Record<string, unknown>)) {
          headers.add(key);
        }
      }
    }

    if (headers.size === 0) {
      throw new Error('errors.jsonNotArray');
    }

    const headerList = [...headers];
    const aoa: unknown[][] = [headerList.map(guardCsvValue)];
    for (const item of parsed) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = headerList.map(h => {
          const val = (item as Record<string, unknown>)[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          // JSON strings are free to carry "=HYPERLINK(...)" payloads that Excel would
          // happily evaluate once the CSV is opened.
          return typeof val === 'string' ? guardCsvValue(val) : val;
        });
        aoa.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    return { blob, filename: 'converted.csv' };
  },
};

const csvToJsonConverter: Converter = {
  from: FileFormat.CSV,
  to: FileFormat.JSON,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.csvDecode')]);
    // Same read as csv→xlsx: `raw: true` keeps the reader's type inferrer away from the data, and
    // {@link typeNumericCells} then gives back the numeric fields on the one rule that rule was
    // written for. Without it a row of `2024-01-05,=1+1,1/2` was measured to come out as
    // `{"date":"1/5/24","frac":"1/2/01"}` with the `calc` key gone entirely — the inferrer turned the
    // date into the serial 45296.33383101852, the fraction into 2001-01-02, and the formula into a
    // cell with nothing but `f`, which `sheet_to_json` then had no value to print.
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('errors.csvDecode');

    const sheet = typeNumericCells(workbook.Sheets[firstSheetName]);
    // `raw: true` so a number reaches JSON as a number; every other field stays the verbatim text the
    // CSV carried. No formula guard on this side either — an apostrophe is an Excel affordance and
    // JSON is not opened by Excel (see xlsx→json for the same reasoning).
    const aoa = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

    const jsonStr = JSON.stringify(aoa, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    return { blob, filename: 'converted.json' };
  },
};

export { jsonToCsvConverter, csvToJsonConverter };
