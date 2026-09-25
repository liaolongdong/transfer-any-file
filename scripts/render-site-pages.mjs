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
 */

import fs from 'node:fs';
import path from 'node:path';
import { FORMAT_LABEL, PAIRS, PAGES_UPDATED, SITE } from './conversion-pages/pairs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'convert');
const SITEMAP = path.join(ROOT, 'docs', 'sitemap.xml');
const CHECK = process.argv.includes('--check');

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
 * Mirror of `getBlockedReason()` for the two sets read out of the policy source.
 * @param {string} from source format value
 * @param {string} to target format value
 * @returns {boolean} true when the UI greys this pair out
 */
function isBlocked(from, to) {
  if (IMAGE_FORMATS.has(from) && (to === 'txt' || DATA_FORMATS.has(to))) return true;
  if (from === 'pdf' && DATA_FORMATS.has(to)) return true;
  return false;
}

// A member renamed in `types.ts` would otherwise make a policy set name something that is no longer a
// format, and the block rules above would quietly stop matching anything.
for (const value of [...IMAGE_FORMATS, ...DATA_FORMATS]) {
  if (!enumValues.has(value)) {
    fail(`conversion-policy.ts names a format '${value}' that is not in FileFormat — update this reader`);
  }
}

/**
 * Validate one content entry against the code it describes.
 * @param {object} pair a `pairs.mjs` entry
 * @returns {string[]} the route chain, e.g. `['md', 'html', 'docx']`
 */
function validatePair(pair) {
  const { slug, from, to } = pair;
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
 * @param {{zh: {t: string, d: string}, en: {t: string, d: string}}} meta per-language chrome strings
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
        <span>Transfer Any File</span>
      </a>
      <nav class="site-nav" aria-label="Site">
        <a href="${up}">${bi('产品说明', 'Product')}</a>
        <a href="${up}convert/">${bi('转换一览', 'Conversions')}</a>
        <a href="${up}blog/">${bi('博客', 'Blog')}</a>
        <a href="${SITE.repo}" rel="noopener" target="_blank">GitHub</a>
      </nav>
    </div>
  </header>`;
  const foot = `<footer class="site-foot">
    <div class="wrap">
      <p>
        ${bi(
          'Transfer Any File —— 完全离线的 Chrome 文件格式转换扩展。文件不出本机，无遥测，只申请 storage 权限。',
          'Transfer Any File — an offline Chrome file format converter. Files never leave the machine, no telemetry, and the storage permission is all it asks for.',
        )}
      </p>
      <p class="fine">
        <a href="${up}">${bi('产品说明', 'Product page')}</a>
        <a href="${up}convert/">${bi('转换一览', 'All conversions')}</a>
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

  const faq = pair.faq
    .map(
      item => `        <details>
          <summary>${bi(item.q.zh, item.q.en)}</summary>
          <p>${bi(item.a.zh, item.a.en)}</p>
        </details>`,
    )
    .join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: `${pair.title.zh} | ${pair.title.en}`,
        inLanguage: ['zh-CN', 'en'],
        isPartOf: { '@id': `${SITE.origin}/#website` },
        about: { '@type': 'SoftwareApplication', name: 'Transfer Any File', operatingSystem: 'Chrome' },
        description: `${pair.desc.zh} | ${pair.desc.en}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Transfer Any File', item: `${SITE.origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Conversions', item: `${SITE.origin}/convert/` },
          { '@type': 'ListItem', position: 3, name: `${label(pair.from).en} → ${label(pair.to).en}`, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: pair.faq.map(item => ({
          '@type': 'Question',
          name: `${item.q.zh} ${item.q.en}`,
          acceptedAnswer: { '@type': 'Answer', text: `${item.a.zh} ${item.a.en}` },
        })),
      },
    ],
  });

  const bilingualTitle = `${pair.title.zh} | ${pair.title.en}`;

  return `<!doctype html>
<!-- Generated by scripts/render-site-pages.mjs from scripts/conversion-pages/pairs.mjs.
     Edit the data module and re-run the script; a hand edit here is overwritten by the next build,
     and \`pnpm pages:check\` fails on the drift either way. -->
<html lang="zh-CN" id="top">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${headScripts({ zh: { t: pair.title.zh, d: pair.desc.zh }, en: { t: pair.title.en, d: pair.desc.en } })}
    <title>${esc(bilingualTitle)}</title>
    <meta name="description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta name="author" content="Better" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/png" sizes="64x64" href="../assets/icon-mark.png" />
    <link rel="stylesheet" href="../assets/content.css" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Transfer Any File" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(bilingualTitle)}" />
    <meta property="og:description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta property="og:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(bilingualTitle)}" />
    <meta name="twitter:description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta name="twitter:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <script type="application/ld+json">
      ${jsonLd}
    </script>
  </head>
  <body>
    ${head}
    <main class="page">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../">${bi('产品说明', 'Product')}</a>
          <span aria-hidden="true">/</span>
          <a href="../convert/">${bi('转换一览', 'Conversions')}</a>
          <span aria-hidden="true">/</span>
          <span>${bi(`${label(pair.from).zh} → ${label(pair.to).zh}`, `${label(pair.from).en} → ${label(pair.to).en}`)}</span>
        </nav>
        <article>
          <p class="eyebrow">${bi('离线 · 无上传 · 浏览器本地完成', 'Offline · no uploads · runs in the browser')}</p>
          <h1>${bi(pair.title.zh, pair.title.en)}</h1>
          <p class="lede">${bi(pair.lede.zh, pair.lede.en)}</p>
          <section class="route-card" aria-label="${esc('转换链路 / route', 'Conversion route')}">
            <p class="route-label">${bi('这条链路怎么走', 'How the route runs')}</p>
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
          <section id="keeps">
${sectionHeading('会保留什么', 'What carries over')}
            <ul>
${bullets(pair.keeps)}
            </ul>
          </section>
          <section id="limits">
${sectionHeading('如实说明的限制', 'What it does not do')}
            <ul class="limits">
${bullets(pair.limits)}
            </ul>
          </section>
          <section id="notes">
${sectionHeading('实操提示', 'Working with it')}
            <ul>
${bullets(pair.notes)}
            </ul>
          </section>
          <section id="faq">
${sectionHeading('常见问题', 'Questions people actually ask')}
${faq}
          </section>
          <section class="cta">
            <p>
              ${bi(
                '不需要账号，也不需要联网：装好扩展后点图标，在新标签页里打开工作台，文件从磁盘直接选。',
                'No account and no network: install the extension, click its icon, and the workbench opens in a new tab reading straight off your disk.',
              )}
            </p>
            <p class="cta-links">
              <a class="btn" href="../#install">${bi('安装步骤', 'Install steps')}</a>
              <a class="btn ghost" href="${SITE.repo}">${bi('GitHub 源码', 'Source on GitHub')}</a>
            </p>
          </section>
          <section class="related">
${sectionHeading('相关转换', 'Related conversions')}
            <ul class="related-list">
${related}
            </ul>
            <p class="fine">${bi('完整一览见', 'The full set is on the')} <a href="../convert/">${bi('转换一览页', 'conversions index')}</a>${bi('。', '.')}</p>
          </section>
        </article>
      </div>
    </main>
    ${foot}
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
      return `        <section>
          <h2>${bi(group.zh, group.en)}</h2>
          <p>${bi(group.note.zh, group.note.en)}</p>
          <ul class="index-list">
${items}
          </ul>
        </section>`;
    })
    .join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: '转换一览 | Conversion index',
        inLanguage: ['zh-CN', 'en'],
        isPartOf: { '@id': `${SITE.origin}/#website` },
        hasPart: PAIRS.map(pair => ({ '@type': 'WebPage', name: pair.title.en, url: `${url}${pair.slug}.html` })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Transfer Any File', item: `${SITE.origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Conversions', item: url },
        ],
      },
    ],
  });

  const meta = {
    zh: {
      t: '转换一览｜14 种格式可用的转换组合',
      d: 'Transfer Any File 的转换配对一览：14 种格式、48 条注册路径、界面提供 116 个可选组合。每条链路给出保留什么与不做什么。',
    },
    en: {
      t: 'Conversion index for 14 file formats',
      d: 'Which conversions this offline Chrome extension actually offers: 14 formats, 48 registered direct routes and 116 selectable combinations, each with what it preserves and what it cannot do.',
    },
  };

  return `<!doctype html>
<!-- Generated by scripts/render-site-pages.mjs. Edit scripts/conversion-pages/pairs.mjs instead. -->
<html lang="zh-CN" id="top">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${headScripts(meta)}
    <title>${esc(`${meta.zh.t} | ${meta.en.t}`)}</title>
    <meta
      name="description"
      content="${esc(`${meta.zh.d} | ${meta.en.d}`)}"
    />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/png" sizes="64x64" href="../assets/icon-mark.png" />
    <link rel="stylesheet" href="../assets/content.css" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Transfer Any File" />
    <meta property="og:locale" content="zh_CN" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="转换一览 | Conversion index" />
    <meta property="og:description" content="14 种格式、48 条注册路径、界面提供 116 个可选组合。 | 14 formats, 48 registered direct routes, 116 selectable combinations." />
    <meta property="og:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <script type="application/ld+json">
      ${jsonLd}
    </script>
  </head>
  <body>
    ${head}
    <main class="page">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../">${bi('产品说明', 'Product')}</a>
          <span aria-hidden="true">/</span>
          <span>${bi('转换一览', 'Conversions')}</span>
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
${lists}
          <p class="fine">
            ${bi(
              '这里列出的是常被搜索的配对，不是全部 116 个；工作台里的目标格式下拉按批次实时给出可用项。',
              'This index lists the pairs people search for, not all 116; the workbench shows what is available for the exact batch you dropped in.',
            )}
          </p>
          <p class="cta-links">
            <a class="btn" href="../#install">${bi('安装步骤', 'Install steps')}</a>
            <a class="btn ghost" href="${SITE.repo}">${bi('GitHub 源码', 'Source on GitHub')}</a>
          </p>
        </article>
      </div>
    </main>
    ${foot}
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
 */
const STATIC_PAGES = {
  home: { path: '/', updated: '2026-09-22', changefreq: 'monthly', priority: '1.0' },
  blog: { path: '/blog/', updated: '2026-09-22', changefreq: 'monthly', priority: '0.8' },
  privacy: { path: '/privacy.html', updated: '2026-09-19', changefreq: 'yearly', priority: '0.6' },
};

/**
 * The site's discoverable URL set: the hand-written pages above plus every generated pair page.
 * @returns {string} `docs/sitemap.xml`
 */
function renderSitemap() {
  const index = { path: '/convert/', updated: PAGES_UPDATED, changefreq: 'monthly', priority: '0.9' };
  const pairs = PAIRS.map(pair => ({
    path: `/convert/${pair.slug}.html`,
    updated: PAGES_UPDATED,
    changefreq: 'monthly',
    priority: '0.8',
  }));
  const urls = [STATIC_PAGES.home, index, ...pairs, STATIC_PAGES.blog, STATIC_PAGES.privacy]
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
for (const pair of PAIRS) {
  const chain = validatePair(pair);
  if (chain.length) files.set(path.join(OUT_DIR, `${pair.slug}.html`), renderPage(pair, chain));
}
if (errors.length === 0) {
  files.set(path.join(OUT_DIR, 'index.html'), renderIndex());
  files.set(SITEMAP, renderSitemap());
}

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

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [file, html] of files) fs.writeFileSync(file, html);
console.log(
  `wrote ${files.size} files (${files.size - 1} under ${path.relative(ROOT, OUT_DIR)}, plus docs/sitemap.xml)`,
);
