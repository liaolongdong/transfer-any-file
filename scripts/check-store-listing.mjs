#!/usr/bin/env node
/**
 * Length and sync guard for the Chrome Web Store listing copy.
 *
 * `CHROMEWEBSTORE.md` is the asset pack a human pastes into the developer dashboard, and the store
 * enforces its limits by **truncating silently** rather than rejecting the submission — so an edit
 * that runs 3 characters long can reach production as a cut-off sentence. Two of those fields also
 * exist in machine-readable form (`wxt.config.ts → manifest.name` / `manifest.description` and
 * `package.json#description`), which `check-package-meta.mjs` compares against each other but never
 * against the sheet. That leaves the copy actually pasted into the dashboard unchecked.
 *
 * This script closes both gaps and a third: every paste field is measured against its real limit, the
 * sheet is asserted to agree byte for byte with the manifest where the two are meant to be identical,
 * and the copy-paste worksheet at the top of the sheet is asserted to echo those fields verbatim.
 *
 * Character counts use Unicode code points, which is what the store counts — `package.json` length
 * in UTF-8 bytes is reported alongside because the Chinese fields are ~2x wider in bytes than in
 * characters, and a byte-budgeted field would fail there first.
 *
 * Invoked as `pnpm verify:listing` and by the CI lint job.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = 'CHROMEWEBSTORE.md';

/**
 * The dashboard paste fields, in fill order.
 * `marker` locates the heading in the sheet; the fenced block after it is the value.
 */
const FIELDS = [
  { key: 'name', marker: '**Extension Name**', limit: 75, locale: 'English' },
  { key: 'nameZh', marker: '**Chinese (China) extension name**', limit: 75, locale: 'Chinese (China)' },
  { key: 'short', marker: '**Short Description**', limit: 132, locale: 'English' },
  { key: 'shortZh', marker: '**Chinese (China) short description**', limit: 132, locale: 'Chinese (China)' },
  { key: 'detailed', marker: '**Detailed Description**', limit: 16000, locale: 'English' },
  { key: 'detailedZh', marker: '**Chinese (China) detailed description**', limit: 16000, locale: 'Chinese (China)' },
  { key: 'singlePurpose', marker: '**Single Purpose**', limit: 1000, locale: 'English' },
];

/** GitHub's own limits for the repository About block. */
const ABOUT_LIMIT = 350;
const TOPIC_LIMIT = 20;

/**
 * Extract the first fenced code block following a heading in the sheet.
 *
 * @param {string[]} lines Raw sheet lines.
 * @param {string} marker Heading text to locate, matched case-sensitively.
 * @returns {string} Block contents without a trailing newline.
 * @throws {Error} When the heading or its block is missing, so a renamed section cannot pass silently.
 */
function blockAfter(lines, marker) {
  const start = lines.findIndex(line => line.includes(marker));
  if (start === -1) throw new Error(`${SHEET}: heading not found — ${marker}`);

  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith('```')) i++;
  if (i === lines.length) throw new Error(`${SHEET}: no fenced block after ${marker}`);

  const body = [];
  for (i += 1; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i]);
  if (body.length === 0) throw new Error(`${SHEET}: empty block after ${marker}`);
  return body.join('\n');
}

/** @param {string} text @returns {number} Unicode code points, which is what the store counts. */
const chars = text => [...text].length;

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sheetText = read(SHEET);
const sheetLines = sheetText.split('\n');
const values = Object.fromEntries(FIELDS.map(f => [f.key, blockAfter(sheetLines, f.marker)]));

const failures = [];
const check = (label, actual, limit) => {
  if (actual > limit) failures.push(`${label}: ${actual} characters exceeds the ${limit} limit`);
};

console.log(`\nChrome Web Store listing — ${SHEET}\n`);
for (const field of FIELDS) {
  const value = values[field.key];
  const used = chars(value);
  const pct = Math.round((used / field.limit) * 100);
  console.log(
    `  ${field.key.padEnd(14)} ${field.locale.padEnd(15)} ${String(used).padStart(6)}/${String(field.limit).padEnd(
      6,
    )} (${String(pct).padStart(3)}%)  ${String(Buffer.byteLength(value)).padStart(6)} bytes`,
  );
  check(field.key, used, field.limit);
}

/* The manifest is the packaged name/description; the store sheet is what a human pastes. They are
   the same sentence on purpose, so drift here means the listing and the installed extension disagree. */
const wxtConfig = read('wxt.config.ts');
const pkg = JSON.parse(read('package.json'));
const repoMeta = JSON.parse(read('.github/repo-metadata.json'));

const sync = [
  ['manifest.name === sheet name', wxtConfig.includes(`"${values.name}"`)],
  ['manifest.description === sheet short description', wxtConfig.includes(values.short)],
  ['package.json#description === sheet short description', pkg.description === values.short],
  ['repo About is a distinct sentence', repoMeta.description !== values.short],
];
for (const [label, ok] of sync) if (!ok) failures.push(`${label} — out of sync between CHROMEWEBSTORE.md and source`);

/* The worksheet at the top of the sheet repeats the three short fields verbatim so the dashboard can be
   filled from one screen. Repeating prose without checking it is how drift starts, so each echo is
   asserted against the canonical block further down. */
const worksheetStart = sheetText.indexOf('## Submission worksheet');
const worksheetEnd = sheetText.indexOf('\n## Store Listing');
if (worksheetStart === -1 || worksheetEnd === -1 || worksheetEnd < worksheetStart) {
  failures.push('worksheet: `## Submission worksheet` section boundary not found');
} else {
  const worksheet = sheetText.slice(worksheetStart, worksheetEnd);
  for (const key of ['name', 'short', 'singlePurpose']) {
    const echoed = worksheet.includes('```\n' + values[key] + '\n```');
    if (!echoed) failures.push(`worksheet: ${key} echo differs from its canonical block in CHROMEWEBSTORE.md`);
  }
}

console.log('');
check('github about (.github/repo-metadata.json)', chars(repoMeta.description), ABOUT_LIMIT);
console.log(
  `  ${'github about'.padEnd(14)} ${'GitHub repo'.padEnd(15)} ${String(chars(repoMeta.description)).padStart(6)}/${String(
    ABOUT_LIMIT,
  ).padEnd(6)}  ${String(repoMeta.topics.length).padStart(6)}/${TOPIC_LIMIT} topics`,
);
check('github topics', repoMeta.topics.length, TOPIC_LIMIT);

if (new Set(repoMeta.topics).size !== repoMeta.topics.length) failures.push('github topics: duplicate entries');

console.log('');
if (failures.length > 0) {
  console.error(`✗ verify:listing failed (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `✓ verify:listing passed — ${FIELDS.length} paste fields inside their limits, worksheet echoes verbatim, sheet in sync with wxt.config.ts, package.json and .github/repo-metadata.json.`,
);
