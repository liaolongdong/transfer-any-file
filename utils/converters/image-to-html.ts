import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';
import { DOCUMENT_CSS } from '~/utils/converters/md-to-html';

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
      const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Document</title>
  <style>${DOCUMENT_CSS}
    body { text-align: center; }
    img { display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="Embedded image" />
</body>
</html>`;
      const blob = new Blob([htmlDoc], { type: 'text/html' });
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
];
