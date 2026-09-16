/**
 * Records the workbench running one mixed batch and renders the README demo GIFs.
 *
 * The recording is driven through the same built bundle the store screenshots use — a static server
 * over `.output/chrome-mv3` plus a `chrome.storage` stub — so what ends up in the GIF is the real UI
 * doing real conversions over `fixtures/`, never a mock-up. Playwright records the page to WebM and
 * `ffmpeg` turns that into a palette-optimised GIF.
 *
 * Usage: pnpm build && node scripts/render-demo-gif.mjs
 * Env:   DEMO_LOCALES="zh en"  which UI languages to record (one GIF each)
 *        DEMO_FPS=12           GIF frame rate; the WebM is always ~25 fps
 *        DEMO_WIDTH=960        GIF width in CSS pixels; height follows the 16:10 viewport
 *        DEMO_PORT=9879        static server port (kept off the e2e and capture scripts' ports)
 *
 * Output: docs/assets/demo/demo-<locale>.gif — repository documentation only, never bundled.
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXTENSION_PATH = path.join(ROOT, '.output/chrome-mv3');
const FIXTURE_PATH = path.join(ROOT, 'fixtures');
const OUT_DIR = path.join(ROOT, 'docs/assets/demo');

const LOCALES = (process.env.DEMO_LOCALES || 'zh en').split(/\s+/).filter(Boolean);
const FPS = Number(process.env.DEMO_FPS || 12);
const WIDTH = Number(process.env.DEMO_WIDTH || 960);
const PORT = Number(process.env.DEMO_PORT || 9879);
const VIEWPORT = { width: 1280, height: 800 };

/** The one batch the demo shows: three different source families, one target, one ZIP. */
const BATCH = ['sample.md', 'sample.csv', 'sample.xlsx'];
const TARGET = 'HTML';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(EXTENSION_PATH, urlPath === '/' ? '/options.html' : urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

/**
 * `chrome.storage.local` stub, seeded with the UI language.
 *
 * The mock starts empty on every navigation, so the locale has to be written before the app boots —
 * otherwise the workbench renders in whatever language the recording machine claims.
 */
function mockStorageScript(locale) {
  const initial = JSON.stringify({ 'fat:locale': locale });
  return `(() => {
  const storage = ${initial};
  window.chrome = window.chrome || {};
  window.chrome.runtime = window.chrome.runtime || { id: 'demo' };
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
})();`;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Run the demo flow once, slowly enough for a still image to be readable at GIF frame rates.
 *
 * Every hold is measured against how long the frame is on screen at `FPS`, not against the eye:
 * a beat shorter than ~1 s disappears entirely once the GIF is scaled down.
 */
async function recordFlow(context, locale) {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.addInitScript(mockStorageScript(locale));
  await page.goto(`http://127.0.0.1:${PORT}/options.html`, { waitUntil: 'load' });
  await page.waitForSelector('.drop-zone', { timeout: 20000 });
  await wait(1400);

  await page.setInputFiles(
    'input[type="file"]',
    BATCH.map(f => path.join(FIXTURE_PATH, f)),
  );
  await page.waitForSelector('.file-item', { timeout: 10000 });
  await wait(1600);

  await page.click('.action-row .el-select');
  await page.waitForSelector('.el-select-dropdown__item:visible', { timeout: 10000 });
  await wait(1100);
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: TARGET }).first().click();
  await wait(1000);

  await page.click('.convert-btn');
  await page.waitForFunction(
    () => {
      const alert = document.querySelector('.el-alert__title');
      return alert && alert.textContent.length > 0;
    },
    { timeout: 30000 },
  );
  await wait(1800);

  // Preview the first result: a text result opening in the comparison view is the beat that says
  // "this is a workbench, not a download link".
  await page.locator('.result-item').first().locator('button').first().click();
  await page.waitForSelector('.comparison-view, .preview-dialog', { timeout: 10000 }).catch(() => null);
  await wait(2600);
  await page.keyboard.press('Escape');
  await wait(700);

  await page
    .locator('.download-actions')
    .scrollIntoViewIfNeeded()
    .catch(() => null);
  await page
    .locator('.download-actions .el-button')
    .first()
    .hover()
    .catch(() => null);
  await wait(1800);

  const video = page.video();
  await page.close();
  return video ? video.path() : null;
}

/** WebM → palette-optimised GIF. `stats_mode=diff` keeps the palette on the pixels that change. */
function toGif(webm, out, hold) {
  const filter = [
    `fps=${FPS}`,
    `scale=${WIDTH}:-2:flags=lanczos`,
    'split[a][b]',
    '[a]palettegen=stats_mode=diff:max_colors=128[p]',
    '[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
  ].join(',');
  const args = ['-y', '-ss', '0.3', '-t', String(hold), '-i', webm, '-vf', filter, out];
  const result = spawnSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  if (result.status !== 0)
    throw new Error(`ffmpeg failed for ${path.basename(out)}:\n${result.stderr?.toString().slice(-800)}`);
}

async function run() {
  if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
    console.error('✗ Extension not built. Run "pnpm build" first.');
    process.exit(1);
  }
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    console.error('✗ ffmpeg not found on PATH — it converts the recording into a GIF.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-demo-'));
  const server = await startServer();
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-first-run', '--no-default-browser-check', '--no-sandbox'],
  });

  try {
    for (const locale of LOCALES) {
      const dir = path.join(tmp, locale);
      fs.mkdirSync(dir, { recursive: true });
      const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir, size: VIEWPORT } });
      const webm = await recordFlow(context, locale);
      await context.close();
      if (!webm) throw new Error(`no video recorded for ${locale}`);

      const out = path.join(OUT_DIR, `demo-${locale}.gif`);
      const seconds = Math.round(fs.statSync(webm).size / 1024 / 1024);
      toGif(webm, out, 22);
      const kb = Math.round(fs.statSync(out).size / 1024);
      console.log(`✓ demo-${locale}.gif — ${WIDTH}px, ${FPS} fps, ${kb} KB (webm ${seconds} MB)`);
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
