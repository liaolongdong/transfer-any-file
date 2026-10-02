/**
 * Regenerate `fixtures/sample-outline.pdf` — the only fixture in the repo that carries an
 * `/Outlines` dictionary, and therefore the only way to exercise the bookmark→heading path of
 * `pdf→html`.
 *
 * Run with `node scripts/make-outline-fixture.mjs`; the produced file is committed, so a rebuild is
 * only needed when the document itself is meant to change. It is deliberately NOT part of
 * `make-fixtures.cjs`: jsPDF cannot write an outline tree, and this file is hand-assembled PDF syntax
 * (12 objects, two pages, four bookmarks — one of them pointing at text the document does not
 * contain, which is the case the matching rule has to refuse).
 *
 * Everything here is ASCII and byte-exact: `startxref` offsets are accumulated as the objects are
 * appended, because a single drifted byte makes the whole file unparseable and pdf.js then reports
 * `errors.pdfParse` — a fixture bug wearing the mask of a converter bug.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/sample-outline.pdf');

/** A content stream with its `/Length` computed from the same string, so the two can never disagree. */
const stream = text => `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;

/** One `BT … ET` block per visible line: pdf.js then hands back one text item per line, and
 *  `pdf-to-html.ts` splits lines on baseline jumps, so each block becomes exactly one `<p>`/`<hN>`. */
const page1 = [
  'BT /F1 14 Tf 72 720 Td (Chapter One) Tj ET',
  'BT /F1 11 Tf 72 700 Td (Chapter Two) Tj ET',
  'BT /F1 11 Tf 72 680 Td (Body of chapter one.) Tj ET',
  'BT /F1 13 Tf 72 660 Td (Section 1.1) Tj ET',
  'BT /F1 11 Tf 72 640 Td (Body of section one one.) Tj ET',
].join('\n');
const page2 = [
  'BT /F1 14 Tf 72 720 Td (Chapter Two) Tj ET',
  'BT /F1 11 Tf 72 700 Td (Body of chapter two.) Tj ET',
].join('\n');

// obj 1 catalog (with /Outlines) · 2 pages · 3-4 page · 5 outline root · 6-9 bookmark items
// (6 = "Chapter One" depth 0, 7 = its child "Section 1.1" depth 1, 8 = "Chapter Two" page 2,
//  9 = "Appendix Absent" — a bookmark whose text is nowhere in the document) · 10-11 streams · 12 font
const objects = [
  '<< /Type /Catalog /Pages 2 0 R /Outlines 5 0 R >>',
  '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 12 0 R >> >> /Contents 10 0 R >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 12 0 R >> >> /Contents 11 0 R >>',
  '<< /Type /Outlines /First 6 0 R /Last 9 0 R /Count 3 >>',
  '<< /Title (Chapter One) /Parent 5 0 R /First 7 0 R /Last 7 0 R /Count 1 /Next 8 0 R /Dest [3 0 R /XYZ null null null] >>',
  '<< /Title (Section 1.1) /Parent 6 0 R /Dest [3 0 R /XYZ null null null] >>',
  '<< /Title (Chapter Two) /Parent 5 0 R /Prev 6 0 R /Next 9 0 R /Dest [4 0 R /XYZ null null null] >>',
  '<< /Title (Appendix Absent) /Parent 5 0 R /Prev 8 0 R /Dest [4 0 R /XYZ null null null] >>',
  stream(page1),
  stream(page2),
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let out = '%PDF-1.4\n';
const offsets = [];
objects.forEach((body, index) => {
  offsets[index + 1] = out.length;
  out += `${index + 1} 0 obj\n${body}\nendobj\n`;
});
const startxref = out.length;
out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let n = 1; n <= objects.length; n++) {
  out += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
}
out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

fs.writeFileSync(OUT, out, 'latin1');
// Written as latin1, so every code unit is exactly one byte and `out.length` *is* the file size. The
// ASCII question is a code-point scan rather than a `/[^\x00-\x7f]/` regex — that pattern is
// `no-control-regex` in this repo, and the scan says the same thing without the exception.
const nonAscii = [...out].some(ch => ch.codePointAt(0) > 0x7f);
console.log(`wrote ${OUT} - ${out.length} bytes, non-ascii: ${nonAscii}`);
