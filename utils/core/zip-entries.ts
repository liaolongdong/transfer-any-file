/**
 * Read the *contents* of a ZIP without extracting it, so a produced archive (a multi-sheet
 * XLSX→CSV or a multi-page PDF→image) can be inspected before it is downloaded.
 *
 * The two operations are deliberately separated by cost. Listing walks only the central directory:
 * fflate's `filter` callback sees every entry's declared metadata before any inflate, and returning
 * `false` for all of them means nothing is decompressed and no entry bytes are ever materialised.
 * Extraction (`inflateZipEntry`) inflates exactly one entry, chosen by name, so the whole archive is
 * never held as decoded files at once.
 *
 * Both sit behind the same `declaredEntryCount` gate the upload path uses (`~/utils/core/zip`), which
 * is what keeps a hostile footer from driving `unzip`'s synchronous per-entry loop. Entry names are
 * untrusted: they are matched and displayed, never used to build a path, and callers that hand one to
 * a download strip it to its basename first.
 */

import { loadFflate, declaredEntryCount, MAX_ZIP_ENTRIES } from '~/utils/core/zip';

/** One non-directory entry as the central directory describes it. */
export interface ZipEntryInfo {
  /** Path stored in the archive; may contain `/` separators. Displayed, never resolved. */
  name: string;
  /** Uncompressed size the archive declares for this entry, in bytes. */
  originalSize: number;
}

/** The listing handed to the archive preview, with truncation made explicit rather than implied. */
export interface ZipEntryListing {
  /** At most `MAX_LISTED_ENTRIES` entries; the entries actually returned. */
  entries: ZipEntryInfo[];
  /** Every non-directory entry discovered, whether or not it is in `entries`. */
  total: number;
  /** True when `total` exceeds `entries.length` — the listing is a prefix, not the whole archive. */
  truncated: boolean;
}

/**
 * Ceiling on how many entries the listing hands back.
 *
 * `MAX_ZIP_ENTRIES` bounds the *walk* (the synchronous central-directory loop); this bounds the
 * *render* — a list a dialog can paint without thousands of rows. A truthful conversion output never
 * reaches it (the batch cap is far lower), so it only ever trims a hostile or unusual archive, and
 * when it does the caller is told through `truncated` rather than left to count a short list.
 */
export const MAX_LISTED_ENTRIES = 2000;

/** Refuses an archive whose footer claims more entries than the walk is allowed to spend. */
function gateEntryCount(data: Uint8Array): void {
  if ((declaredEntryCount(data) ?? 0) > MAX_ZIP_ENTRIES) throw new Error('archive claims too many entries');
}

/**
 * List the entries of an archive held in `data`, without inflating any of them.
 *
 * Directory markers (`name` ending in `/`) and AppleDouble sidecars (`__MACOSX/`) carry no file the
 * preview could show, so they are skipped rather than listed. The callback runs once per entry inside
 * fflate's loop, which is why the entry-count gate above has to fire first.
 */
export async function listZipEntries(data: Uint8Array): Promise<ZipEntryListing> {
  gateEntryCount(data);
  const { unzip } = await loadFflate();
  const entries: ZipEntryInfo[] = [];
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    unzip(
      data,
      {
        filter: info => {
          if (info.name.endsWith('/') || info.name.startsWith('__MACOSX/')) return false;
          total++;
          if (entries.length < MAX_LISTED_ENTRIES) entries.push({ name: info.name, originalSize: info.originalSize });
          // Never inflate: the listing is answered from the central directory alone.
          return false;
        },
      },
      // A filter that keeps nothing hands back an empty map, not an error — the callback still fires
      // with every central directory entry visited.
      err => (err ? reject(err) : resolve()),
    );
  });
  return { entries, total, truncated: total > entries.length };
}

/**
 * Inflate the single entry named `name`, or reject when the archive has no such entry.
 *
 * `name` comes straight from `listZipEntries`, so it matches the archive's own spelling; the filter
 * compares it byte-for-byte and returns `false` for every other entry, which is what keeps the cost at
 * one file rather than the whole bundle.
 */
export async function inflateZipEntry(data: Uint8Array, name: string): Promise<Uint8Array> {
  gateEntryCount(data);
  const { unzip } = await loadFflate();
  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(data, { filter: info => info.name === name }, (err, out) => (err ? reject(err) : resolve(out)));
  });
  const bytes = files[name];
  if (!bytes) throw new Error('archive has no such entry');
  return bytes;
}
