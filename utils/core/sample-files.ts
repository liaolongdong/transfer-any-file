import { FileFormat } from './types';

/**
 * Built-in demo inputs for the empty workbench.
 *
 * Everything here is generated at click time from a string or a canvas: no sample bytes ship in the
 * bundle, nothing is fetched, and the produced `File` follows the same pipeline as a dropped file.
 * The names are deliberately generic so a file that ends up in a download folder never looks like
 * the user's own document.
 */
export type SampleKind = 'markdown' | 'csv' | 'image';

type Locale = 'zh' | 'en';

/** The target each sample is meant to demonstrate. Picked to show one fast route, one data route,
 *  and one multi-step route (Markdown → HTML → PDF) without choosing for the user afterwards. */
export const SAMPLE_TARGETS: Readonly<Record<SampleKind, FileFormat>> = {
  markdown: FileFormat.PDF,
  csv: FileFormat.JSON,
  image: FileFormat.WEBP,
};

// This is sample *content*, not interface chrome: it is the document the user chooses to stage,
// so it lives beside the generator rather than in the UI dictionaries. Both languages are present
// and selected by the `locale` argument; nothing here is rendered until a sample is clicked.
const MARKDOWN: Readonly<Record<Locale, string>> = {
  zh: [
    '# 示例文档',
    '',
    '这是一段用来试用转换流程的示例文字。它只在本机生成，不会上传。',
    '',
    '## 能试出什么',
    '',
    '- 标题、列表、表格和代码块会一起渲染',
    '- Markdown → PDF 会经过 HTML，自动走两步',
    '',
    '| 项目 | 值 |',
    '| --- | --- |',
    '| 源格式 | Markdown |',
    '| 目标格式 | PDF |',
    '| 网络请求 | 0 |',
    '',
    '~~~js',
    'const offline = true;',
    '~~~',
    '',
  ].join('\n'),
  en: [
    '# Sample document',
    '',
    'This text exists so you can try the conversion flow. It is generated on this device and never uploaded.',
    '',
    '## What it exercises',
    '',
    '- Headings, lists, tables and code blocks render together',
    '- Markdown → PDF goes through HTML, so the route runs in two steps',
    '',
    '| Item | Value |',
    '| --- | --- |',
    '| Source | Markdown |',
    '| Target | PDF |',
    '| Network requests | 0 |',
    '',
    '~~~js',
    'const offline = true;',
    '~~~',
    '',
  ].join('\n'),
};

const CSV: Readonly<Record<Locale, string>> = {
  zh: ['id,name,amount,code', '1,示例 A,12.5,00123', '2,示例 B,8,00042', '3,示例 C,120,10001', ''].join('\n'),
  en: ['id,name,amount,code', '1,Sample A,12.5,00123', '2,Sample B,8,00042', '3,Sample C,120,10001', ''].join('\n'),
};

function createMarkdownSample(locale: Locale): File {
  return new File([MARKDOWN[locale]], 'sample-document.md', { type: 'text/markdown' });
}

function createCsvSample(locale: Locale): File {
  return new File([CSV[locale]], 'sample-table.csv', { type: 'text/csv' });
}

/**
 * Draw a small PNG in the browser instead of shipping a fixture.
 *
 * `toBlob` is asynchronous and may legitimately return `null` (a canvas too large to encode, or a
 * context that never initialized); the caller turns that into a warning rather than a silent
 * no-op, because a sample button that does nothing is indistinguishable from a broken workbench.
 */
async function createImageSample(locale: Locale): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  const wash = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  wash.addColorStop(0, '#409eff');
  wash.addColorStop(1, '#10b981');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(560, 70, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(90, 350, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(48, 96, 544, 208);

  ctx.fillStyle = '#fff';
  ctx.font = '700 40px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(locale === 'zh' ? '示例图片' : 'Sample image', 72, 184);
  ctx.font = '500 20px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(locale === 'zh' ? '本地生成 · 640 × 400' : 'Generated locally · 640 × 400', 72, 222);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('canvas could not encode the sample');
  return new File([blob], 'sample-image.png', { type: 'image/png' });
}

export async function createSampleFile(kind: SampleKind, locale: Locale): Promise<File> {
  if (kind === 'image') return createImageSample(locale);
  return kind === 'csv' ? createCsvSample(locale) : createMarkdownSample(locale);
}
