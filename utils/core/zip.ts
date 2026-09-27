/**
 * Single lazy entry point for the ZIP engine.
 *
 * Every caller used to `import { … } from 'fflate'` at module scope, which put the library on
 * the first screen: the converters are registered eagerly at startup, so a top-level import in
 * `pdf-to-image` or `xlsx-to-csv` reached the entry chunk even though nothing compresses until a
 * conversion, an archive upload or a ZIP download actually runs. One cached promise keeps that a
 * single extra chunk no matter how many call sites ask for it.
 */

/** Full `fflate` module type, resolved without a runtime import. */
type Fflate = typeof import('fflate');

let fflatePromise: Promise<Fflate> | null = null;

/** Load `fflate` on first use and reuse the same module instance afterwards. */
export function loadFflate(): Promise<Fflate> {
  if (!fflatePromise) fflatePromise = import('fflate');
  return fflatePromise;
}

/** End-of-central-directory signature. */
const EOCD_SIG = 0x06054b50;
/** ZIP64 end-of-central-directory record, and the locator that points at it. */
const ZIP64_EOCD_SIG = 0x06064b50;
const ZIP64_LOCATOR_SIG = 0x07064b50;
/** A ZIP comment may push the EOCD this far past the nominal 22-byte footer. */
const EOCD_SEARCH_BACK = 65558;

/**
 * Ceiling on the entry count this app will let `fflate` walk.
 *
 * A truthful archive never reaches it: an ordinary ZIP's 16-bit field caps the claim at 65,535 and
 * the batch cap (`MAX_BATCH_FILES` in `FileUpload.vue`) refuses the contents long before that. The
 * cost it bounds is measured on the 0.8.3 extractor at 0.37–0.47 ms per thousand entries (404-byte
 * archive, ZIP64 record claiming 1,000,000 entries: 368 ms walked), so 100k costs tens of
 * milliseconds and the 4,294,967,295 a ZIP64 field can claim costs about 26 minutes of blocked
 * main thread — the difference between a stutter and a dead tab.
 */
export const MAX_ZIP_ENTRIES = 100_000;

function u16(d: Uint8Array, p: number): number {
  return (d[p] ?? 0) | ((d[p + 1] ?? 0) << 8);
}

function u32(d: Uint8Array, p: number): number {
  return ((d[p] ?? 0) | ((d[p + 1] ?? 0) << 8) | ((d[p + 2] ?? 0) << 16) | ((d[p + 3] ?? 0) << 24)) >>> 0;
}

/**
 * How many entries an archive's central directory claims, or `null` when no footer is readable
 * (a missing footer is `fflate`'s error to report, not this function's to invent one for).
 *
 * Both extractors take their iteration count from the EOCD's 16-bit field and, when a ZIP64 locator
 * parses, from the ZIP64 record behind it — then spend exactly that many turns in one synchronous
 * loop that no `filter` callback, `AbortSignal` or `await` can interrupt. Reads past the end of the
 * buffer yield zeros, which decode as a stored entry with an empty name, so the loop does not even
 * fail early: a 404-byte archive claiming 4,294,967,295 entries runs to completion. Reading the same
 * two records costs a handful of byte accesses, and it is the only check that can fire before that
 * loop starts.
 *
 * The field offsets and the ZIP64 precedence are copied from `fflate`'s `unzipSync`/`unzip` rather
 * than from APPNOTE, because a disagreement in either direction defeats the gate: the spec's
 * "consult ZIP64 only when the 16-bit field is 0xffff" lets an archive pair `count = 3` with a
 * 4-billion-entry ZIP64 record, and `fflate` walks the 4 billion.
 */
export function declaredEntryCount(data: Uint8Array): number | null {
  let e = data.length - 22;
  while (e > 0 && u32(data, e) !== EOCD_SIG) {
    if (data.length - e > EOCD_SEARCH_BACK) return null;
    e--;
  }
  if (e <= 0) return null;

  const count = u16(data, e + 8);
  // `fflate` returns its empty result before looking for a ZIP64 record, so a 0 here really means 0.
  if (count === 0) return 0;
  // Checked unconditionally: see the precedence note above.
  if (u32(data, e - 20) !== ZIP64_LOCATOR_SIG) return count;
  const ze = u32(data, e - 12);
  if (u32(data, ze) !== ZIP64_EOCD_SIG) return count;
  return u32(data, ze + 32);
}
