import * as XLSX from 'xlsx';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { decodeTextBlob } from '~/utils/core/text-decode';

const jsonToCsvConverter: Converter = {
  from: FileFormat.JSON,
  to: FileFormat.CSV,

  async convert(input: Blob): Promise<ConvertResult> {
    const text = await decodeTextBlob(input, 'errors.unknown');

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
    const aoa: unknown[][] = [headerList];
    for (const item of parsed) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = headerList.map(h => {
          const val = (item as Record<string, unknown>)[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
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
    const text = await decodeTextBlob(input, 'errors.csvDecode');
    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('errors.csvDecode');

    const sheet = workbook.Sheets[firstSheetName];
    const aoa = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });

    const jsonStr = JSON.stringify(aoa, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    return { blob, filename: 'converted.json' };
  },
};

export { jsonToCsvConverter, csvToJsonConverter };
