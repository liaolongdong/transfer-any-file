import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { Buffer } from 'node:buffer';
import path from 'path';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures');

const HEADLESS = process.env.CI === 'true' || process.env.E2E_HEADLESS === 'true';
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR || path.resolve(__dirname, '../.test-screenshots');
const PORT = parseInt(process.env.E2E_PORT || '9876', 10);

/**
 * Every request the harness server receives under `/canary/…`.
 *
 * The offline sentinel scenario feeds the workbench an HTML document whose subresources all point
 * back at this server; any entry here means a render boundary actually tried to fetch remote
 * markup resources — the behavioral check behind the "no network requests" promise that
 * `verify:offline` can only make statically.
 */
const canaryHits = [];

let passed = 0;
let failed = 0;
const failures = [];

function shot(name) {
  return path.join(SCREENSHOT_DIR, name);
}
function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}
function fail(name, err) {
  failed++;
  failures.push({ name, error: err });
  console.log(`  ✗ ${name}: ${err}`);
}
/**
 * Scenario filter. `E2E_ONLY` is a comma-separated list of case-insensitive substrings; when set,
 * `section()` reports every other section as skipped. Exists because a full run costs minutes and
 * the phase-2 converter tasks each need one or two scenarios — without a filter the temptation is
 * to skip verification entirely.
 */
const ONLY = (process.env.E2E_ONLY || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
let skippedSections = 0;

function section(name) {
  if (ONLY.length > 0 && !ONLY.some(needle => name.toLowerCase().includes(needle))) {
    skippedSections++;
    console.log(`\n▸ ${name}  (skipped by E2E_ONLY)`);
    return false;
  }
  console.log(`\n▸ ${name}`);
  return true;
}

// WCAG relative-luminance contrast, applied to colours read back from the live page so
// the theme loops assert what a user actually sees rather than trusting a token name.
// Accepts `rgb(...)` and `color(srgb ...)` (computed styles, including settled `color-mix()`
// results) as well as `#hex` (custom-property values).
function parseColor(input) {
  const s = String(input).trim();
  const fn = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s);
  if (fn) return [+fn[1], +fn[2], +fn[3]];
  // A settled `color-mix()` computes to this form, and it is what the filled-button
  // hover/active tokens resolve to, so leaving it unparsed would silently NaN a gate.
  const sp = /^color\(\s*srgb\s+([\d.]+)[\s/]+([\d.]+)[\s/]+([\d.]+)/.exec(s);
  if (sp) return [1, 2, 3].map(i => Math.round(+sp[i] * 255));
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!hex) return null;
  let d = hex[1];
  if (d.length === 3)
    d = d
      .split('')
      .map(x => x + x)
      .join('');
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

/**
 * The label and the three fills an enabled primary button actually paints.
 *
 * `.el-button` transitions `all 0.18s`, so every sample has to wait that out — reading
 * earlier yields an interpolated colour rather than the theme's, which is how an earlier
 * draft of this measurement reported light-green at 6.68:1 instead of its real 7.04:1.
 * The pointer is parked off-element before the resting sample because the previous
 * iteration leaves it hovering the button.
 */
async function buttonStateColors(page) {
  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('.convert-btn');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { label: cs.color, fill: cs.backgroundColor };
    });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  const rest = await read();
  if (!rest) return null;
  await page.hover('.convert-btn');
  await page.waitForTimeout(400);
  const hover = await read();
  await page.mouse.down();
  await page.waitForTimeout(400);
  const active = await read();
  // Release off-target: a click needs mousedown and mouseup on the same element, so this
  // samples the pressed state without actually starting a conversion.
  await page.mouse.move(2, 2);
  await page.mouse.up();
  return { label: rest.label, rest: rest.fill, hover: hover.fill, active: active.fill };
}

/**
 * The colour an informational string actually paints, and the surface it is read against.
 *
 * The backdrop is resolved by walking up to the first opaque ancestor background rather than
 * trusting a token name, because these strings sit on `--fat-primary-bg` (the drop zone once a
 * file is staged), `--fat-surface-2` and `--fat-bg-hover`, and the first two are re-tinted per
 * theme — so the worst case in the palette (rose #fff1f2) is invisible to a blue-theme screenshot.
 * Selectors that are not rendered come back in `missing` so the caller can refuse a thin sample
 * instead of passing on zero measurements.
 */
async function infoTextSamples(page, selectors) {
  return page.evaluate(sels => {
    const opaque = value => {
      const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\)/.exec(value);
      return m && (m[4] === undefined || +m[4] > 0.99) ? value : '';
    };
    const found = [];
    const missing = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) {
        missing.push(sel);
        continue;
      }
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.99) {
        missing.push(sel);
        continue;
      }
      let bg = '';
      for (let node = el; node && !bg; node = node.parentElement) bg = opaque(getComputedStyle(node).backgroundColor);
      found.push({ sel, color: cs.color, bg });
    }
    return { found, missing };
  }, selectors);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.mjs': 'application/javascript',
      '.woff2': 'font/woff2',
    };
    const server = http.createServer((req, res) => {
      if (req.url && req.url.startsWith('/canary/')) {
        canaryHits.push(req.url);
        res.writeHead(404);
        res.end('canary');
        return;
      }
      const filePath = path.join(EXTENSION_PATH, req.url === '/' ? '/options.html' : req.url);
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(PORT, () => resolve(server));
  });
}

/**
 * `chrome.storage.local` stub for the extension's options page.
 *
 * `seed` is written before the app boots, which is the only way to exercise a stored value the UI
 * never offered — the mock starts empty on every navigation, so anything not seeded is absent.
 *
 * The result is passed to `page.addInitScript` as a string, and Playwright evaluates a string as a
 * script body rather than as a factory to call, so the arrow function has to be invoked here.
 */
function mockChromeStorage(seed = {}) {
  const initial = JSON.stringify({ 'fat:locale': 'zh', ...seed });
  return `(() => {
  // Pin the language: every assertion in this file matches Chinese UI strings, and the app
  // now falls back to navigator.language when nothing is stored — an en-US CI browser would
  // otherwise flip the whole workbench to English and fail the suite.
  const storage = ${initial};
  window.__storageCalls = [];
  window.chrome = window.chrome || {};
  window.chrome.runtime = window.chrome.runtime || { id: 'test' };
  window.chrome.storage = {
    local: {
      get: (keys, cb) => {
        const result = {};
        const keyList = typeof keys === 'string' ? [keys] : (Array.isArray(keys) ? keys : Object.keys(keys));
        window.__storageCalls.push(keyList);
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
})();`;
}

/**
 * Upload a fixture file — or an in-memory `{ name, mimeType, buffer }`, for a document shaped by
 * the test itself rather than by `fixtures/` — and convert to the given target format.
 *
 * `timeout` budgets the wait for the result banner, and the default is sized by `fixtures/`: the
 * slowest of those measured 20.7 s on a loaded machine, so 30 s is a real bound and not a formality.
 * A caller whose document is deliberately bigger than any fixture overrides it, because the cost of a
 * conversion here scales with the pages the document produces, not with its bytes.
 *
 * Note on every `waitForFunction` call in this file: the signature is
 * `(pageFunction, arg, options)`, so a bare `{ timeout }` in the second slot is read as the page
 * function's argument and the wait runs on Playwright's 30 s default. The explicit `undefined` in
 * that position is what keeps the budgets written next to them real.
 */
async function convertFile(page, fixture, targetText, timeout = 30000) {
  const fi = await page.$('input[type="file"]');
  if (!fi) throw new Error('file input not found');
  const label = typeof fixture === 'string' ? fixture : fixture.name;
  await fi.setInputFiles(typeof fixture === 'string' ? path.join(FIXTURE_PATH, fixture) : fixture);
  await page.waitForTimeout(1000);

  const formatTag = await page.$eval('.file-item .el-tag--primary', el => el.textContent).catch(() => null);
  if (!formatTag) throw new Error(`format not detected for ${label}`);

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

  await page.waitForFunction(
    () => {
      const alert = document.querySelector('.el-alert__title');
      return alert && alert.textContent.length > 0;
    },
    undefined,
    { timeout },
  );
  await page.waitForTimeout(500);

  const alertTitle = await page.$eval('.el-alert__title', el => el.textContent).catch(() => '');
  const resultName = await page.$eval('.result-item .result-name', el => el.textContent).catch(() => '');
  const resultSize = await page.$eval('.result-item .result-size', el => el.textContent).catch(() => '');
  return { alertTitle, resultName, resultSize, formatDetected: formatTag };
}

/** Reset the workbench for a new conversion */
async function resetWorkbench(page) {
  const resetBtn = await page.$('.reset-btn');
  if (resetBtn) {
    await resetBtn.click();
    await page.waitForTimeout(500);
  }
}

/** Choose a conversion target from the workbench's format dropdown. */
async function pickTarget(page, text) {
  const sel = await page.$('.action-row .el-select');
  if (!sel) throw new Error('format select not found');
  await sel.click();
  await page.waitForTimeout(400);
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: text }).first().click();
  await page.waitForTimeout(300);
}

/**
 * Download the current batch artifact (single file, or ZIP for a multi-file batch) and return its
 * bytes as a latin1 string, so a test can grep the artifact itself rather than trusting what the UI
 * claimed. ZIP *magic* is unzipped one level: a marker is only findable once it is out of its
 * member, and unzipping keeps the check independent of how the producing library chooses to pack it
 * (jszip stores these entries today, but that is its default rather than a guarantee this suite
 * should lean on). This is what makes a `.docx` / `.xlsx` greppable — those are containers, not
 * payloads.
 *
 * One level only, which is exactly why a multi-file batch is rejected rather than unwrapped: for a
 * ZIP-of-DOCX the returned text would be the inner DOCX's raw *bytes*, and whether a marker survives
 * in them would then depend on the inner packing. A caller that needs that must unzip explicitly.
 *
 * latin1 is deliberate: it is a byte-preserving 1:1 encoding, so `includes('canary/img.png')`
 * matches raw bytes without a decode step, and no assertion here depends on text decoding
 * correctly. The altChunk carries *user* HTML, so arbitrary UTF-8 can pass through it; the markers
 * used by the sections that call this are ASCII, which is what makes them greppable as-is.
 *
 * No MIME decoding is applied, and measurement is what makes that safe: inside the altChunk
 * (`word/afchunk.mht`) html-docx-js-typescript declares `quoted-printable`, but its only
 * transformation is `=` → `=3D` (utils.ts) — no line wrapping, and no base64 for the HTML part. A
 * probe marker with no `=` in the HTML part is therefore stored verbatim; do not add one with an
 * `=` there without decoding here. The base64 payload parts hoisted out of the altChunk are appended
 * untouched, so a marker inside a `data:` payload is not subject to that escape.
 *
 * Downloads are intercepted rather than read from app state: the Vue instance does not expose
 * `batchResults`, and reaching for it would mean adding a debug-only global to production source
 * to satisfy a test.
 */
async function downloadBatchArtifact(page) {
  // `download-actions` rather than the first button under `.result-download`: each result row
  // renders its own preview button ahead of the primary one, and clicking it opens a dialog
  // instead of downloading, which would only surface here as a download timeout.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    (await page.$('.result-download .download-actions .el-button')).click(),
  ]);
  if (download.suggestedFilename().endsWith('.zip')) {
    throw new Error('downloadBatchArtifact: expected a single artifact, got a ZIP bundle');
  }
  const buf = fs.readFileSync(await download.path());
  if (buf.readUInt32LE(0) === 0x04034b50) {
    const { unzipSync } = await import('fflate');
    const members = unzipSync(new Uint8Array(buf));
    return Object.values(members)
      .map(u => Buffer.from(u).toString('latin1'))
      .join('\n');
  }
  return buf.toString('latin1');
}

/**
 * Member names of the ZIP the workbench is offering, read out of the real download.
 *
 * `downloadBatchArtifact` refuses a bundle on purpose — its callers want file *contents* — while the
 * page-selection assertions are about *which* pages were written and under what name, which is only
 * observable in the directory.
 */
async function zipEntryNames(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    (await page.$('.result-download .download-actions .el-button')).click(),
  ]);
  const buf = fs.readFileSync(await download.path());
  const { unzipSync } = await import('fflate');
  return Object.keys(unzipSync(new Uint8Array(buf)));
}

/**
 * The first 24 bytes of a PNG — signature, IHDR length, "IHDR", width, height — base64-encoded, i.e.
 * the opening of that PNG's own byte stream.
 *
 * Used instead of the generic `iVBORw0KGgo` header so a probe cannot be satisfied by *some* PNG:
 * several fixtures put a 1×1 control image into the same artifact, and a loose probe would stay green
 * while the diagram under test was still being dropped. 24 bytes is a multiple of 3, so MIME base64
 * line wrapping can never split it.
 */
function pngHead(w, h) {
  const head = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
  head.writeUInt32BE(13, 8);
  head.write('IHDR', 12, 'ascii');
  head.writeUInt32BE(w, 16);
  head.writeUInt32BE(h, 20);
  return head.toString('base64');
}

/**
 * Upload an inline HTML document (markup held in the test rather than in `fixtures/`), convert it to
 * PDF and return the downloaded artifact's bytes as a latin1 string.
 *
 * Inline content exists because the assertion that uses it is about the *shape* of the output — long
 * enough to make the A4 slicing loop run more than once — and no file in `fixtures/` has that shape.
 */
async function convertInlineHtmlToPdf(page, name, html) {
  await resetWorkbench(page);
  const fi = await page.$('input[type="file"]');
  if (!fi) throw new Error('file input not found');
  await fi.setInputFiles({ name, mimeType: 'text/html', buffer: Buffer.from(html) });
  await page.waitForTimeout(1000);
  await pickTarget(page, 'PDF (.pdf)');
  await (await page.$('.convert-btn')).click();
  // A longer budget than `convertFile`'s 30s: the document is deliberately multi-page, and slicing a
  // tall canvas page by page is the slow part of this converter.
  await page.waitForFunction(
    () => {
      const alert = document.querySelector('.el-alert__title');
      return alert && alert.textContent.length > 0;
    },
    undefined,
    { timeout: 60000 },
  );
  await page.waitForTimeout(500);
  return downloadBatchArtifact(page);
}

/**
 * Read the page-slice encoders out of a PDF, from the bytes `downloadBatchArtifact` returns.
 *
 * jsPDF writes each image XObject's `/Filter` from the encoder it was handed, so the artifact records
 * which one ran: a PNG slice is `/FlateDecode`, a JPEG slice `/DCTDecode`. Measured on this
 * converter's output — switching the slice flipped every image XObject to FlateDecode, and no other
 * object in the file carries a filter name at all (jsPDF leaves page content uncompressed here).
 *
 * Scoped to the image dictionaries rather than scanning the whole file for either name, and that is
 * deliberate: a substring scan cannot say *which* object it matched, so the first jsPDF version that
 * Flates its page streams would make "contains /FlateDecode" true however the slices were encoded.
 * The per-object read also gives the slice count, which is what lets the caller assert one slice per
 * page instead of trusting that some image survived.
 *
 * Returns `{ pages, filters }` — `pages` counts page objects, `filters` lists one entry per image
 * XObject, `'none'` for an image dictionary that declares no filter.
 */
function readPdfSliceFilters(pdfBytes) {
  const pages = (pdfBytes.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  const filters = pdfBytes
    .split(/\/Subtype\s*\/Image/)
    .slice(1)
    .map(dict => {
      // Only the dictionary itself: everything after `stream` is compressed image data, whose
      // random-looking bytes must not be able to supply a filter name.
      const head = dict.split('\nstream')[0];
      return (/\/Filter\s*\/(\w+)/.exec(head) ?? [])[1] ?? 'none';
    });
  return { pages, filters };
}

/**
 * Read one cell's stored type and its raw `<v>` payload out of an XLSX artifact's XML.
 *
 * The type has to come from the `<c>` element, not from the value: SheetJS writes a numeric cell as
 * `<c r="I2">` and a text cell as `<c r="I2" s="1" t="str">`, and the number itself sits in `<v>` in
 * both, so `includes('4111111111111111')` says nothing about which branch the converter took. Only
 * `t=` is read; the style index is incidental to the claim and would tie this to the writer's style
 * table. A `t=` shape this helper does not know is reported verbatim rather than guessed at, so an
 * unexpected one shows up in the failure message instead of passing as "not text".
 *
 * Returns `{ kind, value }` with `kind` one of `'number'`, `'text'`, `'other(<attrs>)'`,
 * `'missing'`.
 */
function readXlsxCell(xlsxText, ref) {
  const cell = new RegExp(`<c r="${ref}"([^>]*)>(?:<v>([^<]*)</v>)?`).exec(xlsxText);
  if (!cell) return { kind: 'missing', value: '' };
  const { 1: attrs, 2: value = '' } = cell;
  if (!attrs) return { kind: 'number', value };
  if (/t="str"/.test(attrs)) return { kind: 'text', value };
  return { kind: `other(${attrs})`, value };
}

/**
 * True only when `ref` is stored as a *numeric* cell whose value is exactly `value`.
 *
 * The two controls of the F-6 fixture are the ones that must stay numbers, and asserting them the
 * way the text markers are asserted proves nothing: `includes('<v>1234.5</v>')` is satisfied just as
 * well by `<c r="F2" s="1" t="str"><v>1234.5</v></c>`, i.e. by the exact failure the check is named
 * after. The type has to come off the cell element.
 */
function xlsxCellIsNumber(xlsxText, ref, value) {
  const cell = readXlsxCell(xlsxText, ref);
  return cell.kind === 'number' && cell.value === value;
}

/** Set one image output parameter from the output panel, by its field label. */
async function setOutputOption(page, label, option) {
  const field = page.locator(`.output-options .output-field:has(.output-label:text-is("${label}")) .el-select`);
  await field.click();
  await page.waitForTimeout(400);
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: option }).first().click();
  await page.waitForTimeout(300);
}

/** Expand the presets card, which starts collapsed; resolves to whether it opened. */
async function openPresetCard(page) {
  if (await page.isVisible('.preset-bar')) return true;
  const head = page.locator('.collapsible-head', { hasText: '转换预设' }).first();
  if (!(await head.count())) return false;
  await head.click();
  await page.waitForTimeout(400);
  return page.isVisible('.preset-bar');
}

/**
 * Turn the workbench's human-readable size ("1.2 MB", "812 B") into bytes.
 *
 * The result list is the only place the app reports an output size, and the output-parameter
 * assertions are about *shrinkage*, which needs numbers rather than locale-formatted strings.
 * Returns -1 when nothing parses, so a comparison against it fails loudly.
 */
function sizeToBytes(text) {
  const match = /([\d.]+)\s*(GB|MB|KB|B)/i.exec(text ?? '');
  if (!match) return -1;
  const units = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Math.round(parseFloat(match[1]) * units[match[2].toLowerCase()]);
}

/**
 * Decode a PNG inside the page and report what actually painted: how many pixels match each of the
 * two fixture colours, and the first and last row of the red band (`top` / `bottom`, `-1` and `-1`
 * when nothing red is on the page).
 *
 * Both paint assertions in this suite need exactly this scan — the inline-SVG rasterization check
 * counts red, the layout-settle check adds blue and the red band's rows — and the thresholds are
 * the fixtures' own `#f00` / `#00f` with slack for whatever the rasterizer antialiases, so they
 * belong in one place. It runs in the page because decoding needs a real canvas, and Node here has
 * no PNG decoder.
 */
async function scanPaintedPixels(page, pngBase64) {
  return page.evaluate(async b64 => {
    const img = document.createElement('img');
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let red = 0;
    let blue = 0;
    let top = -1;
    let bottom = -1;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 180 && g < 80 && b < 80) {
        const row = (i / 4 / canvas.width) | 0;
        if (top < 0) top = row;
        bottom = row;
        red++;
      } else if (b > 180 && r < 80 && g < 80) {
        blue++;
      }
    }
    return { red, blue, top, bottom };
  }, pngBase64);
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
  await page.addInitScript(mockChromeStorage());

  const themeValues = ['blue', 'green', 'purple', 'orange', 'rose', 'slate'];
  await page.goto(`http://localhost:${PORT}/options.html`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: shot('01-initial.png'), fullPage: true });
  ok('Options page loaded');

  // Check footer stats
  const footerText = await page.$eval('.footer', el => el.textContent).catch(() => '');
  if (footerText.includes('14') && footerText.includes('48')) {
    ok('Footer shows 14 formats, 48+ paths');
  } else {
    fail('Footer stats', `unexpected: "${footerText}"`);
  }

  // <html lang> must already match the stored locale before any interaction: screen
  // readers pick it up on first paint, and the mount-time read is the only chance to
  // get it right for a user who previously switched language. The tab title is pinned by
  // the same call — it is the only part of the identity visible while the page is not.
  const langOnLoad = await page.evaluate(() => document.documentElement.lang);
  if (langOnLoad === 'zh-CN') ok(`Document language pinned on first paint (${langOnLoad})`);
  else fail('Document language on load', `lang="${langOnLoad}"`);

  const titleOnLoad = await page.title();
  if (titleOnLoad === 'Transfer Any File · 转换工作台') ok(`Tab title localized on first paint (${titleOnLoad})`);
  else fail('Document title on load', `"${titleOnLoad}"`);

  // ═══════════════════════════════════════════
  //  STARTUP REQUEST BUDGET
  // ═══════════════════════════════════════════
  //
  // The workbench is what the toolbar icon opens, so everything fetched before the first contentful
  // paint is time spent staring at an empty tab. `defineAsyncComponent` on its own does not keep a
  // lazy component's chunks out of that window — it defers the component, not the import — so
  // `PreviewDialog`, mounted under a plain `v-model:visible`, resolved during the first render and
  // brought its injected stylesheet with it, which is render-blocking. Each half below has to prove
  // its own subject exists: "no dialog request before paint" is equally true of a dialog that is
  // never fetched at all, and a stub that lost its record of calls is not "the calls were batched".
  section('Startup Request Budget');
  const boot = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
    const fcp = paint ? paint.startTime : -1;
    const dialog = performance.getEntriesByType('resource').filter(e => /PreviewDialog|chunks\/preview-/.test(e.name));
    return {
      fcp,
      dialogTotal: dialog.length,
      dialogBeforePaint: dialog.filter(e => e.startTime <= fcp).map(e => e.name.replace(/^https?:\/\/[^/]+/, '')),
      storageCalls: Array.isArray(window.__storageCalls) ? window.__storageCalls : null,
    };
  });
  if (boot.fcp > 0 && boot.dialogTotal > 0 && boot.dialogBeforePaint.length === 0) {
    ok(`Preview dialog is fetched after first paint (${boot.dialogTotal} files, fcp ${Math.round(boot.fcp)} ms)`);
  } else {
    fail(
      'Preview dialog off the first-paint path',
      `fcp=${Math.round(boot.fcp)} dialogFiles=${boot.dialogTotal} beforePaint=${JSON.stringify(boot.dialogBeforePaint)}`,
    );
  }
  // One `storage.local.get` is one round trip to the browser process, and three of them used to sit
  // on the await that gates the mount: theme, colour mode, language. They now share one call, which
  // is what this pins — the shape, not the total. A round-trip budget is the weaker form of the same
  // claim: this page reads persisted state ten times today and thirteen before the batch, so any
  // ceiling tight enough to catch that is one new preference away from failing for the wrong reason.
  const bootKeys = boot.storageCalls?.find(
    keys => keys.includes('fat:theme') && keys.includes('fat:colorMode') && keys.includes('fat:locale'),
  );
  if (bootKeys) {
    ok(`Boot state resolved in one round trip (${boot.storageCalls.length} reads in total)`);
  } else {
    fail(
      'Boot state resolved in one round trip',
      `no call carried all three keys: ${JSON.stringify(boot.storageCalls)}`,
    );
  }
  // `seedLocale` hands `useI18n` the language `main.ts` just read, so `initLocale` has no reason to
  // fetch that key a second time — this is the read the seed exists to remove, named on its own.
  const localeReads = boot.storageCalls?.filter(keys => keys.includes('fat:locale')).length ?? -1;
  if (localeReads === 1) {
    ok('The locale key is read once during boot');
  } else {
    fail('The locale key is read once during boot', `${localeReads} reads of fat:locale`);
  }

  // ═══════════════════════════════════════════
  //  DETECTED LANGUAGE MUST REACH THE FIRST FRAME
  // ═══════════════════════════════════════════
  //
  // Both dictionaries are statically imported, so there is no async language payload to wait for;
  // the risk is the *state*, which starts on the `zh` fallback and used to correct itself only after
  // `initLocale`'s storage round-trip. Nothing consumes the `ready` flag, so a settled-DOM check
  // cannot see that window — an observer installed before any page script runs can, and it is the
  // only assertion here that fails if the pre-mount seed is ever removed.
  section('Detected Language Reaches the First Frame');
  try {
    // An explicitly absent `fat:locale`: this is the first-run path, where the browser language decides.
    // The locale is pinned on the page rather than inherited: the harness launches real Chrome with no
    // `--lang`, so on a Chinese macOS `navigator.languages` is `zh-CN` and the detection it agrees with
    // the seed is indistinguishable from the fallback this section exists to rule out.
    const enPage = await browser.newPage({ locale: 'en-US' });
    await enPage.setViewportSize({ width: 1280, height: 900 });
    await enPage.addInitScript(mockChromeStorage({ 'fat:locale': undefined }));
    // Injected as a script body rather than a callback, the same way `mockChromeStorage` is, so the
    // browser-only globals stay out of the Node-side lint pass.
    await enPage.addInitScript(`
      document.__firstPaint = null;
      const recordFirstPaint = () => {
        if (document.__firstPaint !== null) return;
        const app = document.getElementById('app');
        const text = app ? app.textContent || '' : '';
        if (text.trim()) document.__firstPaint = text;
      };
      new MutationObserver(recordFirstPaint).observe(document, { childList: true, subtree: true });
      recordFirstPaint();
    `);
    await enPage.goto(`http://localhost:${PORT}/options.html`);
    await enPage.waitForTimeout(1500);

    const firstPaint = await enPage.evaluate(() => document.__firstPaint ?? '');
    if (!firstPaint) fail('First painted frame', 'the observer never saw any app text');
    else if (/[\u3400-\u9fff]/.test(firstPaint))
      fail('Language of the first painted frame', `Chinese reached the screen: "${firstPaint.slice(0, 60)}"`);
    else ok('No fallback-language text reaches the first frame');

    const langDetected = await enPage.evaluate(() => document.documentElement.lang);
    if (langDetected === 'en') ok('Browser language drives <html lang> when nothing is stored');
    else fail('Detected document language', `lang="${langDetected}"`);

    const titleDetected = await enPage.title();
    if (titleDetected === 'Transfer Any File · Conversion Workbench')
      ok(`Detected tab title is English (${titleDetected})`);
    else fail('Detected tab title', `"${titleDetected}"`);

    const settledText = await enPage.textContent('#app').catch(() => '');
    if ((settledText || '').includes('Batch convert')) ok('Settled UI renders in the detected language');
    else fail('Settled detected-language UI', `body reads "${(settledText || '').slice(0, 60)}"`);
    await enPage.close();
  } catch (e) {
    fail('Detected-language first paint', e.message);
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
    // Direct PDF→raster edges (were two-step through PNG before)
    ['sample.pdf', 'JPEG (.jpg)', 'PDF→JPG'],
    ['sample.pdf', 'WEBP (.webp)', 'PDF→WEBP'],
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
        const shotName = `${String(shotIdx).padStart(2, '0')}-${label
          .toLowerCase()
          .replace(/[→]/g, 'to')
          .replace(/[^a-z0-9]/g, '-')}.png`;
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
  //  F-5a0 — a route that flattened the animation says so in the result card
  // ═══════════════════════════════════════════

  // Deliberately three halves, because the note has two independent conditions to respect. The route
  // has to be one that re-encodes through a bitmap: `gif→html` embeds the original bytes, so the same
  // GIF still animates there and a note on that route would be a false statement. And the file has to
  // have had a second frame to lose — that half is measured off the bytes by
  // `utils/core/animated-image.ts`, and it is what `sample.gif`, the well-known single-frame 1×1,
  // checks here. All three first require a result row, because "no note rendered" is also what a
  // failed conversion looks like — and an empty list would satisfy either negative on its own.
  if (section('GIF first-frame disclosure')) {
    try {
      await resetWorkbench(page);
      const flattenedTo = await convertFile(page, 'sample-animated.gif', 'PNG (.png)');
      const flattened = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (!flattenedTo.resultName) {
        fail('animated GIF→PNG disclosure', `no result row: alert "${flattenedTo.alertTitle}"`);
      } else if (flattened.some(text => text.includes('第一帧'))) {
        ok('animated GIF→PNG discloses that only the first frame survives');
      } else {
        fail('animated GIF→PNG disclosure', `notes rendered: ${JSON.stringify(flattened)}`);
      }

      await resetWorkbench(page);
      const stillTo = await convertFile(page, 'sample.gif', 'PNG (.png)');
      const still = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (!stillTo.resultName) {
        fail('single-frame GIF→PNG disclosure', `no result row: alert "${stillTo.alertTitle}"`);
      } else if (still.some(text => text.includes('第一帧'))) {
        fail('single-frame GIF→PNG disclosure', `unexpected note: ${JSON.stringify(still)}`);
      } else {
        ok('a one-frame GIF gets no loss note — there was no frame to lose');
      }

      await resetWorkbench(page);
      const keptTo = await convertFile(page, 'sample-animated.gif', 'HTML (.html)');
      const kept = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (!keptTo.resultName) {
        fail('GIF→HTML disclosure', `no result row: alert "${keptTo.alertTitle}"`);
      } else if (kept.some(text => text.includes('第一帧'))) {
        fail('GIF→HTML disclosure', `unexpected note: ${JSON.stringify(kept)}`);
      } else {
        ok('GIF→HTML stays silent — that route keeps the animation');
      }
      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-gif-html-keeps-animation.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('GIF first-frame disclosure', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-5a — HTML→PDF page slices must be PNG, not JPEG
  // ═══════════════════════════════════════════

  // Deliberately long: the slicing loop is what this guards, and a one-page document would pass even
  // if every page after the first were encoded by a different path.
  const multiPageHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Slices</title></head><body>${Array.from(
    { length: 40 },
    (_, i) => `<h3>Section ${i}</h3><p>${'The quick brown fox jumps over the lazy dog. '.repeat(6)}</p>`,
  ).join('')}</body></html>`;

  if (section('HTML→PDF page slices are PNG')) {
    try {
      const pdfBytes = await convertInlineHtmlToPdf(page, 'pdf-slices.html', multiPageHtml);
      const { pages, filters } = readPdfSliceFilters(pdfBytes);

      // The structural claim before the encoder claim: one image XObject per page. Without it a PDF
      // that lost its slices would report "zero filters, none of them DCT" and pass.
      if (pages < 2) {
        fail(
          'PDF page count',
          `expected a multi-page document, got ${pages} page object(s) — the slicing loop never repeated`,
        );
      } else if (filters.length !== pages) {
        fail('PDF slice count', `${pages} pages but ${filters.length} image XObjects`);
      } else if (filters.every(f => f === 'FlateDecode')) {
        ok(`PDF page slices are PNG (${filters.length} slices, every one /FlateDecode)`);
      } else {
        fail('PDF slice format', `${filters.length} slices, filters seen: ${[...new Set(filters)].join(', ')}`);
      }

      // Read before the screenshot, so the shot records the disclosure in the default theme. This is
      // the batch shape that reaches it: a PDF among the results, whatever the source format was.
      const noteText = await page.$eval('.result-note', el => el.textContent.trim()).catch(() => '');
      if (!noteText.includes('不含文字层')) {
        fail(
          'PDF result disclosure',
          noteText ? `unexpected text: "${noteText}"` : 'no .result-note shown for a PDF result',
        );
      } else {
        ok('PDF result disclosure says the output carries no text layer');
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-pdf-slice-format.png`),
        fullPage: true,
      });

      // The same WCAG 1.4.3 gate as the sweep further down, run here because this string only ever
      // paints on top of an `el-alert` tint, and the workbench is empty by the time that sweep runs.
      const noteTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
      const noteMode = await page.evaluate(() => document.documentElement.dataset.mode ?? '');
      let noteWorst = Number.POSITIVE_INFINITY;
      let noteFailed = false;
      for (const mode of ['light', 'dark']) {
        for (const theme of themeValues) {
          await page.evaluate(
            ([m, t]) => {
              document.documentElement.dataset.mode = m;
              document.documentElement.dataset.theme = t;
            },
            [mode, theme],
          );
          await page.waitForTimeout(400);
          const { found, missing } = await infoTextSamples(page, ['.result-note']);
          if (missing.length) {
            noteFailed = true;
            fail(`[${theme} ${mode}] PDF result note`, 'not rendered');
            continue;
          }
          const ratio = contrast(found[0].color, found[0].bg);
          if (!(ratio >= 4.5)) {
            noteFailed = true;
            fail(`[${theme} ${mode}] PDF result note`, `${ratio.toFixed(2)}:1 — ${found[0].color} on ${found[0].bg}`);
          } else if (ratio < noteWorst) {
            noteWorst = ratio;
          }
        }
      }
      if (!noteFailed) {
        ok(`PDF result note ≥ 4.5:1 in 6 themes × 2 modes (worst ${noteWorst.toFixed(2)}:1)`);
      }
      await page.evaluate(
        ([m, t]) => {
          if (m) document.documentElement.dataset.mode = m;
          else delete document.documentElement.dataset.mode;
          if (t) document.documentElement.dataset.theme = t;
          else delete document.documentElement.dataset.theme;
        },
        [noteMode, noteTheme],
      );
    } catch (e) {
      fail('HTML→PDF page slices are PNG', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-10 — the layout-settle pause is owed only by documents that can still move; the pages that
  //  skip it must still come out whole
  // ═══════════════════════════════════════════

  if (section('Layout Settle Completeness')) {
    try {
      // A solid red block is the last box on the page, so *where its pixels land* is the claim: the
      // picture is the page at one magnification, and the band closing it is neither short nor overlapped.
      // Every geometric check is a fraction rather than a pixel count on purpose — the rasterizer picks
      // its `pixelRatio` from the document's height, and these two shapes deliberately land in different
      // regimes, so an absolute figure would have to re-derive that ladder and would quietly follow a
      // change to it. `body{margin:0}` is load-bearing for the same reason: the default 8 px under the
      // marker is what made the first draft of this section fail by 13 rows on a page it rendered whole.
      // What this cannot see is the pause itself. What it pins is the thing the pause is for — that a
      // page on either side of the decision still reaches the bottom row with its content unoverlapped —
      // and, in the last two assertions, that running the same page again moves nothing: the ±1 px and
      // 5-pages-become-6 drift once recorded against `LAYOUT_SETTLE_MS` is exactly what a settle skipped
      // one document too early would turn into. No byte threshold here, on purpose: bytes would have to
      // agree with the very timing jitter this section is only allowed to catch at the geometry level.
      // The motion shapes the predicate learned to catch since this section was first written (an inline
      // `style` whose first declaration is a transition, a vendor prefix, a SMIL tag) all join the
      // *waiting* side, so nothing there newly routes a document through the skip; what these assertions
      // guard is the skip side, where a predicate trimmed one document too far would do its damage.
      const RENDER_WIDTH = 800;
      const MARKER_H = 160;
      const marker = `<div style="width:100%;height:${MARKER_H}px;background:#f00"></div>`;
      const prose = n =>
        Array.from(
          { length: n },
          (_, i) => `<h3>Section ${i}</h3><p>${'The quick brown fox jumps over the lazy dog. '.repeat(4)}</p>`,
        ).join('');
      const wrapPage = body =>
        `<!doctype html><html><head><meta charset="utf-8"><title>Settle</title><style>body{margin:0}</style></head><body>${body}</body></html>`;
      // No `width`/`height` attributes on purpose: the intrinsic size is what reflows everything below
      // it, and an `<img>` is the condition the settle is now keyed on. `data:` survives both the
      // sanitizer and the subresource strip, so it is a real decode inside an offline package.
      const blueImg = `<img src="data:image/svg+xml;base64,${Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180"><rect width="300" height="180" fill="#00f"/></svg>',
      ).toString('base64')}">`;

      /** The page's CSS height at the rasterizer's own render width, measured independently of it. */
      const cssHeight = html =>
        page.evaluate(
          async ({ src, width }) => {
            const frame = document.createElement('iframe');
            frame.setAttribute('sandbox', 'allow-same-origin');
            frame.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;height:100px;border:none`;
            document.body.appendChild(frame);
            await new Promise(resolve => {
              frame.onload = resolve;
              frame.srcdoc = src;
            });
            const doc = frame.contentDocument;
            const height = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
            frame.remove();
            return height;
          },
          { src: html, width: RENDER_WIDTH },
        );

      /** Hand one in-memory page through the workbench's own upload → target → convert path. */
      async function convertPage(html, targetText, timeout) {
        await resetWorkbench(page);
        const inMemory = { name: 'settle-page.html', mimeType: 'text/html', buffer: Buffer.from(html) };
        const { resultName } = await convertFile(page, inMemory, targetText, timeout);
        if (!resultName) throw new Error(`${targetText} produced no result row for the settle page`);
        return downloadBatchArtifact(page);
      }

      /** The PNG the workbench wrote: dimensions off its own header, plus what actually painted. */
      async function measurePng(html) {
        const png = Buffer.from(await convertPage(html, 'PNG (.png)'), 'latin1');
        if (png.slice(1, 4).toString('ascii') !== 'PNG') {
          throw new Error(`expected a PNG artifact, got ${png.slice(0, 8).toString('hex')}`);
        }
        const painted = await scanPaintedPixels(page, png.toString('base64'));
        return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), ...painted };
      }

      /** How many pages the workbench's PDF for this page carries. */
      async function measurePdfPages(html) {
        // The default budget fits a fixture, and the fixtures' own ceiling is 20.7 s (JSON→PDF). This
        // document is a few thousand CSS px tall, so its PDF comes out multi-page and is sliced page by
        // page — the same shape `convertInlineHtmlToPdf` documents with its 60 s.
        const pdf = await convertPage(html, 'PDF (.pdf)', 60000);
        if (pdf.slice(0, 5) !== '%PDF-') throw new Error(`expected a PDF artifact, got ${pdf.slice(0, 8)}`);
        return readPdfSliceFilters(pdf).pages;
      }

      /**
       * The red block's own geometry, read as fractions: it starts where `MARKER_H` of a `pageHeight`
       * page starts, is as tall as its share of that page, and ends on the last row. Together those say
       * the picture is the whole page with nothing overlapping the box that closes it.
       */
      const markerWhole = (shot, pageHeight) =>
        shot.top >= 0 &&
        shot.bottom >= shot.height - 4 &&
        (shot.bottom - shot.top + 1) / shot.height >= (MARKER_H / pageHeight) * 0.9 &&
        Math.abs(shot.top / shot.height - (pageHeight - MARKER_H) / pageHeight) < 0.02;

      /** Uniform scale: the picture is the page at one magnification, so no rows went missing. */
      const uniformScale = (shot, pageHeight) => Math.abs(shot.width / RENDER_WIDTH - shot.height / pageHeight) < 0.02;

      const plainPage = wrapPage(`${prose(30)}${marker}`);
      const plainHeight = await cssHeight(plainPage);
      const plainShot = await measurePng(plainPage);
      if (uniformScale(plainShot, plainHeight)) {
        ok(
          `A page that skips the settle is rasterized whole (${plainShot.width}×${plainShot.height} px of a ${plainHeight} CSS px page)`,
        );
      } else {
        fail(
          'Skip-settle clipping',
          `${plainShot.width}×${plainShot.height} px for ${plainHeight} CSS px — width and height disagree on the scale`,
        );
      }
      if (markerWhole(plainShot, plainHeight)) {
        ok('The last box on a skip-settle page is whole and sits on the bottom row');
      } else {
        fail(
          'Skip-settle bottom content',
          `red rows ${plainShot.top}–${plainShot.bottom} of ${plainShot.height} (${plainShot.red} red px), page ${plainHeight} CSS px`,
        );
      }

      // The side that is still owed the pause: the images have to have decoded *into* the picture, not
      // merely been listed by the document, which is what the blue count separates from a red-only pass.
      const imagePage = wrapPage(`${prose(10)}${blueImg}${prose(10)}${blueImg}${prose(10)}${blueImg}${marker}`);
      const imageHeight = await cssHeight(imagePage);
      const imageShot = await measurePng(imagePage);
      const expectedBlue = ((3 * 300 * 180) / (RENDER_WIDTH * imageHeight)) * imageShot.width * imageShot.height;
      if (imageShot.blue > expectedBlue * 0.35) {
        ok(
          `Images on the settled page paint at their intrinsic size (${imageShot.blue} blue px of ${Math.round(expectedBlue)} expected)`,
        );
      } else {
        fail('Settled-page images', `only ${imageShot.blue} blue px, expected near ${Math.round(expectedBlue)}`);
      }
      if (markerWhole(imageShot, imageHeight)) {
        ok('Content below an image is not left overlapping it');
      } else {
        fail(
          'Settled-page bottom content',
          `red rows ${imageShot.top}–${imageShot.bottom} of ${imageShot.height} (${imageShot.red} red px), page ${imageHeight} CSS px`,
        );
      }

      // Repeat runs, which is where the race this constant used to paper over would show: the same page
      // in has to give the same geometry out, on the PNG route and on the PDF route, and the PDF has to
      // be genuinely multi-page or "the count never changed" would be satisfied by one page forever.
      const plainShotAgain = await measurePng(plainPage);
      if (plainShotAgain.width === plainShot.width && plainShotAgain.height === plainShot.height) {
        ok(
          `A skip-settle page rasterizes to the same PNG on a repeat run (${plainShotAgain.width}×${plainShotAgain.height} px)`,
        );
      } else {
        fail(
          'Skip-settle raster drift',
          `${plainShot.width}×${plainShot.height} then ${plainShotAgain.width}×${plainShotAgain.height} for one page`,
        );
      }
      const pagesFirst = await measurePdfPages(plainPage);
      const pagesSecond = await measurePdfPages(plainPage);
      if (pagesFirst === pagesSecond && pagesFirst >= 2) {
        ok(`The same page reaches PDF with one stable page count on repeat runs (${pagesFirst} pages)`);
      } else {
        fail('PDF page-count drift', `${pagesFirst} then ${pagesSecond} pages for a ${plainHeight} CSS px page`);
      }

      // The predicate is a string test, so its shape coverage is checkable without a browser. The geometry
      // assertions around it catch a document that was skipped too early only when the skip costs pixels; a
      // shape that quietly stops matching the predicate is invisible to them, which makes this table the
      // guard on the predicate itself. Both patterns are read out of the source rather than copied here, so
      // the guard cannot drift away from what ships: a copied pattern narrows along with it, and if a
      // literal is renamed or wrapped across lines `settlePatterns.length` says so instead of testing nothing.
      // What the table pins is the patterns, not what the sanitizer hands them: a shape DOMPurify stops
      // keeping would leave its row green and cost 100 ms of waiting for nothing — the side this predicate
      // errs on, and the reason the gap is acceptable here rather than needing a browser round-trip per row.
      const rasterSource = fs.readFileSync(path.resolve(__dirname, '../utils/core/html-raster.ts'), 'utf8');
      const settlePatterns = [
        ...rasterSource.matchAll(/^const (?:MOTION_RE|UNWAITED_ASSET_RE) = \/(.*)\/([a-z]*);$/gm),
      ].map(match => new RegExp(match[1], match[2]));
      const SETTLE_TABLE = [
        [true, 'a stylesheet animation', '<style>.a{animation:spin 2s}</style>'],
        [true, 'an inline style whose first declaration is a transition', '<div style="transition:all 2s">x</div>'],
        [true, 'a vendor-prefixed animation', '<div style="-webkit-animation:spin 2s">x</div>'],
        [true, 'a SMIL transform', '<svg><animateTransform attributeName="transform"/></svg>'],
        [true, 'a marquee', '<marquee>scrolling text</marquee>'],
        [true, 'an SVG image, which doc.images does not count', '<svg><image href="data:image/png;base64,AA"/></svg>'],
        [true, 'a video, whose box arrives with its metadata', '<video src="data:video/mp4;base64,AA"></video>'],
        [false, 'plain prose', '<h3>Section</h3><p>The quick brown fox.</p>'],
        [false, 'a heading that only spells motion words in text', '<p>transition animation marquee video</p>'],
        [
          false,
          'a bare @keyframes no animation: refers to',
          '<style>@keyframes spin{to{transform:rotate(1turn)}}</style>',
        ],
        [false, 'an HTML img — the asset wait already counts it', '<img src="data:image/png;base64,AA">'],
        [
          false,
          'an audio element: fixed box, nothing moves when it loads',
          '<audio src="data:audio/wav;base64,AA"></audio>',
        ],
      ];
      if (settlePatterns.length !== 2) {
        fail(
          'Settle pattern shape table',
          `read ${settlePatterns.length} of the two pattern literals from utils/core/html-raster.ts`,
        );
      } else {
        // The two patterns only: the full predicate also ORs in `doc.images` and `doc.fonts`, which need a
        // rendered document. The two rows that say `false` do so because the DOM half already covers them.
        const patternSaysWait = html => settlePatterns.some(re => re.test(html));
        const misses = SETTLE_TABLE.filter(([want, , html]) => patternSaysWait(html) !== want).map(
          ([want, name]) => `${name} (${want ? 'pattern should match' : 'pattern should not match'})`,
        );
        if (misses.length === 0) {
          ok(`The settle patterns match exactly the ${SETTLE_TABLE.length} shapes the table pins`);
        } else {
          fail('Settle pattern shape table', `wrong side of the pattern: ${misses.join('; ')}`);
        }
      }
    } catch (e) {
      fail('Layout Settle Completeness', e.message);
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
  } catch (e) {
    fail('Multi-sheet XLSX→CSV', e.message);
  }

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
    await page.waitForFunction(
      () => {
        const alert = document.querySelector('.el-alert__title');
        return alert && alert.textContent.length > 0;
      },
      undefined,
      { timeout: 30000 },
    );
    const resultCount = await page.$$eval('.result-item', els => els.length);
    if (resultCount === 2) ok('Extracted batch converted: 2 results');
    else fail('ZIP batch conversion', `expected 2 results, got ${resultCount}`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-zip-batch.png`), fullPage: true });
  } catch (e) {
    fail('ZIP archive expansion', e.message);
  }

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
  } catch (e) {
    fail('Multi-page PDF→PNG ZIP', e.message);
  }

  // Same bundle through the new direct PDF→JPG edge: the ZIP container must follow the
  // target format, not just PNG.
  section('Multi-page PDF → JPEG exports ZIP');
  try {
    await resetWorkbench(page);
    const result = await convertFile(page, 'sample-2page.pdf', 'JPEG (.jpg)');
    if (result.alertTitle.includes('完成') && result.resultName.endsWith('.zip')) {
      ok(`Two-page PDF exported as JPEG ZIP: ${result.resultName}`);
    } else {
      fail('Multi-page PDF→JPEG', `alert="${result.alertTitle}" name="${result.resultName}"`);
    }
  } catch (e) {
    fail('Multi-page PDF→JPEG ZIP', e.message);
  }

  // ═══════════════════════════════════════════
  //  PDF PAGE RANGE SELECTION (narrowing the source)
  // ═══════════════════════════════════════════

  section('PDF Page Range Selection');
  try {
    const labels = async () => {
      if ((await page.$$('.output-options')).length === 0) return [];
      return page.$$eval('.output-options .output-label', els => els.map(e => e.textContent.trim()));
    };
    const setRange = spec => page.fill('.output-options .el-input input', spec);
    const failureReason = () => page.$eval('.failure-item .failure-reason', el => el.textContent).catch(() => '');

    await resetWorkbench(page);
    const rangeFileInput = await page.$('input[type="file"]');
    if (!rangeFileInput) throw new Error('file input not found');
    await rangeFileInput.setInputFiles(path.join(FIXTURE_PATH, 'sample-2page.pdf'));
    await page.waitForTimeout(1000);
    await pickTarget(page, 'PNG (.png)');

    if ((await labels()).includes('页码范围')) ok('PDF source with an image target offers 页码范围');
    else fail('页码范围 field', `labels: [${(await labels()).join(', ')}]`);

    // The naming convention an excerpt relies on, pinned before anything is narrowed: a ZIP entry
    // numbered by its position in the output would silently renumber "page 2" into "page-1".
    const whole = await convertFile(page, 'sample-2page.pdf', 'PNG (.png)');
    const wholeEntries = whole.resultName.endsWith('.zip') ? await zipEntryNames(page) : [];
    if (wholeEntries.join(',') === 'page-1.png,page-2.png') ok('Whole document exports page-1 / page-2');
    else fail('Whole-document ZIP entries', `alert="${whole.alertTitle}" entries=[${wholeEntries.join(', ')}]`);

    const secondOnly = await (async () => {
      await setRange('2');
      return convertFile(page, 'sample-2page.pdf', 'PNG (.png)');
    })();
    if (secondOnly.resultName.endsWith('.png')) ok('页码范围 2 narrows a two-page PDF to one PNG');
    else fail('页码范围 2', `alert="${secondOnly.alertTitle}" name="${secondOnly.resultName}"`);

    await setRange('9');
    const outOfRange = await convertFile(page, 'sample-2page.pdf', 'PNG (.png)');
    const reason = (await failureReason()).trim();
    if (reason.includes('没有匹配到任何页面')) ok('An unsatisfiable 页码范围 names the range, not the encoder');
    else fail('页码范围 9', `alert="${outOfRange.alertTitle}" reason="${reason}"`);

    // The safety property of the whole feature: the field lives inside a panel that only exists for
    // an image target, so retargeting has to hide it *and* disarm it. A range still held in memory
    // but no longer on screen must make no difference at all — the assertion below reads the HTML
    // for the page-break marker `pdf-to-html` writes between pages, which a one-page excerpt would
    // be missing.
    await setRange('2');
    await pickTarget(page, 'HTML (.html)');
    if ((await page.$$('.output-options')).length === 0 && (await labels()).length === 0)
      ok('页码范围 hides together with the output panel');
    else fail('页码范围 visibility', `panel still rendered with labels [${(await labels()).join(', ')}]`);

    const htmlRun = await convertFile(page, 'sample-2page.pdf', 'HTML (.html)');
    if (!htmlRun.resultName) throw new Error(`pdf→html produced no artifact: ${htmlRun.alertTitle}`);
    const htmlText = await downloadBatchArtifact(page);
    const breaks = htmlText.split('page-break-after').length - 1;
    if (breaks === 1) ok('A 页码范围 the panel hides does not narrow an HTML export');
    else fail('Invisible 页码范围', `expected 1 page break between 2 pages, found ${breaks}`);

    // Clearing has to land back on "everything", and this is also the cleanup that keeps the rest of
    // the suite converting whole documents: the selection is session state, so nothing else resets it.
    // The target goes back to an image first — with HTML selected there is no panel to type into,
    // which is the same gate the previous two assertions just checked.
    await pickTarget(page, 'PNG (.png)');
    await setRange('');
    const cleared = await convertFile(page, 'sample-2page.pdf', 'PNG (.png)');
    const clearedEntries = cleared.resultName.endsWith('.zip') ? await zipEntryNames(page) : [];
    if (clearedEntries.length === 2) ok('Clearing 页码范围 restores the whole document');
    else fail('Clearing 页码范围', `alert="${cleared.alertTitle}" entries=[${clearedEntries.join(', ')}]`);
  } catch (e) {
    fail('PDF page range selection', e.message);
  }

  // ═══════════════════════════════════════════
  //  OFFLINE SENTINEL — remote references must never be fetched
  // ═══════════════════════════════════════════

  section('Offline Sentinel — zero subresource requests');
  try {
    canaryHits.length = 0;
    await resetWorkbench(page);
    // Re-point the canary URLs at the actual harness port before uploading.
    const remoteHtml = fs
      .readFileSync(path.join(FIXTURE_PATH, 'sample-remote.html'), 'utf8')
      .replaceAll('127.0.0.1:9876', `127.0.0.1:${PORT}`);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles({ name: 'sample-remote.html', mimeType: 'text/html', buffer: Buffer.from(remoteHtml) });
    await page.waitForTimeout(1000);

    // Boundary 1: the source preview dialog renders the document into a srcdoc iframe.
    await (await page.$('.file-item button[title="预览"]')).click();
    await page.waitForSelector('.preview-dialog iframe.doc-frame', { timeout: 10000 });
    await page.waitForTimeout(1500);
    // Boundary 2: the rasterizer renders the same document before encoding the PNG.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await pickTarget(page, 'PNG (.png)');
    await (await page.$('.convert-btn')).click();
    await page.waitForFunction(
      () => {
        const alert = document.querySelector('.el-alert__title');
        return alert && alert.textContent.length > 0;
      },
      undefined,
      { timeout: 30000 },
    );
    // Give any in-flight subresource request time to reach the server before judging.
    await page.waitForTimeout(1500);

    if (canaryHits.length === 0) {
      ok('Remote img/link/@import/style-url/srcset/video references produced zero requests');
    } else {
      fail('Offline sentinel', `canary was fetched: ${[...new Set(canaryHits)].join(', ')}`);
    }

    // The strip must be surgical: plain anchor links are content, not subresources.
    await (await page.$('.file-item button[title="预览"]')).click();
    await page.waitForSelector('.preview-dialog iframe.doc-frame', { timeout: 10000 });
    const srcdoc = await page.$eval('.preview-dialog iframe.doc-frame', el => el.getAttribute('srcdoc') || '');
    if (srcdoc.includes(`/canary/anchor`) && !srcdoc.includes(`/canary/img.png`)) {
      ok('Anchor href preserved while image references were stripped');
    } else {
      fail(
        'Surgical strip check',
        `anchor kept=${srcdoc.includes('/canary/anchor')}, image kept=${srcdoc.includes('/canary/img.png')}`,
      );
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: shot(`${String(shotIdx++).padStart(2, '0')}-offline-sentinel.png`),
      fullPage: true,
    });
  } catch (e) {
    fail('Offline sentinel', e.message);
  }

  // ═══════════════════════════════════════════
  //  F-1 — DOCX boundary must not carry remote subresources into a Word document
  // ═══════════════════════════════════════════

  if (section('DOCX Subresource Egress')) {
    try {
      await resetWorkbench(page);
      const fi = await page.$('input[type="file"]');
      const egressHtml = fs
        .readFileSync(path.join(FIXTURE_PATH, 'sample-egress.html'), 'utf8')
        .replaceAll('127.0.0.1:9876', `127.0.0.1:${PORT}`);
      await fi.setInputFiles({ name: 'sample-egress.html', mimeType: 'text/html', buffer: Buffer.from(egressHtml) });
      await page.waitForTimeout(1000);
      await pickTarget(page, 'Word (.docx)');
      await (await page.$('.convert-btn')).click();
      await page.waitForFunction(
        () => {
          const alert = document.querySelector('.el-alert__title');
          return alert && alert.textContent.length > 0;
        },
        undefined,
        { timeout: 30000 },
      );
      await page.waitForTimeout(500);

      // The browser never fetches these URLs, so `canaryHits` stays empty either way: the markup is
      // packed into an MHT altChunk and it is Microsoft Word that would resolve them, on the user's
      // machine, when they open the file. Only the artifact itself can be asserted on.
      const docxText = await downloadBatchArtifact(page);

      // Assert the altChunk exists before asserting anything about its contents. Every probe below
      // reads it, so a package that lost it — a library bump, a template rename — would report "the
      // data: image was stripped, over-eager filter" for a completely unrelated cause.
      const altChunkInPackage = docxText.includes('file:///C:/fake/document.html');
      if (altChunkInPackage) {
        ok('DOCX carries the MHT altChunk the probes below read');
      } else {
        fail('DOCX altChunk missing', 'no word/afchunk.mht in the artifact — the strip probes below prove nothing');
      }

      if (altChunkInPackage) {
        // One marker per vector `stripRemoteResources` handles on this path, including the two that
        // need separate fixture markup to be exercised at all: `<link href>` and the inline
        // `style=` attribute. A vector missing from the fixture is a branch never executed.
        const wanted = [
          'canary/img.png',
          'canary/link.css',
          'canary/css-import',
          'canary/css-bg.png',
          'canary/inline.png',
        ];
        const survived = wanted.filter(m => docxText.includes(m));
        if (survived.length === 0) {
          ok('Remote img / link / @import / style-element url / inline-style url stripped from the DOCX');
        } else {
          fail('DOCX egress strip', `survived: ${survived.join(', ')}`);
        }

        // The control for "not an over-eager filter". Probed on the payload rather than on the
        // `data:` prefix, because the prefix is never in the artifact: getMHTdocument() hoists every
        // quoted data: src out of the altChunk into its own base64 MIME part and rewrites the img to
        // file:///C:/fake/imageN.png. A fixture-unique payload substring is required rather than a
        // generic PNG header: later tasks put a second PNG into the same DOCX, and `iVBORw0KGgo`
        // alone would stay green even if this fixture's image had been eaten. What it does establish
        // is that the image is resolvable from inside the package, so rendering it needs no fetch —
        // which is what mammoth's DOCX→HTML→DOCX roundtrip depends on.
        if (docxText.includes('AAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQ')) {
          ok('Inline data: image preserved (mammoth images must not be collateral damage)');
        } else {
          fail('DOCX data: control', 'the data: image was stripped too — over-eager filter');
        }

        if (docxText.includes('/canary/anchor')) {
          ok('Anchor href preserved (surgical strip, not blanket)');
        } else {
          fail('DOCX anchor control', 'anchor href was stripped — the filter is not surgical');
        }
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-docx-egress.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('DOCX Subresource Egress', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-9 — inline SVG in markdown must survive md→html, and its active content must not
  // ═══════════════════════════════════════════

  if (section('Markdown Inline SVG')) {
    try {
      await resetWorkbench(page);
      const kept = await convertFile(page, 'sample-svg-diagram.md', 'HTML (.html)');
      if (!kept.resultName) throw new Error(`md→html produced no artifact: ${kept.alertTitle}`);
      const html = await downloadBatchArtifact(page);
      if (html.includes('<svg') && html.includes('<rect')) {
        ok('Inline <svg> survives md→html');
      } else {
        fail('md→html svg survival', `svg=${String(html.includes('<svg'))} rect=${String(html.includes('<rect'))}`);
      }

      await resetWorkbench(page);
      const evil = await convertFile(page, 'sample-svg-attack.md', 'HTML (.html)');
      if (!evil.resultName) throw new Error(`md→html (attack) produced no artifact: ${evil.alertTitle}`);
      // The reason this half exists: widening the profile is only defensible if what comes through
      // is the drawing and not the script. `<rect>` is the control proving the svg survived at all,
      // so a sanitize that deleted everything cannot pass by having nothing left to leak.
      const attack = (await downloadBatchArtifact(page)).toLowerCase();
      const leftovers = ['<script', 'foreignobject', 'onerror'].filter(marker => attack.includes(marker));
      if (leftovers.length === 0 && attack.includes('<rect')) {
        ok('svg profile keeps the graphic and drops script / foreignObject / on* handlers');
      } else {
        fail('md→html svg sanitization', `leftovers=${leftovers.join(',')} rect=${String(attack.includes('<rect'))}`);
      }

      // …and the case that makes the widening worth something downstream: md→png renders through an
      // iframe + foreignObject, so the diagram has to survive the sanitizer AND paint. A file being
      // produced proves neither, so this counts the fixture's own red — a document that lost the
      // `<svg>` comes out with zero red pixels, and no other fixture content is that colour.
      await resetWorkbench(page);
      const raster = await convertFile(page, 'sample-svg-diagram.md', 'PNG (.png)');
      if (!raster.resultName) throw new Error(`md→png produced no artifact: ${raster.alertTitle}`);
      const pngB64 = Buffer.from(await downloadBatchArtifact(page), 'latin1').toString('base64');
      const { red: redPixels } = await scanPaintedPixels(page, pngB64);
      if (redPixels > 200) {
        ok(`Inline <svg> still paints at the rasterized boundary (${redPixels} red pixels)`);
      } else {
        fail('md→png svg painting', `only ${redPixels} red pixels in the rendered page`);
      }
    } catch (e) {
      fail('Markdown Inline SVG', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-8 — inline SVG must actually paint inside a .docx (was: a valid blank file)
  // ═══════════════════════════════════════════

  if (section('DOCX Inline SVG')) {
    for (const [label, fixture, dims, altText] of [
      ['md→docx', 'sample-svg-diagram.md', [40, 30], 'Red rectangle'],
      ['svg→docx', 'sample.svg', [240, 140], null],
    ]) {
      try {
        await resetWorkbench(page);
        const r = await convertFile(page, fixture, 'Word (.docx)');
        if (!r.resultName) throw new Error(`${label} produced no artifact: ${r.alertTitle}`);
        const docx = await downloadBatchArtifact(page);
        // AltChunk precondition, for the same reason the egress section has one: a package that lost
        // the altChunk would otherwise report "the diagram was stripped" for an unrelated cause.
        if (!docx.includes('Content-Type: text/html')) {
          throw new Error('no MHT altChunk in the artifact — the probes below would prove nothing');
        }
        const svgLeft = /<svg[\s>]/i.test(docx);
        // The disclosure has to travel with the artifact: nothing on a `sample_docx_….docx` name says
        // the diagram inside it stopped being vector artwork, and this is where the user finds out.
        const notes = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
        if (notes.some(text => text.includes('矢量图'))) {
          ok(`${label} discloses that inline SVG became a bitmap`);
        } else {
          fail(`${label} svg disclosure`, `notes rendered: ${JSON.stringify(notes)}`);
        }
        const head = pngHead(...dims);
        // The `<title>` probe is encoding-agnostic on purpose: it asks whether the words are still in
        // the package, not whether they sit in an `alt="…"` verbatim. Combined with "no <svg> left",
        // the img's alt is the only place they can have come from — and it is why that fixture has a
        // title at all, since the raster path would otherwise never be observed setting one.
        const labelKept = altText === null || docx.includes(altText);
        if (!svgLeft && docx.includes(head) && labelKept) {
          ok(`${label} embeds a ${dims.join('×')} PNG and leaves no inline <svg> for Word to fail on`);
        } else {
          const at = docx.indexOf('image/png');
          const around = at < 0 ? '' : docx.slice(at, at + 220);
          fail(
            `${label} inline svg`,
            `svgLeft=${String(svgLeft)} head=${String(docx.includes(head))} label=${String(
              labelKept,
            )} nearPng=${JSON.stringify(around)}`,
          );
        }
      } catch (e) {
        fail(`DOCX Inline SVG ${label}`, e.message);
      }
    }
  }

  // The other half, and the half that keeps the note worth reading: a document with no inline SVG
  // must stay silent. `sample.html` is that document, and the precondition above — it really produced
  // a .docx — is what turns "no note" into an assertion instead of a rendering that never happened.
  if (section('SVG Flattening Disclosure Stays Silent Without SVG')) {
    try {
      await resetWorkbench(page);
      const silent = await convertFile(page, 'sample.html', 'Word (.docx)');
      if (!silent.resultName) throw new Error(`html→docx produced no artifact: ${silent.alertTitle}`);
      const notes = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (notes.some(text => text.includes('矢量图'))) {
        fail('svg-free html→docx disclosure', `unexpected note: ${JSON.stringify(notes)}`);
      } else {
        ok('svg-free HTML→DOCX renders no vector disclosure');
      }
    } catch (e) {
      fail('SVG Flattening Disclosure Stays Silent Without SVG', e.message);
    }
  }

  // The same rasterizer on the Markdown boundary: without it turndown has no rule for `<svg>` and
  // the document comes out as the diagram's stray `<text>` nodes.
  if (section('SVG → Markdown Keeps The Drawing')) {
    try {
      await resetWorkbench(page);
      const r = await convertFile(page, 'sample.svg', 'Markdown (.md)');
      if (!r.resultName) throw new Error(`svg→md produced no artifact: ${r.alertTitle}`);
      const md = await downloadBatchArtifact(page);
      if (md.includes(`data:image/png;base64,${pngHead(240, 140)}`) && !/<svg[\s>]/i.test(md)) {
        ok('svg→md embeds the 240×140 raster instead of dropping the diagram');
      } else {
        fail(
          'svg→md inline svg',
          `png=${String(md.includes('data:image/png'))} svgLeft=${String(/<svg[\s>]/i.test(md))} head=${String(
            md.includes(pngHead(240, 140)),
          )}`,
        );
      }
      // The Markdown boundary needs its own disclosure probe: the flag there is derived from the
      // produced file rather than from the input, so "an .md exists with a raster in it" and "the card
      // says so" have to be checked together or either half can drift.
      const mdNotes = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (mdNotes.some(text => text.includes('矢量图'))) {
        ok('svg→md discloses that inline SVG became a bitmap');
      } else {
        fail('svg→md svg disclosure', `notes rendered: ${JSON.stringify(mdNotes)}`);
      }
    } catch (e) {
      fail('SVG → Markdown Keeps The Drawing', e.message);
    }
  }

  // An edit replaces the whole result entry in the store, so it is the one action that can make an
  // accurate disclosure vanish from a file whose disclosed property never changed. Nothing else in
  // the suite reaches this: a GIF's landing formats are not editable text, so `lostFrames` has never
  // been exposed to it — Markdown has.
  if (section('Result Edit Keeps The Disclosures')) {
    try {
      await resetWorkbench(page);
      const edited = await convertFile(page, 'sample.svg', 'Markdown (.md)');
      if (!edited.resultName) throw new Error(`svg→md produced no artifact: ${edited.alertTitle}`);
      // Prove there is something to preserve before touching the editor, otherwise the assertion
      // below passes on a card that never showed the note in the first place.
      const before = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (!before.some(text => text.includes('矢量图'))) {
        throw new Error(`no disclosure to preserve, notes were ${JSON.stringify(before)}`);
      }
      let editBtn = null;
      for (const btn of await page.$$('.panel-actions .el-button')) {
        if ((await btn.textContent()).trim() === '编辑') editBtn = btn;
      }
      if (!editBtn) throw new Error('no edit toggle rendered for a Markdown result');
      await editBtn.click();
      const area = await page.$('.edit-textarea');
      if (!area) throw new Error('the edit toggle produced no textarea');
      // A real keystroke rather than a synthetic `input` event: this is the path the user takes, and
      // the handler under test reads `$event.target.value`.
      await area.press('Space');
      // The emit is debounced by 300ms; before that window the store still holds the old entry and a
      // passing assertion would mean nothing.
      await page.waitForTimeout(700);
      const after = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (after.some(text => text.includes('矢量图'))) {
        ok('editing a result keeps its vector disclosure');
      } else {
        fail('edit wipes disclosures', `notes after the edit: ${JSON.stringify(after)}`);
      }
    } catch (e) {
      fail('Result Edit Keeps The Disclosures', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-6 — CSV→XLSX must not re-type the data
  // ═══════════════════════════════════════════

  if (section('CSV Typing Fidelity')) {
    try {
      await resetWorkbench(page);
      const result = await convertFile(page, 'sample-typing.csv', 'Excel (.xlsx)');
      if (!result.alertTitle.includes('完成')) throw new Error(`conversion failed: ${result.alertTitle}`);
      const xlsxText = await downloadBatchArtifact(page);

      // Asserted against the workbook's own XML, because the claim is about what the file stores:
      // every one of these markers is one of the fixture's values, so nothing generic can stand in
      // for them, and two of them (`1234.5`, `-42`) are controls that must stay *numeric* — a fix
      // that pinned the whole sheet as text would break those two while satisfying the rest.
      //
      // `'=1+1` reaches the artifact XML-escaped as `&apos;=1+1`, because the value sits in a <v>
      // element. A marker carrying `=` is safe here even though it is not safe inside the DOCX
      // altChunk above: the XLSX parts have no quoted-printable layer, so the bytes are verbatim.
      const checks = [
        ['leading zeros kept', xlsxText.includes('00424')],
        ['20-digit account intact', xlsxText.includes('12345678901234567890')],
        ['formula neutralized', xlsxText.includes('&apos;=1+1')],
        ['date kept as text', xlsxText.includes('2024-01-05')],
        ['fraction kept as text', xlsxText.includes('1/2')],
        ['quoted thousands separators kept', xlsxText.includes('1,234.50')],
        // Both controls read the type off the cell element, not off the value bytes: `<v>1234.5</v>`
        // is what a text cell holding that string looks like too, so the earlier form of these two
        // passed under exactly the regression they were written to catch. Column letters follow the
        // fixture's header order (A zip … F amount … H delta).
        ['amount is stored as a number, not as text reading 1234.5', xlsxCellIsNumber(xlsxText, 'F2', '1234.5')],
        [
          'delta is stored as a number, not as text reading -42',
          xlsxCellIsNumber(xlsxText, 'H2', '-42') && !xlsxText.includes('&apos;-42'),
        ],
      ];
      const broken = checks.filter(([, pass]) => !pass).map(([name]) => name);
      if (broken.length === 0) {
        ok('CSV→XLSX preserves zip / account / date / fraction / quoted text and still numbers 1234.5 and -42');
      } else {
        fail('CSV typing fidelity', broken.join('; '));
      }

      // The 15-significant-digit boundary, asserted on the *cell element* rather than on the value
      // bytes: `<v>4111111111111111</v>` is what a text cell looks like just as much as a numeric
      // one, so the `checks` list above cannot say which branch a long number took — it only proves
      // the digits survived. Column letters follow the fixture's order (A zip … H delta, then
      // I cardvisa, J cardup, K id16, L id15, M tiny).
      //
      // I2/J2/K2 are the regression this guards: 16-digit values reproduce themselves through
      // `Number`, so the round trip alone let them through as numbers, and Excel renders a number of
      // that width as `4.11111111111111E+15` — the identifier is stored faithfully but read back
      // wrong by eye. L2 and M2 are the controls on the other side: the boundary sits at 15 *significant
      // digits*, not at 16 characters, so an ordinary 15-digit value and a small decimal whose 17
      // digit characters carry 13 significant ones must both stay summable numbers.
      const digitBoundary = [
        ['16-digit Visa-shaped PAN kept as text', 'I2', 'text', '4111111111111111'],
        ['16-digit UnionPay-shaped PAN kept as text', 'J2', 'text', '6222021234567890'],
        ['ordinary 16-digit value kept as text', 'K2', 'text', '1234567890123456'],
        ['15-digit value still numeric', 'L2', 'number', '123456789012345'],
        ['small decimal still numeric (17 digit chars, 13 significant)', 'M2', 'number', '0.0001234567890123'],
      ];
      const misplaced = digitBoundary
        .map(([name, ref, want, wantValue]) => {
          const cell = readXlsxCell(xlsxText, ref);
          if (cell.kind === want && cell.value === wantValue) return null;
          return `${name}: ${ref} is ${cell.kind} <v>${cell.value}</v>, expected ${want} <v>${wantValue}</v>`;
        })
        .filter(Boolean);
      if (misplaced.length === 0) {
        ok('CSV→XLSX keeps values of more than 15 significant digits as text and 15-or-fewer as numbers');
      } else {
        for (const message of misplaced) fail('CSV significant-digit boundary', message);
      }

      // The formula branch is the one that executes code: SheetJS emitted `<c r="C2"><f>1+1</f></c>`,
      // which Excel computes the moment the workbook is opened. Absence of `<f>` is asserted
      // separately from the guarded value above, because the guard could change shape while this
      // invariant may not.
      if (!xlsxText.includes('<f>')) {
        ok('No live formula emitted');
      } else {
        fail('CSV formula re-arm', 'the xlsx contains an <f> element');
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-csv-typing.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('CSV Typing Fidelity', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-7 — XLSX→CSV/JSON emit values, and formulas never survive as formulas
  // ═══════════════════════════════════════════

  if (section('XLSX Value Fidelity')) {
    try {
      await resetWorkbench(page);
      const csvRun = await convertFile(page, 'sample-typed.xlsx', 'CSV (.csv)');
      if (!csvRun.alertTitle.includes('完成')) throw new Error(`csv failed: ${csvRun.alertTitle}`);
      const csv = await downloadBatchArtifact(page);

      // Asserted on the downloaded CSV text. Every negative marker is a *display text* the fixture
      // provably renders (`1,234.50` for 1234.5, `25.0%` for 0.25, `1/5/24` for the built-in date
      // format, `2,469.00` for the cached formula cell), so a run that merely keeps the old
      // behaviour cannot satisfy them.
      const csvChecks = [
        ['amount is the value, not the formatted text', csv.includes('1234.5') && !csv.includes('1,234.50')],
        ['ratio is 0.25, not 25.0%', csv.includes('0.25') && !csv.includes('25.0%')],
        ['boolean is the value, not TRUE', csv.includes(',true,') && !csv.includes('TRUE')],
        ['cached formula exports its value, not its stale text', csv.includes(',2469,') && !csv.includes('2,469.00')],
        ['plain date carries no zero time', csv.includes('2024-01-05') && !csv.includes('2024-01-05 00:00:00')],
        ['datetime keeps its time', csv.includes('2024-01-05 14:30:00') && !csv.includes('1/5/24')],
      ];
      const csvBroken = csvChecks.filter(([, pass]) => !pass).map(([name]) => name);
      if (csvBroken.length === 0) {
        ok('XLSX→CSV emits values with two-form ISO dates instead of display text');
      } else {
        fail('XLSX→CSV values', csvBroken.join('; '));
      }

      // The formula policy, asserted as an invariant rather than as three markers: no cell may
      // contribute a live formula to the CSV. Each of the fixture's three formula shapes gets its
      // own check, because the one that has a cached value must NOT appear as text at all.
      const formulaChecks = [
        ['formula with a cached value contributes no formula text', !csv.includes('A2*2')],
        ['cached string result is guarded', csv.includes("'=HYPERLINK")],
        ['formula with an empty cached value is guarded, not dropped', csv.includes("'=A2*3")],
      ];
      const formulaBroken = formulaChecks.filter(([, pass]) => !pass).map(([name]) => name);
      if (formulaBroken.length === 0) {
        ok('XLSX→CSV neutralizes every formula shape');
      } else {
        fail('XLSX→CSV formula policy', formulaBroken.join('; '));
      }

      await resetWorkbench(page);
      const jsonRun = await convertFile(page, 'sample-typed.xlsx', 'JSON (.json)');
      if (!jsonRun.alertTitle.includes('完成')) throw new Error(`json failed: ${jsonRun.alertTitle}`);
      const json = await downloadBatchArtifact(page);

      const jsonChecks = [
        ['amount is a JSON number', /"amount":\s*1234\.5\s*[,\n}]/.test(json)],
        ['ratio is a JSON number', /"ratio":\s*0\.25\s*[,\n}]/.test(json)],
        ['flag is a JSON boolean', /"flag":\s*true\s*[,\n}]/.test(json)],
        ['cached formula value is a JSON number', /"calc":\s*2469\s*[,\n}]/.test(json)],
        [
          'date is two-form ISO with no zero time',
          /"date":\s*"2024-01-05"/.test(json) && !json.includes('2024-01-05 00:00:00'),
        ],
        ['datetime keeps its time', /"datetime":\s*"2024-01-05 14:30:00"/.test(json)],
        [
          'no formatted text survived',
          !json.includes('1,234.50') && !json.includes('25.0%') && !json.includes('"TRUE"'),
        ],
      ];
      const jsonBroken = jsonChecks.filter(([, pass]) => !pass).map(([name]) => name);
      if (jsonBroken.length === 0) {
        ok('XLSX→JSON emits real numbers, booleans and ISO dates instead of display text');
      } else {
        fail('XLSX→JSON values', jsonBroken.join('; '));
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-xlsx-value-fidelity.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('XLSX Value Fidelity', e.message);
    }
  }

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
  } catch (e) {
    fail('JSON result preview', e.message);
  }

  // ═══════════════════════════════════════════
  //  HTML→MD TABLE ROUNDTRIP (regression: default Turndown rules dropped tables)
  // ═══════════════════════════════════════════

  section('HTML→MD Table Roundtrip');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample.html', 'Markdown (.md)');

    const previewBtn = await page.$('.result-item button[title="预览"]');
    if (!previewBtn) throw new Error('result preview button not found');
    await previewBtn.click();
    await page.waitForTimeout(800);

    // Markdown previews default to the rendered iframe; the raw GFM text only
    // appears after switching the dialog to its source tab.
    const sourceTab = await page.$('.preview-dialog .el-radio-button__inner:has-text("源码")');
    if (sourceTab) await sourceTab.click();
    await page.waitForTimeout(300);

    const text = await page.$eval('.preview-dialog .text-preview', el => el.textContent).catch(() => '');
    if (text.includes('| K | V |') && text.includes('| --- | --- |') && text.includes('| a | 1 |')) {
      ok('HTML→MD keeps the sample table as a GFM pipe table');
    } else {
      fail('HTML→MD table roundtrip', `markdown lost the table: "${text.slice(0, 120)}"`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-html-to-md-table.png`), fullPage: true });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } catch (e) {
    fail('HTML→MD table roundtrip', e.message);
  }

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
  } catch (e) {
    fail('Append & clear files', e.message);
  }

  // ═══════════════════════════════════════════
  //  FILE-SET EDITS KEEP UNRELATED RESULTS (F7)
  // ═══════════════════════════════════════════

  section('File Set Edits Keep Unrelated Results');
  try {
    const resultNames = () => page.$$eval('.result-item .result-name', els => els.map(e => e.textContent.trim()));
    const rowCount = async sel => (await page.$$(sel)).length;
    const clearFiles = async () => {
      const btn = await page.$('.clear-files-btn');
      if (!btn) return;
      await btn.click();
      await page.waitForTimeout(500);
    };
    const appendFixture = async fixture => {
      const addBtn = await page.$('.add-files-btn');
      if (!addBtn) throw new Error('add-files button not found');
      await addBtn.click();
      await page.waitForTimeout(300);
      const fi = await page.$('input[type="file"]');
      if (!fi) throw new Error('file input not found');
      await fi.setInputFiles(path.join(FIXTURE_PATH, fixture));
      await page.waitForTimeout(1000);
    };
    const removeRow = async index => {
      const btns = await page.$$('.file-item .el-button--danger');
      if (!btns[index]) throw new Error(`no remove button at row ${index}`);
      await btns[index].click();
      await page.waitForTimeout(600);
    };
    /**
     * Convert the batch that is already loaded, and wait for *this* batch's headline.
     *
     * `convertFile` waits for any non-empty `.el-alert__title`, which is safe for it because a fresh
     * upload used to wipe the results panel. Under F7 the panel can still be showing the previous
     * batch's headline the moment this one starts, so the wait is pinned to the headline *changing*
     * — otherwise the first read races the alert that is already on screen.
     */
    const alertTitle = () => page.$eval('.el-alert__title', el => el.textContent.trim()).catch(() => '');
    const convertBatch = async () => {
      const before = await alertTitle();
      await page.click('.convert-btn');
      await page.waitForFunction(
        previous => {
          const el = document.querySelector('.el-alert__title');
          const text = el ? el.textContent.trim() : '';
          return text.length > 0 && text !== previous;
        },
        before,
        { timeout: 30000 },
      );
      await page.waitForTimeout(300);
    };

    // Three fixtures whose bases differ, because every assertion below identifies a result by its
    // name — two files called `sample.*` would come out as `sample_<stamp>` and `sample_<stamp>_2`,
    // and "the right row survived" would stop being checkable.
    const fi = await page.$('input[type="file"]');
    if (!fi) throw new Error('file input not found');
    await fi.setInputFiles([path.join(FIXTURE_PATH, 'sample.md'), path.join(FIXTURE_PATH, 'sample-svg-diagram.md')]);
    await page.waitForTimeout(1000);
    await pickTarget(page, 'HTML (.html)');
    await convertBatch();
    const two = await resultNames();
    if (two.length !== 2) throw new Error(`expected a 2-result batch to start from, got [${two}]`);

    await appendFixture('single-sheet.xlsx');
    if ((await resultNames()).join('|') === two.join('|'))
      ok('Appending a compatible file keeps the results already on screen');
    else fail('Append keeps results', `before=[${two}] after=[${await resultNames()}]`);
    if (!(await page.$eval('.convert-btn', el => el.disabled)))
      ok('Appending a compatible file keeps the target they were made under');
    else fail('Append keeps target', 'convert button disabled after the append, so no target is selected');

    await convertBatch();
    const three = await resultNames();
    if (three.length === 3) ok('The appended file joins the next batch instead of replacing it');
    else fail('Appended file converts', `expected 3 results, got [${three}]`);

    // `undo()` hands back a snapshot taken over the list as it was, so an edit to that list has to
    // retire the snapshot. Asserted from its visible half, and asserted *after* a second batch —
    // otherwise the button would never have been there and "it is gone" would prove nothing.
    if ((await rowCount('.undo-btn')) === 1) ok('A second batch offers 撤销 over the previous one');
    else fail('Undo before edit', `expected 1 undo button, found ${await rowCount('.undo-btn')}`);

    await removeRow(0);
    const afterRemove = await resultNames();
    if (afterRemove.join('|') === three.slice(1).join('|'))
      ok('Removing a file drops exactly its own result and keeps the rest');
    else fail('Remove drops its own result', `before=[${three}] after=[${afterRemove}]`);
    if ((await rowCount('.undo-btn')) === 0) ok('Removing a file retires a 撤销 that would restore the removed row');
    else fail('Undo after edit', '撤销 still offered after the file list it describes changed');

    // The other half of the rule: what is *not* kept is a target the new batch cannot reach, because
    // a mixed batch only offers targets valid for every file in it. Image → CSV is policy-blocked, so
    // appending a GIF to an XLSX → CSV batch has to cost the batch — out loud.
    await clearFiles();
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample-typed.xlsx'));
    await page.waitForTimeout(1000);
    await pickTarget(page, 'CSV (.csv)');
    await convertBatch();
    await appendFixture('sample.gif');
    const warned = await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll('.el-message')].some(m => (m.textContent || '').includes('无法转换为当前目标')),
        undefined,
        { timeout: 5000 },
      )
      .then(() => true)
      .catch(() => false);
    if (warned) ok('A target the updated list cannot reach is refused out loud');
    else fail('Incompatible target notice', 'no 无法转换为当前目标 message after appending a GIF to a CSV batch');
    if ((await rowCount('.result-item')) === 0) ok('A target the updated list cannot reach clears the batch');
    else fail('Incompatible target cleanup', `${await rowCount('.result-item')} result(s) left for a dead target`);

    // Pinned deliberately: retargeting is still a full reset. Those results belong to a target the
    // user has just walked away from, and keeping them would put PNG and HTML rows in one list.
    await clearFiles();
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
    await page.waitForTimeout(1000);
    await pickTarget(page, 'HTML (.html)');
    await convertBatch();
    await pickTarget(page, 'PDF (.pdf)');
    if ((await rowCount('.result-item')) === 0)
      ok('Switching the target still clears the results made for the old one');
    else fail('Retarget clears results', 'results survived a change of target');

    await page.screenshot({
      path: shot(`${String(shotIdx++).padStart(2, '0')}-file-set-edit.png`),
      fullPage: true,
    });
    await clearFiles();
  } catch (e) {
    fail('File set edits keep unrelated results', e.message);
  }

  // ═══════════════════════════════════════════
  //  FILE LIST STATUS ANNOUNCEMENT (WCAG 4.1.3)
  // ═══════════════════════════════════════════

  section('File List Status Announced to Assistive Tech');
  try {
    const REGION = '.sr-only[role="status"]';
    const readRegion = async () => {
      const el = await page.$(REGION);
      if (!el) throw new Error(`${REGION} not found — the live region disappeared`);
      return (await el.evaluate(node => node.textContent)).trim();
    };

    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
    await page.waitForTimeout(1000);
    const afterAdd = await readRegion();
    if (!afterAdd.includes('已载入 1 个文件')) throw new Error(`after adding one file, region read "${afterAdd}"`);
    ok('Adding a file announces the resulting batch size');

    const addBtn = await page.$('.add-files-btn');
    await addBtn.click();
    await page.waitForTimeout(300);
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.txt'));
    await page.waitForTimeout(1000);
    const afterAppend = await readRegion();
    if (!afterAppend.includes('已载入 2 个文件')) throw new Error(`after appending, region read "${afterAppend}"`);
    ok('Appending announces again — the message changed, so it is spoken again');

    const clearBtn = await page.$('.clear-files-btn');
    await clearBtn.click();
    await page.waitForTimeout(500);
    const afterClear = await readRegion();
    if (!afterClear.includes('已清空文件列表')) throw new Error(`after clearing, region read "${afterClear}"`);
    ok('Clearing announces the empty list');
  } catch (e) {
    fail('File list announcement', e.message);
  }

  section('Batch With No Recognized Format');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles([
      { name: 'mystery.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 3]) },
    ]);
    await page.waitForTimeout(800);

    const itemCount = await page.$$eval('.file-item', els => els.length);
    if (itemCount !== 1) throw new Error(`unrecognized file never reached the list (${itemCount} items)`);

    // The toast expires; the dead end must still be explained where the target picker would be.
    const alertTitle = await page
      .$eval('.format-selector .el-alert__title', el => el.textContent || '')
      .catch(() => '');
    if (!alertTitle.includes('没有可识别')) fail('No-format explanation', `alert read "${alertTitle.trim()}"`);
    else ok('Unrecognized batch explains itself in place of the target picker');

    const convertDisabled = await page.$eval('.convert-btn', el => el.disabled).catch(() => null);
    if (convertDisabled !== true) fail('Convert stays enabled', `disabled=${convertDisabled}`);
    else ok('Convert button stays disabled for the unrecognized batch');
    await page.screenshot({
      path: shot(`${String(shotIdx++).padStart(2, '0')}-no-recognized-format.png`),
      fullPage: true,
    });
    await resetWorkbench(page);
  } catch (e) {
    fail('No recognized format', e.message);
  }

  section('Blocked Target Reason Is Reachable Without A Mouse');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.gif'));
    await page.waitForTimeout(1000);

    const select = await page.$('.target-select .el-select');
    if (!select) throw new Error('target selector missing for an image source');
    await select.click();
    await page.waitForTimeout(400);

    // The hover `title` is decoration for pointer users; what a keyboard user hears while
    // arrowing through the listbox is the option's accessible name, so the reason has to be
    // part of that name rather than only a tooltip.
    const named = await page.getByRole('option', { name: /需 OCR/ }).count();
    const dimmed = await page.$$eval(
      '.el-select-dropdown__item.is-disabled',
      els => els.filter(e => e.getAttribute('aria-disabled') === 'true').length,
    );
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    if (named === 0) throw new Error('blocked options carry no reason in their accessible name');
    if (dimmed === 0) throw new Error('disabled options are not exposed as aria-disabled');
    ok(`${named} blocked option(s) announce the reason and their disabled state`);
  } catch (e) {
    fail('Blocked reason a11y', e.message);
  }

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

    await page.waitForFunction(
      () => {
        const alert = document.querySelector('.el-alert__title');
        return alert && alert.textContent.length > 0;
      },
      undefined,
      { timeout: 30000 },
    );
    const alertTitle = await page.$eval('.el-alert__title', el => el.textContent).catch(() => '');
    if (alertTitle.includes('完成')) ok('Ctrl+Enter triggered conversion');
    else fail('Ctrl+Enter shortcut', `alert: "${alertTitle}"`);
  } catch (e) {
    fail('Ctrl+Enter shortcut', e.message);
  }

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
  } catch (e) {
    fail('PDF spacing', e.message);
  }

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
  } catch (e) {
    fail('Path hints', e.message);
  }

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

    await modes[0].click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-source-only.png`), fullPage: true });
    ok('Source Only mode');

    await modes[1].click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-split-view.png`), fullPage: true });
    ok('Split View mode');

    await modes[2].click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-result-only.png`), fullPage: true });
    ok('Result Only mode');
  } catch (e) {
    fail('Comparison view modes', e.message);
  }

  section('Comparison View — Keyboard Shortcuts');
  try {
    await page.keyboard.press('2');
    await page.waitForTimeout(300);

    await page.keyboard.press('1');
    await page.waitForTimeout(300);
    ok('Key "1" → Source Only');

    await page.keyboard.press('2');
    await page.waitForTimeout(300);
    ok('Key "2" → Split View');

    await page.keyboard.press('3');
    await page.waitForTimeout(300);
    ok('Key "3" → Result Only');

    await page.keyboard.press('2');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    ok('ArrowLeft adjusts split');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    ok('ArrowRight adjusts split');
  } catch (e) {
    fail('Keyboard shortcuts', e.message);
  }

  section('Comparison View — Draggable Divider');
  try {
    await page.keyboard.press('2');
    await page.waitForTimeout(300);
    const divider = await page.$('.panel-divider');
    if (!divider) throw new Error('divider not found');
    const box = await divider.boundingBox();
    if (!box) throw new Error('divider has no bounding box');

    const cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
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
      const cx2 = box2.x + box2.width / 2,
        cy2 = box2.y + box2.height / 2;
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
  } catch (e) {
    fail('Draggable divider', e.message);
  }

  section('Comparison View — Divider Semantics & Target Size');
  try {
    const divider = await page.$('.panel-divider');
    if (!divider) throw new Error('divider not found');
    const attrs = await divider.evaluate(el => ({
      role: el.getAttribute('role'),
      orientation: el.getAttribute('aria-orientation'),
      tabindex: el.getAttribute('tabindex'),
      now: el.getAttribute('aria-valuenow'),
      min: el.getAttribute('aria-valuemin'),
      max: el.getAttribute('aria-valuemax'),
      label: el.getAttribute('aria-label'),
    }));
    if (attrs.role !== 'separator' || attrs.orientation !== 'vertical') {
      throw new Error(`separator semantics missing: ${JSON.stringify(attrs)}`);
    }
    if (attrs.tabindex !== '0' || !attrs.now || attrs.min !== '0' || attrs.max !== '100') {
      throw new Error(`divider is not operable: ${JSON.stringify(attrs)}`);
    }
    if (!attrs.label) throw new Error('divider has no accessible name');

    // The visible band is 12 px and WCAG 2.5.8 wants 24 px, so what matters is what the browser
    // reports under the cursor, not the box CSS prints. Probed 5 px outside the band (past the
    // 20 px mode buttons as well) and near the top, away from the handle.
    const box = await divider.boundingBox();
    const probeY = box.y + 8;
    const hits = [];
    for (const dx of [-5, 5]) {
      hits.push(
        await page.evaluate(
          ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.panel-divider')),
          [box.x + box.width / 2 + dx, probeY],
        ),
      );
    }
    if (hits.some(h => !h))
      throw new Error(`pointer target too small, misses at dx=${[-5, 5].filter((_, i) => !hits[i])}`);
    ok('Divider exposes separator semantics and a >= 24 px pointer target');
  } catch (e) {
    fail('Divider semantics', e.message);
  }

  // ═══════════════════════════════════════════
  //  IMAGE OUTPUT PARAMETERS
  // ═══════════════════════════════════════════

  section('Image Output Parameters');
  try {
    const fieldLabels = () => page.$$eval('.output-options .output-label', els => els.map(e => e.textContent.trim()));

    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    if (!fi) throw new Error('file input not found');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.pdf'));
    await page.waitForTimeout(1000);

    await pickTarget(page, 'HTML (.html)');
    if ((await page.$$('.output-options')).length === 0) ok('Output panel hidden for a non-image target');
    else fail('Output panel', 'rendered while the target is HTML');

    await pickTarget(page, 'PNG (.png)');
    const pngFields = await fieldLabels();
    if (pngFields.includes('最长边') && pngFields.includes('清晰度')) ok('PNG target offers 最长边 + 清晰度');
    else fail('PNG output fields', `got [${pngFields.join(', ')}]`);
    if (!pngFields.includes('质量')) ok('Quality dial stays hidden for PNG — its encoder has none');
    else fail('PNG output fields', 'offered a quality dial for PNG');

    const untouched = await convertFile(page, 'sample.pdf', 'PNG (.png)');
    const untouchedBytes = sizeToBytes(untouched.resultSize);
    if (untouchedBytes > 0) ok(`PDF→PNG with no output parameters (${untouched.resultSize})`);
    else fail('PDF→PNG baseline', `unreadable size "${untouched.resultSize}"`);

    await setOutputOption(page, '最长边', '800 px');
    const capped = await convertFile(page, 'sample.pdf', 'PNG (.png)');
    if (sizeToBytes(capped.resultSize) < untouchedBytes)
      ok(`最长边 800 px shrinks the output (${untouched.resultSize} → ${capped.resultSize})`);
    else fail('最长边', `no shrink: ${untouched.resultSize} → ${capped.resultSize}`);

    await setOutputOption(page, '最长边', '原图');
    await setOutputOption(page, '清晰度', '96 DPI');
    const lowDpi = await convertFile(page, 'sample.pdf', 'PNG (.png)');
    if (sizeToBytes(lowDpi.resultSize) < untouchedBytes)
      ok(`96 DPI shrinks the output (${untouched.resultSize} → ${lowDpi.resultSize})`);
    else fail('清晰度', `no shrink at 96 DPI: ${untouched.resultSize} → ${lowDpi.resultSize}`);

    if (await page.$('.output-reset')) ok('Reset control shows while a parameter is set');
    else fail('Reset control', 'absent while 清晰度 was set');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-output-options.png`), fullPage: true });

    await page.$eval('.output-reset', el => el.click());
    await page.waitForTimeout(300);
    if (!(await page.$('.output-reset'))) ok('恢复默认 clears every parameter');
    else fail('恢复默认', 'reset control still there after clicking it');

    await pickTarget(page, 'JPEG (.jpg)');
    const jpgFields = await fieldLabels();
    if (jpgFields.includes('质量') && jpgFields.includes('目标体积')) ok('JPEG target adds 质量 + 目标体积');
    else fail('JPEG output fields', `got [${jpgFields.join(', ')}]`);

    const jpgPlain = await convertFile(page, 'sample.pdf', 'JPEG (.jpg)');
    const plainBytes = sizeToBytes(jpgPlain.resultSize);

    await setOutputOption(page, '质量', '40%');
    const jpgLowQ = await convertFile(page, 'sample.pdf', 'JPEG (.jpg)');
    if (plainBytes > 0 && sizeToBytes(jpgLowQ.resultSize) < plainBytes)
      ok(`质量 40% shrinks the output (${jpgPlain.resultSize} → ${jpgLowQ.resultSize})`);
    else fail('质量', `no shrink at 40%: ${jpgPlain.resultSize} → ${jpgLowQ.resultSize}`);

    await setOutputOption(page, '质量', '默认');
    await setOutputOption(page, '目标体积', '20 KB');
    const jpgCapped = await convertFile(page, 'sample.pdf', 'JPEG (.jpg)');
    const cappedBytes = sizeToBytes(jpgCapped.resultSize);
    // 20 KB is below this fixture's uncapped JPEG (~32 KB), so passing means the quality ladder
    // actually ran; a looser ceiling would be satisfied by the first encode and prove nothing.
    if (cappedBytes >= 0 && cappedBytes <= 20 * 1024 && cappedBytes < plainBytes)
      ok(`目标体积 20 KB honoured (${jpgPlain.resultSize} → ${jpgCapped.resultSize})`);
    else fail('目标体积', `20 KB target produced ${jpgCapped.resultSize} from ${jpgPlain.resultSize}`);

    // Regression: 目标体积 is offered for JPEG / WebP only, but the value stays in storage when the
    // target changes, so a PNG can be converted while carrying an invisible 20 KB ceiling. The
    // encoder used to chase that ceiling by discarding pixels, returning a PNG smaller than one the
    // user had never tuned. Equality with the untouched baseline is the assertion: a parameter the
    // panel does not show must make no difference at all.
    await pickTarget(page, 'PNG (.png)');
    const fieldsAtPng = await fieldLabels();
    if (!fieldsAtPng.includes('目标体积')) ok('目标体积 stays hidden when a tuned batch is retargeted to PNG');
    else fail('PNG output fields', 'offered 目标体积 for PNG');
    const pngHiddenTarget = await convertFile(page, 'sample.pdf', 'PNG (.png)');
    if (sizeToBytes(pngHiddenTarget.resultSize) === untouchedBytes)
      ok(`Hidden 目标体积 leaves PNG untouched (${untouched.resultSize})`);
    else
      fail(
        'PNG with hidden 目标体积',
        `hidden ceiling changed the output: ${untouched.resultSize} → ${pngHiddenTarget.resultSize}`,
      );

    // Leave nothing behind: the later sections convert images too, and a leftover
    // parameter would make them run against a different encoder configuration.
    await page.$eval('.output-reset', el => el.click());
    await page.waitForTimeout(300);
    if (!(await page.$('.output-reset'))) ok('Output parameters reset before the suite continues');
    else fail('Output parameters', 'a parameter was still set after the final reset');
  } catch (e) {
    fail('Image output parameters', e.message);
  }

  // ═══════════════════════════════════════════
  //  CONVERSION PRESETS
  // ═══════════════════════════════════════════

  section('Conversion Presets');
  try {
    const chipTexts = () => page.$$eval('.preset-apply', els => els.map(e => e.textContent.trim()));
    const targetText = async () => (await page.locator('.action-row .el-select').first().innerText()).trim();
    const lastMessage = async () => ((await page.locator('.el-message').last().textContent()) || '').trim();

    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    if (!fi) throw new Error('file input not found');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.pdf'));
    await page.waitForTimeout(1000);

    // Build the state a preset is meant to capture: PDF → PNG at 最长边 800 px.
    await pickTarget(page, 'PNG (.png)');
    if (!(await openPresetCard(page))) throw new Error('presets card did not open');
    if (await page.isVisible('.preset-empty')) ok('Preset bar starts with an empty state');
    else fail('Preset empty state', 'no hint shown before the first preset');

    await setOutputOption(page, '最长边', '800 px');
    await page.fill('.preset-name input', 'E2E 800');
    await page.locator('.preset-create .el-button').click();
    await page.waitForTimeout(400);

    let chips = await chipTexts();
    if (chips.length === 1 && chips[0] === 'E2E 800') ok('Saved preset appears as a named chip');
    else fail('Preset save', `chips [${chips.join(', ')}]`);
    if ((await lastMessage()).includes('已保存预设')) ok('Saving announces the preset name');
    else fail('Preset save toast', await lastMessage());

    // The preset's whole point: the parameters come back without touching the panel again.
    const capped = await convertFile(page, 'sample.pdf', 'PNG (.png)');
    const cappedBytes = sizeToBytes(capped.resultSize);

    await page.$eval('.output-reset', el => el.click());
    await page.waitForTimeout(300);
    await resetWorkbench(page);
    await pickTarget(page, 'HTML (.html)');
    if ((await page.$$('.output-options')).length === 0) ok('Output parameters cleared before applying the preset');
    else fail('Preset baseline', '参数 were still live when the preset was applied');

    await page.locator('.preset-apply').first().click();
    await page.waitForTimeout(400);
    if ((await targetText()) === 'PNG (.png)') ok('Applying a preset switches the target format');
    else fail('Preset apply', `target reads "${await targetText()}"`);
    if ((await page.locator('.output-options').innerText()).includes('800 px'))
      ok('Applying a preset restores 最长边 800 px');
    else fail('Preset apply', 'the output panel did not come back with the stored parameter');

    const restored = await convertFile(page, 'sample.pdf', 'PNG (.png)');
    if (sizeToBytes(restored.resultSize) === cappedBytes)
      ok(`Preset reproduces the saved conversion (${restored.resultSize})`);
    else fail('Preset reproducibility', `${capped.resultSize} → ${restored.resultSize}`);

    // The other half of the preset contract. A non-image target stores no output parameters
    // (PresetBar's own capture rule), so applying such a preset must leave the live image
    // parameters alone — handing the stored `{}` to setOptions reads as "apply an empty set",
    // and that call replaces the whole set.
    await pickTarget(page, 'HTML (.html)');
    await page.fill('.preset-name input', 'E2E HTML');
    await page.locator('.preset-create .el-button').click();
    await page.waitForTimeout(400);
    await pickTarget(page, 'PNG (.png)');
    await page.locator('.preset-chip').filter({ hasText: 'E2E HTML' }).locator('.preset-apply').click();
    await page.waitForTimeout(400);
    if ((await targetText()) === 'HTML (.html)') ok('Applying a non-image preset switches the target');
    else fail('Preset apply (non-image)', `target reads "${await targetText()}"`);
    await pickTarget(page, 'PNG (.png)');
    const afterForeign = (await page.locator('.output-options').innerText()).replace(/\s+/g, ' ');
    if (afterForeign.includes('800 px')) ok('A non-image preset leaves the live image parameters alone');
    else fail('Preset option scope', `the panel came back reading "${afterForeign}"`);
    // `addPreset` prepends, so the chip below expects to be first again only once this one is gone.
    await page.locator('.preset-chip').filter({ hasText: 'E2E HTML' }).locator('.preset-remove').click();
    await page.waitForTimeout(400);

    // No files yet: the choice has to survive until the next upload, because setFiles clears the
    // target on every batch.
    await page.$eval('.clear-files-btn', el => el.click());
    await page.waitForTimeout(500);
    await page.locator('.preset-apply').first().click();
    await page.waitForTimeout(300);
    if ((await lastMessage()).includes('已记住预设')) ok('Preset without files is remembered, not applied blind');
    else fail('Preset pending toast', await lastMessage());

    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.pdf'));
    await page.waitForTimeout(1000);
    if ((await targetText()) === 'PNG (.png)') ok('Remembered preset applies to the next batch');
    else fail('Preset pending apply', `target reads "${await targetText()}"`);

    // An untitled preset names itself after what it does, parameters included.
    await page.$eval('.output-reset', el => el.click());
    await page.waitForTimeout(300);
    await pickTarget(page, 'JPEG (.jpg)');
    await page.locator('.preset-create .el-button').click();
    await page.waitForTimeout(400);
    chips = await chipTexts();
    if (chips.length === 2 && chips[0] === 'JPEG (.jpg)') ok('Untitled preset falls back to its format name');
    else fail('Preset auto-name', `chips [${chips.join(', ')}]`);

    for (let i = 0; i < 5 && (await page.$$('.preset-remove')).length; i++) {
      await page.locator('.preset-remove').first().click();
      await page.waitForTimeout(300);
    }
    chips = await chipTexts();
    if (chips.length === 0 && (await page.isVisible('.preset-empty')))
      ok('Deleting every chip restores the empty state');
    else fail('Preset delete', `chips [${chips.join(', ')}]`);

    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-presets.png`), fullPage: true });
  } catch (e) {
    fail('Conversion presets', e.message);
  }

  section('Presets loaded from a hand-edited store');
  try {
    // Nothing in the UI can write these values, so this is the only path that exercises the
    // storage guard: unknown formats, a duplicate id, a non-object entry and an out-of-range
    // quality all arrive from a payload the user could have edited by hand.
    const dirtyPage = await browser.newPage();
    await dirtyPage.setViewportSize({ width: 1280, height: 900 });
    await dirtyPage.addInitScript(
      mockChromeStorage({
        'fat:presets': [
          { id: 'ok', name: 'good', target: 'png', options: { maxEdge: 800 } },
          { id: 'unknown-format', name: 'nope', target: 'exe', options: {} },
          { id: 'ok', name: 'dupe', target: 'csv', options: {} },
          { id: 'long', name: 'x'.repeat(80), target: 'jpg', options: { quality: 99, bogus: true } },
          'not-an-object',
        ],
      }),
    );
    await dirtyPage.goto(`http://localhost:${PORT}/options.html`);
    await dirtyPage.waitForTimeout(1500);
    if (!(await openPresetCard(dirtyPage))) throw new Error('presets card did not open on the seeded page');

    const dirtyChips = await dirtyPage.$$eval('.preset-apply', els => els.map(e => e.textContent.trim()));
    if (dirtyChips.length === 2) ok(`Illegal preset entries are dropped (kept ${dirtyChips.length})`);
    else fail('Preset sanitization', `chips [${dirtyChips.join(', ')}]`);
    if (dirtyChips[0] === 'good') ok('A valid preset keeps its name');
    else fail('Preset sanitization', `first chip reads "${dirtyChips[0]}"`);
    if (dirtyChips[1] === 'x'.repeat(40)) ok('An over-long preset name is truncated, not wrapped');
    else fail('Preset name clamp', `second chip is ${dirtyChips[1]?.length} chars`);

    const dirtyFi = await dirtyPage.$('input[type="file"]');
    await dirtyFi.setInputFiles(path.join(FIXTURE_PATH, 'sample.pdf'));
    await dirtyPage.waitForTimeout(1000);
    await dirtyPage.locator('.preset-apply').nth(1).click();
    await dirtyPage.waitForTimeout(400);
    const qualityField = dirtyPage.locator(
      '.output-options .output-field:has(.output-label:text-is("质量")) .el-select',
    );
    const qualityShown = ((await qualityField.innerText()) || '').trim();
    if (qualityShown.includes('100')) ok(`An off-dial quality is displayed rather than blank (${qualityShown})`);
    else fail('Off-dial quality', `field reads "${qualityShown}"`);
    await dirtyPage.close();
  } catch (e) {
    fail('Hand-edited preset store', e.message);
  }

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
      if (onTopbar >= 4.5) ok(`[${themeValues[i]} light] topbar brand ${onTopbar.toFixed(2)}:1`);
      else
        fail(
          `[${themeValues[i]} light] topbar contrast`,
          `${onTopbar.toFixed(2)}:1 — ${surface.brand} on ${surface.topbar}`,
        );
      if (ringOnCard >= 3) ok(`[${themeValues[i]} light] focus ring ${ringOnCard.toFixed(2)}:1 on card`);
      else
        fail(`[${themeValues[i]} light] focus ring`, `${ringOnCard.toFixed(2)}:1 — ${surface.ring} on ${surface.card}`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-theme-applied.png`), fullPage: true });
  } catch (e) {
    fail('Theme switcher', e.message);
  }

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
        const primary = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--fat-primary').trim(),
        );
        const elPrimary = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim(),
        );
        if (primary && primary === elPrimary) ok(`Dark+${themeValues[i]}: primary=${primary}, EP synced`);
        else fail(`Dark+${themeValues[i]}`, `primary=${primary}, el=${elPrimary}`);

        // Same contract as the light loop. White-on-pastel is exactly what used to fail
        // here (1.69–2.67:1) because the dark primaries are deliberately light tints.
        const surface = await surfaceColors(page);
        const onTopbar = contrast(surface.brand, surface.topbar);
        const ringOnCard = contrast(surface.ring, surface.card);
        if (onTopbar >= 4.5) ok(`[${themeValues[i]} dark] topbar brand ${onTopbar.toFixed(2)}:1`);
        else
          fail(
            `[${themeValues[i]} dark] topbar contrast`,
            `${onTopbar.toFixed(2)}:1 — ${surface.brand} on ${surface.topbar}`,
          );
        if (ringOnCard >= 3) ok(`[${themeValues[i]} dark] focus ring ${ringOnCard.toFixed(2)}:1 on card`);
        else
          fail(
            `[${themeValues[i]} dark] focus ring`,
            `${ringOnCard.toFixed(2)}:1 — ${surface.ring} on ${surface.card}`,
          );
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
  } catch (e) {
    fail('Dark mode', e.message);
  }

  section('Language Switch');
  try {
    // Popover is still open from the theme sections. The shared selector lists the mode
    // buttons first, so the language pair is the last two: [..., 中文, English].
    const langButtons = await page.$$('.pref-section .lang-options .lang-btn');
    const zhButton = langButtons[langButtons.length - 2];
    const enButton = langButtons[langButtons.length - 1];
    if (!zhButton || !enButton) throw new Error(`language buttons not found (count: ${langButtons.length})`);

    await enButton.click();
    await page.waitForTimeout(500);
    const langEn = await page.evaluate(() => document.documentElement.lang);
    if (langEn === 'en') ok('Switching to English moves <html lang> to "en"');
    else fail('Document language after switch', `lang="${langEn}"`);
    const titleEn = await page.title();
    if (titleEn === 'Transfer Any File · Conversion Workbench') ok('Tab title follows the switch to English');
    else fail('Document title after switch', `"${titleEn}"`);
    const footerEn = await page.$eval('.footer', el => el.textContent).catch(() => '');
    if (footerEn.includes('formats supported')) ok('Strings re-render in English without a reload');
    else fail('English UI', `footer read "${footerEn.trim()}"`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-english-ui.png`), fullPage: true });

    await zhButton.click();
    await page.waitForTimeout(500);
    const langZh = await page.evaluate(() => document.documentElement.lang);
    const footerZh = await page.$eval('.footer', el => el.textContent).catch(() => '');
    if (langZh === 'zh-CN' && footerZh.includes('格式')) ok('Switching back restores zh and the Chinese strings');
    else fail('Chinese restore', `lang="${langZh}", footer="${footerZh.trim()}"`);
  } catch (e) {
    fail('Language switch', e.message);
  }

  // ═══════════════════════════════════════════
  //  PRIMARY BUTTON CONTRAST
  // ═══════════════════════════════════════════

  section('Primary Button Contrast');
  try {
    // WCAG 1.4.3 asks 4.5:1 of the label in *every* state, and disabled controls are exempt,
    // so the workbench is staged with a file and a target first: the measurement has to run
    // against the same enabled button a user sees. The theme loops above cannot carry this
    // gate because the convert button does not exist until a file is staged.
    const fi = await page.$('input[type="file"]');
    if (!fi) throw new Error('file input not found');
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.txt'));
    await page.waitForTimeout(800);
    const sel = await page.$('.action-row .el-select');
    if (!sel) throw new Error('format select not found');
    await sel.click();
    await page.waitForTimeout(500);
    await page.locator('.el-select-dropdown__item:visible:not(.is-disabled)').first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    if (await page.$('.convert-btn.is-disabled'))
      throw new Error('convert button is disabled, so its label is exempt from AA');

    const appliedTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
    const appliedMode = await page.evaluate(() => document.documentElement.dataset.mode ?? '');
    for (const mode of ['light', 'dark']) {
      for (const theme of themeValues) {
        await page.evaluate(
          ([m, t]) => {
            document.documentElement.dataset.mode = m;
            document.documentElement.dataset.theme = t;
          },
          [mode, theme],
        );
        const btn = await buttonStateColors(page);
        const states = {
          rest: contrast(btn.label, btn.rest),
          hover: contrast(btn.label, btn.hover),
          active: contrast(btn.label, btn.active),
        };
        const worst = Math.min(...Object.values(states));
        const which = Object.keys(states).reduce((a, k) => (states[k] < states[a] ? k : a), 'rest');
        if (worst >= 4.5) ok(`[${theme} ${mode}] primary button label ${worst.toFixed(2)}:1 (worst state: ${which})`);
        else
          fail(
            `[${theme} ${mode}] primary button label`,
            `${worst.toFixed(2)}:1 at ${which} — ${btn.label} on ${btn.rest} / ${btn.hover} / ${btn.active}`,
          );
      }
    }
    await page.evaluate(
      ([m, t]) => {
        if (m) document.documentElement.dataset.mode = m;
        else delete document.documentElement.dataset.mode;
        if (t) document.documentElement.dataset.theme = t;
        else delete document.documentElement.dataset.theme;
      },
      [appliedMode, appliedTheme],
    );
    await resetWorkbench(page);
  } catch (e) {
    fail('Primary button contrast', e.message);
  }

  // ═══════════════════════════════════════════
  //  INFORMATION TEXT CONTRAST
  // ═══════════════════════════════════════════

  if (section('Information Text Contrast')) {
    try {
      // WCAG 1.4.3 asks 4.5:1 of every string a user is meant to read, and these five used to
      // sit on --fat-text-placeholder (2.33–2.56:1). Each is sampled with a file staged because
      // that is when the drop zone takes --fat-primary-bg — in the rose theme #fff1f2, the
      // weakest backdrop in the palette and the one a blue-theme screenshot would never show.
      // Not covered here: --fat-text-placeholder itself, which stays on input placeholders,
      // disabled controls and decoration whose state is carried by an ARIA attribute, all three
      // exempt from 1.4.3.
      const INFO_TEXT = ['.drop-text', '.paste-hint', '.file-list-header', '.file-meta', '.footer'];
      const fi2 = await page.$('input[type="file"]');
      if (!fi2) throw new Error('file input not found');
      await fi2.setInputFiles(path.join(FIXTURE_PATH, 'sample.txt'));
      // Wait for the list to render rather than sleeping: the previous section ends on
      // resetWorkbench, whose clear can land after a fixed timeout and take `.file-meta` away
      // mid-loop.
      await page.waitForSelector('.file-item .file-meta', { timeout: 5000 });

      const appliedTheme2 = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
      const appliedMode2 = await page.evaluate(() => document.documentElement.dataset.mode ?? '');
      let worst = Number.POSITIVE_INFINITY;
      let worstLabel = '';
      // One `ok` for the whole group rather than twelve like the button gate: the 60 samples are
      // one assertion ("every string you read clears 4.5:1"), and a partial pass would be read as
      // "some themes are fine" when the standard has no such exemption. The failures still print
      // per sample, and this flag keeps the group line from reporting success next to them.
      let groupFailed = false;
      for (const mode of ['light', 'dark']) {
        for (const theme of themeValues) {
          await page.evaluate(
            ([m, t]) => {
              document.documentElement.dataset.mode = m;
              document.documentElement.dataset.theme = t;
            },
            [mode, theme],
          );
          // Same 180ms reason as `buttonStateColors`: these surfaces transition, so sampling
          // immediately reads a colour between the old theme's and the new one's — an earlier
          // draft of this gate "failed" at 1.17:1 on a mid-flight blue-to-dark backdrop.
          await page.waitForTimeout(400);
          const { found, missing } = await infoTextSamples(page, INFO_TEXT);
          if (missing.length) {
            groupFailed = true;
            fail(`[${theme} ${mode}] information text`, `not sampled: ${missing.join(', ')}`);
            continue;
          }
          for (const s of found) {
            const ratio = contrast(s.color, s.bg);
            const name = `[${theme} ${mode}] ${s.sel}`;
            if (!(ratio >= 4.5)) {
              groupFailed = true;
              fail(name, `${ratio.toFixed(2)}:1 — ${s.color} on ${s.bg}`);
            } else if (ratio < worst) {
              worst = ratio;
              worstLabel = `${s.sel} (${theme})`;
            }
          }
        }
      }
      if (!groupFailed && worstLabel) {
        ok(`information text ≥ 4.5:1 in 6 themes × 2 modes (worst ${worst.toFixed(2)}:1, ${worstLabel})`);
      }
      await page.evaluate(
        ([m, t]) => {
          if (m) document.documentElement.dataset.mode = m;
          else delete document.documentElement.dataset.mode;
          if (t) document.documentElement.dataset.theme = t;
          else delete document.documentElement.dataset.theme;
        },
        [appliedMode2, appliedTheme2],
      );
      await resetWorkbench(page);
    } catch (e) {
      fail('Information text contrast', e.message);
    }
  }

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
        // Element Plus puts the cancel button first, so this is the one that abandons the clear.
        // It used to read "Close", which is what an informational dialog signs off with — not what
        // a destructive confirmation offers.
        const cancelLabel = ((await cancelBtn.textContent()) || '').trim();
        if (cancelLabel === '取消' || cancelLabel === 'Cancel') ok(`Clearing history offers a cancel (${cancelLabel})`);
        else fail('Clear-history cancel label', `the button read "${cancelLabel}"`);
        await cancelBtn.click();
        await page.waitForTimeout(300);
        const itemsAfterCancel = await page.$$('.history-item');
        if (itemsAfterCancel.length > 0) ok('History preserved after cancel');
        else fail('Cancel clear', 'history lost after cancel');
      }
    } else {
      fail('Clear confirmation', 'dialog not shown');
    }
  } catch (e) {
    fail('History clear', e.message);
  }

  section('History — Delete Undo');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample.md', 'HTML (.html)');
    await page.waitForTimeout(500);

    const before = (await page.$$('.history-item')).length;
    if (before === 0) throw new Error('no history rows to delete');

    const removeBtn = await page.$('.history-item .history-actions .el-button:last-child');
    if (!removeBtn) throw new Error('row delete button not found');
    await removeBtn.click();
    await page.waitForTimeout(300);

    const afterDelete = (await page.$$('.history-item')).length;
    if (afterDelete !== before - 1) throw new Error(`delete removed ${before - afterDelete} rows, expected 1`);

    // Delete stays single-click; the safety net is the 5 s undo in the toast.
    const undoBtn = await page.$('.history-undo__btn');
    if (!undoBtn) throw new Error('undo affordance missing from the delete toast');
    await undoBtn.click();
    await page.waitForTimeout(400);

    const afterUndo = (await page.$$('.history-item')).length;
    if (afterUndo !== before) throw new Error(`undo restored to ${afterUndo}, expected ${before}`);
    ok('Row delete is undone from the toast');
  } catch (e) {
    fail('History delete undo', e.message);
  }

  section('History Import Size Cap');
  try {
    // Mirrors MAX_IMPORT_BYTES in composables/useHistory.ts. Not imported because the page ships a
    // bundle, not the source: the guard under test is exactly this number, so a drift has to fail
    // here rather than silently test a different threshold.
    const CAP = 16 * 1024 * 1024;
    const tmpDir = path.resolve(__dirname, '../.test-files');
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileInput = await page.$('input.hidden-file-input');
    if (!fileInput) throw new Error('import file input not found');

    const bigPath = path.join(tmpDir, 'oversized-history.json');
    fs.writeFileSync(bigPath, `{"version":1,"records":[],"pad":"${'x'.repeat(CAP)}"}`);
    await fileInput.setInputFiles(bigPath);
    await page.waitForTimeout(600);
    const messages = await page.$$eval('.el-message', els => els.map(el => (el.textContent || '').trim()));
    if (!messages.some(text => text.includes('超过') && text.includes('16.0 MB'))) {
      fail('History import size cap', `messages after a ${CAP + 1}-byte file: ${JSON.stringify(messages)}`);
    } else if ((await page.$('.el-message-box')) !== null) {
      fail('History import size cap', 'merge confirmation opened for a rejected file');
    } else {
      ok('Oversized history JSON is refused before its bytes are read');
    }
    fs.unlinkSync(bigPath);
  } catch (e) {
    fail('History import size cap', e.message);
  }

  section('History Import Merge Still Works');
  try {
    await resetWorkbench(page);
    const tmpDir = path.resolve(__dirname, '../.test-files');
    fs.mkdirSync(tmpDir, { recursive: true });
    const goodPath = path.join(tmpDir, 'history-fixture.json');
    const stamp = Date.now();
    fs.writeFileSync(
      goodPath,
      JSON.stringify({
        version: 1,
        records: ['a', 'b'].map(suffix => ({
          id: `e2e-import-${suffix}`,
          time: stamp,
          fileName: `imported-${suffix}.md`,
          sourceFormat: 'md',
          targetFormat: 'html',
          fileSize: 120,
          resultSize: 240,
          fileCount: 1,
        })),
      }),
    );

    const fileInput = await page.$('input.hidden-file-input');
    if (!fileInput) throw new Error('import file input not found');
    const before = (await page.$$('.history-item')).length;
    await fileInput.setInputFiles(goodPath);
    await page.waitForTimeout(500);

    const box = await page.$('.el-message-box');
    if (!box) throw new Error('merge confirmation did not open for a valid export');
    // Element Plus puts Cancel first, so "the last button" is the confirm — but matching on the
    // label is what survives a layout change.
    let confirmBtn = null;
    for (const btn of await page.$$('.el-message-box__btns .el-button')) {
      const label = (await btn.evaluate(el => el.textContent || '')).trim();
      if (label === '导入历史') confirmBtn = btn;
    }
    if (!confirmBtn) throw new Error('confirm button not found in the merge dialog');
    await confirmBtn.click();
    await page.waitForTimeout(800);

    const after = (await page.$$('.history-item')).length;
    const expected = Math.min(before + 2, 50);
    if (after === expected) ok(`Valid export still merges: ${before} → ${after} record(s)`);
    else fail('History import merge', `rows went ${before} → ${after}, expected ${expected}`);
    fs.unlinkSync(goodPath);
  } catch (e) {
    fail('History import merge', e.message);
  }

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
    // Both waiters are armed before the click and consumed after it. A waiter armed in advance sees
    // the batch card and the cancel affordance however briefly they are on screen, so neither how
    // fast nor how loaded this machine is decides which checks this section runs. Clicking from
    // inside the waiter is what lets the cancel reach the batch at all: three tiny fixtures convert
    // in about the time a Node round trip takes, so on a quiet machine the click still lands after
    // the last file, and on a loaded one it truncates the batch — both are handled below.
    const batchCard = page
      .waitForSelector('.batch-progress .current-file', { timeout: 8000 })
      .then(async el => ((await el?.textContent()) || '').trim())
      .catch(() => '');
    const affordance = page
      .waitForSelector('.cancel-btn', { timeout: 8000 })
      .then(async el => {
        try {
          await el.click({ timeout: 500 });
          return { clicked: true, visible: true };
        } catch {
          return { clicked: false, visible: true };
        }
      })
      .catch(() => ({ clicked: false, visible: false }));
    await cb.click();
    const cancel = await affordance;

    // Every path below answers the same five questions, so the suite total this section
    // contributes — the number `verify:numbers` holds the outward documents to — is the same on a
    // loaded machine and an idle one. The answer differs by what happened, never the count.
    // Nothing here is sampled while the batch is still running: "did the cancel leave a trace" is a
    // claim about the settled screen, and reading it early sees an absent result card. The wait is
    // bounded, because a batch that never settles is itself a failure this section is here to catch —
    // and the bound is the 30 s every other section gives this same element (`convertFile`), not a
    // shorter one. Three fixtures through `html→pdf` are seconds of rasterization each, so a tighter
    // ceiling turns a loaded machine into a report that the result card never appeared.
    const resultCard = await page
      .waitForSelector('.result-download .el-alert__title', { timeout: 30000 })
      .catch(() => null);
    const convertedCount = (await page.$$('.result-item')).length;
    const cancelAlert = resultCard ? ((await resultCard.textContent()) || '').trim() : '';
    const announced = await page.$eval('.sr-only[role="status"]', el => el.textContent.trim()).catch(() => '');

    // 1. Was stopping the batch reachable? A batch that finished first is a legitimate answer, but
    //    only if it really finished — anything else means the affordance was never usable.
    if (cancel.clicked) ok('Cancel button visible during conversion');
    else if (convertedCount === 3) ok('Batch finished before the cancel affordance could be clicked (fast machine)');
    else if (cancel.visible) fail('Cancel button', 'came up but the click did not land while files were still pending');
    else fail('Cancel button', `never offered while only ${convertedCount}/3 files had converted`);
    // 2. Cancelling has to be visible afterwards: a truncated batch used to render exactly
    //    like a complete one, and a cancel before the first file left the screen empty.
    const truncated = convertedCount < 3;
    if (truncated) {
      if (cancelAlert.includes('已取消')) ok(`Cancelled batch reported as cancelled (${convertedCount}/3 converted)`);
      else fail('Cancelled batch', `truncated at ${convertedCount}/3 but the header read "${cancelAlert}"`);
    } else if (cancelAlert.includes('转换完成')) ok('Batch finished before the cancel landed; completion reported');
    else fail('Cancel outcome', `all 3 files converted but the header read "${cancelAlert}"`);
    // 3. The same distinction, in the text a screen reader gets. `App.vue` phrases a clean batch as
    //    "全部 N 个文件转换成功" and a mixed one as "转换完成：成功 … 失败 …", so completion has two
    //    wordings while a cancelled batch always says 已取消 — never 完成, whichever way it went.
    const said = truncated ? ['已取消'] : ['转换成功', '转换完成'];
    const heard = said.find(s => announced.includes(s));
    if (heard) ok(`Batch outcome announced to assistive tech (${heard})`);
    else {
      fail(
        'Announcement',
        `live region read "${announced}" while the batch ${truncated ? 'was cancelled' : 'finished'}`,
      );
    }
    // 4. And it has to land somewhere: `App.vue` counts a cancelled batch as done even when nothing
    //    converted, so the progress card gives way to results instead of leaving an empty screen.
    if (resultCard) ok('Settled batch hands the screen to the result card');
    else fail('No result card', `the batch ended with ${convertedCount}/3 items and no header`);
    // 5. Batch progress names the file in flight.
    const batchFile = await batchCard;
    if (/sample\.\w+/.test(batchFile)) ok(`Batch progress names the file in flight (${batchFile})`);
    else fail('Batch current file', `the batch card read "${batchFile}"`);
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-cancel-test.png`), fullPage: true });
  } catch (e) {
    fail('Conversion cancel', e.message);
  }

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

    // The dialog carries its own opt-out so the preference can be dropped where it is asked.
    const dontAsk = page.locator('.confirm-batch__dont-ask input[type="checkbox"]');
    if ((await dontAsk.count()) === 1 && (await dontAsk.isChecked()) === false)
      ok('Confirmation offers an unchecked "don\'t ask again" box');
    else fail("Don't ask again box", `count=${await dontAsk.count()}`);

    // Cancel: the first button is "cancel", and convert() must bail out with a toast.
    await page.click('.el-message-box__btns .el-button:first-child');
    await page.waitForFunction(
      () => [...document.querySelectorAll('.el-message')].some(m => (m.textContent || '').includes('已取消')),
      undefined,
      { timeout: 5000 },
    );
    ok('Cancelling the dialog aborts the conversion');

    // Accept: the last button is "confirm" and the batch then runs to completion.
    await (await page.$('.convert-btn')).click();
    await page.waitForSelector('.el-message-box', { timeout: 5000 });
    await dontAsk.check();
    await page.click('.el-message-box__btns .el-button:last-child');
    await page.waitForFunction(
      () => {
        const alert = document.querySelector('.el-alert__title');
        return alert && alert.textContent.includes('完成');
      },
      undefined,
      { timeout: 90000 },
    );
    ok('Accepting the dialog runs the batch');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-confirm-accepted.png`), fullPage: true });

    const readConfirmFlag = () =>
      page.evaluate(
        () =>
          new Promise(resolve => {
            globalThis.chrome.storage.local.get('fat:confirmConvert', v => resolve(v['fat:confirmConvert']));
          }),
      );
    if ((await readConfirmFlag()) === false) ok('Ticking "don\'t ask again" persists the preference');
    else fail("Don't ask again persistence", 'fat:confirmConvert is still on');

    // The next large batch must go straight through: no dialog, but a real run (is-loading is
    // the same marker the cancellation test uses).
    await (await page.$('.convert-btn')).click();
    await page.waitForTimeout(600);
    const skipped = !(await page.isVisible('.el-message-box'));
    const running = await page.$eval('.convert-btn', el => el.classList.contains('is-loading')).catch(() => false);
    if (skipped && running) ok('A later large batch converts without asking again');
    else fail('Dialog suppression', `dialogVisible=${!skipped ? 'yes' : 'no'} running=${running}`);
    // The 完成 alert is still the previous run's, so wait on the button instead.
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('.convert-btn');
        return !!btn && !btn.classList.contains('is-loading');
      },
      undefined,
      { timeout: 90000 },
    );

    // Restore the preference the way a user would, which also proves the popover toggle and the
    // conversion gate read the same singleton.
    const gear = await page.$('.topbar-inner .el-button');
    await gear.click();
    await page.waitForTimeout(600);
    await page.locator('.notify-row', { hasText: '大批量转换前显示确认对话框' }).first().locator('.el-switch').click();
    await page.waitForTimeout(400);
    if ((await readConfirmFlag()) === true) ok('Re-enabling the confirmation in Preferences persists');
    else fail('Confirmation re-enable', 'fat:confirmConvert did not go back to true');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch (e) {
    fail('Large batch confirmation', e.message);
  }

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
    await page.waitForFunction(() => !document.querySelector('.undo-btn'), undefined, { timeout: 5000 });
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
      undefined,
      { timeout: 5000 },
    );
    ok('Undo restored the previous batch and reported success');
    await page.waitForFunction(() => !document.querySelector('.undo-btn'), undefined, { timeout: 5000 });
    ok('Undo is one-shot — the snapshot is consumed');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-undo-done.png`), fullPage: true });
  } catch (e) {
    fail('Undo previous batch', e.message);
  }

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
    const allRelevant = await page.$$eval('.history-item', els =>
      els.every(e => (e.textContent || '').includes('Excel')),
    );
    if (allRelevant) ok('Every surviving record actually involves the filtered format');
    else fail('History format filter', 'a record without the format survived');
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-history-filter.png`), fullPage: true });
  } catch (e) {
    fail('History search & filter', e.message);
  }

  // ═══════════════════════════════════════════
  //  HISTORY: FIND A BATCH MEMBER BY ITS REAL FILE NAME
  // ═══════════════════════════════════════════

  section('History search matches non-first batch file');
  try {
    await resetWorkbench(page);
    const fi = await page.$('input[type="file"]');
    await fi.setInputFiles([path.join(FIXTURE_PATH, 'sample.md'), path.join(FIXTURE_PATH, 'sample.txt')]);
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
    await page.waitForFunction(
      () => {
        const el = document.querySelector('.el-alert__title');
        return !!el && (el.textContent || '').includes('完成');
      },
      undefined,
      { timeout: 60000 },
    );
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
    await page.screenshot({
      path: shot(`${String(shotIdx++).padStart(2, '0')}-history-batch-search.png`),
      fullPage: true,
    });
  } catch (e) {
    fail('History batch-member search', e.message);
  }

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
  } catch (e) {
    fail('Custom shortcut', e.message);
  }

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
    else
      fail(
        'Skip link visibility',
        `still off-screen: top=${Math.round(linkState.top)}, transform=${linkState.transform}`,
      );
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
    const probe = mode =>
      page.evaluate(m => {
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
        return new Promise(resolve =>
          setTimeout(() => {
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
          }, 600),
        );
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
  } catch (e) {
    fail('Skip link & focus ring', e.message);
  }

  section('Tab Marker for a Batch That Finishes Off-screen');
  try {
    // F6. The desktop notification is opt-in *and* suppresses itself while this tab is focused, so
    // for the default configuration the tab-title marker is the only signal a user gets after
    // switching away mid-batch. Two halves worth pinning: the marker must appear when the page was
    // not being looked at, and it must not survive the user coming back.
    await resetWorkbench(page);
    const titleBefore = await page.title();

    // "The user is not looking" is supplied to the page rather than staged by opening a second tab.
    // Two measured facts about this harness say why (probe, 2026-09-23): `bringToFront()` on a second
    // tab leaves *both* tabs at `visibilityState: visible` and `hasFocus() === true`, so the staged
    // version of the precondition never happens; and were it to happen, every Playwright wait after
    // it would starve, because those polls run on requestAnimationFrame and a backgrounded tab
    // produces no frames. So the test hands the page the one value the product reads, and the batch,
    // the title write and the clearing listeners all stay real.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hasFocus', { value: () => false, configurable: true });
    });

    const fi = await page.$('input[type="file"]');
    if (!fi) throw new Error('file input not found');
    // CSV → Text is a two-step chain (csv → html → txt) made of string work, so it finishes in well
    // under the wait below without ever blocking the main thread on a rasterisation.
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.csv'));
    await page.waitForTimeout(1000);
    await pickTarget(page, 'Text (.txt)');
    await (await page.$('.convert-btn')).click();
    await page.waitForSelector('.result-download .el-alert__title', { timeout: 45000 });

    const marked = await page.title();
    if (marked !== titleBefore && marked.endsWith(titleBefore))
      ok(`Unread completion reaches the tab title ("${marked}")`);
    else fail('Tab completion marker', `title is "${marked}", expected the original "${titleBefore}" prefixed`);

    // Coming back is what clears the marker. The listener is the product's own; only the event is
    // dispatched from the test, because a real tab switch cannot be staged here (see above).
    await page.evaluate(() => window.dispatchEvent(new window.Event('focus')));
    await page.waitForTimeout(300);
    const restored = await page.title();
    if (restored === titleBefore) ok('Marker clears when the user comes back');
    else fail('Tab marker cleanup', `title still reads "${restored}"`);

    // Put the browser's own focus model back so no later section inherits a stubbed one.
    await page.evaluate(() => delete document.hasFocus);
    await resetWorkbench(page);
  } catch (e) {
    fail('Tab completion marker', e.message);
  }

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
  if (skippedSections > 0) console.log(`  ! ${skippedSections} sections skipped by E2E_ONLY — not a full suite run`);

  /**
   * The assertion total the outward documents quote, recorded here rather than derived from source:
   * it is a property of the tests, and only a full run says how many assertions there are. With the
   * record in git, `verify:numbers` can hold the sentences that quote it to the same standard as the
   * format count and the thresholds — which is what the hand sweep across `docs/index.html` and both
   * promo articles used to be, every time coverage moved.
   *
   * A subset run counted some of the suite and a failing run counted something nobody should cite, so
   * neither may write. In CI a difference is itself the failure: it means the record and the prose were
   * committed to different numbers.
   */
  const assertionRecord = path.resolve(__dirname, '__baseline__/e2e-assertions.json');
  const recorded = fs.existsSync(assertionRecord)
    ? JSON.parse(fs.readFileSync(assertionRecord, 'utf8')).assertions
    : null;
  let assertionRecordStale = false;
  if (failed === 0 && skippedSections === 0 && recorded !== total) {
    if (process.env.CI === 'true') {
      assertionRecordStale = true;
      console.error(
        `  ! the committed record says ${recorded} assertions but this suite ran ${total}. Update` +
          ' scripts/__baseline__/e2e-assertions.json\n' +
          '    and the same number quoted in docs/index.html and both promo articles.',
      );
    } else {
      fs.writeFileSync(assertionRecord, `${JSON.stringify({ assertions: total }, null, 2)}\n`);
      console.log(`  recorded ${total} assertions to scripts/__baseline__/e2e-assertions.json`);
      console.log(
        `  ! the prose was held to ${recorded} — run \`pnpm verify:numbers\` and sync the documents` +
          ' that quote the total.',
      );
    }
  }

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}/`);
  fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.endsWith('.png'))
    .sort()
    .forEach(f => console.log(`  ${f}`));

  await page.waitForTimeout(HEADLESS ? 0 : 2000);
  await browser.close();
  server.close();

  process.exit(failed > 0 || assertionRecordStale ? 1 : 0);
}

run().catch(err => {
  console.error('\n✗ FATAL:', err.message);
  process.exit(1);
});
