import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const SCREENSHOT_DIR = path.resolve(__dirname, '../.test-screenshots');
const PORT = 9877;

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

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
  const seed = (window.__seededHistory) || null;
  const storage = {};
  if (seed) storage['fat:history'] = seed;
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

const SEED = `() => {
  const now = Date.now();
  const sizes = [12000, 45000, 8200, 156000, 34000, 67000, 21000, 99000, 5500, 41000, 78000, 12500];
  const records = sizes.map((s, i) => ({
    id: 'r' + i,
    time: now - i * 3600_000,
    fileName: 'doc' + (i + 1) + '.md',
    sourceFormat: 'MD',
    targetFormat: i % 2 === 0 ? 'HTML' : 'JSON',
    fileSize: s * 2,
    resultSize: s,
    fileCount: 1,
  }));
  window.__seededHistory = records;
}`;

(async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: '/Users/liaolongdong/Library/Caches/ms-playwright/chromium-1117/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript({ content: SEED });
    await page.addInitScript(MOCK_CHROME_STORAGE);
    await page.goto(`http://localhost:${PORT}/options.html`);
    await page.waitForSelector('.app-root, #app, .workbench, .history-panel, body', { timeout: 10000 });
    await page.waitForTimeout(800);

    const trendPath = path.join(SCREENSHOT_DIR, 'f1-history-trend.png');
    await page.screenshot({ path: trendPath, fullPage: true });
    console.log('Trend shot:', trendPath);

    const filterInput = await page.$('.history-search input');
    if (filterInput) {
      await filterInput.fill('doc3');
      await page.waitForTimeout(200);
      const f3path = path.join(SCREENSHOT_DIR, 'f3-history-search.png');
      await page.screenshot({ path: f3path, fullPage: true });
      console.log('Filter shot:', f3path);

      await filterInput.fill('does-not-exist');
      await page.waitForTimeout(200);
      const f3emp = path.join(SCREENSHOT_DIR, 'f3-history-no-match.png');
      await page.screenshot({ path: f3emp, fullPage: true });
      console.log('Empty shot:', f3emp);
    } else {
      console.log('Filter input not found — history panel may not have rendered records');
      const html = await page.content();
      console.log('Page snippet:', html.slice(0, 500));
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
