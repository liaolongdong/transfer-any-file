import { FileFormat } from '~/utils/core/types';

/** Extension to FileFormat mapping */
const EXTENSION_MAP: Record<string, FileFormat> = {
  '.md': FileFormat.MD,
  '.html': FileFormat.HTML,
  '.htm': FileFormat.HTML,
  '.docx': FileFormat.DOCX,
  '.pdf': FileFormat.PDF,
  '.xlsx': FileFormat.XLSX,
  '.csv': FileFormat.CSV,
  '.txt': FileFormat.TXT,
  '.json': FileFormat.JSON,
  '.png': FileFormat.PNG,
  '.jpg': FileFormat.JPG,
  '.jpeg': FileFormat.JPG,
  '.webp': FileFormat.WEBP,
  '.bmp': FileFormat.BMP,
  '.gif': FileFormat.GIF,
  '.svg': FileFormat.SVG,
};

/** MIME type to FileFormat mapping (fallback) */
const MIME_MAP: Record<string, FileFormat> = {
  'text/markdown': FileFormat.MD,
  'text/html': FileFormat.HTML,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileFormat.DOCX,
  'application/pdf': FileFormat.PDF,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileFormat.XLSX,
  'text/csv': FileFormat.CSV,
  'text/plain': FileFormat.TXT,
  'application/json': FileFormat.JSON,
  'image/png': FileFormat.PNG,
  'image/jpeg': FileFormat.JPG,
  'image/webp': FileFormat.WEBP,
  'image/bmp': FileFormat.BMP,
  'image/gif': FileFormat.GIF,
  'image/svg+xml': FileFormat.SVG,
};

/** All supported file extensions, e.g. for <input accept> filtering */
export const SUPPORTED_EXTENSIONS: string[] = Object.keys(EXTENSION_MAP);

/** Own-property lookups only: the keys these maps are asked about come from user-controlled
 *  names and MIME strings, and `MIME_MAP['__proto__']` would otherwise resolve through the
 *  prototype chain and hand back a bogus format. */
function lookup(map: Record<string, FileFormat>, key: string): FileFormat | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

/**
 * Extension-only detection, for callers that hold a name rather than a `File` — a result
 * row's filename is rebuilt from the source basename plus the new extension, so wrapping it
 * in `new File([], name)` just to read the suffix costs an allocation per row per render.
 */
export function formatFromFilename(name: string): FileFormat | null {
  const lower = name.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return null;
  return lookup(EXTENSION_MAP, lower.slice(dotIndex)) ?? null;
}

/**
 * Detect a `File`'s format: extension first, MIME type as the fallback.
 *
 * Pure and stateless, which is why it sits in `utils/core/` rather than behind a composable.
 */
export function detectFormat(file: File): FileFormat | null {
  return formatFromFilename(file.name) ?? lookup(MIME_MAP, file.type.toLowerCase()) ?? null;
}
