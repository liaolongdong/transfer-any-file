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
 *
 * It is not a tight budget on purpose, and lowering it is the wrong knob: with `MAX_MHT_PARTS` at one,
 * this number already *is* the total inflate cost, and an altChunk's MHT is legitimately larger than
 * the `.docx` holding it (the part is deflated, and base64 images add a third to their bytes). A cut
 * below the 100 MB the uploader accepts would start refusing documents that convert fine today, while
 * the hostile case it guards — a padded header — stays inside this ceiling. What the two caps below
 * bound is the work done *after* the inflate, which is where the real amplification was.
 */
const MAX_MHT_BYTES = 200 * 1024 * 1024;

/**
 * How many `.mht` entries the filter may keep. One, because that is all this module can use:
 * `extractAltChunkHtml` picks `find(isMhtEntry)` out of the returned map and ignores the rest, so
 * every additional part was allocated in full and then discarded. A document pairing one real MHT
 * with N padded ones is the amplification this cap removes — measured on fflate 0.8, three 200 MB
 * declared entries cost 600 MB of retained buffers while only one of them is ever read.
 */
const MAX_MHT_PARTS = 1;

/**
 * Ceiling on the bytes re-inlined into the recovered document.
 *
 * Bounds the one direction the linear scan below cannot see: a single image part whose fake
 * `file:///` location is repeated through the document thousands of times, each hit inserting the
 * whole payload. Generous by construction — the images a document can carry are already capped by the
 * 100 MB upload ceiling and base64 adds a third, so nothing a user could have produced reaches this.
 */
const MAX_INLINED_BYTES = 256 * 1024 * 1024;

/**
 * A `Content-Location` as MIME specifies it: an absolute URI, taken whole rather than from wherever it
 * happens to sit inside a longer string. Quotation marks, angle brackets, whitespace and a backslash
 * end it, which is every place an attribute value or a CSS `url()` can legitimately stop. The 512 cap
 * is what keeps a failed match cheap at every position of the document; the locations this module
 * exists to recover — `file:///C:/fake/imageN.png`, from the generator that writes them — are a
 * fraction of it.
 */
const MHT_LOCATION_TOKEN = /[A-Za-z][A-Za-z0-9+.-]{1,31}:\/\/[^\s"'<>\\]{1,512}/g;

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
  // A running budget rather than a per-entry test: the ceiling is about what this call allocates in
  // total, and `filter` runs before any inflate, which is the only moment refusing is still cheap.
  let mhtBudget = MAX_MHT_BYTES;
  let mhtParts = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(docxBytes, {
      filter: file => {
        if (!isMhtEntry(file.name) || mhtParts >= MAX_MHT_PARTS || file.originalSize > mhtBudget) return false;
        mhtBudget -= file.originalSize;
        mhtParts++;
        return true;
      },
    });
  } catch {
    return null;
  }

  const mhtKey = Object.keys(entries).find(k => isMhtEntry(k));
  if (!mhtKey) return null;

  const parts = parseMht(strFromU8(entries[mhtKey]));
  const htmlPart = parts.find(p => p.contentType === 'text/html');
  if (!htmlPart) return null;

  const html = htmlPart.encoding === 'quoted-printable' ? decodeQuotedPrintable(htmlPart.body) : htmlPart.body;

  // Re-inline image parts that the generator swapped out for fake file URLs.
  // Both fields come from attacker-controlled MHT headers: `contentType` is validated so the assembled
  // `data:` URL cannot carry quotes or markup into the document, and a too-short `location` is refused
  // because a token that short is not a URI, and matching it would rewrite unrelated text.
  //
  // One scan rather than one rewrite per part, because the old shape cost the *product* of the two
  // sizes: `split`/`join` rebuilds the whole string for every part, so P parts over an L-character
  // document move L×P bytes. Measured on this machine against a 1 MB document — 2 000 image parts took
  // 11.6 s and 20 000 of them took 141 s (16 GB of string copies), against 0.75 s and 0.12 s for the
  // scan below on the identical input. The second row is not even adversarial: it is a document with a
  // lot of pictures in it. Under this module's 200 MB ceiling the product has no useful bound at all.
  // Matching whole URI-shaped tokens keeps the pass linear in the document, and the cap above bounds
  // what one hit can insert. Output is byte-identical to the old loop on the generated `sample.docx`.
  const inlinedUrls = new Map<string, string>();
  for (const part of parts) {
    if (!part.location || part.location.length < 6) continue;
    if (!/^image\/[a-z0-9.+-]{1,32}$/i.test(part.contentType)) continue;
    if (inlinedUrls.has(part.location)) continue;
    const base64 = part.body.replace(/\s+/g, '');
    inlinedUrls.set(part.location, `data:${part.contentType.toLowerCase()};base64,${base64}`);
  }
  if (inlinedUrls.size === 0) return html;

  let inlinedBytes = 0;
  return html.replace(MHT_LOCATION_TOKEN, token => {
    const url = inlinedUrls.get(token);
    if (url === undefined || inlinedBytes + url.length > MAX_INLINED_BYTES) return token;
    inlinedBytes += url.length;
    return url;
  });
}
