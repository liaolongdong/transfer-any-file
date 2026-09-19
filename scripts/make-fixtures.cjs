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
  const docxBuffer = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
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

  // F-1 fixture: the DOCX boundary is the one untrusted-HTML consumer that had no subresource
  // stripping. The data: image is the control — it must SURVIVE, because mammoth inlines every
  // DOCX image as a data URL and a strip that eats those "passes" the privacy check while
  // breaking the feature. The anchor is the second control: hrefs are content, not subresources.
  //
  // Carries every vector `stripRemoteResources` claims to cover, because a vector absent here is a
  // branch never executed: `<img src>`, `<link href>`, `@import`, `url()` inside a `<style>`
  // element, and `url()` inside an inline `style=` attribute — the last two go through different
  // branches of `stripElement` and both are live on this path.
  const egressHtml = `<!doctype html><html><head>
<style>@import url('http://127.0.0.1:9876/canary/css-import');
body{background:url('http://127.0.0.1:9876/canary/css-bg.png')}</style>
<link rel="stylesheet" href="http://127.0.0.1:9876/canary/link.css"></head><body>
<img src="http://127.0.0.1:9876/canary/img.png">
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==">
<p style="background:url('http://127.0.0.1:9876/canary/inline.png')">x</p>
<a href="http://127.0.0.1:9876/canary/anchor">link</a>
</body></html>
`;
  fs.writeFileSync(path.join(outDir, 'sample-egress.html'), egressHtml);

  // F-6 fixture: every column is one SheetJS used to destroy on the way into an XLSX. `00424` and
  // `12345678901234567890` are the leading-zero and precision cases, `=1+1` the formula re-arm,
  // `2024-01-05` / `1/2` the date-inference pair. `1234.5` is the control that SHOULD still be a
  // number, `"1,234.50"` the quoted field whose commas the reader used to swallow, and `-42` the
  // negative number that must stay numeric — it is the case a guard applied before the numeric test
  // would silently turn into the text `'-42`.
  //
  // The last five columns are the 15-significant-digit boundary: `4111111111111111` (Visa test PAN)
  // and `6222021234567890` (UnionPay-shaped) are the 16-digit identifiers that survive the round trip
  // yet render `4.11111111111111E+15` in Excel, `id16` is an ordinary 16-digit value with the same
  // fate, and `id15` is the control proving the boundary is *not* moved to 16 digits — a 15-digit
  // value still has to be summable. `tiny` is the leading-zero counter-case: 17 digit characters, but
  // only 13 significant ones, so a rule that counted characters instead of digits would textify it.
  fs.writeFileSync(
    path.join(outDir, 'sample-typing.csv'),
    'zip,acct,note,dt,fraction,amount,quoted,delta,cardvisa,cardup,id16,id15,tiny\n00424,12345678901234567890,=1+1,2024-01-05,1/2,1234.5,"1,234.50",-42,4111111111111111,6222021234567890,1234567890123456,123456789012345,0.0001234567890123\n',
  );

  // ZIP archive with two convertible entries and one unsupported entry
  const archive = zipSync({
    'docs/hello.md': strToU8('# Hello\n\nArchive content for batch conversion.\n'),
    'docs/data.csv': strToU8('name,value\nalpha,1\nbeta,2\n'),
    'docs/notes.bin': strToU8('not convertible'),
  });
  fs.writeFileSync(path.join(outDir, 'sample-archive.zip'), Buffer.from(archive));

  console.log('fixtures written to', outDir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
