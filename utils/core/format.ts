import { FileFormat } from '~/utils/core/types';

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/** Formats that can be safely read as text and copied to the clipboard. */
export const TEXT_FORMATS = new Set<FileFormat>([
  FileFormat.MD,
  FileFormat.HTML,
  FileFormat.TXT,
  FileFormat.CSV,
  FileFormat.JSON,
]);
