import { FileFormat } from '~/utils/core/types';
import type { FileFormatInfo, FileCategory } from '~/utils/core/types';

/** File format metadata registry */
export const FORMAT_INFO: Record<FileFormat, FileFormatInfo> = {
  [FileFormat.MD]: { format: FileFormat.MD, label: 'Markdown (.md)', mimeType: 'text/markdown', category: 'document' },
  [FileFormat.HTML]: { format: FileFormat.HTML, label: 'HTML (.html)', mimeType: 'text/html', category: 'document' },
  [FileFormat.DOCX]: {
    format: FileFormat.DOCX,
    label: 'Word (.docx)',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
  },
  [FileFormat.PDF]: { format: FileFormat.PDF, label: 'PDF (.pdf)', mimeType: 'application/pdf', category: 'document' },
  [FileFormat.XLSX]: {
    format: FileFormat.XLSX,
    label: 'Excel (.xlsx)',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'data',
  },
  [FileFormat.CSV]: { format: FileFormat.CSV, label: 'CSV (.csv)', mimeType: 'text/csv', category: 'data' },
  [FileFormat.TXT]: { format: FileFormat.TXT, label: 'Text (.txt)', mimeType: 'text/plain', category: 'document' },
  [FileFormat.JSON]: { format: FileFormat.JSON, label: 'JSON (.json)', mimeType: 'application/json', category: 'data' },
  [FileFormat.PNG]: { format: FileFormat.PNG, label: 'PNG (.png)', mimeType: 'image/png', category: 'image' },
  [FileFormat.JPG]: { format: FileFormat.JPG, label: 'JPEG (.jpg)', mimeType: 'image/jpeg', category: 'image' },
  [FileFormat.WEBP]: { format: FileFormat.WEBP, label: 'WebP (.webp)', mimeType: 'image/webp', category: 'image' },
  [FileFormat.BMP]: { format: FileFormat.BMP, label: 'BMP (.bmp)', mimeType: 'image/bmp', category: 'image' },
  [FileFormat.GIF]: { format: FileFormat.GIF, label: 'GIF (.gif)', mimeType: 'image/gif', category: 'image' },
  [FileFormat.SVG]: { format: FileFormat.SVG, label: 'SVG (.svg)', mimeType: 'image/svg+xml', category: 'image' },
};

/** Get label for a format */
export function getFormatLabel(format: FileFormat): string {
  return FORMAT_INFO[format]?.label ?? format.toUpperCase();
}

/** Get category for a format */
export function getFormatCategory(format: FileFormat): FileCategory {
  return FORMAT_INFO[format]?.category ?? 'document';
}
