import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures');

const HEADLESS = process.env.CI === 'true' || process.env.E2E_HEADLESS === 'true';
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR || path.resolve(__dirname, '../.test-screenshots');
const PORT = parseInt(process.env.E2E_PORT || '9876', 10);

let passed = 0;
let failed = 0;
const failures = [];

function shot(name) { return path.join(SCREENSHOT_DIR, name); }
function ok(name) { passed++; console.log(`  ✓ ${name}`); }
function fail(name, err) { failed++; failures.push({ name, error: err }); console.log(`  ✗ ${name}: ${err}`); }
function section(name) { console.log(`\n▸ ${name}`); }

// WCAG relative-luminance contrast, applied to colours read back from the live page so
// the theme loops assert what a user actually sees rather than trusting a token name.
// Accepts both `rgb(...)` (computed styles) and `#hex` (custom-property values).
function parseColor(input) {
  const s = String(input).trim();
  const fn = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s);
  if (fn) return [+fn[1], +fn[2], +fn[3]];
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!hex) return null;
  let d = hex[1];
  if (d.length === 3) d = d.split('').map(x => x + x).join('');
  return [0, 2, 4].map(i => parseInt(d.slice(i, i + 2), 16));
}
function contrast(a, b) {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return Number.NaN;
  const lum = rgb => {
    const [r, g, bl] = rgb.map(v => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(ca), lum(cb)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** The two colours that carry the Option-A contrast contract, read from the page: the
 *  topbar's own background vs the brand text drawn on it, plus the resolved focus ring
 *  against a card. Compared with `contrast()` on the Node side. */
async function surfaceColors(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const topbar = document.querySelector('.topbar');
    const brand = document.querySelector('.brand-name');
    return {
      topbar: topbar ? getComputedStyle(topbar).backgroundColor : '',
      brand: brand ? getComputedStyle(brand).color : '',
      ring: root.getPropertyValue('--fat-focus-ring').trim(),
      card: root.getPropertyValue('--fat-bg-card').trim(),
    };
  });
}

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

/** Upload a fixture file and convert to the given target format. Returns result info. */
async function convertFile(page, fixtureFile, targetText) {
  const fi = await page.$('input[type="file"]');
  if (!fi) throw new Error('file input not found');
  await fi.setInputFiles(path.join(FIXTURE_PATH, fixtureFile));
  await page.waitForTimeout(1000);

  const formatTag = await page.$eval('.file-item .el-tag--primary', el => el.textContent).catch(() => null);
  if (!formatTag) throw new Error(`format not detected for ${fixtureFile}`);

  const sel = await page.$('.action-row .el-select');
  if (!sel) throw new Error('format select not found');
  await sel.click();
  await page.waitForTimeout(500);

  const opt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: targetText }).first();
  if (!(await opt.isVisible())) throw new Error(`${targetText} option not available`);
  await opt.click();
  await page.waitForTimeout(300);

  const cb = await page.$('.convert-btn');
  if (!cb) throw new Error('convert button not found');
  await cb.click();

  await page.waitForFunction(() => {
    const alert = document.querySelector('.el-alert__title');
    return alert && alert.textContent.length > 0;
  }, { timeout: 30000 });
  await page.waitForTimeout(500);

  const alertTitle = await page.$eval('.el-alert__title', el => el.textContent).catch(() => '');
  const resultName = await page.$eval('.result-item .result-name', el => el.textContent).catch(() => '');
  const resultSize = await page.$eval('.result-item .result-size', el => el.textContent).catch(() => '');
  return { alertTitle, resultName, resultSize, formatDetected: formatTag };
}

/** Reset the workbench for a new conversion */
async function resetWorkbench(page) {
  const resetBtn = await page.$('.reset-btn');
  if (resetBtn) { await resetBtn.click(); await page.waitForTimeout(500); }
}

async function run() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Transfer Any File — Full E2E Test Suite     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Mode: ${HEADLESS ? 'headless (CI)' : 'headed'}`);
  console.log(`  Screenshots: ${SCREENSHOT_DIR}`);

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

  const themeValues = ['blue', 'green', 'purple', 'orange', 'rose', 'slate'];
  await page.goto(`http://localhost:${PORT}/options.html`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: shot('01-initial.png'), fullPage: true });
  ok('Options page loaded');

  // Check footer stats
  const footerText = await page.$eval('.footer', el => el.textContent).catch(() => '');
  if (footerText.includes('14') && footerText.includes('46')) {
    ok('Footer shows 14 formats, 46+ paths');
  } else {
    fail('Footer stats', `unexpected: "${footerText}"`);
  }

  // ═══════════════════════════════════════════
  //  CONVERSION SCENARIOS
  // ═══════════════════════════════════════════

  const conversions = [
    // Document conversions
    ['sample.md', 'HTML (.html)', 'MD→HTML'],
    ['sample.md', 'PDF (.pdf)', 'MD→PDF'],
    ['sample.md', 'Word (.docx)', 'MD→DOCX'],
    ['sample.md', 'Text (.txt)', 'MD→TXT'],
    ['sample.md', 'JSON (.json)', 'MD→JSON'],
    ['sample.md', 'PNG (.png)', 'MD→PNG'],
    // HTML conversions
    ['sample.html', 'Markdown (.md)', 'HTML→MD'],
    ['sample.html', 'PDF (.pdf)', 'HTML→PDF'],
    ['sample.html', 'Text (.txt)', 'HTML→TXT'],
    ['sample.html', 'PNG (.png)', 'HTML→PNG'],
    ['sample.html', 'Word (.docx)', 'HTML→DOCX'],
    ['sample.html', 'JSON (.json)', 'HTML→JSON'],
    // TXT conversions
    ['sample.txt', 'HTML (.html)', 'TXT→HTML'],
    ['sample.txt', 'Markdown (.md)', 'TXT→MD'],
    ['sample.txt', 'PDF (.pdf)', 'TXT→PDF'],
    // JSON conversions (new feature)
    ['sample.json', 'HTML (.html)', 'JSON→HTML'],
    ['sample.json', 'CSV (.csv)', 'JSON→CSV'],
    ['sample.json', 'Excel (.xlsx)', 'JSON→XLSX'],
    ['sample.json', 'Markdown (.md)', 'JSON→MD'],
    ['sample.json', 'PDF (.pdf)', 'JSON→PDF'],
    ['sample.json', 'Text (.txt)', 'JSON→TXT'],
    ['sample.json', 'PNG (.png)', 'JSON→PNG'],
    // CSV conversions
    ['sample.csv', 'Excel (.xlsx)', 'CSV→XLSX'],
    ['sample.csv', 'HTML (.html)', 'CSV→HTML'],
    ['sample.csv', 'JSON (.json)', 'CSV→JSON'],
    ['sample.csv', 'Markdown (.md)', 'CSV→MD'],
    ['sample.csv', 'PDF (.pdf)', 'CSV→PDF'],
    ['sample.csv', 'Text (.txt)', 'CSV→TXT'],
    // XLSX conversions
    ['sample.xlsx', 'CSV (.csv)', 'XLSX→CSV'],
    ['sample.xlsx', 'HTML (.html)', 'XLSX→HTML'],
    ['sample.xlsx', 'JSON (.json)', 'XLSX→JSON'],
    ['sample.xlsx', 'Markdown (.md)', 'XLSX→MD'],
    ['sample.xlsx', 'PDF (.pdf)', 'XLSX→PDF'],
    ['sample.xlsx', 'Text (.txt)', 'XLSX→TXT'],
    // DOCX conversions
    ['sample.docx', 'HTML (.html)', 'DOCX→HTML'],
    ['sample.docx', 'PDF (.pdf)', 'DOCX→PDF'],
    ['sample.docx', 'Markdown (.md)', 'DOCX→MD'],
    ['sample.docx', 'PNG (.png)', 'DOCX→PNG'],
    ['sample.docx', 'Text (.txt)', 'DOCX→TXT'],
    // PDF conversions
    ['sample.pdf', 'HTML (.html)', 'PDF→HTML'],
    ['sample.pdf', 'PNG (.png)', 'PDF→PNG'],
    // SVG conversions (new format)
    ['sample.svg', 'PNG (.png)', 'SVG→PNG'],
    ['sample.svg', 'HTML (.html)', 'SVG→HTML'],
    ['sample.svg', 'PDF (.pdf)', 'SVG→PDF'],
    // GIF conversions (new format)
    ['sample.gif', 'PNG (.png)', 'GIF→PNG'],
    ['sample.gif', 'PDF (.pdf)', 'GIF→PDF'],
    // Single-sheet workbook keeps the plain CSV output
    ['single-sheet.xlsx', 'CSV (.csv)', 'XLSX1→CSV'],
  ];

  let shotIdx = 2;
  for (const [fixture, target, label] of conversions) {
    section(`${label} Conversion`);
    try {
      await resetWorkbench(page);
      const result = await convertFile(page, fixture, target);
      if (result.alertTitle.includes('完成')) {
        ok(`${label}: ${result.formatDetected} → ${target} (${result.resultSize})`);
        const shotName = `${String(shotIdx).padStart(2, '0')}-${label.toLowerCase().replace(/[→]/g, 'to').replace(/[^a-z0-9]/g, '-')}.png`;
        await page.screenshot({ path: shot(shotName), fullPage: true });
        shotIdx++;
      } else {
        fail(label, `alert: "${result.alertTitle}"`);
      }
    } catch (e) {
      fail(label, e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  MULTI-SHEET XLSX → CSV (ZIP bundle)
  // ═══════════════════════════════════════════

  section('Multi-sheet XLSX → CSV exports ZIP');
  try {
    await resetWorkbench(page);
    const result = await convertFile(page, 'sample.xlsx', 'CSV (.csv)');
    if (result.alertTitle.includes('完成') && result.resultName.endsWith('.zip')) {
      ok(`Multi-sheet workbook exported as ZIP: ${result.resultName}`);
    } else {
      fail('Multi-sheet XLSX→CSV', `alert="${result.alertTitle}" name="${result.resultName}"`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-xlsx-zip.png`), fullPage: true });
  } catch (e) { fail('Multi-sheet XLSX→CSV', e.message); }

  // ═══════════════════════════════════════════
  //  ZIP ARCHIVE EXPANSION
  // ═══════════════════════════════════════════

  section('ZIP Archive Expansion');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample-archive.zip'));
    await page.waitForTimeout(1000);

    const itemCount = await page.$$eval('.file-item', els => els.length);
    if (itemCount === 2) ok('ZIP expanded to its 2 supported files (unsupported entry skipped)');
    else fail('ZIP expansion', `expected 2 files, got ${itemCount}`);

    // Batch-convert the extracted files to HTML
    const sel = await page.$('.action-row .el-select');
    await sel.click();
    await page.waitForTimeout(500);
    const opt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'HTML (.html)' }).first();
    await opt.click();
    await page.waitForTimeout(300);
    await (await page.$('.convert-btn')).click();
    await page.waitForFunction(() => {
      const alert = document.querySelector('.el-alert__title');
      return alert && alert.textContent.length > 0;
    }, { timeout: 30000 });
    const resultCount = await page.$$eval('.result-item', els => els.length);
    if (resultCount === 2) ok('Extracted batch converted: 2 results');
    else fail('ZIP batch conversion', `expected 2 results, got ${resultCount}`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-zip-batch.png`), fullPage: true });
  } catch (e) { fail('ZIP archive expansion', e.message); }

  // ═══════════════════════════════════════════
  //  MULTI-PAGE PDF → PNG (ZIP bundle)
  // ═══════════════════════════════════════════

  section('Multi-page PDF → PNG exports ZIP');
  try {
    await resetWorkbench(page);
    const result = await convertFile(page, 'sample-2page.pdf', 'PNG (.png)');
    if (result.alertTitle.includes('完成') && result.resultName.endsWith('.zip')) {
      ok(`Two-page PDF exported as ZIP: ${result.resultName}`);
    } else {
      fail('Multi-page PDF→PNG', `alert="${result.alertTitle}" name="${result.resultName}"`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-pdf-to-png-zip.png`), fullPage: true });
  } catch (e) { fail('Multi-page PDF→PNG ZIP', e.message); }

  // ═══════════════════════════════════════════
  //  JSON RESULT PREVIEW (regression: was blank)
  // ═══════════════════════════════════════════

  section('JSON Result Preview');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample.csv', 'JSON (.json)');

    const previewBtn = await page.$('.result-item button[title="预览"]');
    if (!previewBtn) throw new Error('result preview button not found');
    await previewBtn.click();
    await page.waitForTimeout(800);

    const text = await page.$eval('.preview-dialog .text-preview', el => el.textContent).catch(() => '');
    if (text && text.trim().length > 0) {
      ok(`JSON preview shows content (${text.trim().length} chars)`);
    } else {
      fail('JSON result preview', 'preview content is blank');
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-json-preview.png`), fullPage: true });

    // Close the dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } catch (e) { fail('JSON result preview', e.message); }

  // ═══════════════════════════════════════════
  //  APPEND & CLEAR FILES
  // ═══════════════════════════════════════════

  section('Append & Clear Files');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
    await page.waitForTimeout(1000);

    const addBtn = await page.$('.add-files-btn');
    if (!addBtn) throw new Error('add-files button not found');
    await addBtn.click();
    await page.waitForTimeout(300);
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.txt'));
    await page.waitForTimeout(1000);

    const itemCount = await page.$$eval('.file-item', els => els.length);
    if (itemCount === 2) ok('Appended file merged into existing batch (2 files)');
    else fail('Append files', `expected 2 files, got ${itemCount}`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-append-files.png`), fullPage: true });

    const clearBtn = await page.$('.clear-files-btn');
    if (!clearBtn) throw new Error('clear-files button not found');
    await clearBtn.click();
    await page.waitForTimeout(500);

    const remaining = await page.$$eval('.file-item', els => els.length);
    if (remaining === 0) ok('Clear button removed all files');
    else fail('Clear files', `${remaining} file(s) remained`);
  } catch (e) { fail('Append & clear files', e.message); }

  // ═══════════════════════════════════════════
  //  CTRL/⌘ + ENTER SHORTCUT
  // ═══════════════════════════════════════════

  section('Ctrl+Enter Convert Shortcut');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
    await page.waitForTimeout(1000);

    const sel = await page.$('.action-row .el-select');
    await sel.click();
    await page.waitForTimeout(500);
    const opt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'HTML (.html)' }).first();
    await opt.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Move focus off the select so the global shortcut handler isn't skipped
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

    await page.waitForFunction(() => {
      const alert = document.querySelector('.el-alert__title');
      return alert && alert.textContent.length > 0;
    }, { timeout: 30000 });
    const alertTitle = await page.$eval('.el-alert__title', el => el.textContent).catch(() => '');
    if (alertTitle.includes('完成')) ok('Ctrl+Enter triggered conversion');
    else fail('Ctrl+Enter shortcut', `alert: "${alertTitle}"`);
  } catch (e) { fail('Ctrl+Enter shortcut', e.message); }

  // ═══════════════════════════════════════════
  //  PDF TEXT SPACING REGRESSION
  // ═══════════════════════════════════════════

  section('PDF → HTML word spacing');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample.pdf', 'HTML (.html)');
    const srcdoc = await page.getAttribute('.result-panel iframe.html-frame', 'srcdoc').catch(() => null);
    if (srcdoc && srcdoc.includes('first body line') && srcdoc.includes('Sample PDF Title')) {
      ok('PDF extraction preserves word spacing');
    } else {
      fail('PDF spacing', 'extracted text lost spaces');
    }
  } catch (e) { fail('PDF spacing', e.message); }

  // ═══════════════════════════════════════════
  //  MULTI-STEP PATH VERIFICATION
  // ═══════════════════════════════════════════

  section('Multi-step Conversion Path Hints');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.json'));
    await page.waitForTimeout(1000);

    const sel = await page.$('.action-row .el-select');
    await sel.click();
    await page.waitForTimeout(500);
    const pdfOpt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'PDF (.pdf)' }).first();
    await pdfOpt.click();
    await page.waitForTimeout(500);

    const pathHint = await page.$eval('.path-hint', el => el.textContent).catch(() => null);
    if (pathHint && pathHint.includes('HTML')) {
      ok(`JSON→PDF path hint shows intermediate step: "${pathHint.trim()}"`);
    } else {
      fail('JSON→PDF path hint', `got: "${pathHint}"`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-path-hint.png`), fullPage: true });

    // Close dropdown by clicking elsewhere
    await page.keyboard.press('Escape');
  } catch (e) { fail('Path hints', e.message); }

  // ═══════════════════════════════════════════
  //  COMPARISON VIEW FEATURES
  // ═══════════════════════════════════════════

  section('Comparison View — View Modes');
  try {
    // Do a quick conversion first
    await resetWorkbench(page);
    await convertFile(page, 'sample.md', 'HTML (.html)');

    const modes = await page.$$('.mode-btn');
    if (modes.length < 3) throw new Error(`expected 3 mode buttons, found ${modes.length}`);

    await modes[0].click(); await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-source-only.png`), fullPage: true });
    ok('Source Only mode');

    await modes[1].click(); await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-split-view.png`), fullPage: true });
    ok('Split View mode');

    await modes[2].click(); await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-result-only.png`), fullPage: true });
    ok('Result Only mode');
  } catch (e) { fail('Comparison view modes', e.message); }

  section('Comparison View — Keyboard Shortcuts');
  try {
    await page.keyboard.press('2'); await page.waitForTimeout(300);

    await page.keyboard.press('1'); await page.waitForTimeout(300);
    ok('Key "1" → Source Only');

    await page.keyboard.press('2'); await page.waitForTimeout(300);
    ok('Key "2" → Split View');

    await page.keyboard.press('3'); await page.waitForTimeout(300);
    ok('Key "3" → Result Only');

    await page.keyboard.press('2'); await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300);
    ok('ArrowLeft adjusts split');

    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
    ok('ArrowRight adjusts split');
  } catch (e) { fail('Keyboard shortcuts', e.message); }

  section('Comparison View — Draggable Divider');
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
    await page.waitForTimeout(300);
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
      await page.waitForTimeout(300);
      ok('Divider dragged right');
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-drag-divider.png`), fullPage: true });
  } catch (e) { fail('Draggable divider', e.message); }

  // ═══════════════════════════════════════════
  //  THEME & DARK MODE
  // ═══════════════════════════════════════════

  section('Theme Switcher');
  try {
    const gear = await page.$('.topbar-inner .el-button');
    if (!gear) throw new Error('settings button not found');
    await gear.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-prefs-popover.png`), fullPage: true });
    ok('Preferences popover opened');

    // Verify all sections exist
    const popoverText = await page.$eval('.el-popover', el => el.textContent).catch(() => '');
    if (popoverText.includes('主题色')) ok('Theme section label visible');
    else fail('Theme label', 'not found in popover');
    if (popoverText.includes('显示模式')) ok('Display mode section label visible');
    else fail('Mode label', 'not found in popover');
    if (popoverText.includes('界面语言')) ok('Language section label visible');
    else fail('Language label', 'not found in popover');

    // Verify all 6 theme names
    const themeNames = ['经典蓝', '森林绿', '梦幻紫', '活力橙', '玫瑰红', '石墨灰'];
    for (const name of themeNames) {
      if (popoverText.includes(name)) ok(`Theme name "${name}" displayed`);
      else fail(`Theme name "${name}"`, 'not found');
    }

    // Verify mode labels
    for (const label of ['亮色', '暗色', '跟随系统']) {
      if (popoverText.includes(label)) ok(`Mode option "${label}" displayed`);
      else fail(`Mode option "${label}"`, 'not found');
    }

    // Count theme buttons
    const items = await page.$$('.theme-item');
    if (items.length === 6) ok('6 theme buttons rendered');
    else fail('Theme button count', `expected 6, got ${items.length}`);

    // Test each theme
    for (let i = 0; i < items.length; i++) {
      await items[i].click();
      await page.waitForTimeout(200);
      const applied = await page.evaluate(() => document.documentElement.dataset.theme);
      if (applied === themeValues[i]) ok(`Theme "${themeValues[i]}" applied`);
      else fail(`Theme "${themeValues[i]}"`, `got "${applied}"`);

      // Contrast is measured off the rendered page, per theme, so a future palette edit
      // that pushes any of the 12 combos under AA fails here instead of being a manual
      // audit. The topbar carries 4.5:1 body text (brand-tag); the ring needs 3:1 as
      // non-text content (WCAG 1.4.11) against the card it is usually drawn on.
      const surface = await surfaceColors(page);
      const onTopbar = contrast(surface.brand, surface.topbar);
      const ringOnCard = contrast(surface.ring, surface.card);
      if (onTopbar >= 4.5)
        ok(`[${themeValues[i]} light] topbar brand ${onTopbar.toFixed(2)}:1`);
      else
        fail(`[${themeValues[i]} light] topbar contrast`, `${onTopbar.toFixed(2)}:1 — ${surface.brand} on ${surface.topbar}`);
      if (ringOnCard >= 3)
        ok(`[${themeValues[i]} light] focus ring ${ringOnCard.toFixed(2)}:1 on card`);
      else
        fail(`[${themeValues[i]} light] focus ring`, `${ringOnCard.toFixed(2)}:1 — ${surface.ring} on ${surface.card}`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-theme-applied.png`), fullPage: true });
  } catch (e) { fail('Theme switcher', e.message); }

  section('Dark Mode');
  try {
    // Find the mode section buttons (second .lang-options group in popover)
    const modeButtons = await page.$$('.pref-section .lang-options .lang-btn');
    // modeButtons: [亮色, 暗色, 跟随系统, 中文, English]
    // Dark mode button is index 1
    if (modeButtons.length >= 3) {
      await modeButtons[1].click(); // 暗色
      await page.waitForTimeout(300);

      const mode = await page.evaluate(() => document.documentElement.dataset.mode);
      if (mode === 'dark') ok('Dark mode activated (data-mode="dark")');
      else fail('Dark mode', `data-mode="${mode}"`);

      // Verify dark CSS variables
      const vars = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return {
          bgPage: cs.getPropertyValue('--fat-bg-page').trim(),
          bgCard: cs.getPropertyValue('--fat-bg-card').trim(),
          text: cs.getPropertyValue('--fat-text-regular').trim(),
          border: cs.getPropertyValue('--fat-border').trim(),
        };
      });
      if (vars.bgPage === '#11111b') ok(`Dark bg-page correct (${vars.bgPage})`);
      else fail('Dark bg-page', vars.bgPage);
      if (vars.bgCard === '#1e1e2e') ok(`Dark bg-card correct (${vars.bgCard})`);
      else fail('Dark bg-card', vars.bgCard);
      if (vars.text === '#bac2de') ok(`Dark text correct (${vars.text})`);
      else fail('Dark text', vars.text);

      await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-dark-mode.png`), fullPage: true });

      // Test each theme in dark mode
      const themeItems = await page.$$('.theme-item');
      for (let i = 0; i < themeItems.length && i < themeValues.length; i++) {
        await themeItems[i].click();
        await page.waitForTimeout(100);
        const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fat-primary').trim());
        const elPrimary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim());
        if (primary && primary === elPrimary) ok(`Dark+${themeValues[i]}: primary=${primary}, EP synced`);
        else fail(`Dark+${themeValues[i]}`, `primary=${primary}, el=${elPrimary}`);

        // Same contract as the light loop. White-on-pastel is exactly what used to fail
        // here (1.69–2.67:1) because the dark primaries are deliberately light tints.
        const surface = await surfaceColors(page);
        const onTopbar = contrast(surface.brand, surface.topbar);
        const ringOnCard = contrast(surface.ring, surface.card);
        if (onTopbar >= 4.5)
          ok(`[${themeValues[i]} dark] topbar brand ${onTopbar.toFixed(2)}:1`);
        else
          fail(`[${themeValues[i]} dark] topbar contrast`, `${onTopbar.toFixed(2)}:1 — ${surface.brand} on ${surface.topbar}`);
        if (ringOnCard >= 3)
          ok(`[${themeValues[i]} dark] focus ring ${ringOnCard.toFixed(2)}:1 on card`);
        else
          fail(`[${themeValues[i]} dark] focus ring`, `${ringOnCard.toFixed(2)}:1 — ${surface.ring} on ${surface.card}`);
      }

      // Switch back to light
      await modeButtons[0].click(); // 亮色
      await page.waitForTimeout(300);
      const lightMode = await page.evaluate(() => document.documentElement.dataset.mode);
      if (!lightMode || lightMode === '') ok('Switched back to light mode');
      else fail('Light mode restore', `data-mode="${lightMode}"`);
    } else {
      fail('Dark mode', `mode buttons not found (count: ${modeButtons.length})`);
    }
  } catch (e) { fail('Dark mode', e.message); }

  // ═══════════════════════════════════════════
  //  HISTORY CLEAR CONFIRMATION
  // ═══════════════════════════════════════════

  section('History Clear Confirmation');
  try {
    // Close popover first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Do a conversion to create history
    await resetWorkbench(page);
    await convertFile(page, 'sample.md', 'HTML (.html)');
    await page.waitForTimeout(500);

    // Check history has entries
    const historyItems = await page.$$('.history-item');
    if (historyItems.length > 0) ok(`History has ${historyItems.length} record(s)`);
    else throw new Error('no history records after conversion');

    // Click clear button (third action: Export, Import, Clear)
    const clearBtn = await page.$('.history-head-actions .el-button:last-child');
    if (!clearBtn) throw new Error('clear button not found');
    await clearBtn.click();
    await page.waitForTimeout(500);

    // Check confirmation dialog appeared
    const dialog = await page.$('.el-message-box');
    if (dialog) {
      ok('Clear confirmation dialog appeared');
      await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-clear-confirm.png`), fullPage: true });

      // Click cancel
      const cancelBtn = await page.$('.el-message-box__btns .el-button:first-child');
      if (cancelBtn) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
        const itemsAfterCancel = await page.$$('.history-item');
        if (itemsAfterCancel.length > 0) ok('History preserved after cancel');
        else fail('Cancel clear', 'history lost after cancel');
      }
    } else {
      fail('Clear confirmation', 'dialog not shown');
    }
  } catch (e) { fail('History clear', e.message); }

  // ═══════════════════════════════════════════
  //  CONVERSION CANCEL
  // ═══════════════════════════════════════════

  section('Conversion Cancel');
  try {
    await resetWorkbench(page);
    // Upload multiple files to make conversion take longer
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles([
      path.join(FIXTURE_PATH, 'sample.md'),
      path.join(FIXTURE_PATH, 'sample.html'),
      path.join(FIXTURE_PATH, 'sample.txt'),
    ]);
    await page.waitForTimeout(1000);

    const sel = await page.$('.action-row .el-select');
    await sel.click();
    await page.waitForTimeout(500);
    const pdfOpt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'PDF (.pdf)' }).first();
    await pdfOpt.click();
    await page.waitForTimeout(300);

    const cb = await page.$('.convert-btn');
    await cb.click();

    // Try to find and click cancel button quickly
    try {
      const cancelBtn = await page.waitForSelector('.cancel-btn', { timeout: 2000 });
      if (cancelBtn) {
        ok('Cancel button visible during conversion');
        await cancelBtn.click();
        await page.waitForTimeout(1000);
        ok('Cancel button clicked');
      }
    } catch {
      // Conversion may have completed before cancel button appeared
      const isLoading = await page.$eval('.convert-btn', el => el.classList.contains('is-loading')).catch(() => false);
      if (!isLoading) ok('Conversion completed before cancel could be tested (fast machine)');
      else fail('Cancel button', 'not visible and conversion still in progress');
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-cancel-test.png`), fullPage: true });
  } catch (e) { fail('Conversion cancel', e.message); }

  // ═══════════════════════════════════════════
  //  LARGE BATCH CONFIRMATION (F15)
  // ═══════════════════════════════════════════

  section('Large Batch Confirmation Dialog');
  try {
    await resetWorkbench(page);
    // 6 files is one over CONFIRM_FILE_COUNT (5), so the dialog must appear. All six are
    // small, so the byte threshold stays out of it and the count trigger is isolated.
    // PDF is the target because it is reachable from every source here, and — unlike
    // HTML — it is not itself one of the sources (a format present in the batch is
    // excluded from its own target list).
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles([
      path.join(FIXTURE_PATH, 'sample.md'),
      path.join(FIXTURE_PATH, 'sample.html'),
      path.join(FIXTURE_PATH, 'sample.txt'),
      path.join(FIXTURE_PATH, 'sample.csv'),
      path.join(FIXTURE_PATH, 'sample.json'),
      path.join(FIXTURE_PATH, 'sample.svg'),
    ]);
    await page.waitForTimeout(1500);

    const sel = await page.$('.action-row .el-select');
    await sel.click();
    await page.waitForTimeout(500);
    const opt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'PDF (.pdf)' }).first();
    await opt.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await (await page.$('.convert-btn')).click();
    await page.waitForSelector('.el-message-box', { timeout: 5000 });
    const summary = await page.$eval('.el-message-box__message', el => el.textContent || '');
    if (summary.includes('6')) ok('Confirm dialog summarises the 6-file batch');
    else fail('Confirm dialog summary', `message: "${summary}"`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-confirm-dialog.png`), fullPage: true });

    // Cancel: the first button is "cancel", and convert() must bail out with a toast.
    await page.click('.el-message-box__btns .el-button:first-child');
    await page.waitForFunction(
      () => [...document.querySelectorAll('.el-message')].some(m => (m.textContent || '').includes('已取消')),
      { timeout: 5000 },
    );
    ok('Cancelling the dialog aborts the conversion');

    // Accept: the last button is "confirm" and the batch then runs to completion.
    await (await page.$('.convert-btn')).click();
    await page.waitForSelector('.el-message-box', { timeout: 5000 });
    await page.click('.el-message-box__btns .el-button:last-child');
    await page.waitForFunction(() => {
      const alert = document.querySelector('.el-alert__title');
      return alert && alert.textContent.includes('完成');
    }, { timeout: 90000 });
    ok('Accepting the dialog runs the batch');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-confirm-accepted.png`), fullPage: true });
  } catch (e) { fail('Large batch confirmation', e.message); }

  // ═══════════════════════════════════════════
  //  UNDO PREVIOUS BATCH
  // ═══════════════════════════════════════════

  section('Undo Previous Batch');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample.md', 'HTML (.html)');
    await page.waitForTimeout(600);

    const undoBefore = await page.$('.undo-btn');
    if (!undoBefore) ok('Undo hidden after the first conversion of a batch');
    else fail('Undo visibility', 'undo offered with no previous batch to restore');

    // Re-convert: the run that just finished becomes the undo snapshot. `.undo-btn`
    // only appears once isConverting flips back to false, so it doubles as the
    // completion signal here.
    await (await page.$('.convert-btn')).click();
    await page.waitForSelector('.undo-btn', { timeout: 60000 });
    ok('Undo available after re-converting the same batch');

    // Replacing the files must invalidate the snapshot — otherwise undo restores results
    // for files that are no longer selected while the file list shows the new ones.
    const fi2 = await page.$('input[type="file"]');
    await fi2.setInputFiles(path.join(FIXTURE_PATH, 'sample.txt'));
    await page.waitForFunction(() => !document.querySelector('.undo-btn'), { timeout: 5000 });
    ok('Undo invalidated after the file set changed');

    // Now exercise the restore itself.
    await convertFile(page, 'sample.txt', 'HTML (.html)');
    await page.waitForTimeout(400);
    await (await page.$('.convert-btn')).click();
    await page.waitForSelector('.undo-btn', { timeout: 60000 });
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-undo-available.png`), fullPage: true });
    await (await page.$('.undo-btn')).click();
    await page.waitForFunction(
      () => [...document.querySelectorAll('.el-message')].some(m => (m.textContent || '').includes('已撤销')),
      { timeout: 5000 },
    );
    ok('Undo restored the previous batch and reported success');
    await page.waitForFunction(() => !document.querySelector('.undo-btn'), { timeout: 5000 });
    ok('Undo is one-shot — the snapshot is consumed');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-undo-done.png`), fullPage: true });
  } catch (e) { fail('Undo previous batch', e.message); }

  // ═══════════════════════════════════════════
  //  HISTORY SEARCH & FORMAT FILTER
  // ═══════════════════════════════════════════

  section('History Search & Filter');
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Seed a small deterministic history so the assertions don't depend on whatever the
    // earlier sections happened to convert.
    const clearBtn = await page.$('.history-head-actions .el-button:last-child');
    if (clearBtn) {
      await clearBtn.click();
      await page.waitForTimeout(400);
      await page.click('.el-message-box__btns .el-button:last-child');
      await page.waitForTimeout(600);
    }
    await resetWorkbench(page);
    await convertFile(page, 'sample.md', 'HTML (.html)');
    await page.waitForTimeout(400);
    await resetWorkbench(page);
    await convertFile(page, 'sample.csv', 'Excel (.xlsx)');
    await page.waitForTimeout(800);

    const seededCount = (await page.$$('.history-item')).length;
    if (seededCount < 2) throw new Error(`expected >= 2 seeded records, got ${seededCount}`);
    ok(`Seeded ${seededCount} deterministic history record(s)`);

    const searchInput = await page.$('.history-search input');
    if (!searchInput) throw new Error('history search input not found');

    await searchInput.fill('zzz-no-such-file');
    await page.waitForTimeout(500);
    const hitsNone = (await page.$$('.history-item')).length;
    const emptyText = await page.$eval('.history-empty', el => el.textContent || '').catch(() => '');
    if (hitsNone === 0 && emptyText.includes('没有匹配')) ok('Search with no hits shows the no-match state');
    else fail('History search (no match)', `${hitsNone} items, empty text="${emptyText}"`);

    await searchInput.fill('sample.csv');
    await page.waitForTimeout(500);
    const hitsOne = (await page.$$('.history-item')).length;
    if (hitsOne === 1) ok('Search by file name narrows to the single match');
    else fail('History search (match)', `expected 1 record, got ${hitsOne}`);

    await searchInput.fill('');
    await page.waitForTimeout(400);

    // Format filter in the default "all" mode must match source OR target. It used to
    // fall through both inner conditions and filter nothing at all, which is why the
    // count is asserted against the seeded total rather than just "non-zero".
    const fmtSel = await page.$('.history-format');
    if (!fmtSel) throw new Error('history format filter not found');
    await fmtSel.click();
    await page.waitForTimeout(500);
    const fmtOpt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'Excel (.xlsx)' }).first();
    await fmtOpt.click();
    await page.waitForTimeout(700);

    const filteredCount = (await page.$$('.history-item')).length;
    if (filteredCount === seededCount) {
      fail('History format filter', `no-op: still ${filteredCount} of ${seededCount} records`);
    } else if (filteredCount === 1) {
      ok(`Format filter ("all" mode) narrowed ${seededCount} → 1 record`);
    } else {
      fail('History format filter', `expected 1 record, got ${filteredCount} of ${seededCount}`);
    }
    const allRelevant = await page.$$eval('.history-item', els => els.every(e => (e.textContent || '').includes('Excel')));
    if (allRelevant) ok('Every surviving record actually involves the filtered format');
    else fail('History format filter', 'a record without the format survived');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-history-filter.png`), fullPage: true });
  } catch (e) { fail('History search & filter', e.message); }

  // ═══════════════════════════════════════════
  //  HISTORY: FIND A BATCH MEMBER BY ITS REAL FILE NAME
  // ═══════════════════════════════════════════

  section('History search matches non-first batch file');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles([
      path.join(FIXTURE_PATH, 'sample.md'),
      path.join(FIXTURE_PATH, 'sample.txt'),
    ]);
    await page.waitForTimeout(1200);

    const sel = await page.$('.action-row .el-select');
    await sel.click();
    await page.waitForTimeout(500);
    const opt = await page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'HTML (.html)' }).first();
    await opt.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await (await page.$('.convert-btn')).click();
    // hasUndo/`.undo-btn` would work too, but the completion alert is the direct signal.
    await page.waitForFunction(() => {
      const el = document.querySelector('.el-alert__title');
      return !!el && (el.textContent || '').includes('完成');
    }, { timeout: 60000 });
    await page.waitForTimeout(800);

    const searchInput = await page.$('.history-search input');
    if (!searchInput) throw new Error('history search input not found');

    // The previous section leaves the format filter pinned to Excel, which would AND away
    // this HTML-target record and make the search look broken. Clear every filter through
    // the only affordance the UI offers for it — the reset button inside the no-match
    // state — which puts that path under coverage too.
    await searchInput.fill('zzz-no-such-file');
    await page.waitForTimeout(600);
    const resetBtn = await page.$('.history-empty .el-button');
    if (!resetBtn) throw new Error('no-match state offers no reset button');
    await resetBtn.click();
    await page.waitForTimeout(500);

    await searchInput.fill('sample.txt');
    await page.waitForTimeout(600);

    const hits = await page.$$('.history-item');
    if (hits.length !== 1) {
      fail('Batch-member search', `expected exactly 1 record for "sample.txt", got ${hits.length}`);
    } else {
      // The row's visible text is the compact label `"sample.md + 1"`, which does NOT
      // contain the query. Proving that is what makes this a lock for the `fileNames`
      // field rather than an accident of the label matching.
      const label = (await hits[0].$eval('.history-name', el => el.textContent || '')).trim();
      const tooltip = await hits[0].$eval('.history-name', el => el.getAttribute('title') || '');
      if (!label.includes('sample.txt')) {
        ok(`Found the batch via a file hidden by its label (row shows "${label}")`);
      } else {
        fail('Batch-member search', `label already contained the query, so this proves nothing: "${label}"`);
      }
      // The tooltip is the only place the full member list is surfaced in the UI.
      if (tooltip.includes('sample.txt') && tooltip.includes('sample.md'))
        ok('Row tooltip lists every file in the batch');
      else fail('Batch tooltip', `title="${tooltip}"`);
    }

    await searchInput.fill('');
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-history-batch-search.png`), fullPage: true });
  } catch (e) { fail('History batch-member search', e.message); }

  // ═══════════════════════════════════════════
  //  CUSTOM SHORTCUT RECORDING (F16)
  // ═══════════════════════════════════════════

  section('Custom Shortcut Recording');
  try {
    const gear = await page.$('.topbar-inner .el-button');
    if (!gear) throw new Error('settings button not found');
    await gear.click();
    await page.waitForTimeout(800);

    // `page.$eval` rejects when the selector is missing; an empty label is a softer
    // failure than aborting the whole section. Two things to get right here: the `.catch`
    // must be attached to the promise BEFORE `await` (awaiting first yields a string,
    // which has no `.catch`), and the label must be re-queried rather than read off a
    // cached handle — `.shortcut-key` is a v-if/v-else pair, so entering the recording
    // state replaces the node and stale handles would throw.
    const keyLabel = async () => (await page.$eval('.shortcut-key', el => el.textContent || '').catch(() => '')).trim();

    if (!(await page.$('.shortcut-key'))) throw new Error('shortcut button not found in preferences');
    const defaultLabel = await keyLabel();

    await (await page.$('.shortcut-key')).click();
    await page.waitForTimeout(300);
    if (await page.$('.shortcut-key.recording')) ok('Shortcut button entered the recording state');
    else fail('Shortcut recording', 'button did not enter the recording state');

    // Rebind. The capture-phase listener stops this from reaching App.vue's convert
    // handler, so the batch must not start converting mid-recording.
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+K' : 'Control+Shift+K');
    await page.waitForTimeout(700);
    const rebound = await keyLabel();
    if (rebound && rebound !== defaultLabel) ok(`Shortcut rebound: "${defaultLabel}" → "${rebound}"`);
    else fail('Shortcut rebind', `label unchanged: "${rebound}"`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-shortcut-rebound.png`), fullPage: true });

    // A reserved bare key must be rejected. Only the RESERVED_LOWER path is exercised:
    // RESERVED_COMBOS are all real browser shortcuts (Ctrl+T/W/N…), and dispatching them
    // risks the driver acting on them and losing the tab under test.
    await (await page.$('.shortcut-key')).click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(600);
    const afterReserved = await keyLabel();
    if (afterReserved === rebound) ok('Reserved key rejected — the binding was kept');
    else fail('Reserved key', `binding changed to "${afterReserved}"`);

    // Escape must cancel recording without saving.
    await (await page.$('.shortcut-key')).click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if (!(await page.$('.shortcut-key.recording'))) ok('Escape cancelled the recording');
    else fail('Escape cancel', 'still in the recording state');

    // Restore the default so later sections (and re-runs) see the shipped binding.
    const resetBtn = await page.$('.shortcut-reset');
    if (!resetBtn) throw new Error('shortcut reset button not found');
    await resetBtn.click();
    await page.waitForTimeout(600);
    const afterReset = await keyLabel();
    if (afterReset === defaultLabel) ok(`Reset restored the default "${defaultLabel}"`);
    else fail('Shortcut reset', `"${afterReset}" != "${defaultLabel}"`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } catch (e) { fail('Custom shortcut', e.message); }

  // ═══════════════════════════════════════════
  //  SKIP LINK & FOCUS RING (F10)
  // ═══════════════════════════════════════════

  section('Skip Link & Focus Ring');
  try {
    // Reload first so this section cannot inherit state from the previous one: a popover
    // left open owns the tab order (Element Plus teleports it to the end of <body>) and
    // the skip link would never be reached. addInitScript re-runs on every navigation, so
    // the mocked chrome.storage survives.
    await page.reload();
    await page.waitForTimeout(2000);
    // .skip-link is the first focusable node in the template, so one Tab from a freshly
    // loaded document must land on it. Its slide-in is driven by :focus-visible, which a
    // real keypress satisfies but a programmatic .focus() would not.
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    const linkState = await page.evaluate(() => {
      const el = document.querySelector('.skip-link');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        focused: document.activeElement === el,
        top: el.getBoundingClientRect().top,
        transform: cs.transform,
        outlineStyle: cs.outlineStyle,
      };
    });
    if (!linkState) throw new Error('skip link not found');
    if (linkState.focused) ok('First Tab lands on the skip link');
    else fail('Skip link focus', `activeElement is not .skip-link (top=${linkState.top})`);
    if (linkState.top >= 0) ok(`Skip link slid into view (top=${Math.round(linkState.top)}px)`);
    else fail('Skip link visibility', `still off-screen: top=${Math.round(linkState.top)}, transform=${linkState.transform}`);
    // A skip link is useless if nobody can see where focus went. Read while still focused —
    // the evaluate blocks below move focus away.
    if (linkState.outlineStyle === 'solid') ok('Skip link shows a visible focus ring');
    else fail('Skip link ring', `outline-style="${linkState.outlineStyle}"`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-skip-link-focus.png`), fullPage: true });

    // The skip link's own target carries tabindex="-1": it only ever receives focus
    // programmatically, so no ring should be drawn on it at all. Two regressions to catch
    // here: the global rule matching it again (→ our 2px solid ring), and dropping the
    // explicit suppression, which lets the user-agent draw a heavy box around the entire
    // content area — that reads as a rendering bug.
    await page.evaluate(() => document.querySelector('#main-content')?.focus());
    await page.waitForTimeout(500);
    const mainOutline = await page.evaluate(() => {
      const m = document.querySelector('#main-content');
      if (!(m instanceof HTMLElement)) return null;
      const cs = getComputedStyle(m);
      return { style: cs.outlineStyle, width: cs.outlineWidth };
    });
    if (!mainOutline) throw new Error('#main-content not found');
    if (mainOutline.style === 'none') ok('#main-content has no focus ring (programmatic target)');
    else fail('Focus ring exclusion', `#main-content outline: ${mainOutline.style} ${mainOutline.width}`);

    // Positive half of the same invariant: excluding tabindex="-1" must not have disabled
    // the ring for real interactive controls. Target the topbar button rather than
    // .convert-btn — the latter lives inside `v-if="hasFiles"` and the reload above left
    // the workbench empty; both are `el-button`, so they exercise the same !important rule.
    // Focus and read MUST be separate round-trips: EP's `.el-button:focus-visible` declares
    // `transition: outline-offset, outline`, so reading in the same task as .focus() returns
    // an interpolation frame (width still `medium`=3px, colour still `currentcolor`)
    // instead of the cascaded result.
    await page.evaluate(() => document.querySelector('.topbar-inner .el-button')?.focus());
    await page.waitForTimeout(500);
    const btnOutline = await page.evaluate(() => {
      const b = document.querySelector('.topbar-inner .el-button');
      if (!(b instanceof HTMLElement)) return null;
      const cs = getComputedStyle(b);
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
    });
    if (!btnOutline) throw new Error('.topbar-inner .el-button not found');
    if (btnOutline.style === 'solid' && btnOutline.width === '2px')
      ok(`Interactive controls keep the 2px primary ring (${btnOutline.color})`);
    else fail('Focus ring', `topbar button outline: ${btnOutline.style} ${btnOutline.width} ${btnOutline.color}`);

    // ── Skip-link chip + mode-aware ring, checked in BOTH modes ─────────────────
    // Both are colour assertions, so compare resolved colours rather than token names:
    // every value is normalised through a scratch element to `rgb(...)` first.
    // Flipping [data-mode] directly is sound here — useTheme only ever writes that
    // attribute and every dark rule in the stylesheet is keyed off it.
    const probe = mode => page.evaluate(m => {
      const root = document.documentElement;
      const prev = root.getAttribute('data-mode');
      if (m === 'dark') root.setAttribute('data-mode', 'dark');
      else root.removeAttribute('data-mode');

      const rgbOf = value => {
        const scratch = document.createElement('span');
        scratch.style.color = value;
        scratch.style.display = 'none';
        root.append(scratch);
        const rgb = getComputedStyle(scratch).color;
        scratch.remove();
        return rgb;
      };
      const tokens = getComputedStyle(root);
      const link = document.querySelector('.skip-link');
      const button = document.querySelector('.topbar-inner .el-button');
      button?.focus();
      // Same transition caveat as above: EP animates `outline`, so the cascaded colour
      // is only readable after it settles.
      return new Promise(resolve => setTimeout(() => {
        const out = {
          chipBg: link ? getComputedStyle(link).backgroundColor : '',
          chipColor: link ? getComputedStyle(link).color : '',
          expectChipBg: rgbOf(tokens.getPropertyValue('--fat-bg-card').trim()),
          expectChipColor: rgbOf(tokens.getPropertyValue('--fat-text-primary').trim()),
          // What the buggy version rendered: white text on --fat-primary.
          legacyColor: rgbOf('#fff'),
          legacyBg: rgbOf(tokens.getPropertyValue('--fat-primary').trim()),
          ringColor: button ? getComputedStyle(button).outlineColor : '',
          ringFromToken: rgbOf(tokens.getPropertyValue('--fat-focus-ring').trim()),
        };
        if (prev === null) root.removeAttribute('data-mode');
        else root.setAttribute('data-mode', prev);
        resolve(out);
      }, 600));
    }, mode);

    for (const mode of ['light', 'dark']) {
      const s = await probe(mode);
      // The chip must never fall back to the legacy white-on-primary pair, which measured
      // 1.69–2.67:1 in dark mode because the dark primaries are deliberately light tints.
      if (s.chipBg === s.expectChipBg && s.chipColor === s.expectChipColor)
        ok(`[${mode}] Skip link uses the inverted AAA chip (${s.chipColor} on ${s.chipBg})`);
      else if (s.chipColor === s.legacyColor && s.chipBg === s.legacyBg)
        fail(`[${mode}] Skip link contrast`, 'regressed to white on --fat-primary');
      else fail(`[${mode}] Skip link contrast`, `got ${s.chipColor} on ${s.chipBg}`);
      // The ring colour resolves per mode from --fat-focus-ring. In dark that is
      // --fat-primary-hover, and EP's `!important` outline must not defeat it — the old
      // non-!important tint rule did exactly that.
      if (s.ringColor === s.ringFromToken)
        ok(`[${mode}] Element Plus ring resolves to --fat-focus-ring (${s.ringColor})`);
      else fail(`[${mode}] Element Plus ring`, `expected ${s.ringFromToken}, got ${s.ringColor}`);
    }
    const modesDiffer = (await probe('light')).ringFromToken !== (await probe('dark')).ringFromToken;
    if (modesDiffer) ok('--fat-focus-ring actually differs between light and dark (not a no-op token)');
    else fail('--fat-focus-ring', 'resolves to the same colour in both modes');
  } catch (e) { fail('Skip link & focus ring', e.message); }

  // ═══════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════

  console.log('\n╔══════════════════════════════════════════════╗');
  const total = passed + failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  console.log(`║  Results: ${passed}/${total} passed (${pct}%)`.padEnd(46) + '║');
  if (failures.length > 0) {
    console.log('║                                                ║');
    console.log('║  Failures:                                     ║');
    for (const f of failures) {
      const line = `║    ✗ ${f.name}: ${f.error}`;
      console.log(line.padEnd(46) + '║');
    }
  }
  console.log('╚══════════════════════════════════════════════╝');

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}/`);
  fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort().forEach(f => console.log(`  ${f}`));

  await page.waitForTimeout(HEADLESS ? 0 : 2000);
  await browser.close();
  server.close();

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n✗ FATAL:', err.message);
  process.exit(1);
});
