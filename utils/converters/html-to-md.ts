import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const htmlToMdConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.MD,

  async convert(input: Blob): Promise<ConvertResult> {
    const { default: TurndownService } = await import('turndown');
    const html = await input.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const bodyHtml = doc.body?.innerHTML ?? html;

    // Images are kept as ![alt](src) so image/docx→MD outputs preserve
    // content instead of coming out empty.
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndown.turndown(bodyHtml);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    return { blob, filename: 'converted.md' };
  },
};

export default htmlToMdConverter;
