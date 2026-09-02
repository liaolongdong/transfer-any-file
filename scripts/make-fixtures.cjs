/* Generates binary fixtures (DOCX/XLSX/PDF) for conversion verification. */
const fs = require('node:fs');
const path = require('node:path');
const { asBlob } = require('html-docx-js-typescript');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const { zipSync, strToU8 } = require('fflate');

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  const outDir = path.join(__dirname, '..', 'fixtures');
  fs.mkdirSync(outDir, { recursive: true });

  // DOCX with headings, lists, a table and an embedded image
  const docxHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
    <h1>季度报告</h1>
    <p>这是<strong>加粗</strong>与<em>斜体</em>的示例段落。</p>
    <ul><li>第一项</li><li>第二项</li></ul>
    <table><tr><th>名称</th><th>数值</th></tr><tr><td>Alpha</td><td>10</td></tr><tr><td>Beta</td><td>20</td></tr></table>
    <img src="${TINY_PNG}" alt="嵌入图片" />
  </body></html>`;
  const docxBlob = await asBlob(docxHtml);
  const docxBuffer = Buffer.isBuffer(docxBlob)
    ? docxBlob
    : Buffer.from(await docxBlob.arrayBuffer());
  fs.writeFileSync(path.join(outDir, 'sample.docx'), docxBuffer);

  // XLSX with two sheets
  const wb = XLSX.utils.book_new();
  const sheet1 = XLSX.utils.aoa_to_sheet([
    ['姓名', '部门', '分数'],
    ['张三', '研发', 92],
    ['李四', '设计', 88],
  ]);
  const sheet2 = XLSX.utils.aoa_to_sheet([['备注'], ['季度汇总']]);
  XLSX.utils.book_append_sheet(wb, sheet1, '员工');
  XLSX.utils.book_append_sheet(wb, sheet2, '备注');
  XLSX.writeFile(wb, path.join(outDir, 'sample.xlsx'));

  // PDF with a couple of text lines
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(18);
  doc.text('Sample PDF Title', 72, 96);
  doc.setFontSize(12);
  doc.text('This is the first body line of the PDF.', 72, 130);
  doc.text('Second line with more content for extraction.', 72, 150);
  doc.save(path.join(outDir, 'sample.pdf'));

  // Two-page PDF (verifies PDF→PNG exports multi-page documents as a ZIP)
  const twoPage = new jsPDF({ unit: 'pt', format: 'a4' });
  twoPage.setFontSize(16);
  twoPage.text('Page One', 72, 96);
  twoPage.setFontSize(12);
  twoPage.text('Content on the first page.', 72, 130);
  twoPage.addPage();
  twoPage.setFontSize(16);
  twoPage.text('Page Two', 72, 96);
  twoPage.setFontSize(12);
  twoPage.text('Content on the second page.', 72, 130);
  twoPage.save(path.join(outDir, 'sample-2page.pdf'));

  // Single-sheet XLSX (regression: multi-sheet workbooks export a ZIP,
  // single-sheet workbooks must keep the plain CSV output)
  const single = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    single,
    XLSX.utils.aoa_to_sheet([
      ['产品', '价格'],
      ['键盘', 299],
      ['鼠标', 99],
    ]),
    '目录',
  );
  XLSX.writeFile(single, path.join(outDir, 'single-sheet.xlsx'));

  // 1x1 GIF (well-known minimal valid GIF89a)
  const GIF_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  fs.writeFileSync(path.join(outDir, 'sample.gif'), Buffer.from(GIF_B64, 'base64'));

  // SVG fixture lives in the repo as text; keep it in sync here for clarity
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140">
  <rect width="240" height="140" fill="#eef4ff"/>
  <circle cx="60" cy="70" r="34" fill="#2563eb"/>
  <rect x="110" y="36" width="100" height="68" rx="10" fill="#16a34a"/>
  <text x="120" y="126" font-size="14" fill="#111827">SVG Sample</text>
</svg>
`;
  fs.writeFileSync(path.join(outDir, 'sample.svg'), svg);

  // ZIP archive with two convertible entries and one unsupported entry
  const archive = zipSync({
    'docs/hello.md': strToU8('# Hello\n\nArchive content for batch conversion.\n'),
    'docs/data.csv': strToU8('name,value\nalpha,1\nbeta,2\n'),
    'docs/notes.bin': strToU8('not convertible'),
  });
  fs.writeFileSync(path.join(outDir, 'sample-archive.zip'), Buffer.from(archive));

  console.log('fixtures written to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
