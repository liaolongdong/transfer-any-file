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
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'fat-verify-'));

const consoleErrors = [];
const requests = [];

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
  return hash.split('').map(c => 'abcdefghijklmnop'[parseInt(c, 16)]).join('');
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
await page.screenshot({ path: path.join(__dirname, '../.test-screenshots/61-ext-debug.png') });

await page.goto(`chrome-extension://${extId}/options.html`);
await page.waitForSelector('.drop-zone', { timeout: 15000 });
await page.waitForTimeout(1000);

const heavyInitial = [...requests].filter(u => /xlsx|jspdf|pdf-|lib-|marked|turndown|jszip/.test(u));
console.log('Heavy chunks loaded at startup:', heavyInitial.length ? heavyInitial : 'NONE');

// MD -> HTML conversion (triggers marked + dompurify lazy chunks)
const fi = await page.$('input[type="file"]');
await fi.setInputFiles(path.join(FIXTURE, 'sample.md'));
await page.waitForSelector('.action-row .el-select', { timeout: 10000 });
await page.click('.action-row .el-select');
await page.waitForTimeout(500);
await page.locator('.el-select-dropdown__item').filter({ hasText: 'HTML (.html)' }).first().click();
await page.click('.convert-btn');
await page.waitForFunction(() => {
  const alert = document.querySelector('.el-alert__title');
  return alert && alert.textContent.length > 0;
}, { timeout: 30000 });
await page.waitForTimeout(1500);
console.log('MD->HTML conversion completed');

const lazyLoaded = requests.filter(u => /marked|purify/.test(u));
console.log('Lazy chunks fetched during conversion:', lazyLoaded.map(u => u.split('/').pop()));

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
await page.waitForFunction(() => {
  const alert = document.querySelector('.el-alert__title');
  return alert && alert.textContent.length > 0;
}, { timeout: 30000 });
await page.waitForTimeout(1500);
console.log('PDF->HTML conversion completed');

const pdfLoaded = requests.filter(u => /pdf-BOIs|pdf\.worker/.test(u));
console.log('pdfjs chunks/worker fetched:', pdfLoaded.map(u => u.split('/').pop()));

await page.screenshot({ path: path.join(__dirname, '../.test-screenshots/60-real-extension.png'), fullPage: true });

console.log('Console errors:', consoleErrors.length ? consoleErrors : 'NONE');
await context.close();
process.exit(consoleErrors.length > 0 ? 1 : 0);
