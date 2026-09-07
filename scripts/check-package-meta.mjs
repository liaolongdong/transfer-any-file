#!/usr/bin/env node
/**
 * Static guard for the repository's outward-facing metadata.
 *
 * The store short description lives in two machine-readable places that must agree byte for byte —
 * `package.json#description` and `wxt.config.ts → manifest.description` — and the Chrome Web Store
 * caps it at 132 characters while truncating an over-long submission rather than rejecting it. Two
 * more copies exist and are deliberately out of reach of this check: the text pasted into the
 * dashboard (`CHROMEWEBSTORE.md`, kept in sync by hand) and the repository's About description
 * (`.github/repo-metadata.json`), which is a **different sentence** about the same product — so only
 * its `homepage` is compared here.
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

/**
 * Read the manifest `description` out of `wxt.config.ts`.
 *
 * The config is TypeScript and CI runs Node 20, which cannot import it directly;
 * the value needed is a single string literal, so a targeted read beats shelling out
 * to a transpiler. The pattern is deliberately strict: an unrecognisable shape throws
 * instead of quietly returning nothing.
 *
 * @param {string} source Raw contents of `wxt.config.ts`.
 * @returns {string} The declared manifest description.
 * @throws {Error} When no `description` string literal is present.
 */
function readManifestDescription(source) {
  const match = /description:\s*(?:\r?\n\s*)?"((?:[^"\\]|\\.)*)"/.exec(source);
  if (!match) throw new Error('no `description` string literal found in wxt.config.ts');
  return match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
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
const manifestDescription = readManifestDescription(fs.readFileSync(path.join(ROOT, 'wxt.config.ts'), 'utf8'));
const repoMetadata = readRepoMetadata();

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

check(
  pkg.description === manifestDescription,
  'package.json#description and wxt.config.ts manifest.description must match exactly — edit both, then CHROMEWEBSTORE.md',
);
check(
  typeof pkg.description === 'string' && pkg.description.length <= STORE_DESCRIPTION_LIMIT,
  `short description is ${String(pkg.description?.length)} chars, over the ${String(STORE_DESCRIPTION_LIMIT)}-char store limit`,
);

if (repoMetadata) {
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
  `Package metadata OK — short description ${String(pkg.description.length)}/${String(STORE_DESCRIPTION_LIMIT)} chars, identical in package.json and wxt.config.ts${
    repoMetadata ? `, homepage shared with .github/repo-metadata.json` : ''
  }.`,
);
