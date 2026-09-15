/**
 * Text decoding for uploaded files, with two failure policies over one encoding chain.
 *
 * The chain is UTF-8 → GB18030 → GBK — the encodings Chinese-locale Excel and legacy Windows
 * tooling still write. GB18030 is tried before GBK because it covers characters GBK cannot
 * represent (CJK Extension A, minority scripts); GBK stays as the last resort for the one sequence
 * the two disagree on — a lone 0x80, which GBK reads as `€` while GB18030 only accepts 0x80 inside
 * a 4-byte sequence.
 *
 * A leading UTF-8 BOM needs no special handling: `TextDecoder` strips it as part of the UTF-8
 * decode algorithm, so callers never see a stray U+FEFF in the result.
 */

/** Encodings tried in order, each strictly — a byte sequence it cannot represent moves to the next. */
const DECODER_CHAIN = ['utf-8', 'gb18030', 'gbk'] as const;

/** @returns the first strict decode that succeeds, or `null` when no encoding covers the bytes. */
function decodeStrict(buffer: ArrayBuffer): string | null {
  for (const encoding of DECODER_CHAIN) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      // this encoding cannot represent the bytes; try the next one
    }
  }
  return null;
}

/**
 * Decode a text buffer, failing when no encoding in the chain covers it.
 *
 * For formats where the bytes *are* the document (CSV, JSON, TXT): output no reader could open is
 * worse than an error the user can act on, so a file that is not text at all is surfaced as `errorKey`.
 */
export async function decodeTextBlob(input: Blob, errorKey: string): Promise<string> {
  const decoded = decodeStrict(await input.arrayBuffer());
  if (decoded === null) throw new Error(errorKey);
  return decoded;
}

/**
 * Decode a text buffer, never failing.
 *
 * For markup (HTML, SVG) the chain is an improvement rather than a gate: it recovers a GBK or
 * GB18030 document that would otherwise render as mojibake, and a file outside the chain falls back
 * to a lossy UTF-8 decode — the previous `Blob.text()` behaviour, which keeps the ASCII majority of
 * a windows-1252 page usable instead of rejecting the whole file.
 */
export async function decodeTextBlobLenient(input: Blob): Promise<string> {
  const buffer = await input.arrayBuffer();
  return decodeStrict(buffer) ?? new TextDecoder('utf-8').decode(buffer);
}
