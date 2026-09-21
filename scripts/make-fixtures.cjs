/* Generates binary fixtures (DOCX/XLSX/PDF) for conversion verification. */
const fs = require('node:fs');
const path = require('node:path');
const { asBlob } = require('html-docx-js-typescript');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const { zipSync, strToU8 } = require('fflate');

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * A two-frame GIF89a (1×1 per frame, red then blue) — the smallest file that genuinely animates.
 *
 * Hand-encoded because nothing in the dependency tree writes an animation, and the suite needs the
 * positive case for the "only the first frame survives" disclosure: `sample.gif` is a single-frame
 * 1×1, so a note that fired merely because the source was a GIF passed on a file with nothing to
 * lose. A frame of one pixel keeps its LZW stream at `clear · literal · end` in the initial 3-bit
 * code size; a wider frame would grow the dictionary mid-stream and the encoder would have to agree
 * with the decoder about exactly when the code width changes, which is the part of this format not
 * worth reimplementing here.
 */
function buildAnimatedGif() {
  const bytes = [];
  const push = (...b) => bytes.push(...b);
  const le16 = value => [value & 0xff, (value >> 8) & 0xff];

  push(...Buffer.from('GIF89a', 'ascii'));
  push(...le16(1), ...le16(1)); // logical screen descriptor: 1×1, every frame covers it
  push(0x80, 0x00, 0x00); // a 2-entry global color table follows, no background index, no aspect ratio
  push(0xff, 0x00, 0x00, 0x00, 0x00, 0xff); // index 0 red, index 1 blue

  // Application extension `NETSCAPE2.0` with a loop count of 0 = forever, which is what an animated
  // sticker carries. Without it the file still animates, just once.
  push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0', 'ascii'), 0x03, 0x01, ...le16(0), 0x00);

  for (const index of [0, 1]) {
    // Graphic control extension: disposal 1 (leave this frame), 10 × 10 ms delay, no transparency.
    push(0x21, 0xf9, 0x04, 0x04, ...le16(10), 0x00, 0x00);
    push(0x2c, ...le16(0), ...le16(0), ...le16(1), ...le16(1), 0x00); // image descriptor, no local table
    push(0x02); // LZW minimum code size

    const codes = [4, index, 5]; // clear, the single pixel, end of information
    const packed = [];
    let buffer = 0;
    let bits = 0;
    for (const code of codes) {
      buffer |= code << bits;
      bits += 3;
      while (bits >= 8) {
        packed.push(buffer & 0xff);
        buffer >>>= 8;
        bits -= 8;
      }
    }
    if (bits > 0) packed.push(buffer & 0xff);
    push(packed.length, ...packed, 0x00); // one sub-block, then the block terminator
  }

  push(0x3b); // trailer
  return Buffer.from(bytes);
}

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

  // 1x1 GIF (well-known minimal valid GIF89a) — single frame on purpose: it is the negative case for
  // the "only the first frame survives" disclosure, which must stay quiet about an animation that
  // never existed. `sample-animated.gif` below is its positive counterpart.
  const GIF_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  fs.writeFileSync(path.join(outDir, 'sample.gif'), Buffer.from(GIF_B64, 'base64'));
  fs.writeFileSync(path.join(outDir, 'sample-animated.gif'), buildAnimatedGif());

  // SVG fixture lives in the repo as text; keep it in sync here for clarity
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140">
  <rect width="240" height="140" fill="#eef4ff"/>
  <circle cx="60" cy="70" r="34" fill="#2563eb"/>
  <rect x="110" y="36" width="100" height="68" rx="10" fill="#16a34a"/>
  <text x="120" y="126" font-size="14" fill="#111827">SVG Sample</text>
</svg>
`;
  fs.writeFileSync(path.join(outDir, 'sample.svg'), svg);

  // F-9 fixtures: an inline `<svg>` diagram inside markdown. DOMPurify's `html` profile contains no
  // svg tag at all, so the graphic used to be deleted at the md→html step and every downstream
  // target (docx, png, and the html file itself) silently lost it. The dimensions are part of the
  // test: the DOCX assertion reads the PNG header back, so a raster of the WRONG picture fails.
  fs.writeFileSync(
    path.join(outDir, 'sample-svg-diagram.md'),
    '# Diagram\n\n<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">\n  <title>Red rectangle</title>\n  <rect width="40" height="30" fill="#ff0000"/>\n  <text x="2" y="15">hi</text>\n</svg>\n\nAfter.\n',
  );
  // Same shape carrying an attack payload: widening the profile must keep the graphic and drop the
  // active content, or "the diagram survived" is worth nothing.
  fs.writeFileSync(
    path.join(outDir, 'sample-svg-attack.md'),
    '# Evil\n\n<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">\n  <script>alert(1)</script>\n  <foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></body></foreignObject>\n  <rect width="10" height="10" fill="#00ff00"/>\n</svg>\n',
  );

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

  // F-7 fixture: typed *and* formatted cells, so the display-text-vs-value difference is visible in
  // the output, plus the three shapes a formula cell actually takes on disk.
  //
  // Dates are written as *serials* with an explicit number format, never as JS `Date` objects:
  // measured on xlsx 0.18.5, `XLSX.write` of `new Date(2024, 0, 5)` stores 45296.000497685185 in
  // Asia/Shanghai — 43 seconds of timezone artefact baked into the file — so a Date-valued fixture
  // would hold different bytes depending on the timezone of whoever regenerated it. The serial is
  // also what Excel, LibreOffice and openpyxl actually write.
  //
  //   amount / ratio   1234.5 renders as `1,234.50`, 0.25 as `25.0%` — the value/display split
  //   date             integer serial on the *built-in* `m/d/yy` format: today it exports `1/5/24`
  //   datetime         same built-in format with a time component, which today is silently dropped
  //   flag             boolean, `TRUE` as text and `true` as a value
  //   calc             LibreOffice/Excel shape: `<f>` plus a cached value, on a `#,##0.00` format
  //   link             `<f>` with a cached *string* value that is itself the injection payload
  //   nocache          `<f>` with an empty cached value — the shape that survives the reader at all
  //                    (openpyxl's `<f>` with no `<v>` is dropped by SheetJS before any guard runs)
  {
    const typed = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['amount', 'ratio', 'date', 'datetime', 'flag', 'calc', 'link', 'nocache'],
      [0, 0, 0, 0, false, 0, '', ''],
    ]);
    sheet.A2 = { t: 'n', v: 1234.5, z: '#,##0.00' };
    sheet.B2 = { t: 'n', v: 0.25, z: '0.0%' };
    sheet.C2 = { t: 'n', v: 45296, z: 'm/d/yy' };
    sheet.D2 = { t: 'n', v: 45296.604166666664, z: 'm/d/yy' };
    sheet.E2 = { t: 'b', v: true };
    sheet.F2 = { t: 'n', v: 2469, f: 'A2*2', z: '#,##0.00' };
    sheet.G2 = { t: 's', v: '=HYPERLINK("http://x")', f: 'HYPERLINK("http://x")' };
    sheet.H2 = { t: 's', v: '', f: 'A2*3' };
    sheet['!ref'] = 'A1:H2';
    XLSX.utils.book_append_sheet(typed, sheet, 'Money');
    fs.writeFileSync(
      path.join(outDir, 'sample-typed.xlsx'),
      Buffer.from(XLSX.write(typed, { type: 'buffer', bookType: 'xlsx' })),
    );
  }

  // ZIP archive with two convertible entries and one unsupported entry
  const archive = zipSync({
    'docs/hello.md': strToU8('# Hello\n\nArchive content for batch conversion.\n'),
    'docs/data.csv': strToU8('name,value\nalpha,1\nbeta,2\n'),
    'docs/notes.bin': strToU8('not convertible'),
  });
  fs.writeFileSync(path.join(outDir, 'sample-archive.zip'), Buffer.from(archive));

  console.log('fixtures written to', outDir);
}

module.exports = { buildAnimatedGif };

// Importable on purpose: one fixture can then be written without touching the others, since
// regenerating the whole set re-stamps the PDF and XLSX files whose exact bytes the e2e assertions
// count on (size in the result card, checksums in the download path).
if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
