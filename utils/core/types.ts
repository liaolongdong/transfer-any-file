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
}

// A single converter plugin interface
export interface Converter {
  from: FileFormat;
  to: FileFormat;
  convert(input: Blob): Promise<ConvertResult>;
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
