// Loads the built extension as a real unpacked Chrome extension and verifies:
// the service worker registers, the manifest strings resolve through _locales,
// no heavy chunks at startup, lazy chunks fetched on demand, conversions work,
// no console errors on extension pages.
//
// Requires a browser that accepts --load-extension: branded Google Chrome
// ignores the flag, so this needs Playwright's bundled Chromium (macOS 14+),
// or any open-source Chromium build. The HTTP-based e2e-test.mjs covers the
// same bundle on machines where no such browser is available.
//
// "No such browser" is exactly two rejections wide on this project's machines: Playwright refuses to
// install Chromium on macOS 13 (`Playwright does not support chromium on mac13`), and branded Chrome
// was re-measured on 2026-10-03 to answer `chrome-extension://<id>/options.html` with
// `ERR_BLOCKED_BY_CLIENT` in *both* headed and headless modes. Set `VERIFY_EXT_CHROME` to any
// Chromium-family binary that honours `--load-extension` — Chrome for Testing does, and that is how
// the first green run of this script was produced. Which browser was used is printed at the top of
// the run, so a log line names the engine its assertions were made against.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * `VERIFY_EXT_PATH` points the gate at another build directory. Unset is the normal case
 * (`.output/chrome-mv3`). It exists so the assertions below can be checked against a deliberately
 * broken copy of the artifact without touching the real build — a gate nobody can prove still has
 * teeth is a gate that quietly stopped guarding.
 */
const EXT = path.resolve(process.env.VERIFY_EXT_PATH || path.join(__dirname, '../.output/chrome-mv3'));
const FIXTURE = path.resolve(__dirname, '../fixtures');
const SHOTS = path.resolve(__dirname, '../.test-screenshots');
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'fat-verify-'));

// The other two layers of the offline/remote-code guards fail outright on a missing artifact instead
// of skipping, and for the same reason: a guard that never opened a package proved nothing. Without
// this the failure mode is a 15 s selector timeout that reads like a broken UI.
if (!fs.existsSync(path.join(EXT, 'manifest.json'))) {
  console.error(
    `verify-extension: no manifest.json in ${EXT} — run \`pnpm build\` first (or point VERIFY_EXT_PATH ` +
      'at a built package). Refusing to report OK about a package it never loaded.',
  );
  process.exit(1);
}

// Playwright creates the parent directory of a screenshot path, but every other script in this repo
// that writes shots makes the directory itself first — and this one has to survive a clean checkout
// where `.test-screenshots/` (gitignored) does not exist yet.
fs.mkdirSync(SHOTS, { recursive: true });

const consoleErrors = [];
const requests = [];
/** What the run asserts, printed at the end so a red line names the claim it broke. */
const failures = [];

/**
 * Print the collected failures and leave. Called from the end of the script, and from one place in
 * the middle: a package whose worker never started cannot produce a useful reading for the rest of
 * the run, but it still deserves the same report instead of a stack trace.
 */
function reportAndExit() {
  console.error(`\nverify-extension: ${failures.length} assertion(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

/** `VERIFY_EXT_CHROME` points at a Chromium-family binary; unset means Playwright's own. */
const browserPath = process.env.VERIFY_EXT_CHROME || '';
console.log(
  'Browser:',
  browserPath || 'Playwright bundled Chromium',
  `(${browserPath ? 'VERIFY_EXT_CHROME' : 'default'}; needs to accept --load-extension)`,
);

/**
 * Launch with this package loaded, and turn "the browser never came up" into a red line that names
 * the suspect instead of Playwright's 180 s default and a stack trace.
 *
 * Measured on 2026-10-03 against two broken copies of the real build: a package with no `_locales/`
 * beside a manifest that references `__MSG_*__`, and a package whose `__MSG_extensionName__` key was
 * renamed out of `_locales/zh_CN/messages.json`. Both hang Chrome's startup — it does not load the
 * extension and it does not say so. A byte-identical copy under a different path launches fine, so
 * this is the package, not the harness. The timeout is 90 s rather than the observed few because a
 * cold profile on a busy machine is exactly the case that must not become a false red.
 */
async function launchWithPackage() {
  const LAUNCH_MS = 90_000;
  try {
    return await chromium.launchPersistentContext(PROFILE, {
      headless: false,
      timeout: LAUNCH_MS,
      executablePath: browserPath || undefined,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--no-sandbox',
        `--disable-extensions-except=${EXT}`,
        `--load-extension=${EXT}`,
      ],
    });
  } catch (err) {
    fs.rmSync(PROFILE, { recursive: true, force: true });
    console.error(
      `\nverify-extension: the browser never started with this package loaded (${LAUNCH_MS / 1000}s).\n` +
        `  Package under test: ${EXT}\n` +
        '  Chrome refuses to finish starting a package whose manifest strings it cannot resolve, so a\n' +
        '  `__MSG_*__` reference with no matching key in `_locales/<default_locale>/messages.json`, or a\n' +
        '  `_locales/` that is not at the extension root, looks like this and not like a failed assertion.\n' +
        `  Original error: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
    );
    process.exit(1);
  }
}

const context = await launchWithPackage();

function extensionIdFromPath(p) {
  const hash = crypto.createHash('sha256').update(p).digest('hex').slice(0, 32);
  return hash
    .split('')
    .map(c => 'abcdefghijklmnop'[parseInt(c, 16)])
    .join('');
}

let extId = '';
let swUrl = '';
for (let i = 0; i < 10 && !extId; i++) {
  const sw = context.serviceWorkers()[0];
  if (sw) {
    extId = new URL(sw.url()).host;
    swUrl = sw.url();
  } else await new Promise(r => setTimeout(r, 1000));
}
// Deriving the ID from the load path is the standard unpacked-extension algorithm, so it usually
// agrees with the observed one — but agreeing with a guess is not the same as seeing the worker.
// Keep both facts, because the second one is the assertion.
const idSource = swUrl ? `observed via ${swUrl}` : 'derived from the load path: no service worker appeared';
if (!extId) extId = extensionIdFromPath(EXT);
console.log('Extension ID:', extId, `(${idSource})`);
if (!swUrl) {
  failures.push(
    'no MV3 service worker registered within 10 s — background.js never ran, so action.onClicked, ' +
      "the extension's only entry point, is unverified",
  );
  await context.close();
  reportAndExit();
}

const page = await context.newPage();
page.on('console', msg => {
  if (msg.type() === 'error' && page.url().startsWith('chrome-extension://')) consoleErrors.push(msg.text());
});
page.on('request', req => requests.push(req.url()));
page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

await page.goto('chrome://extensions');
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(SHOTS, '61-ext-debug.png') });

await page.goto(`chrome-extension://${extId}/options.html`);
await page.waitForSelector('.drop-zone', { timeout: 15000 });
await page.waitForTimeout(1000);

// "`_locales/` must sit at the extension root, or Chrome prints `__MSG_extensionName__` verbatim" is a
// claim about the *loaded package*, and the two repo-level guards that touch it (`verify:meta`,
// `verify:listing`) only ever read files in the working tree. This is the one place that asks Chrome
// what it actually resolved. It doubles as the "did I end up testing some other extension?" check:
// another package would resolve another name here, and the workbench selector below would not exist.
//
// Scope, measured on 2026-10-03 against broken copies of the real build: a `_locales/` that is absent
// or missing the referenced key never reaches this line — Chrome hangs at startup, and `launchWithPackage`
// is what turns that into a red. What does reach it is a string that resolves to the wrong thing: a copy
// whose `_locales/zh_CN/messages.json` kept the `extensionName` key but wrote the literal
// `__MSG_extensionName__` as its message body loaded fine and came back as 2 assertion failures, exit 1.
const strings = await page.evaluate(() => {
  const api = window.chrome;
  return {
    manifestName: api?.runtime?.getManifest?.().name ?? '',
    i18nName: api?.i18n?.getMessage?.('extensionName') ?? '',
    i18nDesc: api?.i18n?.getMessage?.('extensionDescription') ?? '',
  };
});
console.log('Manifest name as Chrome resolved it:', JSON.stringify(strings.manifestName));
console.log('chrome.i18n extensionDescription:', `${strings.i18nDesc.length} chars`);
for (const [claim, value] of [
  ['manifest name', strings.manifestName],
  ['i18n extensionName', strings.i18nName],
  ['i18n extensionDescription', strings.i18nDesc],
]) {
  if (!value)
    failures.push(`${claim} resolved to an empty string — the _locales key is there, its message body is not`);
  else if (value.includes('__MSG_')) failures.push(`${claim} came back unresolved: ${value}`);
}

// Everything the workbench pulled before the user touched a file. The claim this guards is the one
// `AGENTS.md → 性能约定` makes: heavy converters arrive at their call site, not in the first screen.
// It used to be printed and never asserted, so a regression here left the script green.
const heavyInitial = [...requests].filter(u => /xlsx|jspdf|pdf-|lib-|marked|turndown|jszip/.test(u));
console.log('Heavy chunks loaded at startup:', heavyInitial.length ? heavyInitial : 'NONE');
if (heavyInitial.length) {
  failures.push(`${heavyInitial.length} heavy chunk(s) loaded before any file was picked: ${heavyInitial.join(', ')}`);
}

// Nothing may leave the machine. The offline guards read source and manifest; this is the only check
// that watches what the running extension actually asks the network stack for. Snapshot at startup,
// asserted at the end — the conversions below are where a dependency would reach out.
const isLocal = url => /^(chrome-extension:|chrome:|devtools:|data:|blob:|about:|view-source:|file:)/.test(url);
console.log(
  'Requests outside the extension/chrome schemes at startup:',
  requests.filter(u => !isLocal(u)).length ? requests.filter(u => !isLocal(u)) : 'NONE',
);

// MD -> HTML conversion (triggers marked + dompurify lazy chunks)
const fi = await page.$('input[type="file"]');
await fi.setInputFiles(path.join(FIXTURE, 'sample.md'));
await page.waitForSelector('.action-row .el-select', { timeout: 10000 });
await page.click('.action-row .el-select');
await page.waitForTimeout(500);
await page.locator('.el-select-dropdown__item').filter({ hasText: 'HTML (.html)' }).first().click();
await page.click('.convert-btn');
await page.waitForFunction(
  () => {
    const alert = document.querySelector('.el-alert__title');
    return alert && alert.textContent.length > 0;
  },
  undefined,
  { timeout: 30000 },
);
await page.waitForTimeout(1500);
console.log('MD->HTML conversion completed');

const lazyLoaded = requests.filter(u => /marked|purify/.test(u));
console.log(
  'Lazy chunks fetched during conversion:',
  lazyLoaded.map(u => u.split('/').pop()),
);

// PDF -> HTML conversion (triggers pdfjs chunk + worker)
await page.click('.reset-btn');
await page.waitForTimeout(500);
const fi2 = await page.$('input[type="file"]');
await fi2.setInputFiles(path.join(FIXTURE, 'sample.pdf'));
await page.waitForSelector('.action-row .el-select', { timeout: 10000 });
await page.click('.action-row .el-select');
await page.waitForTimeout(500);
await page.locator('.el-select-dropdown__item').filter({ hasText: 'HTML (.html)' }).first().click();
await page.click('.convert-btn');
await page.waitForFunction(
  () => {
    const alert = document.querySelector('.el-alert__title');
    return alert && alert.textContent.length > 0;
  },
  undefined,
  { timeout: 30000 },
);
await page.waitForTimeout(1500);
console.log('PDF->HTML conversion completed');

// Match on the chunk's name prefix, not its content hash: `pdf-BOIs` was a one-build fact, and a hash
// change turns this log into a silent "nothing loaded".
const pdfLoaded = requests.filter(u => /pdf-|pdf\.worker/.test(u));
console.log(
  'pdfjs chunks/worker fetched:',
  pdfLoaded.map(u => u.split('/').pop()),
);
if (!pdfLoaded.length) {
  failures.push('PDF->HTML reported success without fetching a pdfjs chunk — the lazy import did not happen');
}

await page.screenshot({ path: path.join(SHOTS, '60-real-extension.png'), fullPage: true });

const external = requests.filter(u => !isLocal(u));
console.log('Requests outside the extension/chrome schemes (whole run):', external.length ? external : 'NONE');
if (external.length) {
  failures.push(`${external.length} request(s) left the machine: ${external.join(', ')}`);
}

console.log('Console errors:', consoleErrors.length ? consoleErrors : 'NONE');
if (consoleErrors.length) failures.push(`${consoleErrors.length} console error(s) on extension pages`);
await context.close();

if (failures.length) reportAndExit();
console.log(
  '\nverify-extension: worker up, manifest strings resolved, no console errors, no heavy chunk at ' +
    'startup, nothing left the machine.',
);
