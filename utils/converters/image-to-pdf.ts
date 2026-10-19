import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { convertImageToPdf } from '~/utils/core/image-pdf';

function createImageToPdfConverter(from: FileFormat): Converter {
  return {
    from,
    to: FileFormat.PDF,
    convert: (input: Blob): Promise<ConvertResult> => convertImageToPdf(input, from),
  };
}

export const imageToPdfConverters: Converter[] = [
  createImageToPdfConverter(FileFormat.JPG),
  createImageToPdfConverter(FileFormat.WEBP),
  createImageToPdfConverter(FileFormat.BMP),
  createImageToPdfConverter(FileFormat.GIF),
];
