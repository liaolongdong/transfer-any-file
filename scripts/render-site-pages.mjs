/**
 * Render the site's content pages: the long-tail conversion landing pages under `docs/convert/`, and the
 * `docs/sitemap.xml` that lists them.
 *
 * Why this exists as a generator rather than as hand-written pages: every page states what a specific
 * converter in `utils/converters/` does and refuses to do, and a hand-written page cannot be checked
 * against the code it describes. Here each entry in `scripts/conversion-pages/pairs.mjs` is validated
 * before a single byte is written — the pair must exist in the route baseline, must not be a pair
 * `conversion-policy.ts` greys out, and its target must be a format the registry can actually write.
 * Add a page for a route the app does not offer and this script fails instead of publishing it.
 *
 * The route chain shown on each page is read from the same baseline, so 「先转 HTML 再转 Word」 cannot
 * drift away from what `resolvePath()` actually walks.
 *
 * One exception to "both languages in the markup": an *attribute* is not content. `alt` and
 * `aria-label` reach a screen reader through the accessibility tree, where a bilingual string is read
 * twice whichever language is showing, and whatever ships in `alt` is what image search indexes. So
 * those carry one language — `shotFigure` ships the document's own and swaps it, and the route card is
 * named by `aria-labelledby` so the same CSS that hides the inactive `<span>` hides it from AT too.
 *
 * The sitemap is generated for the same reason: eleven of its URLs are one per pair page, and a list
 * maintained by hand is how a cluster gets published without ever being discoverable. The three
 * hand-written URLs it also carries keep their own `lastmod` in `STATIC_PAGES` below, because a date
 * taken from the filesystem would say "today" on every clean checkout.
 *
 * Usage:
 *   node scripts/render-site-pages.mjs           # write the pages and the sitemap
 *   node scripts/render-site-pages.mjs --check   # CI: fail if the committed files are stale
 *
 * The emitted HTML is excluded from Prettier (see `.prettierignore`): it is a generated artifact, so
 * `--check` is the guard that catches both editing it by hand and forgetting to re-run this script.
 * `docs/diff/index.html` is the one output that is not Prettier-ignored: it is a byte-for-byte copy of
 * `tools/file-diff.html`, which is Prettier-clean at its source, so `format:check` covers it too — two
 * guards on the same bytes is the better failure mode than one, and a formatting change would show up as
 * a `--check` failure rather than as a silent rewrite of the copy.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  APP,
  FORMAT_LABEL,
  PAIRS,
  PAGES_PUBLISHED,
  PAGES_UPDATED,
  SCREENSHOTS,
  SITE,
  SOCIAL_IMAGE_ALT,
} from './conversion-pages/pairs.mjs';
import { HUBS } from './conversion-pages/hubs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'convert');
const SITEMAP = path.join(ROOT, 'docs', 'sitemap.xml');
// `tools/file-diff.html` is the only source for the one page on this site that takes a file as input, and
// `docs/diff/index.html` is a byte-for-byte copy of it. That is not tidiness: `check-offline.mjs` and
// `check-remote-code.mjs` name `tools` in their scan directories and deliberately do not name `docs`, so
// the copy can never be ahead of what the guards actually opened. `--check` then compares those bytes
// against the source on every run, which is what makes the copy a guarded artifact rather than a file
// nobody reads.
const DIFF_SRC = path.join(ROOT, 'tools', 'file-diff.html');
const DIFF_OUT = path.join(ROOT, 'docs', 'diff', 'index.html');
const CHECK = process.argv.includes('--check');

/**
 * The `SoftwareApplication` node every generated page describes.
 *
 * `softwareVersion` is read from `package.json` rather than written here: the site shipped claiming a
 * version that had been superseded two releases ago, and a literal is the only shape that error can take.
 * `pnpm verify:meta` asserts the same value against the hand-written node in `docs/index.html`.
 */
const APP_NODE = {
  ...APP,
  softwareVersion: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version,
};

/**
 * What the conversions index calls itself in a breadcrumb.
 *
 * One constant rather than four literals: a `BreadcrumbList` whose `name` disagrees with the anchor
 * text it describes is the structured-data equivalent of a mismatched label, and the Chinese graph
 * used to say `Conversions` under a link that read 转换一览.
 */
const CONVERT_CRUMB = { zh: '转换一览', en: 'Conversions' };

/**
 * The name a source hub carries in a breadcrumb and a hub card, in one language.
 * @param {string} code a `FileFormat` value
 * @param {'zh' | 'en'} lang
 * @returns {string}
 */
function hubCrumb(code, lang) {
  return lang === 'zh' ? `${FORMAT_LABEL[code].zh} 转换` : `${FORMAT_LABEL[code].en} conversions`;
}

const errors = [];
/**
 * Collect a validation failure instead of exiting on the first one.
 * @param {string} message what is wrong and where to fix it
 */
function fail(message) {
  errors.push(message);
}

// ---------------------------------------------------------------------------
// Evidence: the route baseline and the policy block list
// ---------------------------------------------------------------------------

/** @type {{edgeCount: number, formats: string[], paths: Record<string, string[]>}} */
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/__baseline__/conversion-paths.json'), 'utf8'));

/**
 * Read the `FileFormat` member lists that `conversion-policy.ts` builds its block rules from.
 *
 * Re-declaring those two sets here would be a copy that silently rots; parsing them out of the source
 * means a policy change that invalidates a page fails this script on the next run.
 *
 * @param {string} name the `const` to read, e.g. `IMAGE_FORMATS`
 * @returns {Set<string>} the enum values it lists
 */
function readPolicySet(name) {
  const source = fs.readFileSync(path.join(ROOT, 'utils/core/conversion-policy.ts'), 'utf8');
  const block = new RegExp(`const ${name} = new Set<FileFormat>\\(\\[([\\s\\S]*?)\\]\\)`).exec(source);
  if (!block) {
    fail(
      `conversion-policy.ts no longer declares \`${name}\` in the shape this script reads — update it, do not delete the check.`,
    );
    return new Set();
  }
  const members = [...block[1].matchAll(/FileFormat\.([A-Z]+)\b/g)].map(m => m[1].toLowerCase());
  if (members.length === 0) {
    fail(`\`${name}\` in conversion-policy.ts parsed to zero members — the script's regex no longer matches.`);
  }
  // Enum member names lowercase onto their values (`FileFormat.JPG = 'jpg'`), which is what the
  // baseline keys use; `enumValues` below proves that assumption still holds.
  return new Set(members);
}

const IMAGE_FORMATS = readPolicySet('IMAGE_FORMATS');
const DATA_FORMATS = readPolicySet('DATA_FORMATS');

/**
 * `utils/core/types.ts → FileFormat` is the source of the enum values used as baseline keys.
 * Read once so a renamed member breaks the run rather than quietly dropping a format.
 */
const enumValues = (() => {
  const source = fs.readFileSync(path.join(ROOT, 'utils/core/types.ts'), 'utf8');
  const body = /enum FileFormat \{([\s\S]*?)\}/.exec(source)?.[1] ?? '';
  return new Set([...body.matchAll(/=\s*'([^']+)'/g)].map(m => m[1]));
})();

/** Formats the registry can write = anything that appears as the target of one route step. */
const writableTargets = new Set();
for (const routes of Object.values(baseline.paths)) {
  // A `null` route is a pair with no path at all — every one of them targets BMP, GIF or SVG, which
  // a browser cannot encode. `validatePair` treats those as un-advertisable rather than skipping them.
  if (!routes) continue;
  for (const route of routes) {
    for (const step of route.split('>').slice(1)) writableTargets.add(step);
  }
}

/**
 * The two reasons `conversion-policy.ts` greys a reachable pair out, worded by reading the picker's own
 * strings out of `utils/i18n/`.
 *
 * Not copied here on purpose: the sentence a reader sees in the matrix has to stay the sentence the
 * extension shows for the same pair, and a second copy of it would drift the first time the interface
 * wording moved — with nothing left to notice, because the page would still read like English.
 *
 * @param {string} from source format value
 * @param {string} to target format value
 * @returns {'image' | 'pdf' | null} which reason applies, or null when the pair is offered
 */
function blockReason(from, to) {
  if (IMAGE_FORMATS.has(from) && (to === 'txt' || DATA_FORMATS.has(to))) return 'image';
  if (from === 'pdf' && DATA_FORMATS.has(to)) return 'pdf';
  return null;
}

/**
 * Mirror of `getBlockedReason()` reduced to the yes/no the pair pages need: a greyed-out pair must never
 * be advertised, and the reason only matters once it is a cell in the matrix.
 * @param {string} from source format value
 * @param {string} to target format value
 * @returns {boolean} true when the UI greys this pair out
 */
function isBlocked(from, to) {
  return blockReason(from, to) !== null;
}

// A member renamed in `types.ts` would otherwise make a policy set name something that is no longer a
// format, and the block rules above would quietly stop matching anything.
for (const value of [...IMAGE_FORMATS, ...DATA_FORMATS]) {
  if (!enumValues.has(value)) {
    fail(`conversion-policy.ts names a format '${value}' that is not in FileFormat — update this reader`);
  }
}

/**
 * One `format.*` message from the interface dictionaries.
 * @param {string} key the leaf name, e.g. `disabledImageNoText`
 * @param {'zh' | 'en'} lang which dictionary to read
 * @returns {string} the value, or an empty string when the key is gone (the run fails either way)
 */
function readI18n(key, lang) {
  const file = `utils/i18n/${lang}.ts`;
  const found = new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  if (!found) {
    fail(
      `${file} no longer declares \`format.${key}\` — the matrix quotes the picker's wording for a greyed-out ` +
        'pair, so teach this reader the new key rather than editing the page copy by hand',
    );
    return '';
  }
  return found[1].replace(/\\'/g, "'");
}

const BLOCK_COPY = {
  image: { zh: readI18n('disabledImageNoText', 'zh'), en: readI18n('disabledImageNoText', 'en') },
  pdf: { zh: readI18n('disabledPdfNoData', 'zh'), en: readI18n('disabledPdfNoData', 'en') },
};

// ---------------------------------------------------------------------------
// Evidence: the format matrix
// ---------------------------------------------------------------------------

/**
 * Rows and columns, both read off the graph: `formats` is the baseline's own vertex list in
 * `FileFormat`'s declaration order, and a column is a format the registry turns up as some route's
 * target. Nothing here is a list of formats this file maintains, which is the whole reason the matrix
 * can be published at all — the product page's 「没有手工维护的转换矩阵」 claim is only true of the
 * *display* if the display is derived.
 */
const MATRIX_ROWS = baseline.formats.filter(value => enumValues.has(value));
const MATRIX_COLS = MATRIX_ROWS.filter(value => writableTargets.has(value));

for (const value of enumValues) {
  if (!MATRIX_ROWS.includes(value)) {
    fail(`FileFormat '${value}' is missing from the baseline's vertex list, so the matrix drops a row`);
  }
}
if (MATRIX_COLS.length !== writableTargets.size) {
  fail('a format the registry writes is not a FileFormat member, so the matrix drops a column');
}

/** Which pair page explains a route, keyed `from->to`; null means "no page, the cell stands alone". */
const PAIR_PAGE = new Map(PAIRS.map(pair => [`${pair.from}->${pair.to}`, pair.slug]));
if (PAIR_PAGE.size !== PAIRS.length) {
  fail('two entries in pairs.mjs describe the same from→to route, so the matrix would link one cell twice');
}
/** The pair entries themselves, for the descriptions a hub reuses instead of writing them twice. */
const PAIR_BY_SLUG = new Map(PAIRS.map(pair => [pair.slug, pair]));

/**
 * Where each source format's hub lives, keyed by `FileFormat` value.
 *
 * The one place the enum-to-directory mapping is written; `hubs.mjs` carries a `from` and is checked
 * against this table so a hub cannot rename its own directory into a URL nothing links to.
 */
const HUB_SLUG = {
  md: 'markdown',
  html: 'html',
  docx: 'word',
  pdf: 'pdf',
  xlsx: 'excel',
  csv: 'csv',
  txt: 'txt',
  json: 'json',
  png: 'png',
  jpg: 'jpg',
  webp: 'webp',
  bmp: 'bmp',
  gif: 'gif',
  svg: 'svg',
};

/** The hub for a source format, or null when `hubs.mjs` forgot one (the run fails either way). */
const HUB_PAGE = new Map(HUBS.map(hub => [hub.from, hub.slug]));
for (const value of enumValues) {
  if (!HUB_PAGE.has(value)) fail(`hubs.mjs has no hub for FileFormat '${value}' — every source format needs one`);
}
const seenHubSlug = new Set();
for (const hub of HUBS) {
  if (HUB_SLUG[hub.from] !== hub.slug) {
    fail(`hubs.mjs: '${hub.from}' declares slug '${hub.slug}', but HUB_SLUG says '${HUB_SLUG[hub.from]}'`);
  }
  if (seenHubSlug.has(hub.slug)) fail(`hubs.mjs: slug '${hub.slug}' is declared twice`);
  seenHubSlug.add(hub.slug);
}
if (HUB_PAGE.size !== HUBS.length) {
  fail(`hubs.mjs has ${HUBS.length} entries but only ${HUB_PAGE.size} distinct source formats`);
}

/**
 * The grid itself: one object per cell, each read off `baseline.paths`.
 *
 * Every number the index page then prints is a count taken from here, so the prose and the table cannot
 * disagree — and the assertions below fail the render rather than printing a grid with a hole in it if
 * the graph ever grows a state this shape cannot hold (a writable target some source cannot reach, a
 * pair page for a route the policy greys out, a cell missing from the baseline).
 */
const MATRIX = (() => {
  const reachable = Object.values(baseline.paths).filter(steps => steps !== null).length;
  const blockedInBaseline = Object.entries(baseline.paths).filter(
    ([pair, steps]) => steps !== null && blockReason(...pair.split('->')) !== null,
  ).length;

  const rows = MATRIX_ROWS.map(from =>
    MATRIX_COLS.map(to => {
      if (from === to) return { from, to, kind: 'self' };
      const route = baseline.paths[`${from}->${to}`];
      if (!route) {
        fail(
          `${from} → ${to} is not in the baseline, but '${to}' is written by the registry somewhere — ` +
            'the matrix has no state for "reachable formats this source cannot reach", so add one rather ' +
            'than publishing a blank cell',
        );
        return { from, to, kind: 'self' };
      }
      const reason = blockReason(from, to);
      const hops = route.map(edge => edge.split('>'));
      const chain = [from, ...hops.map(([, target]) => target)];
      const slug = PAIR_PAGE.get(`${from}->${to}`) ?? null;
      /* Two ways a route key could stop describing a route: its edges no longer join up, or they run from
         somewhere else to somewhere else. Either would print a digit beside a chain the reader cannot
         walk, so the render stops rather than publishing the cell. */
      if (hops.some(([head], i) => i && hops[i - 1][1] !== head)) {
        fail(`${from} → ${to}: the recorded edges are not consecutive — the baseline shape changed`);
      }
      if (hops[0][0] !== from || hops[hops.length - 1][1] !== to) {
        fail(`${from} → ${to}: its route starts or ends somewhere other than the key says`);
      }
      const hub = HUB_SLUG[from];
      if (!hub) fail(`${from} → ${to} has no source hub in HUB_SLUG, so its matrix link cannot be built`);
      /* One destination per open cell, and the two shapes are the whole navigation layer: a route with
         a page of its own goes there, anything else goes to its source hub's anchor for that target.
         A blocked cell gets no destination at all — it is a statement that the route does not exist,
         and counting it as a hub anchor made the grid's own arithmetic read 143 destinations for 116
         open cells. */
      const dest = reason
        ? null
        : slug
          ? { kind: 'page', href: `${slug}.html` }
          : { kind: 'hub', href: `${hub}/#to-${to}` };
      return {
        from,
        to,
        kind: reason ? 'block' : 'open',
        reason,
        steps: chain.length - 1,
        chain,
        slug,
        dest,
      };
    }),
  );

  const cells = rows.flat();
  const counts = {
    cells: cells.length,
    self: cells.filter(cell => cell.kind === 'self').length,
    blocked: cells.filter(cell => cell.kind === 'block').length,
    open: cells.filter(cell => cell.kind === 'open').length,
    pages: cells.filter(cell => cell.dest?.kind === 'page').length,
    hubs: cells.filter(cell => cell.dest?.kind === 'hub').length,
    maxSteps: Math.max(...cells.map(cell => cell.steps ?? 0)),
  };

  if (counts.cells !== MATRIX_ROWS.length * MATRIX_COLS.length) {
    fail(`the matrix grid is ${counts.cells} cells, not ${MATRIX_ROWS.length} × ${MATRIX_COLS.length}`);
  }
  // The grid's own arithmetic: the diagonal is the one pair nobody converts, and everything else lands on
  // exactly one side of the policy line. `blockedInBaseline` is the same count taken through the other
  // door, so a cell that silently vanished cannot leave both numbers agreeing.
  if (counts.open + counts.blocked !== reachable) {
    fail(`the grid routes ${counts.open + counts.blocked} pairs but the baseline records ${reachable}`);
  }
  if (counts.blocked !== blockedInBaseline) {
    fail(`the grid greys out ${counts.blocked} cells, the baseline's own pairs say ${blockedInBaseline}`);
  }
  if (counts.pages !== PAIRS.length) {
    fail(`the matrix links ${counts.pages} pair pages while pairs.mjs defines ${PAIRS.length}`);
  }
  if (counts.pages + counts.hubs !== counts.open) {
    fail(
      `the matrix has ${counts.open} open cells but ${counts.pages} destinations to pair pages and ` +
        `${counts.hubs} to hub anchors — every open cell opens exactly one of the two`,
    );
  }

  return { rows, counts, reachable };
})();

// ---------------------------------------------------------------------------
// Evidence: the screenshots the pages show
// ---------------------------------------------------------------------------

const SHOT_DIR = path.join(ROOT, 'docs', 'assets', 'screenshots');

/**
 * Read the intrinsic size out of a PNG's IHDR chunk.
 *
 * The `<img>` carries `width` / `height` so the browser reserves the box before the file arrives, which
 * only holds while those numbers are the file's real ones. `file` is a path inside `SHOT_DIR` built from
 * the data module, not from user input.
 *
 * @param {string} file absolute path to the PNG
 * @returns {{w: number, h: number} | null} the declared size, or null when the file is missing or unreadable
 */
function pngSize(file) {
  let head;
  try {
    head = fs.readFileSync(file).subarray(0, 24);
  } catch {
    return null;
  }
  if (head.length < 24 || head.readUInt32BE(12) !== 0x49484452) return null;
  return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
}

/**
 * Check every screenshot reference before a page is written: the key must name a shot, the file must be
 * on disk where the site will serve it from, and its real pixels must match what the HTML will declare.
 * A page pointing at a missing image is a broken `<img>` on a public URL, so this fails the run.
 */
function validateScreenshots() {
  for (const [name, shot] of Object.entries(SCREENSHOTS)) {
    const file = path.join(SHOT_DIR, shot.file);
    const size = pngSize(file);
    if (!size) {
      fail(`SCREENSHOTS['${name}'] has no readable PNG at docs/assets/screenshots/${shot.file}`);
      continue;
    }
    if (size.w !== shot.w || size.h !== shot.h) {
      fail(
        `SCREENSHOTS['${name}'] declares ${shot.w}x${shot.h} but ${shot.file} is ${size.w}x${size.h} — the <img> attributes would be a lie`,
      );
    }
    for (const field of ['alt', 'caption']) {
      if (!shot[field]?.zh?.trim() || !shot[field]?.en?.trim()) {
        fail(`SCREENSHOTS['${name}'] is missing a ${field} in one of the two languages`);
      }
    }
  }
  for (const pair of PAIRS) {
    if (!SCREENSHOTS[pair.shot]) {
      fail(`${pair.slug}: shot '${pair.shot}' is not a key in SCREENSHOTS (pairs.mjs)`);
    }
  }
}

/**
 * Google's approximate display budget for the English side of a search result, in characters.
 *
 * Not a specification — Google measures pixels, not characters, and the numbers move with font and
 * device. They are the widths this copy is written against: a title over the first budget loses its
 * tail to an ellipsis, and a description over the second is usually rewritten outright by the
 * snippet generator, which is worse, because then the page's own facts never reach the SERP.
 *
 * Only `en` is checked. The Chinese strings are deliberately denser than a CJK SERP shows (about 30
 * title characters and 85 description characters, against measured maxima of 38 and 142 here), and
 * pinning a number the copy is known to exceed would turn a documented display trade-off into a
 * green checkmark.
 */
const SERP_TITLE = 60;
const SERP_DESC = 160;

/**
 * Validate one content entry against the code it describes.
 * @param {object} pair a `pairs.mjs` entry
 * @returns {string[]} the route chain, e.g. `['md', 'html', 'docx']`
 */
function validatePair(pair) {
  const { slug, from, to } = pair;
  if (pair.published !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pair.published)) {
      fail(`${slug}: published '${pair.published}' is not a YYYY-MM-DD date`);
    } else if (pair.published > PAGES_UPDATED) {
      fail(
        `${slug}: published ${pair.published} is newer than PAGES_UPDATED (${PAGES_UPDATED}) — the sitemap would then ` +
          'carry a lastmod older than the page says it was published, and the two claims are about the same URL',
      );
    }
  }
  for (const value of [from, to]) {
    if (!enumValues.has(value)) fail(`${slug}: format '${value}' is not a FileFormat value in utils/core/types.ts`);
    if (!FORMAT_LABEL[value]) fail(`${slug}: no FORMAT_LABEL entry for '${value}'`);
  }
  const edges = baseline.paths[`${from}->${to}`];
  if (!edges) {
    fail(
      `${slug}: the app has no ${from} → ${to} route in the path baseline (absent, or recorded unreachable — BMP/GIF/SVG cannot be written) — remove the page or add the converter`,
    );
    return [];
  }
  if (isBlocked(from, to)) {
    fail(`${slug}: ${from} → ${to} is greyed out by conversion-policy.ts, so it must not be advertised`);
  }
  if (!writableTargets.has(to)) {
    fail(`${slug}: '${to}' is never a step target in the registry, so nothing can be written in it`);
  }
  // The baseline stores one entry per registered edge on the route, in walking order
  // (`['md>html', 'html>docx']`), so the chain is the first edge's source plus every edge's target.
  const chain = [from, ...edges.map(edge => edge.split('>')[1])];
  edges.forEach((edge, i) => {
    const [src, dst] = edge.split('>');
    if (src !== chain[i] || !dst) {
      fail(`${slug}: route edges are not consecutive at '${edge}' — the baseline shape changed`);
    }
  });
  if (chain[chain.length - 1] !== to) {
    fail(`${slug}: the registered route ends at '${chain[chain.length - 1]}', not at '${to}'`);
  }
  for (const text of bilingualTexts(pair)) {
    if (!text.zh.trim() || !text.en.trim()) fail(`${slug}: an empty zh or en string`);
    assertEnglishIsEnglish(text.en, slug);
  }
  for (const [key, cap] of [
    ['title', SERP_TITLE],
    ['desc', SERP_DESC],
  ]) {
    const len = [...pair[key].en].length;
    if (len > cap) {
      fail(
        `${slug}: ${key}.en is ${len} characters against a ${cap}-character SERP budget — Google renders about this many and ` +
          'drops the rest, which is the part a crawler never reads. Shorten the copy in scripts/conversion-pages/pairs.mjs.',
      );
    }
  }
  for (const key of ['keeps', 'limits', 'notes']) {
    if (pair[key].zh.length !== pair[key].en.length) {
      fail(
        `${slug}: ${key} has ${pair[key].zh.length} zh bullets but ${pair[key].en.length} en — the pages ship both languages`,
      );
    }
  }
  return chain;
}

/**
 * Every bilingual string a page carries, so emptiness is caught in data rather than in markup.
 * @param {object} pair a `pairs.mjs` entry
 * @returns {{zh: string, en: string}[]}
 */
function bilingualTexts(pair) {
  const texts = [pair.title, pair.desc, pair.lede];
  for (const key of ['keeps', 'limits', 'notes'])
    texts.push(...pair[key].zh.map((_, i) => ({ zh: pair[key].zh[i], en: pair[key].en[i] })));
  for (const item of pair.faq) texts.push(item.q, item.a);
  return texts;
}

/**
 * The open routes of one source format, in the matrix column order the hub page renders them in.
 *
 * Read from the same baseline the matrix and pair pages use, so a hub cannot advertise a route the app
 * does not walk or list a target in an order the grid disagrees with. `pairSlug` is null exactly when the
 * target needs a `targets` description of its own, which is what `validateHub` then demands.
 *
 * @param {string} from a `FileFormat` value
 * @returns {{to: string, chain: string[], steps: number, pairSlug: string | null}[]}
 */
function hubRoutes(from) {
  return MATRIX_COLS.flatMap(to => {
    if (to === from) return [];
    const route = baseline.paths[`${from}->${to}`];
    if (!route || isBlocked(from, to)) return [];
    const chain = [from, ...route.map(edge => edge.split('>')[1])];
    return [{ to, chain, steps: chain.length - 1, pairSlug: PAIR_PAGE.get(`${from}->${to}`) ?? null }];
  });
}

/**
 * English copy must stay English. Two pages shipped a Chinese fragment *inside* an `en` string, because
 * the correction was typed into the sentence the author was reading — the Chinese one — and nothing
 * compared the two sides afterwards.
 *
 * CJK is allowed only between a pair of backticks, which is how a sample artifact is quoted (a CSV
 * header row, an `alt` text example taken from a Chinese document). Everything else in an English
 * string has to be English, so the rule splits on the code-span delimiter and looks only at the
 * segments that sit outside it — a whitelisted document of legitimate exceptions would go stale the
 * first time someone added a real sample, which is the failure mode this guard is meant to close.
 *
 * @param {string} text the `en` value of one bilingual field
 * @param {string} where what to name in the failure (a pair slug or a hub name)
 */
function assertEnglishIsEnglish(text, where) {
  // Five CJK blocks written as literal endpoints: ideographic punctuation, Unified A, the main block,
  // compatibility ideographs, and fullwidth forms. The punctuation range starts at `、` on purpose —
  // starting it at U+3000 would put an irregular whitespace character in the source, which ESLint
  // rejects, and a lone ideographic space is not prose. Latin, `→`, `≈`, `—` and curly quotes stay out.
  const cjk = /[㐀-䶿一-鿿豈-﫿、-〿＀-￯]/;
  const outside = text.split('`').filter((_, i) => i % 2 === 0);
  for (const segment of outside) {
    if (cjk.test(segment)) {
      const at = segment.search(cjk);
      fail(
        `${where}: Chinese inside an English string — “…${segment.slice(Math.max(0, at - 40), at + 40)}…” — ` +
          'only an inline-code span may hold CJK (that is where a sample artifact is quoted); rewrite the en value in full',
      );
      return;
    }
  }
}

/**
 * Validate one source hub against the route graph and the copy rules the pair pages follow.
 *
 * The `targets` check is deliberately an exact set comparison in both directions: a missing key would
 * render a route with a step count and no explanation, and an extra key would either duplicate a pair
 * page's description or describe a blocked/reachable-elsewhere target as if the app offered it.
 *
 * @param {object} hub a `hubs.mjs` entry
 * @returns {string[]} the formats of its open routes, for the coverage check
 */
function validateHub(hub) {
  const { from, slug } = hub;
  if (!enumValues.has(from)) fail(`hub '${slug}': from '${from}' is not a FileFormat value`);
  if (HUB_SLUG[from] !== slug) fail(`hub '${slug}': HUB_SLUG says '${from}' lives at '${HUB_SLUG[from]}'`);
  if (!SCREENSHOTS[hub.shot]) fail(`hub '${slug}': shot '${hub.shot}' is not a key in SCREENSHOTS`);
  for (const [key, cap] of [
    ['title', SERP_TITLE],
    ['desc', SERP_DESC],
  ]) {
    const len = [...hub[key].en].length;
    if (len > cap) {
      fail(
        `hub '${slug}': ${key}.en is ${len} characters against a ${cap}-character SERP budget — shorten it in ` +
          'scripts/conversion-pages/hubs.mjs',
      );
    }
  }
  for (const text of [
    hub.title,
    hub.desc,
    hub.lede,
    ...hub.limits.zh.map((_, i) => ({ zh: hub.limits.zh[i], en: hub.limits.en[i] })),
    ...hub.faq.flatMap(item => [item.q, item.a]),
  ]) {
    if (!text.zh.trim() || !text.en.trim()) fail(`hub '${slug}': an empty zh or en string`);
    assertEnglishIsEnglish(text.en, `hub '${slug}'`);
  }
  if (hub.limits.zh.length !== hub.limits.en.length) {
    fail(`hub '${slug}': limits has ${hub.limits.zh.length} zh bullets but ${hub.limits.en.length} en`);
  }
  if (hub.limits.zh.length < 3 || hub.limits.zh.length > 5) {
    fail(`hub '${slug}': limits must hold 3–5 entries, it holds ${hub.limits.zh.length}`);
  }
  if (hub.faq.length < 4 || hub.faq.length > 6) {
    fail(`hub '${slug}': FAQ must hold 4–6 questions, it holds ${hub.faq.length}`);
  }

  const routes = hubRoutes(from);
  const needText = routes.filter(route => route.pairSlug === null).map(route => route.to);
  const declared = Object.keys(hub.targets);
  const missing = needText.filter(to => !declared.includes(to));
  const extra = declared.filter(to => !needText.includes(to));
  if (missing.length > 0) {
    fail(`hub '${slug}': no targets description for ${missing.join(', ')} — those routes have no pair page`);
  }
  if (extra.length > 0) {
    fail(
      `hub '${slug}': targets describes ${extra.join(', ')}, which is not an open target without a pair page — ` +
        'the hub would explain a route twice or advertise one the picker does not offer',
    );
  }
  for (const [to, text] of Object.entries(hub.targets)) {
    if (!text.zh?.trim() || !text.en?.trim()) fail(`hub '${slug}' → '${to}': an empty zh or en string`);
    assertEnglishIsEnglish(text.en, `hub '${slug}' → '${to}'`);
  }
  return routes.map(route => route.to);
}

// ---------------------------------------------------------------------------
// Markup helpers
// ---------------------------------------------------------------------------

/**
 * Escape text for an HTML text node or a quoted attribute value.
 * @param {string} value raw string
 * @returns {string} escaped string
 */
function esc(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * A zh/en pair rendered the way `docs/index.html` does it: both languages in the markup, CSS showing
 * whichever `<html lang>` selects. A crawler that runs no JavaScript still reads every fact.
 * @param {string} zh Chinese copy
 * @param {string} en English copy
 * @returns {string} markup
 */
function bi(zh, en) {
  return `<span lang="zh-CN">${esc(zh)}</span><span lang="en">${esc(en)}</span>`;
}

/**
 * Render one `<li>` per bullet from the `{zh: [], en: []}` shape `pairs.mjs` stores bullets in.
 * The lengths are asserted equal in `validatePair`, so index pairing cannot silently truncate.
 * @param {{zh: string[], en: string[]}} list
 * @returns {string}
 */
function bullets(list) {
  return list.zh.map((zh, i) => `        <li>${bi(zh, list.en[i])}</li>`).join('\n');
}

/** @param {string} zh @param {string} en @returns {string} */
function sectionHeading(zh, en) {
  return `      <h2>${bi(zh, en)}</h2>`;
}

/**
 * The pre-paint language resolver, shared with `docs/index.html` (`fat-docs-lang`, `?lang=`, then the
 * browser language), narrowed to this page's own title and description.
 *
 * Both languages stay in the markup as the no-JavaScript fallback: a crawler that runs no script reads
 * the bilingual `<title>` and description, while a reader gets the one matching the language they
 * chose. The JSON is embedded with `<` escaped so a string can never close the script element.
 *
 * Position is load-bearing: this runs as the document is parsed, so it has to sit *after* the `<title>`
 * and the five meta tags it narrows. Placed before them it silently narrows nothing — `document.title`
 * would invent a second `<title>` element and every `querySelector` below would come back null.
 *
 * @param {{zh: {t: string, d: string}, en: {t: string, d: string}}} meta
 *   per-language chrome strings: `t` title, `d` description
 * @returns {string} markup for the two script tags
 */
function headScripts(meta) {
  const payload = JSON.stringify({ 'zh-CN': meta.zh, en: meta.en }).replace(/</g, '\\u003c');
  return `<script>
      window.__FAT_META__ = ${payload};
    </script>
    <script>
      (function () {
        var KEY = 'fat-docs-lang';
        var lang = null;
        try {
          var q = new URLSearchParams(location.search).get('lang');
          if (q === 'zh' || q === 'zh-CN') lang = 'zh-CN';
          else if (q === 'en') lang = 'en';
          else {
            var saved = localStorage.getItem(KEY);
            if (saved === 'zh' || saved === 'zh-CN') lang = 'zh-CN';
            else if (saved === 'en') lang = 'en';
          }
        } catch (e) {
          /* private mode: fall through to browser detection */
        }
        if (!lang) lang = (navigator.language || 'zh-CN').toLowerCase().indexOf('zh') === 0 ? 'zh-CN' : 'en';
        document.documentElement.setAttribute('lang', lang);
        window.__FAT_LANG__ = lang;
        /* Scroll reveals start at opacity 0, so they must never apply unless this script ran:
           a client that renders CSS but not JavaScript would otherwise see blank sections. */
        document.documentElement.classList.add('js');
        var copy = window.__FAT_META__[lang] || window.__FAT_META__.en;
        if (copy) {
          document.title = copy.t;
          [['meta[name="description"]', copy.d], ['meta[property="og:title"]', copy.t], ['meta[property="og:description"]', copy.d],
           ['meta[name="twitter:title"]', copy.t], ['meta[name="twitter:description"]', copy.d]].forEach(function (pair) {
            var el = document.querySelector(pair[0]);
            if (el) el.setAttribute('content', pair[1]);
          });
        }
      })();
    </script>`;
}

/**
 * The script that swaps the page's JSON-LD for the English graph when the reader's language is English.
 *
 * The graph emitted in `#fat-ld` is written in one language — Chinese, matching the `<html lang>` the
 * document ships with — because a mixed `name` is the string a crawler quotes back: it lands in rich
 * results and in AI answers as the question itself. Only the other language has to travel, since the
 * shipped graph already answers for Chinese.
 *
 * Runs directly after the `<script type="application/ld+json">` so `#fat-ld` exists, escapes `<` so a
 * string can never close the element, and is wrapped in `try`/`catch`: a throw leaves the shipped graph
 * in place rather than an empty tag.
 *
 * @param {object} enDoc the whole JSON-LD document for English readers, `@context` included
 * @returns {string} markup for the script tag
 */
function ldSwapScript(enDoc) {
  const literal = JSON.stringify(enDoc).replace(/</g, '\\u003c');
  return `<script>
      (function () {
        if (window.__FAT_LANG__ !== 'en') return;
        try {
          var box = document.getElementById('fat-ld');
          var graph = ${literal};
          if (box) box.textContent = JSON.stringify(graph);
        } catch (e) {
          /* keep the shipped graph */
        }
      })();
    </script>`;
}

/**
 * The one movement the content pages share: sections rise into place as they are scrolled to.
 *
 * Gated on `.js` by the stylesheet, and here by the observer: with reduced motion, or no
 * `IntersectionObserver`, every section is marked shown on the spot instead of waiting to be revealed.
 * Each target is unobserved once shown, so a long page costs nothing after the last section appears.
 *
 * The stagger is written per batch rather than per document index, and it lands on
 * `transition-delay` because the movement is a transition, not an animation. Both choices are
 * load-bearing for the same reason: a section that arrives alone must not sit idle waiting for the
 * five that preceded it, and the reduce block's `transition-delay: 0ms !important` only cancels a
 * delay it recognises as a transition property.
 *
 * The observer also resolves the sections a jump skipped over. Revealing is a state the reader has to
 * be able to reach by *not* scrolling, so anything already above the viewport when a record arrives is
 * marked shown instead of waiting for an intersection that the anchor already passed through.
 * @returns {string} markup for the script tag
 */
function revealScript() {
  return `<script>
    (function () {
      var revealables = document.querySelectorAll('.reveal');
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !('IntersectionObserver' in window)) {
        Array.prototype.forEach.call(revealables, function (el) {
          el.classList.add('in');
        });
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          var shown = 0;
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              /* A jump — an in-page anchor, a deep link straight to the #faq fragment, a restored scroll
                 position — never lets the observer see the sections in between, and a section whose only
                 report is "not intersecting" while it sits above the viewport would stay at opacity 0
                 until the reader scrolled back up. Anything already past the top edge is shown on the
                 spot: no movement is owed for a section nobody watched arrive. */
              if (entry.boundingClientRect.top < 0) {
                entry.target.classList.add('in');
                io.unobserve(entry.target);
              }
              return;
            }
            entry.target.style.transitionDelay = (shown++ % 6) * 40 + 'ms';
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
      );
      Array.prototype.forEach.call(revealables, function (el) {
        io.observe(el);
      });
    })();
  </script>`;
}

/**
 * The workbench frame a page shows, and the caption it is shown with.
 *
 * `alt` says what is in the picture, `caption` says what the page is proving with it; both come from
 * `SCREENSHOTS`, so the five pages that share a frame share the wording too. The attribute ships in the
 * document's own language and the script below swaps it for the English one — an alt holding both
 * languages is what image search would index, and it is not what a screen reader should be told.
 *
 * The swap travels with the figure because the head script that narrows the title and the meta tags
 * cannot reach this `<img>`: it has not been parsed yet when that script runs.
 * @param {object} shot a `SCREENSHOTS` entry
 * @param {number} depth how many directories down from the site root the page sits
 * @returns {string} markup for the `<figure>` and its swap
 */
function shotFigure(shot, depth) {
  const enAlt = JSON.stringify(shot.alt.en).replace(/</g, '\\u003c');
  return `          <figure class="shot reveal">
            <img
              src="${'../'.repeat(depth)}assets/screenshots/${esc(shot.file)}"
              width="${shot.w}"
              height="${shot.h}"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
              alt="${esc(shot.alt.zh)}"
            />
            <figcaption>${bi(shot.caption.zh, shot.caption.en)}</figcaption>
          </figure>
          <script>
            (function () {
              if (window.__FAT_LANG__ !== 'en') return;
              var img = document.querySelector('.shot img');
              if (img) img.setAttribute('alt', ${enAlt});
            })();
          </script>`;
}

/**
 * The format matrix on the conversions index: source formats down the side, the writable ones across
 * the top, and the route between them in the cell.
 *
 * Three things this has to hold at once, which is why it is generated rather than drawn:
 *
 * - **A crawler that runs no JavaScript reads every fact.** The digit, the greyed-out marker and the
 *   diagonal each carry a visually-hidden bilingual phrase, so a screen reader or a parser gets
 *   「3 步」/ "3 steps" rather than a bare glyph, and the two policy reasons are spelled out in the
 *   legend in both languages. Nothing here is only reachable by interacting.
 * - **The numbers are counts, not sentences.** The intro interpolates `MATRIX.counts`, so the table and
 *   the paragraph above it are the same computation; `pnpm verify:numbers` then checks that
 *   computation against `conversion-policy.ts` and `FileFormat` themselves.
 * - **A cell is a navigation target, not decoration.** The routes that have a page of their own link
 *   straight to it, which is how the matrix also works as the cluster's internal linking layer.
 *
 * The interaction layer lives in {@link matrixScript}; it only adds focus, a readout and arrow-key
 * movement, and it is written so that the page reads the same without it.
 * @returns {string} markup for the `<section>`, its table, legend and readout
 */
function matrixSection() {
  const { rows, counts } = MATRIX;
  /** One visually-hidden bilingual phrase, so the glyph in a cell is never the only answer. */
  const hidden = (zh, en) =>
    `<span class="mx-sr" lang="zh-CN">${esc(zh)}</span><span class="mx-sr" lang="en">${esc(en)}</span>`;

  const cellHtml = cell => {
    if (cell.kind === 'self') {
      return `<td class="mx-self" data-kind="self"><span aria-hidden="true">–</span>${hidden('同一格式', 'same format')}</td>`;
    }
    if (cell.kind === 'block') {
      const short =
        cell.reason === 'image'
          ? hidden('界面置灰：图片没有文字层', 'greyed out: no text layer')
          : hidden('界面置灰：PDF 没有表格结构', 'greyed out: no table structure');
      return `<td class="mx-block" data-kind="block" data-reason="${cell.reason}"><span aria-hidden="true">✕</span>${short}</td>`;
    }
    const plural = cell.steps === 1 ? 'step' : 'steps';
    // Both halves of this pair belong in markup, not only in the readout script: where a cell goes is a
    // fact about the route, and a reader without JavaScript used to get the step count and nothing else —
    // the same grid therefore said two different things depending on whether the browser ran the script.
    const where =
      cell.dest.kind === 'page'
        ? { zh: '，有专页', en: ', with its own page' }
        : { zh: '，打开来源格式页', en: ', on the source format page' };
    const said = hidden(`${cell.steps} 步链路${where.zh}`, `${cell.steps} ${plural}${where.en}`);
    const inner = `<a class="mx-${cell.dest.kind === 'page' ? 'page' : 'hub'}" href="${esc(cell.dest.href)}"><span aria-hidden="true">${cell.steps}</span>${said}</a>`;
    return `<td class="mx-open" data-kind="open" data-steps="${cell.steps}" data-chain="${esc(cell.chain.join('>'))}" data-page="${esc(cell.dest.href)}" data-dest="${cell.dest.kind}">${inner}</td>`;
  };

  const headRow = `                <tr>
                  <th scope="col" class="mx-corner">${bi('源 ↓ · 目标 →', 'Source ↓ · Target →')}</th>
                  ${MATRIX_COLS.map(to => `<th scope="col" data-f="${to}">${bi(FORMAT_LABEL[to].zh, FORMAT_LABEL[to].en)}</th>`).join('\n                  ')}
                </tr>`;

  const body = rows
    .map(row => {
      const from = row[0].from;
      return `                <tr>
                  <th scope="row" data-f="${from}"><a href="${HUB_SLUG[from]}/">${bi(FORMAT_LABEL[from].zh, FORMAT_LABEL[from].en)}</a></th>
                  ${row.map(cellHtml).join('\n                  ')}
                </tr>`;
    })
    .join('\n');

  return `        <section id="matrix" class="matrix-sec reveal">
${sectionHeading('格式矩阵', 'The format matrix')}
          <p>
            ${bi(
              `这张表是把上面那段话摊开写：行是 ${MATRIX_ROWS.length} 种格式，列是 ${MATRIX_COLS.length} 种可写格式，一共 ${counts.cells} 个格子，其中 ${counts.self} 格是同一个格式对着自己。剩下的 ${MATRIX.reachable} 个可达组合里，${counts.blocked} 个语义无效，所以界面对用户实际提供 ${counts.open} 个。格子里写的是这条链路实际走的步数——它不是「我们支持 N 种转换」的另一种说法，而是那张「没有手工维护的转换矩阵」被现推出来给你看：${baseline.edgeCount} 条注册路径，闭包自己算出这些格子。`,
              `The grid is that sentence spread out: ${MATRIX_ROWS.length} formats down the side, the ${MATRIX_COLS.length} writable ones across the top, ${counts.cells} cells in all, of which ${counts.self} are a format meeting itself. Of the remaining ${MATRIX.reachable} reachable combinations, ${counts.blocked} of them are blocked by the policy as semantically invalid, so the picker offers ${counts.open}. What a cell holds is the number of steps that route actually runs — not another way of saying “we support N conversions”, but the matrix nobody maintains worked out in front of you: ${baseline.edgeCount} registered routes, and these cells are their closure.`,
            )}
          </p>
          <div class="mx-filter" role="group" aria-label="按步数筛选矩阵 / Filter the matrix by steps">
            <button type="button" data-filter="all" aria-pressed="true">${bi('全部', 'All')}</button>
            <button type="button" data-filter="1" aria-pressed="false">${bi('1 步', '1 step')}</button>
            <button type="button" data-filter="2" aria-pressed="false">${bi('2 步及以上', '2+ steps')}</button>
          </div>
          <div class="matrix-scroll">
            <table class="matrix" id="mx-table">
              <caption>
                ${bi(
                  `行 = 源格式，列 = 目标格式；数字是步数，✕ 是界面置灰的组合，– 是同格式。每个开放格子都能打开它自己的说明页或来源格式页。`,
                  `Rows are source formats, columns the writable ones; a digit counts steps, ✕ is a pair the picker greys out, – is the same format. Every open cell opens either its own page or the source format's page.`,
                )}
              </caption>
              <thead>
${headRow}
              </thead>
              <tbody>
${body}
              </tbody>
            </table>
          </div>
          <p class="mx-legend">
            ${bi(
              `图例：数字 = 这条链路走的步数（${counts.maxSteps} 是今天最长的一条，中间产物不落盘）；✕ = 图上可达但语义无效，工作台会置灰并给出原因 —— 「${BLOCK_COPY.image.zh}」「${BLOCK_COPY.pdf.zh}」；– = 源与目标是同一个格式。带下划线的数字都能点：有专页的进那一页看保留项与丢弃项，没有专页的进来源格式页看这一条路的说明。`,
              `Legend: a digit is how many steps that route runs (${counts.maxSteps} is the longest one today, and no intermediate ever touches the disk); ✕ is reachable in the graph but semantically invalid, so the workbench greys it out and says why — “${BLOCK_COPY.image.en}” and “${BLOCK_COPY.pdf.en}”; – is a format meeting itself. Every underlined digit opens something: a pair page with that route's kept and dropped details, or its source format's page where the route is explained.`,
            )}
          </p>
          <p class="mx-readout" id="mx-readout" role="status">
            ${bi(
              '把指针移到任一格，或用 Tab 聚焦矩阵后按方向键逐格走，这里会读出这条链路的完整走法。',
              'Hover a cell, or press Tab and walk the grid with the arrow keys, and the full route is read out here.',
            )}
          </p>
          <p class="mx-trail" id="mx-trail" aria-hidden="true"></p>
        </section>`;
}

/**
 * The matrix's interaction layer: roving focus, arrow-key walking, and a live readout of the route under
 * the cursor.
 *
 * Everything it prints already exists on the page in both languages — the format names come from the row
 * and column headers' own `<span lang>` pair, and the greyed-out wording from `BLOCK_COPY` — so the
 * script adds no claim the markup does not already make. It builds its sentences with `createElement` and
 * `textContent` rather than `innerHTML`, and touches nothing outside the table.
 *
 * One tab stop, not one hundred and fifty-four: the cells keep `tabindex="-1"` except the current one, the
 * arrow keys move that one, and Enter follows the page it points at. The 21 links in the grid are folded
 * into that stop rather than adding 21 more of their own — in markup, where they are ordinary links a
 * reader without JavaScript can tab to and open like anything else on the page. `role="status"` makes the
 * readout a polite live region, so a screen reader announces the route a keyboard user steps onto without
 * interrupting whatever it was reading.
 * @returns {string} markup for the script tag
 */
function matrixScript() {
  const copy = JSON.stringify({
    block: BLOCK_COPY,
    self: { zh: '源与目标是同一格式，没有转换这回事。', en: 'A format meeting itself — there is no conversion here.' },
    route: { zh: '步链路', en: 'step' },
    via: { zh: '经过', en: 'via' },
    page: { zh: '· 有专页', en: '· has its own page' },
    hub: { zh: '· 见来源格式页', en: '· on the source page' },
  }).replace(/</g, '\\u003c');

  return `<script>
    (function () {
      var table = document.getElementById('mx-table');
      var readout = document.getElementById('mx-readout');
      var trailBox = document.getElementById('mx-trail');
      if (!table || !readout) return;
      var COPY = ${copy};
      var head = [].slice.call(table.querySelectorAll('thead th[data-f]'));
      /* sectionRowIndex on the body rows, not rowIndex: the header row is row 0 of the table, but it
         is not in this list, and reading one off the other puts every readout a row out of place. */
      var rows = [].slice.call(table.querySelectorAll('tbody tr'));
      var cells = [].slice.call(table.querySelectorAll('tbody td'));
      if (!head.length || !cells.length) return;
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      /** Both languages a header carries, exactly as the page ships them. */
      function pair(node) {
        var zh = node.querySelector('span[lang="zh-CN"]');
        var en = node.querySelector('span[lang="en"]');
        return { zh: zh ? zh.textContent : '', en: en ? en.textContent : '' };
      }
      var LABELS = {};
      rows.forEach(function (row) {
        var th = row.querySelector('th[data-f]');
        if (th) LABELS[th.getAttribute('data-f')] = pair(th);
      });
      /** The formats a route passes through between the two ends, in both languages. */
      function middle(cell) {
        var codes = (cell.getAttribute('data-chain') || '').split('>');
        return codes.slice(1, -1).map(function (code) {
          return LABELS[code] || { zh: code, en: code };
        });
      }
      function sentence(cell) {
        var kind = cell.getAttribute('data-kind');
        var row = rows[cell.parentNode.sectionRowIndex];
        var from = row ? pair(row.querySelector('th')) : { zh: '', en: '' };
        var col = head[cell.cellIndex - 1];
        var to = col ? pair(col) : { zh: '', en: '' };
        var both = function (zhJoin, enJoin) {
          return { zh: from.zh + ' → ' + to.zh + zhJoin, en: from.en + ' → ' + to.en + enJoin };
        };
        if (kind === 'self') return both('：' + COPY.self.zh, ' — ' + COPY.self.en);
        if (kind === 'block') {
          var why = COPY.block[cell.getAttribute('data-reason')] || { zh: '', en: '' };
          return both('：' + why.zh, ' — ' + why.en);
        }
        var steps = Number(cell.getAttribute('data-steps')) || 1;
        var dest = cell.getAttribute('data-dest');
        var mid = middle(cell);
        return both(
          '：' + steps + ' ' + COPY.route.zh + ' ' + (dest === 'page' ? COPY.page.zh : COPY.hub.zh) +
            (mid.length ? ' · ' + COPY.via.zh + ' ' + mid.map(function (m) { return m.zh; }).join('、') : ''),
          ' — ' + steps + ' ' + COPY.route.en + (steps === 1 ? '' : 's') + ' ' +
            (dest === 'page' ? COPY.page.en : COPY.hub.en) +
            (mid.length ? ' · ' + COPY.via.en + ' ' + mid.map(function (m) { return m.en; }).join(', ') : ''),
        );
      }
      function show(text) {
        while (readout.firstChild) readout.removeChild(readout.firstChild);
        ['zh-CN', 'en'].forEach(function (lang) {
          var span = document.createElement('span');
          span.setAttribute('lang', lang);
          span.textContent = lang === 'zh-CN' ? text.zh : text.en;
          readout.appendChild(span);
        });
      }
      /**
       * The visual-only route strip under the readout. It reproduces a fact already in the table (the
       * chain's codes) as chips, and is aria-hidden so it never becomes a second announcement.
       * The 60 ms stagger is capped by the chain length itself; the longest route today is 4 steps.
       */
      function trailer(cell) {
        if (!trailBox) return;
        while (trailBox.firstChild) trailBox.removeChild(trailBox.firstChild);
        trailBox.classList.remove('on');
        if (!cell || cell.getAttribute('data-kind') !== 'open' || cell.classList.contains('mx-filtered')) return;
        var codes = (cell.getAttribute('data-chain') || '').split('>');
        codes.forEach(function (code, i) {
          if (i) {
            var arrow = document.createElement('span');
            arrow.className = 'arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '→';
            trailBox.appendChild(arrow);
          }
          var chip = document.createElement('span');
          chip.className = 'chip';
          var label = LABELS[code] || { zh: code, en: code };
          [['zh-CN', label.zh], ['en', label.en]].forEach(function (pair) {
            var span = document.createElement('span');
            span.setAttribute('lang', pair[0]);
            span.textContent = pair[1];
            chip.appendChild(span);
          });
          chip.style.transitionDelay = i * 60 + 'ms';
          trailBox.appendChild(chip);
        });
        if (reduced) {
          trailBox.classList.add('on');
          return;
        }
        void trailBox.offsetWidth;
        trailBox.classList.add('on');
      }
      var on = [];
      var active = null;
      function clear() {
        on.forEach(function (node) { if (node) node.classList.remove('mx-on'); });
        on = [];
        table.classList.remove('mx-tracing');
        trailer(null);
      }
      function activate(cell) {
        if (!cell || cell === active) return;
        /* A dimmed cell is not a route under the filter: hovering it must not read out a row the reader
           just chose to hide. */
        if (cell.classList.contains('mx-filtered')) return;
        active = cell;
        clear();
        table.classList.add('mx-tracing');
        var row = rows[cell.parentNode.sectionRowIndex];
        var col = head[cell.cellIndex - 1];
        [cell, row ? row.querySelector('th') : null, col].forEach(function (node) {
          if (node) { node.classList.add('mx-on'); on.push(node); }
        });
        show(sentence(cell));
        trailer(cell);
      }
      /* The 116 links stay real links — no-JS readers tab through them like any other page. Once this
         script runs the grid is the tab stop instead: the arrows already move between cells, so a second
         stop per linked cell would only make Tab disagree with the arrow keys. Enter follows wherever
         the current cell points. Row-header hub links are ordinary Tab stops and are left alone. */
      cells.forEach(function (cell, i) {
        cell.setAttribute('tabindex', i === 0 ? '0' : '-1');
        var link = cell.querySelector('a');
        if (link) link.setAttribute('tabindex', '-1');
      });
      var current = 0;
      var width = head.length;
      function visible(i) {
        return i >= 0 && i < cells.length && !cells[i].classList.contains('mx-filtered');
      }
      /* The step filter. A cell that does not match is dimmed, not removed: the table's shape is the
         claim, and dropping cells (or aria-hiding them) would leave a grid that no longer adds up.
         Arrow navigation skips dimmed cells so the keyboard cannot land on a route the filter hides. */
      var filter = 'all';
      function matches(cell) {
        if (filter === 'all') return true;
        var steps = Number(cell.getAttribute('data-steps'));
        if (!steps) return false;
        return filter === '1' ? steps === 1 : steps >= 2;
      }
      var buttons = [].slice.call(document.querySelectorAll('.mx-filter [data-filter]'));
      function applyFilter(next) {
        filter = next;
        buttons.forEach(function (button) {
          button.setAttribute('aria-pressed', button.getAttribute('data-filter') === next ? 'true' : 'false');
        });
        cells.forEach(function (cell) {
          cell.classList.toggle('mx-filtered', !matches(cell));
        });
        if (active && active.classList.contains('mx-filtered')) {
          active = null;
          clear();
          while (readout.firstChild) readout.removeChild(readout.firstChild);
        }
        if (!visible(current)) {
          var first = cells.findIndex(function (_, i) { return visible(i); });
          if (first >= 0) {
            cells[current].setAttribute('tabindex', '-1');
            current = first;
            cells[current].setAttribute('tabindex', '0');
          }
        }
      }
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          applyFilter(button.getAttribute('data-filter'));
        });
      });
      table.addEventListener('focusin', function (event) {
        var cell = event.target.closest ? event.target.closest('td') : null;
        if (!cell || !table.contains(cell)) return;
        current = cells.indexOf(cell);
        if (current >= 0) { cells.forEach(function (c, i) { c.setAttribute('tabindex', i === current ? '0' : '-1'); }); }
        activate(cell);
      });
      table.addEventListener('mouseover', function (event) {
        var cell = event.target.closest ? event.target.closest('td') : null;
        if (cell && table.contains(cell)) activate(cell);
      });
      table.addEventListener('keydown', function (event) {
        if (current < 0) return;
        /* A row-header link is a normal Tab stop inside the table; its own Enter and arrow keys belong
           to the browser, not to the grid. */
        if (!event.target.closest || !event.target.closest('td')) return;
        if (event.key === 'Enter') {
          if (!visible(current)) return;
          var page = cells[current].getAttribute('data-page');
          if (page) window.location.href = page;
          return;
        }
        var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: width, ArrowUp: -width }[event.key];
        var target = current;
        if (event.key === 'Home' || event.key === 'End') {
          var start = Math.floor(current / width) * width;
          var end = start + width - 1;
          var direction = event.key === 'Home' ? 1 : -1;
          target = -1;
          for (var i = event.key === 'Home' ? start : end; i >= start && i <= end; i += direction) {
            if (visible(i)) { target = i; break; }
          }
          if (target < 0) return;
        } else if (step === undefined) return;
        else {
          target = current + step;
          while (target >= 0 && target < cells.length && !visible(target)) target += step;
          if (target < 0 || target >= cells.length) return;
        }
        event.preventDefault();
        cells[current].setAttribute('tabindex', '-1');
        current = target;
        cells[current].setAttribute('tabindex', '0');
        cells[current].focus();
      });
    })();
  </script>`;
}

/**
 * Site header + footer shared by every generated page, so the cluster is one navigable set and every
 * page hands the reader back to the product page and the privacy policy.
 * @param {number} depth how many directories down from the site root the page sits
 * @returns {{head: string, foot: string}}
 */
function chrome(depth) {
  const up = '../'.repeat(depth);
  const head = `<header class="site-head">
    <div class="wrap">
      <a class="brand" href="${up}">
        <img src="${up}assets/icon-mark.png" width="26" height="26" alt="" />
        ${bi('文件格式任意转换助手', 'Transfer Any File')}
      </a>
      <nav class="site-nav" aria-label="Site">
        <a href="${up}">${bi('产品说明', 'Product')}</a>
        <a href="${up}convert/">${bi(CONVERT_CRUMB.zh, CONVERT_CRUMB.en)}</a>
        <a href="${up}diff/">${bi('文件对比', 'File diff')}</a>
        <a href="${up}blog/">${bi('博客', 'Blog')}</a>
        <a href="${SITE.repo}" rel="noopener" target="_blank">GitHub</a>
      </nav>
    </div>
  </header>`;
  const foot = `<footer class="site-foot">
    <div class="wrap">
      <p>
        ${bi(
          '文件格式任意转换助手 —— 完全离线的 Chrome 文件格式转换扩展。文件不出本机，无遥测，只申请 storage 权限。',
          'Transfer Any File — an offline Chrome file format converter. Files never leave the machine, no telemetry, and the storage permission is all it asks for.',
        )}
      </p>
      <p class="fine">
        <a href="${up}">${bi('产品说明', 'Product page')}</a>
        <a href="${up}convert/">${bi(CONVERT_CRUMB.zh, CONVERT_CRUMB.en)}</a>
        <a href="${up}privacy.html">${bi('隐私政策', 'Privacy policy')}</a>
        <a href="${SITE.repo}" rel="noopener" target="_blank">${bi('源码 (MIT)', 'Source (MIT)')}</a>
      </p>
    </div>
  </footer>`;
  return { head, foot };
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

/**
 * @param {object} pair validated entry
 * @param {string[]} chain route chain from the baseline
 * @returns {string} full HTML document
 */
function renderPage(pair, chain) {
  const { head, foot } = chrome(1);
  const url = `${SITE.origin}/convert/${pair.slug}.html`;
  const hubSlug = HUB_SLUG[pair.from];
  const label = code => FORMAT_LABEL[code];
  const steps = chain
    .map((code, i) => {
      const chip = `<span class="chip">${bi(label(code).zh, label(code).en)}</span>`;
      return i === 0 ? chip : `<span class="arrow" aria-hidden="true">→</span>${chip}`;
    })
    .join('\n          ');
  const hops = chain.length - 1;

  const related = PAIRS.filter(
    other => other.slug !== pair.slug && (other.from === pair.from || other.to === pair.to || other.from === pair.to),
  )
    .slice(0, 6)
    .map(
      other =>
        `        <li><a href="${other.slug}.html">${bi(
          `${FORMAT_LABEL[other.from].zh} → ${FORMAT_LABEL[other.to].zh}`,
          `${FORMAT_LABEL[other.from].en} → ${FORMAT_LABEL[other.to].en}`,
        )}</a></li>`,
    )
    .join('\n');

  // A pair with no same-source / same-target sibling would render an empty section under a
  // `相关转换` heading — which reads to a person as a page that failed to finish loading, and to a
  // crawler as thin content. The heading therefore goes with the list instead of being kept empty.
  const relatedSection = related
    ? `          <section class="related reveal">
${sectionHeading('相关转换', 'Related conversions')}
            <ul class="related-list">
${related}
            </ul>
            <p class="fine">${bi('完整一览见', 'The full set is on the')} <a href="../convert/">${bi('转换一览页', 'conversions index')}</a>${bi('。', '.')}</p>
          </section>
`
    : '';

  const faq = pair.faq
    .map(
      item => `        <details>
          <summary>${bi(item.q.zh, item.q.en)}</summary>
          <p>${bi(item.a.zh, item.a.en)}</p>
        </details>`,
    )
    .join('\n');

  const shot = SCREENSHOTS[pair.shot];
  const shotUrl = `${SITE.origin}/assets/screenshots/${shot.file}`;
  // `datePublished` is a per-page fact: a page written in a later revision cannot publish the date the
  // first one entered the repository, so `pairs.mjs` declares `published` on every entry that is not part
  // of that first batch. The default is the cluster's own date, which is the only one that holds for the
  // pages written down before it.
  const datePublished = pair.published ?? PAGES_PUBLISHED;
  // A page whose `dateModified` precedes its `datePublished` is a signal search engines flag as
  // inconsistent, so the later of the two is the honest one to publish.
  const dateModified = PAGES_UPDATED > datePublished ? PAGES_UPDATED : datePublished;

  /**
   * The page's structured data in one language.
   *
   * A mixed `name` is what gets quoted back: it lands in a rich result, or in an AI answer, as the
   * question itself. So each language's graph states only that language, `#fat-ld` ships the Chinese one
   * (the document's own `lang`), and the script under it swaps in this array for English readers.
   * @param {'zh' | 'en'} lang
   * @returns {object[]} the `@graph`
   */
  const graph = lang => {
    const inLanguage = lang === 'zh' ? 'zh-CN' : 'en';
    return [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: pair.title[lang],
        inLanguage,
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: APP_NODE,
        description: pair.desc[lang],
        image: shotUrl,
      },
      {
        // `og:type` already says article, so the graph has to carry the matching node or the two claims
        // disagree. `datePublished` is when this content was written down, not when it went live.
        '@type': 'Article',
        '@id': `${url}#article`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${url}#webpage` },
        headline: pair.title[lang],
        description: pair.desc[lang],
        image: shotUrl,
        datePublished,
        dateModified,
        inLanguage,
        author: { '@type': 'Person', name: 'Better', url: SITE.author },
        publisher: { '@type': 'Organization', name: 'Transfer Any File', url: `${SITE.origin}/` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Transfer Any File', item: `${SITE.origin}/` },
          { '@type': 'ListItem', position: 2, name: CONVERT_CRUMB[lang], item: `${SITE.origin}/convert/` },
          {
            '@type': 'ListItem',
            position: 3,
            name: hubCrumb(pair.from, lang),
            item: `${SITE.origin}/convert/${hubSlug}/`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: `${label(pair.from)[lang]} → ${label(pair.to)[lang]}`,
            item: url,
          },
        ],
      },
      {
        // The one image on the page, described for image search rather than left to the filename.
        '@type': 'ImageObject',
        '@id': `${shotUrl}#image`,
        url: shotUrl,
        contentUrl: shotUrl,
        width: shot.w,
        height: shot.h,
        name: shot.alt[lang],
        caption: shot.caption[lang],
        inLanguage,
      },
      {
        '@type': 'FAQPage',
        mainEntity: pair.faq.map(item => ({
          '@type': 'Question',
          name: item.q[lang],
          acceptedAnswer: { '@type': 'Answer', text: item.a[lang] },
        })),
      },
    ];
  };

  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph('zh') }).replace(/</g, '\\u003c');

  const bilingualTitle = `${pair.title.zh} | ${pair.title.en}`;

  return `<!doctype html>
<!-- Generated by scripts/render-site-pages.mjs from scripts/conversion-pages/pairs.mjs.
     Edit the data module and re-run the script; a hand edit here is overwritten by the next build,
     and \`pnpm pages:check\` fails on the drift either way. -->
<html lang="zh-CN" id="top">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(bilingualTitle)}</title>
    <meta name="description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta name="author" content="Better" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/png" sizes="64x64" href="../assets/icon-mark.png" />
    <link rel="apple-touch-icon" sizes="512x512" href="../assets/icon.png" />
    <meta name="theme-color" content="${SITE.themeColor}" />
    <meta name="color-scheme" content="light" />
    <link rel="stylesheet" href="../assets/content.css" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Transfer Any File" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(bilingualTitle)}" />
    <meta property="og:description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta property="og:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="${esc(SOCIAL_IMAGE_ALT)}" />
    <meta property="article:published_time" content="${datePublished}" />
    <meta property="article:modified_time" content="${dateModified}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(bilingualTitle)}" />
    <meta name="twitter:description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta name="twitter:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta name="twitter:image:alt" content="${esc(SOCIAL_IMAGE_ALT)}" />
    <script type="application/ld+json" id="fat-ld">
      ${jsonLd}
    </script>
    ${headScripts({ zh: { t: pair.title.zh, d: pair.desc.zh }, en: { t: pair.title.en, d: pair.desc.en } })}
    ${ldSwapScript({ '@context': 'https://schema.org', '@graph': graph('en') })}
  </head>
  <body>
    ${head}
    <main class="page">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../">${bi('产品说明', 'Product')}</a>
          <span aria-hidden="true">/</span>
          <a href="../convert/">${bi(CONVERT_CRUMB.zh, CONVERT_CRUMB.en)}</a>
          <span aria-hidden="true">/</span>
          <a href="${hubSlug}/">${bi(hubCrumb(pair.from, 'zh'), hubCrumb(pair.from, 'en'))}</a>
          <span aria-hidden="true">/</span>
          <span>${bi(`${label(pair.from).zh} → ${label(pair.to).zh}`, `${label(pair.from).en} → ${label(pair.to).en}`)}</span>
        </nav>
        <article>
          <p class="eyebrow">${bi('离线 · 无上传 · 浏览器本地完成', 'Offline · no uploads · runs in the browser')}</p>
          <h1>${bi(pair.title.zh, pair.title.en)}</h1>
          <p class="lede">${bi(pair.lede.zh, pair.lede.en)}</p>
${shotFigure(shot, 1)}
          <section class="route-card reveal" aria-labelledby="route-label">
            <p class="route-label" id="route-label">${bi('这条链路怎么走', 'How the route runs')}</p>
            <p class="route-steps">
          ${steps}
            </p>
            <p class="route-note">
              ${bi(
                `共 ${hops} 步，由扩展的路径搜索自动选出，中间产物不落盘。`,
                `${hops} step${hops === 1 ? '' : 's'}, chosen by the extension's own path search; intermediate results never touch the disk.`,
              )}
            </p>
          </section>
          <section id="keeps" class="reveal">
${sectionHeading('会保留什么', 'What carries over')}
            <ul>
${bullets(pair.keeps)}
            </ul>
          </section>
          <section id="limits" class="reveal">
${sectionHeading('如实说明的限制', 'What it does not do')}
            <ul class="limits">
${bullets(pair.limits)}
            </ul>
          </section>
          <section id="notes" class="reveal">
${sectionHeading('实操提示', 'Working with it')}
            <ul>
${bullets(pair.notes)}
            </ul>
          </section>
          <section id="faq" class="reveal">
${sectionHeading('常见问题', 'Questions people actually ask')}
${faq}
          </section>
          <section class="cta reveal">
            <p>
              ${bi(
                '不需要账号，也不需要联网：装好扩展后点图标，在新标签页里打开工作台，文件从磁盘直接选。',
                'No account and no network: install the extension, click its icon, and the workbench opens in a new tab reading straight off your disk.',
              )}
            </p>
            <p class="cta-links">
              <a class="btn" href="${SITE.store}" rel="noopener" target="_blank">${bi('从 Chrome 应用商店安装', 'Install from the Chrome Web Store')}</a>
              <a class="btn ghost" href="../#install">${bi('安装步骤', 'Install steps')}</a>
              <a class="btn ghost" href="${SITE.repo}">${bi('GitHub 源码', 'Source on GitHub')}</a>
            </p>
          </section>
${relatedSection}        </article>
      </div>
    </main>
    ${foot}
    ${revealScript()}
  </body>
</html>
`;
}

/**
 * One source-format hub: every open target that source has, each with the route it walks and a fact the
 * converter itself makes true.
 *
 * This is the layer the cluster was missing: 116 combinations are selectable, 43 have a page, and the
 * remaining 73 used to be a digit in the matrix with nowhere to go. A hub holds those 73 anchors, and for
 * the 43 that do have a page it reuses that page's `desc` rather than writing a second, differently-worded
 * answer to the same question.
 *
 * The blocked targets are listed separately and only when they exist: an image source has four, a PDF has
 * three, and every other source has none — in which case the section is absent rather than empty.
 *
 * @param {object} hub a validated `hubs.mjs` entry
 * @returns {string} full HTML document
 */
function renderHub(hub) {
  const { head, foot } = chrome(2);
  const url = `${SITE.origin}/convert/${hub.slug}/`;
  const label = code => FORMAT_LABEL[code];
  const routes = hubRoutes(hub.from);
  const blocked = MATRIX_COLS.filter(to => to !== hub.from && blockReason(hub.from, to));
  const shot = SCREENSHOTS[hub.shot];
  const shotUrl = `${SITE.origin}/assets/screenshots/${shot.file}`;

  const routeItems = routes
    .map(route => {
      const pair = route.pairSlug ? PAIR_BY_SLUG.get(route.pairSlug) : null;
      const desc = pair ? pair.desc : hub.targets[route.to];
      const chips = route.chain
        .map((code, i) => {
          const chip = `<span class="chip">${bi(label(code).zh, label(code).en)}</span>`;
          return i === 0 ? chip : `<span class="arrow" aria-hidden="true">→</span>${chip}`;
        })
        .join('\n              ');
      const steps = bi(`${route.steps} 步`, `${route.steps} step${route.steps === 1 ? '' : 's'}`);
      return `            <li class="hub-route"${pair ? '' : ` id="to-${route.to}"`}>
              <p class="hub-route-head">
                <span class="hub-route-target">${bi(label(route.to).zh, label(route.to).en)}</span>
                <span class="fine">${steps}</span>
              </p>
              <p class="route-steps">
              ${chips}
              </p>
              <p>${bi(desc.zh, desc.en)}</p>
              ${pair ? `<p class="fine"><a href="../${pair.slug}.html">${bi('有专页 →', 'Full page →')}</a></p>` : ''}
            </li>`;
    })
    .join('\n');

  const blockedSection =
    blocked.length === 0
      ? ''
      : `          <section id="blocked" class="reveal">
${sectionHeading('界面上置灰的目标', 'Targets the picker greys out')}
            <p>${bi(
              '下面这些目标在路径图上可达，但语义上无效，工作台会把它们置灰并给出原因，而不是让你点下去得到一个空文件。',
              'These targets are reachable in the graph but semantically invalid, so the workbench greys them out with the same reason instead of letting you click through to an empty file.',
            )}</p>
            <ul class="limits">
${blocked
  .map(
    to =>
      `              <li>${bi(
        `${label(to).zh}：${BLOCK_COPY[blockReason(hub.from, to)].zh}`,
        `${label(to).en}: ${BLOCK_COPY[blockReason(hub.from, to)].en}`,
      )}</li>`,
  )
  .join('\n')}
            </ul>
          </section>
`;

  const faq = hub.faq
    .map(
      item => `        <details>
          <summary>${bi(item.q.zh, item.q.en)}</summary>
          <p>${bi(item.a.zh, item.a.en)}</p>
        </details>`,
    )
    .join('\n');

  const otherHubs = HUBS.filter(other => other.slug !== hub.slug)
    .map(
      other =>
        `              <li><a href="../${other.slug}/">${bi(
          hubCrumb(other.from, 'zh'),
          hubCrumb(other.from, 'en'),
        )}</a></li>`,
    )
    .join('\n');

  /**
   * One language's graph. The `ItemList` follows the visible route order and points each item at the
   * same destination its row does — the pair page when one exists, the hub anchor otherwise.
   * @param {'zh' | 'en'} lang
   * @returns {object[]} the `@graph`
   */
  const graph = lang => {
    const inLanguage = lang === 'zh' ? 'zh-CN' : 'en';
    return [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: hub.title[lang],
        inLanguage,
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: APP_NODE,
        description: hub.desc[lang],
        image: shotUrl,
        mainEntity: { '@id': `${url}#routes` },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#routes`,
        name:
          lang === 'zh' ? `${label(hub.from).zh} 的全部可用目标` : `Every available target for ${label(hub.from).en}`,
        numberOfItems: routes.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: routes.map((route, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${label(hub.from)[lang]} → ${label(route.to)[lang]}`,
          url: route.pairSlug ? `${SITE.origin}/convert/${route.pairSlug}.html` : `${url}#to-${route.to}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Transfer Any File', item: `${SITE.origin}/` },
          { '@type': 'ListItem', position: 2, name: CONVERT_CRUMB[lang], item: `${SITE.origin}/convert/` },
          { '@type': 'ListItem', position: 3, name: hubCrumb(hub.from, lang), item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: hub.faq.map(item => ({
          '@type': 'Question',
          name: item.q[lang],
          acceptedAnswer: { '@type': 'Answer', text: item.a[lang] },
        })),
      },
    ];
  };

  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph('zh') }).replace(/</g, '\\u003c');
  const bilingualTitle = `${hub.title.zh} | ${hub.title.en}`;

  return `<!doctype html>
<!-- Generated by scripts/render-site-pages.mjs from scripts/conversion-pages/hubs.mjs.
     Edit the data module and re-run the script; \`pnpm pages:check\` fails on any drift. -->
<html lang="zh-CN" id="top">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(bilingualTitle)}</title>
    <meta name="description" content="${esc(`${hub.desc.zh} | ${hub.desc.en}`)}" />
    <meta name="author" content="Better" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/png" sizes="64x64" href="../../assets/icon-mark.png" />
    <link rel="apple-touch-icon" sizes="512x512" href="../../assets/icon.png" />
    <meta name="theme-color" content="${SITE.themeColor}" />
    <meta name="color-scheme" content="light" />
    <link rel="stylesheet" href="../../assets/content.css" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Transfer Any File" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(bilingualTitle)}" />
    <meta property="og:description" content="${esc(`${hub.desc.zh} | ${hub.desc.en}`)}" />
    <meta property="og:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="${esc(SOCIAL_IMAGE_ALT)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(bilingualTitle)}" />
    <meta name="twitter:description" content="${esc(`${hub.desc.zh} | ${hub.desc.en}`)}" />
    <meta name="twitter:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta name="twitter:image:alt" content="${esc(SOCIAL_IMAGE_ALT)}" />
    <script type="application/ld+json" id="fat-ld">
      ${jsonLd}
    </script>
    ${headScripts({ zh: { t: hub.title.zh, d: hub.desc.zh }, en: { t: hub.title.en, d: hub.desc.en } })}
    ${ldSwapScript({ '@context': 'https://schema.org', '@graph': graph('en') })}
  </head>
  <body>
    ${head}
    <main class="page">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../../">${bi('产品说明', 'Product')}</a>
          <span aria-hidden="true">/</span>
          <a href="../">${bi(CONVERT_CRUMB.zh, CONVERT_CRUMB.en)}</a>
          <span aria-hidden="true">/</span>
          <span>${bi(hubCrumb(hub.from, 'zh'), hubCrumb(hub.from, 'en'))}</span>
        </nav>
        <article>
          <p class="eyebrow">${bi('离线 · 无上传 · 浏览器本地完成', 'Offline · no uploads · runs in the browser')}</p>
          <h1>${bi(hub.title.zh, hub.title.en)}</h1>
          <p class="lede">${bi(hub.lede.zh, hub.lede.en)}</p>
${shotFigure(shot, 2)}
          <section id="routes" class="reveal">
${sectionHeading('全部可用目标', 'Every available target')}
            <ul class="hub-routes">
${routeItems}
            </ul>
          </section>
${blockedSection}          <section id="limits" class="reveal">
${sectionHeading('这个来源格式的共同限制', 'What holds for every target from this source')}
            <ul class="limits">
${bullets(hub.limits)}
            </ul>
          </section>
          <section id="faq" class="reveal">
${sectionHeading('常见问题', 'Questions people actually ask')}
${faq}
          </section>
          <section class="cta reveal">
            <p>
              ${bi(
                '不需要账号，也不需要联网：装好扩展后点图标，在新标签页里打开工作台，文件从磁盘直接选。',
                'No account and no network: install the extension, click its icon, and the workbench opens in a new tab reading straight off your disk.',
              )}
            </p>
            <p class="cta-links">
              <a class="btn" href="${SITE.store}" rel="noopener" target="_blank">${bi('从 Chrome 应用商店安装', 'Install from the Chrome Web Store')}</a>
              <a class="btn ghost" href="../../#install">${bi('安装步骤', 'Install steps')}</a>
              <a class="btn ghost" href="${SITE.repo}">${bi('GitHub 源码', 'Source on GitHub')}</a>
            </p>
          </section>
          <section class="related reveal">
${sectionHeading('其他来源格式', 'Other source formats')}
            <ul class="hub-links">
${otherHubs}
            </ul>
            <p class="fine">${bi('完整一览见', 'The full set is on the')} <a href="../">${bi('转换一览页', 'conversions index')}</a>${bi('。', '.')}</p>
          </section>
          <p class="fine">${bi(`最后更新 ${PAGES_UPDATED}`, `Last updated: ${PAGES_UPDATED}`)}</p>
        </article>
      </div>
    </main>
    ${foot}
    ${revealScript()}
  </body>
</html>
`;
}

/**
 * The index page for the cluster: a crawler and a reader both land here from the product page, and it
 * is the only page that states the graph's own numbers.
 * @returns {string} full HTML document
 */
function renderIndex() {
  const { head, foot } = chrome(1);
  const url = `${SITE.origin}/convert/`;
  const groups = [
    {
      zh: '文档',
      en: 'Documents',
      note: {
        zh: 'Markdown、Word、HTML、PDF 之间互转；文档类产物的差别写在各自页面上，尤其 PDF 是图像还是可编辑文档。',
        en: 'Markdown, Word, HTML and PDF. The artifacts differ more than the format names suggest, which is why each page says whether it yields an image or something editable.',
      },
    },
    {
      zh: '数据',
      en: 'Data',
      note: {
        zh: 'Excel、CSV、JSON 三方互转，按值而非显示文本序列化；PDF 与图片不提供到表格结构的路径，界面上会置灰并说明原因。',
        en: 'Excel, CSV and JSON, serialised from stored values rather than display text. PDF and images have no route into a table structure, and the picker greys those out with a reason.',
      },
    },
    {
      zh: '图片',
      en: 'Images',
      note: {
        zh: '可写格式为 PNG / JPEG / WebP 三种（浏览器不提供 BMP、GIF、SVG 编码器），这三种只能作为输入。',
        en: 'PNG, JPEG and WebP are the writable image formats — a browser ships no encoder for BMP, GIF or SVG, so those three are input-only.',
      },
    },
  ];
  /**
   * Which of the three sections a pair belongs to, decided by the formats themselves.
   *
   * Matching on the slug instead (an earlier revision did) silently put a future `png-to-html` in
   * Images and an `image-to-image` pair in Documents, because the bucket was a property of the file
   * name rather than of the route. A route touching an image is shown under Images; a route entirely
   * inside the spreadsheet-and-data family under Data; everything else under Documents.
   */
  const IMAGE_FAMILY = new Set(['png', 'jpeg', 'jpg', 'webp', 'bmp', 'gif', 'svg']);
  const DATA_FAMILY = new Set(['csv', 'xlsx', 'json']);
  const bucketOf = pair =>
    IMAGE_FAMILY.has(pair.from) || IMAGE_FAMILY.has(pair.to)
      ? 2
      : DATA_FAMILY.has(pair.from) && DATA_FAMILY.has(pair.to)
        ? 1
        : 0;
  const lists = groups
    .map((group, index) => {
      const items = PAIRS.filter(pair => bucketOf(pair) === index)
        .map(
          pair => `            <li>
              <a href="${pair.slug}.html">${bi(
                `${FORMAT_LABEL[pair.from].zh} → ${FORMAT_LABEL[pair.to].zh}`,
                `${FORMAT_LABEL[pair.from].en} → ${FORMAT_LABEL[pair.to].en}`,
              )}</a>
              <span class="fine">${bi(pair.desc.zh, pair.desc.en)}</span>
            </li>`,
        )
        .join('\n');
      return `        <section class="reveal">
          <h2>${bi(group.zh, group.en)}</h2>
          <p>${bi(group.note.zh, group.note.en)}</p>
          <ul class="index-list">
${items}
          </ul>
        </section>`;
    })
    .join('\n');

  const meta = {
    zh: {
      t: '转换一览｜按来源格式浏览 14 种格式的转换',
      d: '文件格式任意转换助手的转换一览：14 种格式、48 条注册路径、界面提供 116 个可选组合，可按来源格式浏览每条链路的保留项与限制。',
    },
    en: {
      t: 'File conversions by source: 14 formats',
      d: 'Conversions in this offline Chrome extension: 14 formats, 48 registered routes and 116 selectable combinations. Browse by source format.',
    },
  };

  /**
   * The 14 source cards at the top of the index. Each one is a route into the hub layer; its target list
   * links the same destinations the matrix cell does (pair page when one exists, hub anchor otherwise),
   * so a reader can enter the cluster from either direction.
   */
  const hubCards = HUBS.map(hub => {
    const routes = hubRoutes(hub.from);
    const targets = routes
      .map(route => {
        const href = route.pairSlug ? `${route.pairSlug}.html` : `${hub.slug}/#to-${route.to}`;
        return `<a href="${href}">${bi(FORMAT_LABEL[route.to].zh, FORMAT_LABEL[route.to].en)}</a>`;
      })
      .join(' <span aria-hidden="true">·</span> ');
    return `            <li class="hub-card">
              <a class="hub-card-title" href="${hub.slug}/">${bi(
                hubCrumb(hub.from, 'zh'),
                hubCrumb(hub.from, 'en'),
              )}</a>
              <p class="fine">${bi(hub.desc.zh, hub.desc.en)}</p>
              <p class="hub-card-targets">${targets}</p>
            </li>`;
  }).join('\n');

  const shot = SCREENSHOTS['workbench-empty'];
  const shotUrl = `${SITE.origin}/assets/screenshots/${shot.file}`;

  /**
   * One language's structured data, for the same reason the pair pages have one: a mixed `name` is the
   * string a crawler quotes back. `hasPart` follows the page's language too, so the list of conversions
   * an AI answer reads out is not half in another language.
   * @param {'zh' | 'en'} lang
   * @returns {object[]} the `@graph`
   */
  const graph = lang => {
    const inLanguage = lang === 'zh' ? 'zh-CN' : 'en';
    return [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: lang === 'zh' ? '转换一览' : 'Conversion index',
        inLanguage,
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: APP_NODE,
        description: meta[lang].d,
        image: shotUrl,
        hasPart: PAIRS.map(pair => ({ '@type': 'WebPage', name: pair.title[lang], url: `${url}${pair.slug}.html` })),
        mainEntity: { '@id': `${url}#sources` },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#sources`,
        name: lang === 'zh' ? '按来源格式浏览' : 'Browse by source format',
        numberOfItems: HUBS.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: HUBS.map((hub, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: hubCrumb(hub.from, lang),
          url: `${url}${hub.slug}/`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Transfer Any File', item: `${SITE.origin}/` },
          { '@type': 'ListItem', position: 2, name: CONVERT_CRUMB[lang], item: url },
        ],
      },
      {
        '@type': 'ImageObject',
        '@id': `${shotUrl}#image`,
        url: shotUrl,
        contentUrl: shotUrl,
        width: shot.w,
        height: shot.h,
        name: shot.alt[lang],
        caption: shot.caption[lang],
        inLanguage,
      },
    ];
  };

  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph('zh') }).replace(/</g, '\\u003c');

  return `<!doctype html>
<!-- Generated by scripts/render-site-pages.mjs. Edit scripts/conversion-pages/pairs.mjs instead. -->
<html lang="zh-CN" id="top">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(`${meta.zh.t} | ${meta.en.t}`)}</title>
    <meta
      name="description"
      content="${esc(`${meta.zh.d} | ${meta.en.d}`)}"
    />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/png" sizes="64x64" href="../assets/icon-mark.png" />
    <link rel="apple-touch-icon" sizes="512x512" href="../assets/icon.png" />
    <meta name="theme-color" content="${SITE.themeColor}" />
    <meta name="color-scheme" content="light" />
    <link rel="stylesheet" href="../assets/content.css" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Transfer Any File" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(`${meta.zh.t} | ${meta.en.t}`)}" />
    <meta property="og:description" content="${esc(`${meta.zh.d} | ${meta.en.d}`)}" />
    <meta property="og:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="${esc(SOCIAL_IMAGE_ALT)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(`${meta.zh.t} | ${meta.en.t}`)}" />
    <meta name="twitter:description" content="${esc(`${meta.zh.d} | ${meta.en.d}`)}" />
    <meta name="twitter:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta name="twitter:image:alt" content="${esc(SOCIAL_IMAGE_ALT)}" />
    <script type="application/ld+json" id="fat-ld">
      ${jsonLd}
    </script>
    ${headScripts(meta)}
    ${ldSwapScript({ '@context': 'https://schema.org', '@graph': graph('en') })}
  </head>
  <body>
    ${head}
    <main class="page">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../">${bi('产品说明', 'Product')}</a>
          <span aria-hidden="true">/</span>
          <span>${bi(CONVERT_CRUMB.zh, CONVERT_CRUMB.en)}</span>
        </nav>
        <article>
          <p class="eyebrow">${bi('离线 · 无上传 · 浏览器本地完成', 'Offline · no uploads · runs in the browser')}</p>
          <h1>${bi('转换一览', 'Conversion index')}</h1>
          <p class="lede">
            ${bi(
              '这些页面不是「我们支持 14 种格式」的另一种说法。格式数只是图的顶点数：14 种格式、48 条注册路径，图上任意一种源格式都能走到全部 11 种可写格式，共 143 个组合，其中界面对用户实际提供 116 个。剩下的 27 个不是没做，而是语义上无效，所以置灰并说明原因——每个配对页面里的「不做什么」写的就是这一类事。',
              'These pages are not another way of saying “14 formats supported”. The format count is just the number of vertices: 14 formats and 48 registered direct routes, and every source format reaches all 11 writable ones, which makes 143 combinations reachable and 116 selectable. The other 27 are not missing work — they are semantically invalid, so the picker greys them out and says why. Each pair page spells that class of limits out in its own “what it does not do”.',
            )}
          </p>
${shotFigure(shot, 1)}
          <section id="sources" class="reveal">
${sectionHeading('按来源格式浏览', 'Browse by source format')}
            <p>
              ${bi(
                '每个来源一张页：它的每个开放目标、完整链路，以及那条路保留什么、丢掉什么。矩阵里没有专页的格子，落点也在这些页上。',
                'One page per source format: every open target, the full route it walks, and what that route keeps or drops. The matrix cells without a page of their own land on these pages too.',
              )}
            </p>
            <ul class="hub-grid">
${hubCards}
            </ul>
          </section>
${matrixSection()}
${lists}
          <p class="fine reveal">
            ${bi(
              '这里列出的是常被搜索的配对，不是全部 116 个；工作台里的目标格式下拉按批次实时给出可用项。',
              'This index lists the pairs people search for, not all 116; the workbench shows what is available for the exact batch you dropped in.',
            )}
          </p>
          <p class="cta-links reveal">
            <a class="btn" href="${SITE.store}" rel="noopener" target="_blank">${bi('从 Chrome 应用商店安装', 'Install from the Chrome Web Store')}</a>
            <a class="btn ghost" href="../#install">${bi('安装步骤', 'Install steps')}</a>
            <a class="btn ghost" href="${SITE.repo}">${bi('GitHub 源码', 'Source on GitHub')}</a>
          </p>
        </article>
      </div>
    </main>
    ${foot}
    ${matrixScript()}
    ${revealScript()}
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

/**
 * The pages under `docs/` that are written by hand, with the date their content last changed.
 *
 * `lastmod` cannot be read from the filesystem: a git checkout stamps every file with the checkout
 * time, so a date derived that way would claim the whole site was rewritten today and would differ
 * between a laptop and CI — which `--check` would then fail on. Bump the date when the page changes,
 * and leave it alone otherwise.
 *
 * Reading it from history (`git log -1 --format=%cd -- docs/index.html`) is the obvious second attempt,
 * and it fails because the answer depends on how the checker was cloned rather than on the page. Four of
 * the five workflows check out at the default `fetch-depth: 1` — including `ci.yml`'s lint job, which is
 * the one that runs `pages:check`, and `static.yml`, which is the one that deploys the site. A shallow
 * clone has no commit for the file, so the date resolves to the tip commit and the whole site looks
 * rewritten today. Only `release-prepare.yml` asks for `fetch-depth: 0`, and it does that to read commit
 * messages for the changelog — so a history-derived `lastmod` would silently depend on a setting that has
 * nothing to do with page content.
 *
 * So the "did you remember to bump it" half of this stays with the person editing the page:
 * `validateStaticDates()` compares a date against the page, never against the change.
 *
 * Each entry also names the page it describes and the patterns that spell the same date *inside* that
 * page, because those are the ones a crawler sees first: JSON-LD `dateModified`, the `article:modified_time`
 * meta, and the visible 「本页最后更新」 line. `validateStaticDates()` compares them, so a page whose
 * declared date has fallen behind its own content — or the other way round — now stops the render
 * instead of shipping two answers to "when was this written". A pattern that matches nothing is a
 * failure too: a silently dead comparison is how this check would have stayed unwritten.
 */
const STATIC_PAGES = {
  home: {
    path: '/',
    updated: '2026-10-20',
    changefreq: 'monthly',
    priority: '1.0',
    file: 'docs/index.html',
    dateClaims: [
      /"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/g,
      /最后更新[：:]?\s*(\d{4}-\d{2}-\d{2})/g,
      // Case-insensitive: the page says 「Last updated」 in the footer and "page last updated" inside the
      // changelog line, and a pattern that only reads one of the two leaves that claim unchecked.
      /Last updated:?\s*(\d{4}-\d{2}-\d{2})/gi,
    ],
  },
  blog: {
    path: '/blog/',
    updated: '2026-10-17',
    changefreq: 'monthly',
    priority: '0.8',
    file: 'docs/blog/index.html',
    dateClaims: [
      /"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/g,
      /og:article:modified_time[\s\S]{0,60}?content="(\d{4}-\d{2}-\d{2})"/g,
    ],
  },
  privacy: {
    path: '/privacy.html',
    updated: '2026-10-19',
    changefreq: 'yearly',
    priority: '0.6',
    file: 'docs/privacy.html',
    dateClaims: [/最后更新[：:]?\s*(\d{4}-\d{2}-\d{2})/g, /Last updated:\s*(\d{4}-\d{2}-\d{2})/g],
  },
  // The date claims are read out of `tools/file-diff.html` rather than out of the copy, because the two are
  // byte-identical and `--check` already enforces that — pointing here is what lets a tree without
  // `docs/diff/` render at all, instead of deadlocking on a file only this script creates.
  diff: {
    path: '/diff/',
    updated: '2026-10-20',
    changefreq: 'monthly',
    priority: '0.7',
    file: 'tools/file-diff.html',
    dateClaims: [
      /"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/g,
      /最后更新[：:]?\s*(\d{4}-\d{2}-\d{2})/g,
      /Last updated:\s*(\d{4}-\d{2}-\d{2})/gi,
    ],
  },
};

/**
 * Compare every in-page "last updated" claim of a hand-written page with its sitemap `lastmod`.
 */
function validateStaticDates() {
  for (const [key, entry] of Object.entries(STATIC_PAGES)) {
    const source = fs.existsSync(path.join(ROOT, entry.file))
      ? fs.readFileSync(path.join(ROOT, entry.file), 'utf8')
      : null;
    if (source === null) {
      fail(`${entry.file} is missing, so STATIC_PAGES.${key}.updated (${entry.updated}) cannot be cross-checked`);
      continue;
    }
    // Deduplicated by position: 「本页最后更新 X」 satisfies both the `dateModified`-style and the
    // bare-label pattern at one place in the file, and counting the same sentence twice would let a
    // page pass with a single claim where two were expected.
    const seen = new Set();
    let claims = 0;
    for (const pattern of entry.dateClaims) {
      for (const match of source.matchAll(pattern)) {
        if (seen.has(match.index)) continue;
        seen.add(match.index);
        claims++;
        if (match[1] !== entry.updated) {
          fail(
            `${entry.file} states it was updated ${match[1]}, but sitemap ${key} says ${entry.updated} — ` +
              'both are the same claim; change one, change the other',
          );
        }
      }
    }
    if (claims === 0) {
      fail(`${entry.file} carries no date for any pattern of STATIC_PAGES.${key} — the check has gone blind`);
    }
  }
}

/**
 * Check the site chrome that `tools/file-diff.html` carries for itself.
 *
 * The copy is byte-for-byte identical to the source, so every statement here is also a statement about a
 * public URL — and none of it is covered by the two offline guards, which look for network shapes, not for
 * a page that points its own canonical somewhere else. Each check is a failure mode the byte copy cannot
 * catch on its own: an absolute URL written by hand and left behind when the repo moved, a nav label that
 * exists in one language only, an entrance state whose `.js` gate went missing (which would hand every
 * crawler that does not run the script an invisible page).
 */
function validateDiffPage() {
  const source = fs.existsSync(DIFF_SRC) ? fs.readFileSync(DIFF_SRC, 'utf8') : null;
  if (source === null) {
    fail(`${DIFF_SRC} is missing, so the site page ${STATIC_PAGES.diff.path} cannot be produced`);
    return;
  }

  /**
   * Find exactly one capture of `pattern` and return it, failing on zero or on several.
   *
   * @param {RegExp} pattern
   * @param {string} what
   * @returns {string | null}
   */
  const exactlyOne = (pattern, what) => {
    const hits = [...source.matchAll(pattern)];
    if (hits.length !== 1) {
      fail(
        `tools/file-diff.html carries ${hits.length} ${what}, expected exactly 1 — ` +
          'a page may not answer that question twice, and zero means the published copy ships without it',
      );
      return null;
    }
    return hits[0][1];
  };

  const expected = `${SITE.origin}/diff/`;
  const canonical = exactlyOne(/rel="canonical"\s+href="([^"]+)"/g, 'canonical link');
  if (canonical !== null && canonical !== expected) {
    fail(`tools/file-diff.html canonicalises to ${canonical}, but this site serves the page at ${expected}`);
  }
  const ogUrl = exactlyOne(/property="og:url"\s+content="([^"]+)"/g, 'og:url');
  if (ogUrl !== null && ogUrl !== expected) {
    fail(`tools/file-diff.html shares ${ogUrl}, but canonicalises to ${expected} — those are one claim`);
  }
  // The prose block carries an in-page anchor so the site can point readers at the explanation instead
  // of the tool. A duplicate id would send `#about` to whichever copy the browser met last.
  exactlyOne(/(id="about")/g, 'about anchor');
  if (!source.includes(`"@id": "${expected}"`)) {
    fail(`tools/file-diff.html has no JSON-LD node with @id ${expected}, so the graph describes another URL`);
  }
  // The short form (bare item ID under `/detail/`) is the convention inside this repository; the slug form
  // belongs to the sibling repos' cross-link cards. A paste of the long form here would read fine and
  // break that convention on a public page. See `.github/CHROMEWEBSTORE.md` → 现网状态.
  const store = exactlyOne(/class="install"\s+href="([^"]+)"/g, 'store install link');
  if (store !== null && store !== SITE.store) {
    fail(`tools/file-diff.html points its install button at ${store}, but SITE.store is ${SITE.store}`);
  }

  // Every string the site chrome adds goes through this page's own dictionary, in both languages, and is
  // actually referenced from the markup. Half a key would render an empty `<a>` on the published page.
  for (const key of [
    'sitebarHome',
    'sitebarConvert',
    'sitebarCurrent',
    'sitebarInstall',
    'sitebarAria',
    'footUpdated',
  ]) {
    // `s` so a Prettier re-flow of a long dictionary entry cannot turn this check into a false red:
    // the pair may wrap between the two values, and a dotless pattern would report "no entry".
    const pair = new RegExp(`${key}:\\s*\\[\\s*(['"])(.*?)\\1,\\s*(['"])(.*?)\\3`, 's').exec(source);
    if (!pair) {
      fail(`tools/file-diff.html has no DICT.${key} written as ['…', '…'] — the site bar would render empty`);
      continue;
    }
    if (!pair[2].trim() || !pair[4].trim()) {
      fail(`tools/file-diff.html DICT.${key} has an empty language — the site bar would render half-translated`);
      continue;
    }
    if (!source.includes(`data-i18n="${key}"`) && !source.includes(`data-i18n-aria="${key}"`)) {
      fail(`tools/file-diff.html defines DICT.${key} but no element carries it, so the string never reaches the page`);
    }
  }

  // The degradation gate. Every entrance state on this page is written under `.js`; without the class
  // being added before first paint, `opacity: 0` is the page a crawler reads.
  if (!source.includes("classList.add('js')")) {
    fail('tools/file-diff.html no longer adds the `js` class, so its gated entrance states become invisible content');
  }

  // The prose section is the page's indexable half. Both languages are in the initial HTML and the
  // `html[lang]` gate decides which one is painted, so the checks below are on the text itself: a block
  // that quietly lost a paragraph would still pass every markup-shaped check here.
  const blocks = {};
  for (const lang of ['zh', 'en']) {
    const hits = [
      ...source.matchAll(new RegExp(`<section\\b[^>]*class="about about-${lang}"[^>]*>([\\s\\S]*?)</section>`, 'g')),
    ];
    if (hits.length !== 1) {
      fail(
        `tools/file-diff.html carries ${hits.length} .about-${lang} sections, expected exactly 1 — ` +
          'the section is the page’s indexable prose, and zero would publish an empty page',
      );
      continue;
    }
    blocks[lang] = hits[0][1];
    const text = blocks[lang]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // 200 characters is under what either block carries today (roughly 400 in Chinese, 900 in English)
    // and far over a stub, so a lost paragraph fails while a Prettier re-flow does not.
    if (text.length < 200) {
      fail(`tools/file-diff.html .about-${lang} carries ${text.length} characters, expected at least 200`);
    }
    const questions = (blocks[lang].match(/<details\b[^>]*class="faq-item"/g) ?? []).length;
    if (questions !== 4) {
      fail(
        `tools/file-diff.html .about-${lang} lists ${questions} FAQ items, expected 4 — ` +
          'the structured data describes four, and a reader of either language must get the same four',
      );
    }
  }

  // `lang` is written onto `<html>` before first paint. The static attribute is the no-JavaScript
  // default and must stay Chinese; the two reveal rules are what make the section visible at all, and
  // the base rule is what keeps the inactive language from stacking underneath it.
  if (!/<html\s+lang="zh-CN"/.test(source)) {
    fail(
      'tools/file-diff.html no longer opens with <html lang="zh-CN">, so a client that does not run the script sees no prose',
    );
  }
  // Both languages share one rule on purpose: a selector-per-language pair that lost one half would
  // hide that language entirely, and the mistake reads as correct CSS in either half alone.
  const reveal = /html\[lang='zh-CN'\]\s+\.about-zh,\s*html\[lang='en'\]\s+\.about-en\s*\{([^}]*)\}/.exec(source);
  if (!reveal || !/display:\s*block/.test(reveal[1])) {
    fail(
      "tools/file-diff.html has no `html[lang='zh-CN'] .about-zh, html[lang='en'] .about-en { display: block }` rule — " +
        'the prose for at least one language can never be shown',
    );
  }
  if (!/\.about-zh,\s*\.about-en\s*\{[^}]*display:\s*none/.test(source)) {
    fail('tools/file-diff.html no longer hides the inactive language, so both prose blocks would stack on the page');
  }

  // The FAQPage is Chinese-only structured data, and every question and answer in it must appear in the
  // same words inside `.about-zh`. Markup that promises a Q&A the page does not show is exactly what
  // the search engines' FAQ guidelines prohibit, and an answer edited in one place but not the other is
  // the drift this pins.
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(source);
  if (!ld) {
    fail('tools/file-diff.html has no JSON-LD block, so its FAQ cannot be described to a crawler');
    return;
  }
  let graph;
  try {
    graph = JSON.parse(ld[1])['@graph'];
  } catch (error) {
    fail(`tools/file-diff.html JSON-LD is not valid JSON: ${error.message}`);
    return;
  }
  const faqNodes = (Array.isArray(graph) ? graph : []).filter(node => node['@type'] === 'FAQPage');
  if (faqNodes.length !== 1) {
    fail(`tools/file-diff.html describes ${faqNodes.length} FAQPage nodes, expected exactly 1`);
    return;
  }
  const faq = faqNodes[0];
  if (faq['@id'] !== `${expected}#faq`) {
    fail(
      `tools/file-diff.html FAQPage @id is ${JSON.stringify(faq['@id'])}, but the page is served at ` +
        `${expected} — the fragment has to hang off that URL`,
    );
  }
  if (faq.inLanguage !== 'zh-CN') {
    fail(
      `tools/file-diff.html FAQPage declares inLanguage ${JSON.stringify(faq.inLanguage)}, expected "zh-CN" — ` +
        'the Chinese block is the served default, and the visible English copy is not described',
    );
  }
  if (!Array.isArray(faq.mainEntity) || faq.mainEntity.length !== 4) {
    fail(`tools/file-diff.html FAQPage carries ${faq.mainEntity?.length ?? 0} questions, expected 4`);
    return;
  }
  const strip = value => String(value ?? '').replace(/\s+/g, '');
  const zhText = strip(blocks.zh);
  for (const [index, question] of faq.mainEntity.entries()) {
    const name = typeof question.name === 'string' ? question.name.trim() : '';
    const answer = typeof question.acceptedAnswer?.text === 'string' ? question.acceptedAnswer.text.trim() : '';
    if (!name || !answer) {
      fail(`tools/file-diff.html FAQPage question ${index + 1} is missing its name or its answer`);
      continue;
    }
    if (!zhText.includes(strip(name))) {
      fail(
        `tools/file-diff.html FAQPage asks “${name}”, but .about-zh never shows that question — ` +
          'structured data may not promise what the page does not say',
      );
    }
    if (!zhText.includes(strip(answer))) {
      fail(
        `tools/file-diff.html FAQPage answers “${name}” in words that .about-zh does not carry — ` +
          'the two copies have to be the same claim',
      );
    }
  }
}

/**
 * Cross-check the FAQ rail of `docs/index.html` against the question list it indexes.
 *
 * The rail is a table of contents for a list living in the same file, so every row of it is a claim the
 * document can answer by itself: the anchor must name a real category, the rows must be those categories in
 * that order, the words on a row must be the words of the heading it points at, and the number must be how
 * many questions that category actually holds. Adding a question is a one-line edit and nothing else on the
 * page would ever notice, which is exactly the drift this pins.
 */
function validateFaqRail() {
  const file = 'docs/index.html';
  const source = fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : null;
  if (source === null) {
    fail(`${file} is missing, so its FAQ rail cannot be cross-checked`);
    return;
  }

  // `<details class="faq-item">` is the only shape a question takes here, but the matcher tolerates an added
  // attribute: a count that dropped a question for having become `open`, or for carrying a `data-*`, would
  // report the rail as wrong at the moment the rail is most nearly right.
  const QUESTION = /<details\b[^>]*\bclass="[^"]*\bfaq-item\b[^"]*"/g;
  const countQuestions = text => (text.match(QUESTION) ?? []).length;
  // Both sides carry the same two `<span lang="…">` halves of one label; collapsing whitespace compares the
  // words without making the check care how Prettier chose to hang the tags.
  const label = markup => (markup ?? '').replace(/\s+/g, '');

  // A category is the stretch of document from its own heading to the next one, or to the end of the
  // section for the last.
  const headings = [...source.matchAll(/<h3\s+id="(faq-[a-z-]+)"\s+class="faq-cat"[^>]*>([\s\S]*?)<\/h3>/g)];
  if (headings.length === 0) {
    fail(`${file}: no FAQ category heading matched — the rail check has gone blind`);
    return;
  }
  // The last category needs somewhere to stop, and the bound is taken from the *first* heading rather than
  // the last: the first `</section>` after the categories begin is the one that closes their own section, so
  // the spans below tile that section and nothing else. That is what makes the total-vs-tiled comparison
  // meaningful — a question added to a later section then falls outside every span and shows up as a
  // shortfall, instead of being quietly counted into whichever category happens to be last.
  const sectionEnd = source.indexOf('</section>', headings[0].index);
  if (sectionEnd === -1) {
    fail(`${file}: no </section> after the FAQ categories begin, so the rail cannot be bounded`);
    return;
  }
  const outside = headings.filter(heading => heading.index > sectionEnd).map(heading => heading[1]);
  if (outside.length > 0) {
    fail(
      `${file}: ${outside.join(', ')} sit past the </section> that closes the FAQ, so the categories are no ` +
        'longer one contiguous block and their spans would overlap other sections',
    );
    return;
  }
  const categories = headings.map((heading, i) => {
    const from = heading.index + heading[0].length;
    const to = i + 1 < headings.length ? headings[i + 1].index : sectionEnd;
    return { id: heading[1], text: label(heading[2]), count: countQuestions(source.slice(from, to)) };
  });

  // Those spans tile the section, which is only a useful statement if they also cover the file: a question
  // left outside them — below the section, or above the first heading — would belong to no category and be
  // missing from one row, while every row still agreed with the span it was measured against.
  const tiled = categories.reduce((sum, category) => sum + category.count, 0);
  const total = countQuestions(source);
  if (total !== tiled) {
    fail(
      `${file}: ${total} questions in the file but only ${tiled} fall inside a category — ` +
        'a question outside the spans belongs to no row, so no row can count it',
    );
  }

  // The `(?:(?!<\/a>)[\s\S])*?` keeps a row inside its own anchor: a lazy `[\s\S]*?` would happily reach
  // past a row that lost its count span and read the next row's number instead.
  const rows = [
    ...source.matchAll(/<a href="#(faq-[a-z-]+)"[^>]*>((?:(?!<\/a>)[\s\S])*?)<span class="faq-toc-n">(\d+)<\/span>/g),
  ];
  if (rows.length === 0) {
    fail(`${file}: the FAQ rail carries no category row — the check has gone blind`);
    return;
  }
  if (rows.length !== categories.length) {
    fail(
      `${file}: the FAQ rail lists ${rows.length} categories, the question list has ${categories.length} ` +
        `(${categories.map(c => c.id).join(', ')}) — every heading needs one row, and one row needs one heading`,
    );
  }
  rows.forEach((row, i) => {
    const category = categories[i];
    if (!category) return;
    if (row[1] !== category.id) {
      fail(
        `${file}: FAQ rail row ${i + 1} points at #${row[1]}, but that position in the question list is ` +
          `#${category.id} — the rail has to follow the list's own order`,
      );
      return;
    }
    // The words are checked against the heading the row points at, not against a list of expected strings:
    // rename a category and the row that still says the old name fails here, which is the only place on this
    // page a stale label could be caught.
    if (label(row[2]) !== category.text) {
      fail(
        `${file}: FAQ rail row ${i + 1} reads "${label(row[2])}", but #${category.id} reads ` +
          `"${category.text}" — the row and its heading are the same name in two places`,
      );
    }
    if (Number(row[3]) !== category.count) {
      fail(
        `${file}: the rail says #${category.id} holds ${row[3]} questions, it holds ${category.count} — ` +
          'count the <details class="faq-item"> blocks under that heading',
      );
    }
  });
}

/**
 * The two hand-maintained lists of these pages: the product page's `.pairs` grid and `docs/llms.txt`.
 *
 * Neither is this script's output, so nothing else notices a page added to `PAIRS` without a link —
 * which is the drift a growth round leaves behind when both lists keep naming the routes of the round
 * before it while the sitemap already lists all of them. The sitemap is what a crawler discovers; these
 * two are what a reader and an LLM answer get, so a page missing from them is a page that exists but is
 * never recommended. A new entry therefore has to be linked in the same change.
 */
function validateLinkMirrors() {
  const expected = PAIRS.map(pair => pair.slug);

  /**
   * Compare one list of linked slugs with `PAIRS`, reporting the three ways it can be wrong separately:
   * a page that is not linked, a link to a route that has no page, and the same page linked twice.
   * @param {string} name the list, as an operator has to go fix it
   * @param {string[]} found slugs the list links, in document order
   * @param {string[]} slugs every slug in `PAIRS`
   */
  function check(name, found, slugs) {
    const listed = new Set(found);
    const missing = slugs.filter(slug => !listed.has(slug));
    const unknown = [...listed].filter(slug => !slugs.includes(slug));
    const duplicated = found.filter((slug, i) => found.indexOf(slug) !== i);
    if (missing.length > 0) {
      fail(`${name}: no link for ${missing.join(', ')} — \`pnpm pages:render\` writes a page nobody points at`);
    }
    if (unknown.length > 0) {
      fail(`${name}: links ${unknown.join(', ')}, which is not a route in scripts/conversion-pages/pairs.mjs`);
    }
    if (duplicated.length > 0) {
      fail(`${name}: links ${[...new Set(duplicated)].join(', ')} twice`);
    }
  }

  const slug = file => {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(`${file} is missing, so its list of pair pages cannot be cross-checked`);
      return null;
    }
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  };
  const LIST = /convert\/([a-z0-9-]+)\.html/g;
  const links = text => [...text.matchAll(LIST)].map(found => found[1]);

  const product = slug('docs/index.html');
  if (product !== null) {
    // Only the grid counts: the FAQ body further down also links individual pair pages, and those are
    // answers to questions rather than the cluster's index.
    const start = product.indexOf('<div class="pairs">');
    const end = start === -1 ? -1 : product.indexOf('</div>', start);
    if (end === -1) {
      fail(
        'docs/index.html: no <div class="pairs"> grid found — the mirror check has gone blind, so retarget it ' +
          'at whatever list now links the pair pages rather than deleting this assertion',
      );
    } else {
      check('docs/index.html (.pairs grid)', links(product.slice(start, end)), expected);
    }
  }

  const llmsFile = 'docs/llms.txt';
  const llms = slug(llmsFile);
  if (llms !== null) {
    check(llmsFile, links(llms), expected);
    // Hub URLs end in `/`, so the pair-page regex above cannot see them. `docs/llms.txt` is the one list
    // here that is hand-maintained; the generated index's hub cards are checked by
    // `validateHubCoverage()` against the HTML rendered in this same run, not against last run's bytes.
    const HUB_LINK = /convert\/([a-z0-9-]+)\//g;
    check(
      `${llmsFile} (source hubs)`,
      [...llms.matchAll(HUB_LINK)].map(hit => hit[1]),
      HUBS.map(hub => hub.slug),
    );
  }
}

/**
 * Cross-check the one hand-written `site-nav` against the one this script emits.
 *
 * `chrome()` puts that bar on every generated page, so adding a destination there is a one-line change
 * with nothing on the other side of it — while `docs/blog/index.html` carries its own copy of the same
 * bar. That is precisely how `/diff/` ended up on all 36 generated pages and missing from the blog page
 * for a whole round: no guard could see the two drifting apart, and `validateLinkMirrors()` only reads
 * `/convert/<slug>.html`, so a site page is outside its view by construction.
 *
 * Both bars sit one level below the site root, so their hrefs are byte-comparable, and the order is part
 * of the claim: the same four destinations in a different order is the same inconsistency, just wearing
 * a different hat.
 */
function validateSiteNav() {
  const file = 'docs/blog/index.html';

  /**
   * @param {string} name the document the block came from, as an operator has to go fix it
   * @param {string} text
   * @returns {string[] | null}
   */
  const navHrefs = (name, text) => {
    // Matched as a tag, not as the literal `<nav class="site-nav"`: Prettier breaks a hand-formatted
    // element's attributes onto their own lines, and an anchor-search for the one-line form would find
    // nothing in exactly the files this check exists to watch.
    const open = /<nav\b[^>]*class="site-nav"[^>]*>/.exec(text);
    const end = open === null ? -1 : text.indexOf('</nav>', open.index);
    if (end === -1) {
      fail(
        `${name}: no <nav class="site-nav"> found — this check has gone blind, so retarget it at whatever ` +
          'element now carries the site bar rather than deleting the assertion',
      );
      return null;
    }
    return [...text.slice(open.index, end).matchAll(/href="([^"]*)"/g)].map(hit => hit[1]);
  };

  const expected = navHrefs('chrome()', chrome(1).head);
  const source = fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : null;
  if (source === null) {
    fail(`${file} is missing, so its site-nav cannot be compared with the generated one`);
    return;
  }
  const found = navHrefs(file, source);
  if (expected === null || found === null) return;
  if (expected.join(' ') !== found.join(' ')) {
    fail(
      `${file}: its site-nav links ${found.join(', ')}, but chrome() emits ${expected.join(', ')} on all ` +
        `${PAIRS.length + 1} generated pages — one bar, two answers. A new site destination has to be added ` +
        'to the hand-written copy in the same change',
    );
  }
}

/**
 * Check the rendered cluster as one linked set, reading the bytes this run produced rather than the
 * committed files.
 *
 * The matrix's whole claim is that every open cell opens exactly one thing, and the hub layer's is that
 * the 73 cells without a page have somewhere real to land. Neither is provable from the data modules
 * alone — a template can emit the right row and the wrong href — so this walks the generated HTML:
 * one anchor per open cell, each resolving to a rendered pair page or an anchor that exists in a
 * rendered hub; every hub linked from the index; every hub route linked, and every pair page linked
 * back from its hub and to its hub.
 */
function validateHubCoverage() {
  const indexHtml = files.get(path.join(OUT_DIR, 'index.html'));
  if (!indexHtml) {
    fail('validateHubCoverage: the conversions index was not rendered, so the cluster cannot be checked');
    return;
  }

  for (const hub of HUBS) {
    if (!indexHtml.includes(`href="${hub.slug}/"`)) {
      fail(`/convert/ has no card or link for the '${hub.slug}' hub — a reader cannot enter that source`);
    }
    const html = files.get(path.join(OUT_DIR, hub.slug, 'index.html'));
    if (!html) {
      fail(`/convert/${hub.slug}/ was not rendered, so its routes have no landing page`);
      continue;
    }
    for (const route of hubRoutes(hub.from)) {
      if (route.pairSlug) {
        if (!html.includes(`href="../${route.pairSlug}.html"`)) {
          fail(`/convert/${hub.slug}/ does not link its pair page ${route.pairSlug}.html`);
        }
        if (html.includes(`id="to-${route.to}"`)) {
          fail(`/convert/${hub.slug}/ anchors '${route.to}' even though that target has a pair page`);
        }
      } else {
        const anchors = (html.match(new RegExp(`id="to-${route.to}"`, 'g')) ?? []).length;
        if (anchors !== 1) {
          fail(`/convert/${hub.slug}/ carries ${anchors} anchors for '${route.to}', expected exactly 1`);
        }
      }
    }
    for (const to of MATRIX_COLS) {
      if (to !== hub.from && blockReason(hub.from, to) && html.includes(`id="to-${to}"`)) {
        fail(`/convert/${hub.slug}/ anchors the blocked target '${to}', so the hub advertises a greyed pair`);
      }
    }
  }

  for (const pair of PAIRS) {
    const html = files.get(path.join(OUT_DIR, `${pair.slug}.html`));
    if (!html) continue;
    const hubSlug = HUB_SLUG[pair.from];
    if (!html.includes(`href="${hubSlug}/"`)) {
      fail(`${pair.slug}.html does not link back to /convert/${hubSlug}/ — the source hub is missing`);
    }
  }

  const openCells = [...indexHtml.matchAll(/<td class="mx-open"[^>]*>([\s\S]*?)<\/td>/g)];
  if (openCells.length !== MATRIX.counts.open) {
    fail(`the rendered matrix has ${openCells.length} open cells, the grid counts ${MATRIX.counts.open}`);
  }
  const seen = new Map();
  for (const [, inner] of openCells) {
    const anchors = [...inner.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(hit => hit[1]);
    if (anchors.length !== 1) {
      fail(`a rendered open cell carries ${anchors.length} links, expected exactly 1: ${inner.slice(0, 120)}`);
      continue;
    }
    const href = anchors[0];
    if (/^[a-z0-9-]+\.html$/.test(href)) {
      if (!files.has(path.join(OUT_DIR, href))) fail(`matrix cell links ${href}, which this run did not render`);
      seen.set('page', (seen.get('page') ?? 0) + 1);
    } else if (/^[a-z0-9-]+\/#to-[a-z]+$/.test(href)) {
      const [hubSlug, fragment] = href.split('/#');
      const hubHtml = files.get(path.join(OUT_DIR, hubSlug, 'index.html'));
      if (!hubHtml || !hubHtml.includes(`id="${fragment}"`)) {
        fail(`matrix cell links ${href}, but /convert/${hubSlug}/ has no ${fragment} anchor`);
      }
      seen.set('hub', (seen.get('hub') ?? 0) + 1);
    } else {
      fail(`matrix cell links '${href}', which is neither a rendered pair page nor a hub anchor`);
    }
  }
  // An absent tally *is* zero: once every open cell has its own page, no cell links to a hub anchor at
  // all, and `Map.get` returns undefined — which must not read as a disagreement with a grid counting 0.
  if ((seen.get('page') ?? 0) !== MATRIX.counts.pages || (seen.get('hub') ?? 0) !== MATRIX.counts.hubs) {
    fail(
      `the rendered matrix links ${seen.get('page') ?? 0} pair pages and ${seen.get('hub') ?? 0} hub anchors, ` +
        `the grid counts ${MATRIX.counts.pages} and ${MATRIX.counts.hubs}`,
    );
  }

  // Greyed and diagonal cells must stay text: their destinations would be a pair the picker refuses.
  for (const [, inner] of indexHtml.matchAll(/<td class="mx-(?:block|self)"[^>]*>([\s\S]*?)<\/td>/g)) {
    if (/<a\b/.test(inner))
      fail('a greyed or diagonal matrix cell carries a link — the grid advertises a blocked pair');
  }
}

/**
 * The site's discoverable URL set: the hand-written pages above plus every generated pair page.
 * @returns {string} `docs/sitemap.xml`
 */
function renderSitemap() {
  const index = { path: '/convert/', updated: PAGES_UPDATED, changefreq: 'monthly', priority: '0.9' };
  const hubs = HUBS.map(hub => ({
    path: `/convert/${hub.slug}/`,
    updated: PAGES_UPDATED,
    changefreq: 'monthly',
    priority: '0.8',
  }));
  const pairs = PAIRS.map(pair => ({
    path: `/convert/${pair.slug}.html`,
    updated: PAGES_UPDATED,
    changefreq: 'monthly',
    priority: '0.8',
  }));
  const urls = [STATIC_PAGES.home, index, ...hubs, ...pairs, STATIC_PAGES.blog, STATIC_PAGES.privacy, STATIC_PAGES.diff]
    .map(
      entry => `  <url>
    <loc>${SITE.origin}${entry.path}</loc>
    <lastmod>${entry.updated}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/render-site-pages.mjs — edit that script (or scripts/conversion-pages/pairs.mjs
     for the pair pages) instead of this file; \`pnpm pages:check\` compares these bytes.
     GitHub Pages source directory; URLs assume the repo \`transfer-any-file\` under this account. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// Write or verify
// ---------------------------------------------------------------------------

const files = new Map();
validateScreenshots();
validateStaticDates();
validateFaqRail();
validateLinkMirrors();
validateSiteNav();
validateDiffPage();
for (const hub of HUBS) validateHub(hub);
for (const pair of PAIRS) {
  const chain = validatePair(pair);
  // A pair whose shot key is unknown is skipped for the same reason a pair without a route is: writing
  // it would put a broken `<img>` on a public URL, and `renderPage` would crash before the collected
  // message from `validateScreenshots()` ever reached the operator's terminal.
  if (chain.length && SCREENSHOTS[pair.shot])
    files.set(path.join(OUT_DIR, `${pair.slug}.html`), renderPage(pair, chain));
}
if (errors.length === 0) {
  files.set(path.join(OUT_DIR, 'index.html'), renderIndex());
  for (const hub of HUBS) files.set(path.join(OUT_DIR, hub.slug, 'index.html'), renderHub(hub));
  files.set(SITEMAP, renderSitemap());
  // The byte copy. Registering it here — rather than writing it from a separate step — is what puts it
  // inside the `--check` comparison below; a copy written outside `files` would be committed once and
  // then drift forever, with the guard printing OK over a file it never opened.
  files.set(DIFF_OUT, fs.readFileSync(DIFF_SRC, 'utf8'));
}
if (errors.length === 0) validateHubCoverage();

if (errors.length > 0) {
  console.error('site pages: refused to write');
  for (const message of errors) console.error(`  ✗ ${message}`);
  process.exit(1);
}

if (CHECK) {
  const stale = [...files].filter(([file, html]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== html);
  if (stale.length > 0) {
    console.error('site pages: committed HTML does not match scripts/conversion-pages/pairs.mjs');
    for (const [file] of stale) console.error(`  ✗ ${path.relative(ROOT, file)}`);
    console.error('Run: node scripts/render-site-pages.mjs');
    process.exit(1);
  }
  console.log(`site pages OK — ${files.size} files match their data source and the route baseline`);
  process.exit(0);
}

for (const [file, html] of files) {
  // Per destination rather than one `OUT_DIR`: the copy lives in `docs/diff/`, which this script also has
  // to create, and a directory list maintained by hand is how a third output directory ships broken.
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
// Derived from the map rather than from `files.size - 1`: the sentence used to assert that everything not
// in `docs/convert` was the sitemap, which stopped being true the moment a third destination appeared. A
// summary computed from what was actually written cannot go stale.
const perDirectory = new Map();
for (const [file] of files) {
  const dir = path.relative(ROOT, path.dirname(file));
  perDirectory.set(dir, (perDirectory.get(dir) ?? 0) + 1);
}
const breakdown = [...perDirectory]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([dir, count]) => `${count} in ${dir}`)
  .join(', ');
console.log(`wrote ${files.size} files — ${breakdown}`);
