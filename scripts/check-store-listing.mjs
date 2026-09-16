#!/usr/bin/env node
/**
 * Length and sync guard for the Chrome Web Store listing copy.
 *
 * `CHROMEWEBSTORE.md` is the asset pack a human pastes into the developer dashboard, and the store
 * enforces its limits by **truncating silently** rather than rejecting the submission — so an edit
 * that runs 3 characters long can reach production as a cut-off sentence. Two of those fields also
 * exist in machine-readable form: the packaged `name` / `description` are message keys
 * (`wxt.config.ts → manifest.name === '__MSG_extensionName__'`), resolved from
 * `public/_locales/{zh_CN,en}/messages.json`, with `zh_CN` declared as `default_locale`. `package.json#description`
 * carries the English sentence for npm-style tooling, and `.github/repo-metadata.json` a deliberately
 * different one for the repository About block.
 *
 * This script closes both gaps and a third: every paste field is measured against its real limit, the
 * sheet is asserted to agree byte for byte with the locale files and with `package.json` where the two
 * are meant to be identical, and the copy-paste worksheet at the top of the sheet is asserted to echo
 * those fields verbatim. Because the Chinese sheet fields are asserted equal to the `zh_CN` locale
 * messages, measuring them is also what keeps the packaged default-locale name and description inside
 * the store's limits.
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
  { key: 'name', marker: '**扩展名称（Extension Name）**', limit: 75, locale: 'English' },
  { key: 'nameZh', marker: '**中文名称（Chinese (China) extension name）**', limit: 75, locale: 'Chinese (China)' },
  { key: 'short', marker: '**简介（Short Description）**', limit: 132, locale: 'English' },
  {
    key: 'shortZh',
    marker: '**中文简介（Chinese (China) short description）**',
    limit: 132,
    locale: 'Chinese (China)',
  },
  { key: 'detailed', marker: '**详细介绍（Detailed Description）**', limit: 16000, locale: 'English' },
  {
    key: 'detailedZh',
    marker: '**中文详细介绍（Chinese (China) detailed description）**',
    limit: 16000,
    locale: 'Chinese (China)',
  },
  { key: 'singlePurpose', marker: '**单一目的（Single Purpose）**', limit: 1000, locale: 'English' },
];

/** GitHub's own limits for the repository About block. */
const ABOUT_LIMIT = 350;
const TOPIC_LIMIT = 20;

/**
 * The locales shipped in the package: `zh_CN` is the manifest `default_locale`, `en` is the additional
 * listing language. `public/` is WXT's `publicDir`, so these files land at the extension root verbatim.
 */
const DEFAULT_LOCALE = 'zh_CN';
const LOCALE_CODES = [DEFAULT_LOCALE, 'en'];

/** Sheet field key → manifest message key that carries the same sentence. */
const MESSAGE_KEYS = { name: 'extensionName', short: 'extensionDescription' };

/**
 * Read a `_locales/<code>/messages.json` file into a flat `key → message` map.
 *
 * @param {string} code Locale directory name.
 * @returns {Record<string, string>} Message names mapped to their text.
 * @throws {Error} When the file is absent or a message is not a non-empty string, so a locale cannot
 *   be deleted or emptied without failing the check loudly.
 */
function readLocaleMessages(code) {
  const file = path.join('public', '_locales', code, 'messages.json');
  if (!fs.existsSync(path.join(ROOT, file))) throw new Error(`${file} is missing — the package cannot localize`);
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  return Object.fromEntries(
    Object.entries(raw).map(([key, entry]) => {
      if (typeof entry?.message !== 'string' || entry.message === '') {
        throw new Error(`${file}: "${key}" has no non-empty "message"`);
      }
      return [key, entry.message];
    }),
  );
}

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

/* The manifest is the packaged name/description, but as message keys: the text a user sees on the
   extension manager page comes from `_locales/<default_locale>`, and the dashboard's per-language
   listing tabs exist only for the locales in the package. So the sheet, the locale files and the
   config have to agree in that same shape — English for the `English (United States)` tab, Chinese
   for the default one. */
const wxtConfig = read('wxt.config.ts');
const pkg = JSON.parse(read('package.json'));
const repoMeta = JSON.parse(read('.github/repo-metadata.json'));
const localeMessages = Object.fromEntries(LOCALE_CODES.map(code => [code, readLocaleMessages(code)]));

const localizedNames = Object.keys(localeMessages[DEFAULT_LOCALE]).sort().join(',');
const sameKeys = LOCALE_CODES.every(code => Object.keys(localeMessages[code]).sort().join(',') === localizedNames);

const sync = [
  [
    `manifest.default_locale === '${DEFAULT_LOCALE}'`,
    new RegExp(`default_locale:\\s*(['"])${DEFAULT_LOCALE}\\1`).test(wxtConfig),
  ],
  ['manifest.name is __MSG_extensionName__', wxtConfig.includes('"__MSG_extensionName__"')],
  ['manifest.description is __MSG_extensionDescription__', wxtConfig.includes('"__MSG_extensionDescription__"')],
  ['_locales key sets are identical across ' + LOCALE_CODES.join(' / '), sameKeys],
  ...LOCALE_CODES.flatMap(code =>
    Object.entries(MESSAGE_KEYS).map(([field, messageKey]) => {
      const sheetKey = code === DEFAULT_LOCALE ? `${field}Zh` : field;
      return [
        `_locales/${code} ${messageKey} === sheet ${sheetKey}`,
        localeMessages[code][messageKey] === values[sheetKey],
      ];
    }),
  ),
  ['package.json#description === sheet short description', pkg.description === values.short],
  ['repo About is a distinct sentence', repoMeta.description !== values.short],
];
for (const [label, ok] of sync)
  if (!ok) failures.push(`${label} — out of sync between CHROMEWEBSTORE.md, _locales and the manifest`);

console.log(
  `\nPackaged locales — default ${DEFAULT_LOCALE}, ${LOCALE_CODES.length - 1} additional; messages: ${localizedNames}\n`,
);

/* The worksheet at the top of the sheet repeats the three short fields verbatim so the dashboard can be
   filled from one screen. Repeating prose without checking it is how drift starts, so each echo is
   asserted against the canonical block further down. */
const worksheetStart = sheetText.indexOf('## 提交速查');
const worksheetEnd = sheetText.indexOf('\n## 商店文案');
if (worksheetStart === -1 || worksheetEnd === -1 || worksheetEnd < worksheetStart) {
  failures.push('worksheet: `## 提交速查` section boundary not found');
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
  `✓ verify:listing passed — ${FIELDS.length} paste fields inside their limits, worksheet echoes verbatim, sheet in sync with _locales, wxt.config.ts, package.json and .github/repo-metadata.json.`,
);
