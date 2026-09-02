import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { wrapHtmlDocument } from '~/utils/core/html-document';

const IMAGE_DOC_CSS = `
    body { text-align: center; padding: 2rem; }
    img { display: block; margin: 0 auto; max-width: 100%; height: auto; }
`;

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function createImageToHtmlConverter(from: FileFormat): Converter {
  return {
    from,
    to: FileFormat.HTML,
    async convert(input: Blob): Promise<ConvertResult> {
      const dataUrl = await blobToDataUrl(input);
      const formatName = from.toUpperCase();
      const body = `  <img src="${dataUrl}" alt="${formatName} image" title="${formatName} image" />`;
      const blob = wrapHtmlDocument(body, { title: 'Image Document', extraCss: IMAGE_DOC_CSS });
      return { blob, filename: 'converted.html' };
    },
  };
}

const imageToHtmlConverter: Converter = createImageToHtmlConverter(FileFormat.PNG);
export default imageToHtmlConverter;

export const imageToHtmlConverters: Converter[] = [
  createImageToHtmlConverter(FileFormat.JPG),
  createImageToHtmlConverter(FileFormat.WEBP),
  createImageToHtmlConverter(FileFormat.BMP),
  createImageToHtmlConverter(FileFormat.GIF),
];
