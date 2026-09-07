/*
 * Icon renderer: SVG masters -> PNG tiers (run: node scripts/render-icons.mjs)
 *
 * Two masters covering two size regimes:
 *   assets/icon.svg        document sheet + circular conversion badge — slots 48px and up
 *   assets/icon-small.svg  bold swap arrows, stripped down to survive 16px
 *
 * Size rule: the detailed master carries 5px-tall text lines on a 128 grid, so below ~48px
 * they collapse into sub-pixel mush. Anything rendered under 48px must take a `small` tier.
 *
 * Outputs land in two places on purpose:
 *   public/icon/*  -> bundled into the extension (WXT auto-registers these as manifest icons)
 *   docs/assets/*  -> outward-facing kit for GitHub / Pages / the store listing; never bundled
 *
 * Rasterised with the system Chrome through Playwright — the same launcher the other asset
 * scripts use — so regenerating icons pulls in no extra dependency.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const detailed = readFileSync('assets/icon.svg', 'utf8');
const small = readFileSync('assets/icon-small.svg', 'utf8');

const jobs = [
  // Extension icons (WXT reads public/icon/<size>.png into manifest.icons)
  { src: detailed, size: 128, out: 'public/icon/128.png' }, // store listing + workbench
  { src: detailed, size: 48, out: 'public/icon/48.png' }, // extension detail page
  { src: small, size: 32, out: 'public/icon/32.png' }, // extension manager, store search rows
  { src: small, size: 16, out: 'public/icon/16.png' }, // toolbar
  // Outward-facing kit. `icon.png` is the large master (GitHub avatar, JSON-LD logo);
  // `icon-mark.png` is the small-tier raster for favicons and any slot under 48px.
  { src: detailed, size: 512, out: 'docs/assets/icon.png' },
  { src: small, size: 64, out: 'docs/assets/icon-mark.png' },
];

/**
 * Point the master's intrinsic size at the target pixel grid.
 *
 * Only the root `<svg>` attributes are touched: a non-global replace stops at the first
 * match, while the masters also use `width`/`height` on inner shapes. The untouched
 * `viewBox` makes Chrome scale the vector down to exactly `size`.
 */
function svgAt(src, size) {
  return src.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
}

/** Transparent page so the tile's rounded corners stay transparent in the PNG. */
function pageFor(src, size) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: none; }
    svg { display: block; }
  </style></head><body>${svgAt(src, size)}</body></html>`;
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 16, height: 16 }, deviceScaleFactor: 1 });
  for (const { src, size, out } of jobs) {
    mkdirSync(dirname(resolve(out)), { recursive: true });
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(pageFor(src, size), { waitUntil: 'load' });
    await page.screenshot({ path: out, omitBackground: true });
    console.log('rendered', out, size + 'x' + size);
  }
} finally {
  await browser.close();
}
