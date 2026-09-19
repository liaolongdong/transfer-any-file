// File format enum - all supported formats
export enum FileFormat {
  MD = 'md',
  HTML = 'html',
  DOCX = 'docx',
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
  TXT = 'txt',
  JSON = 'json',
  PNG = 'png',
  JPG = 'jpg',
  WEBP = 'webp',
  BMP = 'bmp',
  GIF = 'gif',
  SVG = 'svg',
}

// Result of a conversion
export interface ConvertResult {
  blob: Blob;
  filename: string;
  /**
   * Real container extension of `blob`, when it differs from the nominal conversion target.
   *
   * A multi-sheet XLSX→CSV and a multi-page PDF→PNG both yield a ZIP while the target still says
   * CSV / PNG. Before this field existed the orchestrator recovered that fact by regex-scanning the
   * converter's own `converted.*` filename — a name that is otherwise discarded, since output files
   * are rebuilt from the source basename. The field makes the container explicit; the filename scan
   * remains only as the fallback for converters that do not declare it.
   */
  containerExt?: string;
}

/**
 * User-tunable output parameters for conversions that produce an image.
 *
 * Every field is optional and *absent means unchanged*: an unset option has to leave the encoder
 * exactly where it was, so a batch the user never touched stays byte-for-byte what it was before
 * this feature existed. Values arrive from `storage`, so consumers must treat them as untrusted and
 * re-clamp rather than assume the picker produced a legal number.
 */
export interface ImageOutputOptions {
  /**
   * Encoder quality in `(0, 1]`, honoured only by the lossy containers (JPEG / WebP).
   * PNG ignores it entirely — `canvas.toBlob` has no quality knob for it — which is why the
   * quality control is hidden for a PNG target instead of shown and silently inert.
   */
  quality?: number;
  /**
   * Longest edge in pixels. A larger image is downscaled with the aspect ratio preserved;
   * it never upscales.
   */
  maxEdge?: number;
  /**
   * Render density for PDF sources, in real DPI. PDF units are 1/72 inch, so this maps to the
   * pdf.js page scale (`dpi / 72`). Ignored by every converter that is not rasterizing a PDF.
   */
  dpi?: number;
  /**
   * Best-effort ceiling for the encoded file, in kilobytes.
   *
   * Stepping quality (then scale) can approach a size but never guarantee it, so this is a target
   * the encoder walks towards and reports the closest result for, not an assertion.
   */
  targetSizeKB?: number;
}

/**
 * A named shortcut for "convert to this format with these output parameters".
 *
 * The *source* format is deliberately not part of it: a preset is offered to any batch that can
 * reach `target`, which is what makes "PNG at 1280 px" one click for a PDF, HTML and SVG source
 * alike. `name` is text the user typed, so it is never run through i18n, and `options` is `{}` for
 * a non-image target because nothing else has parameters to remember.
 */
export interface ConversionPreset {
  id: string;
  name: string;
  target: FileFormat;
  options: ImageOutputOptions;
}

/**
 * Per-run context handed to a converter alongside the source bytes.
 *
 * Every member is optional, and so is the parameter itself: a converter that only needs the blob
 * can keep declaring `convert(input: Blob)`, since TypeScript allows an implementation to take
 * fewer parameters than the interface promises.
 */
export interface ConvertContext {
  /**
   * Aborted when the user cancels the batch.
   *
   * Converters must poll this inside their own long loops: the orchestrator can only check the
   * signal *between* steps, so without a cooperative check here a single 100-page PDF→PNG or a
   * tall HTML→PDF runs to completion no matter how many times the user presses cancel.
   */
  signal?: AbortSignal;
  /**
   * The uploaded file this conversion chain belongs to — the same object on every step of a
   * multi-step chain, so it describes the user's input rather than an intermediate blob. A
   * converter that needs to know what it is *receiving* has its own `from` for that.
   */
  source?: { name: string; size: number; type: string };
  /**
   * Output preferences for this run, shared by every step of the chain.
   *
   * Only the steps that paint an image read it, and each reads only the fields that apply to it:
   * a PDF→JPG batch applies `dpi` at the PDF→PNG step and `quality` at the PNG→JPG one.
   */
  options?: ImageOutputOptions;
}

// A single converter plugin interface
export interface Converter {
  from: FileFormat;
  to: FileFormat;
  /**
   * Tie-breaker among equal-length conversion routes, lower winning.
   *
   * `findConversionPath` is a BFS over an adjacency list and returns the FIRST shortest path, so
   * when two routes tie — `html→pdf→jpg` vs `html→png→jpg` — the winner was decided by which
   * `register()` call happened earlier in `initConverters()`. That made source-file order an
   * undeclared input to which artifact a user receives. This field makes the choice a property of
   * the edge. Absent means 0, i.e. "no declared preference", and ties among equals still fall back
   * to registration order — declared, not accidental.
   */
  edgePreference?: number;
  convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult>;
}

// A step in a conversion pipeline
export interface ConversionStep {
  converter: Converter;
  from: FileFormat;
  to: FileFormat;
}

// File category for UI grouping
export type FileCategory = 'document' | 'image' | 'data';

// File format metadata
export interface FileFormatInfo {
  format: FileFormat;
  label: string;
  mimeType: string;
  category: FileCategory;
}
