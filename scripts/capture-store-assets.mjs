// Generates the store / marketing image kit from the built extension bundle.
//
// Why a dedicated script: Chrome Web Store screenshots must be exactly 1280×800
// (or 640×400) and README/landing-page art must be a readable viewport crop, while
// `e2e-test.mjs` writes `fullPage` captures (up to ~4200px tall) for assertion
// evidence. Re-shooting real UI states is the only way to get spec-compliant assets,
// and re-running this after a UI change keeps the store kit in sync.
//
// Three artefacts come out of one run:
//   1. Raw 1280×800 UI captures in `docs/assets/screenshots/` — used by both READMEs
//      and by the product page.
//   2. A second raw pass in the Chinese interface locale, held in a temp directory:
//      it exists only to be composited, because the README and the product page reuse
//      the English set and the store's language tabs do not inherit from each other.
//   3. Captioned per-language listing screenshots in `docs/assets/store/screens/`,
//      where the caption is drawn on a scrim over the bottom of the untouched capture
//      so the UI keeps its full resolution instead of being scaled to make room.
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
import os from 'os';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures');
const SHOT_DIR = path.resolve(__dirname, '../docs/assets/screenshots');
const GRAPHIC_DIR = path.resolve(__dirname, '../docs/assets/store');
// Both promo tiles draw the brand mark small — 40px normally, 26px on the compact 440×280
// tile — i.e. under the detailed master's ~48px legibility floor, so they take the small tier.
const ICON_PATH = path.resolve(__dirname, '../docs/assets/icon-mark.png');

// Store-listing screenshots carry a caption: the carousel shows a shot before the buyer has read
// any UI label, so the caption states what the shot proves. Two caption sets exist because the
// Chrome Web Store gives each language page its own empty screenshot slots — they do not inherit.
// Caption text is burned into the image, which makes it store metadata reviewed under the same
// rules as the listing copy: no competitor names, no blanket privacy claims, and only wording the
// shipped interface or listing copy already uses.
const SCREEN_DIR = path.resolve(__dirname, '../docs/assets/store/screens');
const SCREEN_CAPTIONS = [
  {
    shot: 'workbench-empty',
    slug: 'screen-01-workbench',
    en: 'Drop, pick a format, convert on your own machine',
    zh: '拖入、选格式，在你自己电脑上转换',
  },
  {
    shot: 'batch-files',
    slug: 'screen-02-batch',
    en: 'Batch: Markdown, CSV and Excel in one run',
    zh: '批量：Markdown、CSV、Excel 一次转完',
  },
  {
    shot: 'batch-results',
    slug: 'screen-03-zip',
    en: 'One mixed batch, one ZIP download',
    zh: '一次混合批量，一个 ZIP 下载',
  },
  {
    shot: 'preview-edit',
    slug: 'screen-04-preview',
    en: 'Preview side by side, edit before you download',
    zh: '左右对照预览，下载前直接改',
  },
  {
    shot: 'history',
    slug: 'screen-05-history',
    en: 'Searchable, filterable history with one-click reuse',
    zh: '历史可搜索、可筛选、一键复用格式',
  },
  {
    shot: 'dark-mode',
    slug: 'screen-06-dark-mode',
    en: '6 accent colours, light / dark / system',
    zh: '6 种主题色，浅色 / 深色 / 跟随系统',
  },
];

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

/** Path relative to docs/ for committed files; the bare name for temp-dir intermediates. */
function shotLabel(outDir, file) {
  const rel = path.relative(path.resolve(__dirname, '../docs'), path.join(outDir, file));
  return rel.startsWith('..') ? file : rel;
}

/** Scroll an element to the vertical centre, then shoot the viewport (never fullPage). */
async function shootCentered(page, selector, outDir, file) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, selector);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, file) });
  console.log(`  ✓ ${shotLabel(outDir, file)}`);
}

/**
 * Capture the six UI states in one interface locale.
 *
 * The same run happens per locale: Chrome Web Store screenshot slots are per-language, and the
 * Chinese page must show a Chinese workbench rather than the English one.
 */
async function captureScreens(locale, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-first-run', '--no-default-browser-check', '--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewportSize(SHOT_VIEWPORT);

  const prefs = { 'fat:locale': locale, 'fat:theme': 'blue', 'fat:colorMode': 'light' };
  await page.addInitScript(mockStorageScript(prefs));
  await page.goto(`http://localhost:${PORT}/options.html`);
  await page.waitForSelector('.drop-zone', { timeout: 20000 });
  await page.waitForTimeout(900);

  // Evidence for the listing copy: the footer publishes the registry's own counts.
  const footer = await page.$eval('.footer', el => (el.textContent || '').trim()).catch(() => '');
  console.log(`  · [${locale}] workbench footer reports: "${footer}"`);

  await page.screenshot({ path: path.join(outDir, 'workbench-empty.png') });
  console.log(`  ✓ ${shotLabel(outDir, 'workbench-empty.png')}`);

  // Mixed-source batch: three formats, one reachable target, which is the product's
  // headline capability and therefore the hero shot.
  await stageConversion(page, ['sample.md', 'sample.csv', 'sample.xlsx'], 'HTML (.html)');
  await shootCentered(page, '.file-item', outDir, 'batch-files.png');
  await runConversion(page);
  await shootCentered(page, '.result-download', outDir, 'batch-results.png');

  // Single-file runs: the split source/result preview only appears for one file,
  // and each run leaves a real record behind for the history shot.
  await resetWorkbench(page);
  await convert(page, ['sample.md'], 'HTML (.html)');
  await shootCentered(page, '.comparison-view', outDir, 'preview-edit.png');

  await resetWorkbench(page);
  await convert(page, ['sample.csv'], 'Excel (.xlsx)');
  await resetWorkbench(page);
  await convert(page, ['sample.docx'], 'Markdown (.md)');
  // Clear the batch first: with results gone the comparison card unmounts, so the
  // history card moves just below the upload zone and fills the frame on its own.
  await resetWorkbench(page);
  await shootCentered(page, '.history-panel', outDir, 'history.png');

  // Dark mode through the app's own startup path (seeded preference), not a click.
  const dark = await browser.newPage();
  await dark.setViewportSize(SHOT_VIEWPORT);
  await dark.addInitScript(mockStorageScript({ ...prefs, 'fat:colorMode': 'dark' }));
  await dark.goto(`http://localhost:${PORT}/options.html`);
  await dark.waitForSelector('.drop-zone', { timeout: 20000 });
  await dark.waitForTimeout(800);
  await dark.screenshot({ path: path.join(outDir, 'dark-mode.png') });
  console.log(`  ✓ ${shotLabel(outDir, 'dark-mode.png')}`);
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
      <div class="brand"><img src="${icon}" alt="" /><span>Transfer Any File</span></div>
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
      <img src="${shot}" alt="Transfer Any File workbench" />
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

/**
 * Build one captioned store screenshot as plain HTML, rendered at the store's exact pixel size.
 *
 * The caption sits on a gradient scrim over the untouched screenshot instead of in a header band
 * above a cropped or scaled one: the store renders these tiles small, so scaling the UI down to
 * free up room for a band would push the interface's 12px text below legibility, and cropping
 * would eat into the very panel some shots exist to prove.
 */
function screenDocument({ shot, caption, icon }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1280px; height: 800px; overflow: hidden; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #0b1020;
      }
      .shot {
        position: absolute;
        top: 0;
        left: 0;
        width: 1280px;
        height: 800px;
        object-fit: cover;
        object-position: top center;
      }
      .scrim {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        gap: 15px;
        padding: 0 56px 46px;
        background: linear-gradient(
          to top,
          rgba(7, 13, 26, 1) 0%,
          rgba(7, 13, 26, 1) 72%,
          rgba(7, 13, 26, 0.6) 88%,
          rgba(7, 13, 26, 0) 100%
        );
      }
      .brand { display: flex; align-items: center; gap: 11px; }
      .brand img { display: block; width: 30px; height: 30px; }
      .brand span { font-size: 15px; font-weight: 700; letter-spacing: 0.2px; color: #dbe6fb; }
      .caption { font-size: 31px; font-weight: 800; line-height: 1.2; letter-spacing: -0.4px; color: #fff; }
    </style>
  </head>
  <body>
    <img class="shot" src="${shot}" alt="" />
    <div class="scrim">
      <div class="brand"><img src="${icon}" alt="" /><span>Transfer Any File</span></div>
      <div class="caption">${caption}</div>
    </div>
  </body>
</html>`;
}

/**
 * Composite the captioned listing screenshots for every locale.
 *
 * `rawByLocale` maps a locale to the directory holding that locale's un-captioned captures, so
 * the Chinese set is built from Chinese UI rather than a re-captioned English one.
 */
async function captureStoreScreens(rawByLocale) {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  const icon = dataUri(ICON_PATH);
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox'],
  });

  for (const [locale, rawDir] of Object.entries(rawByLocale)) {
    for (const spec of SCREEN_CAPTIONS) {
      const shot = dataUri(path.join(rawDir, `${spec.shot}.png`));
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.setContent(screenDocument({ shot, caption: spec[locale], icon }), { waitUntil: 'load' });
      await page.waitForTimeout(200);
      const name = locale === 'en' ? `${spec.slug}.png` : `${spec.slug}-${locale}.png`;
      await page.screenshot({ path: path.join(SCREEN_DIR, name) });
      console.log(`  ✓ store/screens/${name}`);
      await page.close();
    }
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
    console.log('▸ UI screenshots at 1280×800 — English (README, product page, English store tab)');
    await captureScreens('en', SHOT_DIR);
    // The Chinese raw captures are intermediates only: the Chinese store tab shows a Chinese
    // workbench, but README.zh-CN.md and the product page reuse the English set, so there is
    // nothing to keep on disk after the captioned versions are composited.
    console.log('▸ UI screenshots at 1280×800 — Chinese (store tab only)');
    const zhRaw = fs.mkdtempSync(path.join(os.tmpdir(), 'fat-store-zh-'));
    await captureScreens('zh', zhRaw);
    console.log('▸ Captioned store screenshots');
    await captureStoreScreens({ en: SHOT_DIR, zh: zhRaw });
    fs.rmSync(zhRaw, { recursive: true, force: true });
  }
  if (ONLY === 'all' || ONLY === 'graphics') {
    console.log('▸ Promo graphics');
    await captureGraphics();
  }
  console.log('\n✓ Done. Raw captures in docs/assets/screenshots, captioned listing shots in');
  console.log('  docs/assets/store/screens, promo tiles in docs/assets/store.\n');
}

await run();
