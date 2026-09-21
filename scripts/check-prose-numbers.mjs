#!/usr/bin/env node
/**
 * Prose-number guard.
 *
 * Why this exists: the outward-facing documents quote numbers that are facts of the code — the size
 * of the format enum, the edge count of the converter graph, its BFS closure, how much of that
 * closure `conversion-policy` greys out, and the batch and size thresholds. Nothing compared those
 * numbers to their sources, and drift already shipped twice (a store description whose character
 * count moved under an unrelated edit, and a name/limit pair quoted as 33/75 when the real split
 * was 20/75). Every value below is derived from source or from the path baseline, then matched
 * against the sentences that quote it. The one exception is the suite's assertion total, which only
 * running the tests can answer — so `scripts/e2e-test.mjs` records it and the prose is held to that.
 *
 * Two kinds of pattern, because the documents have two kinds of sentence:
 *
 * - A fact `pattern` names its fact in the surrounding words (「可到达 143 个组合」 vs
 *   「实际提供 116 个」), so the captured number is compared against that one fact.
 * - A `SHARED` pattern is a shape the same words carry for several facts — 「27 个组合」,
 *   「143 个组合」 and 「116 个组合」 are all the same regex. Each shape lists the facts it may
 *   carry and the number has to equal one of them, so a stale 46 or an invented 91 still fails.
 *   What such a shape cannot catch is a number that is live but belongs to a neighbour, and no
 *   positional reading of those sentences can be trusted to keep distinguishing them after the next
 *   reword — so the guard trades that one case for not crying wolf, which is what keeps it runnable.
 *
 * What it still cannot do: see a sentence reworded out of every pattern. `__baseline__/prose-number-quotes.json`
 * makes going blind loud instead of silent — it records how many quotes each document carried when
 * the baseline was last taken, and a document that carries fewer now fails the run. Reword on
 * purpose, then either teach the guard the new phrasing or run `--update` and read the diff: it names
 * exactly which quotes disappeared, so a lost claim shows up as a reviewer-visible change rather
 * than as a green check.
 *
 * Historical prose is out of scope, excluded per file: the 1.0.0 section of the changelogs records
 * what was true (and what was *said*) then, and the dated log in `CHROMEWEBSTORE.md` records what
 * was submitted to the store console — including 「14 种格式 / 46 条直接路径」, which is now 48.
 * A guard that flattens history is worse than none, because the next reader could not tell a stale
 * claim from a deliberate record.
 *
 * Run with --verbose to print each fact, its derived value and where it is quoted.
 * Run with --update to re-record the quote baseline after an INTENTIONAL rewording.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'scripts', '__baseline__', 'prose-number-quotes.json');
const VERBOSE = process.argv.includes('--verbose');
const UPDATE = process.argv.includes('--update');

/** Read one file from the repository root. A missing source is a hard failure, never a skip. */
function read(filePath) {
  const absolute = path.join(ROOT, filePath);
  if (!fs.existsSync(absolute)) {
    console.error(`prose numbers: ${filePath} is missing — a fact source cannot be silently skipped.`);
    process.exit(1);
  }
  return fs.readFileSync(absolute, 'utf8');
}

/** `const NAME = 5;` and `const NAME = 20 * 1024 * 1024;` — the two shapes these thresholds use. */
function numericConstant(source, name) {
  const match = new RegExp(`const ${name}\\s*=\\s*([\\d*+\\s]+);`).exec(source);
  if (!match) return null;
  // Sum of products, no `eval`.
  return match[1]
    .trim()
    .split('+')
    .map(term =>
      term
        .split('*')
        .map(factor => Number(factor.trim()))
        .reduce((a, b) => a * b, 1),
    )
    .reduce((a, b) => a + b, 0);
}

/** `const NAME = 'value'` members of a string enum, in declaration order. */
function readEnumMembers(filePath, enumName) {
  const body = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(read(filePath));
  if (!body) {
    console.error(`prose numbers: no 'enum ${enumName}' in ${filePath}.`);
    process.exit(1);
  }
  return [...body[1].matchAll(/^\s*([A-Z0-9]+)\s*=\s*'([^']+)'/gm)].map(match => match[2]);
}

/** The format sets `conversion-policy.ts` builds its blocked pairs from, plus the inline TXT target. */
function readPolicySets() {
  const source = read('utils/core/conversion-policy.ts');
  const readSet = name => {
    const body = new RegExp(`${name}\\s*=\\s*new Set<FileFormat>\\(\\[([\\s\\S]*?)\\]\\)`).exec(source);
    if (!body) {
      console.error(`prose numbers: cannot read ${name} from utils/core/conversion-policy.ts.`);
      process.exit(1);
    }
    return [...body[1].matchAll(/FileFormat\.([A-Z0-9]+)/g)].map(match => match[1].toLowerCase());
  };
  const textTarget = /target === FileFormat\.([A-Z0-9]+)/.exec(source);
  return {
    images: readSet('IMAGE_FORMATS'),
    data: readSet('DATA_FORMATS'),
    // TXT is blocked from images by an inline comparison rather than through DATA_FORMATS.
    text: textTarget ? textTarget[1].toLowerCase() : null,
  };
}

// ---------------------------------------------------------------------------
// Facts, all derived — never from a document
// ---------------------------------------------------------------------------

const formats = readEnumMembers('utils/core/types.ts', 'FileFormat');
const baseline = JSON.parse(read('scripts/__baseline__/conversion-paths.json'));

/** Every `from->to` the graph routes, i.e. the BFS closure minus the unreachable pairs. */
const reachablePairs = Object.entries(baseline.paths)
  .filter(([, steps]) => steps !== null)
  .map(([pair]) => pair.split('->'));
const reachable = reachablePairs.length;

/** Formats the registry writes anything for, read off the step list rather than the enum. */
const stepTargets = new Set();
for (const steps of Object.values(baseline.paths)) {
  for (const step of steps ?? []) stepTargets.add(step.split('>')[1]);
}

const policy = readPolicySets();
const blockedTargets = new Set([...policy.data, ...(policy.text ? [policy.text] : [])]);
const isImageBlocked = ([from, to]) => policy.images.includes(from) && blockedTargets.has(to);
const isPdfBlocked = ([from, to]) => from === 'pdf' && policy.data.includes(to);
const blocked = reachablePairs.filter(pair => isImageBlocked(pair) || isPdfBlocked(pair)).length;
const imageBlocked = reachablePairs.filter(isImageBlocked).length;
const pdfBlocked = reachablePairs.filter(isPdfBlocked).length;
const imageReadable = policy.images.length;
const imageWritable = policy.images.filter(format => stepTargets.has(format)).length;

/** Accent themes offered by the picker (`useTheme.ts`), which the contrast sweep multiplies by two. */
function readThemeCount() {
  const source = read('composables/useTheme.ts');
  const body = /AVAILABLE_THEMES[^=]*=\s*\[([\s\S]*?)\n\]/.exec(source);
  if (!body) {
    console.error('prose numbers: cannot read AVAILABLE_THEMES from composables/useTheme.ts.');
    process.exit(1);
  }
  return (body[1].match(/^\s*\{\s*value:/gm) ?? []).length;
}

/**
 * One of the two store description paste blocks, counted the way `check-store-listing.mjs` counts it:
 * Unicode code points in the fenced block that follows the marker heading. The quick-reference table,
 * the field label and the publishing guide all quote this number, and it had already gone stale twice
 * when the block was trimmed for a store rejection.
 */
function storeDescriptionChars(marker) {
  const sheetLines = read('CHROMEWEBSTORE.md').split('\n');
  const start = sheetLines.findIndex(line => line.includes(marker));
  if (start === -1) {
    console.error(`prose numbers: heading not found in CHROMEWEBSTORE.md — ${marker}`);
    process.exit(1);
  }
  let i = start + 1;
  while (i < sheetLines.length && !sheetLines[i].startsWith('```')) i++;
  const body = [];
  for (i += 1; i < sheetLines.length && !sheetLines[i].startsWith('```'); i++) body.push(sheetLines[i]);
  if (body.length === 0) {
    console.error(`prose numbers: empty paste block after ${marker}.`);
    process.exit(1);
  }
  return [...body.join('\n')].length;
}

const descEn = storeDescriptionChars('**详细介绍（Detailed Description）**');
const descZh = storeDescriptionChars('**中文详细介绍（Chinese (China) detailed description）**');

/**
 * The suite's assertion total, read off the record `scripts/e2e-test.mjs` writes at the end of a full
 * green run. This is the one fact the source cannot answer: how many assertions ran is a property of
 * the tests, and only running them says so. Four outward sentences quote it (the product page in both
 * languages and both promo articles), and every round of coverage used to re-take that number by hand
 * — six commits on this branch are named for exactly that sweep. A generated artifact is worse: it
 * carries whatever number was true when it was rendered, which is how the WeChat HTML on disk today
 * still announces 244.
 */
function readAssertionTotal() {
  const filePath = 'scripts/__baseline__/e2e-assertions.json';
  const raw = JSON.parse(read(filePath));
  if (!Number.isInteger(raw.assertions) || raw.assertions <= 0) {
    console.error(`prose numbers: ${filePath} has no usable \`assertions\` count.`);
    console.error('Run the full suite (`pnpm test:e2e`) to re-record it; do not edit the number by hand.');
    process.exit(1);
  }
  return raw.assertions;
}

/** Every constant the prose can quote; a constant that moved shape fails the run. */
const constants = {};
for (const [name, filePath] of Object.entries({
  MAX_WARN_SIZE: 'components/shared/FileUpload.vue',
  MAX_REJECT_SIZE: 'components/shared/FileUpload.vue',
  MAX_BATCH_FILES: 'components/shared/FileUpload.vue',
  CONFIRM_FILE_COUNT: 'composables/useConversion.ts',
  MAX_PRESETS: 'utils/core/presets.ts',
  MAX_RECORDS: 'composables/useHistory.ts',
  MAX_RECENT: 'composables/useRecentTargets.ts',
})) {
  const value = numericConstant(read(filePath), name);
  if (value === null || !Number.isFinite(value)) {
    console.error(`prose numbers: could not read \`const ${name}\` from ${filePath} — it moved shape.`);
    console.error('Teach this script the new shape; do not delete the fact.');
    process.exit(1);
  }
  constants[name] = value;
}
const MB = 1024 * 1024;

/**
 * Each fact: its derived value, what it is, the sentences that name it, and (filled in from a
 * --verbose run) how many quotes each document carries today.
 *
 * A pattern holds exactly one capture group unless `is` states the value: a spelled-out claim like
 * 「Eleven of them can be written」 has no digits to read, so it asserts `is` by itself.
 */
const FACTS = [
  {
    key: 'formats',
    value: formats.length,
    what: 'FileFormat enum members',
    patterns: [
      // 「图片可读 6 种格式、可写 3 种格式」 counts one family; those two are facts of their own below.
      /(?<![读写]\s*)(\d+)\s*种格式/,
      /(\d+)\s*file formats/,
      /(\d+)\s*formats\b/,
      { re: /Fourteen formats\b/, is: 14 },
    ],
  },
  {
    key: 'imageReadable',
    value: imageReadable,
    what: 'image formats the app can read (conversion-policy IMAGE_FORMATS)',
    patterns: [/图片可读\s*(\d+)\s*种/],
  },
  {
    key: 'imageWritable',
    value: imageWritable,
    what: 'image formats the app can write (browsers cannot encode BMP/GIF/SVG)',
    patterns: [/可写\s*(\d+)\s*种/],
  },
  {
    key: 'writable',
    value: stepTargets.size,
    what: 'formats the registry can write (they appear as a step target)',
    patterns: [
      /(\d+)\s*种可写/,
      /能写出\s*(\d+)\s*种/,
      /(\d+)\s+writable/,
      { re: /Eleven of them can be written/, is: 11 },
    ],
  },
  {
    key: 'pairwise',
    value: (formats.length * (formats.length - 1)) / 2,
    what: 'format pairs a pairwise converter design would need — what the graph replaces',
    patterns: [/that'?s\s+(\d+)\s+combinations/],
  },
  {
    key: 'routes',
    value: baseline.edgeCount,
    what: 'registered direct edges in the converter graph',
    patterns: [
      /(\d+)\+?\s*条(?:直接|注册|直连|转换)?路[径由]/,
      /(\d+)\s*(?:registered\s*)?direct (?:routes|edges)/,
      /路径数\s*(\d+)/,
    ],
  },
  {
    key: 'reachable',
    value: reachable,
    what: 'BFS transitive closure over the same graph (source × target, minus identity)',
    patterns: [
      /可到达\s*(\d+)\s*个/,
      /(\d+)\s*个可达组合/,
      /(\d+)\s+reachable\s+combinations?/,
      /(\d+)\s+combinations?\s+reachable/,
      /mak(?:e|es)\s+(\d+)\s+(?:[\w→-]+\s+){0,2}combinations?/,
      /(\d+)\s+minus\b/,
    ],
  },
  {
    key: 'selectable',
    value: reachable - blocked,
    what: 'pairs the picker actually offers, i.e. the closure minus what conversion-policy blocks',
    patterns: [
      /提供\s*(\d+)\s*个/,
      /(\d+)\s*个可选组合/,
      /(\d+)\s+selectable\s+combinations?/,
      /offers?\s+(\d+)\b/,
      /(\d+)\s+(?:of them\s+)?(?:remain\s+)?selectable\b/,
    ],
  },
  {
    key: 'blocked',
    value: blocked,
    what: 'reachable pairs conversion-policy greys out (image → text/data, PDF → data)',
    patterns: [
      /其中\s*(\d+)\s*个/,
      /另外\s*(\d+)\s*个/,
      /(\d+)\s*个(?:因)?语义无效/,
      /the other\s+(\d+)\b/,
      /(\d+)\s+(?:of them\s+)?(?:are blocked|are semantically invalid)/,
    ],
  },
  {
    key: 'imageBlocked',
    value: imageBlocked,
    what: 'of those, the image → TXT/CSV/JSON/XLSX pairs',
    patterns: [/(\d+)\s*个图片\s*→/, /(\d+)\s*image→text\/data/],
  },
  {
    key: 'pdfBlocked',
    value: pdfBlocked,
    what: 'of those, the PDF → CSV/JSON/XLSX pairs',
    patterns: [/(\d+)\s*个\s*PDF\s*→/, /and\s+(\d+)\s+PDF→data/],
  },
  {
    key: 'batchFiles',
    value: constants.MAX_BATCH_FILES,
    what: 'files per batch (FileUpload)',
    patterns: [
      /单批(?:次)?(?:最多)?\s*(\d+)\s*个/,
      /一次最多\s*(\d+)\s*个文件/,
      /(\d+)\s*files? per batch/,
      /(\d+)\s*files in (?:one run|a batch)/,
      /Up to\s+(\d+)\s*files/,
    ],
  },
  {
    key: 'rejectSize',
    value: constants.MAX_REJECT_SIZE / MB,
    suffix: 'MB',
    what: 'per-file ceiling the upload refuses (FileUpload)',
    patterns: [
      /单文件最大\s*(\d+)\s*MB/,
      /超过\s*(\d+)\s*MB\s*拒绝/,
      /rejects above\s+(\d+)\s*MB/,
      /(\d+)\s*MB per file/,
      /up to\s+(\d+)\s*MB/,
    ],
  },
  {
    key: 'warnSize',
    value: constants.MAX_WARN_SIZE / MB,
    suffix: 'MB',
    what: 'per-file size the upload warns above (FileUpload)',
    patterns: [
      /单文件超过\s*(\d+)\s*MB/,
      /(\d+)\s*MB\s*(?:起提示|提示|警告)/,
      /warns above\s+(\d+)\s*MB/,
      /MB（(\d+)\s*MB/,
    ],
  },
  {
    key: 'confirmFiles',
    value: constants.CONFIRM_FILE_COUNT,
    what: 'batch size that asks for confirmation first (useConversion)',
    patterns: [/(?:批次)?超过\s*(\d+)\s*个文件/, /(\d+)\s*files? or/, /above\s+(\d+)\s*files/],
  },
  {
    key: 'presets',
    value: constants.MAX_PRESETS,
    what: 'stored conversion presets (presets.ts)',
    patterns: [
      /预设[（(]?≤\s*(\d+)/,
      /最多\s*(\d+)\s*个命名预设/,
      /up to\s+(\d+)\s*(?:named\s+)?presets/,
      /presets?\s*\(up to\s+(\d+)\)/,
    ],
  },
  {
    key: 'historyRecords',
    value: constants.MAX_RECORDS,
    what: 'kept history records (useHistory)',
    patterns: [/最近\s*(\d+)\s*条/, /last\s+(\d+)\s+(?:records|entries)/, /(\d+)\s*(?:records|entries)\s+of\s+history/],
  },
  {
    key: 'recentTargets',
    value: constants.MAX_RECENT,
    what: 'recently used targets the picker leads with (useRecentTargets)',
    patterns: [/最近\s*(\d+)\s*个/, /up to\s+(\d+)\s+of the formats/, /(\d+)\s+most (?:often )?used/],
  },
  {
    key: 'themes',
    value: readThemeCount(),
    what: 'accent themes offered by the picker (useTheme AVAILABLE_THEMES)',
    patterns: [/(\d+)\s*种?主题色?/, /(\d+)\s+themes\b/, /(\d+)\s+accent colours/],
  },
  {
    key: 'themeCombos',
    value: readThemeCount() * 2,
    what: 'theme × light/dark combinations the contrast sweep asserts',
    patterns: [/(\d+)\s*组配置/, /(\d+)\s*种组合/, /\((\d+)\s+combinations?\)/, /,\s*(\d+)\s+combinations?\b/],
  },
  {
    key: 'assertions',
    value: readAssertionTotal(),
    what: 'assertions the e2e suite ran, recorded by its last full green run',
    patterns: [
      /共\s*(\d+)\s*项断言/,
      /跑\s*(\d+)\s*条断言/,
      /with (\d+)\/\d+\s+assertions/,
      /through\s+(\d+)\s+assertions/,
    ],
  },
  {
    key: 'descEn',
    value: descEn,
    what: 'characters in the English store description paste block',
    patterns: [
      /英文详细介绍\]\([^)]*\) \(([\d,]+) 字符\)/,
      /英文块实测 ([\d,]+)/,
      /英文详细说明：([\d,]+) 字符/,
      /English detailed description: ([\d,]+) characters/,
    ],
  },
  {
    key: 'descZh',
    value: descZh,
    what: 'characters in the Chinese store description paste block',
    patterns: [
      /中文详细介绍\]\([^)]*\) \(([\d,]+) 字符\)/,
      /中文块实测 ([\d,]+)/,
      /中文详细说明：([\d,]+) 字符/,
      /Chinese detailed description: ([\d,]+) characters/,
    ],
  },
];

/**
 * Shapes several facts legitimately share: 「27 个组合」, 「143 个组合」 and 「116 个组合」 are the
 * same regex, and the sentence does not say which it means. Each entry lists the facts that shape
 * carries, so a number still has to be one this run derived — a stale 46 or an invented 91 fails —
 * while the guard does not pretend to read a distinction the words do not make.
 */
const SHARED = [
  {
    re: /(\d+)\s*个组合/,
    what: 'a count of source→target pairs',
    facts: ['reachable', 'selectable', 'blocked', 'pairwise'],
  },
  {
    re: /(\d+)\s+(?:source-to-target|source→target|source × target)\s+combinations?/,
    what: 'a count of source→target pairs',
    facts: ['reachable', 'selectable', 'blocked', 'pairwise'],
  },
  {
    re: /(\d+)\s+combinations?\b/,
    what: 'a count of combinations',
    facts: ['reachable', 'selectable', 'blocked', 'pairwise', 'themeCombos'],
  },
];

// ---------------------------------------------------------------------------
// Documents in scope
// ---------------------------------------------------------------------------

/**
 * Each entry is prose that quotes the facts above. `only` keeps a single section, `skipFrom` drops
 * everything from a heading down — those regions are records rather than claims (see the header).
 * `floor: false` keeps the value check but drops the entry from the quote baseline: the Unreleased
 * section of a changelog is written per release, and a note that happens not to mention a format
 * count is not a lost claim.
 */
const DOCS = [
  'README.md',
  'README.en.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'CONTRIBUTING.en.md',
  'docs/llms.txt',
  'docs/index.html',
  'docs/promo/wechat-article.md',
  'docs/promo/blog-article.en.md',
  'docs/promo/weibo-posts.md',
  { file: 'CHROMEWEBSTORE.md', skipFrom: /^## 版本历史/m },
  // The publishing runbook quotes the same store field lengths and the same release-layer facts, so it
  // drifts the same way; it lives in `.github/` because `docs/` is the public site source.
  '.github/CWS_PUBLISHING_GUIDE.md',
  '.github/CWS_PUBLISHING_GUIDE.en.md',
  // The main file spells its heading 「未发布」; matching only the English word excluded it silently.
  { file: 'CHANGELOG.md', only: /^## \[(?:未发布|Unreleased)\][\s\S]*?(?=^## \[)/m, floor: false },
  { file: 'CHANGELOG.en.md', only: /^## \[(?:未发布|Unreleased)\][\s\S]*?(?=^## \[)/m, floor: false },
];

function docText(entry) {
  const source = read(typeof entry === 'string' ? entry : entry.file);
  if (typeof entry === 'object' && entry.only) return entry.only.exec(source)?.[0] ?? '';
  if (typeof entry === 'object' && entry.skipFrom) {
    const heading = entry.skipFrom.exec(source);
    return heading ? source.slice(0, heading.index) : source;
  }
  return source;
}

const documents = DOCS.map(entry => ({
  name: typeof entry === 'string' ? entry : entry.file,
  text: docText(entry),
  floor: !(typeof entry === 'object' && entry.floor === false),
}));

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const problems = [];
const lines = [];
const valueOf = Object.fromEntries(FACTS.map(fact => [fact.key, fact.value]));

/** One capture group per pattern, or the reading is arbitrary. */
function rejected(pattern) {
  const source = pattern.source;
  let groups = 0;
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (inClass) {
      if (ch === ']') inClass = false;
      continue;
    }
    if (ch === '[') inClass = true;
    else if (ch === '(' && source[i + 1] !== '?') groups++;
  }
  return groups === 1 ? null : `${groups} capture groups — one pattern, one number`;
}
const globalOf = pattern =>
  new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);

/** Prose writes the four store counts with a thousands separator; the facts are plain numbers. */
const readNumber = raw => Number(String(raw).replace(/[,\s]/g, ''));

/** Count a shared quote toward whichever of the listed facts actually holds that value. */
function attribute(doc, value, allowed) {
  for (const key of allowed) if (valueOf[key] === value) quotes[key][doc.name] = (quotes[key][doc.name] ?? 0) + 1;
}

const quotes = Object.fromEntries(FACTS.map(fact => [fact.key, {}]));

// A pattern this script cannot parse is a defect of the script, not of the documents. Reported here,
// once per regex, rather than once per document that would have been read with it.
for (const fact of FACTS) {
  for (const entry of fact.patterns) {
    const pattern = entry instanceof RegExp ? { re: entry } : entry;
    const problem = pattern.is === undefined ? rejected(pattern.re) : null;
    if (problem) problems.push(`fact "${fact.key}": ${pattern.re} has ${problem}`);
  }
}

for (const fact of FACTS) {
  const perFile = quotes[fact.key];
  for (const doc of documents) {
    for (const entry of fact.patterns) {
      const pattern = entry instanceof RegExp ? { re: entry } : entry;
      const expected = pattern.is ?? fact.value;
      // A pattern this script cannot parse is a defect of the script, not of the documents; `is`
      // patterns are presence-only and need no group.
      if (pattern.is === undefined && rejected(pattern.re)) continue;
      for (const match of doc.text.matchAll(globalOf(pattern.re))) {
        if (match[1] !== undefined && readNumber(match[1]) !== expected) {
          const unit = fact.suffix ? ` ${fact.suffix}` : '';
          problems.push(
            `${doc.name}: ${JSON.stringify(match[0].trim())} quotes ${match[1]}${unit}, but ${fact.what} ` +
              `is ${fact.value}${unit} (fact "${fact.key}").`,
          );
        }
        perFile[doc.name] = (perFile[doc.name] ?? 0) + 1;
      }
    }
  }
}

for (const shared of SHARED) {
  // Checked here rather than per document, so a broken shared regex reports once.
  const defect = rejected(shared.re);
  if (defect) {
    problems.push(`shared: ${shared.re} has ${defect}`);
    continue;
  }
  for (const doc of documents) {
    for (const match of doc.text.matchAll(globalOf(shared.re))) {
      const value = readNumber(match[1]);
      if (!shared.facts.some(key => valueOf[key] === value)) {
        problems.push(
          `${doc.name}: ${JSON.stringify(match[0].trim())} quotes ${value} as ${shared.what}, but that shape ` +
            `carries only ${shared.facts.map(key => valueOf[key]).join(' / ')} (${shared.facts.join(', ')}).`,
        );
      }
      attribute(doc, value, shared.facts);
    }
  }
}

/** What each document quotes today, floored at zero quotes and without the `floor: false` files. */
const observed = {};
for (const fact of FACTS) {
  const perFile = Object.fromEntries(
    Object.entries(quotes[fact.key])
      .filter(([name]) => documents.find(doc => doc.name === name)?.floor)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  if (Object.keys(perFile).length) observed[fact.key] = perFile;
}

if (UPDATE) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(observed, null, 2)}\n`);
  const cells = Object.values(observed).reduce((total, perFile) => total + Object.keys(perFile).length, 0);
  console.log(
    `prose numbers: baseline re-recorded — ${cells} (fact, document) pairs across ${Object.keys(observed).length} facts.`,
  );
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(
    `prose numbers: ${path.relative(ROOT, BASELINE)} is missing — run \`node scripts/check-prose-numbers.mjs --update\`.`,
  );
  console.error('A guard whose baseline was never taken has never compared anything.');
  process.exit(1);
}
const recorded = JSON.parse(read('scripts/__baseline__/prose-number-quotes.json'));

for (const key of Object.keys(recorded)) {
  if (!FACTS.some(fact => fact.key === key)) {
    problems.push(
      `baseline: "${key}" is no longer a fact this script derives. Deleting a fact silently deletes its ` +
        'guard — restore it, or run --update with the sentence removed from the documents too.',
    );
  }
}

for (const fact of FACTS) {
  const perFile = quotes[fact.key];
  for (const [name, count] of Object.entries(recorded[fact.key] ?? {})) {
    if ((perFile[name] ?? 0) < count) {
      problems.push(
        `${name}: carried ${count} quote(s) of fact "${fact.key}" (${fact.what}) when the baseline was taken, ` +
          `${perFile[name] ?? 0} now. A fact this guard cannot see is a fact it no longer guards: teach it the ` +
          'new phrasing, or run --update and check the diff really only drops the sentence you deleted.',
      );
    }
  }
  const total = Object.values(perFile).reduce((a, b) => a + b, 0);
  lines.push(
    `${fact.key.padEnd(14)} ${String(fact.value).padStart(4)}  ${String(total).padStart(3)} quotes  ${fact.what}`,
  );
  if (VERBOSE && total) lines.push(`${' '.repeat(14)}${JSON.stringify(perFile)}`);
}

if (VERBOSE) for (const line of lines) console.log(`  ${line}`);

if (problems.length > 0) {
  const unique = [...new Set(problems)];
  console.error(`prose numbers: ${unique.length} problem(s) between documents and their sources:`);
  for (const problem of unique) console.error(`  ${problem}`);
  console.error(
    '\nFix the side that is wrong. A deliberate change to a threshold, the format enum or the\n' +
      'converter graph has to move every document that quotes it (and `pnpm verify:paths` for the\n' +
      "graph), then this guard's counts for any phrasing you reworded.",
  );
  process.exit(1);
}

console.log(
  `prose numbers OK: ${FACTS.length} facts derived from source and the recorded suite run, matched across ${documents.length} documents.`,
);
