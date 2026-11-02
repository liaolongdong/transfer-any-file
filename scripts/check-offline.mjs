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

/**
 * First-party directories that can carry executable code.
 *
 * `tools/` ships nothing — see `HTML_SOURCE_DIRS` below for why it is still in scope — and a `.js`
 * file added there would otherwise be scanned for remotely hosted code by `check-remote-code.mjs`
 * but not for network calls by this one. The two guards have to agree about which directories they
 * claim to have opened.
 */
const SOURCE_DIRS = ['entrypoints', 'components', 'composables', 'utils', 'tools'];

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
 *
 * `tools/` is listed alongside it even though nothing there ships in the bundle. `tools/file-diff.html`
 * is a standalone offline page, and "offline" is a claim about the code we hand out, not about which
 * artifact it ends up in — a `fetch()` written there would be as true a breach as one written in
 * `utils/`, and a guard that skipped the directory would report OK over a file it never opened.
 *
 * `docs/` joins it because four of its pages are hand-authored and published as they stand:
 * `index.html`, `privacy.html`, `blog/index.html` and `404.html` each carry an inline script that
 * picks the UI language before first paint. They are not copies of anything in `tools/`, so until this
 * line the only guard that ever opened them was a human. The rest of `docs/` (the `/convert/` pages,
 * `/diff/`, `/compress/`) is generated or byte-copied from something already scanned, which makes the
 * extra pass redundant rather than wrong.
 */
const HTML_SOURCE_DIRS = ['entrypoints', 'tools', 'docs'];

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

/**
 * Blank the contents of single-line quoted strings, keeping every character position.
 *
 * Needed because the published product page assigns its FAQ answers as a JavaScript object literal
 * (`window.__FAT_FAQ__`), and those sentences name `fetch`, `XMLHttpRequest`, `WebSocket` and
 * `sendBeacon` in order to promise they are never called. Data in a string is not a call site, and
 * nothing in the scanned surface can turn it back into one: MV3 forbids `eval`, the site pages ship a
 * CSP without `unsafe-eval`, and `check-remote-code.mjs` fails the build if an `eval(` appears anywhere
 * in scope. Template literals are left untouched (`${}` is real code), and a quote with no partner on
 * the same line is read as an apostrophe rather than a string opening, so prose punctuation cannot
 * swallow the code that follows it.
 *
 * Applied to HTML fragments only — first-party `.ts`/`.vue` source is still read line as written.
 *
 * @param {string} line One line of text.
 * @returns {string} The same line with string bodies replaced by spaces.
 */
function maskQuotedContent(line) {
  let out = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      const close = line.indexOf(ch, i + 1);
      if (close === -1) {
        out += ch;
        continue;
      }
      out += ch + ' '.repeat(close - i - 1) + ch;
      i = close;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * A `<script>` boundary in document order: an opening tag (with its attributes) or a closing tag.
 * `<\/script>` inside a script body — the escape every inline script uses to stay out of trouble —
 * carries a backslash and so is not matched, which is the behaviour we want.
 */
const SCRIPT_BOUNDARY = /<script\b[^>]*>|<\/script\s*>/gi;

/** Handler attributes and `javascript:` URLs are the executable markup outside `<script>`. */
const INLINE_HANDLER = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI = /javascript\s*:/gi;

/**
 * Whether an opening `<script>` tag declares a type the browser will not run as JavaScript.
 *
 * `application/ld+json` is the one that matters here: the product page ships three JSON-LD blocks, and
 * they are data the page hands to a crawler, not code.
 *
 * @param {string} openTag The full `<script …>` tag text.
 * @returns {boolean} True for a non-executable type.
 */
function isNonJsScriptType(openTag) {
  const attr = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>/]+))/i.exec(openTag);
  if (!attr) return false;
  const type = (attr[1] ?? attr[2] ?? attr[3] ?? '').toLowerCase();
  return type !== '' && type !== 'module' && !/(^|\/)javascript$/.test(type);
}

/**
 * Turn a document text into a `line number for any character offset` resolver, computed once per file.
 *
 * @param {string} text File text.
 * @returns {(offset: number) => number} 1-based line number for an offset in `text`.
 */
function lineResolver(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1);
  return offset => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Reduce an HTML document to the text a browser would execute: JavaScript `<script>` bodies, plus
 * `on*` handler attributes and `javascript:` URLs in the markup around them.
 *
 * Why the whole file is not scanned: `docs/privacy.html` devotes a paragraph to telling the reader that
 * the extension never issues `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` calls — naming all
 * four inside `<code>` elements. Prose that names the APIs *is* the guarantee being advertised, not a
 * breach of it, and a guard that cannot tell the two apart has only two bad options left: stay red on a
 * correct file, or leave the published pages out of the scan. Following the executable surface instead
 * of the file is what makes `docs/` scannable at all.
 *
 * @param {string} text Raw document text.
 * @returns {Array<{line: number, text: string}>} Executable fragments, each with its 1-based line.
 */
function executableFragments(text) {
  const lineOf = lineResolver(text);
  const fragments = [];
  const emitScript = (from, to) => {
    const first = lineOf(from);
    text
      .slice(from, to)
      .split('\n')
      .forEach((line, index) => fragments.push({ line: first + index, text: maskQuotedContent(line) }));
  };
  const emitMarkup = (from, to) => {
    const region = text.slice(from, to);
    for (const re of [INLINE_HANDLER, JAVASCRIPT_URI]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(region)) !== null) {
        fragments.push({ line: lineOf(from + match.index), text: match[0] });
      }
    }
  };

  let cursor = 0;
  let inScript = false;
  let inData = false;
  for (const match of text.matchAll(SCRIPT_BOUNDARY)) {
    const tag = match[0];
    if (tag.toLowerCase().startsWith('</')) {
      if (inScript) emitScript(cursor, match.index);
      inScript = false;
      inData = false;
      cursor = match.index + tag.length;
      continue;
    }
    if (!inScript && !inData) emitMarkup(cursor, match.index);
    inScript = !isNonJsScriptType(tag);
    inData = !inScript;
    cursor = match.index + tag.length;
  }
  if (inScript) emitScript(cursor, text.length);
  else if (!inData) emitMarkup(cursor, text.length);
  return fragments;
}

const htmlFiles = HTML_SOURCE_DIRS.flatMap(dir => collectFiles(dir, ['.html']));
const scannedFiles = [...SOURCE_DIRS.flatMap(dir => collectFiles(dir, SOURCE_EXTENSIONS)), ...htmlFiles];

const failures = [];
let htmlFragmentsRead = 0;

for (const file of scannedFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = file.endsWith('.html')
    ? executableFragments(text)
    : text
        .split(/\r?\n/)
        .map((line, index) => ({ line: index + 1, text: line }))
        .filter(fragment => fragment.text.length > 0);
  if (file.endsWith('.html')) htmlFragmentsRead += lines.length;
  for (const fragment of lines) {
    const hit = FORBIDDEN.find(({ pattern }) => pattern.test(fragment.text));
    if (hit) {
      failures.push(`${path.relative(ROOT, file)}:${String(fragment.line)} — ${hit.pattern} (${hit.why})`);
    }
  }
}

/**
 * Proof that the HTML reduction above is still finding code to read.
 *
 * A fragment extractor that silently returned nothing would make every `.html` file pass — the exact
 * failure shape this repository has been bitten by, where a guard that never opened a file prints OK.
 * Both sentinels carry an inline script that is load-bearing (the theme pre-paint, and the whole
 * `/diff/` page), so if either ever stops matching, the extractor or the page changed and a person has
 * to decide which.
 */
const EXECUTABLE_SENTINELS = [
  path.join(ROOT, 'entrypoints', 'options', 'index.html'),
  path.join(ROOT, 'tools', 'file-diff.html'),
];
for (const sentinel of EXECUTABLE_SENTINELS) {
  if (!fs.existsSync(sentinel)) {
    failures.push(
      `sentinel ${path.relative(ROOT, sentinel)} is missing — the HTML scan can no longer prove it has teeth`,
    );
    continue;
  }
  if (executableFragments(fs.readFileSync(sentinel, 'utf8')).length === 0) {
    failures.push(
      `${path.relative(ROOT, sentinel)} yields no executable fragments — the inline-script extractor is ` +
        'blind, so every .html file in scope is being passed unread',
    );
  }
}

/**
 * Teeth check for the HTML reduction.
 *
 * A regex extractor that quietly matched nothing would make every `.html` file pass unread — the same
 * failure shape as a scan directory that does not exist, which `collectFiles` already refuses to
 * tolerate. `entrypoints/options/index.html` carries the theme pre-paint script and
 * `tools/file-diff.html` is a whole page of inline script, so both must always yield fragments; if one
 * stops yielding, either the extractor or the page changed, and a person has to say which.
 */
for (const sentinel of ['entrypoints/options/index.html', 'tools/file-diff.html']) {
  const fragments = executableFragments(fs.readFileSync(path.join(ROOT, sentinel), 'utf8'));
  if (fragments.length === 0) {
    failures.push(`${sentinel} yields no executable fragments — the inline-script extractor is blind`);
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
  // Not a permission, so the two checks above would stay green with it present — and it is the one
  // manifest surface that widens *who* can reach the package rather than what the package can reach.
  // A declared resource is fetchable by the listed origins, and WXT modules or a manifest transform
  // can add the key without a line of it ever appearing in `wxt.config.ts`.
  if (manifest.web_accessible_resources !== undefined) {
    failures.push('.output/chrome-mv3/manifest.json declares web_accessible_resources');
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
    `${SOURCE_DIRS.join(', ')} (+ ${htmlFiles.length} HTML files under ${HTML_SOURCE_DIRS.join(', ')}, ` +
    `read as ${String(htmlFragmentsRead)} executable fragments: inline scripts, handlers, javascript: URLs); ` +
    'manifest permissions: storage only, no host_permissions.',
);
