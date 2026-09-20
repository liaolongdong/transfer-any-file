import { loadFflate } from '~/utils/core/zip';

/**
 * DOCX files produced by html-docx-js (and this app's HTML→DOCX converter)
 * store their content as an MHTML chunk referenced via <w:altChunk>.
 * mammoth cannot read altChunk documents, so this module reverses the MHT
 * packaging to recover the original HTML (including embedded images).
 */

interface MhtPart {
  contentType: string;
  encoding: string;
  location: string;
  body: string;
}

function decodeQuotedPrintable(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const out: number[] = [];
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
        out.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    out.push(b);
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(out));
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
  const { unzipSync, strFromU8 } = await loadFflate();
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(docxBytes);
  } catch {
    return null;
  }

  const mhtKey = Object.keys(entries).find(k => k.endsWith('.mht'));
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
