import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult, ConvertContext } from '~/utils/core/types';
import { wrapHtmlDocument, documentTitle, escapeHtml } from '~/utils/core/html-document';

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
    async convert(input: Blob, ctx?: ConvertContext): Promise<ConvertResult> {
      const dataUrl = await blobToDataUrl(input);
      // The file's own name is the only description this route can offer, and unlike a hard-coded
      // `PNG image` it is not a sentence in a language the user did not pick. Escaped because it is
      // going into attribute position in a document the user opens.
      const label = escapeHtml(documentTitle(ctx?.source?.name));
      const body = `  <img src="${dataUrl}" alt="${label}" title="${label}" />`;
      const blob = wrapHtmlDocument(body, { sourceName: ctx?.source?.name, extraCss: IMAGE_DOC_CSS });
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
