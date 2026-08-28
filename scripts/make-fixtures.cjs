/* Generates binary fixtures (DOCX/XLSX/PDF) for conversion verification. */
const fs = require('node:fs');
const path = require('node:path');
const { asBlob } = require('html-docx-js-typescript');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');

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

  console.log('fixtures written to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
