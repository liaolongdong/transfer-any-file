import { loadFflate, declaredEntryCount, MAX_ZIP_ENTRIES } from '~/utils/core/zip';

/**
 * DOCX files produced by html-docx-js (and this app's HTML→DOCX converter)
 * store their content as an MHTML chunk referenced via <w:altChunk>.
 * mammoth cannot read altChunk documents, so this module reverses the MHT
 * packaging to recover the original HTML (including embedded images).
 */

/**
 * Ceiling for the MHT part this module reads, checked against the size the archive's own central
 * directory declares for it.
 *
 * `unzipSync` allocates the fully inflated bytes of every entry it is asked to keep, so without a
 * gate a document that pairs a 1 KB MHT with a padded entry of zeros is expanded in its entirety
 * before a single character is parsed. Skipping entries that are not the MHT is what removes most of
 * that exposure; this number covers the MHT itself. Measured on fflate 0.8: with the filter in place
 * a 41 MB decoy entry is never inflated (the archive reads back as one key), while the unfiltered
 * call allocates all 41,943,095 bytes of it.
 *
 * The check is declared-size based, which is the same trade `readArchive` in `FileUpload.vue` makes:
 * it fires before any inflate happens, which is the only moment refusing is cheap, and a header is
 * free to lie about the number. It is a budget, not a proof.
 */
const MAX_MHT_BYTES = 200 * 1024 * 1024;

/** The one entry shape this module consumes. */
function isMhtEntry(name: string): boolean {
  return name.toLowerCase().endsWith('.mht');
}

interface MhtPart {
  contentType: string;
  encoding: string;
  location: string;
  body: string;
}

function decodeQuotedPrintable(input: string): string {
  const bytes = new TextEncoder().encode(input);
  // Sized for the worst case and written in place, rather than accumulated in a `number[]`: the body
  // is already bounded by MAX_MHT_BYTES, but measured on a 5 MB body the boxed array cost 155 MB of
  // heap against 5 MB for the buffer — 31× the payload, so a body near the ceiling asks for around
  // 6 GB and the tab dies on the allocation, not on the parse. The boxed version was also 6.7×
  // slower (658 ms against 98 ms), because `new Uint8Array(array)` then walks it one element at a time.
  const out = new Uint8Array(bytes.length);
  let n = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x3d /* '=' */) {
      // soft line breaks: "=CRLF" or "=LF"
      if (bytes[i + 1] === 0x0d && bytes[i + 2] === 0x0a) {
        i += 2;
        continue;
      }
      if (bytes[i + 1] === 0x0a) {
        i += 1;
        continue;
      }
      const hex = String.fromCharCode(bytes[i + 1], bytes[i + 2]);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        out[n++] = parseInt(hex, 16);
        i += 2;
        continue;
      }
    }
    out[n++] = b;
  }
  return new TextDecoder('utf-8').decode(out.subarray(0, n));
}

function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let currentKey = '';
  for (const rawLine of headerBlock.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (/^[ \t]/.test(line) && currentKey) {
      headers[currentKey] += line.trim();
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    currentKey = line.slice(0, idx).trim().toLowerCase();
    headers[currentKey] = line.slice(idx + 1).trim();
  }
  return headers;
}

function parseMht(mhtText: string): MhtPart[] {
  const boundaryMatch = mhtText.match(/boundary="([^"]+)"/);
  if (!boundaryMatch) return [];
  const boundary = `--${boundaryMatch[1]}`;

  const parts: MhtPart[] = [];
  for (const chunk of mhtText.split(boundary)) {
    const trimmed = chunk.replace(/^\r?\n/, '');
    if (!trimmed || trimmed.startsWith('--')) continue;
    const sep = trimmed.search(/\r?\n\r?\n/);
    if (sep === -1) continue;
    const headerBlock = trimmed.slice(0, sep);
    const body = trimmed
      .slice(sep)
      .replace(/^\r?\n\r?\n/, '')
      .replace(/\r?\n$/, '');
    const headers = parseHeaders(headerBlock);
    parts.push({
      contentType: (headers['content-type'] ?? '').split(';')[0].trim(),
      encoding: (headers['content-transfer-encoding'] ?? '').trim().toLowerCase(),
      location: (headers['content-location'] ?? '').trim(),
      body,
    });
  }
  return parts;
}

/** Extract the original HTML from an altChunk-based DOCX. Returns null when absent.
 *  Async because `fflate` is loaded on demand rather than at module scope. */
export async function extractAltChunkHtml(docxBytes: Uint8Array): Promise<string | null> {
  // Same reason `FileUpload.readArchive` checks it: `unzipSync` takes its loop count from the
  // footer's 32-bit ZIP64 field and walks it synchronously, so the claim has to be refused before
  // the call. A real DOCX carries a handful of parts, nowhere near the ceiling.
  if ((declaredEntryCount(docxBytes) ?? 0) > MAX_ZIP_ENTRIES) return null;
  const { unzipSync, strFromU8 } = await loadFflate();
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(docxBytes, {
      filter: file => isMhtEntry(file.name) && file.originalSize <= MAX_MHT_BYTES,
    });
  } catch {
    return null;
  }

  const mhtKey = Object.keys(entries).find(k => isMhtEntry(k));
  if (!mhtKey) return null;

  const parts = parseMht(strFromU8(entries[mhtKey]));
  const htmlPart = parts.find(p => p.contentType === 'text/html');
  if (!htmlPart) return null;

  let html = htmlPart.encoding === 'quoted-printable' ? decodeQuotedPrintable(htmlPart.body) : htmlPart.body;

  // Re-inline image parts that the generator swapped out for fake file URLs.
  // Both fields come from attacker-controlled MHT headers: `contentType` is
  // validated so the assembled `data:` URL cannot carry quotes or markup into
  // the document, and a too-short `location` is refused because `split()` on it
  // would rewrite every occurrence of that text, destroying the document.
  for (const part of parts) {
    if (!part.location || part.location.length < 6) continue;
    if (!/^image\/[a-z0-9.+-]{1,32}$/i.test(part.contentType)) continue;
    const base64 = part.body.replace(/\s+/g, '');
    const dataUrl = `data:${part.contentType.toLowerCase()};base64,${base64}`;
    html = html.split(part.location).join(dataUrl);
  }

  return html;
}
