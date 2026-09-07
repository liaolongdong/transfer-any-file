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
 * The manifest is checked where it is defined (`wxt.config.ts`) and, whenever a build exists,
 * again in the artifact the browser loads (`.output/chrome-mv3/manifest.json`).
 *
 * Invoked as `pnpm verify:offline` and by the CI lint job.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Directories that ship into the bundle as first-party code. */
const SOURCE_DIRS = ['entrypoints', 'components', 'composables', 'utils'];

/** File extensions that can carry executable first-party code. */
const SOURCE_EXTENSIONS = ['.ts', '.mts', '.vue'];

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
 * Collect source files under a directory, recursively.
 *
 * @param {string} dir Directory relative to the repository root.
 * @returns {string[]} Absolute file paths with an executable first-party extension.
 */
function collectSourceFiles(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(absolute, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path.relative(ROOT, target));
    return SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext)) ? [target] : [];
  });
}

const failures = [];

for (const dir of SOURCE_DIRS) {
  for (const file of collectSourceFiles(dir)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const hit = FORBIDDEN.find(({ pattern }) => pattern.test(line));
      if (hit) {
        failures.push(`${path.relative(ROOT, file)}:${String(index + 1)} — ${hit.pattern} (${hit.why})`);
      }
    });
  }
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
// manifest transform can add permissions that the source config never mentions.
const builtManifest = path.join(ROOT, '.output', 'chrome-mv3', 'manifest.json');
if (fs.existsSync(builtManifest)) {
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
} else {
  console.log('(no .output/chrome-mv3 build found — checked the manifest source only)');
}

if (failures.length > 0) {
  console.error('Offline guarantee check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nIf a change genuinely needs the network, open an issue first (see CONTRIBUTING.md).');
  process.exit(1);
}

console.log(
  `Offline guarantee OK — no network call in ${SOURCE_DIRS.join(', ')}; manifest permissions: storage only, no host_permissions.`,
);
