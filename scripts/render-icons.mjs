/* One-off icon renderer: SVG masters -> public/icon PNGs (run: node scripts/render-icons.mjs) */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
// sharp is hoisted into the pnpm store by a transitive dep; resolve it from there
const sharp = require(resolve('node_modules/.pnpm/sharp@0.33.5/node_modules/sharp'));

const detailed = readFileSync('assets/icon.svg');
const small = readFileSync('assets/icon-small.svg');

const jobs = [
  { src: detailed, size: 128, out: 'public/icon/128.png' },
  { src: detailed, size: 48, out: 'public/icon/48.png' },
  { src: small, size: 32, out: 'public/icon/32.png' },
  { src: small, size: 16, out: 'public/icon/16.png' },
  { src: detailed, size: 128, out: 'assets/icon.png' },
  // Large previews for visual inspection only
  { src: detailed, size: 512, out: '.icon-preview-detailed.png' },
  { src: small, size: 256, out: '.icon-preview-small.png' },
];

for (const { src, size, out } of jobs) {
  await sharp(src, { density: 72 * (size / 32) * 4 })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log('rendered', out, size + 'x' + size);
}
