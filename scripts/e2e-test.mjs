import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures');

// CI-friendly: use env vars for configuration
const HEADLESS = process.env.CI === 'true' || process.env.E2E_HEADLESS === 'true';
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR || path.resolve(__dirname, '../.test-screenshots');
const PORT = parseInt(process.env.E2E_PORT || '9876', 10);

// Test result tracking
let passed = 0;
let failed = 0;
const failures = [];

function shot(name) { return path.join(SCREENSHOT_DIR, name); }

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, err) {
  failed++;
  failures.push({ name, error: err });
  console.log(`  ✗ ${name}: ${err}`);
}

function section(name) {
  console.log(`\n▸ ${name}`);
}

// Static file server for the built extension
function startServer() {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
      '.mjs': 'application/javascript', '.woff2': 'font/woff2',
    };
    const server = http.createServer((req, res) => {
      const filePath = path.join(EXTENSION_PATH, req.url === '/' ? '/options.html' : req.url);
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

// Mock chrome.storage for non-extension context
const MOCK_CHROME_STORAGE = `() => {
  const storage = {};
  window.chrome = window.chrome || {};
  window.chrome.runtime = window.chrome.runtime || { id: 'test' };
  window.chrome.storage = {
    local: {
      get: (keys, cb) => {
        const result = {};
        const keyList = typeof keys === 'string' ? [keys] : (Array.isArray(keys) ? keys : Object.keys(keys));
        for (const k of keyList) { if (storage[k] !== undefined) result[k] = storage[k]; }
        if (typeof cb === 'function') cb(result);
        return Promise.resolve(result);
      },
      set: (items, cb) => {
        Object.assign(storage, items);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      },
    },
    onChanged: { addListener: () => {}, removeListener: () => {} },
  };
  window.browser = window.browser || {};
  window.browser.storage = window.chrome.storage;
}`;

async function run() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  File Any Transfer — E2E Tests       ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Mode: ${HEADLESS ? 'headless (CI)' : 'headed'}`);
  console.log(`  Screenshots: ${SCREENSHOT_DIR}`);

  // Prepare directories
  if (fs.existsSync(SCREENSHOT_DIR)) fs.rmSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
    console.error('\n✗ Extension not built. Run "pnpm build" first.');
    process.exit(1);
  }

  console.log('\n▸ Starting static server...');
  const server = await startServer();
  console.log(`  ✓ Server on port ${PORT}`);

  console.log('\n▸ Launching browser...');
  const browser = await chromium.launch({
    headless: HEADLESS,
    channel: 'chrome',
    args: ['--no-first-run', '--no-default-browser-check', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(MOCK_CHROME_STORAGE);
  await page.goto(`http://localhost:${PORT}/options.html`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: shot('01-initial.png'), fullPage: true });
  ok('Options page loaded');

  // ─── Test 1: File Upload ───
  section('File Upload');
  try {
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('file input not found');
    await fileInput.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot('02-uploaded.png'), fullPage: true });
    ok('sample.md uploaded and detected');
  } catch (e) { fail('File upload', e.message); }

  // ─── Test 2: Format Selection ───
  section('Format Selection');
  try {
    const selectEl = await page.$('.action-row .el-select');
    if (!selectEl) throw new Error('format select not found');
    await selectEl.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot('03-dropdown.png'), fullPage: true });

    const htmlOpt = await page.locator('.el-select-dropdown__item').filter({ hasText: 'HTML' }).first();
    if (!(await htmlOpt.isVisible())) throw new Error('HTML option not visible');
    await htmlOpt.click();
    await page.waitForTimeout(500);
    ok('HTML target format selected');
  } catch (e) { fail('Format selection', e.message); }

  // ─── Test 3: Conversion ───
  section('MD → HTML Conversion');
  try {
    const convertBtn = await page.$('.convert-btn');
    if (!convertBtn) throw new Error('convert button not found');
    await convertBtn.click();
    await page.waitForFunction(() => {
      const b = document.querySelector('.convert-btn');
      return b && !b.classList.contains('is-loading');
    }, { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: shot('04-converted.png'), fullPage: true });
    ok('MD → HTML conversion completed');
  } catch (e) { fail('Conversion', e.message); }

  // ─── Test 4: View Modes ───
  section('View Mode Buttons');
  try {
    const modes = await page.$$('.mode-btn');
    if (modes.length < 3) throw new Error(`expected 3 mode buttons, found ${modes.length}`);

    await modes[0].click(); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('05-source-only.png'), fullPage: true });
    ok('Source Only mode');

    await modes[1].click(); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('06-split.png'), fullPage: true });
    ok('Split View mode');

    await modes[2].click(); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('07-result-only.png'), fullPage: true });
    ok('Result Only mode');

    await modes[1].click(); await page.waitForTimeout(400);
  } catch (e) { fail('View modes', e.message); }

  // ─── Test 5: Keyboard Shortcuts ───
  section('Keyboard Shortcuts');
  try {
    await page.keyboard.press('1'); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('08-key1.png'), fullPage: true });
    ok('Key "1" → Source Only');

    await page.keyboard.press('2'); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('09-key2.png'), fullPage: true });
    ok('Key "2" → Split View');

    await page.keyboard.press('3'); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('10-key3.png'), fullPage: true });
    ok('Key "3" → Result Only');
  } catch (e) { fail('Keyboard shortcuts', e.message); }

  // ─── Test 6: Arrow Key Adjustment ───
  section('Arrow Key Adjustment');
  try {
    await page.keyboard.press('2'); await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('11-arrow-left.png'), fullPage: true });
    ok('ArrowLeft × 2 → source panel wider');

    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
    await page.screenshot({ path: shot('12-arrow-right.png'), fullPage: true });
    ok('ArrowRight × 2 → result panel wider');
  } catch (e) { fail('Arrow keys', e.message); }

  // ─── Test 7: Draggable Divider ───
  section('Draggable Divider');
  try {
    await page.keyboard.press('2'); await page.waitForTimeout(300);
    const divider = await page.$('.panel-divider');
    if (!divider) throw new Error('divider not found');
    const box = await divider.boundingBox();
    if (!box) throw new Error('divider has no bounding box');

    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(cx - 8 * i, cy);
      await new Promise(r => setTimeout(r, 15));
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot('13-drag-left.png'), fullPage: true });
    ok('Divider dragged left');

    const box2 = await divider.boundingBox();
    if (box2) {
      const cx2 = box2.x + box2.width / 2, cy2 = box2.y + box2.height / 2;
      await page.mouse.move(cx2, cy2);
      await page.mouse.down();
      for (let i = 1; i <= 25; i++) {
        await page.mouse.move(cx2 + 8 * i, cy2);
        await new Promise(r => setTimeout(r, 15));
      }
      await page.mouse.up();
      await page.waitForTimeout(400);
      await page.screenshot({ path: shot('14-drag-right.png'), fullPage: true });
      ok('Divider dragged right');
    }
  } catch (e) { fail('Draggable divider', e.message); }

  // ─── Test 8: Theme Switcher ───
  section('Theme Switcher');
  try {
    const gear = await page.$('.topbar-inner .el-button');
    if (!gear) throw new Error('settings button not found');
    await gear.click(); await page.waitForTimeout(800);
    await page.screenshot({ path: shot('15-theme-popover.png'), fullPage: true });
    ok('Theme popover opened');

    const items = await page.$$('.theme-item');
    if (items.length < 3) throw new Error(`expected 6 theme items, found ${items.length}`);
    await items[2].click(); await page.waitForTimeout(500);
    await page.screenshot({ path: shot('16-theme-purple.png'), fullPage: true });
    ok('Purple theme applied');
  } catch (e) { fail('Theme switcher', e.message); }

  // ─── Test 9: DOCX → PNG (Bug Fix Verification) ───
  section('DOCX → PNG Conversion (Bug Fix)');
  try {
    const resetBtn = await page.$('.reset-btn');
    if (resetBtn) { await resetBtn.click(); await page.waitForTimeout(500); }

    const fi = await page.$('input[type="file"]');
    if (!fi) throw new Error('file input not found');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.docx'));
    await page.waitForTimeout(2000);

    const sel = await page.$('.action-row .el-select');
    if (!sel) throw new Error('format select not found');
    await sel.click(); await page.waitForTimeout(800);

    const pngOpt = await page.locator('.el-select-dropdown__item').filter({ hasText: 'PNG' }).first();
    if (!(await pngOpt.isVisible())) throw new Error('PNG option not available for DOCX');
    await pngOpt.click(); await page.waitForTimeout(500);

    const cb = await page.$('.convert-btn');
    if (!cb) throw new Error('convert button not found');
    await cb.click();
    await page.waitForFunction(() => {
      const b = document.querySelector('.convert-btn');
      return b && !b.classList.contains('is-loading');
    }, { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot('17-docx-to-png.png'), fullPage: true });

    const img = await page.$('.result-panel .image-content img');
    ok('DOCX → PNG conversion completed');
    if (img) ok('PNG image displayed in comparison view');
    else fail('PNG display', 'No image element found in result panel');
  } catch (e) { fail('DOCX → PNG', e.message); }

  // ─── Summary ───
  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed${' '.repeat(18 - String(passed).length - String(failed).length)}║`);
  console.log('╚══════════════════════════════════════╝');

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}: ${f.error}`));
  }

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}/`);
  fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort().forEach(f => console.log(`  ${f}`));

  await page.waitForTimeout(HEADLESS ? 0 : 2000);
  await browser.close();
  server.close();

  // CI exit code
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n✗ FATAL:', err.message);
  process.exit(1);
});
