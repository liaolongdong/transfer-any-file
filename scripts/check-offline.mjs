#!/usr/bin/env node
/**
 * Verifies the offline guarantee the README, the product page and the privacy policy all
 * point at: first-party code must contain no network call, and the manifest must keep
 * requesting nothing but `storage`.
 *
 * Scope matters. Third-party chunks pulled in by the converters (jsPDF's optional resource
 * loader, pdf.js's font fetcher) do contain `XMLHttpRequest` / `fetch` on code paths this
 * extension never enters, so a grep over `.output/` would fail for reasons that are not a
 * regression. The claim that is both useful and checkable is about *our* source, and the
 * absence of `host_permissions` is what makes the leftover library paths unreachable: the
 * browser refuses cross-origin requests from an extension page that holds no grant.
 *
 * The manifest is checked twice: where it is defined (`wxt.config.ts`) on every run, and in the
 * artifact the browser actually loads (`.output/chrome-mv3/manifest.json`) unless `--source-only`
 * is passed; a missing artifact fails the default run instead of skipping quietly.
 *
 * Invoked as `pnpm verify:offline:source` from the CI lint job (runs before any build) and as
 * `pnpm verify:offline` from the build and release jobs (against `.output/chrome-mv3`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Directories that ship into the bundle as first-party code. */
const SOURCE_DIRS = ['entrypoints', 'components', 'composables', 'utils'];

/** File extensions that can carry executable first-party code.
 *
 * `.js` / `.mjs` are listed because a plain-JS module under `utils/` would otherwise be the one
 * place a `fetch()` could hide from a guard whose entire claim is about source text.
 */
const SOURCE_EXTENSIONS = ['.ts', '.mts', '.js', '.mjs', '.vue'];

/**
 * Directories whose `.html` files are executable too: an entrypoint's HTML carries inline scripts
 * that run before the bundle does (`entrypoints/options/index.html` applies the theme pre-paint), so
 * the extension-less walk below would leave that surface unguarded.
 */
const HTML_SOURCE_DIRS = ['entrypoints'];

/**
 * Network entry points, with the reason each one would break the guarantee.
 * Each pattern is matched case-sensitively against the raw source text.
 */
const FORBIDDEN = [
  { pattern: /\bfetch\s*\(/, why: 'issues an HTTP request' },
  { pattern: /\bXMLHttpRequest\b/, why: 'issues an HTTP request' },
  { pattern: /\bWebSocket\b/, why: 'opens a socket' },
  { pattern: /\bEventSource\b/, why: 'opens a server-sent-events stream' },
  { pattern: /\bsendBeacon\b/, why: 'sends data in the background' },
  { pattern: /\bRTCPeerConnection\b/, why: 'opens a peer connection' },
];

/**
 * Collect files under a directory, recursively.
 *
 * A directory the scan list names must exist: this claim is about *all* first-party code, and
 * silently scanning one layer less used to print OK either way. `verify:offline` already refuses to
 * run without its artifact for the same reason — a guard that quietly skipped is the bug it was
 * written to catch.
 *
 * @param {string} dir Directory relative to the repository root.
 * @param {string[]} extensions Suffixes to keep.
 * @returns {string[]} Absolute file paths with one of those extensions.
 */
function collectFiles(dir, extensions) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) {
    throw new Error(`source directory "${dir}" is missing — the scan list names it, so it cannot be skipped`);
  }
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(absolute, entry.name);
    if (entry.isDirectory()) return collectFiles(path.relative(ROOT, target), extensions);
    return extensions.some(ext => entry.name.endsWith(ext)) ? [target] : [];
  });
}

const scannedFiles = [
  ...SOURCE_DIRS.flatMap(dir => collectFiles(dir, SOURCE_EXTENSIONS)),
  ...HTML_SOURCE_DIRS.flatMap(dir => collectFiles(dir, ['.html'])),
];

const failures = [];

for (const file of scannedFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const hit = FORBIDDEN.find(({ pattern }) => pattern.test(line));
    if (hit) {
      failures.push(`${path.relative(ROOT, file)}:${String(index + 1)} — ${hit.pattern} (${hit.why})`);
    }
  });
}

// The manifest is the second half of the claim: `storage` alone, and no host_permissions. Both
// patterns are anchored to key position (`^` + indent) so a sentence in a comment cannot trip
// them, and `optional_permissions:` cannot be mistaken for `permissions:`.
const wxtConfig = fs.readFileSync(path.join(ROOT, 'wxt.config.ts'), 'utf8');
if (/^[ \t]*"?host_permissions"?\s*:/m.test(wxtConfig)) {
  failures.push('wxt.config.ts declares host_permissions — the offline guarantee depends on its absence');
}
const declaredPermissions = /^[ \t]*permissions:\s*\[([^\]]*)\]/m.exec(wxtConfig);
if (!declaredPermissions || declaredPermissions[1].replace(/[\s"']/g, '') !== 'storage') {
  failures.push(
    `wxt.config.ts manifest.permissions must be exactly ["storage"], found: ${String(declaredPermissions?.[1]).trim()}`,
  );
}

// When the bundle is present, assert on the artifact the browser actually loads: a WXT module or a
// manifest transform can add permissions that the source config never mentions. This is the only
// guard for that, and until now it was gated on the artifact merely existing — so on a fresh CI
// checkout (.output is gitignored, and the lint job runs before any build) it silently skipped and
// the suite still printed OK. A guard that never ran is the bug it was written to catch, hence:
// missing artifact is a failure unless the caller asked for the source-only pass.
const sourceOnly = process.argv.includes('--source-only');
const builtManifest = path.join(ROOT, '.output', 'chrome-mv3', 'manifest.json');

if (sourceOnly) {
  console.log('(source-only pass: artifact manifest check skipped by design)');
} else if (!fs.existsSync(builtManifest)) {
  failures.push(
    '.output/chrome-mv3/manifest.json not found — the manifest permission check runs against the ' +
      'artifact the browser loads. Run "pnpm build" first, or pass --source-only for the ' +
      'source-only pass used by the CI lint job.',
  );
} else {
  const manifest = JSON.parse(fs.readFileSync(builtManifest, 'utf8'));
  const granted = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  if (granted.length !== 1 || granted[0] !== 'storage') {
    failures.push(
      `.output/chrome-mv3/manifest.json permissions must be ["storage"], found: ${JSON.stringify(granted)}`,
    );
  }
  if (manifest.host_permissions !== undefined || manifest.optional_permissions !== undefined) {
    failures.push('.output/chrome-mv3/manifest.json carries host_permissions or optional_permissions');
  }
}

if (failures.length > 0) {
  console.error('Offline guarantee check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nIf a change genuinely needs the network, open an issue first (see CONTRIBUTING.md).');
  process.exit(1);
}

console.log(
  `Offline guarantee OK — no network call in ${scannedFiles.length} first-party files across ` +
    `${SOURCE_DIRS.join(', ')} (+ entrypoint HTML); manifest permissions: storage only, no host_permissions.`,
);
