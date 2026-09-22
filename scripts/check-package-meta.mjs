#!/usr/bin/env node
/**
 * Static guard for the repository's outward-facing metadata.
 *
 * The store short description lives in two machine-readable places that must agree byte for byte —
 * `package.json#description` and `public/_locales/en/messages.json → extensionDescription.message` —
 * and the Chrome Web Store caps it at 132 characters while truncating an over-long submission rather
 * than rejecting it. The manifest itself carries neither: `wxt.config.ts` points `name` and
 * `description` at `__MSG_extensionName__` / `__MSG_extensionDescription__` with
 * `default_locale: "zh_CN"`, so a placeholder that no locale file defines ships as a literal
 * `__MSG_…` on the extension manager page. Asserting the placeholders and the default locale here is
 * what keeps that shape intact; `check-store-listing.mjs` reads both locale files and covers the
 * dashboard copy.
 *
 * Two more copies exist and are deliberately out of reach of this check: the text pasted into the
 * dashboard (`CHROMEWEBSTORE.md`, kept in sync by `verify:listing`) and the repository's About
 * description (`.github/repo-metadata.json`), which is a **different sentence** about the same product
 * — so only its `homepage` is compared here.
 *
 * The guard also covers the link fields (`repository`, `bugs`, `homepage`, `engines`) that npm-style
 * tooling, GitHub and the store listing read from `package.json`.
 *
 * Invoked as `pnpm verify:meta` and by the CI lint job, so an edit cannot land in only one place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Hard limit enforced by the Chrome Web Store for the short description. */
const STORE_DESCRIPTION_LIMIT = 132;

/** Locale that backs the packaged name/description, and the manifest message keys they resolve from. */
const DEFAULT_LOCALE = 'zh_CN';
const MESSAGE_KEYS = { name: '__MSG_extensionName__', description: '__MSG_extensionDescription__' };

/**
 * Read a manifest string field out of `wxt.config.ts`.
 *
 * The config is TypeScript and CI runs Node 20, which cannot import it directly;
 * the values needed are single string literals, so a targeted read beats shelling out
 * to a transpiler. The pattern is deliberately strict: an unrecognisable shape throws
 * instead of quietly returning nothing.
 *
 * Strictness is about the *shape* (exactly one string literal), not the quote character:
 * `.prettierrc.json` sets `singleQuote: true`, so `pnpm fix:all` legitimately rewrites this file to
 * single quotes, and a double-quote-only pattern would throw on a correctly formatted tree.
 *
 * @param {string} source Raw contents of `wxt.config.ts`.
 * @param {string} field Manifest key to read.
 * @returns {string} The declared value.
 * @throws {Error} When no string literal is present for that field.
 */
function readManifestField(source, field) {
  const block = readManifestBlock(source);
  const match = new RegExp(`${field}:\\s*(?:\\r?\\n\\s*)?(['"])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`).exec(block);
  if (!match) throw new Error(`no \`${field}\` string literal found in wxt.config.ts`);
  return match[2].replace(/\\(["'\\])/g, '$1');
}

/**
 * Cut the `manifest: { ... }` object out of `wxt.config.ts`.
 *
 * Field reads must be scoped to this block: the rest of the config has `name:` keys of its own
 * (every Vite plugin declares one), and a whole-file match would silently read whichever happens to
 * come first instead of the extension name — which is precisely how a correct config fails this check.
 * Braces inside comments are counted, so an unbalanced comment brace throws rather than misreading.
 *
 * @param {string} source Raw contents of `wxt.config.ts`.
 * @returns {string} The `manifest` block, from its key to its closing brace.
 * @throws {Error} When the block is absent or unbalanced.
 */
function readManifestBlock(source) {
  const key = source.search(/manifest:\s*{/);
  if (key === -1) throw new Error('no `manifest: { ... }` block found in wxt.config.ts');
  let depth = 0;
  for (let i = source.indexOf('{', key); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(key, i + 1);
  }
  throw new Error('unbalanced `manifest` block in wxt.config.ts');
}

/**
 * Read one localized string out of `public/_locales/<code>/messages.json`.
 *
 * @param {string} code Locale directory name.
 * @param {string} key Message name.
 * @returns {string} The message text.
 * @throws {Error} When the locale file or the message is absent, so a rename cannot pass silently.
 */
function readLocaleMessage(code, key) {
  const file = path.join(ROOT, 'public', '_locales', code, 'messages.json');
  if (!fs.existsSync(file)) throw new Error(`public/_locales/${code}/messages.json is missing`);
  const message = JSON.parse(fs.readFileSync(file, 'utf8'))?.[key]?.message;
  if (typeof message !== 'string' || message === '') {
    throw new Error(`public/_locales/${code}/messages.json defines no non-empty "${key}" message`);
  }
  return message;
}

/**
 * Resolve `package.json` from the repository root.
 *
 * @returns {Record<string, any>} Parsed package manifest.
 */
function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

/**
 * Resolve `.github/repo-metadata.json`, the source of truth applied to the
 * repository's About block by `.github/workflows/repo-meta.yml`.
 *
 * @returns {Record<string, any> | null} Parsed metadata, or null when absent.
 */
function readRepoMetadata() {
  const file = path.join(ROOT, '.github', 'repo-metadata.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const failures = [];

/**
 * Record a constraint that must hold.
 *
 * @param {boolean} ok Whether the constraint holds.
 * @param {string} message Human-readable failure description.
 * @returns {void}
 */
function check(ok, message) {
  if (!ok) failures.push(message);
}

const pkg = readPackageJson();
const wxtSource = fs.readFileSync(path.join(ROOT, 'wxt.config.ts'), 'utf8');
const repoMetadata = readRepoMetadata();
const enDescription = readLocaleMessage('en', 'extensionDescription');

for (const field of ['name', 'version', 'license', 'displayName', 'packageManager', 'homepage']) {
  check(typeof pkg[field] === 'string' && pkg[field].length > 0, `package.json#${field} must be a non-empty string`);
}

for (const [label, value] of [
  ['repository.url', pkg.repository?.url],
  ['bugs.url', pkg.bugs?.url],
  ['author.email', pkg.author?.email],
  ['engines.node', pkg.engines?.node],
]) {
  check(typeof value === 'string' && value.length > 0, `package.json#${label} must be a non-empty string`);
}

/* The manifest is localized, so its two visible fields must stay placeholders and the default locale
   must stay the one the copy is written for: an inline English string here would silently win over
   `_locales/zh_CN` and make the listing and the installed extension disagree on the name. */
for (const [field, placeholder] of Object.entries(MESSAGE_KEYS)) {
  check(
    readManifestField(wxtSource, field) === placeholder,
    `wxt.config.ts manifest.${field} must be ${placeholder} — the copy lives in public/_locales/*/messages.json`,
  );
}
check(
  readManifestField(wxtSource, 'default_locale') === DEFAULT_LOCALE,
  `wxt.config.ts manifest.default_locale must be "${DEFAULT_LOCALE}" — it decides which locale the store treats as the listing default`,
);

check(
  pkg.description === enDescription,
  'package.json#description and _locales/en extensionDescription must match exactly — edit both, then CHROMEWEBSTORE.md',
);
check(
  [...enDescription].length <= STORE_DESCRIPTION_LIMIT,
  `short description is ${String([...enDescription].length)} chars, over the ${String(STORE_DESCRIPTION_LIMIT)}-char store limit`,
);

/**
 * Assert the About metadata is present, then check the fields that can be compared.
 *
 * A missing `.github/repo-metadata.json` used to skip this whole block and still exit 0 —
 * the same failure mode F-4 removed from `verify:offline`: a guard that never runs reads as green.
 * The file is tracked in git and is the single source `repo-meta.yml` applies to GitHub, so its
 * absence is always a mistake (deleted, renamed, or moved out of `.github/`), never a state to tolerate.
 */
if (!repoMetadata) {
  failures.push('.github/repo-metadata.json is missing — it is the source of truth for the repository About block');
} else {
  check(
    repoMetadata.homepage === pkg.homepage,
    'package.json#homepage must equal .github/repo-metadata.json#homepage (one is applied to GitHub, the other to npm tooling)',
  );
  check(
    typeof repoMetadata.description === 'string' && repoMetadata.description.length <= 350,
    '.github/repo-metadata.json#description exceeds GitHub’s 350-character About limit',
  );
}

if (failures.length > 0) {
  console.error('Package metadata check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `Package metadata OK — short description ${String([...pkg.description].length)}/${String(STORE_DESCRIPTION_LIMIT)} code points, identical in package.json and _locales/en, manifest resolves it through __MSG__ with default_locale ${DEFAULT_LOCALE}${
    repoMetadata ? `, homepage shared with .github/repo-metadata.json` : ''
  }.`,
);
