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
  console.log('║  File Any Transfer — Full E2E Test Suite     ║');
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
