import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';

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

/**
 * Stop a *diagnostic* screenshot from failing the section that took it.
 *
 * Every call site in this suite writes a file for a human to look at and discards the return value —
 * none of them is an assertion. They are also the slowest thing in a run: a full-page capture has to
 * rasterize the whole document, and on 2026-10-17, with the editor holding the machine at load
 * average 11, the renderer sat past the 30 s default *after* printing "fonts loaded". Three of those
 * in one run, each thrown from inside a `try`, meant three sections that stopped before their own
 * cleanup — the popover left open, the locale left English, the staged file left staged — which is
 * how one stall became the twenty-five colour samples and four History failures after it.
 *
 * Only a capture with a `path` is swallowed. One that returns bytes is a measurement, and a
 * measurement that quietly returned nothing is worse than the red it would replace.
 */
function tolerateScreenshotTimeout(target) {
  const capture = target.screenshot.bind(target);
  target.screenshot = options => {
    if (!options || !options.path) return capture(options);
    return capture({ timeout: 20000, ...options }).catch(error => {
      console.log(`  ! screenshot skipped: ${path.basename(options.path)} (${String(error.message).split('\n')[0]})`);
    });
  };
}
function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

/**
 * Uncaught exceptions are the one class of failure the click-and-look assertions below cannot see: the
 * click still lands, the DOM still looks right, and the bug resurfaces two scenarios later as a stale
 * panel or a missing row whose real cause is long gone. Every tab gets the listener, not just the
 * workbench — the preview, folder and template sections each drive their own page.
 *
 * A deliberate `throw` that the app catches never reaches this listener; anything that does is
 * unhandled, so the message is reported as its own failure rather than counted against a scenario.
 */
function trackPageErrors(target) {
  target.on('pageerror', error => fail('Uncaught page error', error.message));
}

/**
 * The two things a failure needs to be actionable, neither of which this suite used to leave behind:
 * which section it happened in (the assertion name alone repeats across the light and dark passes of
 * six themes), and what the page looked like at that instant.
 *
 * `evidencePage` is the main workbench tab, assigned once it exists — before then there is nothing to
 * photograph. Sections that open their own tab (`cardPage`, `folderPage`, …) deliberately do not
 * redirect it: their failures are about the shared page state they were launched from.
 *
 * The screenshot is not awaited. Playwright sends commands over one connection and the browser
 * processes them in send order, so a capture issued here is taken *before* the next section's first
 * click reaches the page — the picture is of the failing moment, not of wherever the run got to. A
 * floating promise also cannot add a second failure to a run that already has one, hence the catch.
 */
let evidencePage = null;
let currentSectionName = 'startup';
let evidenceIdx = 0;

function fail(name, err) {
  failed++;
  failures.push({ name, error: err, section: currentSectionName });
  console.log(`  ✗ ${name}: ${err}`);
  if (!evidencePage) return;
  const file = shot(`${String(evidenceIdx++).padStart(2, '0')}-FAIL-${slug(name)}.png`);
  evidencePage
    .screenshot({ path: file, fullPage: true })
    .then(() => console.log(`    ↳ ${path.basename(file)}`))
    .catch(() => {
      /* the tab is gone or the paint failed; the console line above is still the evidence */
    });
}
/** A failure name like `[rose dark] topbar contrast` is not a legal filename on its own. */
function slug(name) {
  return name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
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
  currentSectionName = name;
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
// results), `oklab(...)` (an interpolated computed value, see below) and `#hex` (custom-property
// values). Anything else returns null and the caller reports NaN rather than guessing.
/** OKLab → 8-bit sRGB, D65 (the white point CSS `oklab()` is defined against), clipped per channel. */
function oklabToRgb(l, a, b) {
  const lms = [
    l + 0.3963377781 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map(v => v ** 3);
  const linear = [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ];
  // The inverse of the transfer function `contrast()` applies on the way in, so a colour parsed
  // through here and one parsed from `rgb()` land on the same luminance scale.
  const encode = v => (12.92 * v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
  return linear.map(v => Math.round(Math.min(1, Math.max(0, encode(Math.max(0, v)))) * 255));
}
function parseColor(input) {
  const s = String(input).trim();
  const fn = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s);
  if (fn) return [+fn[1], +fn[2], +fn[3]];
  // A settled `color-mix()` computes to this form, and it is what the filled-button
  // hover/active tokens resolve to, so leaving it unparsed would silently NaN a gate.
  const sp = /^color\(\s*srgb\s+([\d.]+)[\s/]+([\d.]+)[\s/]+([\d.]+)/.exec(s);
  if (sp) return [1, 2, 3].map(i => Math.round(+sp[i] * 255));
  // A colour *mid-transition* computes to this form — CSS interpolates colours in OKLab — so it
  // only ever shows up when a sample beats the animation. `sampleWithoutMotion` exists to stop
  // that, but a straggler read must still measure something rather than report `NaN:1` as if it
  // were a colour. Both the percentage and the legacy number notation are accepted.
  const ok = /^oklab\(\s*([\d.]+)(%?)[\s,]+(-?[\d.]+)(%?)[\s,]+(-?[\d.]+)/.exec(s);
  if (ok) return oklabToRgb(+ok[1] / (ok[2] ? 100 : 1), +ok[3], +ok[5]);
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

/**
 * Collapse the page's motion for the length of one colour sample.
 *
 * Every sampler below reads a property the theme switch *animates into*: Element Plus transitions
 * the button's `all .18s`, and the token-driven surfaces transition their colours too. The defence
 * until now was a fixed wait after the `dataset` assignment, but wall time is not a synchronisation
 * point — on a starved main thread the frames that advance an interpolation simply don't arrive, so
 * the read lands between the old theme and the new one. That is a whole family of false reds: in the
 * 2026-09-30 runs, `[blue dark] .drop-text: rgb(166,173,200) on rgb(248,250,252)` was the *light*
 * pairing sampled during the dark pass, and `NaN:1 … oklab(0.801023 -0.159772 0.0858885)` was an
 * interpolated computed value no authored token ever writes.
 *
 * `prefers-reduced-motion: reduce` is the app's own answer rather than a synthetic override: the
 * global sheet collapses `transition-duration` to 0.01ms on every element under that query (measured
 * on the built page by a throwaway Playwright probe in the untracked `.test-tmp/`: `.topbar` reports
 * `1e-05s` under the emulation and `0.25s` without it), so the interpolation is over before the
 * sample's own wait is, and the read can no longer be scheduled into the animated window by a slow
 * frame. Restored on every path including a throw, because later sections measure motion of their own.
 *
 * What it does NOT do: a `getComputedStyle` issued in the same task as the `dataset` write returns
 * the transition's start value with or without the emulation (same probe: `rgb(225,29,72)` for the
 * rose-to-blue move in both modes, `rgb(43,92,184)` once any amount of time has passed). So every
 * call site still needs its own wait between writing the theme and sampling — the emulation takes the
 * *duration* out of that wait's budget, it does not remove the wait.
 */
/**
 * Jump every running CSS transition to its end value.
 *
 * `prefers-reduced-motion` collapses the duration to 0.01 ms, but that is a *timeline* — a starved
 * renderer can still withhold the frame that advances a just-started transition, and
 * `getComputedStyle` then reports the transition's start value. That is the failure a 2026-10-17 run
 * produced at load average 457: `[blue light] .result-download .el-alert__title: 2.08:1`, the raw
 * Element Plus green, sampled before the dark-ink transition got its first frame; the same element
 * reads 5:1 once anything at all has elapsed. Finishing is the deterministic equivalent of waiting —
 * it moves every animation to its target without needing a frame. Infinite animations throw on
 * `finish()` and are skipped; nothing sampled here is a spinner.
 */
async function finishAnimations(page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        // The loading spinner loops forever, so it has no end value to jump to.
      }
    }
  });
}

async function sampleWithoutMotion(page, read) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    await finishAnimations(page);
    return await read();
  } finally {
    await page.emulateMedia({ reducedMotion: null });
  }
}

/**
 * Collapse motion around a *state change*, not only around the read that follows it.
 *
 * `sampleWithoutMotion` cannot fix a theme switch on its own: an interpolation that has already
 * started under normal motion keeps its own timeline, and `prefers-reduced-motion` does not
 * retroactively collapse it. On a starved main thread the frames that would advance it never
 * arrive, so the read stays parked on the previous theme's ink while the root's custom properties —
 * recalculated synchronously — are already the new theme's. That is the pairing a 2026-10-17 run
 * printed as `[green light] .file-list-header: 2.13:1 — rgb(166,173,200) on rgb(240,253,244)`: dark
 * ink, light backdrop, in the same sample. The switch has to happen inside the window.
 *
 * Nesting is harmless (`emulateMedia` is a set, not a stack), so the samplers below keep wrapping
 * their own reads.
 */
async function changeWithoutMotion(page, change) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    return await change();
  } finally {
    await page.emulateMedia({ reducedMotion: null });
  }
}

/** Drive `dataset` straight from the page, the way `useTheme` ends up doing it. */
function applyTheme(page, mode, theme) {
  return page.evaluate(
    ([m, t]) => {
      document.documentElement.dataset.mode = m;
      document.documentElement.dataset.theme = t;
    },
    [mode, theme],
  );
}

/** The two colours that carry the Option-A contrast contract, read from the page: the
 *  topbar's own background vs the brand text drawn on it, plus the resolved focus ring
 *  against a card. Compared with `contrast()` on the Node side. */
async function surfaceColors(page) {
  return sampleWithoutMotion(page, () =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const topbar = document.querySelector('.topbar');
      const brand = document.querySelector('.brand-name');
      return {
        topbar: topbar ? getComputedStyle(topbar).backgroundColor : '',
        brand: brand ? getComputedStyle(brand).color : '',
        ring: root.getPropertyValue('--fat-focus-ring').trim(),
        card: root.getPropertyValue('--fat-bg-card').trim(),
      };
    }),
  );
}

/**
 * The label and the three fills an enabled primary button actually paints.
 *
 * `.el-button` transitions `all 0.18s`, so every sample used to wait that out — reading earlier
 * yields an interpolated colour rather than the theme's, which is how an earlier draft of this
 * measurement reported light-green at 6.68:1 instead of its real 7.04:1. The wait stays, but it is
 * no longer the guarantee: the whole rest → hover → active sequence runs inside
 * `sampleWithoutMotion`, because the state changes themselves animate and only the settled value is
 * under test. The pointer is parked off-element before the resting sample because the previous
 * iteration leaves it hovering the button.
 */
async function buttonStateColors(page) {
  return sampleWithoutMotion(page, () => readButtonStates(page));
}

async function readButtonStates(page) {
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
 * instead of passing on zero measurements. Read against the settled theme: like the button samples,
 * this runs with colour transitions cancelled, because an element caught mid-fade also fails the
 * `opacity < 0.99` visibility test below and would be reported as "not rendered".
 */
async function infoTextSamples(page, selectors) {
  return sampleWithoutMotion(page, () => readInfoTextSamples(page, selectors));
}

async function readInfoTextSamples(page, selectors) {
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
 * the test itself rather than by `fixtures/` — and convert to the given target format. An array of
 * either goes in as one batch, which is how a test reaches a state no single file can produce (two
 * sources that share a basename, say).
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
async function convertFile(page, fixture, targetText, timeout = 30000, prepare) {
  // `page.$()` answers "is it there this instant", and the lookups below sit right after a reset that
  // unmounts and remounts the workbench — long enough for a frame to be missed and for the section to
  // die on `file input not found` with nothing wrong but scheduling. Waiting is what makes the message
  // mean what it says: absent for the whole budget. The file input is `attached` rather than `visible`
  // because it is the visually-hidden half of the styled drop zone (measured 2026-10-17: `page.$()`
  // returns it, `waitForSelector()` at its default state times out on 2 matches, none of them visible).
  const fi = await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
  const entries = Array.isArray(fixture) ? fixture : [fixture];
  const label = entries.map(entry => (typeof entry === 'string' ? entry : entry.name)).join(', ');
  await fi.setInputFiles(entries.map(entry => (typeof entry === 'string' ? path.join(FIXTURE_PATH, entry) : entry)));

  // Detection writes the row; the row is what says the detection happened. Sleeping 1 000 ms instead
  // of waiting made this the step that decided whether the *next* line could find its target, so a
  // contended machine turned a working converter into `format not detected`.
  //
  // The row is looked up by name rather than as `'.file-item .el-tag--primary'`: a section that
  // follows another ends with the previous batch's row still in the DOM for the length of its leave
  // transition, and reading the first tag then attributed that file's format to this upload
  // (measured 2026-10-17: JSON→HTML reported "Text (.txt)" while the history recorded the JSON).
  const firstEntry = entries[0];
  const firstName = typeof firstEntry === 'string' ? firstEntry : firstEntry.name;
  const formatTag = await page
    .waitForFunction(
      name => {
        const row = [...document.querySelectorAll('.file-item')].find(item => item.textContent.includes(name));
        return row?.querySelector('.el-tag--primary')?.textContent ?? false;
      },
      firstName,
      { timeout: 10000 },
    )
    .then(handle => handle.jsonValue())
    .catch(() => null);
  if (!formatTag) throw new Error(`format not detected for ${label}`);

  // A click on a dropdown row is not proof that the selection committed: Element Plus renders the
  // popper through a transition, and under the load of the section before it, the click can land on
  // a row that is about to be replaced — the menu stays open, the placeholder stays visible and the
  // convert button stays `disabled` until the budget expires (measured once on 2026-10-17 in
  // JSON→CSV, while the same route passed in every other run). So the app's own state is what gets
  // waited on: the select shows the chosen label *and* the button leaves `disabled`, which is the
  // same predicate that enables the button. A failed attempt is retried rather than reported, and
  // only a target that is not offered at all fails immediately.
  let selected = false;
  for (let attempt = 0; attempt < 3 && !selected; attempt++) {
    if (attempt > 0) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
    }
    const sel = await page.waitForSelector('.action-row .el-select', { timeout: 10000 });
    await sel.click();
    await page.waitForSelector('.el-select-dropdown__item:visible', { timeout: 10000 });

    // Same reason as the two waits above, and this is the one that used to lie: a fixed 500 ms for the
    // dropdown to paint, then `isVisible()`. On 2026-10-17, at load average 11, it reported
    // `PDF (.pdf) option not available` for a route the registry still had — a red that points at a
    // converter rather than at the clock is the expensive kind.
    const opt = page.locator('.el-select-dropdown__item:visible').filter({ hasText: targetText }).first();
    const offered = await opt
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!offered) throw new Error(`${targetText} option not available`);
    await opt.click();
    selected = await page
      .waitForFunction(
        text => {
          const select = document.querySelector('.action-row .el-select');
          const button = document.querySelector('.convert-btn');
          return !!select && select.textContent.includes(text) && !!button && !button.disabled;
        },
        targetText,
        { timeout: 8000 },
      )
      .then(() => true)
      .catch(() => false);
  }
  if (!selected) throw new Error(`${targetText} selection did not commit`);
  await page.waitForTimeout(300);

  // Some conversions need a field filled between choosing the target and clicking convert — the PDF
  // page-range box only mounts once an image target is selected, so it cannot be set up earlier.
  if (prepare) await prepare();

  const cb = await page.waitForSelector('.convert-btn', { timeout: 10000 });
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

/** Reset the workbench for a new conversion.
 *  Tolerates being called on an already-empty workbench — `.reset-btn` is a results-area button, and
 *  sections use this as "make sure nothing is left over" rather than as a step that must happen.
 *  The button runs `clearResults`, which drops the result card and keeps the source files, so the
 *  settle check is the card's own removal. Waiting for `.file-item` to reach zero never happened
 *  (measured 2026-10-17) and silently spent the full 10 s budget on every call — the source list is
 *  replaced by the next upload anyway. */
async function resetWorkbench(page) {
  const resetBtn = await page.$('.reset-btn');
  if (!resetBtn) return;
  // The button lives inside the results card it clears, so the click unmounts its own target.
  // Playwright can sample the node between the dispatch and Vue's patch and reject with
  // "element is not attached to the DOM" even though `clearResults` ran — and the failure list's
  // enter transition makes that window wider. The detached-card check is the authoritative one, so
  // a rejected click is retried once against a fresh handle rather than failing the scenario.
  await resetBtn.click({ timeout: 3000 }).catch(() => {});
  let settled = await page.waitForSelector('.reset-btn', { state: 'detached', timeout: 5000 }).then(
    () => true,
    () => false,
  );
  if (!settled) {
    const again = await page.$('.reset-btn');
    if (again) {
      await again.click().catch(() => {});
      settled = await page.waitForSelector('.reset-btn', { state: 'detached', timeout: 5000 }).then(
        () => true,
        () => false,
      );
    }
  }
  if (!settled) throw new Error('the results card did not clear before the next scenario');
}

/** Choose a conversion target from the workbench's format dropdown. */
async function pickTarget(page, text) {
  const sel = await page.waitForSelector('.action-row .el-select', { timeout: 10000 });
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
 * The ZIP the workbench is offering, read out of the real download: member names plus the method
 * each member was packed with.
 *
 * `downloadBatchArtifact` refuses a bundle on purpose — its callers want file *contents* — while the
 * page-selection assertions are about *which* pages were written and under what name, which is only
 * observable in the directory. The method comes out too because the per-entry compression switch
 * (`isZipCompressible`) is otherwise invisible to this suite: `unzipSync` hands back identical bytes
 * whichever way an entry was packed, so a batch that quietly stopped deflating its images would still
 * be green. Central-directory headers are walked rather than local ones because the signature occurs
 * exactly once per entry there, and the method field is the archive's own claim about the entry.
 */
async function zipBundle(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    (await page.$('.result-download .download-actions .el-button')).click(),
  ]);
  const buf = fs.readFileSync(await download.path());
  const { unzipSync } = await import('fflate');
  const names = Object.keys(unzipSync(new Uint8Array(buf)));
  const methods = {};
  for (let i = 0; i + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(i) !== 0x02014b50) continue;
    const name = buf.subarray(i + 46, i + 46 + buf.readUInt16LE(i + 28)).toString('latin1');
    methods[name] = buf.readUInt16LE(i + 10);
  }
  return { names, methods };
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

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * A solid-colour PNG as a data URI, for tests that need a decoded picture with no fixture file.
 *
 * The layout-settle page is built in memory, and its image has to survive the sanitizer: the
 * subresource strip keeps raster `data:` payloads but treats `data:image/svg+xml` as markup-bearing
 * and removes it. An SVG here would therefore assert a behaviour the product deliberately does not
 * have. The encoder is ~20 lines because Node has zlib but no PNG writer, and a 300×180 solid
 * rectangle compresses to a few hundred bytes.
 */
function solidPngBase64(width, height, [red, green, blue]) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour, no alpha
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      raw[row + 1 + x * 3] = red;
      raw[row + 2 + x * 3] = green;
      raw[row + 3 + x * 3] = blue;
    }
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
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
  tolerateScreenshotTimeout(page);
  trackPageErrors(page);
  evidencePage = page;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(mockChromeStorage());

  const themeValues = ['blue', 'green', 'purple', 'orange', 'rose', 'slate'];
  await page.goto(`http://localhost:${PORT}/options.html`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: shot('01-initial.png'), fullPage: true });
  ok('Options page loaded');

  // Check the capability line in the empty drop zone
  const footerText = await page.$eval('.drop-stats', el => el.textContent).catch(() => '');
  if (footerText.includes('14') && footerText.includes('48')) {
    ok('Drop zone shows 14 formats, 48+ paths');
  } else {
    fail('Drop zone stats', `unexpected: "${footerText}"`);
  }

  // <html lang> must already match the stored locale before any interaction: screen
  // readers pick it up on first paint, and the mount-time read is the only chance to
  // get it right for a user who previously switched language. The tab title is pinned by
  // the same call — it is the only part of the identity visible while the page is not.
  const langOnLoad = await page.evaluate(() => document.documentElement.lang);
  if (langOnLoad === 'zh-CN') ok(`Document language pinned on first paint (${langOnLoad})`);
  else fail('Document language on load', `lang="${langOnLoad}"`);

  const titleOnLoad = await page.title();
  if (titleOnLoad === '文件格式任意转换助手 · 转换工作台') ok(`Tab title localized on first paint (${titleOnLoad})`);
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
  // is what this pins — the shape, not the total. A round-trip ceiling is the weaker form of the same
  // claim: the number of keys this page reads grows with every new preference, so a ceiling tight
  // enough to catch a duplicate is one preference away from failing for the wrong reason. The
  // per-key form of that check is the assertion right below it.
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
  // What the seeds actually remove is a re-read, so the general form of it is what gets pinned: a key
  // fetched twice before any interaction means some module re-read state the entry already resolved.
  // One such key was live until now — two cards mounting in one flush each paid for
  // `fat:collapsedState`. `useTheme` re-read theme and colour mode the same way after `main.ts` had
  // applied them, but that pair never entered this window: `PreferencesMenu` lives in a popover with
  // `persistent=false`, so its `useTheme()` runs on the first open, not at boot. An empty record is not
  // "no duplicates", it is a stub that stopped recording, so it fails.
  const calls = boot.storageCalls;
  const readCounts = new Map();
  for (const keys of calls ?? []) {
    for (const key of keys) readCounts.set(key, (readCounts.get(key) ?? 0) + 1);
  }
  const twiceRead = [...readCounts].filter(([, count]) => count > 1).map(([key, count]) => `${key}×${count}`);
  if (Array.isArray(calls) && calls.length > 0 && twiceRead.length === 0) {
    ok(`No storage key is read twice during boot (${readCounts.size} keys over ${calls.length} reads)`);
  } else {
    fail(
      'No storage key is read twice during boot',
      Array.isArray(calls) ? `calls=${calls.length} duplicates=${JSON.stringify(twiceRead)}` : 'no call recorded',
    );
  }

  // ═══════════════════════════════════════════
  //  EVERY CARD'S COLLAPSE STATE SURVIVES THE OTHER'S
  // ═══════════════════════════════════════════
  //
  // Every card read-modify-writes one shared `fat:collapsedState` map, so two persisting at the same
  // time interleave and the later write silently drops the earlier card's key. The queue meant to
  // prevent that was declared inside `<script setup>`, which runs once per instance — it serialized
  // one card against itself and nothing else, and no test could tell because a single card was always
  // enough to pass. Toggling two headers in one task is what makes the difference observable: both
  // debounce callbacks fire in the same timer pass.
  //
  // That only reaches the race if `get` answers the way Chrome does. The shared mock resolves it in a
  // microtask, so an unchained write chain finishes inside its own timer callback before the next
  // card's callback runs — measured: with the mock as it is, deleting the chaining still left both keys
  // in the map, so the assertion below would have been decoration. Real Chrome answers from another
  // process: the value is the store as of dispatch, delivered a task later. The wrapper gives that one
  // property to this page alone, and 30 ms is where it becomes a test rather than a style choice — at
  // 0 ms the un-chained version passes, at 30 ms it loses `presets` and keeps only `history`, which is
  // the exact shape of the bug. The 900 ms wait below budgets two such round trips plus the debounce.
  section('Collapsed State Writes Serialize');
  const cardPage = await browser.newPage();
  trackPageErrors(cardPage);
  await cardPage.setViewportSize({ width: 1280, height: 900 });
  await cardPage.addInitScript(mockChromeStorage());
  await cardPage.addInitScript(`(() => {
  const local = window.chrome.storage.local;
  const rawGet = local.get.bind(local);
  local.get = keys => {
    const dispatched = rawGet(keys);
    return new Promise(resolve => setTimeout(() => resolve(dispatched), 30));
  };
})();`);
  await cardPage.goto(`http://localhost:${PORT}/options.html`);
  await cardPage.waitForTimeout(1200);
  const collapsed = await cardPage.evaluate(async () => {
    const heads = Array.from(document.querySelectorAll('.collapsible-head'));
    if (heads.length < 2) return { headCount: heads.length, map: null };
    heads[0].click();
    heads[1].click();
    await new Promise(resolve => setTimeout(resolve, 900));
    const stored = await window.chrome.storage.local.get('fat:collapsedState');
    return { headCount: heads.length, map: stored['fat:collapsedState'] ?? null };
  });
  await cardPage.close();
  const writtenIds = collapsed.map ? Object.keys(collapsed.map) : [];
  if (writtenIds.length >= 2) {
    ok(`Both cards persist after one interleaved write pass (${JSON.stringify(collapsed.map)})`);
  } else {
    fail(
      'Both cards persist after one interleaved write pass',
      `heads=${collapsed.headCount} map=${JSON.stringify(collapsed.map)}`,
    );
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
    trackPageErrors(enPage);
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
    ['sample.pdf', 'WebP (.webp)', 'PDF→WEBP'],
    // SVG conversions (new format)
    ['sample.svg', 'PNG (.png)', 'SVG→PNG'],
    ['sample.svg', 'HTML (.html)', 'SVG→HTML'],
    ['sample.svg', 'PDF (.pdf)', 'SVG→PDF'],
    // GIF conversions (new format)
    ['sample.gif', 'PNG (.png)', 'GIF→PNG'],
    ['sample.gif', 'PDF (.pdf)', 'GIF→PDF'],
    // BMP is input-only — no canvas can encode one — so this route is a decode plus a re-encode
    ['sample.bmp', 'PNG (.png)', 'BMP→PNG'],
    // Single-sheet workbook keeps the plain CSV output
    ['single-sheet.xlsx', 'CSV (.csv)', 'XLSX1→CSV'],
  ];

  let shotIdx = 2;
  for (const [fixture, target, label] of conversions) {
    // Each conversion is its own section, so `E2E_ONLY` can select one instead of replaying all 50.
    if (!section(`${label} Conversion`)) continue;
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
  //  BMP is decoded, not merely accepted by extension
  // ═══════════════════════════════════════════

  // The registry holds no BMP *encoder* — no browser canvas writes one — so every edge out of BMP
  // begins with a real decode. "The conversion completed" is not evidence of that: a decoder handed
  // bytes it cannot read either throws (the failure path, covered above) or paints nothing, and a
  // blank canvas still encodes fine. The fixture is 2×2 with four distinct colours so the downloaded
  // PNG can be checked for its own IHDR dimensions, the same 24-byte probe the inline-SVG tests use.
  if (section('BMP input decodes to a real bitmap')) {
    try {
      await resetWorkbench(page);
      const bmp = await convertFile(page, 'sample.bmp', 'PNG (.png)');
      if (!bmp.resultName) {
        fail('BMP→PNG decode', `no result row: alert "${bmp.alertTitle}"`);
      } else {
        const artifact = Buffer.from(await downloadBatchArtifact(page), 'latin1');
        if (artifact.toString('base64').startsWith(pngHead(2, 2))) {
          ok(`BMP→PNG decodes the fixture (2×2 PNG, ${artifact.length} bytes)`);
        } else {
          fail('BMP→PNG decode', `unexpected PNG header: ${artifact.subarray(0, 24).toString('base64')}`);
        }
      }
    } catch (e) {
      fail('BMP→PNG decode', e.message);
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
      // it, and an `<img>` is the condition the settle is now keyed on. The payload is a raster data
      // URI because that is the shape the sanitizer keeps; `data:image/svg+xml` carries markup of its
      // own and is stripped like any other remote-capable reference.
      const blueImg = `<img src="${solidPngBase64(300, 180, [0, 0, 255])}">`;

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
  //  FULL-PAGE CAPTURE HEIGHT CEILING
  // ═══════════════════════════════════════════

  if (section('Full-Page Height Ceiling')) {
    try {
      // Both bounds come off the constants that define them, read from source the way the settle table
      // above does: a copied number here would follow a change to the ceiling quietly, and the whole point
      // of the ceiling is that it sits under a platform limit that reports success while drawing nothing.
      const rasterSource = fs.readFileSync(path.resolve(__dirname, '../utils/core/html-raster.ts'), 'utf8');
      const outputSource = fs.readFileSync(path.resolve(__dirname, '../utils/core/output-options.ts'), 'utf8');
      const edge = Number((/export const MAX_CANVAS_EDGE = (\d+);/.exec(outputSource) ?? [])[1]);
      const times = Number((/const MAX_CAPTURE_HEIGHT = MAX_CANVAS_EDGE \* (\d+);/.exec(rasterSource) ?? [])[1]);
      if (!edge || !times) throw new Error(`ceiling unreadable from source (MAX_CANVAS_EDGE=${edge}, ×${times})`);
      const ceiling = edge * times;

      const wrap = height =>
        `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>` +
        `<body><div style="height:${height}px"></div></body></html>`;
      const capturePage = async (height, timeout) => {
        await resetWorkbench(page);
        return convertFile(
          page,
          { name: 'tall.html', mimeType: 'text/html', buffer: Buffer.from(wrap(height)) },
          'PNG (.png)',
          timeout,
        );
      };

      // Above it the run must *say so*. Measured 2026-10-17 on this machine's Chromium: an 800×40 000
      // canvas allocates and reports no error, then `fillRect` leaves it transparent — so without the
      // guard the workbench would hand back a PNG of white space and the batch line would read `done`.
      // The check sits before the allocation, so refusing costs a layout and no canvas.
      const over = await capturePage(Math.round(ceiling * 1.2), 60000);
      const overReason = (
        await page.$eval('.failure-item .failure-reason', el => el.textContent).catch(() => '')
      ).trim();
      if (!over.alertTitle.includes('完成') && overReason.includes('超出了浏览器单次渲染的上限')) {
        ok(`A ${Math.round(ceiling * 1.2)} CSS px page is refused with the length diagnostic, not blanked`);
      } else {
        fail('Over-ceiling page', `alert="${over.alertTitle}" reason="${overReason}"`);
      }

      // Six tenths of the ceiling is still a document no fixture in this repository approaches, and it has
      // to come out as a picture — a guard that quietly became a cap on long documents would be the worse
      // regression of the two. The PDF route shares this one call, so the refusal above covers it too.
      const under = await capturePage(Math.round(ceiling * 0.6), 120000);
      if (under.alertTitle.includes('完成') && under.resultName.endsWith('.png')) {
        ok(`A ${Math.round(ceiling * 0.6)} CSS px page below the ceiling still converts (${under.resultSize})`);
      } else {
        fail('Under-ceiling page', `alert="${under.alertTitle}" name="${under.resultName}"`);
      }
    } catch (e) {
      fail('Full-Page Height Ceiling', e.message);
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
    const wholeBundle = whole.resultName.endsWith('.zip') ? await zipBundle(page) : { names: [], methods: {} };
    const wholeEntries = wholeBundle.names;
    if (wholeEntries.join(',') === 'page-1.png,page-2.png') ok('Whole document exports page-1 / page-2');
    else fail('Whole-document ZIP entries', `alert="${whole.alertTitle}" entries=[${wholeEntries.join(', ')}]`);
    // The image entries go in deflated: a rasterized document page gives up 49.9 % of its archive at
    // level 6 (a real 12-page export measured 39.3 %), and the only thing standing between that and
    // the download the user gets is one extension set. Method 8 is deflate, 0 is stored; both pages
    // must carry it, or the switch has silently reverted.
    if (wholeEntries.every(name => wholeBundle.methods[name] === 8)) ok('Image entries of a PNG bundle are deflated');
    else fail('PNG entry method', `methods=${JSON.stringify(wholeBundle.methods)}`);

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
    // Wait out `fat-expand` rather than sampling once: the panel leaves through a 250 ms grid/opacity
    // transition, and a single check after `pickTarget`'s 300 ms settle can still catch the clamped
    // element on a loaded machine. Detachment is the state that matters — a panel parked at 0fr is
    // already invisible and unclickable, which is exactly why the export below is the real assertion.
    await page.waitForSelector('.output-options', { state: 'detached', timeout: 5000 }).catch(() => {});
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
    const clearedEntries = cleared.resultName.endsWith('.zip') ? (await zipBundle(page)).names : [];
    if (clearedEntries.length === 2) ok('Clearing 页码范围 restores the whole document');
    else fail('Clearing 页码范围', `alert="${cleared.alertTitle}" entries=[${clearedEntries.join(', ')}]`);
  } catch (e) {
    fail('PDF page range selection', e.message);
  }

  // ═══════════════════════════════════════════
  //  PDF PAGE BUDGETS (long documents stop before the work starts)
  // ═══════════════════════════════════════════

  if (section('PDF Page Budgets')) {
    try {
      const failureReason = () => page.$eval('.failure-item .failure-reason', el => el.textContent).catch(() => '');
      const setRange = spec => page.fill('.output-options .el-input input', spec);
      // 201 pages is one past the render budget. Asserting on the remedy text, not merely on the
      // failure: the whole point of the cap is that the user is told about the page-range field
      // instead of watching the tab die, and `imageEncode` would say nothing of the sort.
      await resetWorkbench(page);
      const tooManyImages = await convertFile(page, 'sample-201-pages.pdf', 'PNG (.png)');
      const imageReason = (await failureReason()).trim();
      if (!tooManyImages.alertTitle.includes('完成') && imageReason.includes('页码范围')) {
        ok('A 201-page PDF is refused by the image route with the page-range remedy');
      } else {
        fail('PDF image page budget', `alert="${tooManyImages.alertTitle}" reason="${imageReason}"`);
      }

      // The remedy the message names has to actually work: the same document converts once a range
      // brings it under the cap, and the excerpt keeps the document's own page numbers.
      await resetWorkbench(page);
      const rescued = await convertFile(page, 'sample-201-pages.pdf', 'PNG (.png)', 60000, () => setRange('1-2'));
      const rescuedBundle = rescued.resultName.endsWith('.zip') ? await zipBundle(page) : { names: [] };
      if (rescuedBundle.names.join(',') === 'page-1.png,page-2.png') {
        ok('页码范围 1-2 rescues a 201-page PDF into a two-page excerpt');
      } else {
        fail(
          'PDF image budget rescue',
          `alert="${rescued.alertTitle}" name="${rescued.resultName}" entries=[${rescuedBundle.names.join(', ')}]`,
        );
      }

      // Exactly at the cap is allowed — the guard is `> MAX`, not `>=` — so this is the only
      // assertion that proves the boundary from the accepting side. It renders 200 blank pages,
      // the slowest case in this section, hence the larger budget.
      await resetWorkbench(page);
      const atCap = await convertFile(page, 'sample-201-pages.pdf', 'PNG (.png)', 120000, () => setRange('1-200'));
      const atCapBundle = atCap.resultName.endsWith('.zip') ? await zipBundle(page) : { names: [] };
      if (
        atCapBundle.names.length === 200 &&
        atCapBundle.names.includes('page-1.png') &&
        atCapBundle.names.includes('page-200.png')
      ) {
        ok('A 200-page selection is accepted — the budget stops at 201, not at 200');
      } else {
        fail('PDF image budget boundary', `alert="${atCap.alertTitle}" entries=${atCapBundle.names.length}`);
      }

      // 1001 pages is one past the extraction budget. This route has no page-range control, so the
      // diagnostic has to point at splitting the file instead.
      await resetWorkbench(page);
      const tooManyText = await convertFile(page, 'sample-1001-pages.pdf', 'HTML (.html)');
      const textReason = (await failureReason()).trim();
      if (!tooManyText.alertTitle.includes('完成') && textReason.includes('拆分')) {
        ok('A 1001-page PDF is refused by the text route with the split remedy');
      } else {
        fail('PDF text page budget', `alert="${tooManyText.alertTitle}" reason="${textReason}"`);
      }
    } catch (e) {
      fail('PDF Page Budgets', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  OFFLINE SENTINEL — remote references must never be fetched
  // ═══════════════════════════════════════════

  section('Offline Sentinel — zero subresource requests');
  try {
    // Positive control: the listener must record a request that is actually made, or the zero
    // below would be indistinguishable from a server that never saw anything.
    await new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${PORT}/canary/probe`, res => {
          res.resume();
          res.on('end', resolve);
        })
        .on('error', reject);
    });
    if (!canaryHits.includes('/canary/probe')) throw new Error('canary server did not record its own probe');
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

    // A failed conversion renders no document at all, so "no requests" would be vacuously true.
    // The sentinel only means something once this same page reports a finished PNG.
    const sentinelAlert = await page.$eval('.el-alert__title', el => el.textContent || '').catch(() => '');
    const sentinelResult = await page.$eval('.result-item .result-name', el => el.textContent || '').catch(() => '');
    if (!sentinelAlert.includes('完成') || !sentinelResult.trim().endsWith('.png')) {
      // Expand the diagnostic before reporting: the cause is what turns "render failed" into an
      // actionable failure, and this path exists precisely to catch a render that never happened.
      const toggle = await page.$('.failure-toggle');
      if (toggle) await toggle.click();
      const cause = await page.$eval('.failure-cause', el => el.textContent || '').catch(() => '');
      throw new Error(
        `sentinel conversion failed: alert="${sentinelAlert.trim()}" result="${sentinelResult.trim()}" cause="${cause.trim()}"`,
      );
    }

    if (canaryHits.length === 0) {
      ok(
        'Remote img/link/@import (plain, escaped, comment-split, data:) / style-url (escaped, protocol-relative, backslash) / image-set / srcset / video / svg image / srcdoc / meta-refresh produced zero requests',
      );
    } else {
      fail('Offline sentinel', `canary was fetched: ${[...new Set(canaryHits)].join(', ')}`);
    }

    // The strip must be surgical: plain anchor links are content, not subresources. The `background`
    // attribute belongs to this check alongside `img src` because the two vectors take different
    // branches of `stripElement` — the CSS forms in `<style>` and `style=` are rewritten by the URL
    // walk, while the attribute is only reached by the per-element loop. The sentinel above notices
    // a missed attribute solely because Chrome resolves it; this one reads the stripped markup.
    await (await page.$('.file-item button[title="预览"]')).click();
    await page.waitForSelector('.preview-dialog iframe.doc-frame', { timeout: 10000 });
    const srcdoc = await page.$eval('.preview-dialog iframe.doc-frame', el => el.getAttribute('srcdoc') || '');
    const anchorKept = srcdoc.includes(`/canary/anchor`);
    const strippedMarkers = [
      'import.css',
      'escaped-import.css',
      'comment-import.css',
      'data-import.css',
      'body-bg.png',
      'inline.png',
      'escaped-url.png',
      'protocol-relative.png',
      'backslash.png',
      'image-set.png',
      'var-fallback.png',
      'cross-fade.png',
      'cross-fade-2.png',
      'data-svg.png',
      'img.png',
      'entity.png',
      'srcset-fallback.png',
      'srcset-2x.png',
      'srcset-3x.png',
      'poster.png',
      'svg-image.png',
      'svg-fill.svg',
      'srcdoc.png',
      'td-bg-attr.png',
      'body-bg-attr.png',
      'meta-refresh',
    ];
    const survived = strippedMarkers.filter(marker => srcdoc.includes(marker));
    if (anchorKept && survived.length === 0) {
      ok('Anchor href preserved while every remote reference was stripped from the rendered markup');
    } else {
      fail(
        'Surgical strip check',
        `anchor kept=${anchorKept}, survived: ${survived.length > 0 ? survived.join(', ') : '(none)'}`,
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
  //  A picture the document cannot supply must cost the document nothing
  // ═══════════════════════════════════════════

  // Reported as "带图片引用的 md 转 PDF 报错", and the mechanism was worse than a missing picture: a
  // reference with no bytes behind it reached the rasterizer, which either requested the extension's own
  // page for it (an `<img>` stripped down to no `src` at all) or sat behind a request that never answered,
  // and either way one image aborted the whole document. `sample-images.md` carries the three dead shapes
  // — absolute, protocol-relative, sibling path — and one `data:` image that must keep working untouched.
  if (section('Markdown With Unresolvable Images Still Renders')) {
    /** The fixture with its canary host re-pointed at this run's port, as the sentinel does. */
    const imagesMarkdown = () =>
      fs
        .readFileSync(path.join(FIXTURE_PATH, 'sample-images.md'), 'utf8')
        .replaceAll('127.0.0.1:9876', `127.0.0.1:${PORT}`);

    try {
      canaryHits.length = 0;
      await resetWorkbench(page);
      const dead = await convertFile(
        page,
        { name: 'sample-images.md', mimeType: 'text/markdown', buffer: Buffer.from(imagesMarkdown()) },
        'PDF (.pdf)',
        45000,
      );
      const pdf = dead.resultName.endsWith('.pdf') ? await downloadBatchArtifact(page) : '';
      if (pdf.startsWith('%PDF')) {
        ok('markdown whose images it cannot have still produces a PDF instead of failing');
      } else {
        fail('md with dead image refs → PDF', `alert="${dead.alertTitle}" result="${dead.resultName}"`);
      }

      // The disclosure has to travel with the artifact: nothing on `sample-images_….pdf` says three
      // pictures became placeholders, and a document that lost them quietly reads as the author's own
      // layout. The number is the part a reader acts on, and both shapes have to be named because they
      // are two different mechanisms (a reference rewritten before rendering leaves a dashed box, one
      // that only fails while being cloned leaves that position empty).
      const notes = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      const dropped = notes.find(text => text.includes('处位置'));
      if (dropped?.includes('有 3 处位置') && dropped.includes('留空') && dropped.includes('虚线方框')) {
        ok('it counts the three pictures that could not come through and names both shapes');
      } else {
        fail('missing-image disclosure', `notes rendered: ${JSON.stringify(notes)}`);
      }

      // Give any in-flight request time to land before judging, exactly as the sentinel above does: the
      // rewrite happens before the document exists, so nothing is asked for even briefly.
      await page.waitForTimeout(1500);
      if (canaryHits.length === 0) {
        ok('Dead img references cost zero requests, the protocol-relative shape included');
      } else {
        fail('Rasterizer egress', `canary was fetched: ${[...new Set(canaryHits)].join(', ')}`);
      }
    } catch (e) {
      fail('Markdown With Unresolvable Images', e.message);
    }

    // The other half, and the half that keeps the note worth reading: a document whose one picture it
    // already holds must stay silent. The dead references are cut out of the same fixture rather than
    // replaced by a second file, so the two runs differ only in what cannot be satisfied.
    try {
      await resetWorkbench(page);
      const liveOnly = imagesMarkdown()
        .split('\n')
        .filter(line => !['Remote:', 'Protocol relative:', 'Next to the source file:'].some(p => line.startsWith(p)))
        .join('\n');
      // Without a live image in the control, "no note" would pass on a document that had nothing to show.
      if (!liveOnly.includes('![inline](data:image/png')) throw new Error('the control document lost its live image');
      const live = await convertFile(
        page,
        { name: 'sample-live.md', mimeType: 'text/markdown', buffer: Buffer.from(liveOnly) },
        'PDF (.pdf)',
        45000,
      );
      if (!live.resultName) throw new Error(`image-complete markdown produced no artifact: ${live.alertTitle}`);
      const notes = await page.$$eval('.result-note', els => els.map(el => el.textContent.trim()));
      if (notes.some(text => text.includes('处位置'))) {
        fail('missing-image disclosure on a complete document', `unexpected note: ${JSON.stringify(notes)}`);
      } else {
        ok('a markdown carrying its own picture as a data URI says nothing about missing images');
      }
    } catch (e) {
      fail('Markdown With Live Images Stays Silent', e.message);
    }
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
        // One marker per vector `stripRemoteResources` handles on this path, including the three that
        // need separate fixture markup to be exercised at all: `<link href>`, the inline `style=`
        // attribute, and the legacy `background` attribute (per-tag and cell-level). A vector
        // missing from the fixture is a branch never executed.
        const wanted = [
          'canary/img.png',
          'canary/link.css',
          'canary/css-import',
          'canary/css-bg.png',
          'canary/inline.png',
          'canary/body-bg.png',
          'canary/td-bg.png',
        ];
        const survived = wanted.filter(m => docxText.includes(m));
        if (survived.length === 0) {
          ok(
            'Remote img / link / @import / style-element url / inline-style url / background attr stripped from the DOCX',
          );
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
  //  F-1b — SVG→HTML must not hand the user a document that fetches when opened
  // ═══════════════════════════════════════════

  if (section('SVG HTML Subresource Egress')) {
    try {
      // One marker per vector that reaches `stripRemoteResources` on this path, plus two references that
      // must *survive*: a document whose local gradient and data: image also went missing would pass a
      // "no remote URL" assertion while quietly destroying the picture. Two of the six markers below
      // (`background=` and the animation's `to=`) are cut by the DOMPurify profile rather than by the
      // strip — they stay in the fixture because the claim under test is about the delivered document,
      // and a future profile change would otherwise open a hole no one looks at.
      const svgEgress = [
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="120" height="120" viewBox="0 0 120 120">',
        '  <defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#0f0"/></linearGradient></defs>',
        '  <style>.marker-box { fill: #333; } .bg { background: url("http://canary.invalid/track-css-url.png"); }</style>',
        '  <rect class="marker-box" width="40" height="40" fill="url(#g)"/>',
        '  <image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" x="50" y="0" width="10" height="10"/>',
        '  <image href="http://canary.invalid/track-image.png" x="0" y="50" width="10" height="10"/>',
        '  <image xlink:href="http://canary.invalid/track-xlink.png" x="15" y="50" width="10" height="10"/>',
        '  <rect x="30" y="50" width="10" height="10" fill="url(http://canary.invalid/track-fill.svg#g)"/>',
        '  <rect x="45" y="50" width="10" height="10" style="fill: url(http://canary.invalid/track-style.svg#g)"/>',
        '  <rect x="60" y="50" width="10" height="10" background="http://canary.invalid/track-bg.png"/>',
        '  <animateTransform attributeName="fill" to="url(http://canary.invalid/track-anim.svg#g)" dur="1s"/>',
        '</svg>',
      ].join('\n');

      await resetWorkbench(page);
      const fi = await page.$('input[type="file"]');
      await fi.setInputFiles({
        name: 'svg-egress.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(svgEgress, 'utf8'),
      });
      await page.waitForTimeout(1000);
      await pickTarget(page, 'HTML (.html)');
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

      // Nothing here can be asserted from the network: the converter issues no request itself, and it
      // is the user's browser that would resolve these URLs the moment they open the file.
      const html = await downloadBatchArtifact(page);

      if (/<svg[\s>]/.test(html)) {
        ok(`SVG→HTML hands over a document still carrying the inline graphic (${html.length} bytes)`);
      } else {
        fail('SVG HTML Subresource Egress', 'no inline <svg> in the artifact — the probes below prove nothing');
      }

      const survivors = [...html.matchAll(/https?:\/\/canary\.invalid\/[^\s"')]+/g)].map(m => m[0]);
      if (survivors.length === 0) {
        ok('Every remote URL that survives the profile is cut before the document ships (5 vectors)');
      } else {
        fail('SVG egress', `the delivered document would fetch on open: ${JSON.stringify(survivors)}`);
      }

      const animationLeft = /<(animate|animateTransform|animateColor|animateMotion|set)\b/i.test(html);
      if (!animationLeft) {
        ok('The SMIL animation elements the profile keeps are removed with them');
      } else {
        fail('SVG egress', 'an animation element survived into the delivered document');
      }

      const localKept = html.includes('url(#g)') && html.includes('data:image/png;base64,');
      if (localKept) {
        ok('A local gradient reference and an embedded data: image both survive the strip');
      } else {
        fail(
          'SVG egress strip is over-eager',
          `url(#g)=${html.includes('url(#g)')} data:image=${html.includes('data:image/png;base64,')}`,
        );
      }

      const cssKept = html.includes('.marker-box') && !html.includes('track-css-url');
      if (cssKept) {
        ok('The document keeps its own stylesheet while the remote rule inside it is cut');
      } else {
        fail('SVG egress CSS', `.marker-box=${html.includes('.marker-box')} remote=${html.includes('track-css-url')}`);
      }

      const titleKept = /<title>/.test(html) && /svg-egress/.test(html);
      if (titleKept) {
        ok('The wrapper document is intact after the round trip (title still names the source file)');
      } else {
        fail('SVG egress wrapper', 'the delivered document lost its <title> or the source name in it');
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-svg-egress.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('SVG HTML Subresource Egress', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  F-1c — a .docx whose altChunk holds remote markup must not become a page that fetches
  // ═══════════════════════════════════════════

  if (section('DOCX AltChunk Egress')) {
    try {
      // Built here rather than committed as a fixture: the interesting part is four XML files and one
      // MHT, and a binary in `fixtures/` would hide exactly the line under test (the remote `<img>`).
      // Mammoth cannot read this shape, so it is the altChunk recovery path that runs — and that path
      // hands over markup this extension never wrote.
      const { zipSync, strToU8 } = await import('fflate');
      const canaryUrl = `http://127.0.0.1:${PORT}/canary/altchunk-img.png`;
      const mht = [
        'MIME-Version: 1.0',
        'Content-Type: multipart/related; type="text/html"; boundary="----=_tafe2"',
        '',
        '------=_tafe2',
        'Content-Type: text/html; charset="utf-8"',
        'Content-Location: file:///C:/fake/document.html',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        `<html><body><h1>Recovered body</h1><p>plain text that must survive</p>` +
          `<img src="${canaryUrl}" alt="remote"><img src="data:image/png;base64,iVBORw0KGgo=" alt="local"></body></html>`,
        '------=_tafe2--',
        '',
      ].join('\r\n');
      const docx = zipSync(
        {
          '[Content_Types].xml': strToU8(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
              '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
              '<Default Extension="xml" ContentType="application/xml"/>' +
              '<Default Extension="mht" ContentType="message/rfc822"/>' +
              '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
          ),
          '_rels/.rels': strToU8(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
          ),
          'word/document.xml': strToU8(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
              'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
              'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
              '<w:body><m:altChunk r:id="chunk1"/><w:sectPr/></w:body></w:document>',
          ),
          'word/_rels/document.xml.rels': strToU8(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              '<Relationship Id="chunk1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.mht"/></Relationships>',
          ),
          'word/afchunk.mht': strToU8(mht),
        },
        { level: 6 },
      );

      await resetWorkbench(page);
      const fi = await page.$('input[type="file"]');
      await fi.setInputFiles({
        name: 'altchunk-remote.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from(docx),
      });
      await page.waitForTimeout(1200);
      const tag = await page.$eval('.file-item .el-tag--primary', el => el.textContent.trim()).catch(() => '');
      await pickTarget(page, 'HTML (.html)');
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

      if (tag.includes('Word')) {
        ok(`The altChunk document is recognised as Word (${tag})`);
      } else {
        fail('DOCX AltChunk Egress', `format tag was "${tag}" — the route below may not be the one under test`);
      }

      const html = await downloadBatchArtifact(page);
      const recovered = html.includes('Recovered body');
      if (recovered) {
        ok('The altChunk body was recovered, so the probes below read the path that carries remote markup');
      } else {
        fail('DOCX AltChunk Egress', 'no recovered body in the artifact — nothing was tested');
      }
      if (!html.includes('/canary/')) {
        ok('No remote reference from the embedded HTML survives into the delivered document');
      } else {
        fail(
          'DOCX egress',
          `the delivered page would fetch: ${JSON.stringify([...html.matchAll(/\/canary\/[^"' )]+/g)].map(m => m[0]))}`,
        );
      }
      const localKept = html.includes('plain text that must survive') && html.includes('data:image/png;base64,');
      if (localKept) {
        ok('The document’s own text and its embedded data: image both survive the strip');
      } else {
        fail(
          'DOCX egress strip is over-eager',
          `text=${html.includes('plain text that must survive')} dataImage=${html.includes('data:image/png;base64,')}`,
        );
      }

      // The claim is about what happens when the user opens the file, so open it. The converter itself
      // never issues a request — only the renderer does, which is what the byte-level check above
      // cannot see on its own.
      if (recovered) {
        const out = path.join(os.tmpdir(), `taf-altchunk-${Date.now()}.html`);
        fs.writeFileSync(out, html, 'latin1');
        canaryHits.length = 0;
        const viewer = await browser.newPage();
        await viewer.goto(`file://${out}`).catch(() => {});
        await viewer.waitForTimeout(2000);
        await viewer.close();
        fs.rmSync(out, { force: true });
        if (canaryHits.length === 0) {
          ok('Opening the delivered page issues no request at all (measured against the harness server)');
        } else {
          fail('DOCX egress', `opening the delivered page fetched ${JSON.stringify(canaryHits)}`);
        }
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-docx-altchunk-egress.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('DOCX AltChunk Egress', e.message);
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
  //  TEXT ENCODING — UTF-16 in, unreadable bytes refused
  // ═══════════════════════════════════════════

  if (section('Text Encoding Gate')) {
    try {
      // One CSV, written four ways. In memory rather than in `fixtures/` on purpose: the claim is about
      // the *bytes*, and a fixture is a file some later editor may quietly re-save as UTF-8 — which would
      // leave four green assertions testing one encoding. CSV→HTML is the route because it writes the
      // decoded text straight into the artifact, so the assertion reads the values rather than a copy
      // this suite had to re-encode to compare against.
      const csv = 'name,city\nAlice,上海\n';
      const le = Buffer.from(csv, 'utf16le');
      const latin1 = value => Buffer.from(value, 'utf8').toString('latin1');
      const shapes = [
        ['UTF-16LE with BOM (Excel「Unicode 文本」)', Buffer.concat([Buffer.from([0xff, 0xfe]), le])],
        ['UTF-16LE without BOM', le],
        ['UTF-16BE with BOM', Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(le).swap16()])],
        ['UTF-8 with BOM', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv, 'utf8')])],
      ];
      const broken = [];
      for (const [name, buffer] of shapes) {
        await resetWorkbench(page);
        const run = await convertFile(page, { name: 'encoded.csv', mimeType: 'text/csv', buffer }, 'HTML (.html)');
        if (!run.alertTitle.includes('完成')) {
          broken.push(`${name}: conversion reported ${run.alertTitle}`);
          continue;
        }
        const html = await downloadBatchArtifact(page);
        // Every marker is a value the file itself carries. `Alice` is the one that used to fail quietly:
        // UTF-16LE's NUL padding is valid UTF-8, so the bare shape sailed through the chain, the batch
        // reported success, and the field arrived as `A\0l\0i\0c\0e\0` — hence the absence checks rather
        // than a byte-for-byte diff. The BOM check is the same failure seen from the other side: a
        // U+FEFF that reaches a cell would be a value that is not quite the value.
        const problems = [];
        if (!html.includes('Alice')) problems.push('the Latin value did not survive');
        if (!html.includes(latin1('上海'))) problems.push('the CJK value did not survive');
        if (html.includes('\x00')) problems.push('the artifact carries NULs');
        if (html.includes(latin1('\ufeff'))) problems.push('a BOM leaked into the text');
        if (problems.length) broken.push(`${name}: ${problems.join(', ')}`);
      }
      if (broken.length === 0) {
        ok('CSV written as UTF-16LE with and without BOM, UTF-16BE and UTF-8 reaches HTML with its values intact');
      } else {
        fail('Text encoding gate', broken.join('; '));
      }

      /** The diagnostic a refused source prints, or `''` when the run produced no failure row. */
      const failureReason = () => page.$eval('.failure-item .failure-reason', el => el.textContent).catch(() => '');

      await resetWorkbench(page);
      const notText = await convertFile(
        page,
        {
          name: 'pretender.csv',
          mimeType: 'image/gif',
          buffer: fs.readFileSync(path.join(FIXTURE_PATH, 'sample.gif')),
        },
        'HTML (.html)',
      );
      // The extension says CSV and the bytes say otherwise. Every compressed fixture this was measured
      // against (GIF, ZIP, DOCX, XLSX, plus public/icon/128.png) fails all three strict decodes of the
      // chain, so the read itself is the gate and the user gets a named encoding failure instead of a
      // converted file nobody can open.
      if (!notText.alertTitle.includes('完成') && (await failureReason()).includes('CSV 解码失败')) {
        ok('Binary bytes wearing a .csv name are refused with the encoding diagnostic, not converted');
      } else {
        fail('Binary as CSV', `alert="${notText.alertTitle}" reason="${(await failureReason()).trim()}"`);
      }

      await resetWorkbench(page);
      const cjkOnlyUtf16 = await convertFile(
        page,
        {
          name: 'no-bom-cjk.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from('名称,城市\n爱丽丝,上海\n', 'utf16le'),
        },
        'HTML (.html)',
      );
      // The one UTF-16 shape the sniff deliberately declines to claim: with every unit carrying two
      // non-zero bytes there is no parity left to read, so the bytes are indistinguishable from a GBK
      // file and GB18030 returns 24 characters of which six are control characters (four of them NULs).
      // Converting that is the silent-success outcome; refusing it is the honest one, and it is what
      // `countControlChars` exists for. Lowering the sniff threshold to accept this shape instead would
      // hijack real GBK.
      if (!cjkOnlyUtf16.alertTitle.includes('完成') && (await failureReason()).includes('CSV 解码失败')) {
        ok('All-CJK UTF-16 without a BOM is refused rather than converted into NUL-riddled text');
      } else {
        fail('Ambiguous UTF-16', `alert="${cjkOnlyUtf16.alertTitle}" reason="${(await failureReason()).trim()}"`);
      }
    } catch (e) {
      fail('Text Encoding Gate', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  JSON → CSV KEEPS ROWS THAT HAVE NO KEYS
  // ═══════════════════════════════════════════

  if (section('JSON To CSV Scalar Rows')) {
    try {
      const toCsv = async body => {
        await resetWorkbench(page);
        const run = await convertFile(
          page,
          { name: 'rows.json', mimeType: 'application/json', buffer: Buffer.from(body) },
          'CSV (.csv)',
        );
        if (!run.alertTitle.includes('完成')) throw new Error(`conversion reported ${run.alertTitle}`);
        // `downloadBatchArtifact` hands back bytes as latin1, so the UTF-8 BOM arrives as `ï»¿`.
        // It is real output — the writer always prepends it — but it is not part of the header,
        // and the assertions below anchor on line starts.
        return (await downloadBatchArtifact(page)).replace(/^\u00EF\u00BB\u00BF/, '');
      };

      // A JSON array is free to mix shapes, and an element with no keys has no column to land under. The
      // header union used to be the whole story: `[{"a":1},2]` wrote a header, dropped the 2, and the
      // batch line read `done`. 1 000 records arriving as 980 rows is the one outcome this project cannot
      // ship, so a synthetic `_value` column carries whatever had no keys — and only appears when
      // something actually needs it, which is what the second assertion pins.
      const mixed = await toCsv('[{"name":"Alice","score":1},{"name":"Bob","score":2},42,"note"]');
      const mixedProblems = [];
      if (!mixed.includes('_value')) mixedProblems.push('no _value column');
      if (!/,42,?\s*$/m.test(mixed)) mixedProblems.push('the bare 42 is missing');
      if (!/,note,?\s*$/m.test(mixed)) mixedProblems.push('the bare string is missing');
      if (!/name,score,_value/.test(mixed)) mixedProblems.push(`header is ${mixed.split('\n')[0]}`);
      if (mixedProblems.length === 0) ok('Mixed-shape JSON exports every row, with keyless values under _value');
      else fail('JSON→CSV scalar rows', mixedProblems.join('; '));

      const plain = await toCsv('[{"name":"Alice","score":1},{"name":"Bob","score":2}]');
      if (!plain.includes('_value') && /Alice,1/.test(plain) && /Bob,2/.test(plain)) {
        ok('An all-object array writes no _value column — the synthetic one appears only when it is used');
      } else {
        fail('JSON→CSV column hygiene', `header=${plain.split('\n')[0]}`);
      }

      // A plain scalar array used to be rejected outright. Each element is a row under the same
      // synthetic column, so `[1,2,3]` is a one-column table rather than an error.
      const scalars = await toCsv('[1,2,3]');
      if (/^_value\s*$/.test(scalars.split('\n')[0]) && /^1\s*$/m.test(scalars) && /^3\s*$/m.test(scalars)) {
        ok('A scalar array converts to a single _value column instead of failing');
      } else {
        fail('JSON→CSV scalar array', `csv=${JSON.stringify(scalars.slice(0, 80))}`);
      }

      // The synthetic column must not overwrite a record's real `_value` field: the only way to keep
      // both pieces of data is to move the synthetic column aside.
      const collision = await toCsv('[{"_value":"real"},7]');
      const collisionHeader = collision.split('\n')[0].trim();
      if (collisionHeader === '_value,_value_2' && /^real,\s*$/m.test(collision) && /^,7\s*$/m.test(collision)) {
        ok('A record that declares _value keeps it; the synthetic column becomes _value_2');
      } else {
        fail('JSON→CSV _value collision', `csv=${JSON.stringify(collision.slice(0, 120))}`);
      }

      // Headers are the union across records, so a key present in one row is *read* in every row — and
      // reading `constructor` off an object that never declared it walks the prototype chain and hands
      // back a function. `Object.hasOwn` is the guard, and `[Function: Object]` in a cell is its absence.
      const proto = await toCsv('[{"a":1},{"constructor":"x"}]');
      // `\s*$` on the row ends because SheetJS writes `\r\n` separators by default — a `$` alone would
      // be testing end-of-string and the whole shape of this assertion would go silently unchecked.
      if (!proto.includes('Function') && /^1,\s*$/m.test(proto) && /,x\s*$/m.test(proto)) {
        ok('A key only one record declares yields an empty cell, never a prototype value');
      } else {
        fail('JSON→CSV prototype read', `csv=${JSON.stringify(proto.slice(0, 80))}`);
      }
    } catch (e) {
      fail('JSON To CSV Scalar Rows', e.message);
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
  //  XLSX DIMENSION BOMB (declared <dimension> is untrusted)
  // ═══════════════════════════════════════════

  if (section('XLSX Dimension Bomb')) {
    try {
      // Both fixtures are structurally valid workbooks; only the declared sheet extent lies. The
      // first claims the full grid (A1:XFD1048576, ~17 billion cells) around a single cell, the
      // second truthfully spans 500 001 rows — past the per-sheet budget. A guard that trusted
      // `!ref` would walk the first rectangle and hang, so asserting on the converted output is
      // the only way to tell "narrowed to reality" from "survived because it was lucky".
      await resetWorkbench(page);
      const forged = await convertFile(page, 'sample-xlsx-dimension.xlsx', 'CSV (.csv)');
      if (!forged.alertTitle.includes('完成')) throw new Error(`forged dimension failed: ${forged.alertTitle}`);
      const csv = await downloadBatchArtifact(page);
      if (csv.includes('ok') && csv.length < 64) {
        ok('a forged A1:XFD1048576 dimension converts from the actual extent, not the declared one');
      } else {
        fail('XLSX forged dimension', `csv length ${csv.length}: ${JSON.stringify(csv.slice(0, 80))}`);
      }

      await resetWorkbench(page);
      const overflow = await convertFile(page, 'sample-xlsx-overflow.xlsx', 'CSV (.csv)');
      const reason = (await page.$eval('.failure-item .failure-reason', el => el.textContent).catch(() => '')).trim();
      if (!overflow.alertTitle.includes('完成') && reason.includes('单元格数量过多')) {
        ok('a sheet whose real span exceeds the cell budget fails loudly with its own diagnostic');
      } else {
        fail('XLSX overflow budget', `alert="${overflow.alertTitle}" reason="${reason}"`);
      }
    } catch (e) {
      fail('XLSX Dimension Bomb', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  JSON RESULT PREVIEW (regression: was blank; now tree / array table / raw)
  // ═══════════════════════════════════════════

  section('JSON Result Preview');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample.csv', 'JSON (.json)');

    const previewBtn = await page.$('.result-item button[title="预览"]');
    if (!previewBtn) throw new Error('result preview button not found');
    await previewBtn.click();
    await page.waitForTimeout(800);

    // The dialog used to show one wall of text for JSON; the claim "not blank" is now carried by the
    // tree having rows, and the raw text stays reachable as its own view (asserted last).
    const rows = await page.$$eval('.preview-dialog .json-row', els => els.length).catch(() => 0);
    if (rows > 0) {
      ok(`JSON preview opens on the tree (${String(rows)} rows)`);
    } else {
      fail('JSON result preview', 'tree painted no rows');
    }
    // A projection exists for the document's biggest array even while the tree is up, so "one pane at
    // a time" is not a property of the model — it is the radio group's, and it is the first thing a
    // reader would notice broken. Recorded here and judged after the table view is opened.
    const gridsWhileTreeUp = await page.$$eval('.preview-dialog .json-grid', els => els.length).catch(() => -1);

    // Search is the reason the tree exists: a key in a fixture row must highlight, and the counter
    // must agree with how many runs got marked.
    await page.fill('.preview-dialog .json-search input', '名称');
    await page.waitForTimeout(400);
    const marked = await page.$$eval('.preview-dialog .json-row mark', els => els.length).catch(() => 0);
    const counter = await page.$eval('.preview-dialog .json-count', el => el.textContent).catch(() => '');
    if (marked > 0 && /共/.test(counter ?? '')) {
      ok(`Tree search highlights the key (${String(marked)} marks, counter "${String(counter).trim()}")`);
    } else {
      fail('JSON tree search', `no highlight (${String(marked)} marks, counter "${String(counter).trim()}")`);
    }

    // An array of row objects is exactly the shape the table view is for: three columns, one row each.
    await page.click('.preview-dialog .el-radio-button__inner:has-text("数组表")');
    await page.waitForTimeout(400);
    const grid = await page
      .$eval('.preview-dialog .json-grid', el => ({
        cols: el.querySelectorAll('thead th').length,
        body: el.querySelectorAll('tbody tr').length,
      }))
      .catch(() => null);
    if (grid && grid.cols >= 3 && grid.body > 0) {
      ok(`Array table projects the rows (${String(grid.cols)} columns, ${String(grid.body)} rows)`);
    } else {
      fail('JSON array table', `table did not project (${JSON.stringify(grid)})`);
    }
    // The other half of the same claim: the tree that stayed behind is hidden, not stacked under the
    // grid. It is `v-show` rather than `v-if` on purpose — expansion and the query survive the jump —
    // so the observable form of "hidden" is its computed display, not its absence from the DOM. The
    // component root is what `v-show` toggles, and `display` does not inherit, so measuring a
    // descendant would read `block` no matter what the pane looks like.
    const treeDisplay = await page
      .$eval('.preview-dialog .json-tree', el => getComputedStyle(el).display)
      .catch(() => 'missing');
    if (gridsWhileTreeUp === 0 && treeDisplay === 'none') {
      ok(
        `The two JSON panes never paint together (grid ${String(gridsWhileTreeUp)} in tree view, tree ${treeDisplay} in table view)`,
      );
    } else {
      fail('JSON views exclusive', `gridsWhileTreeUp=${String(gridsWhileTreeUp)} treeDisplay=${treeDisplay}`);
    }

    // And the text the dialog always showed is still there, unchanged, as the third view.
    await page.click('.preview-dialog .el-radio-button__inner:has-text("原文")');
    await page.waitForTimeout(400);
    const text = await page.$eval('.preview-dialog .text-preview', el => el.textContent).catch(() => '');
    if (text && text.trim().length > 0) {
      ok(`Raw view keeps the pretty-printed JSON (${text.trim().length} chars)`);
    } else {
      fail('JSON raw view', 'preview content is blank');
    }

    // The header's whole-document copy. `writeText` is replaced rather than granted because the point
    // of this assertion is the string the button hands over — the pane's exact text, not a truncated
    // or re-encoded version of it — and a real clipboard write would only say that some text went
    // somewhere. Existing toasts are removed first so the one below is unambiguously this click's.
    await page.evaluate(() => {
      document.querySelectorAll('.el-message').forEach(el => el.remove());
      window.__tafCopy = null;
      window.navigator.clipboard.writeText = value => {
        window.__tafCopy = value;
        return Promise.resolve();
      };
    });
    await page.click('.preview-dialog button[aria-label="复制"]');
    await page.waitForTimeout(400);
    const copied = await page.evaluate(() => window.__tafCopy);
    const copyToast = await page.$$eval('.el-message', els => els.map(el => (el.textContent || '').trim()));
    if (copied === text && copyToast.some(m => m.includes('已复制到剪贴板'))) {
      ok(`Header copy hands the pane's exact text to the clipboard (${String(copied.length)} chars)`);
    } else {
      fail(
        'Preview header copy',
        `copied=${JSON.stringify(typeof copied === 'string' ? copied.slice(0, 60) : copied)} toasts=${JSON.stringify(copyToast)}`,
      );
    }

    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-json-preview.png`), fullPage: true });

    // Close the dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } catch (e) {
    fail('JSON result preview', e.message);
  }

  // ═══════════════════════════════════════════
  //  STICKY JSON ROW ORDINALS (the array table scrolls sideways; the row number must not)
  // ═══════════════════════════════════════════

  if (section('Sticky JSON Row Ordinals')) {
    try {
      // A payload wide enough that `width: max-content` really overflows the pane: without that, every
      // assertion below passes vacuously on a grid that never scrolls.
      const columns = Array.from({ length: 14 }, (_, i) => `字段名称${i + 1}（这一列名字挺长的）`);
      const wide = {
        name: 'wide-ordinals.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          [columns.join(','), ...[1, 2, 3, 4].map(r => columns.map((_, c) => `值${r}-${c}`).join(','))].join('\n'),
          'utf8',
        ),
      };

      await resetWorkbench(page);
      await convertFile(page, wide, 'JSON (.json)');
      await page.click('.result-item button[title="预览"]');
      await page.waitForSelector('.preview-dialog .json-row', { timeout: 15000 });
      await page.click('.preview-dialog .el-radio-button__inner:has-text("数组表")');
      await page.waitForSelector('.preview-dialog .json-grid', { timeout: 15000 });
      await page.waitForTimeout(400);

      const m = await page.evaluate(() => {
        const sc = document.querySelector('.json-table-scroll');
        const idx = document.querySelector('.json-grid tbody th.json-index');
        const evenIdx = document.querySelector('.json-grid tbody tr:nth-child(even) th.json-index');
        const head = document.querySelector('.json-grid thead th.json-index');
        const data = document.querySelector('.json-grid tbody tr').children[1];
        const cs = getComputedStyle(idx);
        const rect = el => el.getBoundingClientRect();
        const before = { idxX: rect(idx).x, dataX: rect(data).x };
        sc.scrollLeft = 600;
        const ir = rect(idx);
        const hit = document.elementFromPoint(ir.left + ir.width / 2, ir.top + ir.height / 2);
        const out = {
          overflow: sc.scrollWidth - sc.clientWidth,
          scrollLeft: sc.scrollLeft,
          position: cs.position,
          left: cs.left,
          pinnedDelta: rect(idx).x - rect(sc).left,
          dataDelta: rect(data).x - before.dataX,
          hitIsPinned: !!(hit && hit.closest('th.json-index')),
          oddBg: cs.backgroundColor,
          evenBg: getComputedStyle(evenIdx).backgroundColor,
          dialogBg: getComputedStyle(document.querySelector('.el-dialog')).backgroundColor,
          surface2: getComputedStyle(document.documentElement).getPropertyValue('--fat-surface-2').trim(),
          headTopDelta: rect(head).top - rect(sc).top,
        };
        sc.scrollLeft = 0;
        return out;
      });

      const sameColor = (a, b) => {
        const x = parseColor(a);
        const y = parseColor(b);
        return !!x && !!y && x.join(',') === y.join(',');
      };
      const checks = [
        [
          `The array grid really scrolls sideways (${String(m.overflow)} px past the pane), so pinning has something to pin against`,
          m.overflow >= 400,
        ],
        [
          `The ordinal cell is pinned to the scroller (position ${m.position}, left ${m.left})`,
          m.position === 'sticky' && m.left === '0px',
        ],
        [
          `It stays at the pane's left edge under 600 px of scroll (Δ ${m.pinnedDelta.toFixed(2)} px)`,
          Math.abs(m.pinnedDelta) <= 1.5,
        ],
        [
          `A data column moved the whole distance (Δ ${m.dataDelta.toFixed(0)} px), so the scroll was real`,
          Math.abs(m.dataDelta + 600) <= 2,
        ],
        ['Nothing scrolls over it: the hit test at its centre returns the pinned cell', m.hitIsPinned === true],
        // The backdrop is the other half of the fix: the zebra lives on the `tr`, so a transparent sticky
        // cell would let the scrolled text show through it. Compared against what the dialog itself
        // paints with and against the token the even rows use — never against a hardcoded colour.
        [`An odd row's pinned cell paints the dialog's own surface (${m.oddBg})`, sameColor(m.oddBg, m.dialogBg)],
        [
          `An even row's pinned cell keeps the zebra colour (${m.evenBg} = --fat-surface-2 ${m.surface2})`,
          sameColor(m.evenBg, m.surface2),
        ],
        [
          `The header's corner cell stays at the top too (Δ ${m.headTopDelta.toFixed(2)} px)`,
          Math.abs(m.headTopDelta) <= 1.5,
        ],
      ];
      for (const [claim, holds] of checks) {
        if (holds) ok(claim);
        else fail('Sticky JSON Row Ordinals', `claim did not hold: ${claim}`);
      }

      await page.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-json-ordinals-sticky.png`),
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } catch (e) {
      fail('Sticky JSON Row Ordinals', e.message);
    }
  }

  // ═══════════════════════════════════════════
  //  HTML→MD TABLE ROUNDTRIP (regression: default Turndown rules dropped tables)
  // ═══════════════════════════════════════════

  section('HTML→MD Table Roundtrip');
  try {
    // Two text-extraction facts about one fixture, reported as one assertion because they are the same
    // claim seen twice: markup that carries structure must keep it after the tags are gone.
    const broken = [];

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
    if (!(text.includes('| K | V |') && text.includes('| --- | --- |') && text.includes('| a | 1 |'))) {
      broken.push(`markdown lost the table: "${text.slice(0, 120)}"`);
    }
    await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-html-to-md-table.png`), fullPage: true });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // `<ol>` markers are painted by the renderer from an item's position, so they are not text nodes
    // and the plain-text walk used to lose them — a numbered procedure arrived as an unordered list
    // that looked whole because the newlines stayed. `<ul>` has to come through *without* a marker:
    // the same function handles both branches, and a bullet invented here would be a character the
    // source never had.
    await resetWorkbench(page);
    await convertFile(page, 'sample.html', 'Text (.txt)');
    const txtBtn = await page.$('.result-item button[title="预览"]');
    if (!txtBtn) throw new Error('text result preview button not found');
    await txtBtn.click();
    await page.waitForTimeout(800);
    const plain = await page.$eval('.preview-dialog .text-preview', el => el.textContent).catch(() => '');
    if (!/1\.\s*first/.test(plain) || !/2\.\s*second/.test(plain)) {
      broken.push(`numbering lost: "${plain.slice(0, 160)}"`);
    }
    if (!/^one$/m.test(plain) || /^1\.\s*one$/m.test(plain)) {
      broken.push(`bullet list changed: "${plain.slice(0, 160)}"`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    if (broken.length === 0) {
      ok('HTML→MD keeps the sample table and HTML→TXT keeps ordered-list numbering');
    } else {
      fail('HTML structure in text output', broken.join('; '));
    }
  } catch (e) {
    fail('HTML→MD table roundtrip', e.message);
  }

  // ═══════════════════════════════════════════
  //  TASK LIST ROUND TRIP (regression: turndown swallowed the GFM checkbox)
  // ═══════════════════════════════════════════

  section('Task list round-trip');
  try {
    // One claim seen at two boundaries, counted once: a checkbox the document really carries has to
    // survive the sanitizer that renders it *and* the serializer that writes it back out. Counting
    // per substring would make the suite total depend on how many lines this section happens to check.
    //
    // The fixture is ASCII on purpose: `downloadBatchArtifact` returns a byte-preserving latin1
    // string, so the intermediate HTML can be re-uploaded without a decode step and the assertions
    // below compare against text that never passed through a charset guess.
    const broken = [];
    const lineWith = (text, needle) => text.split('\n').find(line => line.includes(needle)) ?? '';

    await resetWorkbench(page);
    const mid = await convertFile(page, 'sample-tasklist.md', 'HTML (.html)');
    if (!mid.alertTitle.includes('完成')) throw new Error(`md→html did not finish: ${mid.alertTitle}`);
    const html = await downloadBatchArtifact(page);
    // Measured, not assumed: `marked` (gfm) writes `<input checked disabled type="checkbox">` and
    // the html profile `md-to-html.ts` uses does not drop `<input>`.
    if (!/type="checkbox"/.test(html)) broken.push('md→html lost the checkbox element');
    if (!/checked=""/.test(html)) broken.push('md→html lost the checked state');

    await resetWorkbench(page);
    const carried = { name: 'tasklist.html', mimeType: 'text/html', buffer: Buffer.from(html, 'latin1') };
    const back = await convertFile(page, carried, 'Markdown (.md)');
    if (!back.alertTitle.includes('完成')) throw new Error(`html→md did not finish: ${back.alertTitle}`);
    const md = await downloadBatchArtifact(page);
    if (!/\[x\]/.test(lineWith(md, 'alpha'))) broken.push(`checked lost on the way out: "${lineWith(md, 'alpha')}"`);
    if (!/\[ \]/.test(lineWith(md, 'beta'))) broken.push(`unchecked lost on the way out: "${lineWith(md, 'beta')}"`);
    // Nesting is the second half of the same regression: with the checkbox gone the item's line
    // began with a space, and that one space pushed the nested item past the four-space code-block
    // threshold — which is why this round trip used to hand back a fence instead of a list.
    const nested = lineWith(md, 'gamma');
    if (!/^ {4}\S.*\[x\]/.test(nested)) broken.push(`nested item is not an indented checkbox: "${nested}"`);

    if (broken.length === 0) ok('Task list keeps both checkbox states and its nesting through md→html→md');
    else fail('Task list round trip', broken.join('; '));
  } catch (e) {
    fail('Task list round trip', e.message);
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
     * batch's headline the moment this one starts, so the card leaving is the start signal and its
     * return is the end. A headline-*changed* wait would hang on the retarget case below: the old
     * 「转换完成！」 and the new one are the same sentence, and the only moment that separates them
     * is the card being unmounted while `isDone` is false.
     */
    const convertBatch = async () => {
      await page.click('.convert-btn');
      await page
        .waitForFunction(() => !document.querySelector('.result-download'), undefined, { timeout: 5000 })
        .catch(() => {});
      await page.waitForFunction(
        () => {
          const el = document.querySelector('.el-alert__title');
          return !!el && el.textContent.trim().length > 0;
        },
        undefined,
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

    // 2A: walking away from a target no longer throws the bytes away. The row keeps its own
    // badge (the selector says PDF while the row says HTML), the notice explains the disagreement,
    // and the download button still hands back the HTML that was actually produced. Only a new run
    // replaces the row — and that run is the one place the notice may disappear.
    await clearFiles();
    await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
    await page.waitForTimeout(1000);
    await pickTarget(page, 'HTML (.html)');
    await convertBatch();
    const keptName = (await resultNames())[0];
    const keptBytes = await downloadBatchArtifact(page);
    await pickTarget(page, 'PDF (.pdf)');
    if ((await rowCount('.result-item')) === 1) ok('Switching the target keeps the results already made');
    else fail('Retarget keeps results', `${await rowCount('.result-item')} result(s) left after the switch`);
    const keptBadge = await page.$eval('.result-item .result-target', el => el.textContent.trim()).catch(() => '');
    if (keptBadge === 'HTML (.html)') ok('A kept row still says which format its bytes are');
    else fail('Retarget row badge', `row reads "${keptBadge}"`);
    const staleNotice = await page
      .$$eval('.el-alert__title', els => els.map(el => el.textContent.trim()).find(text => text.includes('当前目标是')))
      .catch(() => '');
    if (staleNotice?.includes('PDF (.pdf)') && staleNotice?.includes('HTML (.html)'))
      ok('A kept row is explained against the target now selected');
    else fail('Stale result notice', `notice reads "${staleNotice}"`);
    const unchangedBytes = await downloadBatchArtifact(page);
    if (unchangedBytes === keptBytes) ok('A kept result still downloads the bytes it was made from');
    else fail('Kept result download', 'the downloaded bytes changed without a new conversion');

    await convertBatch();
    const rerunNames = await resultNames();
    const rerunBadge = await page.$eval('.result-item .result-target', el => el.textContent.trim()).catch(() => '');
    if (
      rerunNames.length === 1 &&
      rerunBadge === 'PDF (.pdf)' &&
      /^sample_\d{8}_\d{6}\.pdf$/.test(rerunNames[0]) &&
      rerunNames[0] !== keptName
    ) {
      ok('Re-running under the new target replaces the stale row with the new format');
    } else {
      fail('Retarget re-run', `rows=[${rerunNames}] badge="${rerunBadge}"`);
    }
    const noticeGone = await page
      .$$eval('.el-alert__title', els => els.some(el => el.textContent.includes('当前目标是')))
      .catch(() => false);
    if (!noticeGone) ok('The stale notice leaves once the rows match the selector');
    else fail('Stale notice clear', 'the notice survived a run under the new target');

    await page.screenshot({
      path: shot(`${String(shotIdx++).padStart(2, '0')}-file-set-edit.png`),
      fullPage: true,
    });
    await clearFiles();
  } catch (e) {
    fail('File set edits keep unrelated results', e.message);
  }

  // ═══════════════════════════════════════════
  //  MERGED IMAGE PDF (2B)
  // ═══════════════════════════════════════════
  //
  // One PDF written from several images. The assertions read the artifact rather than the panel:
  // page count comes out of the PDF's own `/Type /Page` objects, and the encoders per image XObject
  // show which branch each source took (PNG pass-through and the BMP re-encode end up FlateDecode,
  // the JPEG pass-through DCTDecode). A wrong panel sentence cannot satisfy either.
  if (section('Merged Image PDF')) {
    const mergedPage = await browser.newPage();
    tolerateScreenshotTimeout(mergedPage);
    trackPageErrors(mergedPage);
    try {
      await mergedPage.setViewportSize({ width: 1280, height: 900 });
      // The twelve-file cancel scenario would otherwise stop at the pre-conversion confirmation,
      // and the cancel button would never mount — that dialog has its own section below.
      await mergedPage.addInitScript(mockChromeStorage({ 'fat:confirmConvert': false }));
      await mergedPage.goto(`http://localhost:${PORT}/options.html`);
      await mergedPage.waitForTimeout(1200);

      const pngBuf = Buffer.from(solidPngBase64(64, 48, [214, 64, 64]).split(',')[1], 'base64');
      // The JPEG has to come out of a real encoder, and the page has one. Generated before any file
      // is staged so the canvas never shares a frame with a conversion.
      const jpegB64 = await mergedPage.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 72;
        canvas.height = 54;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.fillStyle = '#2f6f4f';
        ctx.fillRect(0, 0, 72, 54);
        return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      });
      if (!jpegB64) throw new Error('could not produce a JPEG in the page');
      const jpegBuf = Buffer.from(jpegB64, 'base64');

      const historyRecords = () =>
        mergedPage.evaluate(() => window.chrome.storage.local.get('fat:history')).then(r => r['fat:history'] ?? []);
      const resetMerged = async () => {
        await resetWorkbench(mergedPage);
        // The upload card re-enters after 重新转换, so the clear button is still moving when the
        // reset returns. Wait for the list's own expand transition, then click: that button
        // unmounts the list it sits in, and Playwright can sample the node between the press and
        // Vue's patch and report "not attached" even though `clearAll` ran. The state check below
        // is the authoritative one — without it a swallowed click would leak files into the next
        // scenario.
        await mergedPage
          .waitForFunction(
            () => {
              const list = document.querySelector('.file-list-expand');
              return !!list && list.getAnimations({ subtree: true }).every(a => a.playState === 'finished');
            },
            undefined,
            { timeout: 5000 },
          )
          .catch(() => {});
        const clear = await mergedPage.$('.clear-files-btn');
        if (clear) {
          await clear.click().catch(() => {});
          const cleared = await mergedPage
            .waitForFunction(() => !document.querySelector('.clear-files-btn'), undefined, { timeout: 5000 })
            .then(
              () => true,
              () => false,
            );
          if (!cleared) throw new Error('the file list did not clear before the next merge scenario');
          await mergedPage.waitForTimeout(300);
        }
      };
      const upload = async entries => {
        const fi = await mergedPage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
        await fi.setInputFiles(entries);
        await mergedPage.waitForTimeout(1200);
        await pickTarget(mergedPage, 'PDF (.pdf)');
      };
      const runMerge = async timeout => {
        await mergedPage.click('.convert-btn');
        await mergedPage.waitForFunction(
          () => {
            const el = document.querySelector('.el-alert__title');
            return !!el && el.textContent.trim().length > 0;
          },
          undefined,
          { timeout },
        );
        await mergedPage.waitForTimeout(400);
      };

      await upload([
        { name: 'merge-a.png', mimeType: 'image/png', buffer: pngBuf },
        { name: 'merge-b.jpg', mimeType: 'image/jpeg', buffer: jpegBuf },
        {
          name: 'sample.bmp',
          mimeType: 'image/bmp',
          buffer: fs.readFileSync(path.join(FIXTURE_PATH, 'sample.bmp')),
        },
      ]);
      if (await mergedPage.isVisible('.merge-row')) ok('A multi-image batch offers the merge checkbox');
      else fail('Merge checkbox', 'the merge row is missing for three mergeable images');
      const mergeHint = await mergedPage.$eval('.merge-hint', el => el.textContent.trim()).catch(() => '');
      if (mergeHint.includes('200')) ok('The merge row states the page ceiling');
      else fail('Merge hint', `hint reads "${mergeHint}"`);
      await mergedPage.locator('.merge-row .el-checkbox').click();
      await mergedPage.waitForTimeout(200);
      if (await mergedPage.$eval('.merge-row .el-checkbox', el => el.classList.contains('is-checked')))
        ok('The merge choice is a real checked state');
      else fail('Merge checkbox', 'the checkbox did not report checked after the click');

      await runMerge(60000);
      const mergedNames = await mergedPage.$$eval('.result-item .result-name', els =>
        els.map(el => el.textContent.trim()),
      );
      if (mergedNames.length === 1 && /^merge-a-merged_\d{8}_\d{6}\.pdf$/.test(mergedNames[0]))
        ok(`Three images arrive as one -merged PDF (${mergedNames[0]})`);
      else fail('Merged result', `rows [${mergedNames.join(', ')}]`);
      const mergedBadge = await mergedPage.$eval('.result-item .result-target', el => el.textContent.trim());
      if (mergedBadge === 'PDF (.pdf)') ok('The merged row is badged as the PDF it is');
      else fail('Merged badge', `row reads "${mergedBadge}"`);
      const mergedSummary = (await mergedPage.$$eval('.result-summary', els => els.map(el => el.textContent.trim())))
        .join(' | ')
        .replace(/\s+/g, ' ');
      if (mergedSummary.includes('3 张图片') && mergedSummary.includes('3 页'))
        ok('The result card says how many images became how many pages');
      else fail('Merged summary', `summary reads "${mergedSummary}"`);
      const downloadLabel = await mergedPage.$eval('.download-actions .el-button', el => el.textContent.trim());
      if (downloadLabel === '下载文件') ok('A merged batch offers one file, not a ZIP');
      else fail('Merged download label', `button reads "${downloadLabel}"`);

      const { pages: mergedPages, filters } = readPdfSliceFilters(await downloadBatchArtifact(mergedPage));
      if (mergedPages === 3) ok('The downloaded PDF really carries one page per image');
      else fail('Merged page count', `${mergedPages} page object(s)`);
      const jpegStreams = filters.filter(filter => filter === 'DCTDecode').length;
      const flateStreams = filters.filter(filter => filter === 'FlateDecode').length;
      if (filters.length === 3 && jpegStreams === 1 && flateStreams === 2)
        ok('Each source took its intended encoder (JPEG passthrough, PNG/Flate for the rest)');
      else fail('Merged encoders', `filters [${filters.join(', ')}]`);

      const mergedRecord = (await historyRecords())[0];
      const pagesCell = await mergedPage
        .$eval('.history-item .history-pages', el => el.textContent.trim())
        .catch(() => '');
      if (mergedRecord?.pageCount === 3 && mergedRecord.fileCount === 3 && mergedRecord.sourceFormat === 'png')
        ok('The history record keeps the page count and the source format');
      else fail('Merged history', JSON.stringify(mergedRecord));
      if (pagesCell === '3 页') ok('The history row prints the merged page count');
      else fail('Merged history cell', `cell reads "${pagesCell}"`);
      await mergedPage.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-merged-image-pdf.png`),
        fullPage: true,
      });

      // The single-image route is untouched by the merge pipeline: the checkbox keeps its in-memory
      // choice, but one file is not a batch to fold, and no `-merged` suffix may appear on its name.
      await resetMerged();
      await upload([{ name: 'merge-a.png', mimeType: 'image/png', buffer: pngBuf }]);
      if ((await mergedPage.$$('.merge-row')).length === 0) ok('A one-image batch hides the merge choice');
      else fail('Merge row on one file', 'the merge row is offered for a single image');
      await runMerge(30000);
      const singleName = await mergedPage.$eval('.result-item .result-name', el => el.textContent.trim());
      const singleSummary = await mergedPage.$$eval('.result-summary', els => els.map(el => el.textContent.trim()));
      if (/^merge-a_\d{8}_\d{6}\.pdf$/.test(singleName) && !singleSummary.some(t => t.includes('-merged')))
        ok('A single image still takes the ordinary PDF path');
      else fail('Single image path', `name "${singleName}" summary [${singleSummary.join(' | ')}]`);
      const single = readPdfSliceFilters(await downloadBatchArtifact(mergedPage));
      if (single.pages === 1) ok('The single-image PDF still has exactly one page');
      else fail('Single image pages', `${single.pages} page object(s)`);

      // Atomic failure: the second image cannot decode, and the whole run must leave no partial
      // PDF, name the image that broke, and keep the group together for the retry.
      await resetMerged();
      await upload([
        { name: 'good.png', mimeType: 'image/png', buffer: pngBuf },
        { name: 'broken.bmp', mimeType: 'image/bmp', buffer: Buffer.from('this is not a bitmap') },
      ]);
      await mergedPage.locator('.merge-row .el-checkbox').click();
      await mergedPage.waitForTimeout(200);
      const historyBeforeFailure = (await historyRecords()).length;
      await runMerge(30000);
      const failedResults = await mergedPage.$$eval('.result-item', els => els.length);
      const failureNames = await mergedPage.$$eval('.failure-item .failure-name', els =>
        els.map(el => el.textContent.trim()),
      );
      if (failedResults === 0) ok('A bad page leaves no partial PDF behind');
      else fail('Merged atomicity', `${failedResults} result row(s) survived a failed merge`);
      if (failureNames.length === 1 && failureNames[0] === 'broken.bmp')
        ok('The diagnostic names the image that broke, not the first one in the list');
      else fail('Merged failure name', `failures [${failureNames.join(', ')}]`);
      const retryLabel = await mergedPage.$eval('.retry-btn', el => el.textContent.trim()).catch(() => '');
      if (retryLabel === '重试失败项 (1)') ok('A merged failure is one retryable row');
      else fail('Merged retry label', `button reads "${retryLabel}"`);
      if ((await historyRecords()).length === historyBeforeFailure) ok('A failed merge writes no history record');
      else fail('Merged failure history', 'the failed merge was recorded as if it produced a file');

      // The retry has to carry the whole group, not just the one row that names the bad file: a
      // one-file retry would fall out of merged mode and never rebuild the PDF. The button's own
      // counter is the observable — `retryFailedFiles` hands `convert()` two files, so it reads /2.
      await mergedPage.evaluate(() => {
        window.__retryLabels = [];
        const button = document.querySelector('.convert-btn');
        if (!button) return;
        const record = () => {
          const text = button.textContent.trim();
          if (text && window.__retryLabels[window.__retryLabels.length - 1] !== text) {
            window.__retryLabels.push(text);
          }
        };
        new window.MutationObserver(record).observe(button, { childList: true, subtree: true, characterData: true });
      });
      await mergedPage.locator('.retry-btn').click();
      await mergedPage
        .waitForFunction(() => !document.querySelector('.failure-item'), undefined, { timeout: 5000 })
        .catch(() => {});
      await mergedPage.waitForFunction(
        () => !!document.querySelector('.failure-item') && !!document.querySelector('.retry-btn'),
        undefined,
        { timeout: 30000 },
      );
      await mergedPage.waitForTimeout(300);
      const retryLabels = await mergedPage.evaluate(() => window.__retryLabels);
      if (retryLabels.some(text => /重试失败项 \(\d+\/2\)/.test(text)))
        ok('Retrying a merged failure re-runs the whole group');
      else fail('Merged retry group', `button showed [${retryLabels.join(' → ')}]`);
      const retryNames = await mergedPage.$$eval('.failure-item .failure-name', els =>
        els.map(el => el.textContent.trim()),
      );
      if (
        retryNames.length === 1 &&
        retryNames[0] === 'broken.bmp' &&
        (await mergedPage.$$eval('.result-item', els => els.length)) === 0
      ) {
        ok('The re-run fails atomically again and keeps naming the bad image');
      } else {
        fail('Merged retry outcome', `failures [${retryNames.join(', ')}]`);
      }

      // Cancel is not a failure: no row, no file, no history. The images are big enough that the
      // cancel lands while the builder is still preparing pages rather than after it has finished.
      await resetMerged();
      const bigJpegB64 = await mergedPage.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 3000;
        canvas.height = 2000;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.fillStyle = '#88a';
        ctx.fillRect(0, 0, 3000, 2000);
        return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
      });
      if (!bigJpegB64) throw new Error('could not produce the large JPEG in the page');
      const bigJpegBuf = Buffer.from(bigJpegB64, 'base64');
      // Twelve pages, not four: the cancel has to land while the builder is still preparing pages,
      // and four solid-colour JPEGs can finish inside the time Playwright spends checking that the
      // button holds still. The count is the window, not an assertion.
      await upload(
        Array.from({ length: 12 }, (_, index) => ({
          name: `cancel-${index + 1}.jpg`,
          mimeType: 'image/jpeg',
          buffer: bigJpegBuf,
        })),
      );
      await mergedPage.locator('.merge-row .el-checkbox').click();
      await mergedPage.waitForTimeout(200);
      const historyBeforeCancel = (await historyRecords()).length;
      await mergedPage.click('.convert-btn');
      await mergedPage.waitForSelector('.cancel-btn', { timeout: 10000 });
      // The progress card is still entering when the button appears, so a normal click can spend
      // its whole budget re-checking a box that keeps moving; if the batch then ends, the handle is
      // detached. Force skips the stability wait, and the in-page dispatch is the fallback for the
      // frame where Vue has already replaced the node. The two assertions below read the app's
      // cancelled state, not how the click arrived.
      await mergedPage
        .locator('.cancel-btn')
        .click({ timeout: 1000, force: true })
        .catch(() => {});
      await mergedPage.evaluate(() => document.querySelector('.cancel-btn')?.click());
      const cancelled = await mergedPage
        .waitForFunction(
          () => {
            const el = document.querySelector('.el-alert__title');
            return !!el && el.textContent.includes('转换已取消');
          },
          undefined,
          { timeout: 30000 },
        )
        .then(
          () => true,
          () => false,
        );
      if (!cancelled) throw new Error('the merge finished before the cancel landed');
      await mergedPage.waitForTimeout(400);
      const cancelledRows = await mergedPage.$$eval('.result-item', els => els.length);
      const cancelledFailures = await mergedPage.$$eval('.failure-item', els => els.length);
      if (cancelledRows === 0 && cancelledFailures === 0) ok('A cancelled merge produces no partial result');
      else fail('Merged cancel', `${cancelledRows} result(s), ${cancelledFailures} failure(s)`);
      if ((await historyRecords()).length === historyBeforeCancel) ok('A cancelled merge writes no history');
      else fail('Merged cancel history', 'a cancelled merge was recorded');
    } catch (e) {
      fail('Merged image PDF', e.message);
    } finally {
      await mergedPage.close();
    }
  }

  // ═══════════════════════════════════════════
  //  PRESET EDITING (2A)
  // ═══════════════════════════════════════════
  if (section('Preset Editing')) {
    const editPage = await browser.newPage();
    tolerateScreenshotTimeout(editPage);
    trackPageErrors(editPage);
    try {
      await editPage.setViewportSize({ width: 1280, height: 900 });
      await editPage.addInitScript(
        mockChromeStorage({
          'fat:presets': [{ id: 'p1', name: '旧名字', target: 'png', options: { maxEdge: 800 } }],
        }),
      );
      await editPage.goto(`http://localhost:${PORT}/options.html`);
      await editPage.waitForTimeout(1200);
      if (!(await openPresetCard(editPage))) throw new Error('presets card did not open');

      const chipName = () => editPage.$eval('.preset-apply', el => el.textContent.trim()).catch(() => '');
      const storedPresets = () =>
        editPage.evaluate(() => window.chrome.storage.local.get('fat:presets')).then(r => r['fat:presets']);
      const lastMessage = async () => ((await editPage.locator('.el-message').last().textContent()) || '').trim();
      const openEdit = async () => {
        await editPage.locator('.preset-edit').first().click();
        await editPage.waitForSelector('#preset-edit-name', { timeout: 5000 });
      };

      await openEdit();
      await editPage.fill('#preset-edit-name', '改过的名字');
      await editPage.locator('.preset-edit-footer .el-button--primary').click();
      await editPage.waitForTimeout(500);
      if ((await chipName()) === '改过的名字') ok('Renaming a preset updates its chip');
      else fail('Preset rename', `chip reads "${await chipName()}"`);
      let stored = await storedPresets();
      if (stored?.[0]?.name === '改过的名字' && stored[0].target === 'png' && stored[0].options?.maxEdge === 800)
        ok('A rename leaves the stored target and parameters untouched');
      else fail('Preset rename storage', JSON.stringify(stored));
      if ((await lastMessage()).includes('已更新预设')) ok('A rename is announced as an update');
      else fail('Preset rename toast', await lastMessage());
      await editPage.keyboard.press('Escape');
      await editPage.waitForTimeout(400);

      // `用当前设置更新` is the only way to move a preset onto what the workbench is doing now;
      // its name must survive, and the saved parameter has to be the live one, not the old value.
      const fi = await editPage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
      await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.pdf'));
      await editPage.waitForTimeout(1000);
      await pickTarget(editPage, 'PNG (.png)');
      await setOutputOption(editPage, '最长边', '1600 px');
      await openEdit();
      await editPage.locator('.preset-edit-footer .el-button').filter({ hasText: '用当前设置更新' }).click();
      await editPage.waitForTimeout(500);
      stored = await storedPresets();
      if (stored?.[0]?.options?.maxEdge === 1600 && stored[0].name === '改过的名字')
        ok('「用当前设置更新」 rewrites the live parameters and keeps the name');
      else fail('Preset recapture', JSON.stringify(stored));
      await editPage.keyboard.press('Escape');
      await editPage.waitForTimeout(400);

      // A refused write must not leave the bar showing a name the next reload will undo.
      await editPage.evaluate(() => {
        window.chrome.storage.local.set = () => Promise.reject(new Error('quota'));
      });
      await openEdit();
      await editPage.fill('#preset-edit-name', '不会落盘的名字');
      await editPage.locator('.preset-edit-footer .el-button--primary').click();
      await editPage.waitForTimeout(600);
      if ((await chipName()) === '改过的名字') ok('A refused write rolls the chip back to the stored name');
      else fail('Preset rollback', `chip reads "${await chipName()}"`);
      if ((await lastMessage()).includes('未能更新')) ok('A refused write is announced as a failure');
      else fail('Preset rollback toast', await lastMessage());
      await editPage.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-preset-edit.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('Preset editing', e.message);
    } finally {
      await editPage.close();
    }
  }

  // ═══════════════════════════════════════════
  //  HISTORY REUSE RESTORES SETTINGS (2A)
  // ═══════════════════════════════════════════
  //
  // Reuse used to restore only the target. A batch's saved name pattern and image parameters now
  // come back with it, which is the difference between "pick PNG again" and "pick the batch again".
  if (section('History Reuse Restores Settings')) {
    const reusePage = await browser.newPage();
    tolerateScreenshotTimeout(reusePage);
    trackPageErrors(reusePage);
    try {
      await reusePage.setViewportSize({ width: 1280, height: 900 });
      await reusePage.addInitScript(mockChromeStorage());
      await reusePage.goto(`http://localhost:${PORT}/options.html`);
      await reusePage.waitForTimeout(1200);

      const gear = await reusePage.$('.topbar-inner .el-button');
      if (!gear) throw new Error('settings button not found');
      const openPrefs = async () => {
        await gear.click();
        await reusePage.waitForTimeout(500);
      };
      const setPattern = async value => {
        const field = await reusePage.$('.name-input input');
        if (!field) throw new Error('name pattern field not found');
        await field.fill(value);
        await field.press('Enter');
        await field.evaluate(el => el.blur());
        await reusePage.waitForTimeout(400);
      };
      const closePrefs = async () => {
        await gear.click();
        await reusePage.waitForTimeout(300);
      };
      const targetText = async () => (await reusePage.locator('.action-row .el-select').first().innerText()).trim();
      const staleVisible = () =>
        reusePage
          .$$eval('.el-alert__title', els => els.some(el => el.textContent.includes('当前目标是')))
          .catch(() => false);
      const lastMessage = async () => ((await reusePage.locator('.el-message').last().textContent()) || '').trim();

      await openPrefs();
      await setPattern('{name}');
      await closePrefs();
      const fi = await reusePage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
      await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.pdf'));
      await reusePage.waitForTimeout(1000);
      await pickTarget(reusePage, 'PNG (.png)');
      await setOutputOption(reusePage, '最长边', '800 px');
      await reusePage.click('.convert-btn');
      await reusePage.waitForFunction(
        () => {
          const el = document.querySelector('.el-alert__title');
          return !!el && el.textContent.trim().length > 0;
        },
        undefined,
        { timeout: 30000 },
      );
      await reusePage.waitForTimeout(500);

      const storedRecord = (await reusePage.evaluate(() => window.chrome.storage.local.get('fat:history')))[
        'fat:history'
      ]?.[0];
      if (storedRecord?.settings?.nameTemplate === '{name}' && storedRecord.settings.outputOptions?.maxEdge === 800) {
        ok('A finished batch records the name pattern and image parameters it ran with');
      } else {
        fail('History settings snapshot', JSON.stringify(storedRecord?.settings));
      }

      // Move every live setting away from the record, so what reuse restores cannot be mistaken for
      // what was already on screen.
      await openPrefs();
      await setPattern('{name}_{target}');
      await closePrefs();
      await pickTarget(reusePage, 'HTML (.html)');
      if (await staleVisible()) ok('The retargeted result is still explained before reuse');
      else fail('Reuse precondition', 'no stale notice after moving away from PNG');
      await reusePage.locator('.history-item .history-actions .el-button').first().click();
      await reusePage.waitForTimeout(600);

      if ((await targetText()) === 'PNG (.png)') ok('Reuse restores the target the batch ran under');
      else fail('Reuse target', `selector reads "${await targetText()}"`);
      const optionsText = (
        await reusePage
          .locator('.output-options')
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' ');
      if (optionsText.includes('800 px')) ok('Reuse restores the image parameters the batch ran with');
      else fail('Reuse options', `panel reads "${optionsText}"`);
      await openPrefs();
      const patternNow = await reusePage.$eval('.name-input input', el => el.value);
      await closePrefs();
      if (patternNow === '{name}') ok('Reuse restores the name pattern the batch ran with');
      else fail('Reuse pattern', `field reads "${patternNow}"`);
      const reuseToast = await lastMessage();
      if (reuseToast.includes('已应用目标') && reuseToast.includes('800 px') && reuseToast.includes('{name}'))
        ok('The reuse toast names everything that came back');
      else fail('Reuse toast', reuseToast);
      if (!(await staleVisible())) ok('Reuse clears the stale notice because the rows match again');
      else fail('Reuse stale notice', 'the notice survived a return to the rows\u2019 own target');
    } catch (e) {
      fail('History reuse restores settings', e.message);
    } finally {
      await reusePage.close();
    }
  }

  // ═══════════════════════════════════════════
  //  LONG FILE LIST WINDOWS ITS ROWS (2C)
  // ═══════════════════════════════════════════
  //
  // At 200 files only the rows near the viewport may exist. The page scrolls, not an inner box, and
  // the spacers carry the height of what is not mounted. Assertions read the mounted names, the
  // header's own count, and the effect of deleting the first row.
  if (section('Long File List Windows Its Rows')) {
    const listPage = await browser.newPage();
    tolerateScreenshotTimeout(listPage);
    trackPageErrors(listPage);
    try {
      await listPage.setViewportSize({ width: 1280, height: 900 });
      await listPage.addInitScript(mockChromeStorage());
      await listPage.goto(`http://localhost:${PORT}/options.html`);
      await listPage.waitForTimeout(1200);

      const mountedNames = () => listPage.$$eval('.file-item .file-name', els => els.map(el => el.textContent.trim()));
      const headerText = () => listPage.$eval('.file-list-header', el => el.textContent).catch(() => '');
      const files = Array.from({ length: 200 }, (_, index) => ({
        name: `perf-${index}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(`row ${index}`),
      }));
      const fi = await listPage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
      await fi.setInputFiles(files);
      await listPage.waitForFunction(
        () => {
          const header = document.querySelector('.file-list-header');
          return !!header && header.textContent.includes('200');
        },
        undefined,
        { timeout: 15000 },
      );
      await listPage.waitForTimeout(500);

      let mounted = await mountedNames();
      const bottomSpacer = await listPage
        .$$eval('.file-spacer', els => els.map(el => parseFloat(el.style.height) || 0))
        .then(heights => heights[0] ?? 0);
      if (mounted.length > 0 && mounted.length <= 60 && !mounted.includes('perf-199.txt') && bottomSpacer > 0)
        ok(`200 files mount ${mounted.length} rows and reserve the rest with a spacer`);
      else
        fail(
          'List windowing',
          `mounted ${mounted.length}, last visible "${mounted[mounted.length - 1]}", first spacer ${bottomSpacer}px`,
        );

      await listPage.evaluate(() => {
        const list = document.querySelector('.file-list');
        if (!list) return;
        window.scrollTo(0, list.getBoundingClientRect().bottom + window.scrollY - window.innerHeight);
      });
      await listPage
        .waitForFunction(
          () => [...document.querySelectorAll('.file-item .file-name')].some(el => el.textContent === 'perf-199.txt'),
          undefined,
          { timeout: 5000 },
        )
        .catch(() => {});
      mounted = await mountedNames();
      if (mounted.includes('perf-199.txt') && mounted.length <= 60)
        ok('Scrolling to the end mounts the last row without mounting the list');
      else fail('List scroll window', `mounted ${mounted.length}, last "${mounted[mounted.length - 1]}"`);

      await listPage.evaluate(() => window.scrollTo(0, 0));
      await listPage.waitForTimeout(500);
      await listPage.locator('.file-item .el-button--danger').first().click();
      await listPage.waitForTimeout(700);
      mounted = await mountedNames();
      if ((await headerText()).includes('199') && mounted[0] === 'perf-1.txt')
        ok('Deleting the first row drops it and renumbers the window in place');
      else fail('List delete first row', `header "${(await headerText()).trim()}" first "${mounted[0]}"`);

      const addBtn = await listPage.$('.add-files-btn');
      if (!addBtn) throw new Error('add-files button not found');
      await addBtn.click();
      await listPage.waitForTimeout(300);
      await fi.setInputFiles({
        name: 'perf-200.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('row 200'),
      });
      await listPage.waitForTimeout(1000);
      if ((await headerText()).includes('200') && (await mountedNames()).length <= 60)
        ok('An append into a windowed list keeps the window and the count');
      else fail('List append', `header "${(await headerText()).trim()}" mounted ${(await mountedNames()).length}`);
      await listPage.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-long-list-windowed.png`),
        fullPage: false,
      });
    } catch (e) {
      fail('Long file list windowing', e.message);
    } finally {
      await listPage.close();
    }
  }

  // ═══════════════════════════════════════════
  //  DROPPED FOLDER EXPANDS INTO ITS FILES (F4)
  // ═══════════════════════════════════════════
  //
  // A folder cannot be driven in from outside the page: a synthetic `DataTransfer` refuses a
  // directory, and the file chooser takes files only. So the tree is stood in for by objects that
  // answer the same three calls Chrome's entries do — `createReader`, `readEntries`, `file` — and
  // `readEntries` hands back two at a time, because one batch per directory is exactly how a
  // 300-file folder silently becomes 100. The fakes vouch for nothing about Chrome's own plumbing;
  // what they exercise is this repository's walk, filters, limits and messages. Its own page, so the
  // file list it leaves behind cannot move a later section.
  if (section('Dropped Folder Imports Its Files')) {
    const folderPage = await browser.newPage();
    tolerateScreenshotTimeout(folderPage);
    trackPageErrors(folderPage);
    try {
      await folderPage.setViewportSize({ width: 1280, height: 900 });
      await folderPage.addInitScript(mockChromeStorage());
      await folderPage.goto(`http://localhost:${PORT}/options.html`);
      await folderPage.waitForTimeout(1200);

      await folderPage.evaluate(() => {
        const state = { readerCalls: 0, documentDrops: 0 };
        // Counts the page-level overlay seeing the same drop, which is what the guard inside
        // `intakeDrop` exists for — `readerCalls` only proves the guard worked if this is 1.
        document.addEventListener('drop', () => {
          state.documentDrops += 1;
        });
        const leaf = spec => ({
          name: spec.n,
          isDirectory: false,
          file: done => done(new File([spec.t ?? 'hello world'], spec.n, { type: 'text/plain' })),
        });
        const branch = spec => {
          const children = (spec.c ?? []).map(c => (c.d ? branch(c) : leaf(c)));
          return {
            name: spec.d,
            isDirectory: true,
            createReader: () => {
              state.readerCalls += 1;
              let at = 0;
              return {
                readEntries: done =>
                  setTimeout(() => {
                    const batch = children.slice(at, at + 2);
                    at += batch.length;
                    done(batch);
                  }, 0),
              };
            },
          };
        };
        /**
         * Dispatch one drop on the zone and report what the page ended up with.
         *
         * `spec` is the folder tree, `loose` the names dropped beside it. Waits for the previous
         * run's toasts to clear first, so `notices` belongs to this drop alone.
         */
        window.__dropOnZone = async (spec, loose = []) => {
          const messages = () =>
            Array.from(document.querySelectorAll('.el-message')).map(m => (m.textContent || '').trim());
          const gone = Date.now() + 6000;
          while (messages().length > 0 && Date.now() < gone) await new Promise(r => setTimeout(r, 100));
          state.readerCalls = 0;
          state.documentDrops = 0;
          const items = loose.map(n => ({
            kind: 'file',
            webkitGetAsEntry: () => ({ name: n, isDirectory: false }),
            getAsFile: () => new File(['hello world'], n, { type: 'text/plain' }),
          }));
          if (spec) items.push({ kind: 'file', webkitGetAsEntry: () => branch(spec), getAsFile: () => null });
          const dataTransfer = { types: ['Files'], files: [], items };
          const event = new Event('drop', { bubbles: true, cancelable: true });
          Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
          document.querySelector('.drop-zone').dispatchEvent(event);
          await new Promise(r => setTimeout(r, 1500));
          return {
            readerCalls: state.readerCalls,
            documentDrops: state.documentDrops,
            names: Array.from(document.querySelectorAll('.file-item .file-name')).map(e => e.textContent.trim()),
            notices: messages(),
          };
        };
        window.__clearFiles = () => document.querySelector('.clear-files-btn')?.click();
      });

      const clearRows = async () => {
        await folderPage.evaluate(() => window.__clearFiles());
        await folderPage.waitForTimeout(400);
      };

      const tree = await folderPage.evaluate(() =>
        window.__dropOnZone({
          d: 'dropped',
          c: [
            { n: 'a.md' },
            { n: '.hidden.md' },
            { n: 'notes.txt' },
            { d: 'sub', c: [{ n: 'tool.exe' }, { n: 'b.csv' }, { d: 'nested', c: [{ n: 'c.json' }] }] },
            { d: '__MACOSX', c: [{ n: 'junk.txt' }] },
          ],
        }),
      );
      const want = ['a.md', 'notes.txt', 'b.csv', 'c.json'];
      if (JSON.stringify(tree.names) === JSON.stringify(want))
        ok(`Nested folder flattened to its ${want.length} importable files`);
      else fail('Folder walk', `expected ${JSON.stringify(want)}, got ${JSON.stringify(tree.names)}`);
      // 3 = the directories that hold something importable. Six would mean the drop was taken twice,
      // once by the zone and again by the overlay that sees it bubble to `document`.
      if (tree.documentDrops === 1 && tree.readerCalls === 3) ok('One drop walks the tree once, overlay included');
      else fail('Single walk', `documentDrops=${tree.documentDrops} readerCalls=${tree.readerCalls}`);
      if (tree.notices.length === 1 && tree.notices[0].includes('从文件夹导入 4 个文件'))
        ok('The import is announced with the count that came out of the folder');
      else fail('Folder import notice', JSON.stringify(tree.notices));

      // A folder of nothing usable must not cost the user the batch already loaded.
      await clearRows();
      const seedInput = await folderPage.$('input[type="file"]');
      await seedInput.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
      await folderPage.waitForTimeout(1000);
      const unusable = await folderPage.evaluate(() =>
        window.__dropOnZone({ d: 'bin', c: [{ n: 'tool.exe' }, { n: '.DS_Store' }] }),
      );
      if (JSON.stringify(unusable.names) === JSON.stringify(['sample.md']))
        ok('A folder with no convertible file leaves the current selection alone');
      else fail('Folder refused', `selection became ${JSON.stringify(unusable.names)}`);
      if (unusable.notices.some(n => n.includes('没有可转换的文件')))
        ok('and says the folder held nothing convertible');
      else fail('Empty folder notice', JSON.stringify(unusable.notices));

      // Below the depth limit the walk gives up, and it has to say *that* rather than claim the
      // folder was empty — the two failures need different answers from the user.
      await clearRows();
      const deep = await folderPage.evaluate(
        leaf => {
          // 15 nested directories: past the depth of 12 the walk is bounded at.
          let tree = { d: 'l14', c: [leaf] };
          for (let level = 13; level >= 0; level -= 1) tree = { d: `l${level}`, c: [tree] };
          return window.__dropOnZone(tree);
        },
        { n: 'deep.txt' },
      );
      if (deep.notices.some(n => n.includes('层级过深')))
        ok('A tree below the depth limit is refused with the limit named');
      else fail('Depth refusal', JSON.stringify(deep.notices));
      if (!deep.notices.some(n => n.includes('没有可转换的文件'))) ok('and not reported as an empty folder');
      else fail('Depth refusal reason', JSON.stringify(deep.notices));

      // The channel everything now travels through: a loose-file drop, no folder in it.
      await clearRows();
      const loose = await folderPage.evaluate(() => window.__dropOnZone(null, ['x.md', 'y.txt']));
      if (JSON.stringify(loose.names) === JSON.stringify(['x.md', 'y.txt']))
        ok('A plain file drop still imports through the same handler');
      else fail('Loose drop', `got ${JSON.stringify(loose.names)}`);
      if (loose.readerCalls === 0) ok('A drop with no folder in it reads no directory');
      else fail('No folder read', `${loose.readerCalls} reader created for a folder-less drop`);

      // A `.zip` inside the folder is not just another file: it goes on to the same expander a
      // directly-dropped archive meets. The bytes here are not an archive, so what proves the
      // hand-off is the reader's own complaint about it — and the batch it leaves behind is empty.
      await clearRows();
      const innerArchive = await folderPage.evaluate(() =>
        window.__dropOnZone({ d: 'stuff', c: [{ n: 'inner.zip' }] }),
      );
      if (innerArchive.names.length === 0 && innerArchive.notices.some(n => n.includes('无法读取压缩包')))
        ok('A .zip inside the folder reaches the archive expander');
      else
        fail(
          'Folder archive hand-off',
          `names=${JSON.stringify(innerArchive.names)} notices=${JSON.stringify(innerArchive.notices)}`,
        );

      await folderPage.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-folder-drop.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('Dropped folder imports its files', e.message);
    } finally {
      await folderPage.close();
    }
  }

  // ═══════════════════════════════════════════
  //  OUTPUT FILE NAMES FOLLOW A TEMPLATE (F5)
  // ═══════════════════════════════════════════
  //
  // Every download used to be named `<source>_<YYYYMMDD>_<HHMMSS>.<ext>` with no way to ask for
  // something else — right for a downloads folder, wrong for a deliverable that goes into a repo or
  // an email. The pattern is one field, so the suite walks what a user walks: what the built-in
  // default still produces, what the field shows, what typing into it stores, and what the next
  // batch comes out named. Its own page, because it converts the same fixture several times over.
  if (section('Output File Names Follow The Template')) {
    const namePage = await browser.newPage();
    tolerateScreenshotTimeout(namePage);
    trackPageErrors(namePage);
    try {
      await namePage.setViewportSize({ width: 1280, height: 900 });
      await namePage.addInitScript(mockChromeStorage());
      await namePage.goto(`http://localhost:${PORT}/options.html`);
      await namePage.waitForTimeout(1200);

      /** Every result name on screen, sorted so a batch of two is compared without ordering luck. */
      const resultNames = () =>
        namePage.$$eval('.result-item .result-name', els => els.map(el => el.textContent.trim()).sort());
      const gear = await namePage.$('.topbar-inner .el-button');
      if (!gear) throw new Error('settings button not found');
      // The pattern field lives in the preferences popover, and the popover has to be closed before a
      // conversion runs — the same click that opens it closes it, so these two are one handle apart.
      const openPrefs = async () => {
        await gear.click();
        await namePage.waitForTimeout(500);
      };
      const closePrefs = async () => {
        await gear.click();
        await namePage.waitForTimeout(300);
      };
      /** Type a pattern into the preferences field and commit it, then report what was stored. */
      const setPattern = async value => {
        const field = await namePage.$('.name-input input');
        if (!field) throw new Error('name pattern field not found');
        await field.fill(value);
        // Enter and blur both fire the native `change` the field commits on; whichever the component
        // forwards is enough, and the value is identical either way.
        await field.press('Enter');
        await field.evaluate(el => el.blur());
        await namePage.waitForTimeout(300);
        return namePage.evaluate(() => window.chrome.storage.local.get('fat:nameTemplate'));
      };
      const DEFAULT_PATTERN = '{name}_{date}_{time}';

      // The built-in pattern is the whole point of the default: an untouched installation must keep
      // producing exactly the names it did before the setting existed.
      const stamped = await convertFile(namePage, 'sample.md', 'HTML (.html)');
      if (/^sample_\d{8}_\d{6}\.html$/.test(stamped.resultName))
        ok(`Default names keep the timestamp (${stamped.resultName})`);
      else fail('Default name', `got "${stamped.resultName}"`);

      await openPrefs();
      const fieldText = await namePage.$eval('.name-input input', el => el.value);
      if (fieldText === DEFAULT_PATTERN) ok('The field opens on the built-in pattern');
      else fail('Field default', `got "${fieldText}"`);

      // The example line is the only place a user learns what a token means, so it has to be live.
      const exampleText = await namePage.$eval('.name-hint code', el => el.textContent.trim());
      if (/^report_\d{8}_\d{6}\.pdf$/.test(exampleText)) ok(`Example previews the pattern (${exampleText})`);
      else fail('Example line', `got "${exampleText}"`);

      const stored = await setPattern('{name}');
      if (stored['fat:nameTemplate'] === '{name}') ok('A committed pattern is stored as typed');
      else fail('Stored pattern', JSON.stringify(stored));
      await closePrefs();

      const bare = await convertFile(namePage, 'sample.md', 'HTML (.html)');
      if (bare.resultName === 'sample.html') ok('A pattern of only {name} drops the timestamp');
      else fail('{name} only', `got "${bare.resultName}"`);

      // Two sources can share a basename — `notes.csv` and `notes.json` both say `notes`, and under
      // `{name}` with no timestamp they collide on purpose, so the `_2` suffix has to carry it.
      const twins = await convertFile(
        namePage,
        [
          { name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') },
          { name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') },
        ],
        'HTML (.html)',
      );
      const twinNames = await resultNames();
      if (twinNames.length === 2 && twinNames[0] === 'notes.html' && twinNames[1] === 'notes_2.html')
        ok('Two sources with one basename still both arrive');
      else fail('Basename collision', `got ${JSON.stringify(twinNames)} for ${twins.alertTitle}`);

      // The pattern is untrusted input like everything else that survives a hand-edited store: a
      // separator would turn a download name into a path, and inside a ZIP entry into an extractor
      // hazard. What is left has to keep the real extension last.
      await openPrefs();
      const traversal = await setPattern('../../{name}/x|y?');
      if (traversal['fat:nameTemplate'] === '{name}xy')
        ok('Separators and reserved characters are stripped before the pattern is stored');
      else fail('Pattern sanitized on store', JSON.stringify(traversal));
      await closePrefs();

      const escaped = await convertFile(namePage, 'sample.md', 'HTML (.html)');
      if (!escaped.resultName.includes('/') && escaped.resultName.endsWith('.html'))
        ok(`No pattern can write a path (${escaped.resultName})`);
      else fail('Path in output name', escaped.resultName);

      // `{tile}` is a typo, not a token. Dropping it would silently rename the file to `report-`;
      // keeping it literal is the diagnosable choice, and the field says so while the user types.
      await openPrefs();
      await setPattern('report-{tile}');
      const warning = await namePage.$eval('.name-warning', el => el.textContent.trim()).catch(() => '');
      if (warning.includes('{tile}')) ok('The field names the placeholder it does not know');
      else fail('Unknown placeholder warning', `got "${warning}"`);
      await closePrefs();

      const literal = await convertFile(namePage, 'sample.md', 'HTML (.html)');
      if (literal.resultName === 'report-{tile}.html') ok('An unknown placeholder is kept, not dropped');
      else fail('Unknown placeholder', `got "${literal.resultName}"`);

      // Blank is the way back: undoing must not require retyping the exact built-in pattern.
      await openPrefs();
      const cleared = await setPattern('');
      if (cleared['fat:nameTemplate'] === DEFAULT_PATTERN) ok('Clearing the field restores the built-in pattern');
      else fail('Reset to default', JSON.stringify(cleared));
      await closePrefs();

      // The one ordering rule inside the renderer: `{name}` is substituted last, so a brace pair that
      // came from a file name stays text. `{date}.md` is legal on macOS and Linux and turns up in
      // Windows-authored archives; substituted first, the following pass would expand it and the name
      // would carry two timestamps.
      const injected = await convertFile(
        namePage,
        { name: '{date}.md', mimeType: 'text/markdown', buffer: Buffer.from('# t\n') },
        'HTML (.html)',
      );
      if (/^\{date\}_\d{8}_\d{6}\.html$/.test(injected.resultName))
        ok(`A brace from the source name stays a brace (${injected.resultName})`);
      else fail('Token injected through file name', `got "${injected.resultName}"`);

      // `{index}` and `{target}` are advertised in the field's own hint line, so they have to render in
      // a real batch and not only in the example. Position is per batch, so the two twins below are the
      // shortest case where the token can be seen doing anything — and it is the one thing `_2` cannot
      // do: a collision suffix says which name lost, `{index}` says which file it was.
      await openPrefs();
      await setPattern('{index}-{name}-as-{target}');
      await closePrefs();
      await convertFile(
        namePage,
        [
          { name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') },
          { name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') },
        ],
        'HTML (.html)',
      );
      const numbered = await resultNames();
      if (numbered[0] === '1-notes-as-html.html' && numbered[1] === '2-notes-as-html.html')
        ok(`{index} counts the batch and {target} names the artifact (${numbered.join(', ')})`);
      else fail('{index}/{target} rendering', `got ${JSON.stringify(numbered)}`);

      // 120 characters, not the ~255 bytes a filesystem component allows: a CJK basename spends three
      // of them per character, and the remainder has to hold the extension plus any collision suffix.
      await openPrefs();
      await setPattern('{name}');
      await closePrefs();
      const longName = await convertFile(
        namePage,
        { name: `${'长'.repeat(150)}.md`, mimeType: 'text/markdown', buffer: Buffer.from('# t\n') },
        'HTML (.html)',
      );
      if (longName.resultName === `${'长'.repeat(120)}.html`)
        ok('A rendered name is cut at 120 characters, whatever script it is written in');
      else fail('Name length ceiling', `got ${[...longName.resultName].length} chars`);

      await namePage.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-name-template.png`),
        fullPage: true,
      });
    } catch (e) {
      fail('Output file names follow a template', e.message);
    } finally {
      await namePage.close();
    }
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

    // The reason must be readable, not merely present in the accessible name: Element Plus's option
    // row is `white-space: nowrap; overflow: hidden`, so a long reason would be clipped to a sliver.
    // Assert on layout, not on the CSS property alone.
    const reasonBox = await page.$$eval('.el-select-dropdown__item.is-disabled', els => {
      const item = els.find(e => e.getClientRects().length > 0 && (e.textContent || '').includes('需 OCR'));
      if (!item) return null;
      const reason = item.querySelector('.option-reason');
      if (!reason) return null;
      const itemRect = item.getBoundingClientRect();
      const reasonRect = reason.getBoundingClientRect();
      return {
        whiteSpace: getComputedStyle(item).whiteSpace,
        clipped: item.scrollWidth > item.clientWidth + 1,
        fits: reasonRect.right <= itemRect.right + 1 && reasonRect.height > 0,
        height: Math.round(reasonRect.height),
      };
    });
    if (!reasonBox) throw new Error('blocked option has no readable reason element');
    if (reasonBox.whiteSpace !== 'normal' || reasonBox.clipped || !reasonBox.fits) {
      throw new Error(`reason is not visible in full: ${JSON.stringify(reasonBox)}`);
    }
    ok(`A blocked option's reason wraps inside the row (${reasonBox.height}px tall)`);

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
  //  PDF OUTLINE → HEADING LEVELS
  // ═══════════════════════════════════════════

  section('PDF outline headings');
  try {
    await resetWorkbench(page);
    await convertFile(page, 'sample-outline.pdf', 'HTML (.html)');
    const outlined = await page.getAttribute('.result-panel iframe.html-frame', 'srcdoc').catch(() => null);
    if (!outlined) throw new Error('no srcdoc for the outlined PDF');
    const headings = outlined.match(/<h[1-6]>[^<]*<\/h[1-6]>/g) || [];
    // Depth is the claim: `Chapter One` and `Chapter Two` are top-level bookmarks, `Section 1.1` is
    // its child. And `Chapter Two` appears on page 1 as body text while its bookmark points at page 2
    // — promoting it there too would be inventing a heading the outline never attached to page 1.
    const wanted = ['<h1>Chapter One</h1>', '<h2>Section 1.1</h2>', '<h1>Chapter Two</h1>'];
    const missing = wanted.filter(tag => !outlined.includes(tag));
    const invented = headings.filter(tag => !wanted.includes(tag));
    if (missing.length === 0 && invented.length === 0) {
      ok('PDF bookmarks become headings at their outline depth, and nothing else is promoted');
    } else {
      fail('PDF outline headings', `missing ${JSON.stringify(missing)}, got ${JSON.stringify(headings)}`);
    }

    // The control half, and it is the reason this section runs *before* the converter changes: a PDF
    // with no outline must come back with exactly the headings it came back with before. Measured on
    // `sample.pdf` (jsPDF, no /Outlines) by reproducing this converter's line loop and its all-caps
    // heuristic verbatim: it yields ZERO heading tags, because no line in that fixture is all-caps.
    // `sample-2page.pdf` is the same. So the constant below is 0 tags — written down here rather
    // than sampled from the post-change build, which would make the control circular.
    await resetWorkbench(page);
    await convertFile(page, 'sample.pdf', 'HTML (.html)');
    const plain = await page.getAttribute('.result-panel iframe.html-frame', 'srcdoc').catch(() => null);
    if (plain === null) throw new Error('no srcdoc for the plain PDF');
    const plainHeadings = plain.match(/<h[1-6]>[^<]*<\/h[1-6]>/g) || [];
    if (plainHeadings.length === 0) ok('A PDF without bookmarks still gets no headings from the outline path');
    else fail('No-outline control', `expected 0 heading tags, got ${JSON.stringify(plainHeadings)}`);
  } catch (e) {
    fail('PDF outline headings', e.message);
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

    // ── The other half of this section: a single file on a multi-step chain has a real bar ──
    // One claim seen in four places, counted once. What it claims is that a batch reports its own
    // progress and its own cost, and where that shows up: the bar mounts for a one-file chain at all,
    // its percentage moves while it is up, the finished batch prints what it cost, and the newest
    // history row keeps that same figure. Four `ok()` calls would tie the suite total to how many
    // substrings this block happens to read.
    //
    // `json→pdf` is two steps (`json>html` + `html>pdf`), so the denominator here is 2 and the file
    // count is 1 — the exact case that used to show a spinner and nothing else.
    const reported = [];
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    // Both watchers are created before the batch starts and awaited only after it settles. Awaiting
    // either one in turn would spend its whole timeout on a screen where nothing has begun yet —
    // `.batch-progress` cannot exist before the keypress, so `barMounted` would be a guaranteed false
    // plus 10 dead seconds.
    const barMounted = page
      .waitForSelector('.batch-progress', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    const percentMoved = page
      .waitForFunction(
        () => {
          // The text label is switched off for a single-file batch (a `0/1` that never means anything
          // is worse than no number), so the percentage is read off the stroke it animates, which is
          // the same source `batchProgressPercent` feeds. Plain JS here: this file is `.mjs`, a TS cast
          // inside the callback is a parse error, and the callback runs in the page, not in Node.
          const inner = document.querySelector('.batch-progress .el-progress-bar__inner');
          const width = inner ? Number.parseFloat(inner.style.width) : NaN;
          return Number.isFinite(width) && width > 0;
        },
        undefined,
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false);

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
    const settled = await page
      .waitForSelector('.result-download .el-alert__title', { timeout: 30000 })
      .catch(() => null);
    if (!settled) throw new Error('the JSON→PDF batch never settled');
    if (!(await barMounted)) reported.push('no batch bar for a single file on a multi-step chain');
    if (!(await percentMoved)) reported.push('the bar never left 0% for a one-file two-step chain');

    // Guarded: today that `<p>` sits behind `v-if="sizeSummary"`, and a one-file batch has no size
    // summary by design (`ResultDownload.vue:74-85`), so the selector matches nothing and an unguarded
    // `$eval` would reject into this section's `catch` and report as `fail('Path hints', …)` — the wrong
    // assertion going red. The `v-if` now reads `summaryLine`, which is what makes this green.
    const summary = await page
      .$eval('.result-download .result-summary', el => (el.textContent || '').trim())
      .catch(() => null);
    if (summary === null || !/耗时|Elapsed/.test(summary)) {
      reported.push(`the result card printed no elapsed line: ${JSON.stringify(summary)}`);
    }

    // Newest row first. The history card is open by default and `HistoryPanel` is mounted from start-up,
    // so no extra reveal is needed at this point in the suite.
    const durations = await page
      .$$eval('.history-item .history-duration', els => els.slice(0, 1).map(el => el.textContent.trim()))
      .catch(() => []);
    if (!(durations.length > 0 && /\d/.test(durations[0]))) {
      reported.push(`the newest history row printed no duration: ${JSON.stringify(durations)}`);
    }

    if (reported.length === 0) ok('A single-file multi-step batch shows a moving bar and reports what it cost');
    else fail('Batch progress and cost', reported.join('; '));
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
    trackPageErrors(dirtyPage);
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
      const surface = await changeWithoutMotion(page, async () => {
        await items[i].click();
        await page.waitForTimeout(200);
        const applied = await page.evaluate(() => document.documentElement.dataset.theme);
        if (applied === themeValues[i]) ok(`Theme "${themeValues[i]}" applied`);
        else fail(`Theme "${themeValues[i]}"`, `got "${applied}"`);
        return surfaceColors(page);
      });
      // Contrast is measured off the rendered page, per theme, so a future palette edit
      // that pushes any of the 12 combos under AA fails here instead of being a manual
      // audit. The topbar carries 4.5:1 body text (brand-tag); the ring needs 3:1 as
      // non-text content (WCAG 1.4.11) against the card it is usually drawn on.
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
        const { primary, elPrimary, surface } = await changeWithoutMotion(page, async () => {
          await themeItems[i].click();
          await page.waitForTimeout(100);
          const read = await page.evaluate(() => {
            const cs = getComputedStyle(document.documentElement);
            return {
              primary: cs.getPropertyValue('--fat-primary').trim(),
              elPrimary: cs.getPropertyValue('--el-color-primary').trim(),
            };
          });
          return { ...read, surface: await surfaceColors(page) };
        });
        if (primary && primary === elPrimary) ok(`Dark+${themeValues[i]}: primary=${primary}, EP synced`);
        else fail(`Dark+${themeValues[i]}`, `primary=${primary}, el=${elPrimary}`);

        // Same contract as the light loop. White-on-pastel is exactly what used to fail
        // here (1.69–2.67:1) because the dark primaries are deliberately light tints.
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
    try {
      const langEn = await page.evaluate(() => document.documentElement.lang);
      if (langEn === 'en') ok('Switching to English moves <html lang> to "en"');
      else fail('Document language after switch', `lang="${langEn}"`);
      const titleEn = await page.title();
      if (titleEn === 'Transfer Any File · Conversion Workbench') ok('Tab title follows the switch to English');
      else fail('Document title after switch', `"${titleEn}"`);
      const footerEn = await page.$eval('.drop-stats', el => el.textContent).catch(() => '');
      if (footerEn.includes('formats supported')) ok('Strings re-render in English without a reload');
      else fail('English UI', `drop zone read "${footerEn.trim()}"`);
      await page.screenshot({ path: shot(`${String(shotIdx++).padStart(2, '0')}-english-ui.png`), fullPage: true });
    } finally {
      // Restoring here rather than after the assertions is the only thing that keeps a starved
      // screenshot from deciding the language of every section after this one: the later gates
      // match Chinese strings, so a run that left the UI in English reports "HTML (.html) option
      // not available" and a history count off by one instead of the one real failure.
      await zhButton.click();
      await page.waitForTimeout(500);
    }

    const langZh = await page.evaluate(() => document.documentElement.lang);
    const footerZh = await page.$eval('.drop-stats', el => el.textContent).catch(() => '');
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
        const btn = await changeWithoutMotion(page, async () => {
          await applyTheme(page, mode, theme);
          await page.waitForTimeout(400);
          return buttonStateColors(page);
        });
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
  //  DISABLED BUTTON STATES
  // ═══════════════════════════════════════════

  // The enabled rules in `global.css` are `!important`, and Element Plus's disabled colours are
  // not — so a disabled button used to paint the accent fill anyway (measured 2026-10-20: the
  // no-target convert button was the same #2563eb as the enabled one, and 追加文件 mid-conversion
  // came out transparent with a white label on a white card, i.e. invisible). This section pins
  // both halves: disabled takes the muted tokens in light and dark, an enabled or loading button
  // keeps the accent fill. Its own page, because the first read needs the freshly staged,
  // no-target state and the last one moves the viewport.
  if (section('Disabled Button States')) {
    const dPage = await browser.newPage();
    tolerateScreenshotTimeout(dPage);
    trackPageErrors(dPage);
    try {
      await dPage.setViewportSize({ width: 1280, height: 900 });
      await dPage.addInitScript(mockChromeStorage());
      await dPage.goto(`http://localhost:${PORT}/options.html`);
      await dPage.waitForTimeout(1200);

      // The buttons plus the five tokens the disabled rules are written against, resolved on the
      // page rather than hard-coded, so a token edit moves both sides of the comparison together.
      const readStates = () =>
        sampleWithoutMotion(dPage, () =>
          dPage.evaluate(() => {
            const read = sel => {
              const el = document.querySelector(sel);
              if (!el) return null;
              const cs = getComputedStyle(el);
              return { cls: el.className, bg: cs.backgroundColor, color: cs.color, border: cs.borderColor };
            };
            const probe = document.createElement('div');
            document.body.appendChild(probe);
            // The reduced-motion blanket writes `transition-duration: … !important` on `*`, so a
            // probe element that changes `color` transitions it — and a read in the same task as the
            // assignment returns the *previous* token. That is how a 2026-10-20 run printed all five
            // tokens as the first one (`want rgb(241,245,249) / rgb(241,245,249) / …`). Inline
            // `!important` outranks the stylesheet's, which is what makes the read immediate.
            probe.style.setProperty('transition', 'none', 'important');
            const token = name => {
              probe.style.color = `var(${name})`;
              return getComputedStyle(probe).color;
            };
            const tokens = {
              fill: token('--fat-surface-2'),
              ink: token('--fat-text-placeholder'),
              accent: token('--fat-btn-solid'),
              onAccent: token('--fat-on-btn-solid'),
              border: token('--fat-border'),
            };
            probe.remove();
            // Distinctness is the self-check for the stale-read shape above: surface, placeholder,
            // accent and border are different colours in the blue pair this section runs (the only
            // pair it reads), so a probe that collapses them into one value has to be the instrument,
            // not the button.
            if (new Set(Object.values(tokens)).size < 3) {
              throw new Error(`token probe resolved ${JSON.stringify(tokens)} — stale reads, not a UI defect`);
            }
            return { convert: read('.convert-btn'), addFiles: read('.add-files-btn'), tokens };
          }),
        );

      const fi = await dPage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
      await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.docx'));
      await dPage.waitForSelector('.convert-btn.is-disabled', { timeout: 5000 });

      for (const mode of ['light', 'dark']) {
        const { convert, tokens } = await changeWithoutMotion(dPage, async () => {
          await applyTheme(dPage, mode, 'blue');
          await dPage.waitForTimeout(150);
          return readStates();
        });
        if (convert && convert.bg === tokens.fill && convert.color === tokens.ink && convert.border === tokens.border) {
          ok(`[blue ${mode}] a disabled primary button takes the muted tokens`);
        } else {
          fail(
            `[blue ${mode}] disabled primary button`,
            `bg ${convert?.bg} / ink ${convert?.color} / border ${convert?.border}, want ${tokens.fill} / ${tokens.ink} / ${tokens.border}`,
          );
        }
      }

      await dPage.hover('.convert-btn');
      const hovered = await readStates();
      if (hovered.convert.bg === hovered.tokens.fill) ok('A disabled primary button stays muted under the pointer');
      else fail('Disabled button under the pointer', `bg ${hovered.convert.bg}, want ${hovered.tokens.fill}`);

      await pickTarget(dPage, 'PDF (.pdf)');
      await dPage.waitForFunction(
        () => {
          const button = document.querySelector('.convert-btn');
          return !!button && !button.disabled;
        },
        undefined,
        { timeout: 8000 },
      );
      const enabled = await readStates();
      if (enabled.convert.bg === enabled.tokens.accent && enabled.convert.color === enabled.tokens.onAccent)
        ok('An enabled primary button keeps the accent fill');
      else
        fail(
          'Enabled primary button',
          `bg ${enabled.convert.bg} / ink ${enabled.convert.color}, want ${enabled.tokens.accent} / ${enabled.tokens.onAccent}`,
        );

      // Mid-conversion the convert button carries `is-disabled` and `is-loading` at once. The
      // disabled rule carves `.is-loading` out on purpose: this state is live, not off, and the
      // carve-out is invisible if it silently flips the label to muted grey.
      await dPage.click('.convert-btn');
      await dPage.waitForFunction(
        () => document.querySelector('.convert-btn')?.classList.contains('is-loading'),
        undefined,
        { timeout: 15000 },
      );
      const running = await readStates();
      if (running.convert.bg === running.tokens.accent && running.convert.color === running.tokens.onAccent)
        ok('The converting button keeps its accent fill while loading');
      else
        fail(
          'Loading button fill',
          `bg ${running.convert.bg} / ink ${running.convert.color}, want ${running.tokens.accent}`,
        );
      const add = running.addFiles;
      if (add && add.bg === running.tokens.fill && add.color === running.tokens.ink)
        ok('A disabled text button keeps a visible muted fill mid-conversion');
      else
        fail(
          'Disabled text button',
          `bg ${add?.bg} / ink ${add?.color}, want ${running.tokens.fill} / ${running.tokens.ink}`,
        );

      // Element Plus centres the status icon against the alert's whole box, and this alert grows with
      // its content — measured 119px tall, icon top 604 vs title top 566 before the fix, 566/566 after.
      // `:not(.el-alert--info)` is what makes this the batch alert: `staleNotice` renders an info alert
      // *above* it whenever kept results are stale, and a bare `.el-alert` would then measure that box
      // (`.result-note` is the note paragraph inside the content, not a class on the alert itself).
      // The height floor keeps the ±1 px test honest — in a one-line alert centring and top-aligning
      // coincide, so passing there would prove nothing.
      await dPage.waitForSelector('.result-download .el-alert:not(.el-alert--info) .el-alert__title', {
        timeout: 30000,
      });
      const align = await sampleWithoutMotion(dPage, () =>
        dPage.evaluate(() => {
          const alert = document.querySelector('.result-download .el-alert:not(.el-alert--info)');
          const icon = alert.querySelector('.el-alert__icon');
          const title = alert.querySelector('.el-alert__title');
          const top = el => Math.round(el.getBoundingClientRect().top);
          return { alertH: Math.round(alert.getBoundingClientRect().height), iconTop: top(icon), titleTop: top(title) };
        }),
      );
      if (align.alertH >= 60 && Math.abs(align.iconTop - align.titleTop) <= 1)
        ok('The result status icon sits beside its title');
      else
        fail(
          'Result alert icon alignment',
          `icon top ${align.iconTop} vs title top ${align.titleTop} in a ${align.alertH}px alert (need ≥ 60px)`,
        );

      // A second batch on this page: the history head only draws its trend chart from >= 2 records,
      // and the chart is the half that used to push the actions row past the card's clip box. Then
      // every collapsed card is opened by reading `aria-expanded` rather than toggling blindly, so
      // the row below is measured in the state a user actually sees.
      await dPage.click('.convert-btn');
      await dPage.waitForTimeout(800);
      await dPage.waitForFunction(
        () => {
          const button = document.querySelector('.convert-btn');
          return !!button && !button.classList.contains('is-loading');
        },
        undefined,
        { timeout: 40000 },
      );
      await dPage.evaluate(() => {
        for (const head of document.querySelectorAll('.collapsible-head[aria-expanded="false"]')) head.click();
      });
      await dPage.waitForTimeout(700);

      // One toolbar row needs ~415px in the wider locale (measured in English), and the card's
      // `overflow: hidden` hides what does not fit — at 360px the sync checkbox hung half past the
      // card edge with `document.scrollWidth` still reading 360, so nothing looked scrollable.
      await dPage.setViewportSize({ width: 360, height: 800 });
      await dPage.waitForTimeout(400);
      const bar = await sampleWithoutMotion(dPage, () =>
        dPage.evaluate(() => {
          const t = document.querySelector('.comparison-toolbar');
          const vm = t.querySelector('.view-modes');
          const st = t.querySelector('.sync-toggle');
          const card = t.closest('.card') ?? t.parentElement;
          const r = el => el.getBoundingClientRect();
          return {
            syncRight: Math.round(r(st).right),
            cardRight: Math.round(r(card).right),
            wrapped: r(st).top >= r(vm).bottom - 2,
          };
        }),
      );
      if (bar.wrapped && bar.syncRight <= bar.cardRight + 1)
        ok('At 360px the comparison toolbar wraps instead of clipping the sync checkbox');
      else
        fail(
          'Comparison toolbar at 360px',
          `wrapped=${bar.wrapped}, sync right ${bar.syncRight} vs card right ${bar.cardRight}`,
        );
      await dPage.screenshot({
        path: shot(`${String(shotIdx++).padStart(2, '0')}-narrow-toolbar.png`),
        fullPage: true,
      });

      // The two rows that refuse to shrink. `history-head` is a 120px chart plus three `nowrap`
      // labels inside a card body that is `overflow: clip`; `result-actions` is `flex: 1` slots whose
      // English labels need 309px where the row offers 302 (measured 2026-10-20: at 320px the pair
      // reached x=338 past a card ending at 304, and the page grew to scrollWidth 338). Both wrap now,
      // so the last control stays inside its container at 360px instead of sitting out of reach.
      const rows = await sampleWithoutMotion(dPage, () =>
        dPage.evaluate(() => {
          const clipRight = el => {
            let n = el.parentElement;
            while (n) {
              const cs = getComputedStyle(n);
              if (/hidden|clip|auto|scroll/.test(cs.overflowX + ' ' + cs.overflowY)) {
                return Math.round(n.getBoundingClientRect().right - (parseFloat(cs.borderRightWidth) || 0));
              }
              n = n.parentElement;
            }
            return Number.NaN;
          };
          const head = document.querySelector('.history-head');
          const acts = document.querySelector('.result-actions');
          const btns = head ? [...head.querySelectorAll('button')] : [];
          const last = btns[btns.length - 1];
          // `.history-trend`, not `svg`: the export / import / clear buttons each carry an `el-icon`
          // that renders an `<svg>` too, so a bare svg probe would report the chart as present even
          // with one record — and with no chart the row has no overhang to fail on.
          const trend = head ? head.querySelector('.history-trend') : null;
          return {
            headWrap: head ? getComputedStyle(head).flexWrap : 'no .history-head',
            lastRight: last ? Math.round(last.getBoundingClientRect().right) : Number.NaN,
            headClip: head ? clipRight(head) : Number.NaN,
            chart: !!trend,
            actsWrap: acts ? getComputedStyle(acts).flexWrap : 'no .result-actions',
          };
        }),
      );
      if (rows.chart && rows.headWrap === 'wrap' && rows.lastRight <= rows.headClip + 1)
        ok('At 360px the history head wraps its actions under the chart instead of past the card');
      else
        fail(
          'History head at 360px',
          `chart=${rows.chart}, wrap=${rows.headWrap}, last button right ${rows.lastRight} vs clip right ${rows.headClip}`,
        );
      if (rows.actsWrap === 'wrap')
        ok('The result actions row can wrap, which is what keeps the wider locale inside the card');
      else fail('Result actions row wrap', `flex-wrap is ${rows.actsWrap}, not wrap`);

      // …and here is the wider locale itself. The Chinese pair fits at every width (measured: two
      // slots span 29..331 inside a 302px row at 360px), so a `flex-wrap` pin alone would never have
      // touched the defect. This page is seeded English and stages a batch that loses one file, which
      // is what renders the second slot; before the fix that pair needed 309px where the row offered
      // 302 at 360px, and at 320px it reached x=338 past a card ending at 304 while the page grew to
      // scrollWidth 338. Only class-based selectors — nothing here reads a Chinese string.
      const ePage = await browser.newPage();
      tolerateScreenshotTimeout(ePage);
      trackPageErrors(ePage);
      try {
        await ePage.setViewportSize({ width: 1280, height: 900 });
        await ePage.addInitScript(mockChromeStorage({ 'fat:locale': 'en' }));
        await ePage.goto(`http://localhost:${PORT}/options.html`);
        await ePage.waitForTimeout(1200);
        const eFi = await ePage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
        await eFi.setInputFiles([
          {
            name: 'sample.md',
            mimeType: 'text/markdown',
            buffer: fs.readFileSync(path.join(FIXTURE_PATH, 'sample.md')),
          },
          { name: 'broken.bmp', mimeType: 'image/bmp', buffer: Buffer.from('this is not a bitmap') },
        ]);
        await ePage.waitForTimeout(1000);
        await pickTarget(ePage, 'PDF (.pdf)');
        await ePage.click('.convert-btn');
        await ePage.waitForSelector('.result-actions .retry-btn', { timeout: 60000 });
        await ePage.setViewportSize({ width: 320, height: 800 });
        await ePage.waitForTimeout(450);
        const wide = await sampleWithoutMotion(ePage, () =>
          ePage.evaluate(() => {
            const retry = document.querySelector('.result-actions .retry-btn');
            const card = retry.closest('.card') ?? retry.parentElement;
            return {
              retryRight: Math.round(retry.getBoundingClientRect().right),
              cardRight: Math.round(card.getBoundingClientRect().right),
              docScroll: document.documentElement.scrollWidth,
              innerWidth: document.documentElement.clientWidth,
            };
          }),
        );
        if (wide.retryRight <= wide.cardRight && wide.docScroll <= wide.innerWidth)
          ok('At 320px the English action row stays inside its card and does not widen the page');
        else
          fail(
            'Result actions at 320px (en)',
            `retry right ${wide.retryRight} vs card right ${wide.cardRight}, document scrollWidth ${wide.docScroll} vs clientWidth ${wide.innerWidth}`,
          );
      } finally {
        await ePage.close().catch(() => {});
      }
    } catch (e) {
      fail('Disabled button states', e.message);
    } finally {
      await dPage.close().catch(() => {});
    }
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
      const INFO_TEXT = ['.drop-text', '.paste-hint', '.file-list-header', '.file-meta', '.drop-stats'];
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
          const { found, missing } = await changeWithoutMotion(page, async () => {
            await applyTheme(page, mode, theme);
            // Same 180ms reason as `buttonStateColors`: these surfaces transition, so sampling
            // immediately reads a colour between the old theme's and the new one's — an earlier
            // draft of this gate "failed" at 1.17:1 on a mid-flight blue-to-dark backdrop.
            await page.waitForTimeout(400);
            return infoTextSamples(page, INFO_TEXT);
          });
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

  if (section('Alert & Tag Ink Contrast')) {
    try {
      // Element Plus paints its light-effect alerts and tags with a semantic colour as the ink on
      // that same colour's 10% tint, so this is the one text pair the token ladder does not own and
      // the five selectors above do not reach. Two sweeps because no single batch shows all of it:
      // an unrecognized file gives the `danger` badge and the `warning` alert the target picker
      // leaves behind, and a clean conversion gives the `success` alert plus the `primary` format
      // badge every file row carries. `error` and `info` need a failed or cancelled batch, which
      // later sections produce; they are not claimed here.
      const UNRECOGNIZED = ['.file-item .el-tag--danger', '.format-selector .el-alert__title'];
      const SUCCEEDED = ['.result-download .el-alert__title', '.file-item .el-tag--primary'];

      const appliedTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
      const appliedMode = await page.evaluate(() => document.documentElement.dataset.mode ?? '');

      /** Sweep the 6 themes × 2 modes for one screen state, after `stage` has put it on screen. */
      const sweep = async (selectors, label) => {
        let worst = Number.POSITIVE_INFINITY;
        let worstLabel = '';
        let groupFailed = false;
        for (const mode of ['light', 'dark']) {
          for (const theme of themeValues) {
            const { found, missing } = await changeWithoutMotion(page, async () => {
              await applyTheme(page, mode, theme);
              // The wait is not the guarantee — `infoTextSamples` samples under reduced motion, and
              // the theme still has to be applied once before anything can be read.
              await page.waitForTimeout(400);
              return infoTextSamples(page, selectors);
            });
            if (missing.length) {
              groupFailed = true;
              fail(`[${theme} ${mode}] ${label}`, `not sampled: ${missing.join(', ')}`);
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
                worstLabel = `${s.sel} (${theme} ${mode})`;
              }
            }
          }
        }
        if (!groupFailed && worstLabel) {
          ok(`${label} ≥ 4.5:1 in 6 themes × 2 modes (worst ${worst.toFixed(2)}:1, ${worstLabel})`);
        }
      };

      await resetWorkbench(page);
      const fi3 = await page.$('input[type="file"]');
      if (!fi3) throw new Error('file input not found');
      await fi3.setInputFiles([
        { name: 'mystery.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 3]) },
      ]);
      // 15s, not 5s: the badge is inside a `<TransitionGroup>`, so it is mounted with
      // `el-zoom-in-center-enter-from` (opacity 0, scale 0) and only becomes visible on the frame
      // that ends the transition. A starved renderer can withhold that frame for seconds, and
      // `waitForSelector` waits for *visible* — 2026-10-17 saw six such tags resolved as hidden.
      await page.waitForSelector('.file-item .el-tag--danger', { timeout: 15000 });
      await sweep(UNRECOGNIZED, 'unrecognized-format badge');

      await resetWorkbench(page);
      await convertFile(page, 'sample.txt', 'HTML');
      await page.waitForSelector('.result-download .el-alert__title', { timeout: 5000 });
      await sweep(SUCCEEDED, 'result alert and format badge');

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
      fail('Alert and tag ink contrast', e.message);
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
    // The panel is anchored under the header, so an uncapped one ran past the fold in a short window
    // and the shortcut row — this section's own subject — could only be reached by scrolling the page
    // out from under a popover pinned to the topbar. Measured at 500px tall, before the viewport goes
    // back to the size the rest of the section assumes. Scrolled to the top first on purpose: the
    // topbar is not sticky, so without this the anchor's viewport position — and with it where the
    // panel's last row lands — depends on wherever the previous section left the scroll.
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const gear = await page.$('.topbar-inner .el-button');
    if (!gear) throw new Error('settings button not found');
    await gear.click();
    await page.waitForTimeout(800);
    const panel = await page.evaluate(() => {
      const menu = document.querySelector('.preferences-menu');
      const pop = document.querySelector('.el-popover');
      if (!menu || !pop) return null;
      const scrollable = menu.scrollHeight > menu.clientHeight;
      menu.scrollTop = menu.scrollHeight;
      const last = menu.lastElementChild?.getBoundingClientRect();
      return {
        scrollable,
        overflowY: getComputedStyle(menu).overflowY,
        // Reading `scrollTop` back is what makes "I scrolled it" a fact rather than an intention: a
        // panel that cannot scroll at all leaves this at 0 and the last item stays wherever it was.
        atBottom: Math.abs(menu.scrollTop + menu.clientHeight - menu.scrollHeight) < 2,
        lastBottom: Math.round(last?.bottom ?? -1),
        popBottom: Math.round(pop.getBoundingClientRect().bottom),
        innerHeight: window.innerHeight,
      };
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);
    if (
      panel &&
      panel.scrollable &&
      panel.overflowY === 'auto' &&
      panel.atBottom &&
      panel.lastBottom >= 0 &&
      panel.lastBottom <= panel.innerHeight
    ) {
      ok(
        `Preferences panel scrolls itself to its last row in a short window (last ${String(panel.lastBottom)} ≤ ${String(
          panel.innerHeight,
        )}, popover ${String(panel.popBottom)})`,
      );
    } else {
      fail('Preferences panel height', JSON.stringify(panel));
    }

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
  //  SHORTCUT SYMBOL KEYS (KEY_TOKENS)
  // ═══════════════════════════════════════════

  // `+` and the space bar have no literal form inside a `+`-joined binding: the first *is* the
  // delimiter and the second is trimmed away. `Ctrl+Shift+=` is the shape that used to persist as
  // `ctrl+shift` — labelled "Ctrl + Shift", accepted by validation, and never firing, because the key
  // slot had swallowed the modifier. The binding now stores `plus`. That fix shipped with out-of-tree
  // probes only, so this section walks the loop a user walks — record → label → fire → reset — and
  // doubles as the check that `mod+enter` expands to this platform's own modifier.
  if (section('Shortcut symbol keys')) {
    try {
      const openPreferences = async () => {
        await page.evaluate(() => window.scrollTo(0, 0));
        const gear = await page.$('.topbar-inner .el-button');
        if (!gear) throw new Error('settings button not found');
        await gear.click();
        await page.waitForSelector('.shortcut-key', { timeout: 5000 });
      };
      const label = async () => (await page.$eval('.shortcut-key', el => el.textContent || '').catch(() => '')).trim();

      // A reload, because the previous section deliberately leaves the binding it recorded — the
      // storage mock resets with the document, so this starts from the shipped default.
      await page.reload();
      await page.waitForTimeout(1500);
      await openPreferences();
      const before = await label();
      const expectedDefault = process.platform === 'darwin' ? '⌘ Enter' : 'Ctrl + Enter';
      if (before === expectedDefault) ok(`Default label expands mod per platform ("${before}")`);
      else fail('Default shortcut label', `"${before}" != "${expectedDefault}"`);

      await (await page.$('.shortcut-key')).click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+Shift+Equal'); // the keydown carries key: '+'
      await page.waitForTimeout(700);
      const recorded = await label();
      // Exact, not `includes('+')`: the old broken shape persisted as `ctrl+shift`, whose label
      // "Ctrl + Shift" contains a plus and passes the loose check while never firing. The key token
      // must be the trailing `+` (macOS joins with spaces).
      const expectedRecorded = process.platform === 'darwin' ? '⌃ ⇧ +' : 'Ctrl + Shift + +';
      if (recorded === expectedRecorded) {
        ok(`Recorded '+' as its own token ("${before}" → "${recorded}")`);
      } else {
        fail('Shortcut plus token', `label "${recorded}" != "${expectedRecorded}"`);
      }
      const storedBinding = await page.evaluate(async () => {
        const stored = await window.chrome.storage.local.get('fat:shortcuts');
        return stored['fat:shortcuts']?.convert ?? '';
      });
      if (storedBinding === 'ctrl+shift+plus') {
        ok('The plus binding persists as the word token, not a trailing empty slot');
      } else {
        fail('Shortcut plus storage', `stored "${storedBinding}" != "ctrl+shift+plus"`);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      // A binding that only *looks* right is exactly the failure this section exists for: press the
      // recorded combo with a batch armed and require the conversion to actually start.
      await resetWorkbench(page);
      const fi = await page.$('input[type="file"]');
      if (!fi) throw new Error('file input not found');
      await fi.setInputFiles(path.join(FIXTURE_PATH, 'sample.md'));
      await page.waitForTimeout(1000);
      const sel = await page.$('.action-row .el-select');
      await sel.click();
      await page.waitForTimeout(500);
      const opt = page.locator('.el-select-dropdown__item:visible').filter({ hasText: 'HTML (.html)' }).first();
      await opt.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await page.keyboard.press('Control+Shift+Equal');
      await page.waitForFunction(
        () => {
          const alert = document.querySelector('.el-alert__title');
          return alert && alert.textContent.length > 0;
        },
        undefined,
        { timeout: 30000 },
      );
      const alertTitle = await page.$eval('.el-alert__title', el => el.textContent).catch(() => '');
      if (alertTitle.includes('完成')) ok('The recorded symbol binding fires the conversion');
      else fail('Shortcut plus token', `alert: "${alertTitle}"`);

      // Leave the shipped default behind for whatever runs after this section, and in storage.
      await openPreferences();
      const resetBtn = await page.$('.shortcut-reset');
      if (!resetBtn) throw new Error('shortcut reset button not found');
      await resetBtn.click();
      await page.waitForTimeout(600);
      const afterReset = await label();
      if (afterReset === before) ok(`Reset restored "${before}" after the symbol binding`);
      else fail('Shortcut symbol reset', `"${afterReset}" != "${before}"`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } catch (e) {
      fail('Shortcut symbol keys', e.message);
    }
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

  // ═══════════════════════════════════════════
  //  FOCUS RINGS ON VISUALLY-HIDDEN INPUTS
  // ═══════════════════════════════════════════

  if (section('Hidden-Input Focus Rings')) {
    // The switch, the checkbox and the segmented radio buttons all focus a transparent input and
    // paint the ring on a *sibling* proxy, so the global `:focus-visible` rule cannot reach them and
    // Element Plus's own declaration decides the colour. It uses its primary, not --fat-focus-ring,
    // and light + green is the one combination where the two disagree enough to matter: measured on
    // the built bundle before the override, the focused switch drew #10b981 at 2.54:1 on the popover
    // (2.42:1 on the workbench surface) while the token this app certifies at 3:1 resolves to
    // #059669. Every other theme and mode passed on Element Plus's colour, so only a colour
    // comparison — not a geometry check — can tell the fixed build from the broken one.
    const ringPage = await browser.newPage();
    trackPageErrors(ringPage);
    await ringPage.setViewportSize({ width: 1280, height: 900 });
    await ringPage.addInitScript(mockChromeStorage());
    // The notify switch is `:disabled` while the browser reports notifications as denied, and a
    // disabled control leaves the tab ring entirely — that would redden this section's two name
    // checks for a reason that has nothing to do with the product. Headless hosts differ on the real
    // value, so the permission state is pinned rather than observed.
    await ringPage.addInitScript(`(() => {
      if (!window.Notification) return;
      try {
        Object.defineProperty(window.Notification, 'permission', { value: 'default', configurable: true });
      } catch {
        // The host will not let the property be redefined; the walk below reports how many switches it found.
      }
    })();`);
    try {
      await ringPage.goto(`http://localhost:${PORT}/options.html`);
      await ringPage.waitForTimeout(1800);
      await applyTheme(ringPage, 'light', 'green');

      // Both controls are earned through the product's own paths rather than seeded: the radio group
      // sits behind `v-if="hasRecords"` and the merge checkbox behind the merge-eligibility rule, so
      // a history record and a two-image batch with a PDF target are what make them exist.
      let ri = await ringPage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
      await ri.setInputFiles(path.join(FIXTURE_PATH, 'sample.csv'));
      await ringPage.waitForTimeout(1000);
      await pickTarget(ringPage, 'Text (.txt)');
      await (await ringPage.$('.convert-btn')).click();
      await ringPage.waitForSelector('.result-download .el-alert__title', { timeout: 45000 });
      await resetWorkbench(ringPage);

      ri = await ringPage.waitForSelector('input[type="file"]', { state: 'attached', timeout: 10000 });
      await ri.setInputFiles([path.join(FIXTURE_PATH, 'sample.bmp'), path.join(FIXTURE_PATH, 'sample.gif')]);
      await ringPage.waitForTimeout(1200);
      await pickTarget(ringPage, 'PDF (.pdf)');
      await ringPage.locator('.topbar .el-button.is-circle').first().click();
      await ringPage.waitForTimeout(600);

      const readHiddenRing = `(function () {
        const a = document.activeElement;
        const cls = a && a.classList ? Array.from(a.classList).join(' ') : '';
        const kind = cls.includes('el-switch__input') ? 'switch'
          : cls.includes('el-checkbox__original') ? 'checkbox'
          : cls.includes('el-radio-button__original-radio') ? 'radio' : null;
        if (!kind) return null;
        const box = a.closest('.el-switch, .el-checkbox, .el-radio-button');
        const proxy = box.querySelector('.el-switch__core, .el-checkbox__inner, .el-radio-button__inner');
        // Same caveat the skip-link section documents: outline-color is one of the properties
        // tokens.css transitions, so a read in the task that moved focus returns an interpolation
        // frame — width still medium, colour still currentcolor.
        for (const animation of proxy.getAnimations({ subtree: true })) {
          try { animation.finish(); } catch { /* a looping animation has no end value */ }
        }
        const cs = getComputedStyle(proxy);
        const rgbOf = value => {
          const scratch = document.createElement('span');
          scratch.style.color = value;
          scratch.style.display = 'none';
          document.documentElement.append(scratch);
          const rgb = getComputedStyle(scratch).color;
          scratch.remove();
          return rgb;
        };
        const root = getComputedStyle(document.documentElement);
        // The ring's backdrop is the surface behind the *control*, not the proxy's own fill: the
        // 1px offset band shows that surface on both of its edges.
        let surface = '';
        for (let p = box.parentElement; p && p !== document.documentElement; p = p.parentElement) {
          const bg = getComputedStyle(p).backgroundColor;
          const m = /rgba?\\(([^)]+)\\)/.exec(bg);
          if (m && !(m[1].split(',').length === 4 && parseFloat(m[1].split(',')[3]) === 0)) { surface = bg; break; }
        }
        return {
          kind,
          style: cs.outlineStyle,
          width: cs.outlineWidth,
          color: cs.outlineColor,
          surface,
          label: (box.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 18),
          // The proxy holds the ring; the *input* holds the name. A screen reader announces this
          // control by that name and nothing else, and the switch renders no label wrapper, so an
          // aria-label is the only thing that can name it. (No backticks anywhere in here: this
          // whole function body is a template literal evaluated in the page.)
          name:
            (a.getAttribute('aria-label') || (a.closest('label') ? a.closest('label').textContent : '') || '')
              .replace(/\\s+/g, ' ')
              .trim(),
          rowLabel: (() => {
            const row = a.closest('.notify-row');
            const lab = row ? row.querySelector('.pref-label') : null;
            return lab ? lab.textContent.replace(/\\s+/g, ' ').trim() : '';
          })(),
          fromToken: rgbOf(root.getPropertyValue('--fat-focus-ring').trim()),
          epPrimary: rgbOf(root.getPropertyValue('--el-color-primary').trim()),
          // The raw tokens, kept alongside the resolved colours: rgbOf('') sets no style at all,
          // so a missing custom property would otherwise compare a real ring against the inherited
          // text colour and still look like a pass. (Nothing in this function body may contain a
          // backtick: the whole thing is a template literal that the page evaluates.)
          tokenVar: root.getPropertyValue('--fat-focus-ring').trim(),
          epVar: root.getPropertyValue('--el-color-primary').trim(),
        };
      })()`;

      const controls = [];
      const seen = new Set();
      // Four is the expected yield: two switches (the popover's), one merge checkbox, one radio
      // segment — `el-radio-group` moves its tabindex between segments, so three buttons contribute
      // one tab stop. Reading inside `sampleWithoutMotion` because the theme flip animates the
      // ancestor surfaces as well as the ring, and wall time is not a synchronisation point here.
      await sampleWithoutMotion(ringPage, async () => {
        await ringPage.evaluate(() => document.activeElement && document.activeElement.blur());
        for (let i = 0; i < 160 && controls.length < 4; i++) {
          await ringPage.keyboard.press('Tab');
          const hit = await ringPage.evaluate(readHiddenRing);
          if (!hit) continue;
          const key = `${hit.kind}|${hit.name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          controls.push(hit);
        }
      });
      const families = {};
      for (const c of controls) if (!families[c.kind]) families[c.kind] = c;

      for (const kind of ['switch', 'checkbox', 'radio']) {
        const f = families[kind];
        if (!f) {
          fail(`${kind} focus`, 'a Tab walk of the whole page never focused one of these controls');
          continue;
        }
        if (f.style === 'solid' && f.width === '2px') ok(`[green light] ${kind} ring on "${f.label}" is 2px solid`);
        else fail(`${kind} ring geometry`, `${f.style} ${f.width} on "${f.label}"`);
        if (f.color === f.fromToken) ok(`${kind} ring resolves to --fat-focus-ring (${f.color})`);
        else
          fail(
            `${kind} ring colour`,
            `expected ${f.fromToken}, got ${f.color} — Element Plus's primary is ${f.epPrimary}`,
          );
        const ratio = f.surface ? contrast(f.color, f.surface) : Number.NaN;
        if (!f.surface) fail(`${kind} ring contrast`, `no painted backdrop above the control (colour ${f.color})`);
        else if (ratio >= 3) ok(`${kind} ring meets 3:1 against ${f.surface} (${ratio.toFixed(2)}:1)`);
        else fail(`${kind} ring contrast`, `${ratio.toFixed(2)}:1 of ${f.color} on ${f.surface}`);
      }

      // The other half of "keyboard-reachable": a control nobody can name is a control a screen
      // reader reports as "switch, off" with no subject. The notify switch used to be exactly that —
      // its row's label is a sibling `<span>`, and Element Plus's switch renders no `<label>`.
      const unnamed = controls.filter(c => !c.name);
      if (controls.length >= 4 && unnamed.length === 0)
        ok(
          `every hidden-input control reached by Tab has an accessible name (${controls
            .map(c => `${c.kind}="${c.name.slice(0, 14)}"`)
            .join(', ')})`,
        );
      else
        fail(
          'Accessible name',
          unnamed.length
            ? `${unnamed.length} unnamed: ${unnamed.map(c => `${c.kind} "${c.label}"`).join(', ')}`
            : `only ${controls.length} controls found; 4 is the expected yield`,
        );

      const switches = controls.filter(c => c.kind === 'switch');
      const offLabel = switches.filter(s => !s.rowLabel || s.name !== s.rowLabel);
      if (switches.length >= 2 && offLabel.length === 0)
        ok(
          `both switches are named by their own row's visible label ("${switches[0].rowLabel}" / "${switches[1].rowLabel}")`,
        );
      else
        fail(
          'Switch name vs visible label',
          `${switches.length} switch(es) reached, ${offLabel.length} mismatched: ${offLabel
            .map(s => `"${s.name}" vs "${s.rowLabel}"`)
            .join(', ')}`,
        );

      // Without this the section could pass on a theme where the two colours are the same, which
      // would make the override unobservable and the eight assertions above vacuous.
      const any = families.switch || families.checkbox || families.radio;
      if (any && any.tokenVar && any.epVar && any.color !== any.epPrimary)
        ok(`the two tokens really disagree in light/green (${any.color} vs Element Plus's ${any.epPrimary})`);
      else
        fail(
          'Theme setup for the ring check',
          any && (!any.tokenVar || !any.epVar)
            ? `a token resolved to nothing (focus-ring="${any.tokenVar}", primary="${any.epVar}")`
            : `the ring paints exactly Element Plus's primary (${any ? any.color : 'unread'}), so the override is not observable`,
        );
    } catch (e) {
      fail('Hidden-input focus rings', e.message);
    } finally {
      await ringPage.close();
    }
  }

  // ═══════════════════════════════════════════
  //  TABLE-SHAPE ROUTE BOUNDARIES
  // ═══════════════════════════════════════════

  if (section('Table Boundary Routes')) {
    // The five table landing pages make their claims about *shape*, not bytes: one table becomes a CSV,
    // two tables (including a table nested inside a cell — `querySelectorAll('table')` counts it) do not,
    // and a multi-sheet workbook becomes several Markdown tables without meeting that gate at all. The
    // second of those three was written wrong the first time and corrected only after a review, which is
    // exactly the kind of outward claim a document check cannot catch. So the boundaries run here.
    const oneTable =
      '<html><body><table><tr><th>date</th><th>amount</th></tr>' +
      '<tr><td>2024-01-05</td><td>1727000000000</td></tr><tr><td>=1+1</td><td>7</td></tr></table></body></html>';
    const twoTables =
      '<html><body><h2>A</h2><table><tr><th>k</th></tr><tr><td>1</td></tr></table>' +
      '<h2>B</h2><table><tr><th>k</th></tr><tr><td>2</td></tr></table></body></html>';
    const nestedTable =
      '<html><body><table><tr><td>outer<a>x</a></td><td><table><tr><th>in</th></tr><tr><td>2</td></tr></table></td></tr></table></body></html>';
    const htmlDoc = body => ({ name: 'probe.html', mimeType: 'text/html', buffer: Buffer.from(body, 'utf8') });
    const failureReason = () => page.$eval('.failure-item .failure-reason', el => el.textContent).catch(() => '');

    try {
      await resetWorkbench(page);
      const ok1 = await convertFile(page, htmlDoc(oneTable), 'CSV (.csv)');
      if (ok1.alertTitle.includes('完成')) ok('Single HTML table converts to CSV');
      else fail('HTML table to CSV', `alert reads "${ok1.alertTitle}"`);

      // latin1 on purpose: the fixture is ASCII, so the byte comparison below is about the writer rather
      // than about decoding. BOM, the header row, an untouched long integer, and the formula guard.
      const csvText = await downloadBatchArtifact(page);
      const bytes = Buffer.from(csvText, 'latin1');
      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ok('CSV artifact carries the UTF-8 BOM');
      else fail('CSV BOM', `first three bytes are ${[...bytes.subarray(0, 3)].join(',')}`);
      if (csvText.includes('date,amount') && csvText.includes('1727000000000') && !/1\.7\d?E\+12/.test(csvText))
        ok(`Header row and long integer written as values (${csvText.replace(/^\ufeff/, '').split('\n')[1]})`);
      else fail('CSV value fidelity', `body reads ${JSON.stringify(csvText.slice(0, 120))}`);
      if (csvText.includes("'=1+1")) ok('A cell starting with = is exported behind the formula guard');
      else fail('CSV formula guard', `expected "'=1+1" in ${JSON.stringify(csvText.slice(0, 120))}`);

      await resetWorkbench(page);
      const two = await convertFile(page, htmlDoc(twoTables), 'CSV (.csv)');
      const twoReason = await failureReason();
      if (two.alertTitle.includes('失败') && twoReason.includes('数组'))
        ok(`Two tables are refused with the array reason ("${twoReason.trim().slice(0, 40)}")`);
      else fail('Multi-table boundary', `alert "${two.alertTitle}", reason "${twoReason.trim().slice(0, 60)}"`);

      await resetWorkbench(page);
      const nested = await convertFile(page, htmlDoc(nestedTable), 'CSV (.csv)');
      const nestedReason = await failureReason();
      if (nested.alertTitle.includes('失败') && nestedReason.includes('数组'))
        ok('A table nested in a cell counts as the second table and is refused the same way');
      else
        fail(
          'Nested-table boundary',
          `alert "${nested.alertTitle}", reason "${nestedReason.trim().slice(0, 60)}" — the pages say this fails`,
        );

      await resetWorkbench(page);
      const md = await convertFile(page, 'sample.xlsx', 'Markdown (.md)');
      if (md.alertTitle.includes('完成')) ok('Multi-sheet workbook converts to Markdown');
      else fail('XLSX to Markdown', `alert reads "${md.alertTitle}"`);
      const mdText = await downloadBatchArtifact(page);
      const headings = (mdText.match(/^## /gm) || []).length;
      // The separator row is the only line that starts with the pipe and then only `---` cells, so the
      // count is per table rather than per column (the earlier `\|\s*-{3,}` pattern matched every cell
      // of it and reported four for two tables).
      const rules = (mdText.match(/^\| ---/gm) || []).length;
      if (headings === 2 && rules === 2)
        ok(`Each worksheet became its own table under its own heading (${headings} headings, ${rules} tables)`);
      else fail('Multi-sheet Markdown shape', `${headings} "## " lines and ${rules} separator rows, expected 2 and 2`);
    } catch (e) {
      fail('Table boundary routes', e.message);
    } finally {
      await resetWorkbench(page).catch(() => {});
    }
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
      const line = `║    ✗ [${f.section}] ${f.name}: ${f.error}`;
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
