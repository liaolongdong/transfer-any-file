import { FileFormat } from '~/utils/core/types';
import type { FileFormatInfo, FileCategory } from '~/utils/core/types';

/** Map FileFormat to human-readable label */
export const FORMAT_LABELS: Record<FileFormat, string> = {
  [FileFormat.MD]: 'Markdown (.md)',
  [FileFormat.HTML]: 'HTML (.html)',
  [FileFormat.DOCX]: 'Word (.docx)',
  [FileFormat.PDF]: 'PDF (.pdf)',
  [FileFormat.XLSX]: 'Excel (.xlsx)',
  [FileFormat.CSV]: 'CSV (.csv)',
  [FileFormat.TXT]: 'Text (.txt)',
  [FileFormat.PNG]: 'PNG (.png)',
  [FileFormat.JPG]: 'JPEG (.jpg)',
  [FileFormat.WEBP]: 'WebP (.webp)',
  [FileFormat.BMP]: 'BMP (.bmp)',
};

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
  [FileFormat.PNG]: { format: FileFormat.PNG, label: 'PNG (.png)', mimeType: 'image/png', category: 'image' },
  [FileFormat.JPG]: { format: FileFormat.JPG, label: 'JPEG (.jpg)', mimeType: 'image/jpeg', category: 'image' },
  [FileFormat.WEBP]: { format: FileFormat.WEBP, label: 'WebP (.webp)', mimeType: 'image/webp', category: 'image' },
  [FileFormat.BMP]: { format: FileFormat.BMP, label: 'BMP (.bmp)', mimeType: 'image/bmp', category: 'image' },
};

/** Get label for a format */
export function getFormatLabel(format: FileFormat): string {
  return FORMAT_LABELS[format] ?? format.toUpperCase();
}

/** Get category for a format */
export function getFormatCategory(format: FileFormat): FileCategory {
  return FORMAT_INFO[format]?.category ?? 'document';
}
