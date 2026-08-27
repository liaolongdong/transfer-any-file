/**
 * Decode a text buffer as UTF-8 first; if it contains invalid UTF-8
 * sequences, fall back to GBK (common for CSV files exported by
 * Chinese-locale Excel). Throws the given error key when both fail.
 */
export async function decodeTextBlob(input: Blob, errorKey: string): Promise<string> {
  const buffer = await input.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    try {
      return new TextDecoder('gbk', { fatal: true }).decode(buffer);
    } catch {
      throw new Error(errorKey);
    }
  }
}
