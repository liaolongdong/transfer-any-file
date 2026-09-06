// Generates the store / marketing image kit from the built extension bundle.
//
// Why a dedicated script: Chrome Web Store screenshots must be exactly 1280×800
// (or 640×400) and README/landing-page art must be a readable viewport crop, while
// `e2e-test.mjs` writes `fullPage` captures (up to ~4200px tall) for assertion
// evidence. Re-shooting real UI states is the only way to get spec-compliant assets,
// and re-running this after a UI change keeps the store kit in sync.
//
// Deliberately standalone: it keeps its own static server + `chrome.storage` mock
// instead of importing them from `e2e-test.mjs`, so the test suite is never put at
// risk by asset regeneration. Extract a shared harness module if a third consumer
// ever needs the same bootstrap.
//
// Usage:
//   pnpm build && node scripts/capture-store-assets.mjs
//   node scripts/capture-store-assets.mjs --only=screens|graphics
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures');
const SHOT_DIR = path.resolve(__dirname, '../docs/assets/screenshots');
const GRAPHIC_DIR = path.resolve(__dirname, '../docs/assets/store');
const ICON_PATH = path.resolve(__dirname, '../public/icon/128.png');

// 1280 is the widest Chrome Web Store screenshot and matches the workbench's own
// 1200px content column without letterboxing; 800 is the store's max height.
const SHOT_VIEWPORT = { width: 1280, height: 800 };
const PORT = parseInt(process.env.ASSETS_PORT || '9878', 10);
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || 'all';

/**
 * A `chrome.storage.local` stub seeded with fixed preferences.
 *
 * Seeding (rather than clicking through the Preferences popover) makes every shot
 * deterministic: `main.ts` reads these keys before the app mounts, so theme,
 * colour mode and language are already applied on first paint — exactly what a
 * real user sees after they have configured the extension once.
 */
function mockStorageScript(seed) {
  return `(() => {
    const storage = ${JSON.stringify(seed)};
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || { id: 'assets' };
    window.chrome.storage = {
      local: {
        get: (keys, cb) => {
          const result = {};
          const list = typeof keys === 'string' ? [keys] : (Array.isArray(keys) ? keys : Object.keys(keys));
          for (const k of list) { if (storage[k] !== undefined) result[k] = storage[k]; }
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
  })()`;
}

/** Serve the built bundle so the workbench can be driven over http (same trick as e2e). */
function startServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.mjs': 'application/javascript',
    '.woff2': 'font/woff2',
    '.worker.js': 'application/javascript',
  };
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      const filePath = path.join(EXTENSION_PATH, url === '/' ? '/options.html' : url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

/** Stage a batch and choose its target, without converting yet. */
async function stageConversion(page, fixtures, targetText) {
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error('file input not found');
  await input.setInputFiles(fixtures.map(f => path.join(FIXTURE_PATH, f)));
  await page.waitForSelector('.file-item', { timeout: 10000 });
  await page.waitForTimeout(500);

  await page.click('.action-row .el-select');
  await page.waitForTimeout(400);
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: targetText }).first().click();
  await page.waitForTimeout(300);
}

/**
 * Convert the staged batch, mirroring the real flow.
 * Waits for the completion alert rather than a fixed delay so slow converters
 * (pdf.js, SheetJS) cannot produce a half-rendered screenshot.
 */
async function runConversion(page) {
  await page.click('.convert-btn');
  await page.waitForFunction(
    () => {
      const alert = document.querySelector('.el-alert__title');
      return Boolean(alert && alert.textContent && alert.textContent.length > 0);
    },
    { timeout: 60000 },
  );
  await page.waitForTimeout(600);
}

async function convert(page, fixtures, targetText) {
  await stageConversion(page, fixtures, targetText);
  await runConversion(page);
}

async function resetWorkbench(page) {
  const reset = await page.$('.reset-btn');
  if (reset) {
    await reset.click();
    await page.waitForTimeout(400);
  }
}

/** Scroll an element to the vertical centre, then shoot the viewport (never fullPage). */
async function shootCentered(page, selector, file) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, selector);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(SHOT_DIR, file) });
  console.log(`  ✓ screenshots/${file}`);
}

async function captureScreens() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-first-run', '--no-default-browser-check', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewportSize(SHOT_VIEWPORT);

  const english = { 'fat:locale': 'en', 'fat:theme': 'blue', 'fat:colorMode': 'light' };
  await page.addInitScript(mockStorageScript(english));
  await page.goto(`http://localhost:${PORT}/options.html`);
  await page.waitForSelector('.drop-zone', { timeout: 20000 });
  await page.waitForTimeout(900);

  // Evidence for the listing copy: the footer publishes the registry's own counts.
  const footer = await page.$eval('.footer', el => (el.textContent || '').trim()).catch(() => '');
  console.log(`  · workbench footer reports: "${footer}"`);

  await page.screenshot({ path: path.join(SHOT_DIR, 'workbench-empty.png') });
  console.log('  ✓ screenshots/workbench-empty.png');

  // Mixed-source batch: three formats, one reachable target, which is the product's
  // headline capability and therefore the hero shot.
  await stageConversion(page, ['sample.md', 'sample.csv', 'sample.xlsx'], 'HTML (.html)');
  await shootCentered(page, '.file-item', 'batch-files.png');
  await runConversion(page);
  await shootCentered(page, '.result-download', 'batch-results.png');

  // Single-file runs: the split source/result preview only appears for one file,
  // and each run leaves a real record behind for the history shot.
  await resetWorkbench(page);
  await convert(page, ['sample.md'], 'HTML (.html)');
  await shootCentered(page, '.comparison-view', 'preview-edit.png');

  await resetWorkbench(page);
  await convert(page, ['sample.csv'], 'Excel (.xlsx)');
  await resetWorkbench(page);
  await convert(page, ['sample.docx'], 'Markdown (.md)');
  // Clear the batch first: with results gone the comparison card unmounts, so the
  // history card moves just below the upload zone and fills the frame on its own.
  await resetWorkbench(page);
  await shootCentered(page, '.history-panel', 'history.png');

  // Dark mode through the app's own startup path (seeded preference), not a click.
  const dark = await browser.newPage();
  await dark.setViewportSize(SHOT_VIEWPORT);
  await dark.addInitScript(mockStorageScript({ ...english, 'fat:colorMode': 'dark' }));
  await dark.goto(`http://localhost:${PORT}/options.html`);
  await dark.waitForSelector('.drop-zone', { timeout: 20000 });
  await dark.waitForTimeout(800);
  await dark.screenshot({ path: path.join(SHOT_DIR, 'dark-mode.png') });
  console.log('  ✓ screenshots/dark-mode.png');
  await dark.close();

  await browser.close();
  server.close();
  return footer;
}

/** Inline a PNG so the composite pages stay self-contained (no file:// access needed). */
function dataUri(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

/**
 * Build one promo graphic as plain HTML rendered at the store's exact pixel size.
 *
 * Two-column product card rather than a text overlay on a screenshot: the UI shot
 * stays legible inside a browser frame, and the copy sits on a solid panel, which
 * keeps the headline readable at the small sizes these tiles are shown at.
 * System fonts only — the kit must be regenerable without network access.
 */
function promoDocument({ width, height, shot, icon, heading, sub, chips, compact }) {
  const padding = compact ? 20 : 44;
  const frameRatio = 1280 / 800; // the screenshots' own aspect ratio
  let frameW = Math.round((width - padding * 3) * 0.56);
  let frameH = Math.round(frameW / frameRatio);
  const maxH = height - padding * 2;
  if (frameH > maxH) {
    frameH = maxH;
    frameW = Math.round(frameH * frameRatio);
  }
  const chipRow = (chips || []).map(c => `<span class="chip">${c}</span>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background:
          radial-gradient(120% 150% at 88% 8%, rgba(37, 99, 235, 0.42) 0%, rgba(37, 99, 235, 0) 58%),
          radial-gradient(90% 130% at 4% 100%, rgba(14, 116, 144, 0.34) 0%, rgba(14, 116, 144, 0) 62%),
          #070d1a;
        color: #fff;
        display: flex;
        align-items: center;
        gap: ${padding}px;
        padding: ${padding}px;
      }
      .copy { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
      .brand { display: flex; align-items: center; gap: ${compact ? 8 : 13}px; }
      .brand img { width: ${compact ? 26 : 40}px; height: ${compact ? 26 : 40}px; }
      .brand span { font-size: ${compact ? 13 : 17}px; font-weight: 700; letter-spacing: 0.2px; }
      h1 {
        font-size: ${compact ? 18 : 38}px;
        line-height: 1.14;
        font-weight: 800;
        letter-spacing: -0.5px;
        margin-top: auto;
      }
      h1 em { font-style: normal; color: #86b0ff; }
      p { margin-top: ${compact ? 7 : 13}px; font-size: ${compact ? 12 : 16}px; line-height: 1.45; color: #c9d6ea; max-width: ${Math.round(frameW * 1.35)}px; }
      .chips { display: flex; flex-wrap: wrap; gap: ${compact ? 6 : 9}px; margin-top: ${compact ? 12 : 22}px; }
      .chip {
        font-size: ${compact ? 10.5 : 12.5}px;
        font-weight: 600;
        padding: ${compact ? 4 : 7}px ${compact ? 8 : 12}px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.09);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #eaf1ff;
        white-space: nowrap;
      }
      .window {
        flex: none;
        width: ${frameW}px;
        border-radius: 12px;
        overflow: hidden;
        background: #f4f6fb;
        border: 1px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 26px 70px rgba(2, 6, 18, 0.62);
      }
      .chrome {
        height: ${compact ? 20 : 30}px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 ${compact ? 8 : 12}px;
        background: #e7ebf3;
        border-bottom: 1px solid #d3d9e6;
      }
      .dot { width: ${compact ? 5 : 8}px; height: ${compact ? 5 : 8}px; border-radius: 50%; background: #b6bfd1; }
      .pill {
        margin-left: 8px;
        font-size: ${compact ? 8.5 : 10.5}px;
        color: #56617a;
        background: #fff;
        border: 1px solid #d9dfec;
        border-radius: 999px;
        padding: ${compact ? 1 : 3}px ${compact ? 6 : 9}px;
      }
      .window img { display: block; width: 100%; height: ${frameH - (compact ? 20 : 30)}px; object-fit: cover; object-position: top center; }
    </style>
  </head>
  <body>
    <div class="copy">
      <div class="brand"><img src="${icon}" alt="" /><span>File Any Transfer</span></div>
      <h1>${heading}</h1>
      <div>
        <p>${sub}</p>
        <div class="chips">${chipRow}</div>
      </div>
    </div>
    ${
      shot
        ? `<div class="window">
      <div class="chrome"><i class="dot"></i><i class="dot"></i><i class="dot"></i><span class="pill">Runs in this tab · no server</span></div>
      <img src="${shot}" alt="File Any Transfer workbench" />
    </div>`
        : ''
    }
  </body>
</html>`;
}

async function captureGraphics() {
  const hero = dataUri(path.join(SHOT_DIR, 'preview-edit.png'));
  const icon = dataUri(ICON_PATH);
  fs.mkdirSync(GRAPHIC_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox'],
  });
  const specs = [
    {
      name: 'github-social-preview.png',
      width: 1280,
      height: 640,
      shot: hero,
      heading: 'Convert <em>14 file formats</em> without uploading a byte.',
      sub: 'Documents, spreadsheets and images — batch, multi-step, entirely inside Chrome.',
      chips: ['No uploads', 'No account', 'Works offline', 'Batch + ZIP'],
    },
    {
      name: 'cws-marquee-promo.png',
      width: 1400,
      height: 560,
      shot: hero,
      heading: 'Every format change happens on <em>your</em> machine.',
      sub: 'Markdown, Word, PDF, Excel, CSV, JSON, HTML and images in one offline workbench.',
      chips: ['14 formats', '46+ conversion paths', 'Batch conversion', 'Zero network'],
    },
    {
      name: 'cws-small-promo.png',
      width: 440,
      height: 280,
      compact: true,
      shot: hero,
      heading: 'Local file format converter',
      sub: 'Docs · Sheets · Images, offline.',
      chips: ['14 formats'],
    },
  ];

  for (const spec of specs) {
    const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
    await page.setContent(promoDocument({ ...spec, icon }), { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(GRAPHIC_DIR, spec.name) });
    console.log(`  ✓ store/${spec.name} (${spec.width}×${spec.height})`);
    await page.close();
  }
  await browser.close();
}

async function run() {
  if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
    console.error('\n✗ Extension not built. Run "pnpm build" first.');
    process.exit(1);
  }
  console.log('\n▸ Store / marketing asset kit');
  if (ONLY === 'all' || ONLY === 'screens') {
    console.log('▸ UI screenshots at 1280×800');
    await captureScreens();
  }
  if (ONLY === 'all' || ONLY === 'graphics') {
    console.log('▸ Promo graphics');
    await captureGraphics();
  }
  console.log('\n✓ Done. Assets live in docs/assets/ and are referenced by README + docs/index.html.\n');
}

await run();
