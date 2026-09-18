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

export function useFileDetect() {
  /** Detect FileFormat from File object (extension first, MIME fallback) */
  function detectFormat(file: File): FileFormat | null {
    // Own-property lookups only: `file.type` and the name suffix are user-controlled,
    // and `MIME_MAP['__proto__']` would otherwise resolve through the prototype chain
    // and hand back a bogus format.
    const extOf = (map: Record<string, FileFormat>, key: string): FileFormat | undefined =>
      Object.hasOwn(map, key) ? map[key] : undefined;

    // Try extension first
    const name = file.name.toLowerCase();
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex !== -1) {
      const byExt = extOf(EXTENSION_MAP, name.slice(dotIndex));
      if (byExt) {
        return byExt;
      }
    }

    // Fallback to MIME type
    const byMime = extOf(MIME_MAP, file.type.toLowerCase());
    return byMime ?? null;
  }

  return { detectFormat };
}
