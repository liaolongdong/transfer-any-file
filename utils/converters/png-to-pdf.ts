import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { convertImageToPdf } from '~/utils/core/image-pdf';

export const pngToPdfConverter: Converter = {
  from: FileFormat.PNG,
  to: FileFormat.PDF,
  convert: (blob: Blob): Promise<ConvertResult> => convertImageToPdf(blob, FileFormat.PNG),
};
