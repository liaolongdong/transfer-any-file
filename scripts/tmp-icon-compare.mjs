/*
 * TEMPORARY icon comparison renderer — delete after review:
 *   rm -rf .icon-compare
 * Run: node scripts/tmp-icon-compare.mjs
 *
 * Three variants, one variable at a time:
 *   A  disc + Material `autorenew` ring  (the original design, read back from git)
 *   B  disc + bidirectional swap arrow   (current)
 *   C  no disc, swap arrow with keyline  (requested comparison)
 * Each is rasterised at 512 / 128 / 48 / 16 and tiled into one contact sheet, with
 * the 16px column magnified 4x nearest-neighbour so the real toolbar result is legible.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const OUT = '.icon-compare';
const SIZES = [512, 128, 48, 16];

/** White arrows with a dark keyline, so they read on both the blue tile and the white sheet. */
const NO_DISC = `
  <g transform="translate(60.8 60.8) scale(1.7)">
    <g fill="none" stroke="#1E3A8A" stroke-width="7" stroke-linecap="round">
      <line x1="8" y1="12" x2="18" y2="12"/>
      <line x1="24" y1="20" x2="14" y2="20"/>
    </g>
    <path d="M18 7 L26 12 L18 17 Z" fill="#1E3A8A" stroke="#1E3A8A" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M14 15 L6 20 L14 25 Z" fill="#1E3A8A" stroke="#1E3A8A" stroke-width="3.5" stroke-linejoin="round"/>
    <g stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round">
      <line x1="8" y1="12" x2="18" y2="12"/>
      <line x1="24" y1="20" x2="14" y2="20"/>
    </g>
    <g fill="#FFFFFF">
      <path d="M18 7 L26 12 L18 17 Z"/>
      <path d="M14 15 L6 20 L14 25 Z"/>
    </g>
  </g>`;

/**
 * Separated composition: the sheet shrinks into the upper-left and the bare white arrows own
 * the lower-right, so the two shapes never overlap and no container disc is needed. The disc
 * only exists to give the glyph a constant-contrast ground; remove the overlap instead of
 * keylining around it.
 */
const SEPARATED = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <g transform="translate(-6 -4) scale(0.88)">
    <path d="M34 20 H62 L78 36 V86 Q78 92 72 92 H34 Q28 92 28 86 V26 Q28 20 34 20 Z" fill="#FFFFFF"/>
    <path d="M62 20 V32 Q62 36 66 36 H78 Z" fill="#BFDBFE"/>
    <rect x="38" y="46" width="24" height="5" rx="2.5" fill="#93C5FD"/>
    <rect x="38" y="58" width="28" height="5" rx="2.5" fill="#93C5FD"/>
    <rect x="38" y="70" width="14" height="5" rx="2.5" fill="#93C5FD"/>
  </g>
  <g transform="translate(60.8 60.8) scale(1.7)">
    <g stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round">
      <line x1="8" y1="12" x2="18" y2="12"/>
      <line x1="24" y1="20" x2="14" y2="20"/>
    </g>
    <g fill="#FFFFFF">
      <path d="M18 7 L26 12 L18 17 Z"/>
      <path d="M14 15 L6 20 L14 25 Z"/>
    </g>
  </g>
</svg>`;

/** Swap the disc's `autorenew` glyph for the shared swap geometry, and drop the disc entirely. */
function derive(svg, { dropDisc }) {
  const start = svg.indexOf('<circle cx="88" cy="88"');
  const end = svg.indexOf('</g>\n</svg>');
  if (start < 0 || end < 0) throw new Error('badge block not found — check assets/icon.svg');
  const head = svg.slice(0, svg.lastIndexOf('<!--', start));
  return `${head}${dropDisc ? NO_DISC : svg.slice(start, end)}\n</svg>`;
}

const current = readFileSync('assets/icon.svg', 'utf8');
const original = execSync('git show HEAD:assets/icon.svg').toString();

const variants = [
  { key: 'A', label: 'A · 圆底 + 环形箭头（原设计）', svg: original },
  { key: 'B', label: 'B · 圆底 + 双向箭头（当前）', svg: current },
  { key: 'C', label: 'C · 无圆底 + 双向箭头 keyline', svg: derive(current, { dropDisc: true }) },
  // The small tier on its own: what "one icon at every size" would actually look like.
  { key: 'D', label: 'D · 只用简化档（当前 16/32px 实际用图）', svg: readFileSync('assets/icon-small.svg', 'utf8') },
  { key: 'E', label: 'E · 分离式构图（文档缩小 + 箭头不重叠）', svg: SEPARATED },
  {
    key: 'F',
    label: 'F · B + 圆内留白微调（箭头 1.7→1.55）',
    svg: current.replace('translate(60.8 60.8) scale(1.7)', 'translate(63.2 63.2) scale(1.55)'),
  },
];

mkdirSync(resolve(OUT), { recursive: true });

function svgAt(src, size) {
  return src.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`);
}
function pageFor(src, size) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: none; }
    svg { display: block; }
  </style></head><body>${svgAt(src, size)}</body></html>`;
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 16, height: 16 }, deviceScaleFactor: 1 });
  for (const v of variants) {
    for (const size of SIZES) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(pageFor(v.svg, size), { waitUntil: 'load' });
      await page.screenshot({ path: `${OUT}/${v.key}-${size}.png`, omitBackground: true });
    }
    console.log('rendered', v.key, SIZES.join('/') + 'px');
  }

  const cols = SIZES.map(s => `<th>${s}px${s === 16 ? '<br><small>×4 最近邻放大</small>' : ''}</th>`).join('');
  const rows = variants
    .map(v => {
      const cells = SIZES.map(s => {
        const px = s === 16 ? 64 : s;
        return `<td><img src="${v.key}-${s}.png" width="${px}" height="${px}"${s === 16 ? ' class="zoom"' : ''}></td>`;
      }).join('');
      return `<tr><th class="rowlabel">${v.label}</th>${cells}</tr>`;
    })
    .join('');
  writeFileSync(
    `${OUT}/sheet.html`,
    `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
      body { margin: 0; padding: 22px; background: #f4f6fb; font: 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #101828; }
      h2 { margin: 0 0 4px; font-size: 15px; }
      p { margin: 0 0 16px; color: #475467; }
      table { border-collapse: collapse; background: #fff; }
      th, td { border: 1px solid #e4e7ec; padding: 10px; text-align: center; vertical-align: middle; }
      th { font-weight: 600; background: #f9fafb; }
      .rowlabel { text-align: left; white-space: nowrap; }
      img { display: block; }
      .zoom { image-rendering: pixelated; }
      small { color: #98a2b3; font-weight: 400; }
    </style></head><body>
      <h2>Transfer Any File · 图标方案对比</h2>
      <p>每格均为 1:1 实际像素（16px 列除外，为放大查看）。A/B/C/E/F 的 16px 格是「把详细档硬塞进工具栏」的结果，实际工具栏用的是 D 行。</p>
      <table><tr><th></th>${cols}</tr>${rows}</table>
    </body></html>`,
  );
  const sheet = await browser.newPage({ viewport: { width: 1180, height: 700 } });
  await sheet.goto(`file://${resolve(OUT, 'sheet.html')}`, { waitUntil: 'load' });
  await sheet.screenshot({ path: `${OUT}/compare.png`, fullPage: true });
  console.log('sheet', `${OUT}/compare.png`);
} finally {
  await browser.close();
}
