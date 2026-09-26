// Loads the built extension as a real unpacked Chrome extension and verifies:
// no heavy chunks at startup, lazy chunks fetched on demand, conversions work,
// no console errors on extension pages.
//
// Requires a browser that accepts --load-extension: branded Google Chrome
// ignores the flag, so this needs Playwright's bundled Chromium (macOS 14+),
// or any open-source Chromium build. The HTTP-based e2e-test.mjs covers the
// same bundle on machines where no such browser is available.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../.output/chrome-mv3');
const FIXTURE = path.resolve(__dirname, '../fixtures');
const SHOTS = path.resolve(__dirname, '../.test-screenshots');
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'fat-verify-'));

// Playwright creates the parent directory of a screenshot path, but every other script in this repo
// that writes shots makes the directory itself first — and this one has to survive a clean checkout
// where `.test-screenshots/` (gitignored) does not exist yet.
fs.mkdirSync(SHOTS, { recursive: true });

const consoleErrors = [];
const requests = [];
/** What the run asserts, printed at the end so a red line names the claim it broke. */
const failures = [];

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  args: [
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
  ],
});

function extensionIdFromPath(p) {
  const hash = crypto.createHash('sha256').update(p).digest('hex').slice(0, 32);
  return hash
    .split('')
    .map(c => 'abcdefghijklmnop'[parseInt(c, 16)])
    .join('');
}

let extId = '';
for (let i = 0; i < 10 && !extId; i++) {
  const sw = context.serviceWorkers()[0];
  if (sw) extId = new URL(sw.url()).host;
  else await new Promise(r => setTimeout(r, 1000));
}
if (!extId) extId = extensionIdFromPath(EXT);
console.log('Extension ID:', extId);

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

if (failures.length) {
  console.error(`\nverify-extension: ${failures.length} assertion(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('\nverify-extension: no console errors, no heavy chunk at startup, nothing left the machine.');
