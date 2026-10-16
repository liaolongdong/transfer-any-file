import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';
import { guardCsvValue, sheetToValueCsv, typeNumericCells } from '~/utils/core/csv-guard';
import { ownSheet } from '~/utils/core/xlsx-sheets';

/** Header column for array elements that carry no keys of their own — see {@link jsonToCsvConverter}. */
const VALUE_COLUMN = '_value';

/** A JSON object as a CSV row wants it: a mapping, not an array and not a primitive. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const jsonToCsvConverter: Converter = {
  from: FileFormat.JSON,
  to: FileFormat.CSV,

  async convert(input: Blob): Promise<ConvertResult> {
    const [XLSX, text] = await Promise.all([import('xlsx'), decodeTextBlob(input, 'errors.decodeFail')]);

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
      if (isPlainRecord(item)) {
        for (const key of Object.keys(item)) {
          headers.add(key);
        }
      }
    }

    if (headers.size === 0) {
      throw new Error('errors.jsonNotArray');
    }

    // A JSON array is free to mix shapes (`[{"a":1}, "note", [2,3]]`), and an element that is not a
    // plain object has no key to land under. Dropping those rows silently is the one outcome this
    // project cannot ship — a 1 000-record file writing out 980 rows and reporting success is worse
    // than an ugly column. So one synthetic `_value` column carries whatever had no keys of its own,
    // and it only appears in the header when something actually needs it.
    const hasNonObject = parsed.some(item => !isPlainRecord(item));
    const headerList = [...headers];
    if (hasNonObject) headerList.push(VALUE_COLUMN);

    const aoa: unknown[][] = [headerList.map(guardCsvValue)];
    for (const item of parsed) {
      if (isPlainRecord(item)) {
        const row = headerList.map(h => {
          // The headers are the union across every record, so a key that is absent here is absent for
          // real — reading it off the object would walk the prototype chain instead, and a record
          // whose peer declared `constructor` would export `Object`'s own function as a cell value.
          if (h === VALUE_COLUMN || !Object.hasOwn(item, h)) return '';
          const val = item[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          // JSON strings are free to carry "=HYPERLINK(...)" payloads that Excel would
          // happily evaluate once the CSV is opened.
          return typeof val === 'string' ? guardCsvValue(val) : val;
        });
        aoa.push(row);
      } else {
        const bare = item === null || item === undefined ? '' : typeof item === 'string' ? item : JSON.stringify(item);
        const row = headerList.map(h => (h === VALUE_COLUMN ? guardCsvValue(bare) : ''));
        aoa.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Values, not the display text `sheet_to_csv` would otherwise emit: on this exact sheet shape it
    // was measured to turn `1727000000000` into `1.727E+12`, `3.14159265358979` into `3.141592654`
    // and `true` into `TRUE`, so a batch of timestamps or snowflake IDs arrived rounded and in
    // scientific notation. Same value-fidelity rule {@link sheetToValueCsv} states.
    const csv = sheetToValueCsv(XLSX, ws);
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
    const firstSheet = firstSheetName ? ownSheet(workbook, firstSheetName) : undefined;
    if (!firstSheet) throw new Error('errors.csvDecode');

    const sheet = typeNumericCells(firstSheet);
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
