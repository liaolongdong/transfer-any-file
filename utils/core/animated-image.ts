/**
 * Frame counting for the routes that can only keep one.
 *
 * Why this exists: the "only the first frame survives" disclosure used to be declared on the edge
 * (`Converter.flattensInput` was true for every `gif→…` route), so it also fired for a single-frame
 * GIF — telling the user a loss happened when nothing was lost. Whether an animation exists is a
 * property of the bytes, not of the route, exactly like whether a document contains an `<svg>` (see
 * `ConvertResult.svgRasterized`), so the converter has to look and report.
 *
 * The walk stops at the second frame descriptor: a real animation is answered in the first few
 * bytes, and `SNIFF_LIMIT` bounds the other direction, for a file whose single frame is huge.
 *
 * Scope is GIF alone. Animated WebP (`VP8X`'s ANIM flag) and APNG (`acTL`) lose their frames on
 * these same routes, but the suite has no offline way to produce a decodable file of either kind,
 * and a read nobody can exercise is not something to ship in front of users.
 */

/** Most bytes read while looking for a second frame. */
const SNIFF_LIMIT = 4 * 1024 * 1024;

/** `GIF87a` / `GIF89a` — a GIF's own label, checked because an uploaded file's name is not evidence. */
function isGifStream(bytes: Uint8Array): boolean {
  return (
    bytes.length > 5 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

/**
 * Walk a GIF data stream: `0x21` extensions and image data are sub-block chains terminated by a zero
 * length byte, and `p` comes back parked on the byte after that terminator.
 *
 * Every branch of the caller advances `p`, and so does this loop, so truncated input or garbage ends
 * the walk instead of spinning in it.
 */
function skipSubBlocks(bytes: Uint8Array, p: number): number {
  while (p < bytes.length) {
    const size = bytes[p];
    if (size === 0) return p + 1;
    p += 1 + size;
  }
  return p;
}

/** Whether `input` holds more than one frame; anything unreadable or non-GIF answers `false`. */
export async function hasMultipleFrames(input: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await input.slice(0, SNIFF_LIMIT).arrayBuffer());
  if (!isGifStream(bytes)) return false;

  // Logical screen descriptor: 6-byte header + 7 bytes, then the global color table if the packed
  // flags announce one (2^(n+1) entries of 3 bytes).
  const packed = bytes[10];
  let p = 13;
  if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1));

  let frames = 0;
  while (p < bytes.length) {
    const introducer = bytes[p];
    if (introducer === 0x3b) break; // trailer: the file says it has no more frames
    if (introducer === 0x21) {
      p = skipSubBlocks(bytes, p + 2); // application / comment / graphic control: label, then blocks
      continue;
    }
    if (introducer === 0x2c) {
      frames++;
      if (frames > 1) return true;
      p += 9; // the four coordinate shorts; the packed flags byte sits right after them
      const localPacked = bytes[p];
      p += 1;
      if (localPacked & 0x80) p += 3 * (1 << ((localPacked & 7) + 1));
      p = skipSubBlocks(bytes, p + 1); // LZW minimum code size, then the compressed image data
      continue;
    }
    p += 1; // anything else is not a block introducer this reader will interpret
  }

  return false;
}
