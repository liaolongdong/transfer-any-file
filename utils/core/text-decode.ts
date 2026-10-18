/**
 * Text decoding for uploaded files, with two failure policies over one encoding chain.
 *
 * UTF-16 is settled before the chain runs — see {@link sniffUtf16}, whose reason is that UTF-16 is
 * the one encoding the chain would otherwise *mis*-report as success. The chain is then
 * UTF-8 → GB18030 → GBK — the encodings Chinese-locale Excel and legacy Windows tooling still write.
 * GB18030 is tried before GBK because it covers characters GBK cannot
 * represent (CJK Extension A, minority scripts); GBK stays as the last resort for the one sequence
 * the two disagree on — a lone 0x80, which GBK reads as `€` while GB18030 only accepts 0x80 inside
 * a 4-byte sequence.
 *
 * A leading UTF-8 BOM needs no special handling: `TextDecoder` strips it as part of the UTF-8
 * decode algorithm, so callers never see a stray U+FEFF in the result.
 */

/** Encodings tried in order, each strictly — a byte sequence it cannot represent moves to the next. */
const DECODER_CHAIN = ['utf-8', 'gb18030', 'gbk'] as const;

/** Sampled prefix long enough to count zero bytes over, short enough to stay free. */
const UTF16_SNIFF_BYTES = 2048;

/**
 * Detect UTF-16, which the chain above cannot: its NUL padding is *valid* UTF-8, so a
 * UTF-16LE-without-BOM document sails through `utf-8` and comes back as `n\u0000a\u0000m\u0000…`
 * while the batch reports success; the BOM'd variant fails the UTF-8 leg, lands on GB18030, and comes
 * back as mojibake that still carries the NULs (both measured 2026-10-17 against the bytes Excel's
 *「Unicode 文本」 save dialog writes). The BOM-less shape is what a hand-rolled UTF-16 writer
 * produces, since skipping the BOM is the one thing an encoder can get away with.
 *
 * BOM first — that is a declaration. Without one, a Latin-heavy UTF-16 run has zero bytes at every
 * even (BE) or odd (LE) offset, so the parity that carries them decides the endianness, but only on a
 * strong majority: a real GBK or UTF-8 file is free to contain a few NULs and must not be hijacked.
 *
 * The one case this deliberately does not claim is UTF-16 without a BOM whose text is *all* CJK — every
 * unit has two non-zero bytes, so no parity exists to read and the byte stream is indistinguishable from
 * a GBK one. It stays on the chain and resolves as GB18030, which is the better guess for a file with no
 * BOM at all (a tool writing UTF-16 almost always writes the BOM with it). Do not "fix" this by lowering
 * the 0.6 threshold: that trades mojibake in an edge case for hijacking legitimate GBK files.
 *
 * @returns the decoder label, or `null` when the bytes are not convincibly UTF-16.
 */
function sniffUtf16(buffer: ArrayBuffer): 'utf-16le' | 'utf-16be' | null {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, UTF16_SNIFF_BYTES));
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
  }
  // An odd length cannot be UTF-16 at all. Two units are enough when the parity is perfect, which is
  // what a short Latin CSV (`id\n` is 6 bytes) looks like; GBK text never emits the NULs that would
  // fake it, since 0x00 has no place in its lead or trail byte ranges.
  if (bytes.length < 4 || bytes.length % 2 !== 0) return null;
  const units = bytes.length / 2;
  let leZeros = 0;
  let beZeros = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    if (bytes[i + 1] === 0) leZeros++;
    if (bytes[i] === 0) beZeros++;
  }
  if (leZeros / units > 0.6 && leZeros > beZeros * 4) return 'utf-16le';
  if (beZeros / units > 0.6 && beZeros > leZeros * 4) return 'utf-16be';
  return null;
}

/** @returns the first strict decode that succeeds, or `null` when no encoding covers the bytes. */
function decodeStrict(buffer: ArrayBuffer): string | null {
  const utf16 = sniffUtf16(buffer);
  if (utf16) {
    try {
      // `TextDecoder` strips a leading BOM as part of both UTF-16 algorithms, so callers never see
      // a stray U+FEFF on this path either.
      return new TextDecoder(utf16, { fatal: true }).decode(buffer);
    } catch {
      // Unpaired surrogate or truncated final unit: fall back to the chain rather than failing a
      // file that the chain can still read.
    }
  }
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
 * Characters no reader puts in a CSV, JSON or TXT it expects to open: C0 controls other than the
 * whitespace ones (`\t` `\n` `\v` `\f` `\r`), plus DEL. Three of them in one file means the bytes are
 * not text, so {@link decodeTextBlob} can say so instead of emitting mojibake.
 */
function countControlChars(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x7f || code <= 0x08 || (code >= 0x0e && code <= 0x1f)) count++;
    if (count > 2) return count;
  }
  return count;
}

/**
 * Decode a text buffer, failing when no encoding in the chain covers it, or when what came out of one
 * is not something a reader would call a document.
 *
 * For formats where the bytes *are* the document (CSV, JSON, TXT): output no reader could open is
 * worse than an error the user can act on, so a file that is not text at all is surfaced as `errorKey`.
 * The chain does most of that work on its own — measured 2026-10-17 against this repository's own
 * fixtures, every compressed one (GIF, ZIP, DOCX, XLSX, plus `public/icon/128.png`) fails all three
 * strict decodes. The count is for what the chain cannot see: UTF-16 whose units all carry two
 * non-zero bytes, i.e. the all-CJK text without a BOM that {@link sniffUtf16} deliberately does not
 * claim. Measured 2026-10-17 on `名称,城市\n爱丽丝,上海\n` (26 bytes, no BOM): GB18030 accepts them and
 * hands back 24 characters starting `\rT饄,` with six control characters in them — the smallest honest
 * signal that the bytes were two-per-character all along. A lossy conversion of a file whose text was
 * never there is the failure mode this whole function exists to avoid, so the count is applied even
 * though the sniff declines that shape.
 *
 * Not a binary sniffer: `fixtures/sample.pdf` decodes as GB18030 with *zero* control characters, so a
 * PDF renamed `.csv` would come out as mojibake rather than being refused here. It does not reach this
 * function under that name in practice — `detectFormat` reads the extension first, so a `.pdf` goes
 * down the PDF route whatever its bytes are — but do not describe either gate as "rejects anything that
 * is not text" without measuring the case being claimed.
 */
export async function decodeTextBlob(input: Blob, errorKey: string): Promise<string> {
  const decoded = decodeStrict(await input.arrayBuffer());
  if (decoded === null || countControlChars(decoded) > 2) throw new Error(errorKey);
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
