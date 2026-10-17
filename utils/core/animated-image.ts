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
 * bytes. Reading is windowed (`SNIFF_LIMIT`) but the *answer* is not: a walk that runs off the end of
 * the window without meeting the trailer is re-run over the whole stream, because a big first frame
 * past 4 MB otherwise answers "one frame" and the batch line then says nothing about the frames the
 * user just lost — the silence is the failure this function exists to prevent.
 *
 * Scope is GIF alone. Animated WebP (`VP8X`'s ANIM flag) and APNG (`acTL`) lose their frames on
 * these same routes, but the suite has no offline way to produce a decodable file of either kind,
 * and a read nobody can exercise is not something to ship in front of users.
 */

/** Bytes read by the first pass; a decisive answer there costs no more than this. */
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

/**
 * Walk one buffer of GIF blocks.
 *
 * `multi` says a second image descriptor was counted. `conclusive` says the walk reached an end that
 * means something — the trailer, a buffer that is the whole file, or a stream that is not a GIF — as
 * opposed to running off the edge of a window that still has bytes behind it.
 */
function scanFrames(bytes: Uint8Array, isWholeFile: boolean): { multi: boolean; conclusive: boolean } {
  if (!isGifStream(bytes)) return { multi: false, conclusive: true };
  if (isWholeFile && bytes.length <= 13) return { multi: false, conclusive: true };

  // Logical screen descriptor: 6-byte header + 7 bytes, then the global color table if the packed
  // flags announce one (2^(n+1) entries of 3 bytes).
  const packed = bytes[10];
  let p = 13;
  if (packed & 0x80) {
    const tableEnd = p + 3 * (1 << ((packed & 7) + 1));
    // A header claiming a color table larger than the buffer is a corrupt or truncated stream. The
    // caller can only ask "is this animated", and the only honest answer to that is "no".
    if (tableEnd > bytes.length) return { multi: false, conclusive: isWholeFile };
    p = tableEnd;
  }

  let frames = 0;
  while (p < bytes.length) {
    const introducer = bytes[p];
    if (introducer === 0x3b) return { multi: false, conclusive: true }; // trailer: no more frames
    if (introducer === 0x21) {
      p = skipSubBlocks(bytes, p + 2); // application / comment / graphic control: label, then blocks
      continue;
    }
    if (introducer === 0x2c) {
      p += 9; // the four coordinate shorts; the packed flags byte sits right after them
      const localPacked = bytes[p];
      if (localPacked === undefined) return { multi: false, conclusive: isWholeFile };
      p += 1;
      if (localPacked & 0x80) {
        const localTableEnd = p + 3 * (1 << ((localPacked & 7) + 1));
        if (localTableEnd > bytes.length) return { multi: false, conclusive: isWholeFile };
        p = localTableEnd;
      }
      p = skipSubBlocks(bytes, p + 1); // LZW minimum code size, then the compressed image data
      // Counting happens once the frame's own blocks are behind us, so a truncated last frame inside a
      // window cannot be mistaken for a second frame that exists.
      frames++;
      if (frames > 1) return { multi: true, conclusive: true };
      continue;
    }
    p += 1; // anything else is not a block introducer this reader will interpret
  }

  return { multi: false, conclusive: isWholeFile };
}

/** Whether `input` holds more than one frame; anything unreadable or non-GIF answers `false`. */
export async function hasMultipleFrames(input: Blob): Promise<boolean> {
  const head = new Uint8Array(await input.slice(0, SNIFF_LIMIT).arrayBuffer());
  const first = scanFrames(head, head.length >= input.size);
  if (first.conclusive) return first.multi;

  // A single frame whose data runs past the window. `scanFrames` is a linear byte walk, so re-reading
  // the whole stream is the cheap way to finish it; this path is also the one where the file was
  // already going to be decoded in full by the converter.
  const whole = new Uint8Array(await input.arrayBuffer());
  return scanFrames(whole, true).multi;
}
