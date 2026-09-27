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
 */

import fs from 'node:fs';
import path from 'node:path';
import { FORMAT_LABEL, PAIRS, PAGES_PUBLISHED, PAGES_UPDATED, SCREENSHOTS, SITE } from './conversion-pages/pairs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'convert');
const SITEMAP = path.join(ROOT, 'docs', 'sitemap.xml');
const CHECK = process.argv.includes('--check');

/**
 * What the conversions index calls itself in a breadcrumb.
 *
 * One constant rather than four literals: a `BreadcrumbList` whose `name` disagrees with the anchor
 * text it describes is the structured-data equivalent of a mismatched label, and the Chinese graph
 * used to say `Conversions` under a link that read 转换一览.
 */
const CONVERT_CRUMB = { zh: '转换一览', en: 'Conversions' };

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
 * @returns {string} markup for the `<figure>` and its swap
 */
function shotFigure(shot) {
  const enAlt = JSON.stringify(shot.alt.en).replace(/</g, '\\u003c');
  return `          <figure class="shot reveal">
            <img
              src="../assets/screenshots/${esc(shot.file)}"
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
        <a href="${up}convert/">${bi(CONVERT_CRUMB.zh, CONVERT_CRUMB.en)}</a>
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

  // Two of the ten pairs have no same-source / same-target sibling at all. An empty section under a
  // `相关转换` heading reads to a reader as a page that failed to finish loading, and to a crawler as
  // thin content, so the heading goes with the list.
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
  // A page whose `dateModified` precedes its `datePublished` is a signal search engines flag as
  // inconsistent. The pair copy can legitimately be older than the day the file first existed in the
  // repository, so the later of the two dates is the honest one to publish.
  const dateModified = PAGES_UPDATED > PAGES_PUBLISHED ? PAGES_UPDATED : PAGES_PUBLISHED;

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
        about: { '@type': 'SoftwareApplication', name: 'Transfer Any File', operatingSystem: 'Chrome' },
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
        datePublished: PAGES_PUBLISHED,
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
    <meta property="article:published_time" content="${PAGES_PUBLISHED}" />
    <meta property="article:modified_time" content="${dateModified}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(bilingualTitle)}" />
    <meta name="twitter:description" content="${esc(`${pair.desc.zh} | ${pair.desc.en}`)}" />
    <meta name="twitter:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
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
          <span>${bi(`${label(pair.from).zh} → ${label(pair.to).zh}`, `${label(pair.from).en} → ${label(pair.to).en}`)}</span>
        </nav>
        <article>
          <p class="eyebrow">${bi('离线 · 无上传 · 浏览器本地完成', 'Offline · no uploads · runs in the browser')}</p>
          <h1>${bi(pair.title.zh, pair.title.en)}</h1>
          <p class="lede">${bi(pair.lede.zh, pair.lede.en)}</p>
${shotFigure(shot)}
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
              <a class="btn" href="../#install">${bi('安装步骤', 'Install steps')}</a>
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
      t: '转换一览｜14 种格式可用的转换组合',
      d: 'Transfer Any File 的转换配对一览：14 种格式、48 条注册路径、界面提供 116 个可选组合。每条链路给出保留什么与不做什么。',
    },
    en: {
      t: 'Conversion index for 14 file formats',
      d: 'Which conversions this offline Chrome extension actually offers: 14 formats, 48 registered direct routes and 116 selectable combinations, each with what it preserves and what it cannot do.',
    },
  };

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
        description: meta[lang].d,
        image: shotUrl,
        hasPart: PAIRS.map(pair => ({ '@type': 'WebPage', name: pair.title[lang], url: `${url}${pair.slug}.html` })),
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
    <meta property="og:title" content="转换一览 | Conversion index" />
    <meta property="og:description" content="14 种格式、48 条注册路径、界面提供 116 个可选组合。 | 14 formats, 48 registered direct routes, 116 selectable combinations." />
    <meta property="og:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="转换一览 | Conversion index" />
    <meta name="twitter:description" content="14 种格式、48 条注册路径、界面提供 116 个可选组合。 | 14 formats, 48 registered direct routes, 116 selectable combinations." />
    <meta name="twitter:image" content="${SITE.origin}/assets/store/github-social-preview.png" />
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
${shotFigure(shot)}
${lists}
          <p class="fine reveal">
            ${bi(
              '这里列出的是常被搜索的配对，不是全部 116 个；工作台里的目标格式下拉按批次实时给出可用项。',
              'This index lists the pairs people search for, not all 116; the workbench shows what is available for the exact batch you dropped in.',
            )}
          </p>
          <p class="cta-links reveal">
            <a class="btn" href="../#install">${bi('安装步骤', 'Install steps')}</a>
            <a class="btn ghost" href="${SITE.repo}">${bi('GitHub 源码', 'Source on GitHub')}</a>
          </p>
        </article>
      </div>
    </main>
    ${foot}
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
    updated: '2026-09-26',
    changefreq: 'monthly',
    priority: '1.0',
    file: 'docs/index.html',
    dateClaims: [
      /"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/g,
      /最后更新[：:]?\s*(\d{4}-\d{2}-\d{2})/g,
      /Last updated:?\s*(\d{4}-\d{2}-\d{2})/g,
    ],
  },
  blog: {
    path: '/blog/',
    updated: '2026-09-26',
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
    updated: '2026-09-25',
    changefreq: 'yearly',
    priority: '0.6',
    file: 'docs/privacy.html',
    dateClaims: [/最后更新[：:]?\s*(\d{4}-\d{2}-\d{2})/g, /Last updated:\s*(\d{4}-\d{2}-\d{2})/g],
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
validateScreenshots();
validateStaticDates();
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
