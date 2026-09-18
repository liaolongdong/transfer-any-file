/**
 * Reason keys the UI is allowed to translate.
 *
 * Conversion failures and history-import failures carry either one of these or a raw library
 * message (pdf.js `InvalidPDFException`, a DOMException, …). Callers check membership here to
 * decide which side they got: known keys go through `t()`, anything else is shown verbatim because
 * it is the library's own text and there is nothing to translate.
 *
 * Lives in `utils/core` rather than in a composable so components, converters and the orchestrator
 * can all share one source of truth without importing sideways across layers.
 */
export const CONVERSION_ERROR_KEYS = new Set([
  'errors.noFileOrTarget',
  'errors.noPath',
  'errors.unknown',
  'errors.unknownFormat',
  'errors.docxParse',
  'errors.docxGen',
  // Mammoth produced nothing (and no altChunk fallback recovered content) — an empty document is
  // a different complaint from a corrupted one, so it needs its own key.
  'errors.docxEmpty',
  // pdf.js rejected the document itself; rendering failures keep travelling as imageEncode/render
  // keys, and mislabelling a corrupt PDF as "browser cannot encode" sends users to the wrong fix.
  'errors.pdfParse',
  'errors.xlsxEmpty',
  'errors.csvDecode',
  'errors.imageDecode',
  'errors.imageEncode',
  'errors.renderTimeout',
  'errors.renderFailed',
  'errors.zipFail',
  'errors.jsonParse',
  'errors.jsonNotArray',
  'errors.htmlToJson',
  // decodeTextBlob gave up on every encoding it knows, so the bytes are neither UTF-8 nor GBK/GB18030.
  'errors.decodeFail',
  // Thrown by a converter that observes `ctx.signal` inside its own page loop.
  'errors.cancelled',
  // `converterRegistry.resolvePath` enforces the semantic policy now, so a target that never went
  // through the dropdown can surface a blocked pair as a per-file failure. These are the same keys
  // `FormatSelector` uses for the greyed-out reasons — reused rather than duplicated.
  'format.disabledImageNoText',
  'format.disabledPdfNoData',
]);

/** Narrow an unknown thrown value to a key this set can translate. */
export function asErrorKey(error: unknown): string | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return CONVERSION_ERROR_KEYS.has(message) ? message : null;
}
