#!/usr/bin/env node
/**
 * Guards the Chrome Web Store's Manifest V3 "no remotely hosted code" rule.
 *
 * Why this exists next to `check-offline.mjs`: that script asks whether *our* source reaches the
 * network, and whether the manifest still requests only `storage`. Neither question covers what the
 * store actually scans for — a bundled third-party library that ships a code path where a remote URL
 * becomes executable JavaScript. Both problems were found by the 2026-09-21 rejection and neither was
 * visible from the source tree:
 *
 *   - jsPDF 4.2.1 keeps an `output('pdfobjectnewwindow')` branch that creates a `<script>` tag whose
 *     `src` is `https://cdnjs.cloudflare.com/ajax/libs/pdfobject/…/pdfobject.min.js`.
 *   - pdf.js keeps `_createCDNWrapper()`, which builds the string `await import("<url>")` into a Blob
 *     and starts a Worker from it.
 *
 * Neither branch is reachable from this extension (only `output('blob')` is called, and `workerSrc` is
 * a packaged same-origin file), so they are stripped at build time by the plugin in `wxt.config.ts`.
 * This script is the half that proves the strip worked, which is why the default pass reads the
 * artifact rather than the source.
 *
 * Only patterns that make code *remote* are asserted. `Function('return this')()` in lodash and the
 * empty `<script>` trick in jszip's `setImmediate` polyfill are indirectly-eval shapes, not hosted
 * code, and MV3's CSP already neutralises them — flagging them here would be permanent noise.
 *
 * Invoked as `pnpm verify:remote-code:source` from the CI lint job (before any build) and as
 * `pnpm verify:remote-code` from the build and release jobs, where it reads `.output/chrome-mv3`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Built extension the browser loads; the store scans exactly this. */
const BUNDLE_DIR = path.join(ROOT, '.output', 'chrome-mv3');

/** Directories that ship into the bundle as first-party code. */
const SOURCE_DIRS = ['entrypoints', 'components', 'composables', 'utils'];

/**
 * File types that can carry executable code. CSS and JSON are excluded on purpose: a documentation
 * link in a stylesheet comment is not hosted code, and the manifest is checked structurally below.
 */
const CODE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.vue', '.ts', '.mts', '.html'];

/**
 * Forbidden shapes, each with the reason it would break the store policy.
 * Matched against the raw file text, so a pattern must survive minification — they are written
 * against what the bundler actually emits (backtick literals, no spaces).
 */
const FORBIDDEN = [
  {
    id: 'remote-code-url',
    // `wasm` belongs here as much as `js` does: streamed into `WebAssembly`, a remote binary is
    // hosted code with the same status, and it is the one shape a text scan can still name.
    pattern: /https?:\/\/[^\s"'`)]+\.(?:m?js|wasm)(?:[?#][^\s"'`)])?/,
    why: 'a URL literal naming a JavaScript or WebAssembly file, i.e. code hosted somewhere other than this package',
  },
  {
    id: 'remote-dynamic-import',
    // The rule above needs an extension in the URL, and an ESM CDN specifier has none:
    // `import("https://esm.sh/pkg")` is hosted code by the store's definition just the same. This is
    // also the shape a bundler emits when it decides to fetch a dependency at runtime, which is
    // exactly what `stripRemotelyHostedCode()` in `wxt.config.ts` deletes in pdf.js.
    pattern: /\bimport\s*\(\s*["'`]https?:/,
    why: 'a module fetched from the network by dynamic import, extension or no extension',
  },
  {
    id: 'remote-worker',
    pattern: /new\s+(?:Shared)?Worker\s*\(\s*["'`]https?:/,
    why: 'a worker script loaded over the network',
  },
  {
    id: 'external-script-src',
    // Anchored on the tag, not on `src`: `html-sanitize.ts` quotes `<img src="https://…">` in its
    // JSDoc to explain what it strips, and a loose `src=` rule reads that prose as a finding.
    pattern: /<script\b[^>]*\bsrc\s*=\s*["'`]?https?:/i,
    why: 'a script tag loaded over the network',
  },
  {
    id: 'import-scripts-call',
    pattern: /\bimportScripts\s*\(/,
    why: 'worker-side remote code loading',
  },
  {
    id: 'cdn-worker-wrapper',
    pattern: /createCDNWrapper/,
    why: "pdf.js's helper that turns a remote `workerSrc` into a generated import script",
  },
  {
    id: 'string-built-import',
    // Not anchored on `await`, which the first version of this rule required because that is what
    // pdf.js's wrapper happens to write: what makes a specifier dangerous is that it is assembled as
    // text, not whether the call is awaited, returned or chained, and a bundler is free to rewrite
    // the prefix. Every static specifier in this project opens with a quote and carries no `${`,
    // so dropping the anchor stays quiet on a good build.
    pattern: /\bimport\s*\(\s*["'`]?\s*\$\{/,
    why: 'an import() whose specifier is assembled as text, which is how remote code reaches the parser',
  },
  {
    id: 'jspdf-pdfobject-branch',
    pattern: /pdfobjectnewwindow/,
    why: "jsPDF's output mode that injects a cdnjs script tag; must be stripped by the build plugin",
  },
  {
    id: 'eval-call',
    pattern: /\beval\s*\(/,
    why: 'a parser entry point for code assembled at runtime',
  },
];

/**
 * Recursively collect files that can carry executable code.
 *
 * @param {string} dir Directory to walk.
 * @returns {string[]} Absolute file paths.
 */
function collectCodeFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`scan directory "${path.relative(ROOT, dir)}" is missing — a skipped layer prints OK`);
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectCodeFiles(target);
    return CODE_EXTENSIONS.some(ext => entry.name.endsWith(ext)) ? [target] : [];
  });
}

/**
 * Report every forbidden shape found in a file set.
 *
 * Matched against the whole file rather than line by line, because a shape can be split across
 * lines — `import(` at the end of one and the interpolated specifier at the start of the next is the
 * same remote code, and source files (unlike the minified bundle) are full of such breaks. The line
 * number is recovered from the match offset so the report still points somewhere a person can open.
 *
 * @param {string[]} files Absolute paths to scan.
 * @param {string} label Human name for the set, used in the output line.
 * @returns {string[]} Failure descriptions, one per (file, rule) with at least one match.
 */
function scan(files, label) {
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const rule of FORBIDDEN) {
      const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`;
      const re = new RegExp(rule.pattern.source, flags);
      const lines = [];
      let match;
      while ((match = re.exec(text)) !== null) {
        lines.push(String(text.slice(0, match.index).split('\n').length));
        // A zero-length match would spin forever; none of the rules can produce one, this is the seatbelt.
        if (match.index === re.lastIndex) re.lastIndex++;
        if (lines.length >= 3) break;
      }
      if (lines.length > 0) {
        const more = lines.length === 3 ? ' (and possibly further matches)' : '';
        hits.push(`${path.relative(ROOT, file)}:${lines.join(',')} [${rule.id}] ${rule.why}${more}`);
      }
    }
  }
  if (hits.length === 0) console.log(`OK  ${label}: ${String(files.length)} files, no remotely hosted code shape`);
  return hits;
}

const failures = [];
const sourceOnly = process.argv.includes('--source-only');

const sourceFiles = SOURCE_DIRS.flatMap(dir => collectCodeFiles(path.join(ROOT, dir)));
failures.push(...scan(sourceFiles, 'first-party source'));

// The manifest is checked separately because its policy surface is structural rather than textual:
// a CSP that whitelists a remote origin for `script-src` is the same violation as a hardcoded cdnjs
// URL, and `host_permissions` would grant the fetch that makes it reachable.
const manifestPath = path.join(BUNDLE_DIR, 'manifest.json');
if (sourceOnly) {
  console.log('(source-only pass: artifact checks skipped by design)');
} else if (!fs.existsSync(manifestPath)) {
  failures.push(
    '.output/chrome-mv3/manifest.json not found — the bundle check is the one that proves the build ' +
      'plugin actually stripped the vendor code paths. Run "pnpm build" first, or pass --source-only.',
  );
} else {
  failures.push(...scan(collectCodeFiles(BUNDLE_DIR), 'built bundle'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const csp = manifest.content_security_policy?.extension_pages ?? '';
  if (/https?:\/\/|wasm-unsafe-eval|script-src\s+'?self'?\s+\S/.test(csp)) {
    failures.push(`manifest content_security_policy allows more than local code: ${csp}`);
  }
  if (manifest.host_permissions !== undefined || manifest.optional_permissions !== undefined) {
    failures.push('manifest declares host_permissions or optional_permissions, which grant remote fetching');
  }
}

if (failures.length > 0) {
  console.error(`\nFAIL  remotely hosted code check found ${String(failures.length)} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    '\nChrome rejects MV3 packages that can evaluate code from the network, even when the code path\n' +
      'is never called. Strip the branch in wxt.config.ts (see the plugin there) rather than wrapping\n' +
      'the call site in a guard — the string itself is what the scan finds.',
  );
  process.exit(1);
}

console.log('\nOK  no remotely hosted code in scope (source' + (sourceOnly ? '' : ' and bundle') + ')');
