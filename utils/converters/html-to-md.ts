import TurndownService from 'turndown';
import { FileFormat } from '~/utils/core/types';
import type { Converter, ConvertResult } from '~/utils/core/types';

const htmlToMdConverter: Converter = {
  from: FileFormat.HTML,
  to: FileFormat.MD,

  async convert(input: Blob): Promise<ConvertResult> {
    const html = await input.text();
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndown.turndown(html);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    return { blob, filename: 'converted.md' };
  },
};

export default htmlToMdConverter;
