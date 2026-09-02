import { FileFormat } from './types';

/** i18n keys explaining why a reachable conversion is blocked at the UI layer */
export type BlockedReasonKey = 'format.disabledImageNoText' | 'format.disabledPdfNoData';

/** Formats whose payload is a raster/vector picture with no extractable text or table structure */
const IMAGE_FORMATS = new Set<FileFormat>([
  FileFormat.PNG,
  FileFormat.JPG,
  FileFormat.WEBP,
  FileFormat.BMP,
  FileFormat.GIF,
  FileFormat.SVG,
]);

/** Tabular / structured formats that require real data (a table or JSON) in the source */
const DATA_FORMATS = new Set<FileFormat>([FileFormat.JSON, FileFormat.CSV, FileFormat.XLSX]);

/**
 * Report whether a `source -> target` pair is structurally reachable in the converter
 * graph but semantically invalid, so it must be offered as disabled rather than selectable.
 *
 * Why this layer exists: BFS reachability alone would advertise conversions that always
 * fail or produce a useless placeholder. Removing the underlying converters is not an
 * option because they are valid for other sources (e.g. HTML -> JSON works on real tables),
 * so the invalid combinations are filtered here instead.
 *
 * - Image -> TXT/data: a raster image has no text layer; TXT would only yield an
 *   `[Image: ...]` placeholder and data targets throw in `htmlToJson`. Real extraction
 *   needs OCR, which this offline extension intentionally does not bundle.
 * - PDF -> data: a PDF carries no table structure, so `htmlToJson` always throws.
 *   PDF -> TXT is kept because text-layer extraction is genuinely useful.
 *
 * @returns the i18n reason key when the pair is blocked, otherwise `null`.
 */
export function getBlockedReason(source: FileFormat, target: FileFormat): BlockedReasonKey | null {
  if (IMAGE_FORMATS.has(source) && (target === FileFormat.TXT || DATA_FORMATS.has(target))) {
    return 'format.disabledImageNoText';
  }
  if (source === FileFormat.PDF && DATA_FORMATS.has(target)) {
    return 'format.disabledPdfNoData';
  }
  return null;
}
