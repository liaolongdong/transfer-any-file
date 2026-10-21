/**
 * Content source for the long-tail conversion landing pages under `docs/convert/`.
 *
 * Why a data module instead of hand-written HTML per page: every claim on these pages is a claim about
 * a converter in `utils/converters/`, and `scripts/render-site-pages.mjs` checks each entry
 * against the route baseline (`scripts/__baseline__/conversion-paths.json`) and the block list in
 * `utils/core/conversion-policy.ts` before it emits anything. A page that advertises a pair the app does
 * not offer — or omits a limit the code imposes — fails the build rather than shipping. Hand-written
 * pages cannot be checked that way, which is how marketing copy usually drifts.
 *
 * Each entry therefore states, in both languages:
 * - `keeps`   what genuinely carries over on this route,
 * - `limits`  what does not, including the documented semantic edges (PDF output is rendered, no OCR,
 *   BMP/GIF/SVG are input-only),
 * - `notes`   operating facts the picker will otherwise surprise the reader with (multi-sheet → ZIP,
 *   batch ceilings, the quality dial only on lossy containers),
 * - `faq`     the questions a reader of that specific pair actually arrives with.
 * - `shot`    which workbench screenshot the page shows, keyed by the `SCREENSHOTS` table below.
 *
 * Numbers quoted here are the governed set (`pnpm verify:numbers` derives them from code), so they must
 * be written in a shape the guard recognises: 「14 种格式」/ `14 formats`, 「200 个」/ `200 files`.
 */

export const SITE = {
  origin: 'https://liaolongdong.github.io/transfer-any-file',
  repo: 'https://github.com/liaolongdong/transfer-any-file',
  // The live store entry (item ID `blkdmpkcaceicinkhindniepbbbaekkb`, measured live on 2026-10-02), so the
  // 「装好扩展后点图标」 sentence these CTAs sit under is now one click away instead of a trip back to the
  // product page. Short form — bare ID under `/detail/` — is the convention *inside this repository*: the
  // store redirects to the slug form itself, and `cross-origin-proxy`'s docs test claims every
  // `detail/<32 chars>` link on its pages as its own ID, so the slug form is what the sibling repos'
  // cross-link cards carry. Facts and both forms: `.github/CHROMEWEBSTORE.md` → 现网状态.
  store: 'https://chromewebstore.google.com/detail/blkdmpkcaceicinkhindniepbbbaekkb',
  product: 'https://liaolongdong.github.io/transfer-any-file/',
  privacy: 'https://liaolongdong.github.io/transfer-any-file/privacy.html',
  // The profile `docs/blog/index.html` already credits in its `BlogPosting.author`; the same person
  // wrote these pages, so the `Article` nodes point at the same identity rather than inventing one.
  author: 'https://github.com/liaolongdong',
  // `<meta name="theme-color">` cannot read a CSS custom property, so this is the one place the brand
  // blue is written as a literal in the generator. It is `--brand` in `docs/assets/content.css`, and
  // the two have to move together — the colour painted on the browser chrome is the colour of the links.
  themeColor: '#2563eb',
};

/**
 * The application the generated pages are about — the same node `docs/index.html` defines as `#app`.
 *
 * Each generated page used to inline its own anonymous `SoftwareApplication` carrying only a name and an
 * operating system. To a crawler that is a second, differently-shaped app per page rather than one entity
 * described 36 times, and the fields that make the entity legible (category, price, free access) were the
 * ones missing. So the pages restate this object under the root's `@id`, and `pnpm verify:meta` compares it
 * against the hand-written node in `docs/index.html` — the two copies exist, so the agreement is asserted.
 *
 * `softwareVersion` is deliberately absent: the generator fills it from `package.json`. A version literal
 * here, or in a page, is how a site goes on advertising a release that has already been superseded.
 */
export const APP = {
  '@type': 'SoftwareApplication',
  '@id': `${SITE.origin}/#app`,
  name: 'Transfer Any File',
  url: `${SITE.origin}/`,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem:
    'Chrome OS, Windows, macOS, Linux (Google Chrome 88+, or any Chromium browser with Manifest V3 support)',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

/**
 * The social card every page declares as its `og:image`.
 *
 * `alt` is an attribute, not content: it reaches a screen reader through the accessibility tree (where a
 * bilingual string is read twice) and whatever is written here is what image search indexes. So this carries
 * one language — English, the same string `docs/index.html` uses for the same file.
 */
export const SOCIAL_IMAGE_ALT =
  'Transfer Any File brand mark and the headline "Convert 14 file formats without uploading a byte" beside a screenshot of the workbench converting a Markdown file to HTML.';

/**
 * The date the pair content below was last revised. It is the only `lastmod` the generator has for the
 * pages it writes, and it lands in `docs/sitemap.xml`; bump it together with a content change so the
 * date a crawler reads is the date the claim was actually edited.
 *
 * The 2026-10-08 revision is the CTA: every page this writes now leads with the store install button, so
 * the 36 published files changed as a set even though no prose moved. The 2026-10-12 revision is prose —
 * the English `title` and `desc` of 34 entries were rewritten to fit Google's display budget, which the
 * generator now enforces, so this date and that budget have to move together. The 2026-10-17 revision
 * corrects two claims that had gone false: TXT→MD no longer says "strict UTF-8" (the decoder now accepts
 * UTF-16 and GB18030/GBK), and HTML→PNG now discloses the full-page height ceiling that makes it fail.
 * The 2026-10-21 revision adds six more — TXT→PDF, DOCX→TXT, GIF→PDF, SVG→HTML, CSV→HTML and XLSX→TXT.
 * The 2026-10-20 revision adds eight pages — HTML→DOCX, HTML→MD, HTML→TXT, WebP→PNG, WebP→PDF,
 * GIF→JPEG, XLSX→HTML and PNG→HTML — so the date moves with them.
 */
export const PAGES_UPDATED = '2026-10-21';

/**
 * The date the first conversion page entered the repository, used as `datePublished` for every entry that
 * does not declare its own. Unlike {@link PAGES_UPDATED} this one never moves: it is a repository fact,
 * taken from `git log --reverse -- docs/convert` (`b441af2`, 2026-09-25), and it states when the content
 * was written down — not when it went live.
 *
 * It is a default, not a blanket. A page added in a later revision was written down on that revision's
 * date, so it carries `published: '<that date>'` on its own entry; a new entry that omits the field
 * inherits this one and misstates its own history. The first batch is live on the site as of 2026-10-02
 * (`convert/` and, sampled, `convert/pdf-to-text.html` both answer 200); the pages added since are not,
 * because they are still on this branch — which changes nothing about either date.
 */
export const PAGES_PUBLISHED = '2026-09-25';

/**
 * The workbench screenshots a page may show, keyed by the name used in `docs/assets/screenshots/`.
 *
 * These are the same un-captioned captures the store listing and the README use, so no second set of
 * UI imagery exists to drift. `w` / `h` are the intrinsic pixel sizes the `<img>` declares (the
 * generator re-reads the PNG header and fails the build on a mismatch), `alt` describes what is
 * actually on screen rather than the conversion the page is about — an alt that restates the heading
 * would be a caption in image search's clothing — and `caption` is the claim the shot is shown to
 * support, worded the way `SCREEN_CAPTIONS` in `scripts/capture-store-assets.mjs` burns it into the
 * store screenshots so the two surfaces do not say different things about the same frame.
 */
export const SCREENSHOTS = {
  'workbench-empty': {
    file: 'workbench-empty.png',
    w: 1280,
    h: 800,
    alt: { zh: '工作台空状态：拖放区与格式选择器', en: 'The empty workbench: the drop zone and the format picker' },
    caption: { zh: '拖入、选格式，在你自己电脑上转换', en: 'Drop, pick a format, convert on your own machine' },
  },
  'batch-files': {
    file: 'batch-files.png',
    w: 1280,
    h: 800,
    alt: {
      zh: '工作台里已载入的多个文件，每行带自己的格式标签',
      en: 'Several files loaded in the workbench, each row tagged with its format',
    },
    caption: { zh: '批量：多种源格式，一个目标格式', en: 'Batch: mixed source formats, one target' },
  },
  'batch-results': {
    file: 'batch-results.png',
    w: 1280,
    h: 800,
    alt: {
      zh: '一批转换结果卡片，含文件名、体积与下载入口',
      en: 'A set of result cards with file names, sizes and download actions',
    },
    caption: { zh: '一次混合批量，一个 ZIP 下载', en: 'One mixed batch, one ZIP download' },
  },
  'preview-edit': {
    file: 'preview-edit.png',
    w: 1280,
    h: 800,
    alt: { zh: '左右对照的预览与编辑视图', en: 'The side-by-side comparison and editing view' },
    caption: { zh: '左右对照预览，下载前直接改', en: 'Preview side by side, edit before you download' },
  },
  'output-preset': {
    file: 'output-preset.png',
    w: 1280,
    h: 800,
    alt: {
      zh: '图片输出参数面板与预设条',
      en: 'The image output parameters panel and the preset bar',
    },
    caption: { zh: '尺寸、质量、目标体积，存成一键预设', en: 'Dial in size and quality, save it as a preset' },
  },
};

export const FORMAT_LABEL = {
  md: { zh: 'Markdown', en: 'Markdown', ext: '.md' },
  docx: { zh: 'Word (.docx)', en: 'Word (.docx)', ext: '.docx' },
  xlsx: { zh: 'Excel (.xlsx)', en: 'Excel (.xlsx)', ext: '.xlsx' },
  csv: { zh: 'CSV', en: 'CSV', ext: '.csv' },
  json: { zh: 'JSON', en: 'JSON', ext: '.json' },
  pdf: { zh: 'PDF', en: 'PDF', ext: '.pdf' },
  txt: { zh: '纯文本 (TXT)', en: 'plain text (TXT)', ext: '.txt' },
  html: { zh: 'HTML', en: 'HTML', ext: '.html' },
  png: { zh: 'PNG', en: 'PNG', ext: '.png' },
  // `jpg` is the FileFormat value (and the extension the app writes), while the format's own name is
  // JPEG — so the label says JPEG and the URL says .jpg. Both spellings have to appear in the page copy
  // because people search for both.
  jpg: { zh: 'JPEG', en: 'JPEG', ext: '.jpg' },
  webp: { zh: 'WebP', en: 'WebP', ext: '.webp' },
  // BMP and GIF have no page of their own — a browser writes neither, so they are rows in the index's
  // matrix and never columns. The two entries exist so that matrix labels every `FileFormat` from data
  // rather than from a fallback string that would read `bmp`.
  bmp: { zh: 'BMP', en: 'BMP', ext: '.bmp' },
  gif: { zh: 'GIF', en: 'GIF', ext: '.gif' },
  svg: { zh: 'SVG', en: 'SVG', ext: '.svg' },
};

export const PAIRS = [
  {
    slug: 'markdown-to-word',
    from: 'md',
    to: 'docx',
    shot: 'batch-results',
    title: {
      zh: 'Markdown 转 Word（.docx）——离线、可批量、不上传',
      en: 'Convert Markdown to Word (.docx) offline, in batches',
    },
    desc: {
      zh: '在浏览器本地把 .md 转成 .docx：标题层级、列表、表格、代码块写成真实 Word 段落，不是截图。批量、可预览、零网络请求。',
      en: 'Convert .md to .docx in your browser: headings, lists, tables and code become real Word paragraphs, not a screenshot. Batch, previewable, zero requests.',
    },
    lede: {
      zh: 'README、需求文档、技术笔记写成 Markdown，要交给的却是一个只认 Word 的人。这条链路是 Markdown → HTML → Word：先由 marked 生成语义化 HTML，再打包成 .docx。产出的文字在 Word 里可选中、可改写、可加批注——这是它和「把 Markdown 截图成 PDF」最实际的区别。全程在你自己的电脑上完成，不发请求、不排队、不上传。',
      en: 'A README, a spec, or a release note starts life as Markdown and ends up with someone who only reads Word. This route is Markdown → HTML → Word: marked produces semantic HTML, and the packer turns it into a .docx. The text stays selectable, editable and commentable in Word — the practical difference from photographing your Markdown into a PDF. Every step runs on your own machine: no request, no queue, no upload.',
    },
    keeps: {
      zh: [
        '标题层级、有序与无序列表（含嵌套）、加粗、斜体、删除线、链接、引用块，写成 Word 的段落与样式',
        '表格转成 Word 表格；代码块与行内代码保留为等宽文字',
        '以 data URI 内嵌的图片随文档一起打包，前提是类型在 `png / jpeg / gif / webp / bmp / avif / ico` 之内',
        '输入 .md 按 UTF-8 → GB18030 → GBK 依次解码，老编辑器留下的 GBK 文件也能读',
      ],
      en: [
        'Heading levels, ordered and unordered lists (nested included), bold, italic, strikethrough, links and block quotes become Word paragraphs and styles',
        'Tables become Word tables; code blocks and inline code keep a monospace face',
        'Images embedded as data URIs travel inside the document, provided their type is one of `png / jpeg / gif / webp / bmp / avif / ico`',
        'Input is decoded UTF-8 → GB18030 → GBK, so a file saved by an older editor still reads',
      ],
    },
    limits: {
      zh: [
        '合并单元格、脚注、mermaid 图、@mention 这类扩展语法在 HTML 一步没有对应物，会被降级成普通段落或直接丢掉',
        '指向 http(s) 的外链图片在打包前被剥掉：Word 打开文件时不该替你发起网络请求，这是刻意的取舍（见 utils/converters/html-to-docx.ts 的注释）。相对路径按相对保留，图片文件要与 .docx 放在同一目录 Word 才显示得出来',
        '页边距、字体、行距由 Word 的文档主题决定，CSS 里的那套版式不会跟过来',
      ],
      en: [
        'Merged cells, footnotes, mermaid diagrams and @mentions have no HTML counterpart, so they are flattened into plain paragraphs or dropped',
        'Remote http(s) images are stripped before packing: Word must not issue a network request while opening your file — a deliberate trade-off (see the comment in utils/converters/html-to-docx.ts). Relative paths stay relative, and the image files have to sit next to the .docx for Word to show them',
        'Margins, fonts and line spacing come from Word’s document theme; your CSS layout does not follow',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .md 一起转就逐个产出 .docx，要一次拿全部结果可以打成一个 ZIP',
        '转换结果先在工作台里预览再下载；同一份文档还能接着转成 HTML 或 PDF',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; convert a set of .md files at once and take the results as one ZIP if you prefer',
        'Results preview in the workbench before you download, and the same document can carry on to HTML or PDF',
      ],
    },
    faq: [
      {
        q: { zh: '转出来的 Word 能直接编辑吗？', en: 'Is the resulting Word file editable?' },
        a: {
          zh: '能。产出是真实的段落、列表与样式，文字可选中、可改写、可加批注。若你要的是「看起来一样但不必编辑」的交付物，那一条路是 Markdown 转 PDF——但那份 PDF 是渲染出来的图像，没有文字层。',
          en: 'Yes. The output carries real paragraphs, lists and styles, so text is selectable and commentable. If you only need something that looks the same and never gets edited, that is the Markdown to PDF route instead — but that PDF is a rendered image with no text layer.',
        },
      },
      {
        q: { zh: '需要装 pandoc 或 LibreOffice 吗？', en: 'Do I need pandoc or LibreOffice?' },
        a: {
          zh: '不需要。整条链路是浏览器里的 JavaScript（marked 生成 HTML，再由打包器写成 .docx），没有外部进程、没有服务端、也不下载任何东西。',
          en: 'No. The whole route is JavaScript in the browser — marked produces the HTML and the packer writes the .docx. No external process, no server, nothing fetched.',
        },
      },
      {
        q: {
          zh: '公司合同转成 Word，文件会离开本机吗？',
          en: 'If I convert a contract, does the file leave my machine?',
        },
        a: {
          zh: '不会。扩展只申请 storage 权限，没有 host 权限，产物里也没有从网络取来的代码；文件读取、解析、打包都在标签页内完成。',
          en: 'No. The extension asks for the storage permission only, has no host permissions, and ships no remotely hosted code; reading, parsing and packing all happen inside the tab.',
        },
      },
    ],
  },
  {
    slug: 'word-to-markdown',
    from: 'docx',
    to: 'md',
    shot: 'preview-edit',
    title: {
      zh: 'Word 转 Markdown（.docx → .md）——本地完成，不上传',
      en: 'Convert Word to Markdown (.docx → .md) locally, no upload',
    },
    desc: {
      zh: '浏览器本地把 .docx 转成 Markdown：mammoth 读语义结构，内嵌图片以 data URI 保留，不联网、不排队。支持批量与 ZIP。',
      en: 'Turn .docx into Markdown in your browser: mammoth reads the semantic structure, embedded images come along as data URIs. Offline, batch capable, ZIP output.',
    },
    lede: {
      zh: '把一份 Word 稿件拉进 Markdown 仓库、Wiki 或静态站点生成器，卡的通常不是「能不能转」，而是「转完还要手改多少」。这条链路是 Word → HTML → Markdown：mammoth 读的是 .docx 的语义结构（标题、列表、表格、链接、图片），turndown 再把它写成 Markdown。它搬的是内容与层级，不是版式——这既是你省下手改格式的原因，也是复杂表格会简化的原因。',
      en: 'Getting a Word draft into a Markdown repo, a wiki or a static site generator is rarely blocked by whether it converts at all — it is blocked by how much you re-edit afterwards. This route is Word → HTML → Markdown: mammoth reads the semantic structure of the .docx (headings, lists, tables, links, images) and turndown writes it out as Markdown. It moves content and hierarchy, not layout — which is exactly why your formatting survives, and why an elaborate table arrives simplified.',
    },
    keeps: {
      zh: [
        '标题、列表（含嵌套）、加粗与斜体、链接、段落结构，转成对应的 Markdown 语法',
        '文档内嵌图片会被读出并以 data URI 写进 Markdown，不依赖任何网络——但跟得过去的只有 `png / jpeg / gif / webp / bmp / avif / ico` 这几种位图，TIFF、EMF、WMF 那类在写出 HTML 前就丢了 `src`',
        '表格转成 Markdown 表格；单元格内容保留，合并信息不保留',
        'HTML 中间产物先经 DOMPurify 净化，文档里的可执行脚本不会带进结果',
      ],
      en: [
        'Headings, lists (nested included), emphasis, links and paragraph structure map onto Markdown syntax',
        'Embedded images are read out and written into the Markdown as data URIs, with no network involved — but only these raster types travel: `png / jpeg / gif / webp / bmp / avif / ico`; a TIFF, EMF or WMF loses its `src` before the HTML is written',
        'Tables become Markdown tables: the cell content survives, the merge structure does not',
        'The intermediate HTML passes through DOMPurify, so executable markup in the document is not carried over',
      ],
    },
    limits: {
      zh: [
        '页眉页脚、批注、修订记录、目录域、分栏、文本框不进 Markdown——它们本来也不是 Markdown 能表达的东西',
        'data URI 图片会让 .md 文件明显变大；要提交进 Git 的话，建议转完再用工具把图片外链化',
        '老式 .doc（97-2003 二进制）不在支持的 14 种格式里，先在 Word 里另存为 .docx 再转',
      ],
      en: [
        'Headers and footers, comments, tracked changes, table-of-contents fields, columns and text boxes do not come across — Markdown has no way to express them',
        'data URI images make the .md noticeably heavier; externalise them again before committing to Git',
        'Legacy .doc (97-2003 binary) is outside the 14 supported formats, so save it as .docx first',
      ],
    },
    notes: {
      zh: [
        '一次最多 200 个文件；多份 .docx 批量转，结果按文件名逐个产出，也可以一次拿 ZIP',
        '同一份文档可以先转成 HTML 预览效果，再决定要不要落成 Markdown',
      ],
      en: [
        'Up to 200 files in one run; batch a set of .docx and take the results individually or as one ZIP',
        'The same document can go to HTML first, so you can see the structure before committing to Markdown',
      ],
    },
    faq: [
      {
        q: { zh: '为什么我的表格变简单了？', en: 'Why did my table lose its shape?' },
        a: {
          zh: 'Word 的合并单元格在 HTML 这一步已经无法无损表达，turndown 能写的就是普通行列。需要保住原版的排版，请改用 Word → PDF（那是渲染快照，不是结构化表格）或 Word → HTML。',
          en: 'Merged cells cannot survive the HTML hop losslessly, so what turndown writes is a plain grid. If the layout itself is the point, use Word to PDF (a rendered snapshot, not a table) or Word to HTML instead.',
        },
      },
      {
        q: { zh: '转换会保留图片吗？', en: 'Are the images preserved?' },
        a: {
          zh: '会，内嵌图片以 data URI 形式写在 Markdown 里，因此离线也拿得到。代价是 .md 体积明显变大。',
          en: 'Yes — embedded images are written into the Markdown as data URIs, so they survive without any network. The price is a noticeably heavier .md.',
        },
      },
      {
        q: { zh: '加密或损坏的 .docx 会怎样？', en: 'What happens to an encrypted or broken .docx?' },
        a: {
          zh: '读取失败就在界面上给出该文件的错误提示，批次里其余文件继续转——单个失败不会中断整批。',
          en: 'A file that cannot be read reports its own error in the UI while the rest of the batch continues; one failure never aborts the run.',
        },
      },
    ],
  },
  {
    slug: 'excel-to-csv',
    from: 'xlsx',
    to: 'csv',
    shot: 'batch-files',
    title: {
      zh: 'Excel 转 CSV（.xlsx → .csv）——取值不取显示文本，离线',
      en: 'Excel to CSV (.xlsx → .csv) offline — cell values, not text',
    },
    desc: {
      zh: '浏览器本地把 .xlsx 转成 CSV：按单元格值序列化，日期统一格式，带 UTF-8 BOM，公式注入被转义。多 sheet 每表一份 CSV 装进 ZIP。',
      en: 'Convert .xlsx to CSV in your browser from cell values, not display text: dates normalised, UTF-8 BOM, formula injection escaped, one CSV per sheet in a ZIP.',
    },
    lede: {
      zh: 'Excel 里一个单元格「显示成什么」和「存的是什么」是两件事：1234.5 可以显示为 "1,234.50"，0.25 可以显示为 25.0%。多数转换翻车就翻在这里——导出的其实是显示文本。本项目从单元格值序列化（在 xlsx 0.18.5 上实测过 SheetJS 各条序列化为什做不到，所以走 sheet_to_json 那条），日期统一成机器可读的两段式，文件开头写 UTF-8 BOM，于是 Excel 双击打开不乱码。',
      en: 'In Excel, what a cell displays and what it stores are two different facts: 1234.5 can display as "1,234.50" and 0.25 as 25.0%. Most conversions fail on exactly that line, exporting the display text. This route serialises from the stored value — measured against xlsx 0.18.5, where the obvious serializer cannot do it, which is why it goes through sheet_to_json — normalises dates into one machine-readable shape, and writes a UTF-8 BOM so Excel opens the result without mojibake.',
    },
    keeps: {
      zh: [
        '数值按存储值写出：格式化成 "1,234.50" 的单元格仍然输出 1234.5，百分比显示的 0.25 仍然输出 0.25',
        '日期在读取期就统一为 yyyy-mm-dd hh:mm:ss（只含日期的落成 YYYY-MM-DD），不受所在时区影响',
        '开头写入 UTF-8 BOM，Excel 直接双击打开即正常显示中文',
        '以 = + - @ 制表符 开头的文本被转义，避免 CSV 在 Excel 里被重新执行成公式',
        '引号、逗号、换行按 RFC 4180 规则处理，与 Excel 自己的写出行为一致（实测比对）',
      ],
      en: [
        'Numbers come from the stored value: a cell formatted "1,234.50" still writes 1234.5, and a percentage-displayed 0.25 still writes 0.25',
        'Dates are normalised at read time to yyyy-mm-dd hh:mm:ss (date-only cells land as YYYY-MM-DD), so the result does not depend on your timezone',
        'A UTF-8 BOM heads the file, so Excel opens it with Chinese intact on a double click',
        'Text beginning with = + - @ or a tab is escaped, so the CSV cannot be re-executed as formulas in Excel',
        'Quoting of quotes, commas and line breaks follows RFC 4180 and matches what Excel itself writes out (compared byte for byte)',
      ],
    },
    limits: {
      zh: [
        '多个工作表的工作簿会给出「每表一份 CSV」，一起装进 ZIP；只有一个工作表时直接给 CSV',
        '公式导出为它上次算出的缓存值；从没被计算过的公式没有缓存，导出为空',
        '图表、透视表、条件格式、单元格样式、批注在 CSV 里没有位置，全部不出现',
      ],
      en: [
        'A workbook with several sheets yields one CSV per sheet, packed as a ZIP; a single sheet yields a CSV directly',
        'A formula exports its cached result; a formula never evaluated has no cache to export and comes out empty',
        'Charts, pivot tables, conditional formats, cell styles and comments have nowhere to live in CSV, so they do not appear',
      ],
    },
    notes: {
      zh: [
        '单文件上限 100 MB，一批最多 200 个文件；超过 20 MB 或文件较多时会先请你确认再开转',
        'CSV 是纯文本，结果也能直接在工作台里预览和复制',
      ],
      en: [
        '100 MB per file and 200 files per batch; above 20 MB or a large count the app asks before starting',
        'CSV is plain text, so the result previews in the workbench and can be copied from there',
      ],
    },
    faq: [
      {
        q: { zh: '为什么多 sheet 给了一个 ZIP？', en: 'Why a ZIP for multiple sheets?' },
        a: {
          zh: '因为一个 CSV 只能表达一张平面表格，而把多个 sheet 拼进一个文件会制造无法还原的行。每表一份 CSV、文件名取工作表名，是唯一不撒谎的结果形状。',
          en: 'A CSV can express exactly one flat grid, and merging sheets into one file manufactures rows that cannot be undone. One CSV per sheet, named after the worksheet, is the only result shape that does not lie.',
        },
      },
      {
        q: { zh: 'Excel 打开 CSV 出现乱码怎么办？', en: 'Excel shows mojibake when opening the CSV — why?' },
        a: {
          zh: '本项目已在 CSV 开头写入 UTF-8 BOM，双击打开通常就正常了。若你用的是「数据 → 从文本」导入向导，请手工选 UTF-8。',
          en: 'The file already carries a UTF-8 BOM, which is what makes a double click read correctly. If you go through the Data → From Text import wizard instead, choose UTF-8 there yourself.',
        },
      },
      {
        q: { zh: '.xls（97-2003）能转吗？', en: 'Does it take .xls (97-2003)?' },
        a: {
          zh: '输入侧支持的是 .xlsx；老的二进制 .xls 请先在 Excel 里另存为 .xlsx。',
          en: 'The supported input is .xlsx; save legacy binary .xls as .xlsx first.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-excel',
    from: 'csv',
    to: 'xlsx',
    shot: 'batch-files',
    title: {
      zh: 'CSV 转 Excel（.csv → .xlsx）——长数字不被改坏，离线',
      en: 'CSV to Excel offline — long numbers stay as written',
    },
    desc: {
      zh: '浏览器本地把 .csv 转成 .xlsx：只有能精确回写的字段才当数字存，长编号与前导零原样保留；GBK/GB18030 编码自动兜底。',
      en: 'Convert .csv to .xlsx in your browser: only fields that round-trip exactly become numbers, so long IDs and leading zeros survive. GBK / GB18030 decodes itself.',
    },
    lede: {
      zh: 'CSV 进 Excel 的经典事故是这样的：一个 18 位身份证号变成 4.11111111111111E+17，"007" 变成 7，事后还没法还原——原值已经不在了。这里的判定条件写得比「看起来像不像数字」更严：字段解析成数字后再写回，必须与原文完全一致才当数字存。凡是回写不上的一致性子串——超长整数、前导零、科学计数写法——一律按文本存，原样保留。',
      en: 'The classic CSV-into-Excel accident goes like this: an 18-digit ID becomes 4.11111111111111E+17, "007" becomes 7, and there is no way back, because the original value is gone. The test applied here is stricter than "does it look like a number": a field is stored as a number only if parsing it and re-printing it reproduce the original text exactly. Anything that fails that round trip — oversized integers, leading zeros, exponent spellings — is stored as text and kept verbatim.',
    },
    keeps: {
      zh: [
        '只在「解析→回写完全一致」时判为数值单元格，因此长编号、前导零、多余的空白写法都不会被静默改写',
        'Excel 只显示 15 位有效数字，这条规则由上面那个判定承担，而不是事后靠特例列表去补',
        'CSV 里以 = + @ 开头的字段被转义，落成 .xlsx 后不会被重新执行',
        '输入按 UTF-8 → GB18030 → GBK 依次尝试解码，国内 Excel 另存的 GBK CSV 直接可读',
      ],
      en: [
        'A cell becomes numeric only when parse-then-reprint reproduces the field exactly, so long IDs, leading zeros and unusual spellings are never silently rewritten',
        'Excel renders 15 significant digits; that limit is absorbed by the round-trip test above rather than a list of special cases afterwards',
        'Fields beginning with = + @ are escaped, so the .xlsx cannot re-execute them',
        'Input is decoded UTF-8 → GB18030 → GBK, so a GBK CSV saved by a Chinese Excel reads correctly straight away',
      ],
    },
    limits: {
      zh: [
        '一个 CSV 只有一张表；要多个工作表请把多份 CSV 一起放进批次，或转完在 Excel 里合并',
        'CSV 里没有的信息不会被凭空造出来：样式、列宽、公式、合并单元格、日期格式都不会出现',
        '看起来像日期的字符串（例如 1-2-3）不会被猜测成日期，会按原文保留',
      ],
      en: [
        'One CSV holds one grid; for several sheets batch several CSVs or merge them in Excel afterwards',
        'Nothing is invented that CSV never carried: no styles, column widths, formulas, merged cells or date formats appear',
        'A string that merely looks like a date (1-2-3, say) is not guessed as one — it stays as written',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个 100 MB 上限；结果文件名默认在源名后加日期与时间，模板可在偏好设置里改',
        '需要「同一份数据既要 CSV 又要 Excel」时，可以在工作台里连续两步转，不必回到源文件',
      ],
      en: [
        'Up to 200 files per batch and 100 MB each; names default to the source name plus date and time, and the pattern is editable in preferences',
        'When you need both CSV and Excel from the same data, chain the two conversions in the workbench instead of going back to the source',
      ],
    },
    faq: [
      {
        q: { zh: '为什么有些数字变成了文本？', en: 'Why did some numbers become text?' },
        a: {
          zh: '这正是保护。回写不一致的数字一旦按数值存，Excel 显示会四舍五入或转科学计数，原值再也回不来。按文本存时你在 Excel 里看到的是写进去的那串字符本身。',
          en: 'That is the protection working. A number that fails the round trip and is stored as a value will be rounded or shown in scientific notation by Excel, and the original is unrecoverable. As text, the cell shows exactly the characters you wrote.',
        },
      },
      {
        q: { zh: '我需要把它们变成数字怎么办？', en: 'What if I do want them as numbers?' },
        a: {
          zh: '在 Excel 里对目标列做分列或值转换即可——本项目的默认是「值保真」，不替你猜意图。',
          en: 'Use Excel’s own text-to-columns or value coercion on that column — the default here is value fidelity, which does not guess at your intent.',
        },
      },
      {
        q: {
          zh: '逗号分隔以外（分号、制表符）支持吗？',
          en: 'Is anything other than comma supported (semicolon, tab)?',
        },
        a: {
          zh: '支持。分隔符是读的时候自动判断的，逗号、分号、制表符、竖线都能直接转，不用先另存一遍。判断结果不对时（比如正文里逗号特别多），在文件最前面加一行 sep=; 显式告诉它用哪个。',
          en: 'Yes. The delimiter is sniffed while reading, so comma, semicolon, tab and pipe all convert as they are — no re-save first. When the guess is wrong (a body full of commas, say), put sep=; on the first line to say which one to use.',
        },
      },
    ],
  },
  {
    slug: 'json-to-csv',
    from: 'json',
    to: 'csv',
    shot: 'batch-files',
    title: {
      zh: 'JSON 转 CSV——对象数组离线落成表格',
      en: 'JSON to CSV — an array of objects becomes a table',
    },
    desc: {
      zh: '浏览器本地把 JSON 对象数组转成 CSV：表头取所有键的并集，嵌套值以 JSON 文本入格，公式注入被转义，带 UTF-8 BOM。',
      en: 'Convert a JSON array of objects to CSV locally: headers are the union of every key, nested values land as JSON text, formula injection is escaped, UTF-8 BOM.',
    },
    lede: {
      zh: '接口给了一个数组，你要的是能发给同事的一张表。规则很简单：取数组里所有对象的键并集当表头，缺失的键留空，嵌套的对象与数组按 JSON 文本写进单元格。所以它不做的是「替你把结构拍平」——那一步需要知道你的数据语义，机器不该猜。整个转换在标签页里完成，数据不出本机。',
      en: 'An API handed you an array and what you need is a table a colleague can open. The rule is simple: headers are the union of every key across the objects, absent keys come out empty, and a nested object or array is written into its cell as JSON text. What this deliberately does not do is flatten your structure for you — that step needs to know what your data means, and a machine should not guess. All of it happens in the tab, and the data never leaves your machine.',
    },
    keeps: {
      zh: [
        '表头为所有对象键的并集，顺序按首次出现，缺失键留空而不是错位',
        'null 与缺字段都写为空单元格，数字与布尔按原值写',
        '嵌套对象与数组以 JSON 文本入格，信息不丢，便于下一步用 jq 或 Excel 公式处理',
        '标量或嵌套数组没有键可挂时写进一列 `_value`；若记录本身已用该键，合成列自动改名，绝不丢行',
        '字符串以 = + - @ 开头时转义，防止一个 JSON 字段在 Excel 里被当成公式执行',
      ],
      en: [
        'Headers are the union of all keys, ordered by first appearance; a missing key becomes an empty cell rather than a shifted row',
        'null and absent fields both write empty; numbers and booleans write their value',
        'Nested objects and arrays land in the cell as JSON text, so nothing is lost and a next step in jq or a spreadsheet formula can use them',
        'A scalar or nested array with no keys lands in a single `_value` column; if a record already uses that key the synthetic column is renamed, so no row is dropped',
        'A string beginning with = + - @ is escaped, so one JSON field cannot execute as a formula in Excel',
      ],
    },
    limits: {
      zh: [
        '输入必须是包含数据的数组。单独一个对象、空数组或一组空对象会报错（errors.jsonNotArray），而不是给你一个看起来成功的空文件',
        '不做扁平化：a.b.c 不会被拆成三列，需要拆就先用 jq 或「转成 Excel」之前的加工做一次',
        '不读取网络上的 JSON：文件必须是本地的那一份',
      ],
      en: [
        'The input must be an array containing data. A bare object, an empty array, or an array of empty objects reports an error (errors.jsonNotArray) instead of producing a file that looks like success and is empty',
        'No flattening: a.b.c is not split into three columns. Flatten first with jq if the result has to be a flat grid',
        'It never reads JSON from the network — it has to be the local copy',
      ],
    },
    notes: {
      zh: [
        'CSV 开头带 UTF-8 BOM，Excel 双击打开中文不乱码',
        '同一份 JSON 也可以直接转成 .xlsx 或 HTML 表格预览；批量最多 200 个文件',
      ],
      en: [
        'The CSV heads with a UTF-8 BOM so Excel opens Chinese correctly on a double click',
        'The same JSON can go straight to .xlsx or to an HTML table for preview; up to 200 files per batch',
      ],
    },
    faq: [
      {
        q: { zh: '为什么提示我 JSON 格式不对？', en: 'Why is it telling me the JSON is wrong?' },
        a: {
          zh: '最常见的是根节点不是数组。表格是二维结构，数组里的每个元素才是一行；对象没有「行」的天然含义，所以宁可报错也不替你猜。',
          en: 'The usual cause is a root that is not an array. A table is two-dimensional and each element of the array is one row; a bare object has no natural notion of a row, so the app reports an error rather than guessing.',
        },
      },
      {
        q: { zh: '嵌套字段能变成列吗？', en: 'Can nested fields become columns?' },
        a: {
          zh: '不会自动。可以先用 jq 拍平（例如 [.[] | {id, name: .user.name}]）再转，或直接转成 .xlsx 后在 Excel 里加工。',
          en: 'Not automatically. Flatten first with jq (say [.[] | {id, name: .user.name}]) and then convert, or convert to .xlsx and reshape it in Excel.',
        },
      },
      {
        q: { zh: '大文件会不会把浏览器卡住？', en: 'Will a big file lock up the browser?' },
        a: {
          zh: '解析在主线程完成，单个文件上限 100 MB；解析失败会给出该文件的错误提示，批次里其余文件继续。',
          en: 'Parsing happens on the main thread with a 100 MB ceiling per file; a file that fails reports its own error while the rest of the batch continues.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-text',
    from: 'pdf',
    to: 'txt',
    shot: 'preview-edit',
    title: {
      zh: 'PDF 转文本（.pdf → .txt）——本地提取文字层，不上传',
      en: 'PDF to text locally — the text layer, no OCR',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 提取 PDF 文字层，输出纯文本或 Markdown。扫描件没有文字层，所以这条对图片型 PDF 无解——项目不含 OCR。',
      en: 'pdf.js in your browser pulls the PDF text layer out as .txt or Markdown. A scan has no text layer, so image-only PDFs are a dead end here: the app ships no OCR.',
    },
    lede: {
      zh: '先把最容易被忽略的一条说清楚：能提出文字的 PDF，是「字原本是文字」的那一类——从 Word、LaTeX、网页导出的 PDF。扫描件与拍照件是像素，里面并没有文字层，提取出来自然是空的；把它变成文字需要 OCR，而 OCR 模型要几十 MB、需要联网下载，与「一个字节都不出本机」的前提直接冲突，所以本项目不带，也不会假装能带。',
      en: 'The part most pages leave out: PDF text extraction works on PDFs whose words were always words — exports from Word, LaTeX, or a web page. A scan or a photo is pixels with no text layer inside, so extraction returns nothing. Turning that into text needs OCR, and an OCR model runs to tens of megabytes downloaded over a network, which contradicts the premise that not a byte leaves your machine. So this extension has none and does not pretend otherwise.',
    },
    keeps: {
      zh: [
        '文字层按阅读顺序提取，pdf.js 在你的机器上完成解析',
        '链接标注保留为超链接，并按协议白名单过滤——javascript: 与 data: 这类由 PDF 自带的可点击地址会被剔除',
        '同一份 PDF 还能转成 Markdown（保留标题与段落层级）或 HTML，比纯文本更可后续加工',
      ],
      en: [
        'The text layer is extracted in reading order, parsed by pdf.js on your own machine',
        'Link annotations survive as hyperlinks, filtered by a scheme allowlist — javascript: and data: targets carried by the PDF are removed',
        'The same PDF can also go to Markdown, which keeps heading and paragraph hierarchy, or to HTML, both easier to keep editing than bare text',
      ],
    },
    limits: {
      zh: [
        '扫描件、拍照件、图片型 PDF 提取为空——没有 OCR，也不会替你猜',
        '版式不进 TXT：分栏、页眉页脚、字体、颜色、嵌入图片都会消失；PDF 里的表格只是排过版的字符，不是结构化表格',
        '因此 PDF → CSV / JSON / Excel 在界面上是置灰的，不是点了才报错（PDF 不携带表格结构，见 utils/core/conversion-policy.ts）',
        '带密码的 PDF 不会静默处理，读取失败会给出该文件的错误提示',
      ],
      en: [
        'Scans, photographs and image-only PDFs come out empty — there is no OCR and no guesswork in its place',
        'Layout does not enter TXT: columns, headers and footers, fonts, colour and embedded images are gone; a table in a PDF is typeset characters, not structure',
        'That is why PDF → CSV / JSON / Excel is greyed out in the picker instead of failing after you click: a PDF carries no table structure (see utils/core/conversion-policy.ts)',
        'A password-protected PDF is not handled silently; a file that cannot be read reports its own error',
      ],
    },
    notes: {
      zh: [
        '多份 PDF 可以一批处理，单个上限 100 MB，一批最多 200 个文件',
        '需要「每页一张图」的产物请走 PDF → 图片，多页会一页一张装进 ZIP',
      ],
      en: [
        'Several PDFs run in one batch, 100 MB per file and 200 files per run',
        'For one-image-per-page output take the PDF to image route instead, which yields one page per image inside a ZIP',
      ],
    },
    faq: [
      {
        q: { zh: '为什么转出来几乎是空的？', en: 'Why did I get almost nothing back?' },
        a: {
          zh: '几乎总是因为它本来就是图片。判断方法：在原来的 PDF 里用鼠标选一下文字——选不动就是扫描件，需要 OCR（本项目不提供）。',
          en: 'Almost always because the PDF was an image all along. Test it in the original file: try selecting a word with the mouse. If nothing selects, it is a scan and needs OCR — which this project does not provide.',
        },
      },
      {
        q: { zh: '表格能被还原成 Excel 吗？', en: 'Can the tables be recovered into Excel?' },
        a: {
          zh: '不能，这条是刻意的。PDF 的表格只有视觉排布，没有行列结构，硬转只会产出错位的垃圾表格。要结构化数据请回到导出 PDF 之前的源文件（Excel / CSV / JSON），或用 PDF → 文本后手工整理。',
          en: 'No, and deliberately. A PDF table is a visual arrangement with no row/column structure, so forcing it yields a misaligned mess. Go back to the file the PDF was exported from (Excel, CSV, JSON), or tidy the extracted text by hand.',
        },
      },
      {
        q: { zh: 'PDF 里的图片能提取出来吗？', en: 'Can the images inside be extracted?' },
        a: {
          zh: '不能按对象取出。要图片请走 PDF → 图片，它把每一页整页栅格化成 PNG（多页装 ZIP）。',
          en: 'Not as embedded objects. For images take PDF to image, which rasterises each page to PNG and ZIPs the pages together.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-pdf',
    from: 'md',
    to: 'pdf',
    shot: 'batch-results',
    title: {
      zh: 'Markdown 转 PDF——离线渲染成 A4，产物是图像不是文字层',
      en: 'Markdown to PDF offline — the output is an image, not text',
    },
    desc: {
      zh: 'Markdown → HTML → PDF，本地按 A4 逐页切片成图像型 PDF。好处是哪台机器打开都一样，代价是没有文字层、不可选中检索。',
      en: 'Markdown → HTML → PDF, sliced page by page onto A4 locally. It looks identical everywhere; the price is no text layer, so nothing is selectable or searchable.',
    },
    lede: {
      zh: '这条链路给的是「打印件」，不是「文档」。Markdown 先渲染成 HTML，再整页栅格化、按 A4 宽度切片写成 PDF 页面。于是不管接收方用什么设备、装没装中文字体，看到的都和你看到的一样。也正因为它是渲染出来的图像，PDF 里的文字选不中、复制不走、搜索引擎检索不到，文件体积比文字型 PDF 大一截。要不要这条，取决于你要交付的是观感还是内容。',
      en: 'What this route produces is a printout, not a document. Markdown is rendered to HTML, the page is rasterised whole, and it is sliced onto A4 to become PDF pages. The result looks the same on every device, fonts or no fonts. And because it is a rendered image, the words in that PDF cannot be selected, copied or searched, and the file is heavier than a text-based PDF. Whether that is the right trade depends on whether you are delivering an appearance or a content.',
    },
    keeps: {
      zh: [
        '排版观感：标题层级、列表、表格、代码块、引用块、图片按 HTML 渲染结果落到页面上',
        'A4 宽度、逐页切片，长文档会自然分页，不是一整条长图',
        '页面最长边受 8192 px 上限保护，超长文档在编码前先行缩放而不是崩溃',
      ],
      en: [
        'The appearance: heading hierarchy, lists, tables, code blocks, quotes and images land on the page as the HTML renders them',
        'A4 width with page-by-page slicing, so a long document flows into pages instead of one tall strip',
        'The raster is capped at an 8192 px longest edge, so an enormous document downscales instead of failing',
      ],
    },
    limits: {
      zh: [
        '没有文字层：PDF 里的字选不中、复制不走、无法全文检索、屏幕阅读器读不到——它是一页页图像',
        '文件明显大于同内容的文字型 PDF',
        '页边距与分页位置由渲染高度决定，不能像 Word 那样指定「第 3 页开始」；跨页的表格可能被切成两段',
        '图片引用只有 data URI 与 blob 能落地：远程与相对路径引用在渲染前就换成虚线方框占位（相对路径在沙箱里指向扩展包，不在你文件所在的目录），而解不开的 data: 与已撤销的 blob: 会在那处直接留空，转换过程不下载任何东西，结果卡片按张数说明有多少处',
      ],
      en: [
        'No text layer: the words cannot be selected, copied, full-text searched or read by a screen reader — the pages are images',
        'Noticeably heavier than a text-based PDF of the same content',
        'Margins and page breaks follow the rendered height; you cannot dictate "start on page 3", and a tall table can be cut in two',
        'Only a data URI or a blob reference survives: a remote or a relative one becomes a dashed placeholder box before rendering (inside the sandbox a relative path points into the extension package, not next to your file), one the browser cannot decode any more — a revoked blob:, a data: payload it will not read — leaves that position empty, the conversion downloads nothing, and the result card counts how many positions were affected',
      ],
    },
    notes: {
      zh: [
        '如果接收方要能改，请走 Markdown → Word，那才是可编辑的产物',
        '批量最多 200 个文件；多个 PDF 结果可一次打包成 ZIP 下载',
      ],
      en: [
        'If the recipient has to edit, take Markdown to Word instead — that is the editable artifact',
        'Up to 200 files per batch; several PDFs can come back in one ZIP',
      ],
    },
    faq: [
      {
        q: { zh: '为什么 PDF 里的文字选不中？', en: 'Why can’t I select the text in the PDF?' },
        a: {
          zh: '因为产物是每页一张图像，浏览器端不做文字层排版。需要可选中、可检索的 PDF，本项目给不了；需要可编辑交付请用 Word，需要文本用 PDF → 文本的反向思路处理原始 Markdown。',
          en: 'Because each page is one image, and no text layer is laid down on the browser side. A selectable, searchable PDF is not something this route can promise; for an editable deliverable use Word, and keep the Markdown itself as your text source.',
        },
      },
      {
        q: { zh: '能控制纸张大小或方向吗？', en: 'Can I choose paper size or orientation?' },
        a: {
          zh: '当前固定 A4 纵向，页宽 210 mm。这是产物的既有语义，改动会影响历史批次与预设，不在这条链路的选项里。',
          en: 'It is fixed at A4 portrait, 210 mm wide. That is settled behaviour of this artifact, and changing it would move historical batches and presets, so it is not an option on this route.',
        },
      },
      {
        q: { zh: '为什么表格被切开了？', en: 'Why was my table split across pages?' },
        a: {
          zh: '分页发生在渲染高度上，切到一半是栅格化切片的正常结果。想要不断开的表格，把内容改短或在表格前后分段，或转成 HTML / Word 让排版器自己处理。',
          en: 'Page breaks follow rendered height, so a split is normal for a slice-based raster. Shorten the block, break the document there yourself, or go to HTML / Word and let a layout engine handle it.',
        },
      },
    ],
  },
  {
    slug: 'word-to-pdf',
    from: 'docx',
    to: 'pdf',
    shot: 'batch-results',
    title: {
      zh: 'Word 转 PDF——离线出 A4 图像，版式由浏览器决定',
      en: 'Word to PDF offline — an A4 image, laid out by the browser',
    },
    desc: {
      zh: 'Word → HTML → PDF：mammoth 读语义结构后整页栅格化，按 A4 切片。文字层没有，版式与 Word 打印不尽相同，先预览再下载。',
      en: 'Word → HTML → PDF: mammoth reads the structure, the page is rasterised onto A4. No text layer, and the layout is not Word’s own print output — preview first.',
    },
    lede: {
      zh: '「Word 转 PDF」这件事在桌面上是 Word 自己做的：调用排版引擎，输出带文字层的 PDF。浏览器里这条链路走的是另一条路——mammoth 先把 .docx 读成语义 HTML，再整页栅格化、按 A4 切片。结果是：任何设备打开都长一样，但文字层没有，且版式与 Word 打印会有出入，因为排版由浏览器与系统字体决定，不由 Word 决定。',
      en: 'On a desktop, Word makes the PDF itself: a layout engine, a text layer, fidelity. This browser route is a different animal — mammoth reads the .docx as semantic HTML, the page is rasterised whole and sliced onto A4. You get a file that looks the same on every device, and you give up the text layer, and the layout can drift from Word’s own print because the browser and your system fonts do the typesetting, not Word.',
    },
    keeps: {
      zh: [
        '内容结构：标题、列表、表格、加粗斜体、内嵌图片按语义 HTML 渲染到页面上',
        'A4 逐页切片，长文档自然分页；最长边 8192 px 上限兜底',
        '中间 HTML 经 DOMPurify 净化，文档内的可执行标记不进入产物',
      ],
      en: [
        'The structure: headings, lists, tables, emphasis and embedded images render onto the page from the semantic HTML',
        'A4 slicing page by page, with an 8192 px longest-edge cap protecting very long documents',
        'The intermediate HTML passes through DOMPurify, so executable markup in the document never reaches the artifact',
      ],
    },
    limits: {
      zh: [
        '没有文字层：PDF 里的文字选不中、检索不到，屏幕阅读器也读不到',
        '页边距、分页、字体与 Word 打印不同；缺字体时用系统回退，字形宽度一变，分页位置就跟着变',
        '页眉页脚、目录域、批注、修订不进渲染；样式表意义上的 Word 主题不生效',
        '要「可被检索的归档 PDF」请回到 Word 自己导出；这条适合的是分发观感',
      ],
      en: [
        'No text layer — nothing selectable, searchable, or readable by a screen reader',
        'Margins, breaks and fonts differ from Word’s print; a missing font falls back to a system face, and once glyph widths change, every page break after it moves',
        'Headers and footers, TOC fields, comments and tracked changes do not enter the render, and the Word theme does not apply',
        'For a searchable archival PDF let Word export it yourself; this route is for distributing an appearance',
      ],
    },
    notes: {
      zh: ['先转成 HTML 预览，是判断分页与字体是否可接受的最快办法', '批量最多 200 个文件；多个 PDF 一次打包下载'],
      en: [
        'Converting to HTML first is the fastest way to judge whether the breaks and fonts are acceptable',
        'Up to 200 files per batch; several PDFs can arrive in one ZIP',
      ],
    },
    faq: [
      {
        q: { zh: '为什么和我在 Word 里导出的 PDF 不一样？', en: 'Why does it differ from Word’s own PDF?' },
        a: {
          zh: '因为排版者不同：这条链路是浏览器按语义 HTML 排版并用系统字体，Word 用自己的排版与主题字体。文字层与逐字保真请交给 Word。',
          en: 'Because a different engine does the typesetting: here the browser lays out semantic HTML with your system fonts, while Word uses its own engine and theme fonts. Give Word the job when the text layer and character-exact layout are the point.',
        },
      },
      {
        q: { zh: '那这份 PDF 适合做什么？', en: 'So what is this PDF good for?' },
        a: {
          zh: '发给不需要改的人：审稿预览、打印分发、把 Markdown 或 Word 内容固定成一个观感。合同归档与检索场景不适合。',
          en: 'Sending it to people who will not edit it: a review preview, a print distribution, freezing document content into one appearance. It is the wrong artifact for contract archives or anything that has to be searched.',
        },
      },
      {
        q: { zh: '支持 .doc 吗？', en: 'Is .doc supported?' },
        a: {
          zh: '不支持。97-2003 的二进制 .doc 不在支持的 14 种格式里，请先另存为 .docx。',
          en: 'No. Binary .doc from 97-2003 is outside the 14 supported formats, so save it as .docx first.',
        },
      },
    ],
  },
  {
    slug: 'png-to-webp',
    from: 'png',
    to: 'webp',
    shot: 'output-preset',
    title: {
      zh: 'PNG 转 WebP——本地批量压体积，质量与目标大小可调',
      en: 'PNG to WebP locally — batch it, tune quality or target size',
    },
    desc: {
      zh: '浏览器里把 PNG 编成 WebP，透明通道保留，质量档与目标体积先走质量阶梯再缩像素。最多 200 张一批，结果可打 ZIP。',
      en: 'Encode PNG to WebP in the browser with alpha preserved. The target-size lever walks the quality ladder before it throws pixels away; 200 images per batch.',
    },
    lede: {
      zh: '同一张图，WebP 常常比 PNG 小一大截，而透明通道仍在。这里没有上传：解码、重编码、体积控制都发生在你自己的标签页里。质量参数与目标体积的处理顺序是有讲究的——先沿质量阶梯往下试，质量已经到底还够不着目标，才开始缩边；所以「目标 200 KB」是一个追着去的上限，不是保证值，细节写在下面。',
      en: 'The same picture often shrinks a lot as WebP while keeping its alpha channel. Nothing is uploaded here: decoding, re-encoding and size control all happen in your own tab. The order of operations matters and is deliberate — the encoder walks the quality ladder first, and only when quality has bottomed out without reaching the target does it start giving up pixels. So “target 200 KB” is a ceiling being chased, not a promise, and the details are below.',
    },
    keeps: {
      zh: [
        '透明通道与 Alpha：WebP 编码保留 PNG 的半透明信息',
        '质量档（40%–90%）与目标体积（20 KB–2 MB）在输出参数面板里选，两者只在链路末尾那次编码生效',
        '最长边可先缩到 800–4096 px 之间；编码器另有 8192 px 硬上限，超过就先缩而不是静默裁切',
        '同一批可以同时出 JPEG 与 PNG，三种可写格式的质量档共享同一套语义',
      ],
      en: [
        'The alpha channel: WebP keeps what PNG carried, translucency included',
        'Quality steps from 40% to 90% and target sizes from 20 KB to 2 MB, chosen in the output panel and applied only at the encoding step at the end of the route',
        'A longest edge of 800–4096 px to downscale to, with a hard 8192 px encoder ceiling behind it — oversized renders shrink rather than clip',
        'The same batch can also emit JPEG and PNG, the three writable formats sharing one quality vocabulary',
      ],
    },
    limits: {
      zh: [
        '目标体积是「追得上就追」：质量降到底仍不够时会继续缩像素，但极小的目标可能到不了，产物只保证不超过约束能达到的最小值',
        '有损编码不可逆：WebP / JPEG 反复转手的每一次都在丢信息，请始终从原始 PNG 出发',
        'GIF 动图取首帧（只有真含多帧时才提示丢帧）；BMP / GIF / SVG 不能被浏览器编码，所以只能作为输入',
        '不做 OCR、不做智能裁剪、不替你去网上取图',
      ],
      en: [
        'A target size is chased, not guaranteed: once quality bottoms out the encoder starts shedding pixels, and a very small target may still be unreachable',
        'Lossy is not reversible — every extra WebP or JPEG handoff discards more. Always start from the original PNG',
        'Animated GIF yields its first frame (and says so only when the file really had several); BMP, GIF and SVG cannot be encoded by a browser, so they are input-only',
        'No OCR, no smart crop, and it never fetches an image for you',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 张、单张上限 100 MB；结果可一次打包成 ZIP',
        '输出参数在界面里设置后会被记住，同一批的所有图片共用一次设置',
      ],
      en: [
        'Up to 200 images per batch and 100 MB each, downloadable as one ZIP',
        'The output settings persist between runs and apply to every file in the batch from one read',
      ],
    },
    faq: [
      {
        q: { zh: '为什么设了目标大小还是超了？', en: 'Why did it still miss my target size?' },
        a: {
          zh: '因为可用的杠杆有尽头：质量档走到最低、边长缩到上限以内仍达不到时，产物就是当前最小可行结果。想要更小，得改图像本身（尺寸、色数、内容复杂度）。',
          en: 'Because the available levers bottom out: if the lowest quality and the smallest permitted edge still exceed the target, the result is the smallest thing that still decodes correctly. Below that you have to change the image itself — dimensions, colour count, or how complex the content is.',
        },
      },
      {
        q: { zh: 'WebP 都支持吗？', en: 'Is WebP supported everywhere?' },
        a: {
          zh: '现代浏览器与主流系统都支持，但把 WebP 当交付格式前请确认接收方环境；要「任何设备都能开」，PNG 仍是更安全的那个。',
          en: 'Current browsers and mainstream systems handle it, but check the recipient before shipping WebP; where “opens anywhere” is the requirement, PNG remains the safer answer.',
        },
      },
      {
        q: { zh: '能一次转很多张吗？', en: 'Can I do many at once?' },
        a: {
          zh: '能，一批最多 200 张，混合来源格式也行；单个文件失败只报该文件，其余继续。',
          en: 'Yes — up to 200 images in one run, mixed sources included, and one bad file reports only itself while the batch continues.',
        },
      },
    ],
  },
  {
    slug: 'svg-to-png',
    from: 'svg',
    to: 'png',
    shot: 'output-preset',
    title: {
      zh: 'SVG 转 PNG——先净化再栅格化，脚本不执行',
      en: 'SVG to PNG — sanitised first, rasterised second',
    },
    desc: {
      zh: '浏览器本地把 SVG 栅格化成 PNG（也可出 JPEG / WebP）。矢量按当前尺寸渲染，脚本与事件属性先行剥离，外链资源不会去取。',
      en: 'Rasterise SVG to PNG in your browser at the size you set: scripts and event attributes are stripped first, and remote resources are never fetched.',
    },
    lede: {
      zh: 'SVG 是图，也是可执行标记：一段 <script> 或一个 onerror 属性就藏在“图片”里面。所以这条链路的第一步不是画图，是把活性内容剥掉——先剥离脚本与事件属性，再交给栅格化；这也是为什么它敢接受一个来路不明的 SVG。渲染按矢量在指定尺寸下重新计算，因此不是「放大已渲染的位图」，边缘保持锐利。',
      en: 'An SVG is a picture and executable markup at the same time: a <script> element or an onerror attribute is still “an image” as far as a file picker is concerned. So the first step on this route is not drawing — it is removing live content, stripping scripts and event-handler attributes before anything is rasterised. That is what lets it accept an SVG of unknown origin at all. The render then recomputes the vector at the size you set, so it is not an upscale of an already-flattened bitmap and the edges stay sharp.',
    },
    keeps: {
      zh: [
        '矢量按目标尺寸重新计算：曲线与文字边缘不会因为转换而发虚',
        'viewBox 与宽高按同一套规则归一，DOCX 里内联 SVG 走的是同一个栅格化实现',
        '输出可选 PNG（保留透明）、JPEG 或 WebP',
        '解析失败、根节点不是 <svg> 都会给出该文件的错误提示，而不是产出一张空白图',
      ],
      en: [
        'The vector is recomputed at the target size, so curves and glyph edges do not soften through the conversion',
        'viewBox and width/height are normalised by one shared rule — the same code path paints an inline SVG inside a DOCX',
        'Output can be PNG (transparency preserved), JPEG or WebP',
        'A file that fails to parse, or whose root is not <svg>, reports its own error instead of handing back a blank image',
      ],
    },
    limits: {
      zh: [
        '外链的东西一律不去取：远程 <image>、远程字体与 CSS 都不会被下载（离线前提），所以带外链的 SVG 需要先自备素材',
        '动画 SVG 只出一帧——栅格化是单张图像，SMIL/CSS 动画的时间轴不进 PNG',
        '不能反向输出 SVG：浏览器不提供 SVG 编码器，SVG 只能作为输入格式',
        '文字依赖本机字体，字体缺失时按系统回退渲染，字形宽度可能与原稿不同',
      ],
      en: [
        'Nothing external is fetched: remote <image> references, remote fonts and external CSS are not downloaded — that is the offline premise — so bring the assets first',
        'An animated SVG yields one frame only; rasterising produces a still, and a SMIL or CSS timeline does not enter the PNG',
        'There is no way back out to SVG: browsers ship no SVG encoder, so SVG is input-only',
        'Text depends on fonts installed on your machine; a missing face falls back to a system font and changes glyph widths against the original',
      ],
    },
    notes: {
      zh: [
        '图标工作流常见用法：一批 SVG 一次转成多尺寸 PNG（先设最长边，再跑第二批）',
        '一批最多 200 个文件；结果可一次打包成 ZIP',
      ],
      en: [
        'A common icon workflow: convert a set of SVGs, set the longest edge, then run a second batch at another size',
        'Up to 200 files per batch, downloadable as one ZIP',
      ],
    },
    faq: [
      {
        q: { zh: '为什么说「先净化」？', en: 'What does “sanitised first” actually mean here?' },
        a: {
          zh: '栅格化前会移除 <script> 与 on* 事件属性，渲染路径本身也不允许脚本执行。这是把 SVG 当不可信输入处理的必要步骤，而不是可选开关。',
          en: 'Before anything is drawn, <script> elements and on* handler attributes are removed and the render path itself gives scripts no way to execute. That is a necessary step in treating an SVG as untrusted input, not an optional switch.',
        },
      },
      {
        q: { zh: '透明背景会保留吗？', en: 'Is the transparent background kept?' },
        a: {
          zh: '选 PNG 或 WebP 时保留；选 JPEG 时会被展平到不透明底色，因为 JPEG 没有 alpha 通道。',
          en: 'With PNG or WebP, yes. With JPEG it is flattened onto an opaque background, because JPEG has no alpha channel.',
        },
      },
      {
        q: { zh: '为什么我的 SVG 变成了一张空图？', en: 'Why did my SVG come out blank?' },
        a: {
          zh: '多半是内容依赖外部取码（远程图片或字体）或宽高无法归一。本项目不会去下载任何东西：把素材内联进 SVG、或为它显式指定宽高，再转一次。',
          en: 'Usually it is content that expected a fetch — a remote image or font — or dimensions that could not be normalised. Nothing is downloaded here: inline the assets into the SVG, or give it an explicit width and height, and convert it again.',
        },
      },
    ],
  },
  {
    slug: 'jpg-to-png',
    from: 'jpg',
    to: 'png',
    shot: 'batch-files',
    title: {
      zh: 'JPEG（JPG）转 PNG——本地重编码成无损容器，不上传',
      en: 'JPEG to PNG locally — a lossless container, no upload',
    },
    desc: {
      zh: '浏览器本地把 .jpg / .jpeg 解码成像素再编为 PNG：尺寸原样，可选最长边，一批最多 200 张可打成一个 ZIP。EXIF 与 GPS 不会跟着走。',
      en: 'Decode .jpg to pixels in your browser and re-encode as PNG: dimensions kept, optional longest edge, 200 images in one ZIP. EXIF and GPS do not travel.',
    },
    lede: {
      zh: '这两者的差别不在「清不清楚」，而在「还能不能再存一次」：JPEG 每被保存一次就再丢一层信息，PNG 不会。所以常见的工作流是把照片从 JPEG 拿出来，放进一个可以反复编辑的容器里。这条链路做的正是这件事——解码到画布、再从画布编码，画布里只有像素，所以原文件里的 EXIF、GPS、拍摄时间、相机型号、缩略图一律不会出现在结果里。这一点对隐私是加分，对「我要留住拍摄信息」是减分，两者都该在转之前知道。另外要说清：无损不等于变小，照片进 PNG 通常是涨的。',
      en: 'The difference is not about sharpness but about how many times a file can still be saved: every JPEG re-save discards another layer, a PNG does not. So the common workflow takes a photo out of JPEG and puts it in a container that can be edited repeatedly. That is exactly what this route does — decode onto a canvas, encode from it — and a canvas holds pixels and nothing else, so the EXIF, GPS, capture timestamp, camera model and thumbnail in the source never appear in the result. That is a gain for privacy and a loss if you needed the shooting data, and both are worth knowing before you convert. One more thing to say plainly: lossless is not smaller — a photograph in PNG usually gets bigger.',
    },
    keeps: {
      zh: [
        '重编码进无损容器：此后反复导出 PNG 不会每存一次再掉一层细节',
        '像素尺寸原样保留，只有你显式设了「最长边」（面板档位 800–4096 px）才缩放',
        '.jpg 与 .jpeg 两种后缀都认，同一批里混着别的来源格式也行',
        '单个文件失败只报该文件，批次里其余继续——不会因为一张坏图整批停住',
        '整条链路在你自己的标签页里跑：不上传、不发请求，断网也一样能转',
      ],
      en: [
        'A re-encode into a lossless container: every later PNG save stops costing you detail',
        'Pixel dimensions carried over as they are — it only shrinks if you set the longest edge yourself (the dial offers 800–4096 px)',
        'Both .jpg and .jpeg are recognised, and a batch may mix source formats',
        'One bad file reports only itself while the rest of the batch continues; a broken picture never halts the run',
        'The whole route runs in your own tab: nothing is uploaded, no request is made, and it works with the network off',
      ],
    },
    limits: {
      zh: [
        '体积通常变大：PNG 对照片这类内容没有魔法，真要「看着一样但更小」请走 WebP 或调 JPEG 质量',
        'EXIF、GPS、拍摄时间、相机型号、缩略图都不带过去——画布里只有像素，产物里也只有像素',
        '不修复任何东西：JPEG 的块状伪影与色带都在像素里，转成 PNG 只是把它们无损地保留下来',
        '画布按每通道 8 位的标准画布处理，源文件的 ICC 与宽色域标记不保证原样写进产物',
      ],
      en: [
        'The file usually gets bigger: PNG has no magic for photographs, so for “looks the same but smaller” take the WebP route or dial the JPEG quality instead',
        'EXIF, GPS, the capture timestamp, camera model and thumbnail do not travel — a canvas holds pixels, and the artifact holds pixels',
        'Nothing is repaired: JPEG blocking and banding already live in the pixels, and PNG keeps them losslessly',
        'The canvas is the standard 8-bit-per-channel one, so an ICC profile or a wide-gamut tag is not promised to survive into the output',
      ],
    },
    notes: {
      zh: [
        'PNG 没有质量档，所以这条链路的目标面板只给「最长边」；质量与目标体积是为 JPEG / WebP 准备的',
        '结果文件名默认在源名后加日期与时间（模板可在偏好设置里改）；一批最多 200 张，产物可一次打包成 ZIP',
      ],
      en: [
        'PNG has no quality dial, so the output panel for this route offers only the longest edge — quality and target size belong to JPEG and WebP',
        'Names default to the source name plus date and time — the pattern is editable in preferences; up to 200 images per batch, downloadable as one ZIP',
      ],
    },
    faq: [
      {
        q: { zh: '为什么转出来的 PNG 比原图大很多？', en: 'Why is the PNG so much bigger than the JPEG?' },
        a: {
          zh: '因为容器的职责变了：JPEG 用「丢细节」换体积，PNG 不用。想要体积小、观感接近，请走 WebP（同为有损但压得更紧），或留在 JPEG 并调质量。',
          en: 'The container changed jobs: JPEG trades detail for size and PNG does not. For a smaller file that still looks close, take WebP (lossy but tighter) or stay on JPEG and dial the quality.',
        },
      },
      {
        q: { zh: '转换会去掉 EXIF 吗？', en: 'Does the conversion strip EXIF?' },
        a: {
          zh: '会，全部去掉，包括 GPS。这条链路是「解码成像素 → 重新编码」，中间没有任何元数据通道。如果你需要拍摄信息，请先自己备份原文件。',
          en: 'All of it, GPS included: the route is decode-to-pixels-then-re-encode, and there is no metadata channel in between. Back up the original first if you need the shooting data.',
        },
      },
      {
        q: { zh: '再转回 JPEG 能恢复原样吗？', en: 'Can converting back to JPEG undo it?' },
        a: {
          zh: '不能。原 JPEG 的解码结果进了 PNG 是无损的，但「原来那张 JPEG 的字节」已经不存在了，重新编码是一次全新的有损压缩。',
          en: 'No. The decoded pixels sit in PNG losslessly, but the original JPEG stream is gone, and re-encoding is a fresh lossy pass, not a restore.',
        },
      },
    ],
  },
  {
    slug: 'png-to-jpg',
    from: 'png',
    to: 'jpg',
    shot: 'output-preset',
    title: {
      zh: 'PNG 转 JPEG——透明铺白底，质量与目标体积可调',
      en: 'PNG to JPEG — transparency flattens onto white',
    },
    desc: {
      zh: '浏览器本地把 PNG 编成 JPEG：透明区域铺纯白展平，质量档 40%–90%、目标体积 20 KB–2 MB，先降质量再缩像素。最多 200 张一批。',
      en: 'Encode PNG to JPEG in your browser: alpha flattens onto pure white, with a 40%–90% quality step and a 20 KB–2 MB target that spends quality before pixels.',
    },
    lede: {
      zh: 'JPEG 没有 alpha 通道，所以「PNG 转 JPEG」的第一件事不是压缩，而是替透明区域做一个决定。这里的答案是确定的：画布先铺纯白再把图画上去，透明变成白底，不会出现黑底，也不会留下半透明的边。第二个决定是质量：面板给六档（40%–90%），留空则由编码器自己判断。第三个是目标体积，它的行为有讲究——先沿质量阶梯往下试，质量到底仍够不着才开始缩像素，所以「目标 200 KB」是被追的上限，不是承诺值。',
      en: 'JPEG has no alpha channel, so converting PNG to JPEG starts with a decision about the transparent areas rather than with compression. The answer here is fixed: the canvas is filled pure white before the picture is drawn, so transparency becomes white — never black, never a half-transparent fringe. The second decision is quality, offered as six steps from 40% to 90%, with an empty setting meaning “let the encoder judge”. The third is a target size, and its order of operations matters: the quality ladder is walked first and only when it bottoms out does the encoder give up pixels, so “target 200 KB” is a ceiling being chased, not a promise.',
    },
    keeps: {
      zh: [
        '透明按纯白展平：既不是黑底，也没有棋盘格或半透明残留',
        '质量档 40%–90% 与目标体积 20 KB–2 MB 在输出面板里选，两者只在链路末尾那次编码生效',
        '目标体积按「先质量、后像素」的顺序追，够不着时给回当前最小的结果而不是报错',
        '最长边可先缩到 800–4096 px；编码器另有 8192 px 硬上限，超过是先缩而不是静默裁切',
        '一批最多 200 张，混合来源格式也行，结果可一次打包成 ZIP',
      ],
      en: [
        'Transparency flattens onto pure white — no black background, no checkerboard, no translucent fringe',
        'Quality steps from 40% to 90% and target sizes from 20 KB to 2 MB, chosen in the output panel and applied only at the final encode of the route',
        'A target size is chased in that order — quality first, pixels second — and an unreachable target returns the smallest result rather than an error',
        'A longest edge of 800–4096 px to shrink to, backed by a hard 8192 px encoder ceiling: oversized renders shrink instead of clipping',
        'Up to 200 images per batch with mixed sources, the batch downloadable as one ZIP',
      ],
    },
    limits: {
      zh: [
        'alpha 是丢掉的，而且不可逆——需要透明请留 PNG 或走 WebP',
        '有损编码每次转手都在丢信息：请从原始 PNG 出发，别把 JPEG 反复转来转去',
        '画布是每通道 8 位，16 位 PNG 的额外精度与宽色域标记不在这条路的保留范围里',
        '元数据不进产物：JPEG 装得下 EXIF，但这条链路交给它的只有像素',
      ],
      en: [
        'The alpha channel is gone and there is no way back — keep PNG or take WebP when transparency matters',
        'Lossy re-encodes subtract: start from the original PNG rather than handing a JPEG through again',
        'The canvas is 8-bit per channel, so extra precision from a 16-bit PNG and wide-gamut tags do not survive this route',
        'No metadata is written: JPEG can carry EXIF, but this route hands it pixels only',
      ],
    },
    notes: {
      zh: [
        '输出面板里的设置会被记住，同一批的所有图片共用一次设置',
        '三种可写图片格式（PNG / JPEG / WebP）共享同一套参数语义，换目标再跑一批即可同时出多种格式',
      ],
      en: [
        'The panel settings persist between runs and apply to every image in the batch from one read',
        'The three writable formats (PNG, JPEG, WebP) share one quality vocabulary, so a second batch with another target gives you both',
      ],
    },
    faq: [
      {
        q: { zh: '为什么透明变成白底了？', en: 'Why did transparency turn white?' },
        a: {
          zh: 'JPEG 这个格式没有 alpha 通道，必须有一个不透明底色。本项目选择纯白并把它写在实现里，好处是「白」是确定的，而不是各浏览器的默认底色。',
          en: 'JPEG has no alpha channel, so an opaque background is mandatory. White is chosen and written into the implementation, which makes the result predictably white rather than whatever a browser defaults to.',
        },
      },
      {
        q: { zh: '质量该选哪一档？', en: 'Which quality step should I pick?' },
        a: {
          zh: '面板给的是 90 / 80 / 70 / 60 / 50 / 40%。想少做决定就留空（由浏览器定），想控制观感就从高档往下试；对网页图通常 70%–80% 已经接近原观感。',
          en: 'The dial offers 90 / 80 / 70 / 60 / 50 / 40%. Leave it empty to let the browser decide, or step down from the top until it looks right; for web images 70%–80% is usually close to the original.',
        },
      },
      {
        q: { zh: '设了目标大小为什么还是超？', en: 'Why did it still miss my target size?' },
        a: {
          zh: '可用的杠杆有尽头：质量降到最低、边长缩到下限以内仍不够时，产物就是当前最小可行结果。想更小只能改图像本身（尺寸、内容复杂度）。',
          en: 'The levers bottom out: if the lowest quality and the smallest permitted edge still exceed the target, what you get is the smallest thing that still encodes. Below that you have to change the image — its size or how complex the content is.',
        },
      },
    ],
  },
  {
    slug: 'jpg-to-webp',
    from: 'jpg',
    to: 'webp',
    shot: 'output-preset',
    title: {
      zh: 'JPEG 转 WebP——本地再压一档体积，质量与目标大小可调',
      en: 'JPEG to WebP locally — one more step down in size',
    },
    desc: {
      zh: '浏览器本地把 .jpg 编成 WebP：质量档 40%–90%、目标体积 20 KB–2 MB，先走质量阶梯再缩像素。最多 200 张一批，结果可打 ZIP。',
      en: 'Encode .jpg to WebP in your browser with a 40%–90% quality step and a 20 KB–2 MB target — the quality ladder first, pixels second. 200 images per batch.',
    },
    lede: {
      zh: 'JPEG 与 WebP 都是有损容器，所以这条路的价值主要在体积：同一张图 WebP 常常比 JPEG 更小，而观感不掉。请把「常常」和「保证」分开——省多少取决于图像内容与两个编码器的判断，本项目不给你写一个百分比。操作上的关键还是顺序：设了目标体积时先沿质量阶梯往下试，质量到底还够不着，才开始缩边。所以目标大小是被追的上限；够不着时你拿到的是当前能做到的最小结果。',
      en: 'JPEG and WebP are both lossy containers, so this route is about size: the same picture is often smaller as WebP without looking worse. Keep “often” separate from “guaranteed” — how much you save depends on the image and on the two encoders, and this page will not quote you a percentage. The operational point is again the order: with a target size set, the encoder walks the quality ladder and only starts giving up pixels once quality has bottomed out. The target is a chased ceiling, and when it cannot be reached the result is the smallest thing the encoder could make.',
    },
    keeps: {
      zh: [
        '重编码为 WebP：像素尺寸原样，只有你显式设了最长边（800–4096 px）才缩放',
        '质量档 40%–90% 与目标体积 20 KB–2 MB 只在链路末尾那次编码生效，中间步骤不吃这两个参数',
        '目标体积按「先质量、后像素」追，够不着时给回最小结果而不是失败',
        '8192 px 是编码器侧的硬上限，超过就先缩而不是静默裁切',
        '一批最多 200 张、单个文件 100 MB 上限，结果可一次打包成 ZIP',
      ],
      en: [
        'A re-encode into WebP: pixel dimensions carry over unless you set a longest edge yourself (800–4096 px)',
        'Quality steps of 40%–90% and target sizes of 20 KB–2 MB act only at the route’s final encode — intermediate steps ignore both',
        'A target size is chased quality-first, pixels-second, and an unreachable one returns the smallest result instead of failing',
        'A hard 8192 px encoder ceiling behind it, so oversized renders shrink rather than clip',
        'Up to 200 images per batch with a 100 MB per-file ceiling, downloadable as one ZIP',
      ],
    },
    limits: {
      zh: [
        'JPEG → WebP 是第二次有损编码：原始文件还在的话，从原始 PNG 出发只损失一次',
        '源 JPEG 本来就没有透明通道，产物也不会有——需要透明请从 PNG 走',
        'WebP 能不能被打开由接收方决定；要「任何设备都能开」，JPEG 仍是更安全的答案',
        'BMP / GIF / SVG 只能作为输入：浏览器不提供它们的编码器',
      ],
      en: [
        'JPEG → WebP is a second lossy pass: if the original is still around, start from the PNG and lose less once',
        'A JPEG source has no alpha to carry, so the output will not gain one — take the PNG route when transparency matters',
        'Whether WebP opens is the recipient’s call; where “any device must open it” is the requirement, JPEG remains the safer answer',
        'BMP, GIF and SVG are input-only: a browser ships no encoder for them',
      ],
    },
    notes: {
      zh: [
        '输出参数在界面里设置一次会被记住，同一批的所有图片共用',
        '同一批也可以把目标换成 PNG 或 JPEG；三种可写格式共享同一套参数语义',
      ],
      en: [
        'The output parameters are read once per batch and remembered between runs',
        'The same batch can target PNG or JPEG instead — the three writable formats share one parameter vocabulary',
      ],
    },
    faq: [
      {
        q: { zh: 'WebP 一定比 JPEG 小吗？', en: 'Is WebP always smaller than JPEG?' },
        a: {
          zh: '不保证。多数照片与图形界面截图会明显小一些，但幅度取决于内容；这条页不写具体百分比，因为那是可以实测的东西，不该靠印象。',
          en: 'Not guaranteed. Most photographs and interface screenshots come out clearly smaller, but the margin is a property of the content, and this page will not quote a percentage that has not been measured.',
        },
      },
      {
        q: { zh: '目标大小够不着会怎样？', en: 'What if the target size cannot be reached?' },
        a: {
          zh: '质量阶梯走完、像素也缩到位之后，产物就是当前最小可行结果——转换不会失败，但也不会为了达标而把图砍坏。',
          en: 'Once the quality ladder is walked and the pixels have been shrunk, the result is the smallest thing that still encodes: the conversion does not fail, and it does not mangle the picture to hit the number.',
        },
      },
      {
        q: { zh: '能一次转很多张吗？', en: 'Can I convert many at once?' },
        a: {
          zh: '能，一批最多 200 张，来源格式可以混；单个文件失败只报该文件，其余继续，结果可一次打包成 ZIP。',
          en: 'Yes — up to 200 images per run with mixed sources, one bad file reporting only itself while the batch continues, all downloadable as one ZIP.',
        },
      },
    ],
  },
  {
    slug: 'webp-to-jpg',
    from: 'webp',
    to: 'jpg',
    shot: 'batch-results',
    title: {
      zh: 'WebP 转 JPEG——给不收 WebP 的接收方兜底，透明铺白',
      en: 'WebP to JPEG for recipients that will not take WebP',
    },
    desc: {
      zh: '浏览器本地把 .webp 解码重编为 JPEG：透明铺纯白，质量档与目标体积照旧，一批最多 200 张。动图 WebP 只会留下一帧。',
      en: 'Decode .webp and re-encode as JPEG locally: alpha flattens onto white, quality and target size as usual, 200 per batch. Animated WebP yields one frame.',
    },
    lede: {
      zh: '这条路存在的理由通常不是压缩，而是「对方打不开」：一些邮件客户端、老版本 Office、以及某些 CMS 的上传校验都不接受 WebP。做法是把 WebP 解码到画布、铺白、再交给 JPEG 编码器，于是有两件事一定发生——透明变成白底，以及一次全新的有损编码。原始文件还在的话，交付 JPEG 从原始 PNG 走会更干净；这条适合的是「手里只有 WebP」的情形。',
      en: 'The reason this route exists is usually not compression but “the other side cannot open it”: some mail clients, older Office builds and certain CMS upload validators will not take WebP. The mechanics are decode onto a canvas, fill white, hand it to the JPEG encoder — which means two things certainly happen: transparency becomes white, and a fresh lossy encode is performed. If the original is still around, shipping JPEG from the PNG is cleaner; this route is for the case where WebP is all you have.',
    },
    keeps: {
      zh: [
        '透明铺纯白底，不会带出黑底或半透明残留',
        '像素尺寸原样保留，除非你设了最长边（800–4096 px）',
        '质量档 40%–90% 与目标体积 20 KB–2 MB 照旧，只在链路末尾那次编码生效',
        '静态 WebP 正常处理；动图 WebP 得到浏览器解码出的那一帧',
        '一批最多 200 张、单个 100 MB 上限，结果可一次打包成 ZIP',
      ],
      en: [
        'Transparency flattens onto pure white — never a black background, never a translucent fringe',
        'Pixel dimensions are kept unless you set a longest edge (800–4096 px)',
        'Quality steps of 40%–90% and target sizes of 20 KB–2 MB apply as usual, at the route’s final encode only',
        'A still WebP is handled normally; an animated one yields the frame the browser decoded',
        'Up to 200 images per batch and 100 MB each, downloadable as one ZIP',
      ],
    },
    limits: {
      zh: [
        'WebP → JPEG 是第二次有损编码，只减不加；能回到原始文件请从原始文件走',
        '无损 WebP 的精确像素回到 JPEG 必然消失',
        '动图只出一帧，而且「丢帧」这条提示目前只为 GIF 写——实现只对 GIF 数帧',
        '产物不带元数据：画布里只有像素，编码出来的 JPEG 里也只有像素',
      ],
      en: [
        'WebP → JPEG is a second lossy pass and only subtracts; go back to the original file when you have it',
        'The exactness of a lossless WebP cannot survive the way back into JPEG',
        'An animation yields one frame, and the “frames lost” notice is currently written only for GIF — the implementation counts frames only there',
        'No metadata is carried: the canvas holds pixels and the encoder is handed pixels',
      ],
    },
    notes: {
      zh: [
        '如果目的只是「更小」，别在两个有损格式之间转手——从原始文件重新编码才划算',
        '输出面板的设置会被记住，同一批的所有文件共用一次读取',
      ],
      en: [
        'If the goal is simply “smaller”, do not hand a picture between two lossy formats — re-encoding from the original is the cheaper move',
        'The panel settings persist and apply to the whole batch from a single read',
      ],
    },
    faq: [
      {
        q: { zh: '为什么透明区域变成一大块白？', en: 'Why did the transparent area turn into a white block?' },
        a: {
          zh: 'JPEG 没有 alpha 通道，必须铺一个不透明底色，本项目铺的是纯白。若白底不合适，请留 WebP 或输出 PNG。',
          en: 'JPEG requires an opaque background and has no alpha channel; this route fills pure white. If white is wrong for the picture, keep WebP or output PNG instead.',
        },
      },
      {
        q: { zh: '为什么图比原来糊了一点？', en: 'Why does it look softer than the original?' },
        a: {
          zh: '因为这是第二次有损编码：WebP 那次已经改过像素，JPEG 这次再改一遍。选更高的质量档能减轻，但换不回已经丢掉的信息。',
          en: 'Because this is the second lossy pass: WebP had already changed the pixels and JPEG changes them again. A higher quality step softens the damage but cannot bring back what was already discarded.',
        },
      },
      {
        q: { zh: '动图 WebP 怎么办？', en: 'What about animated WebP?' },
        a: {
          zh: '栅格化只产出一张静态图，动图会只剩首帧。本项目不能编 GIF，所以「保住动画」这件事不在这条链路的能力范围内。',
          en: 'Rasterising produces a still, so the animation ends up as its first frame. The extension cannot encode GIF either, so “keep the animation” is outside what this route can do.',
        },
      },
    ],
  },
  {
    slug: 'png-to-pdf',
    from: 'png',
    to: 'pdf',
    shot: 'batch-results',
    title: {
      zh: 'PNG 转 PDF——像素不重画，页面就是这张图',
      en: 'PNG to PDF without redrawing a pixel — page is the image',
    },
    desc: {
      zh: '浏览器本地把 PNG 装进 PDF：常规路径不重画像素，页面尺寸由图像像素换算，横竖自动。一批最多 200 张，默认各自一个 PDF，也可勾选合并成一份多页 PDF。',
      en: 'Put PNGs into PDFs locally: pixels are embedded, not redrawn, and each page takes its image’s size and orientation. One PDF each, or one merged multi-page PDF.',
    },
    lede: {
      zh: '这条链路与别的路不太一样：它是「把这张 PNG 放进 PDF 容器」，不是「重画一遍再塞进去」。像素一个都不丢，产物是无损的。但无损不等于不变大——PDF 用自己的流格式重存这些像素，实测几张截图的产物落在原 PNG 的 1.1–1.3 倍，画面越碎越接近 1.5 倍。要压体积请在图片侧解决（换 WebP、缩最长边），别指望这一转。页面尺寸直接由图像像素按 96 dpi 换算成点（px × 72 ÷ 96），宽大于高就自动横向，于是它不是 A4：一张 2560×1440 的截图进去，出来的 PDF 就是一页 2560×1440 大小的纸。打印时需要选「适合页面」。',
      en: 'This route is unlike the others: it places the PNG inside a PDF container instead of redrawing it there, so not one pixel is lost and the artifact is lossless. Lossless is not the same as the same size, though — a PDF re-stores those samples in its own stream format, and measured over several screenshots the artifact lands 1.1x–1.3x the source PNG, nearer 1.5x when the picture is finely detailed. Do the shrinking on the image side (WebP, a shorter edge) rather than hoping this hop does it. The page is computed from the image pixels at 96 dpi (px × 72 ÷ 96 points), landscape when it is wider than tall, which means it is not A4: a 2560×1440 screenshot in yields one page the size of that screenshot. Choose “fit to page” when printing.',
    },
    keeps: {
      zh: [
        '常规路径不重画像素：PNG 解码后按无损流写进 PDF，画质与源文件逐像素一致',
        '页面尺寸按图像像素在 96 dpi 下换算（px × 72 ÷ 96 点），横图自动横向',
        '唯一放弃无损的情形是超过 8192 px 的图——那时先等比重采样再嵌入，否则浏览器画不出来',
        '解码失败或尺寸为 0 的坏图报该文件的错误，而不是给回一张空白 PDF',
        '一批最多 200 个文件、单个 100 MB 上限；默认各自一个 PDF，勾选「合并为一份 PDF」后整批按列表顺序写成一份（每张一页，最多 200 页）',
      ],
      en: [
        'No redraw on the normal path: the PNG is written into the PDF as a lossless stream, pixel-for-pixel the file you gave it',
        'The page is sized from the image pixels at 96 dpi (px × 72 ÷ 96 points), landscape automatically when it is wider than tall',
        'The one case that gives up losslessness is a side above 8192 px, which is resampled before embedding — otherwise the browser cannot draw it',
        'A file that will not decode, or reports zero size, raises its own error instead of handing back a blank PDF',
        'Up to 200 files per batch and 100 MB each — one PDF per file by default, or one PDF for the whole batch in list order with “Merge into one PDF” ticked (one page per image, up to 200 pages)',
      ],
    },
    limits: {
      zh: [
        '页面不是 A4：它就是那张图的尺寸，打印或拼册时要靠「适合页面」',
        '默认不做多页合并——不勾选「合并为一份 PDF」时，一批 20 张得到 20 个 PDF；勾选后是一份 20 页的 PDF，任一张解码失败则整批不产出',
        '合并后每页仍是各自的像素尺寸，不会统一成 A4，不同尺寸的图在同一份 PDF 里各占一页',
        'PDF 里没有文字层：源图本来也只有像素，搜索与复制都无从下手',
        '目标是 PDF 时输出参数面板不出现（面板只为图片目标显示），所以这里不能设 DPI 或最长边',
      ],
      en: [
        'The page is not A4 — it is the picture’s own size, so printing and imposition rely on “fit to page”',
        'No merging by default — a batch of 20 images without the box ticked still gives 20 PDFs; with “Merge into one PDF” ticked they become one 20-page PDF, and if any image fails to decode nothing is produced at all',
        'Merged pages keep their own pixel dimensions rather than becoming A4, so differently sized images simply each take a page in the same PDF',
        'There is no text layer, because the source had only pixels; searching and copying have nothing to work on',
        'The output panel is not shown for a PDF target (it exists for image targets), so DPI and longest edge are not adjustable here',
      ],
    },
    notes: {
      zh: [
        '结果文件名默认在源名后加日期与时间，模板可在偏好设置里改；一批多个文件时可一次打包成 ZIP',
        '手上是一组要交出去的图？勾选「合并为一份 PDF」，整批按列表顺序装订成一份，文件名带 -merged；开关默认关闭，所以单张转换的行为与以前完全一样',
        '需要「一张图一页 A4」的排法：先转 PDF 再在打印时选适合页面，或把图放进 HTML 走 HTML → PDF（那条按 A4 分页）',
      ],
      en: [
        'Names default to the source name plus date and time, with the pattern editable in preferences; several files can come back as one ZIP',
        'Handing over a set of images? Tick “Merge into one PDF” and the batch becomes one document in list order, named with a -merged suffix; the box is off by default, so a single conversion behaves exactly as before',
        'For a “one image per A4 page” layout: print the PDF with fit-to-page, or place the image in HTML and take the HTML → PDF route, which paginates on A4',
      ],
    },
    faq: [
      {
        q: { zh: '能把多张 PNG 合成一个 PDF 吗？', en: 'Can several PNGs become one PDF?' },
        a: {
          zh: '能，勾选「合并为一份 PDF」即可：整批都是 PNG / JPEG / WebP / BMP / GIF 且目标为 PDF 时，目标选择器下方会出现这个开关；勾上之后整批按列表顺序写成一份 PDF，每张一页（最多 200 页），文件名带 -merged。它默认关闭，所以一次只转一张时拿到的仍是一份单页 PDF；任意一张解码失败，整批都不产出，失败清单会点名是哪个文件。',
          en: 'Yes — tick “Merge into one PDF”. The box appears when every file is a PNG / JPEG / WebP / BMP / GIF and the target is PDF; the whole batch then becomes one PDF, one page per image in list order (up to 200 pages), named with a -merged suffix. It is off by default, so a single image still gives one single-page PDF; if any image fails to decode, nothing is produced and the failure list names the file.',
        },
      },
      {
        q: { zh: '为什么打开 PDF 是一页超大的纸？', en: 'Why does the PDF open as one enormous page?' },
        a: {
          zh: '因为页面尺寸就是图像尺寸（按 96 dpi 换算成点）。这是「不重画」这条路径的必然取舍：保住了像素，也保住了图的物理尺寸。',
          en: 'Because the page is sized from the image itself (pixels to points at 96 dpi). That is the unavoidable trade of the no-redraw path: the pixels are preserved and so is the picture’s physical size.',
        },
      },
      {
        q: { zh: '转成 PDF 会变小吗？', en: 'Does the PDF come out smaller than the PNG?' },
        a: {
          zh: '不会，通常还会略大：像素是无损重存进 PDF 流的，实测几张截图的产物是原 PNG 的 1.1–1.3 倍。要压体积请先在图片侧处理（换 WebP 或缩边长），再转 PDF。',
          en: 'No, and it usually grows a little: the pixels go into the PDF stream losslessly, measured at 1.1x–1.3x the source PNG over several screenshots. Do the shrinking on the image side first — WebP or a shorter edge — then convert.',
        },
      },
    ],
  },
  {
    slug: 'jpg-to-pdf',
    from: 'jpg',
    to: 'pdf',
    shot: 'workbench-empty',
    title: {
      zh: 'JPEG 转 PDF——一张照片一页，会重编码一次',
      en: 'JPEG to PDF — one photo per page, through one re-encode',
    },
    desc: {
      zh: '浏览器本地把 .jpg 装进 PDF：页面按像素尺寸换算、横竖自动。这条路解码后再编码一次，PNG 那条则不重编码，两者是有损与无损的对照；默认一张一份，也可勾选合并成一份多页 PDF。',
      en: 'Put .jpg files into PDFs locally, sized from their pixels. This route re-encodes once; the PNG route does not. One PDF each, or one merged multi-page PDF.',
    },
    lede: {
      zh: '同样是图片进 PDF，JPEG 这条与 PNG 这条的区别就在「有没有重画一遍」。这条路把图解码到画布、先铺纯白、再按 JPEG 档编出来交给容器——尺寸上限与统一底色都是在这一步处理的。多数照片在这一步看不太出差别，但它确实是第二次有损编码；要尽量少损失，就先转 PNG、再由 PNG 出 PDF。页面尺寸按像素在 96 dpi 下换算，所以也不是 A4。',
      en: 'Both put an image into a PDF, and the difference from the PNG route is whether the picture is redrawn. This one decodes the image onto a canvas, fills pure white, re-encodes it as JPEG and hands that to the container — the canvas is also where the size ceiling and a uniform background get handled. Most photographs show little of it, but it is a second lossy pass — for the least possible loss, convert to PNG first and take the PNG route, which embeds. The page is sized from pixels at 96 dpi, so this one is not A4 either.',
    },
    keeps: {
      zh: [
        '一页一张图：页面尺寸由像素在 96 dpi 下换算，宽大于高自动横向',
        '重编码按 JPEG 载荷交给容器（质量参数 0.92 由编码器执行），照片类产物体积可控',
        '画布先铺纯白再画，不会出现黑底或来路不明的底色',
        '超过 8192 px 的图先等比缩进上限，而不是静默裁切',
        '一批最多 200 张、单个 100 MB 上限；默认各自一个 PDF，勾选「合并为一份 PDF」后整批按列表顺序写成一份（每张一页，最多 200 页）',
      ],
      en: [
        'One picture per page: the page is computed from the pixels at 96 dpi and goes landscape when it is wider than tall',
        'The re-encode is handed to the container as a JPEG stream (the encoder is given 0.92), so photographic output stays a manageable size',
        'The canvas is filled pure white before the picture is drawn, so there is no black background and no browser-dependent one',
        'A side above 8192 px is scaled inside the limit first rather than silently clipped',
        'Up to 200 files per batch and 100 MB each — one PDF per file by default, or one PDF for the whole batch in list order with “Merge into one PDF” ticked (one page per image, up to 200 pages)',
      ],
    },
    limits: {
      zh: [
        '这是第二次有损编码：追求保真请先转 PNG，再走 PNG → PDF（那条不重编码）',
        '默认不合并：不勾选「合并为一份 PDF」时，一批 N 张就是 N 个 PDF；勾选后是一份 N 页的 PDF，任一张失败则整批不产出',
        '没有文字层：PDF 里的图搜不到、也复制不出文字',
        '页面不是 A4，且目标是 PDF 时输出参数面板不出现（DPI 只对 PDF 来源有意义）',
      ],
      en: [
        'It is a second lossy pass: for fidelity convert to PNG first and take PNG → PDF, which embeds without re-encoding',
        'No merging by default — N files without the box ticked are N PDFs; ticked, they become one N-page PDF, and one bad image fails the whole group instead of producing a partial document',
        'No text layer, so the picture cannot be searched or copied as text out of the PDF',
        'The page is not A4, and no output panel is offered for a PDF target (DPI means something only when the source is a PDF)',
      ],
    },
    notes: {
      zh: [
        '典型用法是一批照片或截图各自变成一个可直接发送的单页 PDF；要合订成一份就勾选「合并为一份 PDF」，顺序与文件列表一致',
        '不合并时单个文件失败只报该文件的错误，批次里其余继续；合并开启时任一失败会中止整批并在失败清单点名，结果文件名默认在源名后加日期与时间',
      ],
      en: [
        'The typical use is a set of photos or screenshots, each becoming a one-page PDF you can send on its own; tick “Merge into one PDF” to bind them into one document in list order',
        'Without merging, one bad file reports only itself while the batch continues; with merging on, the first failure stops the whole group and the failure list names the file — names default to the source name plus date and time',
      ],
    },
    faq: [
      {
        q: { zh: 'PDF 和原 JPEG 体积差不多，为什么？', en: 'Why is the PDF about the same size as the JPEG?' },
        a: {
          zh: '因为 PDF 里装的就是重编码后的 JPEG 图像流，容器本身只加很少的开销。差多少取决于编码器在 0.92 档上对这张图的判断，不取决于「PDF 会不会压缩」。',
          en: 'Because the PDF carries a re-encoded JPEG image stream and the container itself adds little. The difference comes from what the encoder decides at 0.92 for this picture, not from any compression PDF performs.',
        },
      },
      {
        q: { zh: '为什么颜色或细节有一点变化？', en: 'Why did the colour or detail shift slightly?' },
        a: {
          zh: '这条链路是「解码 → 铺白 → 重新编码」。半透明边缘会被白底吃掉，细密纹理会被第二次量化影响。想避免就先转 PNG，再从 PNG 出 PDF。',
          en: 'The route is decode, fill white, re-encode. Translucent edges get absorbed into the white and fine texture is affected by a second quantisation. To avoid both, convert to PNG first and take PNG → PDF.',
        },
      },
      {
        q: { zh: '能不能一次把 50 张照片装成一个 PDF？', en: 'Can 50 photos go into one PDF at once?' },
        a: {
          zh: '能，勾选「合并为一份 PDF」就行：整批都是图片且目标为 PDF 时，目标选择器下方会出现这个开关；勾上之后 50 张照片按列表顺序写成一份 50 页 PDF，文件名带 -merged。不勾选时仍是 50 个单页 PDF 加一个装它们的 ZIP，与以前完全一样；任意一张解码失败，整批都不产出。',
          en: 'Yes — tick “Merge into one PDF”. The box appears when every file is an image and the target is PDF; the 50 photos then become one 50-page PDF in list order, named with a -merged suffix. Left unticked you still get 50 one-page PDFs and the ZIP that carries them, exactly as before; if any image fails to decode, nothing is produced.',
        },
      },
    ],
  },
  {
    slug: 'excel-to-json',
    from: 'xlsx',
    to: 'json',
    shot: 'preview-edit',
    title: {
      zh: 'Excel 转 JSON——按单元格值出，多 sheet 一张不丢',
      en: 'Excel to JSON from cell values, and no sheet gets dropped',
    },
    desc: {
      zh: '浏览器本地把 .xlsx 转成 JSON：单表给行对象数组，多表按工作表名分组；数字与布尔是真类型，日期是两段式 ISO 文本。',
      en: 'Convert .xlsx to JSON locally: one sheet becomes an array of row objects, several are keyed by sheet name. Numbers and booleans stay typed, dates are ISO text.',
    },
    lede: {
      zh: 'Excel 转 JSON 最容易做错的一件事，是取「显示文本」还是取「存储值」。显示文本是格式化之后的结果：1234.5 可能显示为 "1,234.50"，0.25 显示为 25.0%，布尔显示为 TRUE。这条链路取的是值，所以数字在 JSON 里是 number、布尔是 true/false。日期走的是另一条规则：单元格里存的是天数序列号，直接给 JSON 只会得到一个 45296.33 这样的数，所以日期在读取期渲染成 yyyy-mm-dd hh:mm:ss，再剥掉零时间——纯日期就是 YYYY-MM-DD。为什么不用 Date 对象：那条换算带本地时区误差（实测 Asia/Shanghai −43 秒），而解析期渲染出的文本在三个时区逐字节一致。',
      en: 'The easiest thing to get wrong when turning Excel into JSON is taking the display text instead of the stored value. Display text is what formatting produced: 1234.5 may read "1,234.50", 0.25 reads 25.0%, a boolean reads TRUE. This route takes values, so a number is a JSON number and a boolean is true/false. Dates follow a different rule: what a date cell stores is a day serial, and handing that to JSON gives you 45296.33 — so date cells are rendered at read time into yyyy-mm-dd hh:mm:ss and the zero time is dropped, leaving YYYY-MM-DD for a plain date. Why not a Date object: that conversion carries a local-timezone error (measured at −43 seconds in Asia/Shanghai), while the text rendered during parsing came out byte-identical across three zones.',
    },
    keeps: {
      zh: [
        '单工作表给「行对象数组」（首行做键）；多工作表按表名分组成一个对象，一张表都不会被丢',
        '数值与布尔按存储值写成 JSON 的 number / true / false，不是 "1,234.50"、"25.0%"、"TRUE" 这类显示文本',
        '日期是机器可读的两段式：纯日期 YYYY-MM-DD，带时间 yyyy-mm-dd hh:mm:ss；渲染取自解析期文本，实测跨三个时区逐字节一致',
        '工作簿作者显式指定的其它日期或时长格式被尊重，不会被两段式覆盖（例如 [h]:mm:ss 时长仍是 124:48:00）',
        '结果在工作台里可按树 / 数组表 / 原文三种视图预览；单文件批次还会给出左右对照视图，右侧的结果侧可直接编辑后再下载',
      ],
      en: [
        'One sheet gives an array of row objects (first row as keys); several sheets are grouped into an object keyed by worksheet name, so nothing is dropped',
        'Numbers and booleans are written from the stored value as JSON numbers and true/false, not display text like "1,234.50", "25.0%" or "TRUE"',
        'Dates are machine-readable in two forms: YYYY-MM-DD for a plain date, yyyy-mm-dd hh:mm:ss with a time, rendered from parse-time text that measured byte-identical across three timezones',
        'A date or duration format the workbook author set explicitly is respected rather than overwritten, so an [h]:mm:ss duration stays 124:48:00',
        'The result previews in the workbench as a tree, an array table or the raw text; a single-file batch also opens the side-by-side view, whose result pane can be edited before you download it',
      ],
    },
    limits: {
      zh: [
        '公式给的是它上次算出的缓存值；从没被计算过的公式没有缓存可给',
        '样式、列宽、图表、透视表、条件格式与批注在 JSON 里没有位置',
        '合并单元格只有左上角那一格带值，被覆盖的其余位置是空的',
        '午夜时间戳与纯日期同形（都落成 YYYY-MM-DD）——这是两段式规则里写明的取舍',
      ],
      en: [
        'A formula yields its cached result; one never evaluated has no cache to yield',
        'Styles, column widths, charts, pivot tables, conditional formats and comments have no place in JSON',
        'A merged range carries its value only in the top-left cell; the covered positions come out empty',
        'A midnight timestamp is indistinguishable from a plain date, both landing as YYYY-MM-DD — a trade stated in the two-form rule',
      ],
    },
    notes: {
      zh: [
        '读不到任何工作表时按该文件的错误处理，不会静默给回一个空数组；单个文件失败不影响批次里其余文件',
        '一批最多 200 个文件、单个 100 MB 上限；JSON 结果可以继续转成 CSV 或 Excel',
      ],
      en: [
        'A workbook with no readable worksheet reports that file’s error rather than quietly returning an empty array, and one failure never stops the batch',
        'Up to 200 files per batch and 100 MB each; the JSON result can be converted on to CSV or Excel',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么多个 sheet 是一个对象而不是数组？',
          en: 'Why an object rather than an array for multiple sheets?',
        },
        a: {
          zh: '因为数组表达不了「这一组行属于哪张表」。按表名分组是唯一能把工作簿结构完整交出去的形状；只有一个工作表时仍然是朴素的行对象数组。',
          en: 'Because an array cannot say which worksheet a group of rows came from. Keying by sheet name is the only shape that hands over the workbook intact; with a single sheet you still get the plain array of row objects.',
        },
      },
      {
        q: { zh: '为什么有的字段是字符串？', en: 'Why are some fields strings?' },
        a: {
          zh: '因为那个单元格的存储值本来就是文本——例如带前导零的编号。这是保真，不是漏转：把它猜成数字就会丢掉原值。',
          en: 'Because the cell’s stored value is text — a zero-padded ID, say. That is fidelity, not a missed conversion: guessing it into a number would destroy the original.',
        },
      },
      {
        q: { zh: '.xls（97-2003）能转吗？', en: 'Does it take .xls (97-2003)?' },
        a: {
          zh: '输入侧支持的是 .xlsx；老的二进制 .xls 请先在 Excel 或 LibreOffice 里另存为 .xlsx 再转。',
          en: 'The supported input is .xlsx; save the legacy binary .xls as .xlsx in Excel or LibreOffice first.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-json',
    from: 'csv',
    to: 'json',
    shot: 'batch-files',
    title: {
      zh: 'CSV 转 JSON——只有能精确回写的字段才是数字',
      en: 'CSV to JSON — numeric only when it round-trips exactly',
    },
    desc: {
      zh: '浏览器本地把 .csv 转成 JSON 行对象：字段先按原文读入，只在「解析→回写完全一致」时才恢复数字类型；GBK / GB18030 自动兜底。',
      en: 'Convert .csv to JSON row objects locally: every field starts as text and regains a numeric type only when parse-then-reprint reproduces it exactly.',
    },
    lede: {
      zh: '把 CSV 交给 JSON 的常见实现是让解析器猜类型，而猜是有代价的："00424" 变成 424、1e5 变成 100000、16 位卡号变成科学计数、1/2 变成一个日期。这条链路反过来做：先用严格读法把每个字段按原文读进来，再只在一个很严的条件下恢复数字类型——解析成数字、再写回、必须与原文一字不差，并且有效数字不超过 15 位。凡是回写不上的，一律留字符串。日期同理：CSV 里没有日期类型，2024-01-05 就是那串字符，转换不替你造一个。',
      en: 'The usual way to turn CSV into JSON lets the parser guess types, and guessing has a price: "00424" becomes 424, 1e5 becomes 100000, a 16-digit card number becomes scientific notation and 1/2 becomes a date. This route does the opposite: every field is read verbatim first, and a numeric type is restored only under one strict condition — parse it, print it back, and the characters must be identical, within 15 significant digits. Anything that fails that round trip stays a string. Dates work the same way: CSV has no date type, so 2024-01-05 is those characters, and the conversion will not invent one for you.',
    },
    keeps: {
      zh: [
        '首行做键、其余行成对象；空单元格不会写成 null，而是那个键直接缺失',
        '数字类型只在「解析→回写完全一致且有效数字不超过 15 位」时恢复，所以 00424、1e5、16 位卡号原样是字符串',
        '看起来像日期的内容（2024-01-05、1/2）不会被猜成日期，仍是字符串——值保真优先于类型便利',
        '输入按 UTF-8 → GB18030 → GBK 依次尝试解码，国内 Excel 另存的 GBK CSV 直接可读',
        '结果在工作台的 JSON 三视图（树 / 数组表 / 原文）里预览；单文件批次还能在左右对照视图的结果侧编辑后再下载',
      ],
      en: [
        'The first row becomes the keys and the rest become objects; an empty cell is not written as null — that key is simply absent',
        'A numeric type returns only when parse-then-reprint is exact within 15 significant digits, so 00424, 1e5 and a 16-digit card number stay strings',
        'Text that looks like a date (2024-01-05, 1/2) is not guessed into one and remains a string — value fidelity before type convenience',
        'Input is decoded UTF-8 → GB18030 → GBK, so a GBK CSV saved by a Chinese Excel reads correctly straight away',
        'The result previews as a tree, an array table or raw text in the workbench; a single-file batch also opens the side-by-side view, where the result pane is editable before download',
      ],
    },
    limits: {
      zh: [
        '一个 CSV 就是一张平面表，只读第一张表；没有「多 sheet」概念',
        '这一侧不做 Excel 的公式转义：JSON 不会被 Excel 打开，转义符反而是脏数据。以 = 开头的字段原样进 JSON，别把结果直接喂给会执行公式的东西',
        '分隔符是读的时候自动判断的（逗号、分号、制表符、竖线都能直接转），所以判断偶尔不合你意——文件最前面加一行 sep=; 就能强制指定',
        '读不到工作表时按该文件的解码错误处理，而不是静默给回空数组',
      ],
      en: [
        'A CSV is one flat grid and only the first grid is read; there is no multi-sheet concept',
        'No Excel formula escaping happens on this side: JSON is not opened by Excel, so an apostrophe would be dirt. A field starting with = enters the JSON verbatim — do not feed the result to something that executes formulas',
        'The delimiter is sniffed while reading (comma, semicolon, tab and pipe all convert as they stand), so the sniff can disagree with you — put sep=; on the first line to force it',
        'A file whose sheet cannot be read raises its own decode error instead of quietly returning an empty array',
      ],
    },
    notes: {
      zh: [
        'JSON 结果不写 BOM——BOM 是为 CSV 那侧的 Excel 准备的，这里不需要',
        '一批最多 200 个文件、单个 100 MB 上限；结果文件名默认在源名后加日期与时间，模板可在偏好设置里改',
      ],
      en: [
        'No BOM is written for JSON — that affordance belongs to the CSV side, where Excel reads it',
        'Up to 200 files per batch and 100 MB each; names default to the source name plus date and time, and the pattern is editable in preferences',
      ],
    },
    faq: [
      {
        q: { zh: '为什么 "007" 是字符串？', en: 'Why is "007" a string?' },
        a: {
          zh: '这正是保护。一旦按数字存，回写就变成 7，前导零再也回不来。判定条件看的是「能不能一字不差地回写」，不是「像不像数字」。',
          en: 'That is the protection working. Stored as a number it becomes 7 and the leading zero is unrecoverable. The test is “can it be written back character for character”, not “does it look numeric”.',
        },
      },
      {
        q: { zh: '我想要真的日期类型怎么办？', en: 'What if I want real dates?' },
        a: {
          zh: 'JSON 本身没有日期类型，最稳的做法就是保留字符串形状，在使用侧按需解析。想要别的格式，转完在编辑视图里批量替换即可——该视图只在单文件批次的左右对照里出现。',
          en: 'JSON has no date type, so keeping the string shape and parsing where you use it is the stable answer. For another format, replace it in the editing view after conversion — that view shows up for a single-file batch in the side-by-side pane.',
        },
      },
      {
        q: { zh: '为什么空值不见了？', en: 'Why did the empty values disappear?' },
        a: {
          zh: '这是行对象数组的默认形状：空单元格不给键。需要每行都带齐字段时，在预览编辑里补 null（编辑视图只在单文件批次出现），或改用 CSV / Excel 那条链路。',
          en: 'That is the default shape of an array of row objects: an empty cell contributes no key. If every row must carry every field, add nulls in the editing view — single-file batches only — or take the CSV / Excel route instead.',
        },
      },
    ],
  },
  {
    slug: 'json-to-excel',
    from: 'json',
    to: 'xlsx',
    shot: 'batch-results',
    title: {
      zh: 'JSON 转 Excel——经过 CSV 的两步链，嵌套值写进单元格',
      en: 'JSON to Excel — two steps through CSV, values kept',
    },
    desc: {
      zh: '浏览器本地把 JSON 数组转成 .xlsx：表头取所有对象键的并集，嵌套对象与数组以 JSON 文本进单元格。链路是 JSON → CSV → Excel，中间不落盘。',
      en: 'Turn a JSON array into .xlsx locally: the header is the union of every object’s keys and nested values go into the cell as JSON text, routed via CSV.',
    },
    lede: {
      zh: '注册表上没有 JSON 直连 Excel 这条路，走的是两步：JSON → CSV → Excel，由图上的路径搜索自动给出，中间结果只在内存里传递，不落盘也不联网。这条链路真正值得说的两件事都在数据形状上：一是表头不是照第一个对象的键抄，而是取所有对象键的并集——某行缺某个键就留空，不会丢行；二是嵌套对象与数组不会被摊平掉，它们以 JSON 文本写进单元格，信息完整但代价是「往返不对称」：从 Excel 再转回 JSON，得到的是那串文本。',
      en: 'There is no direct JSON-to-Excel edge in the registry: the route is two steps, JSON → CSV → Excel, discovered by the path search over the converter graph, and the intermediate result lives only in memory — nothing is written to disk and nothing is fetched. The two things worth knowing are about shape. First, the header is not the first object’s keys but the union of every object’s keys — a row missing a key gets an empty cell rather than being dropped. Second, nested objects and arrays are not flattened away: they enter the cell as JSON text, which keeps the information intact at the cost of an asymmetric round trip — turn the sheet back into JSON and you get that text.',
    },
    keeps: {
      zh: [
        '顶层是非空对象数组即可：表头取所有对象键的并集，某行缺某个键就留空而不是丢行',
        '嵌套对象与数组以 JSON 文本写进单元格，不会被摊平掉或静默丢弃',
        'null 与 undefined 落成空单元格，而不是写出 "null" 文本',
        '数字按数值写；以 = + - @ 或制表符开头的文本被转义，落到 .xlsx 仍是文本单元格并钉住文本格式，Excel 打开不会再执行它',
        '长编号与前导零这类「回写不一致」的值按文本存，不会变成科学计数',
      ],
      en: [
        'A non-empty array of objects is enough: the header is the union of all keys, and a row missing one gets an empty cell instead of being dropped',
        'Nested objects and arrays enter the cell as JSON text rather than being flattened away or silently dropped',
        'null and undefined become empty cells, not the text "null"',
        'Numbers are written as numbers; text beginning with = + - @ or a tab is escaped, lands as a text cell and is pinned to text format, so Excel cannot re-execute it on open',
        'Values that fail the round trip — long IDs, leading zeros — are stored as text and never collapse into scientific notation',
      ],
    },
    limits: {
      zh: [
        '顶层不是非空对象数组就报错：单独一个对象、或 [1, 2, 3] 这样的标量数组都不会被硬凑成一张表',
        '一个 JSON 文件只出一张工作表；要多个 sheet 请分别转再在 Excel 里合并',
        '往返不对称：嵌套值以 JSON 文本进了单元格，从 Excel 转回去得到的是那串文本，不是原来的对象结构',
        '表格之外的东西不会被造出来：样式、公式、多表结构、批注都不在输出里',
      ],
      en: [
        'Anything that is not a non-empty array of objects raises an error: a single object, or a scalar array like [1, 2, 3], is not forced into a grid',
        'One JSON file yields one worksheet; for several sheets convert separately and merge in Excel',
        'The round trip is asymmetric: nested values sat in the cell as JSON text, so reading the sheet back gives you that text, not the original structure',
        'Nothing beyond the grid is invented: no styles, formulas, multiple sheets or comments appear',
      ],
    },
    notes: {
      zh: [
        '界面上的路径提示会画出这两步（JSON → CSV → Excel），两步都在本地完成，中间步骤不落盘、不联网',
        '一批最多 200 个文件、单个 100 MB 上限；目标是 Excel 时不显示输出参数面板（那是为图片准备的）',
      ],
      en: [
        'The UI shows both hops (JSON → CSV → Excel); each runs locally, and the intermediate neither touches disk nor the network',
        'Up to 200 files per batch and 100 MB each; no output panel appears for an Excel target, because that panel belongs to images',
      ],
    },
    faq: [
      {
        q: { zh: '为什么提示我数据不是数组？', en: 'Why does it say my data is not an array?' },
        a: {
          zh: '这条链路要的是「对象数组」。一个单独的对象请写成 [{...}]；一个记录字典（{"a": {...}, "b": {...}}）先用文本编辑器改成数组再上传，或按记录拆成多个文件。',
          en: 'The route wants an array of objects. Wrap a single object as [{...}]; for a dictionary of records either reshape it into an array in a text editor before uploading, or split it into one file per record.',
        },
      },
      {
        q: { zh: '嵌套字段能摊成多列吗？', en: 'Can nested fields be spread across columns?' },
        a: {
          zh: '不能。摊平必须替每层键猜一个命名规则（user.address.city 还是 user_city？），而写进单元格的 JSON 文本不需要猜。需要摊平时，先在文本编辑器里把 JSON 改扁平再上传——工作台的编辑视图改的是转换结果，不是源文件。',
          en: 'No. Flattening has to invent a naming rule for every level (user.address.city or user_city?), while JSON text in the cell invents nothing. If you need columns, flatten the JSON in a text editor before uploading — the workbench’s editing view changes the result, not the source file.',
        },
      },
      {
        q: { zh: '经过 CSV 那一步会不会生成中间文件？', en: 'Does the CSV hop create an intermediate file?' },
        a: {
          zh: '不会。中间结果在内存里传给下一步，工作目录不会被写入任何东西，整条链路也没有网络调用。',
          en: 'It does not. The intermediate passes to the next step in memory, nothing is written to your working directory, and the route makes no network call.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-html',
    from: 'md',
    to: 'html',
    shot: 'preview-edit',
    title: {
      zh: 'Markdown 转 HTML——完整文档、内联样式、脚本被剥掉',
      en: 'Markdown to HTML — a full document, scripts removed',
    },
    desc: {
      zh: '浏览器本地把 .md 渲染成可直接双击打开的完整 HTML：GFM 表格与任务列表可用，样式内联，脚本与事件属性在净化阶段移除。',
      en: 'Render .md into a complete, double-clickable HTML document locally: GFM tables and task lists work, styles are inlined, scripts and event attributes removed.',
    },
    lede: {
      zh: '产物不是一段片段，而是从 <!DOCTYPE html> 起头、自带 <style> 的完整文档：系统字体栈、800 px 版心，标题、表格、代码块、引用都排好了样式，<title> 用你自己的文件名（去掉后缀）。渲染前有两道处理：先按 GFM 解析 Markdown，再交净化器过一遍——脚本与 on* 事件属性被移除，同时允许 html 与 svg 两组标签。后者是有原因的：Markdown 里内联的 SVG 图就是内容本身，只开 html 那一档曾把整张图吞掉。',
      en: 'The output is not a fragment but a complete document starting at <!DOCTYPE html> with its own <style>: a system font stack, an 800 px measure, headings, tables, code blocks and quotes all styled, and a <title> taken from your own file name with the extension dropped. Two passes happen before rendering: Markdown is parsed in GFM mode, then the result goes through a sanitiser that removes scripts and on* event attributes while allowing both the HTML and SVG tag sets. The SVG part is deliberate — an inline SVG diagram inside Markdown is the content itself, and an HTML-only profile used to delete the entire graphic.',
    },
    keeps: {
      zh: [
        'GitHub 风格扩展可用：表格、任务列表、删除线都按 GFM 解析',
        '单个换行不会变成 <br>：段落按空行划分，符合 CommonMark 的读法',
        '内联 SVG 图形被保留（净化同时允许 html 与 svg / svgFilters 两组标签），代码块、引用、表格按内联样式排好',
        '产物是完整可双击打开的文档：样式内联、无外部依赖，<title> 取你的文件名并且做了转义',
        '<script> 与 on* 事件属性在净化阶段被移除，输出的 HTML 不带可执行脚本',
      ],
      en: [
        'GitHub-flavoured extensions work: tables, task lists and strikethrough all parse under GFM',
        'A single line break does not become <br> — paragraphs split on blank lines, the way CommonMark reads them',
        'Inline SVG diagrams survive (the sanitiser allows the html and svg / svgFilters profiles together), and code blocks, quotes and tables arrive already styled',
        'The result is a complete document you can double-click: styles inlined, no external dependency, and a <title> taken from your file name and escaped',
        '<script> elements and on* handler attributes are removed during sanitisation, so the HTML carries no executable script',
      ],
    },
    limits: {
      zh: [
        '外链图片只保留引用，转换过程不下载任何素材（这是离线前提）；断网打开时那些位置就是空的',
        'Markdown 里没有的概念不会被造出来：目录、页眉页脚、脚注回链、代码语法高亮都不在输出里',
        '版心是写死的 800 px 单栏样式，不随窗口变成多栏；想换就在编辑视图里改那个 <style>',
        '<html> 上不声明 lang：内容语言是你的，扩展不替你猜（曾经写死英文，屏幕阅读器会把中文按英文规则念）',
      ],
      en: [
        'A remote image stays a reference and nothing is fetched during conversion — that is the offline premise — so those spots are empty when you open the file offline',
        'Concepts Markdown never carried are not invented: no table of contents, headers and footers, footnote back-links or syntax highlighting',
        'The measure is a fixed single 800 px column that will not reflow into columns; change it in the editing view, inside the one <style>',
        'The document declares no lang on <html>: the content language is yours and the extension will not guess — an English default used to make a screen reader pronounce Chinese text with English rules',
      ],
    },
    notes: {
      zh: [
        'HTML 属于可编辑文本格式，单文件批次转完可以在工作台的左右对照里直接改再下载',
        '这一条也是 Markdown → PDF 与 Markdown → Word 的第一步，多步链路由路径搜索自动给出',
      ],
      en: [
        'HTML is an editable text format, so a single-file result can be changed in the workbench’s side-by-side view and then downloaded',
        'This step is also the first hop of Markdown → PDF and Markdown → Word, where the multi-step route is found automatically',
      ],
    },
    faq: [
      {
        q: { zh: '为什么我写的换行没生效？', en: 'Why did my line break not take effect?' },
        a: {
          zh: '解析按 CommonMark：单个换行只是源文本的折行。要么空一行分段，要么在行尾留两个空格强制换行。',
          en: 'Parsing follows CommonMark, where a single newline is a soft break in the source. Leave a blank line to start a new paragraph, or end the line with two spaces to force a break.',
        },
      },
      {
        q: { zh: '能换成自己的 CSS 吗？', en: 'Can I use my own CSS?' },
        a: {
          zh: '输出文档里只有一个内联 <style>。在工作台的编辑视图里替换或追加它即可；本项目不提供主题列表，因为样式跟着产物走，换机器也不会漂移。',
          en: 'The document carries exactly one inline <style>. Replace or extend it in the editing view; there is no theme picker here, because the style travels with the artifact and cannot drift on another machine.',
        },
      },
      {
        q: { zh: '图片要怎么处理？', en: 'What should I do about images?' },
        a: {
          zh: '三种办法：内联成 data URI（最稳，产物自带图）、用相对路径并把 HTML 放在能解析到这些路径的目录、或接受离线打开时图是空的。转换本身不会去下载任何东西。',
          en: 'Three options: inline as a data URI (the most robust, the file then carries its own picture), use relative paths and open the HTML where they resolve, or accept that the gaps show offline. The conversion itself downloads nothing.',
        },
      },
    ],
  },
  {
    slug: 'html-to-pdf',
    from: 'html',
    to: 'pdf',
    shot: 'batch-results',
    title: {
      zh: 'HTML 转 PDF——按 A4 逐页切片，脚本不执行、外链不下载',
      en: 'HTML to PDF as A4 slices — scripts and remote assets out',
    },
    desc: {
      zh: '浏览器本地把 .html 渲染成多页 A4 PDF：800 px 版心按整页高度切片，切片是无损 PNG；脚本被移除，远程资源不会被取回。',
      en: 'Render .html into a multi-page A4 PDF locally: an 800 px layout sliced down its full height, stored as lossless PNG. Scripts are removed; nothing is fetched.',
    },
    lede: {
      zh: '这条路有两层保护和一个取舍。保护一是净化：文档先过 DOMPurify（保留 head 与 <style>，移除脚本），再在隐藏的 iframe 里渲染，而 iframe 的 sandbox 只给 allow-same-origin——脚本没有执行余地。保护二是离线：净化会保留远程 URL，所以渲染前还有一道把远程引用剥掉的步骤，一张远程图不会把「不联网」这条承诺破掉。取舍是产出形态：结果是渲染出来的位图按 A4 切片，页面里没有文字层，所以搜索、复制、朗读都拿不到文字。这一条对本站所有「文档转 PDF」链路都成立。',
      en: 'This route has two protections and one trade-off. The first is sanitisation: the document passes DOMPurify (keeping head and <style>, removing scripts) and is then rendered inside a hidden iframe whose sandbox grants allow-same-origin only, so a script has nowhere to run. The second is the offline promise: sanitising keeps remote URLs, so a further pass strips remote references before rendering — one remote <img> cannot break the no-network claim. The trade-off is what comes out: rendered pixels sliced onto A4, with no text layer, so search, copy and read-aloud find nothing. That holds for every document-to-PDF route here.',
    },
    keeps: {
      zh: [
        '整份文档按 800 px 版心排版，高度全部保留并切成 A4（210 × 297 mm）逐页写入，不是一张拉长的单页图',
        '文档自己的 CSS 生效（head 与 <style> 都留着），同时通过沙箱 iframe 隔离，页面样式不会污染工作台',
        '切片是 PNG 且用 zlib 9 + Paeth：实测十个文档形状里它每一份都比 FAST 档小 1%–8%，文字与数据页比 JPEG 切片小 13%–31%',
        '图片与字体落定后才截图：先等加载，必要时再停 100 ms 让布局落定（只在真有图片、字体或动效的文档上等）',
        '取消以「一页」为粒度：每切一页检查一次中断，两个画布在退出时都会释放',
      ],
      en: [
        'The whole document lays out at an 800 px measure and its full height is kept, sliced onto A4 pages (210 × 297 mm) rather than stretched into one long page',
        'The document’s own CSS applies (head and <style> are kept) inside a sandboxed iframe, so page styles cannot leak into the workbench',
        'Slices are PNG at zlib level 9 with a Paeth predictor: across the ten measured document shapes it beat the FAST level every time by 1%–8%, and text and data pages came out 13%–31% smaller than a JPEG slice',
        'Images and fonts settle before capture: the loader waits, and where a document genuinely has images, fonts or motion it pauses another 100 ms for layout',
        'Cancellation has page granularity: the abort signal is checked before every slice and both canvases are released on the way out',
      ],
    },
    limits: {
      zh: [
        '没有文字层：PDF 里的字是画出来的，搜索、复制、屏幕阅读器都取不到内容',
        '远程引用在渲染前被剥掉，剥空之后的引用与相对路径引用会换成虚线方框占位；只有浏览器真解得开的 data: / blob: 图片能进 PDF，解不开的 data: 与已撤销的 blob: 会在那处留空，远程图片、远程字体与远程 CSS 一律不下载',
        '长文档像素比会降：高度超过 2000 px 用 1.5 倍、超过 4000 px 用 1 倍，超长页的字不如短页锐利',
        '整页高度有上限：超出浏览器单次渲染能吃的长度时直接报错，而不是交出一份内容不全的 PDF——那种文档请拆成更短的部分分批转换',
        '分页只看高度，不懂「章节起新页」；纸张固定 A4 竖版，不能选横版或其它尺寸',
      ],
      en: [
        'There is no text layer: the characters are drawn, so search, copy and screen readers find nothing to work with',
        'Remote references are stripped before rendering, and what is left of them — the emptied reference, plus any relative path — is replaced by a dashed placeholder box; only a data: or blob: picture the browser can still decode reaches the PDF, one it cannot (a revoked blob:, an unreadable data:) leaves that position empty, and no remote image, font or stylesheet is ever downloaded',
        'Long documents drop resolution: past 2000 px of height the ratio is 1.5× and past 4000 px it is 1×, so very long pages are less crisp than short ones',
        'Page height has a ceiling: past what the browser can render in one pass the conversion reports an error instead of delivering a PDF missing content — split such a document and convert the parts separately',
        'Pagination only measures height and does not understand “start a new page per chapter”; the paper is fixed portrait A4 with no size or orientation choice',
      ],
    },
    notes: {
      zh: [
        '目标是 PDF 时输出参数面板不出现（那是为图片准备的），DPI 只在来源是 PDF 时才有意义',
        '单个文件 100 MB、一批最多 200 个；文档在 10 秒内没加载完只报该文件超时，批次里其余继续',
      ],
      en: [
        'The output panel is not offered for a PDF target (it belongs to image targets), and DPI matters only when the source is a PDF',
        '100 MB per file and up to 200 files per batch; a document that never finishes loading inside 10 seconds reports its own timeout while the batch continues',
      ],
    },
    faq: [
      {
        q: { zh: '为什么 PDF 里选不中文字？', en: 'Why can I not select the text in the PDF?' },
        a: {
          zh: '因为产物是渲染出来的位图。本站的所有 PDF 输出都走渲染这条路（HTML 是其中唯一能排版的中间格式），没有文字层生成路径；要可检索的文字，就交付 HTML、Markdown 或 Word。',
          en: 'Because the artifact is rendered pixels. Every PDF this tool emits goes through that rendering path — HTML is its only typesetting intermediate — and there is no text-layer generator to call. For searchable text, deliver HTML, Markdown or Word instead.',
        },
      },
      {
        q: { zh: '为什么图片不见了？', en: 'Why did the images vanish?' },
        a: {
          zh: '远程引用在渲染前被剥掉，这是离线承诺的必要部分；而相对路径在渲染用的沙箱文档里指向的是扩展自己的包，不是你 HTML 旁边的那个目录。所以这两类引用统一换成虚线方框——位置留着，内容不猜；只有等克隆到一半才失败的图（浏览器解不开的 data:、已经撤销的 blob:）会在那处直接留空。想让图片进 PDF，把它内联成 data URI；这一轮有图片没拿到，结果卡片上会按张数写明。',
          en: 'Remote references are stripped before rendering — that is what keeps the offline promise, and a relative path resolves inside the sandboxed document against the extension package, not the folder next to your HTML. Both shapes therefore become a dashed placeholder box: the position is kept, the content is not guessed. Only a picture that fails later, while the clone is being built — a data: the browser will not decode, a blob: already revoked — leaves that position empty. Inline a picture as a data URI to get it into the PDF, and the result card counts how many positions were affected.',
        },
      },
      {
        q: { zh: '能控制纸张大小或分页位置吗？', en: 'Can I choose the paper size or where pages break?' },
        a: {
          zh: '不能：A4 竖版、按高度切。需要精确分页位置时，在源 HTML 里控制块的高度与间距（比如给章节留出足够的块），或转成 PDF 后在 PDF 编辑器里重排。',
          en: 'No: portrait A4, sliced by height. To influence where a break lands, control block heights and spacing in the source HTML (give a section enough vertical mass), or re-impose the PDF afterwards in a PDF editor.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-html',
    from: 'pdf',
    to: 'html',
    shot: 'preview-edit',
    published: '2026-10-02',
    title: {
      zh: 'PDF 转 HTML——本地还原文字与链接，带页面分隔',
      en: 'PDF to HTML locally — text and links, page breaks kept',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 按阅读顺序提取文字层，链接标注按协议白名单保留，每页之间插入分页线，产出一个自包含的 .html。全程不上传，也不含 OCR：扫描件没有文字层。',
      en: 'pdf.js extracts the text layer in reading order, keeps link annotations through a scheme allowlist and marks page breaks in one self-contained .html. No OCR.',
    },
    lede: {
      zh: '这条是 PDF → 纯文本的「更值得后续加工」版本：同样只吃文字层，但产出的是带段落、标题与超链接的 HTML，而不是一个扁平的 .txt。标题有两个来源：PDF 自带的书签（大纲）按层级写成 `<h1>`–`<h6>`，前提是书签的文字与该行的文字「整行相等」；没有书签、或书签对不上的文档退回到几何判断——一行全大写、短于 80 字符的文字会被认成标题写成 `<h2>`，其余成段；同一页里落在同一基线上的文字拼回一行，段与段之间靠基线的纵向间距判断。这套判断是几何的，不是语义的，所以下面「丢弃项」里那条关于分栏与旋转文字的说明值得先读。',
      en: 'This is the "worth keeping as a document" sibling of PDF to plain text: same text layer only, but the output has paragraphs, headings and hyperlinks instead of a flat .txt. Headings come from two places: the PDF’s own bookmarks (its outline) are written as `<h1>`–`<h6>` at their outline depth, provided the bookmark text equals the line it lands on — a whole line, not a prefix. With no outline, or nothing that matches, the route falls back to the geometric test: a short all-caps line under 80 characters becomes an `<h2>`, everything else becomes a paragraph; characters sitting on the same baseline are joined back into one line, and lines are split by how far apart their baselines are. That test is geometric, not semantic, which is why the column-and-rotated-text limit below is worth reading first.',
    },
    keeps: {
      zh: [
        '文字层按基线拼回行、按阅读顺序成段，pdf.js 在你自己机器上解析',
        '书签按层级写成 `<h1>`–`<h6>`（要求整行文字与书签一致）；没有书签时，短而全大写的行升级为 `<h2>`，其余成 `<p>`；同一页的文字不会被打散成单字',
        '链接标注保留为 `<a>`，并且按协议白名单过滤——只放 https、mailto 与 tel，PDF 自带的 javascript: 与 data: 地址被剔除',
        '每页之间插入一条带 `page-break-after` 的分隔线，转成 Word 或 PDF 时这条边界仍然看得见',
        '产出的 HTML 自包含：内联样式、系统字体栈、`<title>` 用你自己的文件名，没有外部请求',
      ],
      en: [
        'The text layer is rejoined into lines by baseline and into paragraphs in reading order, parsed by pdf.js on your own machine',
        'Bookmarks become `<h1>`–`<h6>` at their outline depth when the line equals the bookmark title; otherwise a short all-caps line is promoted to an `<h2>` and the rest become `<p>`, and text on a page is not shattered into single characters',
        'Link annotations survive as `<a>`, filtered by a scheme allowlist — https, mailto and tel pass, while javascript: and data: targets carried by the PDF are removed',
        'A separator carrying `page-break-after` is placed between pages, so that boundary is still visible when the HTML later goes to Word or back to PDF',
        'The HTML is self-contained: inline styles, a system font stack, a `<title>` taken from your own file name, and no external request',
      ],
    },
    limits: {
      zh: [
        '扫描件、拍照件、图片型 PDF 提不出文字——没有 OCR，也不会替你猜',
        '版式不进 HTML：分栏、页眉页脚、字体、字号、颜色与表格线都会消失；PDF 里的表格只是排过版的字符',
        '行与行的判断只看纵坐标，所以跨栏排布、旋转 90° 的文字、以及同一基线上间距很大的两块文字可能被拼错或拆错',
        'PDF 内嵌图片不按对象导出，产物里没有 `<img>`；要页面图像请走 PDF → 图片',
        '因此 PDF → CSV / JSON / Excel 在界面上是置灰的，不是点了才报错（PDF 不携带表格结构，见 utils/core/conversion-policy.ts）',
      ],
      en: [
        'Scans, photographs and image-only PDFs yield nothing — there is no OCR and no guesswork in its place',
        'Layout does not enter HTML: columns, headers and footers, fonts, sizes, colour and rules are gone; a table in a PDF is typeset characters, not structure',
        'Lines are decided on the vertical coordinate alone, so multi-column text, text rotated 90°, and two blocks sharing a baseline can be joined or split wrongly',
        'Images embedded in the PDF are not exported as objects and there is no `<img>` in the output; for page imagery take the PDF to image route',
        'That is why PDF → CSV / JSON / Excel is greyed out in the picker instead of failing after you click: a PDF carries no table structure (see utils/core/conversion-policy.ts)',
      ],
    },
    notes: {
      zh: [
        '同一份 PDF 还能直接转 Markdown（保留标题与段落层级）或纯文本，三者同源、取舍一致',
        '多份 PDF 可以一批处理，单个上限 100 MB，一批最多 200 个文件；单个文件失败只报该文件',
        '带密码或损坏的 PDF 会给出该文件的解析失败提示，不会静默产出空文档',
      ],
      en: [
        'The same PDF can also go straight to Markdown, which keeps heading and paragraph hierarchy, or to plain text — three outputs from one source with the same trade-offs',
        'Several PDFs run in one batch, 100 MB per file and 200 files per run; one unreadable file reports only itself',
        'An encrypted or damaged PDF reports its own parse failure for that file rather than quietly producing an empty document',
      ],
    },
    faq: [
      {
        q: { zh: '转出来的 HTML 和原来的 PDF 长得一样吗？', en: 'Will the HTML look like the original PDF?' },
        a: {
          zh: '不会，也不该期待。PDF 保存的是"这一页在哪个坐标画哪一笔"，HTML 保存的是文档结构与文字；这条转换带走文字与链接，剩下的一律由浏览器排版决定。需要视觉一致就用 PDF → 图片，那才是逐页像素。',
          en: 'No, and it would be wrong to expect it. A PDF stores which stroke is painted at which coordinate on a page; HTML stores structure and text. This route carries text and links, and the browser does the rest of the layout. For visual fidelity take PDF to image, which is page-by-page pixels.',
        },
      },
      {
        q: { zh: '为什么有的段落被拆成好几行？', en: 'Why did some paragraphs break into several lines?' },
        a: {
          zh: '因为行边界是按基线纵坐标推断的：PDF 里每行文字的位置是绝对坐标，没有"这里是一段"的标记。跨栏、旋转文字或行距异常紧密的排版都会让推断出错。改法是回到导出 PDF 之前的源文件（Word / Markdown / HTML），那里真的有段落。',
          en: 'Because line breaks are inferred from baseline coordinates: in a PDF every line sits at an absolute position with no marker saying "a paragraph ends here". Column layouts, rotated text and unusually tight leading all break that inference. The fix is the file the PDF was exported from (Word, Markdown, HTML), where paragraphs genuinely exist.',
        },
      },
      {
        q: { zh: '生成的 HTML 为什么没写语言标记？', en: 'Why is there no language attribute in the generated HTML?' },
        a: {
          zh: '刻意不写。提取出的文字是文档自己的语言，给根元素标 `lang="en"` 会让读屏软件用错误的发音规则去读一份中文报告，所以这一版宁愿留空，也不做一个页面无法证实的断言。',
          en: 'Deliberately absent. The extracted text is in whatever language the document is, and labelling the root `lang="en"` would make a screen reader apply English pronunciation rules to a Chinese report. This version leaves it unset rather than assert something the file cannot support.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-jpg',
    from: 'pdf',
    to: 'jpg',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'PDF 转 JPEG——本地逐页栅格化，清晰度与质量可调',
      en: 'PDF to JPEG locally — one page per image, density set',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 把 PDF 逐页渲染成 JPEG：渲染密度四档 96 / 144 / 200 / 300 DPI（默认 144）、质量档 40%–90%、可指定最长边，多页自动一页一张装进 ZIP。文件不出本机，也不含 OCR。',
      en: 'Render each PDF page to JPEG at 96, 144, 200 or 300 DPI (144 by default), quality 40%–90%, optional longest edge; multi-page batches arrive as a ZIP.',
    },
    lede: {
      zh: '这条和 PDF → PNG 是同一套渲染，区别只在最后那一次编码：本项目给 JPEG 单独开了一条直接边，而不是"先出 PNG 再转 JPEG"。原因很实际——中间那次无损编码不改变任何像素，只会让每个页面多走一遍编码、并让 ZIP 里的扩展名变成 .png。栅格化是像素这条路唯一的真瓶颈，所以能省的步骤就省掉。',
      en: 'This shares its whole render with PDF to PNG and differs only in the final encode: the extension gives JPEG its own direct edge rather than going PDF → PNG → JPEG. The reason is mundane — the lossless middle step changes no pixels, costs one extra encode per page, and would leave a ZIP full of .png files. Rasterising is the only real cost on a pixel route, so the wasted step is not taken.',
    },
    keeps: {
      zh: [
        '每一页独立成一张图，按 PDF 里的页码命名（`page-3.jpg` 就是第 3 页，只转第 3 页时也一样）',
        '渲染密度四档可选：96 / 144 / 200 / 300 DPI，默认 144；数值直接换算成 pdf.js 的页面缩放（DPI ÷ 72）',
        '页面自身的矢量图形、文字的字形、颜色与渐变都按矢量渲染路径栅格化，不是截屏那种二次放大',
        '质量档 40%–90% 与目标体积只在链路末尾这次编码生效，中间步骤不吃这两个参数',
        '超过浏览器画布上限（8192 px 一边）的页面自动按缩放上限收敛，是缩到能渲染，不是裁掉',
      ],
      en: [
        'Each page becomes its own image, named by its page number in the document — `page-3.jpg` is page 3, and stays page 3 when you convert only that page',
        'Render density comes as 96, 144, 200 or 300 DPI with 144 as the default, converted straight into pdf.js page scale (DPI ÷ 72)',
        'Vector shapes, letterforms and colour or gradients on the page are rasterised along the vector render path, not magnified from a screenshot',
        'Quality steps of 40%–90% and a target size act only at this final encode — intermediate steps ignore both',
        'A page that would exceed the browser canvas limit (8192 px on an edge) is scaled down to fit rather than cropped',
      ],
    },
    limits: {
      zh: [
        '产物是像素：文字不再是可选中、可复制的字符，也不能再被搜索；想保留文字层就转 HTML 或纯文本',
        '透明不保留：渲染前每页先铺一层白，而这条路的三个图片终点（PNG / JPEG / WebP）都是这样画的，所以从 PDF 出来的图一律没有透明区域',
        '有损编码：默认质量下小字号与细线会先变糊，需要清晰锐利请选 PNG 或提高 DPI',
        'PDF 内嵌的表单控件、批注、书签与附件不进图像；页面里"看起来是图片"的部分会跟着渲染进去，但无法再按对象取出',
        '扫描件在这里只是分辨率更高的图片，仍然提取不出文字——项目不含 OCR',
      ],
      en: [
        'The output is pixels: text is no longer selectable, copyable or searchable. Keep the text layer by going to HTML or plain text instead',
        'Transparency does not survive: each page is painted white before it renders, and all three image targets (PNG, JPEG, WebP) are drawn that way, so a picture out of a PDF has no transparent areas',
        'It is a lossy encode: at the default quality small type and hairlines soften first. Choose PNG, or raise the density, when sharpness is the requirement',
        'Form fields, annotations, bookmarks and embedded files are not part of the image; whatever looks like a picture on the page is rendered in, but cannot be lifted out as an object',
        'A scan comes back as a higher-resolution picture of a scan, still without extractable text — the extension ships no OCR',
      ],
    },
    notes: {
      zh: [
        '只想转其中几页：在页面范围里填 1,3-5 这类写法。填了的范围在这份文档里一页都对不上时会直接报错，而不是"干脆全给你"',
        '单页 PDF 直接得到一张 .jpg；两页以上才打包成 ZIP',
        '一批最多 200 个文件、单个文件 100 MB 上限；页数多时可以先用页面范围试一页，确认清晰度再全量跑',
      ],
      en: [
        'To convert only some pages, type a range such as 1,3-5. A range that matches no page in this document fails outright instead of quietly handing you the whole file',
        'A one-page PDF gives you one .jpg directly; two or more pages arrive inside a ZIP',
        'Up to 200 files per batch with a 100 MB per-file ceiling; on a long document, render a single page first to check sharpness before running the lot',
      ],
    },
    faq: [
      {
        q: { zh: 'DPI 该设多少？', en: 'What density should I pick?' },
        a: {
          zh: '给人看、发群里：默认 144 就够，它与这个转换在有了可调密度之前所用的缩放完全一致。要打印、要放大看清小字：选最高的 300。档位越高像素越多、ZIP 越大，而页面内容不会因此多出任何细节——它只是把同一套矢量画得更密。',
          en: 'For reading and messaging: the default 144, which is exactly the scale this converter used before the option existed. For print or zooming into small type: the top step, 300. More density means more pixels and a bigger ZIP, not more detail in the page — it draws the same vectors at a finer grid.',
        },
      },
      {
        q: { zh: '为什么转出来全是白底？', en: 'Why is the background white?' },
        a: {
          zh: '因为渲染前每页都会先铺一层白。这是这条转换自己的决定，不是渲染出错，而且 PNG 与 WebP 同样先铺白——换终点换不回透明，从 PDF 出来的三种图片都没有透明区域。',
          en: 'Because each page is painted white before it renders. That is this converter’s own decision, not a rendering fault, and PNG and WebP are painted white as well — changing the target does not win alpha back, and none of the three image outputs from a PDF has transparent areas.',
        },
      },
      {
        q: { zh: '100 页的 PDF 一次跑完会怎样？', en: 'What happens if I run a 100-page PDF?' },
        a: {
          zh: '会得到一个含 100 张图的 ZIP，而且这是这条路径最重的用法——每页一张画布、逐页编码。所以这一路支持中途取消：取消后已完成的部分不会伪装成"成功"，界面会明确标成被中断。真嫌慢就用页面范围只跑要的页。',
          en: 'You get a ZIP holding 100 images, which is the heaviest shape this route has: one canvas per page, encoded page by page. That is why it answers cancellation while it works, and a cancelled run is reported as interrupted rather than dressed up as success. If the wait is the problem, narrow the page range to the pages you need.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-png',
    from: 'pdf',
    to: 'png',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'PDF 转 PNG——本地逐页栅格化的无损位图，密度与最长边可调',
      en: 'PDF to PNG locally — lossless page rasters, density set',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 把 PDF 逐页渲染成 PNG：渲染密度四档 96 / 144 / 200 / 300 DPI（默认 144）、可指定最长边，多页自动一页一张装进 ZIP。PNG 没有质量档也不吃目标体积——无损的意思是不替你决定丢哪些像素。文件不出本机，也不含 OCR。',
      en: 'Render each PDF page to PNG at 96, 144, 200 or 300 DPI with an optional longest edge, one image per page in a ZIP. PNG takes no quality step: it is lossless.',
    },
    lede: {
      zh: '这条和 PDF → JPEG 共用同一套渲染，区别只在最后那一次编码：PNG 无损，所以画面上有什么就留下什么，包括 JPEG 会先糊掉的细线与极小字号。代价是体积——一页密排文字的 PNG 通常比同一页的 JPEG 大不少，大多少由内容决定，这一页不替你写百分比。第二件事得说在前面：透明。这条转换在把页面画到画布之前先铺一层白，PNG、JPEG、WebP 三个终点一样处理，所以从 PDF 出来的图片没有透明区域；PNG 确实能带 Alpha，那是图片之间那几条路的用法。',
      en: 'Same render as PDF to JPEG, different final encode: PNG is lossless, so whatever lands on the page survives — including the hairlines and very small type a JPEG blurs first. The price is size; a text-dense page as PNG usually sits well above the same page as JPEG, and how far above belongs to the content, so this page quotes no percentage. The second thing belongs up front: transparency. This converter paints each page white before the page is drawn onto the canvas, and PNG is treated exactly like JPEG and WebP, so nothing coming out of a PDF has transparent areas. PNG can certainly carry alpha — that is what the image-to-image routes use it for.',
    },
    keeps: {
      zh: [
        '每一页独立成一张图，按 PDF 里的页码命名（`page-3.png` 就是第 3 页，只转第 3 页时也一样）',
        '渲染密度四档可选：96 / 144 / 200 / 300 DPI，默认 144；数值直接换算成 pdf.js 的页面缩放（DPI ÷ 72）',
        '无损编码：这一条没有质量档，也不接受目标体积，编码器不会替你决定丢哪些像素',
        '页面自身的矢量图形、文字的字形、颜色与渐变都按矢量渲染路径栅格化，不是截屏那种二次放大',
        '最长边可把整页等比缩到 800–4096 px 之间：先按密度画，再缩边，是缩放不是裁切',
        '超过浏览器画布上限（8192 px 一边）的页面自动按缩放上限收敛，是缩到能渲染，不是裁掉',
      ],
      en: [
        'Each page becomes its own image, named by its page number in the document — `page-3.png` is page 3, and stays page 3 when you convert only that page',
        'Render density comes as 96, 144, 200 or 300 DPI with 144 as the default, converted straight into pdf.js page scale (DPI ÷ 72)',
        'A lossless encode: this route has no quality step and takes no target size, so nothing decides for you which pixels to discard',
        'Vector shapes, letterforms and colour or gradients on the page are rasterised along the vector render path, not magnified from a screenshot',
        'A longest edge between 800 and 4096 px scales the whole page proportionally: it is drawn at the chosen density first, then shrunk — never cropped',
        'A page that would exceed the browser canvas limit (8192 px on an edge) is scaled down to fit rather than cropped',
      ],
    },
    limits: {
      zh: [
        '产物是像素：文字不再是可选中、可复制的字符，也不能再被搜索；想保留文字层就转 HTML 或纯文本',
        '透明不保留：渲染前每页先铺一层白，PNG、JPEG、WebP 三个终点一样处理，所以从 PDF 出来的图一律没有透明区域',
        '体积是三条图片终点里最大的一条，而且没有质量档可换——要控体积就用最长边，或者换 WebP',
        'PDF 内嵌的表单控件、批注、书签与附件不进图像；页面里"看起来是图片"的部分会跟着渲染进去，但无法再按对象取出',
        '扫描件在这里只是分辨率更高的图片，仍然提取不出文字——项目不含 OCR',
      ],
      en: [
        'The output is pixels: text is no longer selectable, copyable or searchable. Keep the text layer by going to HTML or plain text instead',
        'Transparency does not survive: every page is painted white before it renders and all three image targets are handled the same way, so a picture out of a PDF has no transparent areas',
        'It is the largest of the three image targets, with no quality step to trade against size — use the longest edge, or take WebP, when the bytes matter',
        'Form fields, annotations, bookmarks and embedded files are not part of the image; whatever looks like a picture on the page is rendered in, but cannot be lifted out as an object',
        'A scan comes back as a higher-resolution picture of a scan, still without extractable text — the extension ships no OCR',
      ],
    },
    notes: {
      zh: [
        '只想转其中几页：在页面范围里填 1,3-5 这类写法。填了的范围在这份文档里一页都对不上时会直接报错，而不是"干脆全给你"',
        '单页 PDF 直接得到一张 .png；两页以上才打包成 ZIP',
        '一批最多 200 个文件、单个文件 100 MB 上限；长文档先跑一页看体积，再决定要不要全量',
      ],
      en: [
        'To convert only some pages, type a range such as 1,3-5. A range that matches no page in this document fails outright instead of quietly handing you the whole file',
        'A one-page PDF gives you one .png directly; two or more pages arrive inside a ZIP',
        'Up to 200 files per batch with a 100 MB per-file ceiling; on a long document, render one page first to see what it costs before running the lot',
      ],
    },
    faq: [
      {
        q: { zh: '什么时候该选 PNG 而不是 JPEG？', en: 'When should I take PNG over JPEG?' },
        a: {
          zh: '还要再编辑这张图（抠图、标注、再压一次）、页面上有极小字号或细线、或者你要的是一份"不再叠一层有损"的存档——这几种情形选 PNG。要发群里、要体积、要"任何设备都打得开"——选 JPEG 或 WebP。三条路的 PDF 输入完全一样，同一份文档混着试的成本很低。',
          en: 'Take PNG when the image will be edited again (cut-outs, annotations, another compression pass), when the page carries very small type or hairlines, or when the point is an archive that adds no lossy pass of its own. Take JPEG or WebP for messaging, for size, or for "this has to open anywhere". The PDF side is identical across all three, so trying them against one document is cheap.',
        },
      },
      {
        q: {
          zh: 'PNG 不是支持透明吗，为什么我的结果是白底？',
          en: 'Doesn’t PNG support transparency? Why is my result white?',
        },
        a: {
          zh: '格式支持不等于这条链路有内容可装。这条转换在把页面画到画布之前先铺一层白，三个图片终点都是这么画的，所以原本会透空的地方在结果里就是白的。需要保留透明请在图片格式之间转——SVG 转 PNG、PNG 转 WebP 那几条是真的带 Alpha 的。',
          en: 'A format being capable is not the same as this route having anything to put in it. The page is painted white before it is drawn, for all three image targets, so where the page would have been transparent the result is simply white. Where transparency is the requirement, convert between image formats instead — SVG to PNG and PNG to WebP really do carry alpha.',
        },
      },
      {
        q: { zh: '调 DPI 和设最长边有什么区别？', en: 'What is the difference between density and the longest edge?' },
        a: {
          zh: 'DPI 决定把页面画成多大的图（画布尺寸 = 页面尺寸 × DPI ÷ 72），最长边决定这张图最终允许留多宽——先按 DPI 画，再等比缩进最长边以内。只看屏幕就用默认 144；要打印就选 300，再用最长边把上限控住。',
          en: 'Density decides how large the page is drawn (canvas size = page size × DPI ÷ 72); the longest edge decides how wide the result is allowed to stay — it is drawn at the chosen density first and then scaled proportionally inside that edge. Keep the default 144 for screen reading; pick 300 for print and cap the outcome with the edge.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-webp',
    from: 'pdf',
    to: 'webp',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'PDF 转 WebP——本地逐页出图，通常比 JPEG 更小',
      en: 'PDF to WebP locally — one page per image, vs. JPEG',
    },
    desc: {
      zh: '浏览器本地把 PDF 逐页渲染成 WebP：密度四档 96 / 144 / 200 / 300 DPI、质量档 40%–90%、可指定最长边，多页一页一张装进 ZIP。它与 JPEG 的差别只有体积与容器兼容性——渲染前一样先铺白底，所以这条路没有透明输出。文件不出本机。',
      en: 'Render each PDF page to WebP at 96–300 DPI, quality 40%–90%, one image per page in a ZIP. Like the JPEG route it paints the page white first: no transparency.',
    },
    lede: {
      zh: '和 PDF → JPEG 同一条渲染、同一个直接边，最后一步换成 WebP 编码。选它的理由只有一个：同一页往往更小（幅度取决于页面内容，这一页不替你写百分比），前提是接收方读得开 WebP。别把 Alpha 通道算成理由——WebP 支持透明，但这条转换在渲染前给每页铺白底，通道里没有内容可装；真要透明请在图片之间转，PNG 转 WebP 那一条是真的带 Alpha 的。',
      en: 'Same render and same direct edge as PDF to JPEG, with a WebP encode at the end. There is one reason to pick it: the same page is often smaller (the margin belongs to the content, and this page will not quote you a percentage), provided the recipient opens WebP at all. Alpha is not that reason — WebP can carry transparency, but this converter paints every page white before rendering, so the channel has nothing to hold. Where transparency is the requirement, convert between images instead: PNG to WebP really does carry it.',
    },
    keeps: {
      zh: [
        '每页独立成图、按 PDF 页码命名（`page-3.webp` 就是第 3 页）',
        '渲染密度四档 96 / 144 / 200 / 300 DPI，默认 144；页面按矢量渲染路径栅格化',
        '质量档 40%–90% 与目标体积只在末尾这次编码生效，中间步骤不吃',
        'WebP 有质量档与目标体积两根杠杆，是有损容器；它比 JPEG 多出来的 Alpha 能力在这条路上用不上——渲染前已经铺了白底',
        '超过 8192 px 一边的页面自动缩到画布可承受的范围，不裁切',
      ],
      en: [
        'One image per page, named by document page number — `page-3.webp` is page 3',
        'A chosen density of 96, 144, 200 or 300 DPI, 144 by default, rasterised along the vector render path',
        'Quality steps of 40%–90% and a target size act only at the final encode; intermediate steps ignore both',
        'WebP brings two levers, a quality step and a target size, and is a lossy container; the alpha it has and JPEG does not is unusable on this route, because the page is already painted white',
        'Pages past 8192 px on an edge scale down to what the canvas can allocate, rather than clip',
      ],
    },
    limits: {
      zh: [
        '产物是像素，文字不可选中、不可复制、不可搜索',
        '这一条渲染前每页都铺白底，所以原本透明的页面区域在结果里也是白的；三个图片终点一样处理，从 PDF 拿不到透明输出',
        '接收方能不能打开 WebP 由它决定：邮件客户端与部分旧版办公套件仍不友好，这时 JPEG 或 PNG 更稳',
        '有损编码，细线与极小字号会先糊；要"无损存档"就选 PNG',
        '表单控件、批注、书签与附件不进图像；扫描件仍然提取不出文字（无 OCR）',
      ],
      en: [
        'The output is pixels — text is not selectable, copyable or searchable',
        'Every page is painted white before this render, so an area that was transparent reads as white; all three image targets are handled the same way and none of them yields transparency out of a PDF',
        'Whether WebP opens is the recipient’s call: mail clients and some older office suites are still unfriendly, where JPEG or PNG is the safer answer',
        'A lossy encode gives up hairlines and very small type first; choose PNG when the point is a lossless archive',
        'Form fields, annotations, bookmarks and attachments are not rendered out, and a scan still yields no extractable text (no OCR)',
      ],
    },
    notes: {
      zh: [
        '与 PDF → PNG / JPEG 共享同一套输出参数面板：最长边、质量、目标体积、渲染密度、页面范围',
        '单页 PDF 直接给一张 .webp，两页以上打包成 ZIP',
        '一批最多 200 个文件、单个文件 100 MB 上限，中途可取消且取消会被如实标出',
      ],
      en: [
        'PDF to PNG and PDF to JPEG share this panel: longest edge, quality, target size, render density and page range',
        'A single-page PDF returns one .webp; two or more pages arrive inside a ZIP',
        'Up to 200 files per batch with a 100 MB per-file ceiling, cancellable at any point and reported truthfully as interrupted',
      ],
    },
    faq: [
      {
        q: { zh: 'WebP 一定比 JPEG 小吗？', en: 'Is WebP always smaller than JPEG?' },
        a: {
          zh: '不保证。文字密排的页面往往省得多，照片型页面省得少，幅度是内容的属性而不是格式的常数。这条页不写具体百分比，因为那是可以实测的东西，不该靠印象。',
          en: 'Not guaranteed. Text-heavy pages tend to gain most, photographic pages least, and the margin is a property of the content rather than a constant of the format. This page quotes no percentage it has not measured.',
        },
      },
      {
        q: { zh: '三种图片格式之间我该选哪个？', en: 'Which of the three image formats should I pick?' },
        a: {
          zh: '要无损存档：PNG。要"到处都打得开"：JPEG。要在两者之间取体积、并且接收方确定支持 WebP：WebP。这三条判断只关乎容器与编码，透明不在其列——这一路的三个终点都先铺白底，谁都不带透明。PDF 那边输入完全一样，所以混着试同一份文档的成本很低。',
          en: 'PNG for a lossless archive. JPEG where "must open anywhere" is the requirement. WebP to buy size between the two, provided the recipient is known to read it. Those three calls are about container and encoder, and transparency is not among them — all three targets are painted white first. The PDF input side is identical, so trying all three against one document is cheap.',
        },
      },
      {
        q: { zh: '能只转其中几页吗？', en: 'Can I render only some of the pages?' },
        a: {
          zh: '能，填页面范围（例如 1,3-5）。这一路是唯一支持页码筛选的转换，因为"一百页全栅格化"正是它最重的用法；范围里一页都落不上时会直接报错，而不是退回全量。',
          en: 'Yes — give it a page range such as 1,3-5. This is the only route in the extension that filters by page number, precisely because rasterising a hundred pages is its worst case. A range that lands on no page fails rather than falling back to the whole document.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-docx',
    from: 'pdf',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-02',
    title: {
      zh: 'PDF 转 Word——本地两步走完，中间产物不落盘',
      en: 'PDF to Word (.docx) locally — two steps, nothing on disk',
    },
    desc: {
      zh: '这条是多步链：pdf.js 先按阅读顺序把文字层提成 HTML，再由它打包成 .docx，中间的 HTML 只在内存里、不会写到你的下载目录。全程离线，无 OCR，也不生成原生 OOXML 段落结构。',
      en: 'A two-step chain: pdf.js lifts the text layer into HTML in reading order, that HTML is packed into .docx, and the intermediate never leaves memory. No OCR.',
    },
    lede: {
      zh: '先说这条路的真相，因为它决定了产物好不好用：Word 的 .docx 本应是一棵由段落、运行与样式组成的 XML 树，而这个转换产出的是 Word 的 altChunk——文档包里嵌一份 HTML，由 Word 打开时自己排版。好处是真的能编辑、能存回 .docx；代价是它带不来 PDF 里没有的任何东西（版式、分页、字体），也别指望段落样式与手工排版的 Word 文档一致。换句话说：这是"把 PDF 里的文字变成可编辑内容"，不是"把 PDF 变成 Word"。',
      en: 'Start with what this route actually is, because it decides how useful the file is. A .docx is meant to be an XML tree of paragraphs, runs and styles; this converter produces a Word altChunk instead — an HTML part embedded in the package, which Word lays out itself when it opens. The upside is real: the text is editable and saves back as .docx. The cost is that it cannot bring what the PDF never carried (layout, pagination, fonts), and paragraph styles will not match a hand-built Word document. In one line: this turns the words in a PDF into editable content, it does not turn a PDF into a Word document.',
    },
    keeps: {
      zh: [
        '文字层按阅读顺序进正文，书签按层级成为标题、没有书签时短而全大写的行成为标题，其余成段——与 PDF → HTML 同一套判断',
        '链接标注保留为可点击超链接，并按协议白名单过滤（javascript: 与 data: 一律剔除）',
        '每页之间的分隔线保留下来，在 Word 里仍然看得见页面边界',
        '中间那份 HTML 只是内存里的过路产物，不会出现在你的下载里，也就没有"多下一个文件"的意外',
        '这条链的两端各自可独立使用：只要 HTML 就停在第一步，只要可编辑文字就直接跑这条',
      ],
      en: [
        'The text layer enters the body in reading order, the PDF’s own bookmarks become headings at their outline depth and, where there is no outline, a short all-caps line becomes a heading — the rest become paragraphs, on the same judgement PDF to HTML makes',
        'Link annotations survive as clickable hyperlinks, filtered by scheme allowlist (javascript: and data: removed outright)',
        'The separator between pages carries through, so page boundaries stay visible inside Word',
        'The intermediate HTML exists only in memory and never appears in your downloads, so there is no extra file to wonder about',
        'Both halves stand alone: stop at the first step if you only wanted HTML, and take this route when editable text is the goal',
      ],
    },
    limits: {
      zh: [
        '不是原生 OOXML 段落树：altChunk 由 Word 现场排版，字体、行距、样式与真正的 Word 模板不一致，也不带页眉页脚与页面设置',
        '版式与表格不保留：PDF 里的表格只是排过版的字符，到 Word 里成不了一张表（要结构化表格请回到源文件；界面上 PDF → Excel / CSV / JSON 是置灰的）',
        'PDF 内嵌图片不进 Word，产物里没有图像；需要页面图像走 PDF → 图片',
        '扫描件为空——没有 OCR，也不会替你猜字',
        '打开时的排版由 Word 决定：同一份产物在 Word、LibreOffice 与在线 Office 里可能不完全一样（本项目只负责把它写对）',
      ],
      en: [
        'Not a native OOXML paragraph tree: an altChunk is laid out live by Word, so fonts, leading and styles will not match a real Word template, and there are no headers, footers or page setup',
        'Layout and tables do not carry: a table in a PDF is typeset characters, and it does not become a table in Word (for structured data go back to the source; PDF → Excel / CSV / JSON is greyed out in the picker)',
        'Images embedded in the PDF are not carried into the Word file, which contains no pictures; for page imagery take PDF to image',
        'A scan comes back empty — there is no OCR and no invented text',
        'Word decides the final typography: the same file can render slightly differently in Word, LibreOffice and Office online (this project only guarantees what it writes)',
      ],
    },
    notes: {
      zh: [
        '单个上限 100 MB，一批最多 200 个文件；链路较长，PDF 页数多时可以先只转几页试形状',
        '反向也有路：这个扩展自己产出的 HTML → DOCX 同样是 altChunk，而 DOCX → HTML 会识别并救回它，所以自己的产物能原样读回来',
        '需要"可编辑 + 结构干净"时，通常先在 PDF → HTML 上手工清一遍，再转 Word 更省心',
      ],
      en: [
        '100 MB per file and 200 files per batch; it is a long chain, so on a big document convert a few pages first to see the shape',
        'The reverse path exists too: this extension’s own HTML → DOCX output is an altChunk as well, and DOCX → HTML recognises it and recovers the content, so its own files read back',
        'When you want editable *and* clean structure, tidying PDF → HTML by hand and only then converting to Word usually costs less',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么在 Word 里段落样式跟别人的文档差很多？',
          en: 'Why do the paragraph styles look nothing like other people’s documents?',
        },
        a: {
          zh: '因为产物里没有样式表——它嵌的是一份 HTML，Word 用自己的默认样式去排。想要模板外观，在 Word 里套一次样式或另存为模板，比在这里期待转换"猜对"要可靠。',
          en: 'Because there is no stylesheet in the file — it embeds an HTML part that Word sets with its own defaults. Applying a style once inside Word, or saving it as a template, is far more reliable than hoping a converter guesses the design.',
        },
      },
      {
        q: { zh: '转出来的 .docx 能被别的程序读吗？', en: 'Will other programs read the .docx?' },
        a: {
          zh: '主流字处理软件能打开，但 altChunk 是 Word 家族的机制，部分第三方工具与索引服务对它的解析程度不一。要跨工具长期存放，HTML 或纯文本是更稳的落点——它们不依赖任何一家软件的排版。',
          en: 'Main word processors will open it, but altChunk is a Word-family mechanism and third-party tools and indexing services handle it to varying degrees. For long-term storage outside one tool, HTML or plain text is the sturdier landing place — neither depends on one vendor’s layout engine.',
        },
      },
      {
        q: { zh: '为什么不干脆做成真正的段落结构？', en: 'Why not build a real paragraph tree instead?' },
        a: {
          zh: '因为 PDF 里没有那棵树可还原：它只有坐标与字形。硬造 XML 只是把"由 Word 现场排版"挪到"由我们的猜测现场排版"，多出来的自信并没有多出来的信息。所以这一条宁可把话说窄。',
          en: 'Because no such tree exists in a PDF to recover — only coordinates and glyphs. Manufacturing XML would move "laid out by guesswork" from Word to us, adding confidence without adding information. This page would rather state the narrower claim.',
        },
      },
    ],
  },
  {
    slug: 'docx-to-html',
    from: 'docx',
    to: 'html',
    shot: 'preview-edit',
    published: '2026-10-02',
    title: {
      zh: 'Word 转 HTML——本地抽取正文与图片，产出单文件网页',
      en: 'Word to HTML locally — body and images in one file',
    },
    desc: {
      zh: '浏览器本地用 mammoth 读 .docx 的语义结构（标题、列表、粗斜体、超链接、表格），文档里的图片内联成 data URI，最后经 DOMPurify 净化输出单个 .html。不上传、不装 Office，也不读旧版 .doc。',
      en: 'mammoth reads a .docx’s structure — headings, lists, emphasis, links, tables — inline images become data URIs, DOMPurify sanitises the single .html. No .doc.',
    },
    lede: {
      zh: 'mammoth 的设计取向值得先知道，因为它决定了产物的样子：它读的是"这段是标题 1"这样的语义，而不是"这行用了 16 磅加粗"这样的外观，然后按自己的映射写成 HTML 标签。好处是产物干净、可直接上网页或再转 Markdown；代价是 Word 里看到的排版不会跟过来——分栏、字号、颜色、页边距这些外观信息在这一步被有意丢掉。想要"看起来一样"的产物，请走 Word → PDF。',
      en: 'mammoth’s design is worth knowing first because it sets what you get: it reads meaning — "this is Heading 1" — rather than appearance — "this line is 16pt bold" — and writes HTML tags from that mapping. The upside is clean output you can publish or convert on to Markdown. The cost is that your Word layout does not come along: columns, font sizes, colours and margins are deliberately dropped at this step. For an output that *looks* the same, take Word to PDF.',
    },
    keeps: {
      zh: [
        '标题层级：样式名为 Heading 1–4 的段落映射为 `<h1>`–`<h4>`，标题（Title）与小标题（Subtitle）也各归其位',
        '有序与无序列表、粗体与斜体（含以字符样式命名的 Strong / Emphasis）、超链接',
        '表格：mammoth 默认会把表格结构写成 `<table>`，单元格内容随行内格式一起过来',
        '文档内的图片读成 data URI 内联进 HTML——所以这一个文件本身是完整的，不需要另附一个 images 目录',
        '输出前经 DOMPurify 的 html 白名单净化，脚本与事件属性不会进产物；`target` 属性被显式保留，链接仍可在新标签打开',
        '远程子资源在写文件前被剥掉：`<img src="http://…">`、样式里的 `url()` 与 `@import` 都不留，所以这张页面被打开时不会替你发请求（链接本身是正文，留着）',
        '如果这份 .docx 里塞着内嵌的 MHT 块（altChunk——本扩展自己的 HTML → DOCX 产物就是这种形状），空结果时会识别并救回内嵌的那份 HTML',
      ],
      en: [
        'Heading levels: paragraphs styled Heading 1–4 map to `<h1>`–`<h4>`, and Title and Subtitle each land where they belong',
        'Ordered and unordered lists, bold and italics — including those applied by character style name — and hyperlinks',
        'Tables: mammoth writes table structure as `<table>` by default, with cell content travelling alongside its inline formatting',
        'Images inside the document are read out as data URIs inlined into the HTML, so the single file is complete and needs no companion images folder',
        'The output passes DOMPurify’s html profile before it is written, so scripts and event attributes do not reach the file; the `target` attribute is kept on purpose so links still open in a new tab',
        'Remote subresources are cut before the file is written — `<img src="http://…">`, `url()` and `@import` in styles — so the page issues no request on your behalf when you open it. A link is content, and stays',
        'If the .docx carries an embedded MHT part (an altChunk — which is exactly what this extension’s own HTML → DOCX output is), an empty result triggers recovery of that embedded HTML',
      ],
    },
    limits: {
      zh: [
        '外观不进 HTML：字体、字号、颜色、行距、页边距、分栏与分页位置全部丢失，产物由浏览器排版',
        '页眉页脚、脚注与尾注、批注、修订记录、文本框、艺术字、图表与嵌入对象都不提取',
        '只读 .docx（Office Open XML 的 zip 包）；97–2003 的旧版二进制 .doc 不支持，先在别处存成 .docx 再拿来',
        '样式名不匹配默认映射时（比如自定义的"报告正文"样式），那段文字仍会输出，只是落在 `<p>` 而不是你以为的标签',
        '内联图片会让 HTML 明显变大：一本带几十张图的文档，产物体积接近原文档里的图片总和',
        '跟得过去的位图类型是有限的几种（`png / jpeg / gif / webp / bmp / avif / ico`）：TIFF、EMF、WMF 这类内嵌图在写出前会被剥掉 `src`，那一格空着，产物不为它计数',
      ],
      en: [
        'Appearance does not enter the HTML: fonts, sizes, colours, leading, margins, columns and page breaks are lost, and the browser does the typesetting',
        'Headers and footers, footnotes and endnotes, comments, tracked changes, text boxes, WordArt, charts and embedded objects are not extracted',
        'Only .docx (the zipped Office Open XML package) is read; legacy binary .doc from 97–2003 is not, so save it as .docx first elsewhere',
        'When a style name falls outside the default mapping — a custom "Report Body" style, say — the text still comes out, just into a `<p>` rather than the tag you expected',
        'Inlined images make the HTML visibly larger: a document with dozens of pictures produces roughly the sum of those pictures in added bytes',
        'Only a limited set of raster types comes across (`png / jpeg / gif / webp / bmp / avif / ico`): a TIFF, EMF or WMF inside the file loses its `src` on the way out, leaving an empty slot that the artifact does not count',
      ],
    },
    notes: {
      zh: [
        '同一份 .docx 还能转 Markdown（同样是语义映射）、纯文本、PDF 与 PNG；四者取舍不同，见各自页面',
        '单个上限 100 MB，一批最多 200 个文件；单个文件失败只报该文件，其余继续',
        '正文提不出任何内容时会明确报"文档没有可转换内容"，而不是安静地给你一个空白页',
      ],
      en: [
        'The same .docx can also go to Markdown on the same semantic mapping, or to plain text, PDF and PNG; each trade-off is spelled out on its own page',
        '100 MB per file and up to 200 files per batch; one unreadable file reports only itself while the rest continue',
        'When nothing at all can be extracted the run says so as an empty document rather than handing you a quietly blank page',
      ],
    },
    faq: [
      {
        q: { zh: '为什么表格里的底纹和对齐没了？', en: 'Why did the table shading and alignment disappear?' },
        a: {
          zh: '因为这条转换取结构不取外观：行列与单元格内容保留，`<table>` 因此成立；而底纹、列宽、单元格对齐属于 Word 的视觉层，不在语义映射范围内。要视觉上原样，走 Word → PDF。',
          en: 'Because this route takes structure, not appearance: rows, cells and their content survive, which is what makes a `<table>` possible, while shading, column widths and cell alignment live in Word’s visual layer and are outside the semantic mapping. For visual fidelity, Word to PDF is the route.',
        },
      },
      {
        q: { zh: 'HTML 能直接当网页发布吗？', en: 'Can I publish the HTML as a web page?' },
        a: {
          zh: '可以，产物是自包含的单个文件：图片以内联数据存在，样式由外壳统一给。要注意的是它的排版由你的 CSS 而不是 Word 决定——发出去之前自己看一眼，尤其列表嵌套与宽表格。',
          en: 'Yes — the file is a self-contained single document, with pictures carried as inline data and one shared style shell. What to check before publishing is that the layout is now yours rather than Word’s, especially nested lists and wide tables.',
        },
      },
      {
        q: {
          zh: '为什么有些内容我在 Word 里看得到，产物里却没有？',
          en: 'Some of what I see in Word is missing from the output — why?',
        },
        a: {
          zh: '最常见的原因是那部分内容不住在正文流里：页眉页脚、脚注尾注、批注、文本框与图表都在正文之外，这条转换不提取它们。判断方法是看它在 Word 里是否随正文一起重排——不重排的多半就是这一类。',
          en: 'The usual reason is that the content does not live in the text flow: headers and footers, footnotes and endnotes, comments, text boxes and charts all sit outside it, and this route does not read them. The test in Word is whether the content reflows with the body — what does not reflow is most likely in that excluded set.',
        },
      },
    ],
  },
  {
    slug: 'html-to-png',
    from: 'html',
    to: 'png',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'HTML 转 PNG——本地整页栅格化，长图一次拿到',
      en: 'HTML to PNG locally — the whole page as one tall image',
    },
    desc: {
      zh: '浏览器本地把 .html 渲染到画布再编码为 PNG：800 px 宽、按内容实际高度出整页长图，远程引用与脚本在渲染前就被处理掉。全程不出本机，没有截图软件、也没有服务端渲染。',
      en: 'Render a .html file to a canvas and encode it as PNG: 800 px wide, one tall image as long as the content is, with remote references never fetched.',
    },
    lede: {
      zh: '这一条的价值在于"整页"：普通截图工具给的是可视区，而这个转换按内容的真实高度出图，所以一份长报告、一页长表格能一次拿到一张完整长图。做法是把 HTML 装进一个沙箱文档里渲染，宽度定在 800 px，高度按内容量出来。也正因为它是一次真实渲染，产物取决于你的浏览器怎么排版这份 HTML——这跟"HTML → PDF 再截屏"那种二次失真完全不是一回事。',
      en: 'The point is the word *whole*: an ordinary screenshot tool gives you the viewport, while this route measures the content and returns one image as tall as it actually is — so a long report or a wide-but-wrapped table comes out complete in a single file. It works by rendering the HTML inside a sandboxed document at 800 px wide and measuring the height. And because that render is real, the output is how *your* browser lays the page out, which is a different thing from the second-hand degradation of rasterising a PDF.',
    },
    keeps: {
      zh: [
        '内容的真实高度：整页一张图，不是首屏拼图',
        '文字编码为 UTF-8 之外的中文导出也读得动——解码按 UTF-8 → GB18030 → GBK 依次兜底，不会把乱码渲染成图片',
        '样式表与页面自身的排版规则参与渲染，字号、颜色、边框、圆角、表格线都按 CSS 实际效果出图',
        '渲染倍率按页面高度自动选：短页面 2 倍，超过 2000 px 降到 1.5 倍，超过 4000 px 降到 1 倍——避免"长图必糊"也避免内存爆掉',
        'PNG 无损：这条路的产物不会再叠一层有损压缩。底色定成纯白，页面自己没写 background 时也是白，不会带出透明区域',
        '最长边与目标体积这类输出参数在终点编码生效，可以把长图缩到聊天软件能收的尺寸',
      ],
      en: [
        'The content’s real height: one image of the whole page rather than a stitched first screen',
        'Chinese documents saved outside UTF-8 still read correctly — decoding falls back UTF-8 → GB18030 → GBK, so mojibake is never rendered into a picture of mojibake',
        'Stylesheets and the page’s own layout rules take part, so sizes, colours, borders, radii and table rules come out as the CSS says',
        'Render scale follows page height automatically: 2x on short pages, 1.5x past 2000 px, 1x past 4000 px — which avoids both "tall means blurry" and an allocation that fails',
        'PNG is lossless, so this route adds no lossy pass on top. The backdrop is fixed white: a page that never declares a background still comes out on white rather than on transparency',
        'Output parameters such as longest edge and target size act at the final encode, so a tall image can be shrunk to what a chat app will accept',
      ],
    },
    limits: {
      zh: [
        '图片按引用取不到字节：文档里以网络地址或相邻路径引用的 `<img>`，在离线前提下不会去请求——它们渲染前就被换成虚线占位框，位置留着、内容不猜；只有解不开的 data: 或已撤销的 blob: 会在那处直接留空',
        '丢了几张图会在结果卡片上按张数写明，不会静默给你一张"看起来少了图"的长图',
        '脚本不执行：由 JS 现算的图表、懒加载内容、需要交互才展开的区域，都不会出现在图里',
        '外部字体与 CSS 里的远程 `@import` 同样取不到，字体会回落到系统栈',
        '宽度定在 800 px，不接受视口参数；iframe 与远程嵌入内容不会渲染',
        '产物是像素：图里的文字不可选中、不可复制（这条与所有"到图片"的路一致）',
        '整页高度有上限：超出浏览器单次渲染能吃的长度时直接报错，而不是给你一张内容不全的长图——那种文档请拆成更短的部分分批转换',
      ],
      en: [
        'Pictures referenced by URL or by a sibling path cannot get their bytes: under the offline guarantee nothing is requested, so they become dashed placeholder boxes before rendering — the position is kept, the content is not guessed. Only an undecodable data: or an already-revoked blob: leaves that position empty',
        'How many positions were affected is counted on the result card, so you never receive a silently image-less tall image',
        'Scripts do not run, so charts computed in JS, lazy-loaded sections and anything that needs interaction to appear are absent from the image',
        'Web fonts and remote `@import` rules cannot be fetched either, so type falls back to the system stack',
        'The width is fixed at 800 px with no viewport parameter, and iframes or remote embeds do not render',
        'The output is pixels: text in it is not selectable or copyable, as on every route to an image',
        'Page height has a ceiling: past what the browser can render in one pass the conversion reports an error instead of delivering a tall image missing content — split such a document and convert the parts separately',
      ],
    },
    notes: {
      zh: [
        '想让图片进这张长图：把图片内联成 data URI，这是离线条件下唯一能拿到字节的途径',
        '渲染有超时保护（等待图片、测量、克隆各有一段），一份特别复杂的 HTML 可能超时而不是一点点磨出来',
        '同一份 HTML 还可以转 PDF（可复制文字、A4 分页）或 DOCX；要"发给人看的长图"才用这条',
      ],
      en: [
        'To get pictures into the tall image, inline them as data URIs — under the offline guarantee that is the only way their bytes can arrive',
        'Rendering is time-boxed (separate budgets for waiting on images, measuring and cloning), so a very heavy document may time out rather than grind forever',
        'The same HTML can go to PDF, which keeps copyable text and A4 pages, or to DOCX; take this route when you specifically want one tall image',
      ],
    },
    faq: [
      {
        q: { zh: '为什么图里有几个虚线方框？', en: 'Why are there dashed boxes in the image?' },
        a: {
          zh: '那是被有意留下的占位：原文档在那里引用了一张取不到字节的图片。本项目不去网络请求任何东西，所以宁可把位置标出来，也不按地址猜它长什么样。另有第二种形状：只在克隆到一半才失败的图（解不开的 data:、已撤销的 blob:）在那处直接留空，不画框。卡片上写明这一轮一共处理了几处。',
          en: 'Those are deliberate placeholders where the document referenced a picture whose bytes could not be obtained. The extension requests nothing over a network, so it marks the position rather than guessing what lived there. There is a second shape: an image that fails only part-way through cloning — an undecodable data:, a revoked blob: — leaves that spot blank with no box drawn. The result card counts how many were handled in total.',
        },
      },
      {
        q: { zh: '长图能有多长？会不会失败？', en: 'How tall can the image be, and can it fail?' },
        a: {
          zh: '这条链的上限是整页一次捕获的高度 32768 px（一边最大 8192 px 的四倍）：超过就明确报这次转换失败，而不是给你半张图或一片空白。另一个数字 8192 px 属于「最长边」那个参数，它在编码前按需重采样，与这条高度上限是两件事。页面越长、渲染倍率越低，也是在往同一个上限靠。',
          en: 'The bound on this route is 32768 px on the height of the single whole-page capture — four times the 8192 px edge ceiling — and past it the conversion says so plainly instead of returning half an image or a blank one. The other number, 8192 px, belongs to the longest-edge parameter, which resamples before encoding and is a different matter from this height bound. The taller the page, the lower the render scale, which is the same pressure toward that ceiling.',
        },
      },
      {
        q: { zh: 'HTML → PDF 和 HTML → PNG，我该选哪个？', en: 'HTML to PDF or HTML to PNG — which do I want?' },
        a: {
          zh: '看要它做什么。要打印、要文字可复制可搜索、要分页：PDF。要发给只能在手机上滑着看的人、或要一张放进文章里的图：PNG。两者的排版都出自同一套渲染规则，所以内容一致，差别在容器与"是否还是文字"。',
          en: 'It depends what the file is for. Print, copyable and searchable text, pagination: PDF. Someone scrolling on a phone, or an image to drop into an article: PNG. Both typeset from the same render rules, so the content agrees — the difference is the container and whether it is still text.',
        },
      },
    ],
  },
  {
    slug: 'xlsx-to-pdf',
    from: 'xlsx',
    to: 'pdf',
    shot: 'batch-results',
    published: '2026-10-02',
    title: {
      zh: 'Excel 转 PDF——本地两步成档，多 sheet 连续排版',
      en: 'Excel to PDF locally — two steps, every sheet in order',
    },
    desc: {
      zh: '这条是多步链：SheetJS 先把每个工作表写成带表名的 HTML 表格，再由它生成 A4 竖版 PDF；中间产物只在内存里。日期不会被读成一串数字，公式值取上次保存时缓存的结果。全程离线。',
      en: 'SheetJS writes each worksheet as an HTML table under its name, which becomes a portrait A4 PDF, intermediate held in memory. Formula cells keep cached values.',
    },
    lede: {
      zh: '先说最容易踩的那格：Excel 里看到的"表格"，在文件里其实是三类东西的叠加——单元格的值、公式、以及格式（列宽、颜色、合并、条件格式）。这条链能带走第一类，第二类带的是缓存结果而不是活公式，第三类基本带不走。所以产物是一张干净、可打印、可复制文字的表格文档，而不是"你那张带底纹的报表"。知道边界之后再决定用它还是用 Excel 自己导出。',
      en: 'Start with the trap, because it is the one people hit: the "table" you see in Excel is three things stacked — cell values, formulas, and formatting (column widths, colours, merges, conditional rules). This chain carries the first, carries the second as its cached result rather than as a live formula, and carries almost none of the third. So the output is a clean, printable, copyable table document, not *your* shaded report. Knowing that boundary is what makes the choice between this and Excel’s own export an informed one.',
    },
    keeps: {
      zh: [
        '每个工作表一张表格；多于一个 sheet 时，每张前面带上它的名字作为标题，PDF 里就是 `<h2>` 一级的分节',
        '单元格值按显示文本写入：日期单元格在阅读阶段就被显式标记并按统一格式渲染，不会变成 45296.33 这样的序列号',
        '文本、数字与布尔的原样字符——这条链默认以"值保真"为目标，不替你四舍五入',
        '文字进 PDF 是真的文字层，可选中、可复制、可搜索（这与"表格截图"不同）',
        '中间那份 HTML 只在内存里，你的下载目录只多出一个 .pdf',
      ],
      en: [
        'One table per worksheet; when the workbook holds more than one sheet, each is preceded by its own name as a section heading',
        'Cell values are written as display text: date cells are flagged while the workbook is read and rendered under one agreed format, so 45296.33 never appears where a date belongs',
        'Text, numbers and booleans keep their own characters — this chain aims at value fidelity and does not round on your behalf',
        'Text in the PDF is a real text layer: selectable, copyable and searchable, unlike a screenshot of a spreadsheet',
        'The intermediate HTML exists only in memory, so your downloads gain one .pdf and nothing else',
      ],
    },
    limits: {
      zh: [
        '格式不进产物：字体、颜色、底纹、列宽行高、边框样式、条件格式、数字自定义格式都不参与，PDF 里是统一的表格样式',
        '合并单元格不还原成跨行跨列，只是把值放在左上那一格',
        '公式不求值：格子里是文件上次保存时算好的值；从没保存过或依赖外部数据时可能为空',
        '图表、数据透视表、切片器、批注、宏、图片与形状都不提取',
        '分页位置由内容高度决定（A4 竖版按高度切），不能指定纸张、方向、缩放或打印区域；超宽表格会被排到下一页而不是缩小塞进一页',
        '只读 .xlsx（zip 包），旧版 .xls / .et 等格式不在识别范围内',
      ],
      en: [
        'Formatting does not travel: fonts, colours, shading, column widths and row heights, border styles, conditional rules and custom number formats are all absent, and the PDF shows one shared table style',
        'Merged cells are not reproduced as spans — the value sits in the top-left cell',
        'Formulas are not evaluated: each cell holds whatever the file last cached when it was saved, which can be blank for unsaved or externally-fed workbooks',
        'Charts, pivot tables, slicers, comments, macros, embedded pictures and shapes are not extracted',
        'Page breaks follow content height (portrait A4, sliced by height); paper size, orientation, scaling and print areas cannot be set, so a very wide table spills to the next page rather than shrinking to fit',
        'Only the zipped .xlsx package is read; legacy .xls and similar spreadsheets are outside detection',
      ],
    },
    notes: {
      zh: [
        '同一份 .xlsx 还能转 CSV、JSON、Markdown、HTML 与 PNG：前四种保留值、丢格式，PNG 则是整页像素',
        '多 sheet 的 CSV 会输出 ZIP（一个 sheet 一个文件），而这条 PDF 路径是把所有 sheet 串进同一份文档——两种形态各有用处',
        '单个上限 100 MB，一批最多 200 个文件；链路较长，超大工作表建议先只留必要列再转',
      ],
      en: [
        'The same .xlsx can also go to CSV, JSON, Markdown, HTML and PNG: the first four keep values and drop formatting, while PNG is page-by-page pixels',
        'A multi-sheet workbook becomes a ZIP for CSV, one file per sheet, whereas this PDF route strings every sheet into one document — the two shapes serve different jobs',
        '100 MB per file and up to 200 files per batch; it is a long chain, so trim a very large worksheet to its needed columns first',
      ],
    },
    faq: [
      {
        q: { zh: '为什么 PDF 里的表格没有我原来的底色？', en: 'Why did my shading not make it into the PDF?' },
        a: {
          zh: '因为这条链取的是单元格的值，样式层在 HTML 那一步就没有参与。要带底纹的报表，用 Excel 自己导出 PDF；这里的定位是"把数据变成可分发、可复制文字的文档"。',
          en: 'Because the chain reads cell values, and the style layer never takes part once the content is in HTML. For a shaded report, let Excel export the PDF; this route’s job is turning data into a distributable document whose text is selectable.',
        },
      },
      {
        q: { zh: '日期那一列变成了 45296 怎么办？', en: 'What if the date column turns into 45296?' },
        a: {
          zh: '这条路径不会：日期单元格在读取时被显式标记，并按统一的文本格式渲染，所以到 PDF 里仍然是日期文本。真看到序列号，通常说明那格在源文件里本来就是数字而不是日期格式——回到 Excel 里把该列设成日期格式再转一次。',
          en: 'It does not here: date cells are flagged during the read and rendered through one agreed text format, so the PDF still says a date. If a serial number does appear, that cell was most likely a plain number rather than a formatted date in the source — set the column to a date format in Excel and convert again.',
        },
      },
      {
        q: {
          zh: '宽表格被切到第二页，能强制一页放下吗？',
          en: 'A wide table spilled on to a second page — can I force it on to one?',
        },
        a: {
          zh: '不能，这条没有纸张、方向、缩放或"适应页面"的参数。可行的办法是在源文件里删到必要列、或改走 Excel → HTML 自己控制宽度，再 HTML → PDF。',
          en: 'No — there is no paper, orientation, scaling or fit-to-page parameter on this route. What works is dropping to the columns you need, or taking Excel to HTML and controlling width there before going HTML to PDF.',
        },
      },
    ],
  },
  {
    slug: 'gif-to-png',
    from: 'gif',
    to: 'png',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'GIF 转 PNG——本地取首帧无损重编码，动图会说明丢了几帧',
      en: 'GIF to PNG locally — first frame, lossless, loss disclosed',
    },
    desc: {
      zh: '浏览器本地把 GIF 解码后编成 PNG：静态图无损换容器，动图取首帧并在结果卡片上写明丢了帧。BMP / GIF / SVG 只能作为输入——浏览器不提供它们的编码器，所以这条的方向不可逆。',
      en: 'Decode a GIF and encode it as PNG: a still gets a lossless container swap, an animation keeps its first frame and says so on the result card. One-way only.',
    },
    lede: {
      zh: '这条转换最常发生在"我手上只有 .gif，但我要 PNG"的场合：图标、截图、单帧素材。做法很直白——解码、把当前那一帧画到画布、无损编码。真正值得写清楚的是两件事：一是动图在这里必然只剩一帧，二是本项目只在源文件「确实」有多于一个图像块的时候才提示丢帧，静态 .gif 不会收到一句多余的警告。这个判断是走查 GIF 的块结构得出的，不是看文件名。',
      en: 'This is the "I only have a .gif but I need a PNG" case: icons, screenshots, single-frame assets. The method is blunt — decode, paint the current frame on a canvas, encode losslessly. Two things deserve stating plainly: an animation keeps exactly one frame, and this extension warns about frame loss only when the file genuinely carries more than one image block, which it decides by walking the GIF’s own structure rather than trusting the extension. A still .gif gets no needless warning.',
    },
    keeps: {
      zh: [
        '首帧的全部像素：解码后无损编码为 PNG，不再叠加有损压缩',
        'GIF 的透明标记：调色板里那一格"透明"在 PNG 里成为真正的 Alpha 通道，背景可以留在图上',
        '实际像素尺寸原样保留，只有超过浏览器画布上限（一边 8192 px）才等比缩到可承受',
        '最长边与目标体积这些输出参数在终点编码生效（PNG 没有质量档，所以上限是尺寸与体积两条）',
        '一批最多 200 张、单个文件 100 MB 上限，结果可一次打包成 ZIP',
      ],
      en: [
        'Every pixel of the first frame: decoded and encoded into PNG with no lossy pass added on top',
        'The transparency flag carried by the GIF — the palette’s transparent index becomes a real alpha channel in PNG, so the background stays off the subject',
        'Pixel dimensions as they are, shrinking proportionally only past the browser canvas limit (8192 px on an edge)',
        'Output parameters such as longest edge and target size act at the final encode (PNG has no quality dial, so the two that bite are size and bytes)',
        'Up to 200 images per batch with a 100 MB per-file ceiling, downloadable as one ZIP',
      ],
    },
    limits: {
      zh: [
        '动图只剩首帧：时长、帧序、循环次数全部丢失，产物是静态位图',
        'GIF 只有 256 色，源图本来就在调色板里被近似过；转 PNG 不会把丢掉的色彩找回来（无损，但不是无损"复原"）',
        'BMP / GIF / SVG 无法被写出：浏览器不提供这些编码器，所以 PNG → GIF 这条路在这个扩展里不存在',
        '动 WebP 与 APNG 同样只留一帧，但本项目的"丢帧"提示目前只对 GIF 给出——判断依据是格式能可靠数出图像块，其余两种还没做度量',
        '解码报成功但尺寸为 0（截断文件、某些奇怪的 BMP / GIF 变体）会明确报解码失败，而不是产出一张看起来坏掉的图',
      ],
      en: [
        'An animation keeps its first frame only: durations, frame order and loop counts are gone, and the output is a still bitmap',
        'GIF carries at most 256 colours, so the source was already approximated into a palette; PNG will not win those colours back — the re-encode is lossless, not a restoration',
        'BMP, GIF and SVG cannot be written: a browser ships no encoder for them, so there is no PNG → GIF route inside this extension',
        'Animated WebP and APNG inputs likewise collapse to one frame, but the frame-loss disclosure is computed for GIF alone today — that format’s image blocks can be counted reliably, and the other two have not been measured',
        'A decode that reports success at zero size — a truncated file, one of the odd BMP or GIF variants — fails loudly as a decode error rather than shipping a broken-looking image',
      ],
    },
    notes: {
      zh: [
        '同一张 GIF 还能转 PDF、HTML 与 JPEG；只有 HTML 那条会把原始字节连同动画一起嵌进去，所以"要保留动"就别走图片这条路',
        '如果目的是"把动图变小"而不是"要 PNG"，那这条反而适得其反：首帧可能比整个动图还大',
        '输出参数一次设置会被记住，同一批所有图片共用',
      ],
      en: [
        'The same GIF can go to PDF, HTML or JPEG; only the HTML route embeds the original bytes with the animation intact, so if keeping motion is the goal, do not take an image route',
        'If the aim is "make this GIF smaller" rather than "I need a PNG", this route backfires: one frame can weigh more than the whole animation',
        'The output parameters are set once, remembered, and shared by every image in the batch',
      ],
    },
    faq: [
      {
        q: { zh: '能让 PNG 也保留动画吗？', en: 'Can the PNG keep the animation?' },
        a: {
          zh: '不能——APNG 不在浏览器的编码能力里。要保留动，两条路：留在 GIF（本项目 HTML → 图片以外的 GIF 不产出），或者转成 HTML 让原始字节带着动画一起嵌进去。',
          en: 'No — APNG is outside what a browser will encode. To keep motion, either stay in GIF, or take the HTML route, which embeds the original bytes with the animation intact.',
        },
      },
      {
        q: { zh: '为什么我的静态 GIF 也提示丢了帧？', en: 'Why did my still GIF get a frame-loss warning?' },
        a: {
          zh: '它不会——除非文件里确实有第二个图像块。提示是按走查字节结构给的，所以"文件名带 gif"不是条件；反过来，一个伪装成 .gif 的多帧文件会如实提示。',
          en: 'It does not — unless the file really carries a second image block. The warning comes from walking the byte structure, so a .gif in the name is not the trigger, and a multi-frame file wearing a .gif name is reported truthfully.',
        },
      },
      {
        q: { zh: '转完为什么变大了一圈？', en: 'Why did the file get bigger?' },
        a: {
          zh: '因为 GIF 用索引色加自己的压缩，PNG 用 RGBA 加另一套压缩，色深还从 8 位升到了真彩通道。对大块平色的图标两者可能差不多，对照片型内容 PNG 通常明显更大——那种情况要的是 WebP 或 JPEG，而不是 PNG。',
          en: 'Because GIF stores indexed colour under its own compression while PNG stores RGBA under a different one, and the sample depth widens to a true-colour channel. Flat-coloured icons can land close in size; photographic content usually grows — which is the case for WebP or JPEG rather than PNG.',
        },
      },
    ],
  },
  {
    slug: 'bmp-to-png',
    from: 'bmp',
    to: 'png',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'BMP 转 PNG——本地无损重编码，体积通常大幅下降',
      en: 'BMP to PNG locally — a lossless re-encode that shrinks',
    },
    desc: {
      zh: '浏览器本地把 .bmp 解码后编成 PNG：像素尺寸与颜色原样带走，不再叠有损压缩。BMP 只能作为输入（浏览器不提供它的编码器），所以这条方向不可逆；一批最多 200 张，结果可打 ZIP。',
      en: 'Decode a .bmp and encode it as PNG in your browser: pixel size and colour carry over with no lossy pass. BMP is input-only, so the route does not run backwards.',
    },
    lede: {
      zh: 'BMP 是"把像素一行行铺开"的格式，几乎没有压缩，所以 Windows 里随手存出的 .bmp 常常大得离谱。转 PNG 的意义主要是体积：同一张图通常小一个数量级，而且两者都无损，画面上没有任何东西被牺牲。这是一条"换个容器、内容不变"的转换——所以下面的丢弃项很短，主要写的都是边界。',
      en: 'BMP is a format that lays pixels out row by row with almost no compression, which is why a casual .bmp save on Windows is often absurdly large. The point of PNG is size: the same picture usually drops by an order of magnitude, and since both containers are lossless nothing on screen is sacrificed. That makes this a change-of-container conversion — which is why the limits below are short and mostly about edges.',
    },
    keeps: {
      zh: [
        '全部像素与尺寸：解码成 RGBA 后无损编码为 PNG，不做二次有损',
        '32 位 BMP 带的 Alpha：PNG 有真正的透明通道，能把它带走（JPEG 就不能）',
        '调色板 BMP 的观感：8 位索引色在解码时展开成 RGBA，看到的颜色不变',
        '像素超过画布上限（一边 8192 px）时等比缩到可承受，而不是裁切',
        '最长边与目标体积输出参数在终点编码生效；一批最多 200 张、单个文件 100 MB 上限',
      ],
      en: [
        'Every pixel and the full dimensions: decoded into RGBA and encoded losslessly, with no lossy pass anywhere on the route',
        'The alpha channel in a 32-bit BMP: PNG has real transparency to hold it (JPEG does not)',
        'How a palette BMP looks: 8-bit indexed colour is expanded to RGBA during decode, so the colours you see do not change',
        'Images past the canvas limit (8192 px on an edge) scale down proportionally instead of being cropped',
        'Longest-edge and target-size parameters apply at the final encode; up to 200 images per batch with a 100 MB per-file ceiling',
      ],
    },
    limits: {
      zh: [
        'BMP 里的元信息不进 PNG：文件名之外的创建时间、设备相关位图头之类不保留（PNG 本来也没有这些字段）',
        '方向不可逆：浏览器不提供 BMP 编码器，所以 PNG → BMP 在这条产品线上不存在；同一张图可写的目标只有 PNG、JPEG 与 WebP',
        '位深不"原样保留"，而是统一经过一次 RGBA 画布：源是 1 / 4 / 8 / 24 位都一样能转，但产物是 8 位每通道的 RGBA',
        '非常规变体（截断、错误的行对齐、某些 RLE 压缩的 BMP）可能解码结果为空尺寸，那时按解码失败报错而不是给一张坏图',
        'ICM / 色彩标记这类 BMP 尾部附加字段不参与解码，色彩按 sRGB 观感呈现',
      ],
      en: [
        'BMP metadata does not enter PNG: beyond the file name, creation timestamps and device-dependent bitmap headers are not carried (PNG has no such fields either)',
        'The direction is one-way: a browser offers no BMP encoder, so PNG → BMP does not exist on this product line. The writable image targets are PNG, JPEG and WebP only',
        'Bit depth is not preserved verbatim but passes through one RGBA canvas: 1-, 4-, 8- and 24-bit sources all convert, and the result is 8 bits per channel either way',
        'Unusual variants — truncated files, wrong row padding, some RLE-compressed BMPs — can decode to zero size, and that reports a decode failure rather than producing a broken image',
        'Trailing BMP fields such as ICC profiles and colour marks take no part in decoding, so colour reads out in sRGB',
      ],
    },
    notes: {
      zh: [
        '同一张 BMP 还能转 JPEG 与 WebP：要"到处能开"选 JPEG，要更小且接收方支持选 WebP，要透明或无损选 PNG',
        'BMP 截图常见于 Windows 旧工具与某些硬件导出；如果只是想删掉重复帧，这里没有可删的——它本来就是单帧',
        '一批可以混来源格式：BMP 与 PNG、JPEG 一起丢进来，统一出一个目标',
      ],
      en: [
        'The same BMP can go to JPEG or WebP: JPEG where it must open anywhere, WebP for smaller where the recipient supports it, PNG for transparency or losslessness',
        'BMP screenshots come from older Windows tools and some hardware exports; there are no duplicate frames to trim here — it was a single frame to begin with',
        'A batch can mix sources: drop BMP alongside PNG and JPEG and convert everything to one target',
      ],
    },
    faq: [
      {
        q: { zh: 'BMP 转 PNG 会掉画质吗？', en: 'Does BMP to PNG cost any quality?' },
        a: {
          zh: '不掉。两者都是无损容器，这一步只是换压缩方式，像素值不变。真要说什么变了，是内部表示：源不管几位色，产物都是 8 位每通道的 RGBA。',
          en: 'No. Both containers are lossless, so the swap changes only the compression, not a single pixel value. If anything changes, it is the internal representation: whatever depth the source was, the result is 8 bits per channel RGBA.',
        },
      },
      {
        q: { zh: '为什么我的 .bmp 打不开？', en: 'Why will my .bmp not open?' },
        a: {
          zh: '这条路径只走浏览器自带的解码器，所以支持面由浏览器决定：常见的 24 / 32 位未压缩 BMP 没问题，罕见的 RLE 或位场压缩变体可能解码为空——那种情况会明确报解码失败，而不是给你一个坏文件。',
          en: 'This route uses the browser’s own decoder, so the browser sets the support surface: ordinary uncompressed 24- and 32-bit BMPs are fine, while rare RLE or bitfield-compressed variants may decode to zero size — and that is reported as a decode failure rather than a corrupt file handed to you.',
        },
      },
      {
        q: { zh: '转完能再转回 BMP 吗？', en: 'Can I convert it back to BMP afterwards?' },
        a: {
          zh: '不能，在这个扩展里不能。浏览器不提供 BMP 编码器，这是格式族的硬边界而不是本项目偷懒：需要 .bmp 时请用图像编辑器或系统自带工具做最后一步。',
          en: 'Not inside this extension. A browser ships no BMP encoder, which is a boundary of the format family rather than a shortcut we took: when a .bmp is genuinely required, do that last step in an image editor or a system tool.',
        },
      },
    ],
  },
  {
    slug: 'bmp-to-jpg',
    from: 'bmp',
    to: 'jpg',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'BMP 转 JPEG——本地一次编码，质量与目标体积可控',
      en: 'BMP to JPEG locally — quality and target size you set',
    },
    desc: {
      zh: '浏览器本地把 .bmp 解码后编成 JPEG：质量档 40%–90%、目标体积 20 KB–2 MB、可指定最长边，够不着目标时先降质量再缩像素。BMP 只能作为输入，方向不可逆。',
      en: 'Decode a .bmp and encode it as JPEG with a 40%–90% quality step, a 20 KB–2 MB target and an optional longest edge — quality gives way before pixels do.',
    },
    lede: {
      zh: '从 BMP 到 JPEG 是这条产品线上体积落差最大的一条：源几乎没压缩，目标是有损压缩，所以"降一两个数量级"很正常。但落差来自两个方向——一部分是压缩，一部分是丢掉的信息。设了目标体积时顺序是先沿质量阶梯往下试，质量到底了才开始缩边，所以目标是被追的天花板，够不着时你拿到的是当前能做到的最小结果，而不是一次失败。',
      en: 'BMP to JPEG has the biggest size gap on this product line: the source is barely compressed and the target is lossy, so dropping one or two orders of magnitude is normal. But the gap comes from two places — some of it compression, some of it information actually discarded. With a target size set, the encoder walks the quality ladder first and only starts giving up pixels once quality has bottomed out, so the target is a chased ceiling and an unreachable one returns the smallest result rather than a failure.',
    },
    keeps: {
      zh: [
        '像素尺寸按你设的来：不设最长边就原尺寸编码（超过 8192 px 一边时先等比缩到画布可承受）',
        '质量档 40%–90% 与目标体积 20 KB–2 MB，只在链路末尾这次编码生效，中间步骤不吃这两个参数',
        '颜色按 sRGB 观感编码：BMP 的 24 位真彩与 32 位 RGBA 都能进 JPEG（后者会被压平到白底）',
        '一批最多 200 张、单个文件 100 MB 上限，结果可一次打包成 ZIP；单个文件失败只报该文件',
      ],
      en: [
        'Pixel size as you set it: with no longest edge specified the image encodes at full size (past 8192 px on an edge it scales down to what the canvas can allocate first)',
        'Quality steps of 40%–90% and target sizes of 20 KB–2 MB act only at this final encode — intermediate steps ignore both',
        'Colour encodes in sRGB terms: both 24-bit and 32-bit BMPs reach JPEG (the latter flattened onto white, since JPEG has no alpha)',
        'Up to 200 images per batch with a 100 MB per-file ceiling, one ZIP for the lot, and one bad file reporting only itself',
      ],
    },
    limits: {
      zh: [
        '有损：细小文字、单像素线条、锐利边界的色带是第一批代价；要无损请用 BMP → PNG',
        '透明不保留：编码前每帧先铺白底，所以 32 位 BMP 的 Alpha 会变成白色区域',
        '调色板 BMP 的"索引"概念消失：产物是逐像素的 JPEG，不再有任何调色板结构',
        'BMP 尾部附加字段（ICC 等）不参与解码，也不写进 JPEG',
        '方向不可逆：浏览器不提供 BMP 编码器，所以 JPEG → BMP 不存在；BMP 在本项目里只能作为输入',
      ],
      en: [
        'Lossy: small type, single-pixel lines and hard colour transitions pay first — take BMP to PNG when losslessness matters',
        'Transparency does not survive: every frame is painted white before encoding, so a 32-bit BMP’s alpha becomes white areas',
        'The palette notion disappears: the result is per-pixel JPEG with no indexed structure left',
        'Trailing BMP fields such as ICC profiles take no part in decoding and are not written into the JPEG either',
        'The direction is one-way: no browser ships a BMP encoder, so JPEG → BMP does not exist — BMP is input-only in this project',
      ],
    },
    notes: {
      zh: [
        '三个可写图片格式里：JPEG 胜在"任何设备都打得开"，WebP 胜在体积，PNG 胜在无损与透明',
        '如果 BMP 大得只是为了传给别人，先试"目标体积 200 KB + 质量 70%"这组起点，再按结果调',
        '输出参数一次设置会被记住，同一批所有图片共用同一套',
      ],
      en: [
        'Among the three writable image formats: JPEG wins on "opens anywhere", WebP on size, PNG on losslessness and transparency',
        'If the BMP is only big because it has to travel, start from a target size of 200 KB with quality at 70% and adjust from what you get back',
        'The output parameters are set once, remembered, and shared by every image in the batch',
      ],
    },
    faq: [
      {
        q: { zh: '为什么文字边缘出现了一圈噪点？', en: 'Why is there ringing around the edges of text?' },
        a: {
          zh: '那是有损编码在锐利边界上的典型代价，JPEG 尤其明显。解决办法按代价从小到大：提高质量档、改走 BMP → PNG（无损）、或者把图缩到实际显示尺寸再编。',
          en: 'That is the classic cost of a lossy encode on a hard edge, and JPEG shows it most. The fixes, cheapest first: raise the quality step, take the lossless BMP → PNG route, or resize the image to the size it will actually display at before encoding.',
        },
      },
      {
        q: { zh: '设了目标体积，为什么产物还是比它大？', en: 'I set a target size — why is the result still bigger?' },
        a: {
          zh: '因为质量阶梯走完、像素也缩到位之后，剩下的是编码器做到的最小结果。转换不会失败，也不会为了达标把图砍坏——它把实际结果给你，卡片上写的是真实字节数。',
          en: 'Because once the quality ladder is walked and the pixels have shrunk, what remains is the smallest thing the encoder can make. The conversion does not fail, and it will not mangle the picture to hit the number — you get the real result, and the card reports its actual byte count.',
        },
      },
      {
        q: { zh: '透明的 BMP 转成 JPEG 后为什么是白的？', en: 'Why did my transparent BMP come out white?' },
        a: {
          zh: 'JPEG 没有 Alpha 通道，所以编码前会把画布铺白再画。需要保留透明请选 PNG 或 WebP——它们是这条产品线上唯二能带透明的可写格式。',
          en: 'JPEG carries no alpha channel, so the canvas is painted white before the image is drawn. Where transparency must survive, choose PNG or WebP — the only two writable formats here that can carry it.',
        },
      },
    ],
  },
  {
    slug: 'svg-to-jpg',
    from: 'svg',
    to: 'jpg',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'SVG 转 JPEG——本地栅格化，尺寸与质量可控',
      en: 'SVG to JPEG locally — rasterised in place, size you set',
    },
    desc: {
      zh: '浏览器本地把 .svg 栅格化后编成 JPEG：先净化掉脚本与事件属性、按 width / viewBox 定尺寸（都没有时按 1024 px 方形），再画到画布编码。SVG 只能作为输入，方向不可逆；需要透明请改选 PNG 或 WebP。',
      en: 'Rasterise a .svg to JPEG: scripts and event attributes are sanitised out first, size comes from width / viewBox (else a 1024 px square). SVG is input-only here.',
    },
    lede: {
      zh: 'SVG 到 JPEG 必然是"从矢量到点阵"的一次落地，所以真正要选的两个参数是：多大、多糊。这一条把决定权给你：尺寸按文件自己声明的 width / height 或 viewBox 来，两者都不是可用数字时按 1024 px 方形出图；清晰度靠最长边与质量档。另外有一件事与所有"从 SVG 出"的路一样：作为图像加载的 SVG 不会去取外部资源，所以远程引用的 `<image>`、外链字体都不会出现——这不是失败，是离线承诺的必然结果。',
      en: 'SVG to JPEG is necessarily a landing from vector to pixels, so the two real choices are how big and how soft — and this route hands both to you: the size comes from what the file declares as width / height or viewBox, falling back to a 1024 px square when neither reads as a usable number, while sharpness is a matter of longest edge and quality step. One thing holds for every route out of SVG: an SVG loaded as an image fetches nothing external, so `<image>` references pointing off-file and web fonts simply do not appear. That is not a failure but the offline guarantee working as designed.',
    },
    keeps: {
      zh: [
        '图形本体按矢量渲染路径落地：路径、渐变、文字、描边、透明度都在栅格化时算，不是先截屏再放大',
        '尺寸推断有明确优先级：`width` / `height` 是纯数字或 px 值时取它，否则退到 `viewBox` 的宽高，两者都不成立时给 1024 px 方形',
        '安全处理在编码之前：脚本与事件属性被剥离，不干净的标记进不了画布',
        '质量档 40%–90%、目标体积 20 KB–2 MB、最长边 800–4096 px，都在终点编码生效；超过画布上限会自动收敛而不是裁切',
        '一批最多 200 张、单个文件 100 MB 上限，结果可一次打包成 ZIP',
      ],
      en: [
        'The artwork lands along the vector render path: shapes, gradients, text, strokes and opacity are computed at rasterisation rather than magnified from a screenshot',
        'A stated priority for size: `width` / `height` when either reads as a plain number or px length, otherwise the `viewBox` extent, and a 1024 px square when neither holds',
        'Safety is applied before encoding: scripts and event-handler attributes are stripped, so unclean markup never reaches a canvas',
        'Quality steps of 40%–90%, target sizes of 20 KB–2 MB and longest edges from 800 to 4096 px act at the final encode; past the canvas ceiling it scales rather than clips',
        'Up to 200 images per batch with a 100 MB per-file ceiling, downloadable as one ZIP',
      ],
    },
    limits: {
      zh: [
        '矢量性丢失：产物是位图，放大就糊；需要"任意缩放清晰"请保留 SVG 本身（本项目可 SVG → HTML，把矢量原样嵌进网页）',
        '透明不保留：JPEG 没有 Alpha，编码前画布铺白，所以带透明的 SVG 图形落在白底上',
        '外部引用取不到：`<image href="http…">`、外链字体与远程 CSS 都不会被请求，那些位置按空白或系统字体呈现',
        '动画只出一帧：SMIL 与 CSS 动画在栅格化时定格，产物是静态图',
        '方向不可逆：浏览器不提供 SVG 编码器，JPEG → SVG 不存在；SVG 在这里只能作为输入',
        '解析失败（XML 不合法、根元素不是 `<svg>`）会明确报解码失败，而不是给一张空图',
      ],
      en: [
        'Vector-ness is gone: the result is a bitmap that softens when enlarged. Where "sharp at any size" is the requirement, keep the SVG — this project can also do SVG → HTML, which embeds the vector as it is',
        'Transparency does not survive: JPEG has no alpha channel and the canvas is painted white first, so a transparent diagram arrives on white',
        'External references cannot be fetched: `<image href="http…">`, web fonts and remote CSS are never requested, so those positions read as blank or as system type',
        'Animation keeps one frame: SMIL and CSS animation are frozen at rasterisation, and the output is a still image',
        'The direction is one-way: a browser ships no SVG encoder, so JPEG → SVG does not exist — SVG is input-only here',
        'A parse failure (malformed XML, a root element that is not `<svg>`) reports a decode error rather than producing a blank image',
      ],
    },
    notes: {
      zh: [
        '需要透明就选 SVG → PNG（无损、带 Alpha）或 SVG → WebP（更小、带 Alpha）；只有"必须任何设备可开"才落在 JPEG',
        '出图偏小多半是源文件没写尺寸：给 `<svg>` 补一个 `width`（或让它有 `viewBox`）再转，比事后放大更清楚',
        '同一份 SVG 还能转 HTML——那条保留矢量本身，适合放进网页直接显示',
      ],
      en: [
        'For transparency choose SVG → PNG (lossless, alpha) or SVG → WebP (smaller, alpha); land on JPEG only when "must open anywhere" is the requirement',
        'A surprisingly small output usually means the source declared no size: giving the `<svg>` a `width`, or a `viewBox`, and converting again beats upscaling afterwards',
        'The same SVG can go to HTML, which keeps the vector itself and is the better shape for displaying on a page',
      ],
    },
    faq: [
      {
        q: { zh: '转出来比我预期小，为什么？', en: 'Why did it come out smaller than I expected?' },
        a: {
          zh: '因为尺寸是从文件自己声明里读的：`width="100%"` 这种相对值不算可用数字，会退到 viewBox，再退到 1024 px 方形。想要更大，把源文件的 `width` / `height` 写成具体像素值，或者在输出参数里把最长边设大——后者是对已有结果做重采样，前者是让源说清楚。',
          en: 'Because the size is read from what the file declares: a relative value such as `width="100%"` is not a usable number, so it falls back to the viewBox and then to a 1024 px square. For a larger result, either write concrete pixel values into the source’s `width` / height, or raise the longest edge in the output parameters — the second resamples what was produced, the first makes the source say what it means.',
        },
      },
      {
        q: { zh: '为什么图里有一块是空的？', en: 'Why is part of the picture missing?' },
        a: {
          zh: '最常见的原因是那块内容不在文件里：它是 `<image>` 引用的远程图，或是外链字体的文字——两者在离线前提下都不会被请求。改法是把需要的资源内联进 SVG（图片转成 data URI、字体转成路径或内联），再转一次。',
          en: 'Most often because that content was never inside the file: it is a remotely referenced `<image>`, or text set in a web font — neither of which is requested under the offline guarantee. The fix is to inline what you need into the SVG, as a data URI for the picture and outlines or inlined faces for the type, and convert again.',
        },
      },
      {
        q: { zh: '动画 GIF 那种"会动"的效果能保住吗？', en: 'Can the animation survive?' },
        a: {
          zh: '不能，JPEG 是静态容器。要保留动，SVG 本身就可以直接嵌进 HTML（本项目有这条路）；需要栅格化的动态图，得用支持动画的格式，而那不在浏览器可编码的范围内。',
          en: 'No — JPEG is a still container. To keep motion, embed the SVG itself in HTML, which this extension can do; a raster animation needs an animated format, and none of those are inside what a browser will encode.',
        },
      },
    ],
  },
  {
    slug: 'svg-to-webp',
    from: 'svg',
    to: 'webp',
    shot: 'output-preset',
    published: '2026-10-02',
    title: {
      zh: 'SVG 转 WebP——本地栅格化，还带透明',
      en: 'SVG to WebP locally — rasterised with alpha kept',
    },
    desc: {
      zh: '浏览器本地把 .svg 栅格化后编成 WebP：带 Alpha，所以透明图形的背景能留住；质量档 40%–90%、目标体积 20 KB–2 MB、最长边可调。尺寸按 width / viewBox 推断，外部引用一律不请求。',
      en: 'Rasterise a .svg to WebP locally — the SVG route that keeps transparency, with quality, target size and longest edge adjustable and nothing external fetched.',
    },
    lede: {
      zh: '这一条与 SVG → JPEG 是同一次栅格化的两个出口，差别集中在最后那一步容器：WebP 有 Alpha，所以透明图标不必先铺白；同时它通常更小。代价是兼容性由接收方决定——需要"任何设备都打开"时 JPEG 仍是更稳的答案，需要无损时该走 PNG。这三条判断只关于容器，源侧完全一致，所以同一份 SVG 三种格式各出一张比较，成本很低。',
      en: 'This is the same rasterisation as SVG to JPEG leaving by a different door, and the difference lives entirely in the container: WebP has an alpha channel, so a transparent icon does not have to be laid on white first, and it is usually smaller. The price is that compatibility is the recipient’s call — where "must open anywhere" is the requirement JPEG remains the safer answer, and where losslessness is the requirement PNG belongs. All three judgements are about the container while the source side is identical, so comparing one SVG across the three formats is cheap.',
    },
    keeps: {
      zh: [
        'Alpha 通道：透明区域的背景能留在产物里，这是相对 JPEG 的实质差别',
        '图形按矢量渲染路径落地：路径、渐变、描边、文字在栅格化时算，不是截屏再放大',
        '尺寸推断优先级明确：可用的 `width` / `height` → `viewBox` → 1024 px 方形',
        '安全处理在编码前：脚本与事件属性被剥离后才画到画布',
        '质量档 40%–90%、目标体积 20 KB–2 MB、最长边 800–4096 px 在终点编码生效；超过画布上限自动收敛',
      ],
      en: [
        'The alpha channel: a transparent background stays transparent in the result, which is the real difference against JPEG',
        'The artwork lands along the vector render path — shapes, gradients, strokes and text computed at rasterisation, not magnified from a screenshot',
        'A stated size priority: a usable `width` / `height`, then the `viewBox`, then a 1024 px square',
        'Safety applied before encoding: scripts and event-handler attributes are stripped before anything paints',
        'Quality steps of 40%–90%, target sizes of 20 KB–2 MB and longest edges from 800 to 4096 px act at the final encode, scaling rather than clipping past the canvas ceiling',
      ],
    },
    limits: {
      zh: [
        '矢量性丢失：产物是位图，放大就糊；要任意缩放请保留 SVG（可走 SVG → HTML 原样嵌入）',
        '外部引用不请求：远程 `<image>`、外链字体与远程 CSS 都不出现，位置按空白或系统字体呈现',
        '动画只出一帧：SMIL 与 CSS 动画在栅格化时定格',
        '接收方支持由它决定：部分旧版邮件客户端与办公套件仍不友好，这时 PNG 或 JPEG 更稳',
        '有损编码：要"栅格化但一点不丢"请走 SVG → PNG',
        '方向不可逆：浏览器不提供 SVG 编码器，WebP → SVG 不存在',
      ],
      en: [
        'Vector-ness is gone: the result is a bitmap that softens when enlarged — keep the SVG (or embed it as it is via SVG → HTML) when scale matters',
        'External references are never requested, so remote `<image>` elements, web fonts and remote CSS are absent, reading as blank or system type',
        'Animation keeps one frame: SMIL and CSS animation freeze at rasterisation',
        'Whether WebP opens is the recipient’s call: some older mail clients and office suites are still unfriendly, where PNG or JPEG is steadier',
        'It is a lossy encode: for a rasterisation that discards nothing, take SVG → PNG',
        'The direction is one-way: no browser encodes SVG, so WebP → SVG does not exist',
      ],
    },
    notes: {
      zh: [
        '三个出口的分工：PNG 无损、WebP 更小且带透明、JPEG 兼容性最好——同一份 SVG 各出一张再比，是最省事的判断法',
        '图标类小图常遇到"看着偏软"，多半是源尺寸本来就小：把源 `width` 写大一点再转，比放大产物更干净',
        '一批可以混着来，也可以中途取消；取消后已完成的部分会被如实标成"被中断"',
      ],
      en: [
        'How the three doors divide the work: PNG lossless, WebP smaller with alpha, JPEG best-supported — rendering one SVG three ways and comparing is the least effort that actually decides',
        'Small icons often read soft because the source was small: raising `width` in the file before converting is cleaner than enlarging the result',
        'Batches can mix formats and can be cancelled part-way; a cancelled run is reported truthfully as interrupted rather than as success',
      ],
    },
    faq: [
      {
        q: { zh: '和 SVG → PNG 之间我该选哪个？', en: 'WebP or PNG out of an SVG — which?' },
        a: {
          zh: '看它去哪儿。要塞进网页当资源、体积敏感、接收方是现代浏览器：WebP。要存档、要后续再编辑、或不确定对端能不能开 WebP：PNG。两者都保透明，所以透明不是这里的决定因素。',
          en: 'It depends where the file goes. Into a page as an asset, size-sensitive, with a modern browser on the other end: WebP. For an archive, for further editing, or where WebP support is unknown: PNG. Both keep transparency, so that is not the deciding factor here.',
        },
      },
      {
        q: { zh: '为什么转出来的图边缘有轻微噪点？', en: 'Why is there faint noise around the edges?' },
        a: {
          zh: '有损编码在硬边上的正常代价，图标与线条稿最容易显形。两条改法：把质量档调高，或者直接走 SVG → PNG——透明图上如果本来就只有几种颜色，无损的 PNG 常常并不比 WebP 大很多。',
          en: 'That is the ordinary cost of a lossy encode on hard edges, which shows most on icons and line art. Either raise the quality step, or take SVG → PNG: for a mostly-flat transparent image, lossless PNG is often not much larger than WebP.',
        },
      },
      {
        q: { zh: '能一次把整套图标都栅格化吗？', en: 'Can I rasterise a whole icon set at once?' },
        a: {
          zh: '能，一批最多 200 张，输出参数（最长边、质量、目标体积）一次设置、整批共用，最后可以一个 ZIP 拿回来。这也是给多倍图最省事的做法：同一批跑两遍，分别设 1x 与 2x 的最长边。',
          en: 'Yes — up to 200 images per run, with the output parameters (longest edge, quality, target size) set once and shared by the batch, and one ZIP for the result. It is also the cheapest way to make density variants: run the same batch twice at 1x and 2x longest edges.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-md',
    from: 'txt',
    to: 'md',
    shot: 'batch-results',
    published: '2026-10-02',
    title: {
      zh: 'TXT 转 Markdown——本地包成围栏代码块，一字不改',
      en: 'TXT to Markdown locally — fenced, not one character changed',
    },
    desc: {
      zh: '浏览器本地把 .txt 包成带围栏的 Markdown 代码块：内容原样保留，围栏长度会按文本里出现的最长反引号串加长，所以你的三反引号不会把结构撑破。它不猜标题、不猜列表——那是"值保真"与"替你排版"的区别。',
      en: 'Wrap a .txt in a fenced Markdown code block verbatim: the fence grows past the longest run of backticks in your text, and it guesses no headings or lists.',
    },
    lede: {
      zh: '这条转换有用恰恰是因为它笨：Markdown 是纯文本的超集，任何 .txt 都可以原样放进 .md 而不改变含义；但反过来，"把你的日志、表格、诗歌自动认成 Markdown 结构"就必然要靠猜。猜错很贵——一旦识别出标题与列表，原来的缩进、连续空格与对齐就全没了。所以这一条只做一件不会错的事：加一层围栏。要结构，请自己写那几行标记，或者从真的有结构的源（Word / HTML / CSV）出发。',
      en: 'This conversion is useful precisely because it is dumb: Markdown is a superset of plain text, so any .txt can enter a .md unchanged in meaning, while "recognising your log, table or poem as Markdown structure" necessarily means guessing. Guessing wrong is expensive — once a heading or a list is identified, the indentation, run of spaces and careful alignment are gone. So this route does the one thing that cannot be wrong: it adds a fence. For structure, write those few markers yourself, or start from a source that genuinely has structure (Word, HTML, CSV).',
    },
    keeps: {
      zh: [
        '每一个字符：内容按原样放进围栏里，缩进、连续空格、行尾空白都不动',
        '围栏长度会自适应：取文本中最长的三反引号串再 +1，所以内嵌代码片段不会被截断或提前闭合',
        '换行结构：这是一次文本包装，不是重排，行号对应关系保持不变',
        '文件类型标注为 `text/markdown`，产物是一个 .md',
        '一批最多 200 个文件、单个文件 100 MB 上限，可与其它源格式混批',
      ],
      en: [
        'Every character: the content goes inside the fence untouched — indentation, runs of spaces and trailing whitespace all stay',
        'A fence that sizes itself: one longer than the longest backtick run found in the text, so an embedded snippet cannot truncate or close the block early',
        'The line structure — this is a text wrapper, not a re-typesetting, so line correspondence is preserved',
        'The file is typed `text/markdown` and delivered as a .md',
        'Up to 200 files per batch with a 100 MB per-file ceiling, mixable with other source formats',
      ],
    },
    limits: {
      zh: [
        '不生成结构：标题、列表、表格、强调一律不推断，产物整块是代码块（这正是"不改内容"的代价）',
        '编码按严格解码链读：UTF-16（看 BOM 或 NUL 分布）→ UTF-8 → GB18030 → GBK，国内 Excel 另存的 GBK 文件读得动；这条链覆盖不了的字节（改了扩展名的压缩二进制，PNG / GIF / ZIP 那一类）报解码失败，而不是悄悄给你一屏乱码——那一屏乱码之后就没法复原了',
        '围栏之外没有别的加工：如果你想要"看起来像文档"的结构，请走 TXT → HTML 或 TXT → DOCX（它们是另一套取舍）',
        '反向也有路但不同源：Markdown → TXT 会剥掉标记，而这一条只是包一层，两者不互逆',
      ],
      en: [
        'No structure is manufactured: headings, lists, tables and emphasis are not inferred, and the whole result is one code block — which is the price of not touching the content',
        'Decoding runs a strict chain — UTF-16 (by BOM or NUL spacing), then UTF-8 → GB18030 → GBK — so a GBK file from a Chinese Excel reads correctly, while bytes no encoding in the chain covers (a compressed binary wearing a .txt name: PNG, GIF, ZIP) report a decode failure rather than quietly producing a screen of mojibake, which could not be undone afterwards',
        'Nothing happens outside the fence: for something that reads like a document, take TXT → HTML or TXT → DOCX, which make different trade-offs',
        'The reverse route is not an inverse: Markdown → TXT strips markers, while this route only wraps — the two are not each other’s undo',
      ],
    },
    notes: {
      zh: [
        '典型用法是把日志、SQL、CSV 片段、诗歌放进一篇 Markdown 文章里而不被重排——围栏正是为此存在',
        '想让内容在 Markdown 里"正常显示"而不是当代码，那不需要转换：直接在 .md 里去掉围栏即可，或用 TXT → HTML',
        '同一份 TXT 还能转 HTML、CSV、JSON 与 DOCX；那几条会解释字段与换行怎么处理，与这条的取舍完全不同',
      ],
      en: [
        'The typical use is putting a log, some SQL, a CSV fragment or a poem into a Markdown article without it being re-typeset — which is exactly what a fence is for',
        'If the content should render normally rather than as code, no conversion is needed: write the .md without a fence, or take TXT → HTML',
        'The same TXT can go to HTML, CSV, JSON or DOCX; those pages explain how fields and line breaks are handled, and their trade-offs are entirely different',
      ],
    },
    faq: [
      {
        q: { zh: '为什么不帮我把 "# 标题" 认成标题？', en: 'Why not treat "# Heading" as a heading for me?' },
        a: {
          zh: '因为那行字在普通文本里也可能只是行号、注释或一段配置。认成标题就把"原样"这件事破坏了，而且不可逆——缩进与对齐一旦重排就回不去。宁可让你手动加那一个标记，也不替你猜。',
          en: 'Because that line may just as well be a numbering, a comment or a configuration stanza in ordinary text. Reading it as a heading destroys the "verbatim" guarantee irreversibly, since re-flowed indentation does not come back. One manual marker is better than a guess made on your behalf.',
        },
      },
      {
        q: {
          zh: '我的文本里就有三反引号，会被截断吗？',
          en: 'My text already contains triple backticks — will it break the block?',
        },
        a: {
          zh: '不会。围栏长度是按文本里实际出现的最长反引号串算出来再加一，所以四枚、五枚的反引号串都在围栏之下，块结构稳定。这一点是从"直接写三枚就够"改成实测的原因——那会让内嵌代码把围栏提前闭合。',
          en: 'No. The fence is measured against the longest backtick run actually present and made one longer, so runs of four or five sit inside it and the block stays intact. That rule exists because a fixed three-backtick fence would let an embedded snippet close the block early.',
        },
      },
      {
        q: { zh: '老文件是 GBK 编码的，打不开怎么办？', en: 'My file is GBK and it fails — what now?' },
        a: {
          zh: '这条路径读的是严格解码链，不是宽进严出的猜测：任一编码能严格表示这批字节就按它解，全都不覆盖才报解码失败——猜错的解码是不可逆的。所以国内 Excel 的 GBK / GB18030 文件可以直接转，改了扩展名的压缩二进制（PNG / GIF / ZIP 那一类）会被挡在门口。真遇到报解码失败，先用能指定编码的工具转存成 UTF-8，再拿来转。',
          en: 'This route reads through a strict chain, not a permissive guess: whichever of UTF-16, UTF-8, GB18030 and GBK can represent the bytes exactly wins, and only when none can does it report a decode failure — a wrong decoding cannot be undone. So a GBK or GB18030 file from a Chinese Excel converts as-is, while a compressed binary wearing a text extension (a PNG, GIF or ZIP renamed .txt) is stopped at the door. If you do hit the failure, re-save as UTF-8 with a tool that lets you name the encoding, then convert it.',
        },
      },
    ],
  },
  {
    slug: 'html-to-docx',
    from: 'html',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'HTML 转 Word（.docx）——离线打包，结构跟着走',
      en: 'HTML to Word (.docx) offline — structure survives',
    },
    desc: {
      zh: '在浏览器本地把 .html 打包成 .docx：标题、列表、表格、链接与内联图示成为 Word 里的真实内容；远程子资源在打包前剥掉，Word 打开时不会替你联网。',
      en: 'Pack an HTML page into a real .docx in your browser: headings, lists, tables and diagrams survive, and remote subresources are stripped before Word opens it.',
    },
    lede: {
      zh: '网页存档、导出笔记、内部系统里复制出来的一段 HTML，要交给只收 Word 的人。这条路径用 html-docx-js 把净化后的 HTML 打进 .docx 的 altChunk，Word 打开文件时按自己的 HTML 子集渲染成段落——文字可选中、可编辑、可批注。打包前有两道处理：内联 SVG 先栅格化成 PNG（净化器的 html 配置不含 svg 标签，不先转换会把图整块删掉），随后剥掉所有远程子资源，包括 `//host/x.png` 这种协议相对地址。链路完全在本机完成。',
      en: 'A saved page, an exported note, a block of HTML copied out of an internal tool — and the recipient only accepts Word. This route packs sanitized HTML into the .docx as an altChunk, which Word renders into paragraphs when the file is opened: text stays selectable, editable and commentable. Two passes run before packing: inline SVG is rasterized to PNG first (the sanitizer’s html profile carries no svg tag, so skipping that step would delete the diagram outright), and every remote subresource is then stripped, protocol-relative `//host/x.png` included. The whole route runs locally.',
    },
    keeps: {
      zh: [
        '标题、段落、有序与无序列表、表格、引用、加粗斜体与链接，成为 Word 里的真实内容（不是整页截图）',
        '内联 SVG 先转成 PNG 再打包，图示不会在净化那一步被整块删掉',
        '纯文本链接保留：`<a href>` 是正文内容，不是子资源，剥离时不碰它',
        '一批最多 200 个文件、单个 100 MB，可与其它源格式混批',
      ],
      en: [
        'Headings, paragraphs, ordered and unordered lists, tables, quotes, emphasis and links arrive as real Word content — not as a screenshot of the page',
        'Inline SVG is turned into PNG before packing, so a diagram is not deleted wholesale by the sanitizer',
        'Plain links survive: an `<a href>` is content, not a subresource, and the strip pass leaves it alone',
        'Up to 200 files per batch at 100 MB each, mixable with other source formats',
      ],
    },
    limits: {
      zh: [
        '远程图片、样式表与字体在打包前被剥掉：Word 打开文档时不该替你发起网络请求。图片要么以 data URI 内嵌，要么以相对路径原样保留——相对资源不会随包内嵌',
        '版式不是逐像素复刻：Word 用自己的 HTML 子集与文档主题渲染，复杂 CSS（绝对定位、浮动、网格、媒体查询）会退化，页边距与字体由 Word 决定',
        '产物依赖 Word 对 altChunk 的支持；少数不处理 altChunk 的阅读器可能显示不出正文，交付前请用目标环境打开确认',
        '脚本与事件处理器在净化时被移除，依赖 JavaScript 才有内容的页面只会剩下静态标记',
      ],
      en: [
        'Remote images, stylesheets and fonts are stripped before packing: Word must not issue a network request while opening your file. Images either arrive as data URIs or stay as relative paths — relative resources are not embedded into the package',
        'Layout is not reproduced pixel for pixel: Word renders the markup through its own HTML subset and document theme, so complex CSS (absolute positioning, floats, grid, media queries) degrades, and margins and fonts come from Word',
        'The result depends on Word supporting altChunk; a reader that does not handle altChunk may show no body text, so open the file in the target environment before delivery',
        'Scripts and event handlers are removed by the sanitizer, so a page whose content only exists after JavaScript keeps just its static markup',
      ],
    },
    notes: {
      zh: [
        '这条与 Markdown → Word 的取舍得不同：那条先把标记解析成语义化 HTML，这条直接打包你给的 HTML 结构；源里有内联样式时，Word 认得出的那部分会跟着走',
        '同一份 HTML 还能接着转 Markdown、纯文本或 PDF；PDF 那条是整页渲染、没有文字层，与这条正好互补',
        '远程资源被剥掉这件事会在产物里如实体现，不会假装图片还在',
      ],
      en: [
        'This differs from Markdown → Word: that route parses markers into semantic HTML first, while this one packs the HTML structure you supply; inline styles survive to the extent Word recognises them',
        'The same HTML can carry on to Markdown, plain text or PDF; the PDF route renders whole pages with no text layer, which complements this one',
        'Stripped remote resources are reflected honestly in the result — nothing pretends the images are still there',
      ],
    },
    faq: [
      {
        q: { zh: 'Word 打开时会联网吗？', en: 'Will Word go online when it opens the file?' },
        a: {
          zh: '不会。指向 http(s) 的图片、样式表与字体在打包前就被剥掉，协议相对地址也不例外；文档里只剩内嵌数据与相对路径。链接本身保留，只有你主动点它才会打开浏览器。',
          en: 'No. Images, stylesheets and fonts behind http(s) URLs are stripped before packing, protocol-relative addresses included; only embedded data and relative paths remain. Links stay, but only a click of yours opens the browser.',
        },
      },
      {
        q: { zh: '内联 SVG 图会变成什么？', en: 'What happens to an inline SVG diagram?' },
        a: {
          zh: '在打包前栅格化成 PNG。净化器为移除可执行标记所用的 html 配置里没有 svg 标签，所以顺序必须是“先栅格化、再净化”；否则一张图会在结果里整块消失，而转换仍报成功。',
          en: 'It is rasterized to PNG before packing. The sanitizer’s html profile, which exists to remove executable markup, carries no svg tag, so the order has to be rasterize-then-sanitize; otherwise the diagram disappears from the result while the conversion still reports success.',
        },
      },
      {
        q: { zh: '为什么打开后排版和浏览器里不一样？', en: 'Why does the layout differ from the browser?' },
        a: {
          zh: '因为渲染它的是 Word，不是浏览器。这条路径把结构交给 Word，样式只保留 Word 认得出的那部分；绝对定位、浮动与媒体查询这类浏览器版式没有对应物，页边距与字体也来自 Word 的文档主题。',
          en: 'Because Word renders it, not a browser. This route hands the structure to Word and keeps only the styling Word understands; absolute positioning, floats and media queries have no counterpart, and margins and fonts come from Word’s document theme.',
        },
      },
    ],
  },
  {
    slug: 'html-to-md',
    from: 'html',
    to: 'md',
    shot: 'preview-edit',
    published: '2026-10-20',
    title: {
      zh: 'HTML 转 Markdown——表格、任务清单与图示都保住',
      en: 'HTML to Markdown offline — tables and tasks kept',
    },
    desc: {
      zh: '浏览器本地把 HTML 转成 GFM：标题、列表、表格与任务复选框保留，内联 SVG 先栅格化成 PNG，图片仍写成 Markdown 链接。',
      en: 'Turn an HTML page into GFM in your browser: headings, lists, tables and task checkboxes survive, inline SVG becomes a PNG, images stay as links.',
    },
    lede: {
      zh: '把一篇网页、导出的笔记或富文本片段收进 Markdown 仓库，最怕的是表格被整块吞掉、复选框连行一起消失。这条路径用 Turndown 生成 ATX 标题与围栏代码块，并为表格补了一条 GFM 规则：整张表一次性序列化，单元格文本压平、竖线转义、短行补齐；任务列表的复选框在 `<li>` 里时写成 `[x] ` / `[ ] `。内联 SVG 在转换前先栅格化成 `data:image/png`，否则 Turndown 没有对应规则，整张图只剩几个孤立的文字节点。',
      en: 'Moving a page, an exported note or a rich-text fragment into a Markdown repository usually goes wrong in two places: the table disappears wholesale and the checkbox takes its line with it. This route uses Turndown for ATX headings and fenced code, and adds a GFM rule for tables: the whole table is serialized at once, cell text is flattened, pipes are escaped and short rows are padded. A checkbox inside an `<li>` becomes `[x] ` / `[ ] `. Inline SVG is rasterized to `data:image/png` before conversion — Turndown has no rule for it, and without that step a diagram collapses to a handful of disconnected text nodes.',
    },
    keeps: {
      zh: [
        '标题、列表、强调、删除线、引用块、围栏代码块与行内代码，按 GFM 语法输出',
        '表格按 GFM 管道表输出；单元格内的竖线会转义，长短不齐的行按表头列数补齐',
        '`<li>` 里的任务复选框写成 `[x] ` / `[ ] `，列表层级由 Turndown 的列表规则保留',
        '图片保留为 `![alt](src)`；内联 SVG 先栅格化成 PNG data URI 再写成图片链接',
        '一批最多 200 个文件、单个 100 MB',
      ],
      en: [
        'Headings, lists, emphasis, strikethrough, quotes, fenced code blocks and inline code come out as GFM',
        'Tables become GFM pipe tables; pipes inside cells are escaped and ragged rows are padded to the header’s column count',
        'A checkbox inside an `<li>` becomes `[x] ` / `[ ] `, with list nesting left to Turndown’s list rules',
        'Images stay as `![alt](src)`; inline SVG is rasterized to a PNG data URI and written as an image link',
        'Up to 200 files per batch at 100 MB each',
      ],
    },
    limits: {
      zh: [
        '单元格内的行内格式被压平成纯文本：一张表里的加粗、链接与代码样式不会带进 Markdown（这是保住整张表的代价）',
        '嵌套表格只按外层处理，内层内容以文本并入外层单元格；HTML 的 `<div>`、class、内联样式与 CSS 全部丢弃',
        '远程图片不会被下载，但会原样写成 `![](https://…)`：扩展自身不发起请求，打开这份 Markdown 的编辑器或预览器可能去取图',
        '不是可逆转换：HTML → Markdown → HTML 回不到原页面，结构、样式与脚本都不会复原',
        '内联 SVG 栅格化后是位图，矢量可编辑性丢失',
      ],
      en: [
        'Inline formatting inside a cell is flattened to text: bold, links and code styling within a table do not reach the Markdown — the price of keeping the table intact',
        'Nested tables are handled through the outer table only, with inner content merged into the outer cell as text; `<div>`, classes, inline styles and CSS are all dropped',
        'Remote images are not downloaded, but they are written out as `![](https://…)`: the extension makes no request, while the editor or previewer you open the Markdown with may fetch them',
        'It is not reversible: HTML → Markdown → HTML does not return the original page; structure, styling and scripts do not come back',
        'A rasterized inline SVG is a bitmap, so vector editability is lost',
      ],
    },
    notes: {
      zh: [
        '适合把文档站、邮件与富文本导出收进仓库；需要保留完整版式时改走 HTML → PDF（整页渲染，但没有文字层）',
        '同一份 HTML 还能转 Word 或纯文本；那两条分别保留 Word 结构与阅读顺序，与这条的取舍不同',
      ],
      en: [
        'Good for pulling docs sites, emails and rich-text exports into a repository; when the full layout matters, take HTML → PDF instead (whole-page rendering, but no text layer)',
        'The same HTML can go to Word or plain text; those routes keep Word structure and reading order respectively, with different trade-offs',
      ],
    },
    faq: [
      {
        q: { zh: '表格里的加粗为什么没了？', en: 'Why did the bold text inside my table disappear?' },
        a: {
          zh: '因为整张表由一条规则一次性序列化，单元格取的是 textContent 再压平空白。这样做换来的是表格结构一定不丢；若逐格保留行内标记，嵌套表格与短行就会把输出撑破。',
          en: 'Because the whole table is serialized by one rule, and each cell is reduced to its textContent with whitespace flattened. That is what guarantees the table structure survives; preserving inline markup cell by cell would break the output on nested tables and ragged rows.',
        },
      },
      {
        q: { zh: '内联 SVG 会怎样？', en: 'What happens to inline SVG?' },
        a: {
          zh: '先离屏渲染成 PNG，再写成 `![alt](data:image/png;base64,…)`。没有这一步时 Turndown 会把整个 `<svg>` 子树压成几个文字节点，图就没了。位图意味着不能再在 Markdown 里编辑矢量。',
          en: 'It is rendered offscreen to PNG first, then written as `![alt](data:image/png;base64,…)`. Without that step Turndown flattens the whole `<svg>` subtree into a few text nodes and the diagram is gone. Being a bitmap, it can no longer be edited as a vector inside the Markdown.',
        },
      },
      {
        q: { zh: '转换时会不会去抓网页里的图片？', en: 'Does the conversion fetch the page’s images?' },
        a: {
          zh: '不会。扩展没有 host 权限，转换器只把 `<img src>` 写进 Markdown。之后你用某个编辑器打开这份 .md，若它选择去取远程图片，那是那个软件的请求，不是这一次转换发出的。',
          en: 'No. The extension has no host permissions, and the converter only writes `<img src>` into the Markdown. If the editor you later open the .md with chooses to fetch a remote image, that request belongs to that software, not to this conversion.',
        },
      },
    ],
  },
  {
    slug: 'webp-to-png',
    from: 'webp',
    to: 'png',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'WebP 转 PNG——透明保留，本地重编码',
      en: 'WebP to PNG offline — transparency kept',
    },
    desc: {
      zh: '在浏览器里把 .webp 解码并重编码为 PNG，透明通道原样保留；可批量、可限制最长边，文件不上传。',
      en: 'Decode a .webp in your browser and re-encode it as a PNG with transparency intact. Batch it, cap the long edge, no upload.',
    },
    lede: {
      zh: 'WebP 省带宽，但不是每个编辑器、印刷流程或旧系统都收。这条路径把图片解码到 `<canvas>`，再编码成 PNG：PNG 分支不铺白底，所以带透明度的 WebP 转过去仍然是透明背景。解码后若最长边超过 8192 px 会先等比缩小（浏览器画布的单边上限），输出面板里的“最长边”也会在这一步生效；PNG 是无损容器，质量与目标体积两个参数对它不作用。',
      en: 'WebP saves bandwidth, but not every editor, print pipeline or legacy system accepts it. This route decodes the image into a `<canvas>` and encodes PNG: the PNG branch adds no white fill, so a WebP with transparency stays transparent. If the long edge exceeds 8192 px after decoding it is scaled down proportionally first (the browser’s per-side canvas ceiling), and the “max edge” output setting applies at this step too. PNG is lossless, so the quality and target-size levers do not act on it.',
    },
    keeps: {
      zh: [
        '像素内容按原分辨率重编码（除非触发 8192 px 单边上限，或你设置了更小的最长边）',
        '透明通道保留：PNG 分支不铺白底，alpha 原样写进产物',
        '批量：一批最多 200 个文件、单个 100 MB，可一次转完',
        '图片输出参数里的最长边对这条路径生效',
      ],
      en: [
        'Pixels are re-encoded at the original resolution unless the 8192 px per-side ceiling or a smaller max-edge setting applies',
        'Transparency is kept: the PNG branch adds no white fill, so alpha is written through',
        'Batch: up to 200 files per batch and 100 MB per file',
        'The max-edge output setting takes effect on this route',
      ],
    },
    limits: {
      zh: [
        '动图 WebP 只画第一帧：`drawImage` 只取一帧，而多帧检测只覆盖 GIF，所以这条路径不会为动图 WebP 单独给出丢帧提示',
        '重编码会改变字节：这是解码再编码，不是容器换壳；无损 PNG 通常比原 WebP 大，差距取决于画面',
        'EXIF 方向、ICC 配置等元数据不随 canvas 走；浏览器解码时已按方向摆正，但其它元数据不会写回',
        '被 8192 px 上限缩过的图无法从产物里恢复原尺寸',
      ],
      en: [
        'Animated WebP keeps the first frame only: `drawImage` takes one frame, while multi-frame detection covers GIF alone, so this route gives no lost-frame notice for an animated WebP',
        'Re-encoding changes the bytes: this is decode-then-encode, not a container swap; a lossless PNG is usually larger than the source WebP',
        'Metadata such as EXIF orientation and ICC profiles does not travel through the canvas; orientation is already applied at decode time, but the other fields are not written back',
        'An image scaled down by the 8192 px ceiling cannot be restored from the result',
      ],
    },
    notes: {
      zh: [
        '要保留动画，这条路径不对：它只取首帧。反过来，PNG → WebP 也走同一条画布路径',
        '同一张图还能转 JPEG（透明会被白底取代）或 PDF（一页一图）；尺寸与格式的取舍各自写在对应页',
      ],
      en: [
        'This route is not for keeping animation: it takes the first frame. In the other direction, PNG → WebP takes the same canvas path',
        'The same image can go to JPEG (transparency replaced by white) or PDF (one image per page); each page spells out its own trade-offs',
      ],
    },
    faq: [
      {
        q: { zh: '透明背景会变白吗？', en: 'Will the transparent background turn white?' },
        a: {
          zh: '不会。转 PNG 的分支不铺白底，alpha 通道保留。只有目标是 JPEG 时才会先铺白，因为 JPEG 没有透明通道。',
          en: 'No. The PNG branch adds no white fill and keeps the alpha channel. White is laid down only for a JPEG target, which has no alpha channel.',
        },
      },
      {
        q: { zh: '为什么转出来的 PNG 比 WebP 大？', en: 'Why is the PNG larger than the WebP?' },
        a: {
          zh: '因为这是一次完整的解码再编码，不是改扩展名。WebP 用有损或更高效的压缩，PNG 是无损容器；画面越复杂，差距越明显。',
          en: 'Because this is a full decode and re-encode, not a renamed file. WebP uses lossy or more efficient compression while PNG is a lossless container; busier images widen the gap.',
        },
      },
      {
        q: { zh: '我的图超过 8192 像素会怎样？', en: 'What if my image is larger than 8192 pixels?' },
        a: {
          zh: '浏览器单边画布上限是 8192 px，超过时按比例缩到上限再编码；你也可以在输出参数里把最长边设得更小。需要原尺寸时请先确认原图尺寸，产物不会标注它被缩过。',
          en: 'The browser’s per-side canvas ceiling is 8192 px; anything larger is scaled down proportionally before encoding, and you can set a smaller max edge in the output options. Check the source dimensions first if you need full size — the result does not label itself as downscaled.',
        },
      },
    ],
  },
  {
    slug: 'gif-to-jpg',
    from: 'gif',
    to: 'jpg',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'GIF 转 JPEG——首帧、白底、本地完成',
      en: 'GIF to JPEG offline — first frame on white',
    },
    desc: {
      zh: '把 .gif 解成静态 .jpg：浏览器取第一帧，铺白底后重编码；多帧 GIF 会在结果里如实标记丢帧，文件不上传。',
      en: 'Turn a .gif into a still .jpg in the browser: the first frame is flattened onto white and re-encoded, and extra frames are reported as lost.',
    },
    lede: {
      zh: 'GIF 常被当成“会动的图片”，但很多接收方只想要一张静态封面。这条路径用 `<img>` 解码出第一帧，画到画布上，再编码成 JPEG。JPEG 没有 alpha 通道，所以编码前会先铺满白底——这不是丢像素，而是把透明区域按白纸处理。若输入确实是多帧 GIF（按块结构数到第二个 image descriptor 就判定），结果会带上丢帧标记，界面里明确写出“其它帧没有保留”，而不是悄悄交出一张静帧。',
      en: 'A GIF is often used as “the moving picture”, while the recipient just wants a still cover. This route decodes the first frame through `<img>`, draws it to a canvas and encodes JPEG. JPEG has no alpha channel, so the canvas is filled white first — not lost pixels, but treating transparent areas as white paper. If the input really has more than one frame (the block structure is walked until a second image descriptor appears), the result carries a lost-frames flag and the UI says so instead of quietly handing back a still.',
    },
    keeps: {
      zh: [
        '第一帧的全部像素，按原尺寸重编码（触发 8192 px 单边上限时等比缩小）',
        '透明区域按白底落地，颜色不串到别的像素',
        '多帧 GIF 的丢帧会在结果里标记，界面如实披露',
        'JPEG 的质量、目标体积与最长边参数在这条路径上生效；一批最多 200 个文件',
      ],
      en: [
        'Every pixel of the first frame, re-encoded at the original size unless the 8192 px per-side ceiling applies',
        'Transparent areas land on white, with no colour bleeding into other pixels',
        'A multi-frame GIF carries a lost-frames flag, surfaced in the UI',
        'Quality, target size and max edge apply on this route; up to 200 files per batch',
      ],
    },
    limits: {
      zh: [
        '动画不会保留：产物是一张静态 JPEG。需要动图时不要走这条',
        '透明丢失：alpha 被白底取代，半透明像素会与白色混合',
        'JPEG 有损：反复转换会累积压缩损失',
        '多帧检测只覆盖 GIF；APNG 与动图 WebP 不在这条路径的检测范围内，但它们同样只会走一帧',
      ],
      en: [
        'Animation is not kept: the result is a still JPEG, so do not take this route for a moving image',
        'Transparency is lost: alpha is replaced by white, and semi-transparent pixels blend with it',
        'JPEG is lossy, so repeated conversions accumulate compression loss',
        'Multi-frame detection covers GIF only; APNG and animated WebP are outside its scope here, though they too contribute a single frame',
      ],
    },
    notes: {
      zh: [
        '想要透明背景就别选 JPEG：GIF → PNG 保留 alpha，只有确实需要 JPEG 时才接受白底',
        'GIF 还能直接铺成一页 PDF（一页一图、无文字层）；那条同样披露丢帧',
      ],
      en: [
        'For a transparent background, do not pick JPEG: GIF → PNG keeps alpha, and white is only the price of genuinely needing JPEG',
        'A GIF can also become a one-page PDF (one image per page, no text layer); that route discloses the lost frames as well',
      ],
    },
    faq: [
      {
        q: { zh: '为什么只剩一帧？', en: 'Why do I get a single frame?' },
        a: {
          zh: '静态 JPEG 存不下时间轴。浏览器在这里通过 `<img>` 只解码第一帧；工具会先判断 GIF 是否真的多帧，是的话在结果里标记丢帧，避免把“静帧”当成完整转换。',
          en: 'A still JPEG has nowhere to store a timeline. The browser decodes the first frame through `<img>`; the tool first checks whether the GIF really has multiple frames and flags the loss when it does, rather than presenting a still as the complete conversion.',
        },
      },
      {
        q: { zh: '透明背景去哪了？', en: 'Where did the transparency go?' },
        a: {
          zh: '被白底取代了。JPEG 没有透明通道，编码前画布会填满白色；半透明像素会与白色混合。要保留透明，请选 GIF → PNG。',
          en: 'It was replaced by white. JPEG has no alpha channel, so the canvas is filled white before encoding and semi-transparent pixels blend with it. To keep transparency, choose GIF → PNG.',
        },
      },
      {
        q: { zh: '质量参数会生效吗？', en: 'Do the quality settings apply?' },
        a: {
          zh: '会。JPEG 是这条路径最终写出的格式，输出参数里的质量、目标体积与最长边都在最后编码时生效。',
          en: 'Yes. JPEG is the format this route finally writes, so quality, target size and max edge from the output settings all act at the final encode.',
        },
      },
    ],
  },
  {
    slug: 'webp-to-pdf',
    from: 'webp',
    to: 'pdf',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'WebP 转 PDF——一页一图，按像素定页面',
      en: 'WebP to PDF offline — one page, exact pixel size',
    },
    desc: {
      zh: '在浏览器里把 .webp 铺成一页 PDF：页面尺寸按图片像素换算，透明铺白，整页只有图像、没有文字层。',
      en: 'Put a .webp on a PDF page sized to its pixels, in your browser. Transparency is flattened onto white and no text layer is added.',
    },
    lede: {
      zh: '把一张 WebP 交成 PDF，通常是为了进打印流程或塞进只收 PDF 的系统。这条路径先解码图片，铺白底（PDF 页面没有透明概念），非 JPEG 源统一编码成 PNG，再由 jsPDF 以图片自身比例建页：宽高按 96 DPI 换算成点（×0.75），横图用横向页面、竖图用纵向页面，图像铺满整页、不留页边距。单张转换时 PDF 里只有这一张图，没有文字层；勾选「合并为一份 PDF」时整批各占一页，顺序与文件列表一致。',
      en: 'Handing a WebP over as a PDF usually means a print pipeline or a system that only accepts PDFs. This route decodes the image, fills white (a PDF page has no transparency), encodes non-JPEG sources as PNG, and has jsPDF create a page at the image’s own aspect: width and height are converted from 96 DPI to points (×0.75), landscape for wide images and portrait for tall ones, with the image filling the page and no margins. A single conversion holds that one image and no text layer; tick “Merge into one PDF” and the batch takes one page each, in list order.',
    },
    keeps: {
      zh: [
        '页面比例与图片一致：宽高由像素按 96 DPI 换算成点，横竖方向自动选择',
        '透明区域以白底落地，不会变成黑色或杂色',
        '大图先按 8192 px 单边上限等比缩小，再写进 PDF',
        '图像铺满整页、不留页边距；默认每张图产出一份 PDF，勾选「合并为一份 PDF」后整批写成一份（每张一页，最多 200 页）',
      ],
      en: [
        'The page matches the image: width and height are converted from pixels at 96 DPI to points, with orientation chosen automatically',
        'Transparent areas land on white rather than black or noise',
        'Oversized images are scaled to the 8192 px per-side ceiling first',
        'The image fills the page with no margins; each input produces its own PDF by default, or the whole batch becomes one document with “Merge into one PDF” ticked (one page per image, up to 200 pages)',
      ],
    },
    limits: {
      zh: [
        '没有文字层：这是图像 PDF，文字不可搜索、不可选中、不可复制',
        '默认一个输入对应一份 PDF；勾选「合并为一份 PDF」后才把整批合成一份，任一张失败则整批不产出',
        '动图 WebP 只取第一帧，而且多帧检测只覆盖 GIF，动图 WebP 不会单独提示',
        '透明被白底取代；EXIF 与 ICC 等元数据不会写进 PDF',
        '页面尺寸是像素按 96 DPI 的名义尺寸，打印机可能再按“适合纸张”缩放一次',
      ],
      en: [
        'No text layer: this is an image PDF, so text cannot be searched, selected or copied',
        'One input gives one PDF by default; ticking “Merge into one PDF” turns the whole batch into one document, and one bad image fails the entire group',
        'Animated WebP contributes its first frame only, and multi-frame detection covers GIF alone, so an animated WebP gets no separate notice',
        'Transparency is replaced by white; metadata such as EXIF and ICC does not enter the PDF',
        'The page is the nominal size of the pixels at 96 DPI, so a printer may scale it again to fit paper',
      ],
    },
    notes: {
      zh: [
        '要可搜索的文字，请从有文字层的源（HTML / Word / Markdown）转 PDF；图片转 PDF 天生只有像素',
        '要把一组 WebP 交成一份文档，勾选「合并为一份 PDF」即可；同一张 WebP 还能转 PNG（保留透明）或 JPEG（白底、有损），输出参数里的质量与体积不作用于 PDF',
      ],
      en: [
        'For searchable text, start from a source that has a text layer (HTML, Word, Markdown); an image-to-PDF route is pixels by nature',
        'To hand over a set of WebP files as one document, tick “Merge into one PDF”; the same WebP can also go to PNG (transparency kept) or JPEG (white background, lossy), and the quality and target-size settings do not act on PDF',
      ],
    },
    faq: [
      {
        q: { zh: 'PDF 里的文字能搜索吗？', en: 'Can text in the PDF be searched?' },
        a: {
          zh: '不能。这份 PDF 是一张完整的图片铺在页面上，不包含文字层。需要可搜索的文字，请从 HTML、Word 或 Markdown 出发。',
          en: 'No. The PDF is one complete image laid on the page and carries no text layer. For searchable text, start from HTML, Word or Markdown.',
        },
      },
      {
        q: { zh: '页面尺寸是怎么定的？', en: 'How is the page size determined?' },
        a: {
          zh: '按图片像素以 96 DPI 换算成点：宽高各乘 0.75，横图用横向、竖图用纵向，图像铺满整页。它不是 A4 或 Letter，打印机可能会再缩放一次。',
          en: 'From the image’s pixels at 96 DPI: width and height are multiplied by 0.75, wide images get a landscape page and tall ones portrait, and the image fills the page. It is not A4 or Letter, and a printer may scale it again.',
        },
      },
      {
        q: { zh: '透明背景会怎样？', en: 'What happens to a transparent background?' },
        a: {
          zh: '变成白色。PDF 页面没有透明通道，编码前画布会先铺白底；半透明像素与白色混合。',
          en: 'It becomes white. A PDF page has no alpha channel, so the canvas is filled white before encoding and semi-transparent pixels blend with it.',
        },
      },
    ],
  },
  {
    slug: 'html-to-txt',
    from: 'html',
    to: 'txt',
    shot: 'preview-edit',
    published: '2026-10-20',
    title: {
      zh: 'HTML 转纯文本——按阅读顺序抽取，不上传',
      en: 'HTML to plain text offline — in reading order',
    },
    desc: {
      zh: '在浏览器里从 HTML 抽取可读文本：块级元素换行，列表保留编号，链接保留 URL，表格单元格用制表符分隔。',
      en: 'Extract readable text from an HTML page in the browser: blocks become line breaks, lists keep their numbers, links keep their URLs.',
    },
    lede: {
      zh: '把一封邮件、一篇文档站页面或一段富文本变成纯文本，难点不是去标签，而是保住阅读顺序。这条路径先用 DOMParser 解析，再递归遍历：`script` / `style` / `noscript` 整块丢弃，`<br>` 转换行，图片按 `alt` 写成 `[Image: …]`，有序列表按位置编号并尊重 `start`，嵌套列表每层缩进两个空格，链接在文字后追加 ` [href]`（页内锚点与 `mailto:` 除外），表格的每个单元格后面跟一个制表符，而单元格之间的换行也会照抄进文本：紧凑排版的表格是一行一条记录，源码里换行排版的表格会一格一行。最后把三个以上连续换行压成两个。',
      en: 'Turning an email, a docs page or a rich-text fragment into plain text is less about deleting tags than about preserving reading order. This route parses with DOMParser and walks the tree: `script` / `style` / `noscript` are dropped wholesale, `<br>` becomes a newline, images become `[Image: …]` from their `alt`, ordered lists are numbered by position and honour `start`, nested lists indent two spaces per level, links append ` [href]` after their text (in-page anchors and `mailto:` excluded), and each table cell is followed by a tab — newlines between cells in the source are copied into the text too, so a compact table gives one record per line while a source-formatted one gives one cell per line. Runs of three or more newlines collapse to two at the end.',
    },
    keeps: {
      zh: [
        '有序列表按实际位置编号，并尊重 `start`；嵌套层级用两空格缩进表示（最多 6 层）',
        '链接保留 URL，写在链接文字之后；`#` 锚点与 `mailto:` 不追加',
        '图片用 `alt` 写成 `[Image: alt]`，没有 alt 时写 `[Image]`',
        '每个单元格后面都跟一个制表符；单元格之间没有换行的表格（例如本扩展自己生成的 HTML 表格）会一行一条记录，而源码里换行排版的表格（marked、美化过的 HTML）会让每格各占一行',
        '复杂 HTML 的解析交给 DOMParser，实体、嵌套与畸形标记都不会让文本错位',
      ],
      en: [
        'Ordered lists are numbered by position and honour `start`; nesting is shown with two spaces per level, capped at six',
        'Links keep their URL after the link text; `#` anchors and `mailto:` are not appended',
        'Images become `[Image: alt]` from their alt text, or `[Image]` when there is none',
        'Every cell is followed by a tab; a table whose cells are not separated by newlines in the source (the HTML this extension itself writes) comes out one record per line, while a source-formatted table (marked, pretty-printed HTML) yields one cell per line',
        'DOMParser handles the HTML, so entities, nesting and malformed markup do not shift the text',
      ],
    },
    limits: {
      zh: [
        '不执行 CSS：`display:none` 或隐藏区域里的文字仍会被抽取，判断“可见”不是这一层的职责',
        '表格只做制表符分隔，不做列对齐；合并单元格、列宽与表头语义都不会保留',
        '列表只处理有序与无序两种：`type`（字母 / 罗马数字）与 `reversed` 被忽略，编号一律用十进制位置表示',
        '版式、颜色、字号与图片像素全部丢失，产物是纯文本',
        '脚本动态生成的内容不在 HTML 里，也就不会被抽出来',
      ],
      en: [
        'CSS is not executed: text inside `display:none` or hidden regions is still extracted, because deciding what is visible is not this layer’s job',
        'Tables get tabs, not alignment; merged cells, column widths and header semantics are not preserved',
        'Only ordered and unordered lists are handled: `type` (letters, roman numerals) and `reversed` are ignored, and numbering is always decimal position',
        'Layout, colour, font size and image pixels are all gone — the result is plain text',
        'Content generated by scripts is not in the HTML, so it cannot be extracted',
      ],
    },
    notes: {
      zh: [
        '适合做全文检索、给命令行工具喂输入，或把网页正文贴进邮件与工单',
        '同一份 HTML 还能转 Markdown（保留结构）或 Word（保留可编辑段落）；纯文本这条只保留阅读顺序',
      ],
      en: [
        'Good for full-text search, feeding a command-line tool, or pasting a page’s body into an email or a ticket',
        'The same HTML can go to Markdown (structure kept) or Word (editable paragraphs); the plain-text route keeps only reading order',
      ],
    },
    faq: [
      {
        q: { zh: '列表编号为什么还在？', en: 'Why are the list numbers still there?' },
        a: {
          zh: '编号不是文本节点，而是由 `<li>` 的位置生成的。这条路径按位置补上 `1.`、`2.`，并尊重 `<ol start>`；不补的话，一份编号步骤会变成一串没有顺序的句子。',
          en: 'The numbers are not text nodes; they are generated from each `<li>`’s position. This route writes `1.`, `2.` from that position and honours `<ol start>`; without it, a numbered procedure would become a run of sentences with no order.',
        },
      },
      {
        q: { zh: '隐藏的文字也会被抽出来吗？', en: 'Is hidden text extracted too?' },
        a: {
          zh: '会。这一层只按标签结构走，不读 CSS，也不判断元素是否被 `display:none` 隐藏；它回答的是“HTML 里写了什么”，不是“浏览器里看见什么”。',
          en: 'Yes. This layer walks the tag structure without reading CSS or checking `display:none`; it answers “what the HTML says”, not “what the browser shows”.',
        },
      },
      {
        q: { zh: '图片为什么变成 [Image]？', en: 'Why do images become [Image]?' },
        a: {
          zh: '纯文本存不下图片。有 `alt` 时写成 `[Image: alt]`，没有时写 `[Image]`；这是提醒读者原位置有一张图，而不是把图片内容转成文字。',
          en: 'Plain text cannot hold an image. With alt text it becomes `[Image: alt]`, without it `[Image]`; the marker tells the reader an image sits there, rather than transcribing its content.',
        },
      },
    ],
  },
  {
    slug: 'xlsx-to-html',
    from: 'xlsx',
    to: 'html',
    shot: 'batch-files',
    published: '2026-10-20',
    title: {
      zh: 'Excel 转 HTML——每个工作表一张表，本地生成',
      en: 'Excel to HTML offline — one table per sheet',
    },
    desc: {
      zh: '在浏览器里把 .xlsx 变成独立 HTML：每个工作表一张表并带表名标题，日期落成文本，产物不含脚本。',
      en: 'Turn .xlsx into a standalone HTML page in your browser: one table per sheet with a heading, dates as text, and no scripts in the output.',
    },
    lede: {
      zh: '需要把表格贴进内网、邮件或静态站点时，Excel 的公式与样式反而成了负担。这条路径用 SheetJS 读工作簿（`cellDates` 标记日期、统一 `dateNF` 决定渲染格式），把每个工作表转成一张 HTML 表：多张表时每张前加 `<h2>工作表名</h2>`，只保留表格片段，再整体过一遍 DOMPurify，最后包成带字符集与标题的完整文档。产物是单个 .html，所有工作表都在里面，没有脚本、没有外部依赖。',
      en: 'When a table has to go into an intranet page, an email or a static site, Excel’s formulas and styling become baggage. This route reads the workbook with SheetJS (`cellDates` flags dates and one `dateNF` decides how they render), turns each sheet into an HTML table, puts an `<h2>` with the sheet name in front of each when there is more than one, keeps only table fragments, sanitizes the whole thing with DOMPurify and wraps it into a full document with a charset and title. The result is one .html with every sheet inside, no scripts and no external dependencies.',
    },
    keeps: {
      zh: [
        '每个工作表都导出，多表时用 `<h2>` 标出表名，不会只给你第一张',
        '单元格值按显示文本落地：日期由统一格式渲染成文本，不做本地化猜测',
        '公式单元格取工作簿里缓存的计算结果，HTML 里不写公式本身',
        '产物是一个独立完整的 .html（声明字符集与标题），双击即可离线打开',
        '一批最多 200 个文件、单个 100 MB',
      ],
      en: [
        'Every sheet is exported, with an `<h2>` naming each one when there are several — never just the first',
        'Cell values land as displayed text: dates are rendered through one fixed format rather than a locale guess',
        'Formula cells carry the cached result stored in the workbook; the formula itself is not written into the HTML',
        'The output is one complete .html with a charset and title that opens offline on a double-click',
        'Up to 200 files per batch at 100 MB each',
      ],
    },
    limits: {
      zh: [
        '不带 Excel 的视觉样式：字体、填充色、边框、行高列宽、条件格式与冻结窗格都不会出现',
        '工作簿里的图片、图表与批注不进入 HTML——表格序列化只处理单元格',
        '多工作表一定合并进同一个 HTML；要“一表一文件”请走 Excel → CSV（多表会打成 ZIP）',
        '不给 Excel 回读：HTML 是单向出口，要回到表格请用 CSV → Excel',
      ],
      en: [
        'Excel’s visual styling does not come along: fonts, fills, borders, row heights and column widths, conditional formatting and frozen panes are absent',
        'Images, charts and comments inside the workbook do not enter the HTML — the table serializer handles cells',
        'Multiple sheets always share one HTML; for one file per sheet, use Excel → CSV, which packs them into a ZIP',
        'Excel cannot read it back: HTML is a one-way exit, so return to a spreadsheet through CSV → Excel',
      ],
    },
    notes: {
      zh: [
        '适合把报表、名单与导出数据发布成可离线打开的静态页',
        '要保留单元格里的原始值给下游程序，CSV 或 JSON 更合适；这条路径面向“给人看”',
        '同一份 .xlsx 还能转 PDF（整页渲染、无文字层）或 CSV',
      ],
      en: [
        'Good for publishing a report, a roster or an export as a static page that opens offline',
        'For raw cell values feeding another program, CSV or JSON fits better; this route is aimed at people reading',
        'The same .xlsx can go to PDF (whole-page rendering, no text layer) or CSV',
      ],
    },
    faq: [
      {
        q: { zh: '日期为什么变成了文本？', en: 'Why did dates become text?' },
        a: {
          zh: 'Excel 的日期本质是一个带格式的数字。这条路径在解析时把日期单元格标记出来，再按统一格式渲染成文本，避免出现 45296 这样的序列号；代价是失去了 Excel 里的区域化显示。',
          en: 'An Excel date is a number with a format. This route flags date cells while parsing and renders them through one fixed format, so a serial like 45296 does not leak through; the cost is Excel’s locale-specific display.',
        },
      },
      {
        q: { zh: '多个工作表会分开下载吗？', en: 'Are multiple sheets downloaded separately?' },
        a: {
          zh: '不会。它们按顺序进入同一个 HTML，每张前面有 `<h2>` 表名；想一表一个文件，请用 Excel → CSV，那条会把多表打包成 ZIP。',
          en: 'No. They enter one HTML in order, each preceded by an `<h2>` with its name; for one file per sheet, use Excel → CSV, which packs them into a ZIP.',
        },
      },
      {
        q: { zh: '样式和图表去哪了？', en: 'Where did the styling and charts go?' },
        a: {
          zh: '都没有进入产物。表格序列化只输出单元格文本与表格结构，Excel 的字体、颜色、条件格式、图片与图表不在其中；这是“变成网页表格”而不是“把 Excel 截图成网页”。',
          en: 'Neither made it into the result. The table serializer writes cell text and table structure only; Excel’s fonts, colours, conditional formatting, images and charts are not part of it. This turns the workbook into a web table, not into a screenshot of Excel.',
        },
      },
    ],
  },
  {
    slug: 'png-to-html',
    from: 'png',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'PNG 转 HTML——原始字节内嵌，透明与像素不丢',
      en: 'PNG to HTML offline — the original bytes, embedded',
    },
    desc: {
      zh: '把 .png 包成单图 HTML：原始字节以 data URI 内嵌，不重编码，透明与像素原样保留，文件可离线打开。',
      en: 'Wrap a .png in a one-image HTML page with its original bytes as a data URI: no re-encode, transparency intact, and it opens anywhere.',
    },
    lede: {
      zh: '需要把一张图交给“只收网页”的地方——内网文章、单文件归档、图文一起存的笔记——最稳的做法是不碰像素。这条路径用 FileReader 把上传的 PNG 字节直接读成 data URI，写进一个 `<img src>`：没有 canvas、没有重编码，透明通道与原始像素一个字节都不变。`alt` 与 `title` 取源文件名的主干（去扩展名，做 HTML 转义），页面自带居中版式与 `max-width: 100%`，窄屏上按比例缩显，但内嵌的仍是原始分辨率。',
      en: 'When an image has to go somewhere that only accepts a web page — an intranet article, a single-file archive, a note that keeps its picture beside its text — the safest move is not to touch the pixels. This route reads the uploaded PNG’s bytes into a data URI with FileReader and writes them into one `<img src>`: no canvas, no re-encode, with alpha and every original pixel unchanged. `alt` and `title` come from the source file name with its extension dropped (HTML-escaped), and the page centres the image with `max-width: 100%`, so it scales down on narrow screens while the embedded data keeps its full resolution.',
    },
    keeps: {
      zh: [
        '原始字节：不做解码与重编码，透明、像素与 PNG 自带的元数据都在',
        '`alt` / `title` 取源文件名的主干（去扩展名）并做转义，读屏与悬停都有说明',
        '单文件自包含：图片以 data URI 内嵌，没有外部引用，断网也能打开',
        '页面在窄屏上按比例缩显，不改变内嵌的分辨率',
        '一批最多 200 个文件、单个 100 MB',
      ],
      en: [
        'The original bytes: no decode or re-encode, so alpha, pixels and the PNG’s own metadata all remain',
        '`alt` and `title` come from the source file name, extension dropped, and are escaped, giving both screen readers and hover a label',
        'Self-contained in one file: the image is a data URI, with no external reference, and opens offline',
        'The page scales the image down on narrow screens without changing the embedded resolution',
        'Up to 200 files per batch at 100 MB each',
      ],
    },
    limits: {
      zh: [
        '体积会变大：base64 让图片部分约为原字节的 4/3，再加一层 HTML 包装；这是“单文件自包含”的代价',
        '没有重编码也就没有优化：无法借这次转换降分辨率、换格式或压体积；需要那些请走 PNG → JPEG / WebP',
        '`alt` 只有文件名，不是对画面内容的描述；要让读屏用户知道图里是什么，请下载后自行改写',
        '邮件里不保显示：网页端邮件客户端（Gmail 便是）会剥掉 `data:` 图片，能不能显示由收件端决定——要进邮件正文请用外链图片或邮件自己的附件',
        'PNG 之外的源（JPEG / WebP / BMP / GIF）走同一条包装路径，但这一页只描述 PNG 的行为',
      ],
      en: [
        'The file grows: base64 makes the image portion about 4/3 of the original bytes, plus the HTML wrapper — the cost of a self-contained file',
        'No re-encode means no optimisation: this route cannot downscale, change format or shrink the file; use PNG → JPEG or WebP for that',
        '`alt` is only the file name, not a description of the picture; rewrite it afterwards if screen-reader users need to know what is shown',
        'No guarantee in email: webmail clients — Gmail among them — strip `data:` images and the recipient decides, so use an external picture or the mail attachment itself',
        'Sources other than PNG (JPEG, WebP, BMP, GIF) take the same wrapping path, but this page describes the PNG behaviour only',
      ],
    },
    notes: {
      zh: [
        '适合单文件交付、离线归档，以及把图塞进不允许外链的富文本编辑器',
        '需要更小的体积或 JPEG / WebP 格式，请走图片转换；需要可搜索文字，得从有文字层的源出发',
      ],
      en: [
        'Good for single-file delivery, offline archiving and rich-text editors that refuse external links',
        'For a smaller file or JPEG / WebP, take an image conversion; for searchable text, start from a source with a text layer',
      ],
    },
    faq: [
      {
        q: { zh: '图片会被压缩吗？', en: 'Is the image compressed?' },
        a: {
          zh: '不会。这条路径直接内嵌原始字节，不经过 canvas；体积变大是因为 base64 编码约 4/3 的膨胀与 HTML 包装，不是因为重新压缩。',
          en: 'No. This route embeds the original bytes without touching a canvas; the larger file comes from base64’s roughly 4/3 expansion plus the HTML wrapper, not from re-compression.',
        },
      },
      {
        q: { zh: '透明背景还在吗？', en: 'Is the transparent background still there?' },
        a: {
          zh: '在。没有解码再编码这一步，alpha 通道与原始 PNG 完全一致；页面样式也不会给它加底色。',
          en: 'Yes. There is no decode-then-encode step, so the alpha channel matches the original PNG exactly, and the page styling adds no background colour.',
        },
      },
      {
        q: { zh: '能把原图从 HTML 里取回来吗？', en: 'Can the original image be recovered from the HTML?' },
        a: {
          zh: '能。`<img src>` 里的 data URI 就是原始 PNG 字节的 base64；把它解码出来与上传的文件逐字节相同。',
          en: 'Yes. The data URI in `<img src>` is the base64 of the original PNG bytes; decoding it yields a file byte-identical to the one uploaded.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-pdf',
    from: 'csv',
    to: 'pdf',
    shot: 'batch-files',
    published: '2026-10-20',
    title: {
      zh: 'CSV 转 PDF（.pdf）——表格铺成 A4，本地完成',
      en: 'CSV to PDF (.pdf) offline — your table on A4 pages',
    },
    desc: {
      zh: '在浏览器里把 .csv 排成 PDF 表格：先解析成 HTML 表格，再按 A4 切成多页。数字与日期按单元格原样呈现，全程不上传。',
      en: 'Turn a .csv into a PDF in your browser: parsed into an HTML table, then sliced into A4 pages. A rendered image, with no text layer and no upload.',
    },
    lede: {
      zh: '导出的 CSV 往往是「给人看的表」，而收的人只想要一个能直接打印、排版不会跑的文件。这条链路是 CSV → HTML → PDF：先用 SheetJS 把每一行读成表格，再把整张表格渲染成 A4 并切成若干页。它解决的是分发环节的问题——不是把 CSV 变成可再编辑的数据（那一步是 CSV 转 Excel），而是让它长得像一份正式表格。全程在标签页里完成，没有服务器、没有排队。',
      en: 'A CSV you exported is a table for the eye, but the person you send it to often wants something printable whose layout will not move. This route is CSV → HTML → PDF: SheetJS reads each row into a table, the table is rendered, and the result is cut into A4 pages. It answers the delivery problem, not the re-editing one (that is CSV to Excel) — and every step happens in the tab, with no server and no queue.',
    },
    keeps: {
      zh: [
        '每一行都写成表格里的一行，第一行也在内——不像 CSV 转 JSON 会拿首行当键名；列序与文件里一致',
        '按原文读取：单元格里那串字符就是最终呈现，不会被类型推断改写成 `1/5/24` 或一串序列号',
        '编码不是前提：输入按 UTF-8 → GB18030 → GBK 依次尝试解码，老编辑器导出的 GBK 文件也读得进来',
        '整张表先在 800 px 宽的版面上排好，再按 A4 的宽高比切成若干页，长表往下翻页而不是被裁掉',
      ],
      en: [
        'Every row becomes a table row, the first one included — unlike CSV to JSON, which spends row one on key names; columns stay in file order',
        'The file’s own characters are what gets printed: the CSV is read raw, so type inference cannot rewrite values into `1/5/24` or a serial number',
        'The encoding is not a precondition: input is decoded UTF-8 → GB18030 → GBK, so a GBK file saved by an older editor still reads',
        'The table is laid out once on an 800 px surface, then cut into pages at the A4 aspect ratio, so a long table continues onto the next page',
      ],
    },
    limits: {
      zh: [
        '产出的 PDF 是渲染出来的图像，没有文字层：文字不能选中、搜索不到，也过不了 OCR 之外的提取工具',
        '样式不跟过来——字体、列宽、单元格颜色由渲染时的默认版式决定，CSV 里也没有这些信息可给',
        '版面宽度固定在 800 px，不随列数变宽：比这更宽的表，靠右侧的那几列进不了画面，列多时先转 Excel',
        '分页按固定高度切，不保证把一行整个留在同一页——跨页的那一行会上下各留一半',
        '四字节 emoji 与生僻字取决于系统字体是否装了那一枚字形；缺字形时渲染成方框是浏览器的行为，不是转换出错',
      ],
      en: [
        'The PDF is a rendered image with no text layer: text cannot be selected or searched, and extraction tools will not find it either',
        'Styling does not follow — fonts, column widths and cell colours come from the default layout at render time, and a .csv has none to give',
        'The surface stays 800 px wide no matter how many columns there are: the right-hand columns of a wider table never reach the picture, so take Excel for that case',
        'Pages are cut at a fixed height, so a row can straddle the break and end up split between two pages',
        'Emoji and rare glyphs depend on whether a font covering that code point is installed; a tofu box is the browser’s doing, not a conversion error',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .csv 一起转会逐个产出各自的 .pdf，想一次拿走就打成一个 ZIP',
        '文件多于五个或总量超过 20 MB 时，只要偏好里的大批次确认还开着（默认开着），工作台会先要一次确认',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .csv files yield one .pdf each, and the whole set can be taken as a single ZIP',
        'Batches over five files or 20 MB ask for one confirmation first, as long as the large-batch confirmation is still on in preferences — it is by default',
      ],
    },
    faq: [
      {
        q: { zh: '转出来的 PDF 能选中文字吗？', en: 'Can I select the text in the resulting PDF?' },
        a: {
          zh: '不能。这条链路把表格渲染成图像再铺到 A4 页上，所以没有文字层——这是它能锁住版式的代价。要一份能选中、可搜索的 PDF，目前这条路给不了；要的是能再编辑的数据，走 CSV 转 Excel。',
          en: 'No. The route renders the table to an image and lays that on A4 pages, so there is no text layer — the price of pinning the layout. If you need selectable, searchable text this route cannot give it; if you need data you can keep editing, take the CSV to Excel route.',
        },
      },
      {
        q: {
          zh: '逗号在字段里、带引号的多行单元格，能正确切开吗？',
          en: 'Do quoted commas and multi-line cells parse correctly?',
        },
        a: {
          zh: '能。分隔与引号交给 SheetJS 的 CSV 解析，不靠字符串按逗号 split，所以带引号的逗号、字段内换行都按一个单元格处理。解码那一步另有闸门：四种编码都读不出文本时宁可报错，也不会交出一份乱码。',
          en: 'Yes. Splitting is SheetJS’s CSV parser, not a string split on commas, so quoted commas and a newline inside a field stay one cell. The decoding step has its own gate: if none of the encodings yields text, it errors instead of handing you mojibake.',
        },
      },
      {
        q: {
          zh: '表格是客户名单，文件会离开本机吗？',
          en: 'If the table is a customer list, does the file leave my machine?',
        },
        a: {
          zh: '不会。扩展只申请 storage 权限、没有 host 权限，产物里也没有从网络取来的代码；读文件、解析、渲染、写 PDF 全在标签页内完成。',
          en: 'No. The extension asks for the storage permission only, has no host permissions and ships no remotely hosted code; reading, parsing, rendering and writing the PDF all happen inside the tab.',
        },
      },
    ],
  },
  {
    slug: 'excel-to-word',
    from: 'xlsx',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'Excel 转 Word（.xlsx → .docx）——每张表进文档，本地不上传',
      en: 'Excel to Word (.xlsx → .docx) offline, one table per sheet',
    },
    desc: {
      zh: '在工作台里把 .xlsx 转成 .docx：每个工作表写成一张 Word 表格，多表时带上表名标题。值保真、可编辑，全程离线。',
      en: 'Each worksheet becomes an editable Word table, named when there is more than one. Values are kept; styling is not. Offline, in your browser.',
    },
    lede: {
      zh: '把一张表从 Excel 搬进 Word，常见做法是复制粘贴然后手工对齐列宽，或者截一张图贴进去——前者费时，后者不可编辑。这条链路是 Excel → HTML → Word：读工作簿时把每张表写成 HTML 表格，再作为 altChunk 打进 .docx，Word 打开文件时按这份表格渲染——单元格可以改、可以排序、可以加批注，不是贴进去的一张截图。多个工作表会各自成表，并在前面带一行表名，不用你回去核对它是哪一张。',
      en: 'Moving a sheet from Excel into Word usually means paste-and-re-fit the columns, or paste a screenshot that nobody can edit. This route is Excel → HTML → Word: each worksheet is written out as an HTML table and packed into the .docx as an altChunk, which Word renders when the file opens — cells can be edited, sorted and commented, and nothing is a pasted picture. Several sheets each keep their own table, preceded by a line naming it, so nothing has to be checked back against the workbook.',
    },
    keeps: {
      zh: [
        '每个工作表一张 Word 表格；工作簿有多张表时，每张表前有一行以表名为内容的标题',
        '单元格里的值按读到的样子呈现，日期单元格先按工作簿自己的格式归一，再渲染，避免 `1/5/24` 这种跨地区会读错的写法',
        '合并单元格写成 HTML 的 colspan / rowspan，不是摊平成一片普通格子；行列顺序按原表',
        '每一行都照常写出一行，第一行不会被当作表头吃掉（这一点与 CSV 转 JSON 不同，那里首行变成了键名）',
      ],
      en: [
        'One Word table per worksheet; in a multi-sheet workbook each table is introduced by a heading carrying the sheet name',
        'Cell values render as read, with date cells normalised from the workbook’s own format first so `1/5/24`-style ambiguity does not survive the trip',
        'Merged cells go out as HTML colspan / rowspan rather than flattening into ordinary cells, and rows and columns keep the sheet’s order',
        'Every row is written as a row, the first included — unlike CSV to JSON, where row one is spent on key names',
      ],
    },
    limits: {
      zh: [
        '只带表格正文：图表、条件格式、单元格底色与字体、列宽都不在产物里（HTML 那一步只保留表格本身）',
        '公式不会跟过来——读的是算完之后的值；要保公式就得继续在 Excel 格式之间转（例如 Excel 转 CSV 会明确把公式落成值）',
        '正文是装进 .docx 的 altChunk、由 Word 打开时渲染的，所以产物依赖 Word 对 altChunk 的支持；不处理它的阅读器可能显示不出正文，交付前请在目标环境打开确认',
        '表名只是正文里的一行标题，不会变成 Word 的章节导航',
        '工作表名恰好是 `toString`、`constructor` 这类原型上的名字时，读取按不继承原型的自有属性处理，不会因为「看着像有表」就把空表当成有内容',
      ],
      en: [
        'Only the table body travels: charts, conditional formatting, cell fills, fonts and column widths are not in the output — the HTML step keeps tables and nothing else',
        'Formulas do not follow: what is read is the computed value. Stay inside spreadsheet formats if formulas must survive (and note that Excel to CSV writes values on purpose)',
        'The body rides inside the .docx as an altChunk that Word renders when it opens the file, so the result depends on Word supporting altChunk; a reader that does not may show no body text, so open it in the target environment before delivery',
        'A sheet name is one heading in the body, not an entry in Word’s navigation',
        'A sheet named `toString` or `constructor` is read through own properties rather than the prototype chain, so a lookalike name cannot make an empty sheet appear to hold content',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多 sheet 的工作簿转成 CSV 时给的是 ZIP（一张表一个文件），转成 Word 时是同一份文档里的多张表——两条路的产出形状不同，按用途挑',
        '同一个工作簿转成 JSON 是**一份**文件，多张表按表名分组写在里面；要「一张表一个文件」就走 CSV 那条',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; a multi-sheet workbook goes to CSV as a ZIP (one file per sheet) but to Word as several tables inside one document — pick by what the receiver needs',
        'The same workbook converted to JSON stays **one** file, with sheets grouped under their names, so if the downstream system wants one file per sheet, CSV is the route',
      ],
    },
    faq: [
      {
        q: { zh: '转出来的 Word 表格能编辑吗？', en: 'Is the resulting Word table editable?' },
        a: {
          zh: '能。Word 打开文件时把内嵌的那份表格渲染出来，之后单元格可以改、可以插删行、可以排序、可以加批注。前提是它的 altChunk 处理正常——个别阅读器不处理这一层，那种情况下正文会显示不出来，交付前先在目标环境打开看一眼。要的是「看起来一样但不用改」的交付物，那就走 Excel 转 PDF——但那份 PDF 是渲染出来的图像，没有文字层。',
          en: 'Yes. Word renders the embedded table when it opens the file, after which cells can be edited, rows inserted or deleted, sorted and commented — provided its altChunk handling works, and a reader that ignores altChunk shows no body at all, so open it in the target environment before delivery. If you only need something that looks right and will not be edited, that is the Excel to PDF route instead, whose PDF is a rendered image with no text layer.',
        },
      },
      {
        q: { zh: '为什么列宽和颜色都没了？', en: 'Why did the column widths and colours disappear?' },
        a: {
          zh: '这条链路经手的是 HTML 表格，而它只承载表格的内容与结构；列宽、字体、底色这些属于 Excel 的呈现层，不会由 HTML 那一步带过去，到了 Word 里就由文档主题决定。要留住版式，用 PDF 那条；要在 Word 里重排，转完之后套 Word 的表格样式比还原原件更省事。',
          en: 'The route passes through an HTML table, and that carries content and structure only. Widths, fonts and fills belong to Excel’s presentation layer, are not transported by the HTML step, and in Word come out of the document theme. Keep the layout on the PDF route; if the table is going to be re-styled in Word anyway, applying a Word table style after conversion beats trying to restore the original.',
        },
      },
      {
        q: {
          zh: '工资表要转成 Word，数据会外发吗？',
          en: 'If I turn a payroll sheet into Word, does the data leave my machine?',
        },
        a: {
          zh: '不会。整条链路是浏览器里的 JavaScript：读工作簿、生成表格、打包 .docx 都在扩展的标签页内完成，没有网络请求、没有服务端，也没有外部进程。',
          en: 'No. The whole route is JavaScript in the browser — reading the workbook, building the table and packing the .docx happen inside the extension’s tab: no request, no server, no external process.',
        },
      },
    ],
  },
  {
    slug: 'pdf-to-markdown',
    from: 'pdf',
    to: 'md',
    shot: 'preview-edit',
    published: '2026-10-20',
    title: {
      zh: 'PDF 转 Markdown——抽文字、留链接，离线完成',
      en: 'PDF to Markdown offline — text out, links kept',
    },
    desc: {
      zh: '在浏览器里把 .pdf 的文字读出来写成 Markdown：文本项按位置归行，书签命中的行成为标题，链接注释还原成真链接。不 OCR、不上传。',
      en: 'Extract a PDF’s text into Markdown in your browser, with link annotations restored as links. No OCR, no layout kept, nothing uploaded.',
    },
    lede: {
      zh: '要把一份 PDF 里的内容接着写进 README、笔记或工单，需要的是文字，而不是一张图片。这条链路是 PDF → HTML → Markdown：pdf.js 读出页面上的文本项、按位置把它们归成行，链接注释按协议白名单还原，最后由 Turndown 写成 Markdown。因此它对「能选中文字的 PDF」效果最好；扫描出来的图片型 PDF 里并没有文字可抽，那种文件需要的是 OCR，而不是转换。',
      en: 'Getting content out of a PDF and into a README, a note or a ticket needs text, not a picture. This route is PDF → HTML → Markdown: pdf.js reads the text items on each page and assembles them into lines by position, link annotations come back as links behind a scheme allowlist, and Turndown writes the Markdown. That makes it good for PDFs whose text you can already select — a scanned PDF holds no text to extract, and what that needs is OCR, not conversion.',
    },
    keeps: {
      zh: [
        '文字逐个文本项读出，按 y 坐标归成行、按 x 间距补空格——不靠把整页拍成图片再认字',
        '文档自带书签时，书签标题命中的那几行写成对应层级的标题（最深取到第六层）；没有书签时，短而整行大写的行会被认成二级标题',
        'PDF 里的链接注释还原成 Markdown 链接；协议不在白名单内的宁可不还原，也不留一个点开就跳走的地址',
        '表格如果本身是以文字排出来的，会作为文本行带过来',
        '产出是纯文本的 .md，可以直接进版本库、贴进笔记或聊天窗口',
      ],
      en: [
        'Text is read item by item and assembled into lines by their vertical position, with spaces filled in from the horizontal gaps — no page image is recognised first',
        'Where the document carries bookmarks, the lines whose title matches one become headings at that depth (down to six levels); with no outline, a short line that is entirely capitals becomes an h2',
        'Link annotations become Markdown links, and only for schemes on the allowlist — a link that would jump somewhere unexpected is left out rather than carried through',
        'A table that is genuinely made of text comes across as text lines',
        'The output is plain-text .md, so it can go straight into a repository, a note or a chat window',
      ],
    },
    limits: {
      zh: [
        '不做 OCR：图片型 PDF（扫描、拍照、打印成图片的）读不出文字，产出会接近空而不报错——这是「按内容形状办事」的取舍，不是失败',
        '行的先后取 pdf.js 给出的顺序，不做全局排序：多栏或文字绕排时，位置相近的行会按读出顺序串起来，所以这类文件需要人工归位',
        '标题层级只在书签或整行大写这两种形状下出现，多数 PDF 的正文全部落成普通段落；字号、颜色与分栏宽度不带过来',
        '页面上的图与矢量图形不进 Markdown（这条链路只走文字，也正因为如此它比整页栅格化快得多）',
        '页与页之间写成一条 Markdown 分隔线（`* * *`），页码若印在页面上则作为普通文本行留在原处；脚注没有对应物',
      ],
      en: [
        'No OCR: an image-only PDF (scanned, photographed, printed to a bitmap) has no text to read, so the result comes out close to empty without an error — a shape-of-content trade-off, not a failure',
        'Row order is the order pdf.js hands back, with no global sort: on multi-column or wrapped text, nearby lines string together in read order, so those files need tidying by hand',
        'Heading levels appear only from bookmarks or an all-caps line; most PDFs come out as plain paragraphs, and type sizes, colours and column widths do not survive',
        'Images and vector artwork on the page do not enter the Markdown — this route is text-only, which is also why it is far cheaper than rasterising the page',
        'Pages are separated by a Markdown rule (`* * *`), a printed page number stays behind as an ordinary text line, and footnotes have no counterpart',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；一条链路最多读 1000 页，超过会直接报错并说明要把文件拆开，而不是半途而废',
        '多个 PDF 一起转会逐个产出各自的 .md，想一次拿走就打成一个 ZIP',
        '要的是「长得跟原件一样」而不是文字，那一条路是 PDF 转图片；想把 PDF 变成能改的文档，走 PDF 转 Word',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; one conversion reads at most 1000 pages and asks you to split the file beyond that rather than stopping halfway',
        'Several PDFs yield one .md each, and the set can be taken as a single ZIP',
        'If the goal is that it looks like the original, that is the PDF to image route; if it is a document you can keep editing, take PDF to Word',
      ],
    },
    faq: [
      {
        q: { zh: '扫描件能转成 Markdown 吗？', en: 'Can a scanned document become Markdown?' },
        a: {
          zh: '不能。扫描件每一页是一张图片，里面没有可读的文字项，所以产出接近空白。要先把图片识别成文字（OCR），而这件事本扩展刻意不做——它不联网、也不带模型，与其给一份不可靠的结果，不如让你知道这条路到不了。',
          en: 'No. A scan is one image per page with no text items to read, so the result comes out nearly empty. Getting text out of it means OCR, which this extension deliberately does not do: it has no network and ships no model, and an unreliable transcript is worse than a route that says where it stops.',
        },
      },
      {
        q: { zh: '为什么段落顺序乱了？', en: 'Why is the paragraph order wrong?' },
        a: {
          zh: '最常见的原因是原件用了多栏或文字绕排：这一步只按 y 坐标把文本项归成行，行的先后仍是 pdf.js 读出来的顺序，不做全局排序，所以「先左栏后右栏」这种阅读顺序推不出来。这种文件转出来后建议当作素材用——人工归位比再造一个排版引擎轻。',
          en: 'The usual cause is multiple columns or text that wraps around an object: lines are assembled from the vertical position of each item, but their order is the one pdf.js read out, with no global sort — so «left column first, then right» is not something this step can infer. Treat the output as raw material for such files; tidying it by hand is lighter than shipping a layout engine.',
        },
      },
      {
        q: {
          zh: '合同的 PDF 转成 Markdown，内容会被上传吗？',
          en: 'If I turn a contract PDF into Markdown, is it uploaded?',
        },
        a: {
          zh: '不会。读 PDF 的 pdf.js、写 Markdown 的转换器都在扩展页面里跑，manifest 只有 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的死路径；除了用户自己拖进来的文件，没有别的数据来源。',
          en: 'No. pdf.js and the Markdown writer both run inside the extension page; the manifest carries the storage permission and no host permissions, and the bundle ships no path that executes remotely hosted code. Apart from the files you drop in, there is no other source of data.',
        },
      },
    ],
  },
  {
    slug: 'svg-to-pdf',
    from: 'svg',
    to: 'pdf',
    shot: 'batch-files',
    published: '2026-10-20',
    title: {
      zh: 'SVG 转 PDF——先栅格化再铺页，本地离线',
      en: 'SVG to PDF offline — rasterised, then laid on a page',
    },
    desc: {
      zh: '在浏览器里把 .svg 转成 .pdf：SVG 先归一化并栅格化成 PNG，再按像素尺寸铺成一页。不联网、不上传，脚本内容先剥除。',
      en: 'The SVG is normalised, stripped of active content and rasterised to a bitmap page sized to its pixels. No vector, no text layer.',
    },
    lede: {
      zh: '图标、示意图、图表常常以 SVG 存着，而要交出去的地方要的是 PDF。这条链路是 SVG → PNG → PDF：先把 viewBox 归一、把活动性内容剥掉，再栅格化成位图，最后按像素尺寸铺成一页 A4 之外的「图即页面」。要知道它的取舍：产出里没有矢量，PDF 放大后是像素，文字不再是可编辑的文本——它适合「把这张图交出去」，不适合「交一份能改的图」。',
      en: 'Icons, diagrams and charts live as SVG, while the thing asking for them wants a PDF. This route is SVG → PNG → PDF: the viewBox is normalised, active content is stripped, the result is rasterised to a bitmap, and that bitmap is laid on a page sized to its pixels. Know the trade-off: nothing in the PDF is vector, zooming shows pixels, and text is not editable text. It answers «send this picture over», not «send a drawing I can still edit».',
    },
    keeps: {
      zh: [
        '看得见的形状与颜色：栅格化在浏览器自己的 SVG 渲染上完成，包括渐变、描边与滤镜的可见结果',
        '页面尺寸跟着图片像素走（96 dpi 换算成 pt），横长的图自动用横向页，不会把一张窄图塞进固定栏宽再留出大片空白',
        '尺寸取 `width`/`height` 或 `viewBox`；两者都没写时按 1024×1024 兜底，而不是在栅格化那一步失败',
      ],
      en: [
        'The shapes and colours you can see: rasterisation uses the browser’s own SVG rendering, so gradients, strokes and filter results come across as rendered',
        'The page is sized from the bitmap’s pixels (96 dpi converted to pt) and turns landscape when the image is wide, instead of squeezing a narrow graphic into a fixed column of whitespace',
        'Size comes from `width`/`height` or the `viewBox`; when neither is written, a 1024×1024 square is used rather than failing at the rasterising step',
      ],
    },
    limits: {
      zh: [
        '产物是位图页：没有矢量路径，PDF 里也认不出文字——要能改的图形请继续用 SVG，要矢量 PDF 这条路给不了',
        '栅格化前会剥掉 `<script>` 元素与 `on*` 事件属性，绘制本身又走 `<img>`（浏览器在这个上下文里不执行脚本、也不取外部子资源）。所以靠动画或外部引用才画得出来的那部分，转出来会缺——这是刻意的安全取舍，不是丢件',
        '超大画布会被等比缩到浏览器能安全栅格化的范围内（`fitToMaxDim`）：不报错，但你拿到的像素比 viewBox 声明的要少',
        '字体取决于本机装了什么：原件指定而本机没有的字体会由替代字形渲染，字宽因此可能不同',
      ],
      en: [
        'The page is a bitmap: no vector paths, and no text the PDF can recognise. Keep working in SVG if the artwork must stay editable; a vector PDF is not what this route can give',
        'Before rasterising, `<script>` elements and `on*` handler attributes are removed, and the drawing itself happens in an `<img>` context, where the browser neither runs scripts nor fetches external subresources. Anything an animation or an outside reference was contributing is missing from the result — a deliberate safety trade-off, not a lost asset',
        'An oversized canvas is scaled down proportionally to a size a browser can rasterise safely (`fitToMaxDim`): there is no error, but you get fewer pixels than the viewBox asked for',
        'Fonts depend on what is installed: a typeface the original names but this machine lacks is rendered with a substitute, so metrics can shift',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .svg 一起转会逐个产出各自的 .pdf。「合并为一份 PDF」那个开关对 SVG 批次不出现——SVG 要先经栅格化这一站，合并那条路只收已经是位图的格式',
        '想把一批图并成一份多页 PDF，先把 SVG 转 PNG 再走 PNG 合并；只是想换格式而不是换容器，走 SVG 转 PNG 或 SVG 转 WebP 更省事',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .svg files yield one .pdf each. The merge-into-one-PDF switch does not appear for an SVG batch: merging only accepts formats that are already bitmaps, and SVG has a rasterising stop first',
        'To gather a set into one multi-page document, convert the SVGs to PNG and merge those; if you only need a different picture format, SVG to PNG or SVG to WebP is less work',
      ],
    },
    faq: [
      {
        q: { zh: '转出来的 PDF 能放大不失真吗？', en: 'Does the PDF stay sharp when zoomed?' },
        a: {
          zh: '不能。这条链路先把 SVG 栅格化成位图再铺页，放大看到的是像素。需要可无限放大的 PDF，得由能直接输出矢量 PDF 的工具来做；本扩展全部在浏览器里画，交付的是渲染结果。',
          en: 'No. The route rasterises the SVG first, so zooming shows pixels. Infinitely scalable PDF output needs a tool that writes vector PDF directly; everything here is drawn in the browser and delivers the rendered result.',
        },
      },
      {
        q: { zh: '从别处拿到的 SVG 也敢转吗？', en: 'Is it safe to convert an SVG from somewhere else?' },
        a: {
          zh: '转换前先剥脚本与事件属性，绘制又走 `<img>`——浏览器在这个上下文里不执行 SVG 里的脚本，也不加载它引用的外部东西。所以「来源不明」的 SVG 最坏是画得不一样，而不是执行里面的代码。',
          en: 'Scripts and event attributes are removed before conversion, and the drawing goes through an `<img>` — a context in which the browser runs no SVG script and loads nothing the file references. Worst case for an SVG of unknown origin is that it looks different, not that its code executes.',
        },
      },
      {
        q: {
          zh: '图标要交给外包做印前，文件会外发吗？',
          en: 'If I hand an icon to a print vendor, does the file leave my machine?',
        },
        a: {
          zh: '转换这一步不会。扩展只有 storage 权限、没有 host 权限，读文件、剥脚本、栅格化、写 PDF 都在标签页内完成；把 PDF 发出去那一步是你自己的事。',
          en: 'The conversion does not. The extension holds the storage permission only and no host permissions; reading, stripping, rasterising and writing the PDF all happen in the tab. Sending the PDF on is your own step.',
        },
      },
    ],
  },
  {
    slug: 'word-to-png',
    from: 'docx',
    to: 'png',
    shot: 'preview-edit',
    published: '2026-10-20',
    title: {
      zh: 'Word 转 PNG（.docx → .png）——整页一张图，离线',
      en: 'Word to PNG (.docx → .png) offline, the page as an image',
    },
    desc: {
      zh: '在浏览器里把 .docx 渲染成一张 PNG：先由 mammoth 生成语义化 HTML，再整页画到画布上导出。可指定最长边，全程不上传。',
      en: 'A .docx renders through HTML to one long PNG, sized by the longest edge you set. Pixels, not selectable text; nothing is uploaded.',
    },
    lede: {
      zh: '要贴进聊天窗口、工单或幻灯片的，往往不是「那份 Word」，而是它第一眼的样子。这条链路是 Word → HTML → PNG：mammoth 先把文档变成语义化 HTML（标题、列表、表格、内嵌图片），再把整页画到画布上导出成一张图。它产的是「一页到底」的一张长图，不是每页一张——好处是一眼看完、坏处是版式不会照 Word 的来。',
      en: 'What goes into a chat window, a ticket or a slide is rarely «that Word file» but the first thing it looks like. This route is Word → HTML → PNG: mammoth turns the document into semantic HTML — headings, lists, tables, embedded images — and the whole page is drawn to a canvas and exported as one image. You get a single strip running to the end of the document, not one image per page: good for taking it in at a glance, and it will not follow Word’s pagination.',
    },
    keeps: {
      zh: [
        '标题、有序与无序列表、表格、加粗与斜体都按语义结构画进图里；命名样式里的 Heading 1–4 与 Title / Subtitle 会落成对应层级的标题',
        '以 data URI 内嵌的图片随文档一起渲染，但跟得过去的只有 `png / jpeg / gif / webp / bmp / avif / ico` 这几种；白名单外的类型与引用不到字节的相对路径都会在图上留一处虚线方框，并按张数说明丢了哪几张，而不是悄悄留白',
        '最长边可以指定（输出图片参数里的那一格），适合贴进宽度受限的地方；它按几何等比缩，不改版式',
        '文档解析不出内容时会直接报「没有可转换的内容」，而不是交出一张空白 PNG 报成功',
      ],
      en: [
        'Headings, ordered and unordered lists, tables, bold and italic all reach the image as structure; the named styles Heading 1–4, Title and Subtitle land as those heading levels',
        'Images embedded as data URIs render with the document; where a relative reference cannot be resolved, the result says how many were dropped instead of quietly leaving blanks',
        'The longest edge is settable (the output option for it), which is what you want where width is fixed — it scales geometrically and leaves the layout alone',
        'A document with nothing convertible fails with «no convertible content» rather than handing back a blank PNG marked as success',
      ],
    },
    limits: {
      zh: [
        '一张到底的长图，不按 Word 的分页走：想要「每页一张图」，先走 Word 转 PDF，再把 PDF 整本转图片——后者按 PDF 的页出一组图（多页打成一个 ZIP），而那份分页是浏览器排的，不是 Word 的',
        '版式由渲染用的那套默认样式决定（正文最大宽度 800 px、自己的字号阶梯与配色），Word 里的页边距、分栏与主题不会照搬',
        '图里是像素，文字不能选中；要可再编辑请走 Word 转 HTML 或 Word 转 Markdown',
        '整页高度超过 32768 px 会明确报错而不是截一半——浏览器远超该高度时交回的是空白画布，「成功但全白」比一条错误难查得多',
      ],
      en: [
        'One long strip, not Word’s pagination: for one image per page, take Word to PDF first and then convert that PDF to images — that route works page by page (several pages arrive as a ZIP), and its pages are laid out by the browser, not by Word',
        'Layout comes from the default stylesheet used at render time — an 800 px measure with its own type scale and colours — so Word’s margins, columns and theme are not copied',
        'The image is pixels, so its text is not selectable. For something still editable, use Word to HTML or Word to Markdown',
        'Going past 32768 px of page height is an error rather than a truncated picture — far above that a browser returns a blank canvas, and «succeeded but all white» is much harder to diagnose than a clear failure',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .docx 一起转会逐个产出各自的 PNG',
        '同一份文档还能接着转：Word 转 PDF（交付用）、Word 转 HTML（要保留结构与可编辑性时用）、Word 转 Markdown（进仓库或笔记时用）',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .docx files produce one PNG each',
        'The same document can carry on: Word to PDF for delivery, Word to HTML when structure and editability matter, Word to Markdown for repositories and notes',
      ],
    },
    faq: [
      {
        q: { zh: '能得到「每页一张 PNG」吗？', en: 'Can I get one PNG per page?' },
        a: {
          zh: '这条链路给不了——它把整篇文档画成一张图。要每页一张，走两步：Word 转 PDF，再 PDF 转图片，后者会按 PDF 的页出一组图（多页时打成一个 ZIP）。',
          en: 'Not on this route, which draws the whole document as one image. Do it in two steps: Word to PDF, then PDF to image — that one works page by page and packages several pages as a ZIP.',
        },
      },
      {
        q: { zh: '图片里的字能复制吗？', en: 'Can the text in the image be copied?' },
        a: {
          zh: '不能，PNG 是位图。要复制文字就用 Word 转 HTML 或 Word 转 Markdown；这条路的目的是「把文档的样子发出去」。',
          en: 'No — a PNG is a bitmap. For copyable text use Word to HTML or Word to Markdown; this route exists to send the document’s appearance.',
        },
      },
      {
        q: {
          zh: '合同要贴进工单，文件会外发吗？',
          en: 'If I attach a contract to a ticket, does the file leave my machine?',
        },
        a: {
          zh: '转换这一步不会：只申请 storage 权限、没有 host 权限，产物里没有从网络取来的代码，解析与渲染都在标签页里完成。附到工单上那一步是你自己的动作。',
          en: 'The conversion does not: the storage permission only, no host permissions, no remotely hosted code in the bundle, and parsing and rendering both happen in the tab. Attaching it to a ticket is your own action.',
        },
      },
    ],
  },
  {
    slug: 'webp-to-word',
    from: 'webp',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-20',
    title: {
      zh: 'WebP 转 Word（.webp → .docx）——图片进文档，离线完成',
      en: 'WebP to Word (.webp → .docx) offline — image inside the file',
    },
    desc: {
      zh: '在浏览器里把 .webp 放进一份 .docx：图片字节原样内嵌，不另附文件、不发请求。图不是文字，Word 显示与否取决于它的 WebP 支持。',
      en: 'The WebP goes inside the .docx as raw bytes — no file alongside, nothing fetched. Whether Word paints a WebP depends on its own support.',
    },
    lede: {
      zh: '手里是一张 WebP，要交的却是 Word 文档——常见于收到的截图、下载的素材、翻拍的白板。这条链路是 WebP → HTML → Word：先把图片以 data URI 包进一个居中的 HTML 文档，再作为 altChunk 打进 .docx，字节随文档走。因此它交付的是「图片在文档里」，不是「图片里的文字被认出来」：要文字得靠 OCR，而本扩展不做 OCR。另一件要说在前面的事：转换器不转码，WebP 能不能被画出来，取决于打开它的那款 Word。',
      en: 'You have a WebP and the deliverable is a Word document — a screenshot someone sent, a downloaded asset, a photo of a whiteboard. This route is WebP → HTML → Word: the image is wrapped as a data URI in a centred HTML document and packed into the .docx as an altChunk, bytes travelling inside. What it delivers is «the image is in the document», not «the text in the image was recognised» — that is OCR, which this extension does not do. One more thing said up front: nothing is transcoded, so whether the picture appears depends on the Word that opens it.',
    },
    keeps: {
      zh: [
        '图片字节原样内嵌：不是重新压缩，也不是截图重画，文档里那张就是原文件',
        '图在 .docx 内部，不需要把图片文件放在旁边，也不会去取任何网络地址',
        '在文档里以居中块呈现，按 Word 自己的方式缩放',
      ],
      en: [
        'The image bytes go in as they are: not re-compressed and not redrawn as a screenshot — the file inside is the one you gave',
        'The picture lives inside the .docx, so nothing has to sit alongside it and no address is fetched',
        'It appears as a centred block, scaled by Word’s own rules',
      ],
    },
    limits: {
      zh: [
        '转换器不转码：WebP 的字节直接进文档，而 Word 对 WebP 的支持随版本与平台不同。要「任何版本的 Word 都画得出来」，先走 WebP 转 PNG，再 PNG 转 Word',
        '正文是装进 .docx 的 altChunk、由 Word 打开时渲染的，所以产物依赖 Word 对 altChunk 的支持；不处理它的阅读器可能整份都显示不出来，交付前请在目标环境打开确认',
        '不会把图里的文字变成可编辑文本：产物里那是一张图，Word 认不出字。需要文字就得先做 OCR，而这一步本扩展刻意不做（不联网、不带模型）',
        '透明区域交给 Word 的页面底色，不做预设的铺白或铺黑',
        '一次一张：多个 .webp 一起转会逐个产出各自的 .docx；想把几张图收进同一份文档，先用「图片合并为一份 PDF」再走 PDF 转 Word',
      ],
      en: [
        'Nothing is transcoded: the WebP bytes go straight in, and Word’s WebP support varies by version and platform. For “renders in any Word”, take WebP to PNG first and then PNG to Word',
        'The body rides inside the .docx as an altChunk that Word renders when it opens the file, so the result depends on Word supporting altChunk; a reader that does not may show nothing at all, so open it in the target environment before delivery',
        'Text inside the picture does not become editable text: the document holds an image, and Word cannot read it out. That needs OCR first, which this extension deliberately does not do (no network, no model)',
        'Transparent areas are left to the page colour Word uses; no white or black matte is forced on',
        'One image per document: several .webp files yield one .docx each. To gather several into one document, merge them into a PDF first (images → merged PDF) and then take PDF to Word',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；文件多于五个或总量超过 20 MB 时，只要偏好里的大批次确认还开着（默认开着），会先要一次确认',
        '只是想换个格式继续传图，走 WebP 转 JPG 或 WebP 转 PNG 更直接；转 Word 的价值在于「图片进文档」这个交付形状',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; over five files or 20 MB it asks once first, as long as the large-batch confirmation is still on in preferences — it is by default',
        'If you only need a different picture format, WebP to JPG or WebP to PNG is the shorter path — the value here is the «image inside a document» shape',
      ],
    },
    faq: [
      {
        q: { zh: 'Word 里的图片会不会变成「链接的文件」？', en: 'Will the image end up as a linked file in Word?' },
        a: {
          zh: '不会。图片以 data URI 内嵌进文档，随 .docx 一起走，把文件发给别人不需要另附图片，Word 也不会为打开它去读旁边的路径或网络地址。',
          en: 'No. The image is embedded as a data URI and travels inside the .docx, so there is nothing to attach alongside the file and Word does not read a local path or an address to open it.',
        },
      },
      {
        q: {
          zh: '截图里的表格能被转成可编辑的 Word 表格吗？',
          en: 'Can a table in a screenshot become an editable Word table?',
        },
        a: {
          zh: '不能，那需要图像里的文字识别（OCR）。这条路交的是「表格的图在 Word 里」；要可编辑的表，把内容重打一遍或走 CSV / Excel 那些数据格式的路。',
          en: 'No — that is optical character recognition, and this route does not do it. What you get is «the picture of the table, inside Word». For an editable table, retype it or come in through the CSV / Excel data routes.',
        },
      },
      {
        q: {
          zh: '白板照片要进会议纪要文档，会外发吗？',
          en: 'If a whiteboard photo goes into a meeting-notes document, is it uploaded?',
        },
        a: {
          zh: '不会。扩展只有 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径；包装与打包都在标签页内完成。',
          en: 'No. The extension has the storage permission only and no host permissions, the bundle carries no path that executes remotely hosted code, and wrapping and packing both happen inside the tab.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-pdf',
    from: 'txt',
    to: 'pdf',
    shot: 'batch-files',
    published: '2026-10-21',
    title: {
      zh: 'TXT 转 PDF——等宽原样排版，本地离线',
      en: 'TXT to PDF offline — spacing kept as written',
    },
    desc: {
      zh: '在浏览器里把 .txt 排成 PDF：整篇进一个 <pre> 块，缩进与对齐照原样保留，再按 A4 切页。不上传、不联网。',
      en: 'The whole file goes into one <pre> block, so indentation survives, then it is cut into A4 pages. Offline, in your browser.',
    },
    lede: {
      zh: '日志、合同草稿、带表格对齐的纯文本笔记，用 Word 打开一次就被重排一次；要交出去的往往是一份「打印出来跟屏幕上一样」的 PDF。这条链路是 TXT → HTML → PDF：整篇文本被转义后放进一个 `<pre>` 块（换行写成 `<br>`），于是空格对齐、代码缩进、表格列宽都按文件里的样子排；再把整页渲染成画布，按 A4 切成若干页。它保的是**排版的形状**，代价是产出的 PDF 没有文字层。',
      en: 'A log, a draft contract, or notes aligned with spaces get re-flowed the moment a word processor opens them, while what has to be handed over is something that prints the way it looks on screen. This route is TXT → HTML → PDF: the whole file is escaped into a single `<pre>` block (newlines written as `<br>`), so space alignment, code indentation and column widths keep the shape they have in the file; that page is then rendered and cut into A4 pages. What it preserves is the layout, and the price is a PDF with no text layer.',
    },
    keeps: {
      zh: [
        '等宽呈现与空白：整篇进 `<pre>`，行首缩进、列对齐、ASCII 表格都按文件里的字符位置排',
        '换行照文件走，不做「智能折行」——每一行在 PDF 里还是那一行（超出页面宽度的部分见限制那栏）',
        '编码不是前提：按 UTF-8 → GB18030 → GBK 依次严格解码，老编辑器导出的 GBK 文本也读得进来',
        '整页按 A4 的宽高比切成多页，长文件往下翻页而不是被截断',
      ],
      en: [
        'Monospace and whitespace: the file lands in a `<pre>`, so leading indentation, column alignment and ASCII tables sit where the characters put them',
        'Line breaks are the file’s own — nothing is re-wrapped “intelligently”, so a line stays a line (what happens past the page width is in the limits)',
        'The encoding is not a precondition: input is decoded UTF-8 → GB18030 → GBK, so a GBK file from an older editor still reads',
        'The rendered page is cut at the A4 aspect ratio, so a long file continues onto further pages instead of being truncated',
      ],
    },
    limits: {
      zh: [
        '产出的 PDF 是渲染出来的图像，没有文字层：不能选中、搜索不到，也不能复制进别处——要能选字的交付物，这份给不了',
        '版面宽度固定 800 px，不随内容变宽：一行比这更长时，靠右侧的那几个字符进不了画面',
        '分页按固定高度切，不保证把一行整个留在同一页；跨页的那一行会上下各留一半',
        '四种编码都解不出文本时直接报错，不产出一份乱码 PDF；解出的是「像文本」的字节（比如全是 CJK 的 UTF-16 被按 GB18030 蒙对）另有控制字符闸门拦着',
        '超过约 4000 CSS px 高的整页按 1 倍采样（更矮的用 1.5 或 2 倍），所以一份很长的日志会比一份短文件糊一档——这是画布上限换来的取舍，不报错',
        '整页高度超过 32768 px 会明确报错而不是给你一张截半的文件',
      ],
      en: [
        'The PDF is a rendered image with no text layer: nothing can be selected or searched, and none of it copies out — a selectable deliverable is not what this route produces',
        'The surface stays 800 px wide regardless of content, so the right-hand characters of a longer line never reach the picture',
        'Pages are cut at a fixed height, so a line can straddle the break and end up split across two pages',
        'If none of the four encodings yields text, it fails rather than producing a PDF of mojibake; a control-character gate also rejects bytes that only look like text',
        'A page taller than about 4000 CSS px is captured at 1× sampling (shorter ones at 1.5× or 2×), so a very long log comes out one notch softer than a short file — a trade for the canvas ceiling, not an error',
        'Page height past 32768 px is an explicit error, not a silently truncated picture',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .txt 一起转逐个产出各自的 .pdf，想一次拿走就打成一个 ZIP',
        '要的是「能选字的 PDF」就别走这条：目前这条路交的是排版形状。只想把文本变成可再编辑的标记语言，走 TXT 转 Markdown 或 TXT 转 HTML',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .txt files yield one .pdf each, and the set can be taken as a single ZIP',
        'If selectable text in the PDF is the requirement, this is not the route — it delivers layout. To make the text editable markup instead, take TXT to Markdown or TXT to HTML',
      ],
    },
    faq: [
      {
        q: { zh: '为什么 PDF 里的字选不中？', en: 'Why can’t I select the text in the PDF?' },
        a: {
          zh: '因为这条链路把整页渲染成图像再铺到 A4 上——这正是它能锁住空格对齐的原因。要一份能选中、可搜索的 PDF，需要的是把字形写成文本对象的那类工具，本扩展全部在浏览器里画，交的是渲染结果。',
          en: 'Because the route renders the page to an image and lays that on A4 — which is exactly why the space alignment holds. A selectable, searchable PDF needs a tool that writes glyphs as text objects; everything here is drawn in the browser and delivers the rendered result.',
        },
      },
      {
        q: {
          zh: '我的日志一行有 300 个字符，会被折行吗？',
          en: 'My log lines are 300 characters wide — will they wrap?',
        },
        a: {
          zh: '不会折，也不会缩排：版面宽度固定在 800 px，超出一行的部分留在画面之外，所以那种文件建议先按列切窄一点（或转成 CSV / Excel 再看）。这是「不重排」这个主张的另一面——它既不替你断行，也不替你挤字。',
          en: 'It neither wraps nor squeezes: the surface is fixed at 800 px, so what hangs past it stays out of the picture. For that kind of file, narrow the columns first (or take the CSV / Excel route and look there). It is the other face of «no re-flowing» — the route will not break your lines or compress your glyphs for you.',
        },
      },
      {
        q: {
          zh: '服务器日志要转 PDF，文件会离开本机吗？',
          en: 'If I turn a server log into a PDF, does the file leave my machine?',
        },
        a: {
          zh: '不会。扩展只申请 storage 权限、没有 host 权限，产物里也没有从网络取来的代码；读文件、解码、排版、写 PDF 都在标签页内完成。日志里有什么，只有你知道。',
          en: 'No. The extension asks for the storage permission only, has no host permissions and ships no remotely hosted code; reading, decoding, laying out and writing the PDF all happen inside the tab. Whatever is in the log stays where you can see it.',
        },
      },
    ],
  },
  {
    slug: 'docx-to-txt',
    from: 'docx',
    to: 'txt',
    shot: 'preview-edit',
    published: '2026-10-21',
    title: {
      zh: 'Word 转纯文本（.docx → .txt）——离线、保编号与表格',
      en: 'Word to plain text (.docx → .txt) offline',
    },
    desc: {
      zh: '在浏览器里把 .docx 读成纯文本：有序列表按位置重新编号、表格写成制表符分隔的行、链接以 [url] 附在文字后。全程离线。',
      en: 'Headings become lines, ordered lists are renumbered by position, tables come out tab-separated and links follow as [url]. Offline, in the tab.',
    },
    lede: {
      zh: '要把一份 Word 文档塞进只吃纯文本的地方——工单系统、终端输出、diff 对比、另一个编辑器的正文框——需要的是「去掉样式但留下结构」，而不是把整篇变成一串没有换行的字。这条链路是 Word → HTML → 纯文本：mammoth 先把文档变成语义化 HTML，再由一个遍历 DOM 的提取器写成文本。因此它比「正则去掉标签」那类做法多保住几样东西：编号、表格的分列、列表的层级，以及链接的地址本身。',
      en: 'Pasting a Word document somewhere that only accepts plain text — a ticket, a terminal, a diff, another editor’s body field — needs the styles gone but the structure kept, not one long unbroken line. This route is Word → HTML → plain text: mammoth turns the document into semantic HTML and a DOM walk writes it out as text. That is why it keeps several things a regex tag-stripper loses: numbering, table columns, list nesting, and the link targets themselves.',
    },
    keeps: {
      zh: [
        '有序列表按位置重新写出 `1.` `2.`：编号不是文档里的文字，正则式提取会把带编号的步骤变成无编号的段落，这里不会',
        '表格写成制表符分隔的行（每个单元格后一个制表符，行末换行），粘进别的表格或对齐文本编辑器还能分列',
        '嵌套列表按层缩进两个空格（最深取到 6 层，再深只是不再多缩，编号仍继续），纯文本里唯一的层级线索就是缩进',
        '链接把地址附在文字后面（`文字 [https://…]`），锚点与 mailto: 不附——它们本来就不是外部地址',
      ],
      en: [
        'Ordered lists are rewritten as `1.` `2.` from each item’s position: numbering is not text in the document, so a regex extraction turns a numbered procedure into an unnumbered one and this does not',
        'Tables become tab-separated rows (a tab after each cell, a newline at the row end), so they still split into columns when pasted elsewhere',
        'Nested lists indent two spaces per level, capped at six — deeper nesting stops gaining blanks but keeps counting, since indentation is the only hierarchy plain text has',
        'Links carry their target after the words (`text [https://…]`); in-page anchors and mailto: do not, because neither is an outside address',
      ],
    },
    limits: {
      zh: [
        '版式全部让位给文本：字体、字号、颜色、页边距、分栏都不在产物里，图片只留下 `[Image]` 或 `[Image: 替代文字]` 这样一行',
        'Word 的「从 N 开始」与逐段重启的编号不会带过来——HTML 那一步不写 `start`，所以列表总是从 1 开始数',
        '脚注与批注会变成上标的「↑」与正文末尾多出的一段编号列表：那是转换层写进 HTML 的结构，纯文本只能照抄',
        '列表的 `type`（字母 / 罗马数字）与 `reversed` 被忽略——纯文本没有可回读的那种编号，位置才是信息',
        '靠脚本或域代码动态生成的内容（目录、交叉引用、字段结果）取到的是文档里存的静态文字，域代码本身不进产物',
        '两条路都读不出内容时（正文为空，且没有可还原的内嵌 MHT）直接报「没有可转换的内容」，而不是交出一份空文件报成功',
      ],
      en: [
        'Layout gives way to text: fonts, sizes, colours, margins and columns are not in the output, and a picture leaves behind one line — `[Image]` or `[Image: alt text]`',
        'A list set to “start at N”, or one that restarts mid-document, does not survive that far: the HTML step carries no `start`, so numbering always begins at 1',
        'Footnotes and comments arrive as a superscript `↑` plus a numbered list appended to the end — that is how the HTML step represents them, and plain text can only copy it',
        'A list’s `type` (letters, roman numerals) and `reversed` are ignored: plain text has no numbering scheme to read back, so position is the information',
        'Anything a field or script generates dynamically (a table of contents, cross-references) comes across as the static text stored in the document; the field code itself does not travel',
        'When neither pass yields a body — no readable text, and no embedded MHT that can be recovered — it fails with «no convertible content» rather than reporting success on an empty file',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .docx 一起转逐个产出各自的 .txt，想一次拿走就打成一个 ZIP',
        '本扩展自己产出的 .docx（HTML 转 Word 那条路的 altChunk 文档）也能读回来：mammoth 处理不了 altChunk，所以有一道专门的还原步骤去把内嵌正文取出来',
        '要保留结构而不仅是文本，走 Word 转 HTML 或 Word 转 Markdown；要「长得跟原件一样」，走 Word 转 PDF',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .docx files yield one .txt each, and the set can be taken as a single ZIP',
        'Files this extension produced itself (the altChunk documents from HTML to Word) read back too: mammoth ignores altChunk, so there is a dedicated recovery step that pulls the embedded body out',
        'For structure rather than bare text, take Word to HTML or Word to Markdown; for something that looks like the original, take Word to PDF',
      ],
    },
    faq: [
      {
        q: { zh: '表格会变成一串没有分隔的文字吗？', en: 'Will the table collapse into one run of text?' },
        a: {
          zh: '不会。每个单元格后面写一个制表符、每行末尾换行，所以粘进支持制表符的地方还能分列。要的是真正的表格文件，那就走 Word 转 Excel 或先转 HTML。',
          en: 'No. Each cell is followed by a tab and each row ends with a newline, so pasting into anything tab-aware still gives you columns. For a real table file, take Word to Excel or go through HTML.',
        },
      },
      {
        q: {
          zh: '为什么目录的页码没了？',
          en: 'Why did the table of contents lose its page numbers?',
        },
        a: {
          zh: 'Word 的目录是域：页码由 Word 在打开时重算，文档里存的是上一次的静态文字。这条链路读的是文档里存的东西，所以目录会变成一行行文本（可能带着旧页码），而不是一个能更新的目录。要能更新的目录，得留在 Word 格式里。',
          en: 'A Word table of contents is a field: Word recomputes the page numbers when it opens the file, and what is stored is last run’s static text. This route reads what is stored, so the contents comes out as lines of text — possibly with stale numbers — rather than a live table. A table of contents that updates has to stay in Word.',
        },
      },
      {
        q: {
          zh: '合同的 Word 转成文本，会被上传吗？',
          en: 'If I turn a contract into text, is it uploaded?',
        },
        a: {
          zh: '不会。解析（mammoth）与提取都在扩展的标签页里跑，manifest 只有 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径；除了你拖进来的文件，没有别的数据来源。',
          en: 'No. Parsing (mammoth) and extraction both run inside the extension’s tab; the manifest carries the storage permission and no host permissions, and the bundle ships no path that executes remotely hosted code. Apart from the files you drop in, there is no other source of data.',
        },
      },
    ],
  },
  {
    slug: 'gif-to-pdf',
    from: 'gif',
    to: 'pdf',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'GIF 转 PDF——取首帧铺页，本地离线',
      en: 'GIF to PDF offline — first frame, laid on a page',
    },
    desc: {
      zh: '在浏览器里把 .gif 写成 PDF：取第一帧重编码到白底、页面按像素尺寸生成，动图会在结果里说明丢了帧。不上传。',
      en: 'The first frame is re-encoded onto white and laid on a page sized to its pixels; an animated source says so in the result. Nothing uploaded.',
    },
    lede: {
      zh: '手里是一张 GIF——可能是截图录制的动图首帧、表情包、或者从设计稿导出的示意——要交的地方只收 PDF。这条链路是 GIF → PDF，一步到位：浏览器解出第一帧，重编码成 PNG 写进一页，页面尺寸跟着像素走（96 dpi 换算成 pt，横图自动横向）。动图会丢帧，这件事结果卡会写明（整批一处提示），而不是让你打开文件才发现只剩一帧。',
      en: 'A GIF on hand — the first frame of a screen recording, a sticker, a diagram export — and the destination only accepts PDF. This route is GIF → PDF in one step: the browser decodes the first frame, re-encodes it as PNG and writes it onto a page sized to those pixels (96 dpi converted to pt, wide images turning landscape). Frames after the first are lost, and the result card says so for the batch rather than leaving you to discover it in the finished document.',
    },
    keeps: {
      zh: [
        '首帧的像素：GIF 走画布重编码到白底，所以透明区域在 PDF 里是白的而不是黑的或花的',
        '页面尺寸跟着图片像素走，不会把一张小图塞进 A4 的固定栏宽里再留出大片空白',
        '一批可以合并为一份多页 PDF：GIF 在可合并的位图之列，按列表顺序逐张写页（最多 200 页）',
        '帧数是查过的：只有真的带第二帧的 GIF 才会让整批结果带上丢帧提示，单帧文件不会被误报',
      ],
      en: [
        'The first frame’s pixels: GIF is re-encoded through a canvas onto white, so transparent areas come out white in the PDF rather than black or mottled',
        'The page is sized from the image’s pixels instead of squeezing a small picture into a fixed A4 column of whitespace',
        'A batch can be merged into one multi-page PDF — GIF is one of the formats the merge accepts — written page by page in list order (200 pages maximum)',
        'The frame count is actually checked — the block structure is walked for a second image descriptor — so a single-frame file never triggers the batch’s lost-frames note',
      ],
    },
    limits: {
      zh: [
        '只取第一帧：动画的时间轴不进 PDF（PDF 里的图像页没有帧可播），要留动画请继续用 GIF 或转成视频',
        '产出的 PDF 是图像页，没有文字层：图里的字不能选中、搜索不到',
        '超过 8192 px 的边会被等比缩到上限再写页——不报错，但像素比原件少',
        '合并模式下任一张解码失败，整组不产出（不会给你一份缺页的文档），界面上的重试是整组一起重来；中途取消则整份文档丢弃',
      ],
      en: [
        'Only the first frame: a PDF image page has no timeline to play, so keep the GIF — or a video — if the animation is the content',
        'The PDF is image pages with no text layer: text inside the picture cannot be selected or searched',
        'An edge past 8192 px is scaled down proportionally before the page is written — no error, but fewer pixels than the source',
        'In merged mode, one undecodable image produces no document at all (never a PDF with a page silently missing), and retrying takes the whole group again; cancelling discards the document',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；不勾选合并时，多个 .gif 逐个产出各自的 .pdf',
        '只是想换图片格式，走 GIF 转 PNG 或 GIF 转 JPG 更省事（同样是首帧）；转 PDF 的价值在于「一页一图」的交付形状',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; without the merge ticked, several .gif files yield one .pdf each',
        'For another picture format, GIF to PNG or GIF to JPG is the shorter path (also the first frame) — the PDF route exists for the one-page-per-image delivery shape',
      ],
    },
    faq: [
      {
        q: { zh: '动图真的只剩一张吗？', en: 'Does an animated GIF really come down to one image?' },
        a: {
          zh: '是。浏览器把 GIF 解成一张位图时取的就是首帧，PDF 那一步没有可播的时间轴可用。所以只有真的带第二帧的 GIF（查的是块结构里的第二个 image descriptor）会让结果卡带上丢帧提示，让你决定是不是该换条路。',
          en: 'Yes. Decoding a GIF to a bitmap already takes the first frame, and a PDF page has no timeline to play. So the lost-frames note appears only for a GIF that really has a second image descriptor — the block structure is walked for it — and you can decide there whether a different route fits.',
        },
      },
      {
        q: {
          zh: '为什么透明背景变成白色？',
          en: 'Why did a transparent background turn white?',
        },
        a: {
          zh: 'GIF 要经过画布重编码，而画布是白底填充的——PDF 里没有「透明图像页」这种可依赖的形状，留成透明在多数阅读器上会读成黑。要保留透明，请走 GIF 转 PNG。',
          en: 'GIF goes through a canvas that is filled white first. A PDF image page has no dependable notion of transparency, and left transparent it reads as black in many viewers. To keep transparency, take GIF to PNG.',
        },
      },
      {
        q: {
          zh: '表情包要放进文档，文件会外发吗？',
          en: 'If I put a sticker into a document, does the file leave my machine?',
        },
        a: {
          zh: '不会。解码、重编码、写页全在扩展的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有从网络取来的代码。把 PDF 发出去那一步是你自己的动作。',
          en: 'No. Decoding, re-encoding and writing the page all happen in the extension’s tab; it asks for the storage permission only, has no host permissions, and the bundle carries no remotely hosted code. Sending the PDF on is your own step.',
        },
      },
    ],
  },
  {
    slug: 'svg-to-html',
    from: 'svg',
    to: 'html',
    shot: 'preview-edit',
    published: '2026-10-21',
    title: {
      zh: 'SVG 转 HTML——矢量留在页面里，本地离线',
      en: 'SVG to HTML offline — the artwork stays vector',
    },
    desc: {
      zh: '在浏览器里把 .svg 包成一份能直接打开的 HTML：图形仍是矢量，缩放不失真；脚本与事件属性在净化时被剥掉。不上传。',
      en: 'The SVG is wrapped in a page you can open, and it stays vector — zoomable, with scripts and event attributes removed by sanitising. Nothing uploaded.',
    },
    lede: {
      zh: '一张 SVG 想放进网页、或者只是想在浏览器里看清楚它画了什么，最省事的做法是有一张能直接打开的 HTML。这条链路是 SVG → HTML，一步到位，而且**不栅格化**：图形作为矢量留在页面里，放大看到的是路径而不是像素。净化用的是保留 svg 与 svgFilters 的配置——渐变、滤镜这些可见结果留下，脚本与事件处理器去掉。要位图请走 SVG 转 PNG；进 Word 或 PDF 最终也会变位图——PDF 那条在第一步 `svg>png` 栅格化，Word 那条在第二步 `html>docx` 栅格化。',
      en: 'Getting an SVG into a web page, or simply seeing clearly what it draws, is easiest as an HTML file you can open. This route is SVG → HTML in one step, and it does not rasterise: the artwork stays vector, so zooming shows paths rather than pixels. The sanitising profile keeps `svg` and `svgFilters` — gradients and filters survive, scripts and event handlers do not. For a bitmap take SVG to PNG; the PDF route rasterises in its first step (`svg>png`) and the Word route in its second (`html>docx`).',
    },
    keeps: {
      zh: [
        '矢量本身：路径、形状、渐变、滤镜与文字的可见结果都按 SVG 原样进页面，放大不产生锯齿或马赛克（不被带过去的那几类写在限制里）',
        '自适应显示：页面里图形居中、`max-width: 100%`，窄窗口下不会撑出横向滚动条',
        '净化只砍活动性内容：走的是保留 svg 与 svgFilters 的配置，脚本与 `on*` 事件属性被去掉，绘图能力留下',
        '文档标题取你自己的文件名，中英两边都不额外加一句「PNG image」这类不属于你选的语言的说明',
      ],
      en: [
        'The vectors themselves: paths, shapes, gradients, filters and text enter the page as drawn, so zooming produces no jaggies or mosaic — the elements that do not travel are listed under limits',
        'It fits the window: the graphic is centred with `max-width: 100%`, so a narrow viewport does not gain a horizontal scrollbar',
        'Sanitising only cuts active content: the profile keeps `svg` and `svgFilters`, so scripts and `on*` handlers go while the drawing stays',
        'The document title is your own file name, with no extra sentence in a language you did not pick',
      ],
    },
    limits: {
      zh: [
        '活动性内容整类不留：`<script>`、事件属性，以及 `<use>`、`<foreignObject>`、`<font-face*>` 与 SMIL 动画标签都在净化这一步被删掉——靠「点开才展开」「动画驱动」的那部分不会动，这是刻意的安全取舍，不是丢件',
        '外部引用在写文件之前就被剥掉：`<image href>`、`feImage`、`fill="url(…)"`、样式里的 `url()` 与 `@import` 都不留，所以产出的 HTML 打开时不会替你发任何请求；缺的那部分按缺的样子显示',
        '整份文件净化后一个字都不剩时，直接报「图片解码失败」而不是给你一张空白页面报成功；只剩 `<use>` 引用那一类不算「空」——`<svg>` 外壳还在，产物照样交给你，只是画不出东西（见下一条）',
        '依赖 `<use>` 的雪碧图会画不出东西：`<symbol>` 的定义留着，引用它的那一层被删——图标符号表这类文件更适合先转 PNG 再交',
        '要位图（放进只收图片的地方、或者要固定像素尺寸），走 SVG 转 PNG / JPG / WebP；要进文档，走 SVG 转 Word 或 SVG 转 PDF——PDF 那条在第一步 `svg>png` 就栅格化，Word 那条在第二步 `html>docx` 栅格化',
      ],
      en: [
        'Nothing active survives: `<script>`, event attributes and the element classes the sanitizer disallows — `<use>`, `<foreignObject>`, `<font-face*>` and the SMIL animation elements — are all removed, so anything that expanded on click or moved by animation stays still. That is a deliberate safety trade-off, not a lost asset',
        'Outside references are removed before the file is written: `<image href>`, `feImage`, `fill="url(…)"` and every `url()` / `@import` in the styles are cut, so the delivered page issues no request when you open it — and the gap it leaves shows as a gap',
        'It fails with «image decode failed» only when nothing at all is left after sanitising; a sprite that is nothing but `<use>` references does not count as «nothing» — the `<svg>` shell survives, so the artifact still ships and simply draws no content (see the next item)',
        'A sprite sheet built on `<use>` comes out blank: the `<symbol>` definitions stay, the layer that references them is removed — for an icon sheet, convert to PNG first',
        'For a bitmap (somewhere that only takes pictures, or fixed pixel dimensions) take SVG to PNG / JPG / WebP; for documents take SVG to Word or SVG to PDF — those rasterise first',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .svg 一起转逐个产出各自的 .html，想一次拿走就打成一个 ZIP',
        '反过来那条路也在：HTML 转 SVG 不存在，但 HTML 里的内联 SVG 在转 Word 时会被逐个栅格化成 PNG 保留下来（不然净化器会把图整块删掉）',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .svg files yield one .html each, and the set can be taken as a single ZIP',
        'The other direction is covered differently: there is no HTML to SVG route, but an inline SVG inside HTML is rasterised to PNG one by one on the way into Word — otherwise the sanitizer would delete the diagram outright',
      ],
    },
    faq: [
      {
        q: {
          zh: '转出来的 HTML 里图还是矢量的吗？',
          en: 'Is the artwork still vector in the resulting HTML?',
        },
        a: {
          zh: '是。这条链路只做「净化 + 包一层文档」，不画到画布上，所以放大看到的是清晰的路径。这也是它与 SVG 转 PNG、SVG 转 Word、SVG 转 PDF 最实际的区别——那三条都会先栅格化。',
          en: 'Yes. The route only sanitises and wraps the markup in a document; nothing is painted to a canvas, so zooming shows clean paths. That is the practical difference from SVG to PNG, SVG to Word and SVG to PDF — all three rasterise first.',
        },
      },
      {
        q: {
          zh: '从别处下载的 SVG 敢直接转吗？',
          en: 'Is it safe to convert an SVG downloaded from somewhere else?',
        },
        a: {
          zh: '比直接双击打开安全。产物里的 SVG 先经 DOMPurify 按 svg + svgFilters 配置净化，脚本与事件属性被剥掉；产出的 HTML 也不去取任何远端资源。最坏情况是画得不一样，而不是执行里面的代码。',
          en: 'Safer than double-clicking it. The SVG is sanitised through DOMPurify with the svg + svgFilters profiles, which strip scripts and event attributes, and the page fetches no remote resource. Worst case for an SVG of unknown origin is that it looks different, not that its code runs.',
        },
      },
      {
        q: {
          zh: '图标库要批量包成页面，文件会外发吗？',
          en: 'If I wrap an icon set in pages, do the files leave my machine?',
        },
        a: {
          zh: '不会。读文件、净化、写页面都在扩展的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有从网络取来的代码。',
          en: 'No. Reading, sanitising and writing the page all happen inside the extension’s tab: the storage permission only, no host permissions, and no remotely hosted code in the bundle.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-html',
    from: 'csv',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'CSV 转 HTML 表格——离线、可批量、不上传',
      en: 'CSV to HTML table offline, in batches, no upload',
    },
    desc: {
      zh: '在浏览器里把 .csv 变成一张真的 HTML 表格：带引号的逗号与字段内换行按一个单元格处理，值原样呈现。批量、可预览、零网络请求。',
      en: 'A real HTML table from your .csv: quoted commas and newlines inside a field stay one cell, and values print as written. Batch, previewable, zero requests.',
    },
    lede: {
      zh: '把 CSV 贴进网页，最省事的办法是转成一张 `<table>`；用「按逗号切一行」的脚本做这件事，会在第一个带引号的逗号上翻车。这条链路交给 SheetJS 的 CSV 解析器：引号、字段内换行、列序都按 CSV 的规矩处理，再把每张表写成 HTML 表格并包成一份能直接打开的文档。值按文件里的字符原样呈现——不做类型推断，所以日期不会被改写成 `1/5/24`。',
      en: 'Pasting a CSV into a web page means turning it into a `<table>`, and the quick script that splits each line on commas fails at the first quoted comma. This route hands that job to SheetJS’s CSV parser — quotes, newlines inside a field and column order all follow CSV’s rules — writes each sheet as an HTML table and wraps it in a document you can open. Values print as the file’s own characters, with no type inference, so a date is not rewritten into `1/5/24`.',
    },
    keeps: {
      zh: [
        '带引号的逗号、字段内的换行、成对的引号转义，都按 CSV 的语法解析成一个单元格，不是按逗号切字符串',
        '每一行都写成表格里的一行，第一行也在内——不像 CSV 转 JSON 会拿首行当键名；列序与文件里一致',
        '值原样呈现：按 raw 模式读取，单元格里那串字符就是最终看到的文本',
        '编码不是前提：按 UTF-8 → GB18030 → GBK 依次尝试解码，老编辑器导出的 GBK 文件也读得进来',
      ],
      en: [
        'Quoted commas, newlines inside a field and doubled quote escapes all parse into one cell under CSV’s grammar, rather than a string split on commas',
        'Every row becomes a table row, the first included — unlike CSV to JSON, which spends row one on key names — and columns keep file order',
        'Values print as written: the file is read raw, so the characters in the field are the text you get',
        'The encoding is not a precondition: input is decoded UTF-8 → GB18030 → GBK, so a GBK file from an older editor still reads',
      ],
    },
    limits: {
      zh: [
        '只产表格结构：CSV 本身不带样式，所以字体、列宽、单元格颜色都不会出现（页面用的是文档的默认样式）',
        '数值不会被「翻译」：`00123` 还是 `00123`，`1-5` 还是 `1-5`——好处是不被改错，代价是它不替你做类型化',
        '列少而文字长时按词断行挤进页面宽度；列多到每格的内边距撑过页面时，表格会比页面宽，需要横向滚动——两种都不丢数据，但都不是替你重排',
        '一张表最多读 50 万格、整个工作簿最多 100 万格，超过直接报错，不会给你一份截断的页面',
        '四种编码都读不出文本时直接报错，不产出一份乱码页面',
      ],
      en: [
        'Structure only: a CSV carries no styling, so no fonts, column widths or cell colours appear — the page uses the document’s default stylesheet',
        'Nothing is “translated”: `00123` stays `00123` and `1-5` stays `1-5` — the benefit is not being misread, the cost is no typing',
        'Few wide columns wrap inside the page width; once the per-cell padding floor exceeds it the table grows past the page and needs a sideways scroll — neither case loses data, and neither one re-flows your content for you',
        'At most 500,000 cells per sheet and 1,000,000 per workbook are read; past that it fails rather than shipping a truncated page',
        'If none of the four encodings yields text, it fails rather than producing a page of mojibake',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .csv 一起转逐个产出各自的 .html，想一次拿走就打成一个 ZIP',
        '产出的 HTML 还能接着转：转 Word（表格进文档）、转 PDF（整页渲染、没有文字层）、转 Markdown（管道表）',
        '要的是能再计算的数据表，走 CSV 转 Excel；要对象数组，走 CSV 转 JSON（那条会把首行当键名）',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .csv files yield one .html each, and the set can be taken as a single ZIP',
        'The HTML carries on: to Word (tables into a document), to PDF (rendered pages, no text layer), to Markdown (a pipe table)',
        'For data you can keep computing on, take CSV to Excel; for objects, take CSV to JSON — that route spends row one on key names',
      ],
    },
    faq: [
      {
        q: {
          zh: '字段里有逗号和换行，会切错吗？',
          en: 'My fields contain commas and newlines — will they split wrong?',
        },
        a: {
          zh: '不会。分隔与引号交给 SheetJS 的 CSV 解析器，不是把一行按逗号 split，所以 `"a,b"` 是一个单元格、字段内的换行也留在同一个单元格里。要导出时保持这个形状，走 HTML 转 CSV 或 Excel 转 CSV 那两条。',
          en: 'No. Splitting is SheetJS’s CSV parser rather than a string split on commas, so `"a,b"` is one cell and a newline inside a field stays inside it. To write that shape back out, take HTML to CSV or Excel to CSV.',
        },
      },
      {
        q: {
          zh: '为什么日期前面没有变成斜杠写法？',
          en: 'Why has a date not been rewritten into slashes?',
        },
        a: {
          zh: '因为这条链路按 raw 模式读，值就是文件里那串字符。类型推断会把 `2024-01-05` 变成日期序列号再打印成 `1/5/24`——那是「看起来更聪明但可能改错」的典型。要数字与日期被真正类型化的产物，走 CSV 转 JSON。',
          en: 'Because the file is read raw, so a value is the characters in the file. Type inference would turn `2024-01-05` into a date serial and print it as `1/5/24` — the classic «cleverer but possibly wrong». For genuinely typed output, take CSV to JSON.',
        },
      },
      {
        q: {
          zh: '客户名单要转成网页，数据会外发吗？',
          en: 'If I turn a customer list into a page, does the data leave my machine?',
        },
        a: {
          zh: '不会。解析与写页面都在扩展的标签页里完成，只申请 storage 权限、没有 host 权限，产出的文档也不引用任何远端资源；除了你拖进来的文件，没有别的数据来源。',
          en: 'No. Parsing and page writing both happen in the extension’s tab; it asks for the storage permission only, has no host permissions, and the produced document references no remote resource. Apart from the files you drop in, there is no other source of data.',
        },
      },
    ],
  },
  {
    slug: 'xlsx-to-txt',
    from: 'xlsx',
    to: 'txt',
    shot: 'preview-edit',
    published: '2026-10-21',
    title: {
      zh: 'Excel 转纯文本（.xlsx → .txt）——离线、制表符分隔',
      en: 'Excel to plain text (.xlsx → .txt) offline, tab-separated',
    },
    desc: {
      zh: '在浏览器里把 .xlsx 读成纯文本：按工作表顺序逐行取单元格文本，同行以制表符分隔；日期归一，空单元格留空。',
      en: 'Cell text in worksheet order, tabs between cells in a row and a newline between rows. Dates normalised, empty cells left empty.',
    },
    lede: {
      zh: '工单系统、邮件正文、另一个编辑器的查找替换——很多地方只吃一段纯文本，而你手里是一张 Excel。这条链路是 Excel → HTML → 纯文本：每张工作表先写成一张 HTML 表格，再由提取器把行写成一行文本、单元格之间放制表符。它保的是「哪一格属于哪一行哪一列」这件事，代价是公式、样式与图表都不进产物。',
      en: 'A ticket, an email body, another editor’s find-and-replace — plenty of places take only plain text, and what you have is a spreadsheet. This route is Excel → HTML → plain text: each worksheet becomes an HTML table and the extractor writes rows as lines with tabs between cells. What survives is which cell belongs to which row and column; what does not is formulas, styling and charts.',
    },
    keeps: {
      zh: [
        '按工作表顺序逐行读取：同一行的单元格之间以制表符分隔，行末换行，列序与原表一致',
        '日期单元格先按工作簿自己的格式归一再写文本，避免 `1/5/24` 这种跨地区会读错的写法',
        '数据矩形内的空单元格保留为「相邻两个制表符」，所以中间的列不会错位；行尾那几格若整表都没写过值，则随稀疏边界一起不在产物里',
        '多张表的工作簿里，每张表前有一行以表名为内容的标题；表格之外不存在别的东西可读',
      ],
      en: [
        'Cell text is read in worksheet order: tabs between the cells of a row, a newline at the row end, columns in the sheet’s order',
        'Date cells are normalised from the workbook’s own format before they are written, so `1/5/24`-style ambiguity does not appear',
        'An empty cell inside the used range stays an empty field — two adjacent tabs — so the middle columns keep their places; trailing blanks past the sheet’s own extent are not written at all',
        'In a multi-sheet workbook each table is introduced by a line carrying the sheet name; there is nothing outside the tables to read',
      ],
    },
    limits: {
      zh: [
        '公式不进产物：读到的是算完之后的值。要留在电子表格里继续算，走 Excel 转 CSV 或 Excel 转 Excel',
        '图表、条件格式、单元格底色与字体、列宽都不在纯文本里——它们本来就没有文本表示',
        '表名只是正文里的一行文字，不会成为可寻址的分隔（要一张表一个文件，走 Excel 转 CSV，那条给的是 ZIP）',
        '单元格内的换行（Alt + 回车）会写成真正的换行，所以一行工作表在文本里可能占好几行',
        '一张表最多读 50 万格、整个工作簿最多 100 万格，超过直接报错，不会给你一份截断的文本',
        '工作表名恰好是 `toString`、`constructor` 这类原型上的名字时，读取按不继承原型的自有属性处理，不会因为「看着像有表」就把空表当成有内容',
      ],
      en: [
        'Formulas do not travel: what is read is the computed value. To keep computing, take Excel to CSV or stay inside spreadsheet formats',
        'Charts, conditional formatting, cell fills, fonts and column widths have no plain-text representation and are not in the output',
        'A sheet name is one line of text, not an addressable separator — for one file per sheet, take Excel to CSV, which packages them as a ZIP',
        'A newline inside a cell (Alt+Enter) is written as a newline, so one worksheet row can occupy several text lines',
        'At most 500,000 cells per sheet and 1,000,000 per workbook are read; past that it fails rather than handing back a truncated text',
        'A sheet named `toString` or `constructor` is read through own properties rather than the prototype chain, so a lookalike name cannot make an empty sheet appear to hold content',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .xlsx 一起转逐个产出各自的 .txt，想一次拿走就打成一个 ZIP',
        '要更「像数据」的产物：Excel 转 CSV（每表一个文件、打包成 ZIP）、Excel 转 JSON（一份文件、多表按表名分组）',
        '要能贴回可编辑表格的产物：Excel 转 HTML 或 Excel 转 Markdown（管道表）',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .xlsx files yield one .txt each, and the set can be taken as a single ZIP',
        'For something more like data: Excel to CSV (one file per sheet, packaged as a ZIP) or Excel to JSON (one file, sheets grouped by name)',
        'For something you can paste back as an editable table: Excel to HTML or Excel to Markdown (a pipe table)',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么不直接导出 CSV？',
          en: 'Why not just export a CSV instead?',
        },
        a: {
          zh: '如果你要的是「能被表格软件再读进去」，CSV 确实更合适——它带引号转义，多张表会一张一个文件。纯文本这一条服务的是另一种场景：粘进一个只接受文本的框里、并且希望列还能用制表符对齐。两种产物的用途不同，不是替代关系。',
          en: 'If the target is something a spreadsheet can read back, CSV is the better fit — it quotes and escapes, and a multi-sheet workbook arrives as one file per sheet. Plain text serves the other case: pasting into a box that takes only text, with columns still aligned by tabs. Different jobs, not substitutes.',
        },
      },
      {
        q: {
          zh: '合并单元格会变成什么？',
          en: 'What happens to merged cells?',
        },
        a: {
          zh: '合并的信息在 HTML 那一步以 colspan / rowspan 保留，但纯文本没有「跨列」这个概念，而且被覆盖的那几格根本不产生单元格——于是合并区右边的列会整体左移一格。要列位置稳定，先取消合并再转（或直接走 Excel 转 CSV）。',
          en: 'The merge survives as far as the HTML step, as colspan / rowspan, but plain text has no notion of spanning and the covered cells emit nothing at all — so the columns right of a merge shift one place left. Unmerge first for stable columns, or take Excel to CSV.',
        },
      },
      {
        q: {
          zh: '工资表要转文本，数据会外发吗？',
          en: 'If I turn a payroll sheet into text, does the data leave my machine?',
        },
        a: {
          zh: '不会。读工作簿、生成表格、提取文本都在扩展的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径。',
          en: 'No. Reading the workbook, building the table and extracting the text all happen inside the extension’s tab: the storage permission only, no host permissions, and no path in the bundle that executes remotely hosted code.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-markdown',
    from: 'csv',
    to: 'md',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'CSV 转 Markdown 表格——离线、可批量、不上传',
      en: 'CSV to Markdown table offline, in batches, no upload',
    },
    desc: {
      zh: '把 .csv 变成 GitHub 风格的管道表：引号里的逗号与字段内换行按 CSV 语法解析成一个单元格，格子里的竖线自动转义。批量、可预览、零网络请求。',
      en: 'A CSV becomes a pipe table: quoted commas and newlines inside a field parse as one cell, and a pipe in a cell is escaped. Batch, offline, no requests.',
    },
    lede: {
      zh: '写文档时最常见的一步，是把一份 CSV 贴成能读的表格。用「按逗号切一行」的脚本做这件事，会在第一个带引号的逗号上翻车；把换行塞进格子更是直接破坏表结构。这条路由先把 CSV 交给 SheetJS 的解析器读成一张 HTML 表格，再由 Markdown 的表格规则写成管道表：首行给出表头分隔线，格子里的竖线写成 `\\|`，列数按最宽的一行补齐。值仍按文件里的字符呈现——不做类型推断，所以 `00123` 不会变成 `123`。',
      en: 'Pasting a CSV into a document is one of the most common conversions there is, and the quick script that splits each line on commas fails at the first quoted comma — a newline inside a field breaks the table outright. This route first reads the CSV with SheetJS’s parser into an HTML table, then writes it as a pipe table: the first row supplies the header rule, a pipe in a cell is emitted as `\\|`, and rows are padded to the widest one. Values stay the file’s own characters, so `00123` does not become `123`.',
    },
    keeps: {
      zh: [
        '带引号的逗号、字段内的换行、成对的引号转义，都按 CSV 的语法解析成一个单元格，而不是按逗号切字符串',
        '管道表的结构完整：首行紧跟一行 `---` 分隔线，其余每行一条记录，列数按最宽的一行补齐，短行不会把整张表挤歪',
        '单元格里的竖线写成 `\\|`、反斜杠成对写，所以内容本身不会把表撑破',
        '编码不是前提：先按 BOM 与 NUL 分布嗅探 UTF-16，再依次尝试 UTF-8 → GB18030 → GBK，老编辑器导出的 GBK 文件也读得进来',
      ],
      en: [
        'Quoted commas, newlines inside a field and doubled quote escapes all parse into one cell under CSV’s grammar, rather than a string split on commas',
        'The pipe table keeps its shape: the first row is followed by a `---` rule, every other row is a record, and rows are padded to the widest one so a short row cannot skew the table',
        'A pipe in a cell is written as `\\|` and a backslash is doubled, so the content itself cannot break the table apart',
        'The encoding is not a precondition: UTF-16 is sniffed first from the BOM and the NUL pattern, then UTF-8 → GB18030 → GBK are tried, so a GBK file from an older editor still reads',
      ],
    },
    limits: {
      zh: [
        '结果就是一张表：CSV 没有标题层级，也没有段落，所以 Markdown 里不会多出说明文字——想要前后有正文，先在 Markdown 里自己写',
        '单元格里的换行与连续空白折成一个空格：管道表不能跨行，文字还在，版式没了',
        '格子里的行内格式不保留：那一格取的是纯文字，所以加粗与链接地址消失、链接只剩锚文本；图片没有文字可取，那一格就成了空的',
        '数值不会被「翻译」：`00123` 还是 `00123`，`1-5` 还是 `1-5`——好处是不被改错，代价是它不替你做类型化',
        '一张表最多读 50 万格、整个工作簿最多 100 万格，超过直接报错；四种编码都读不出文本时也报错，不会给你一份乱码文档',
      ],
      en: [
        'The result is one table and nothing else: a CSV has no heading hierarchy and no prose, so no explanatory text appears around it — write that in the Markdown yourself',
        'Newlines and runs of whitespace inside a cell collapse to one space: a pipe table cannot span lines, so the words survive and the layout does not',
        'Inline formatting inside a cell is not carried over: the cell contributes plain text, so bold and link addresses disappear and a link keeps only its anchor text, while an image has no text to give — that cell comes out empty',
        'Nothing is “translated”: `00123` stays `00123` and `1-5` stays `1-5` — the benefit is not being misread, the cost is no typing',
        'At most 500,000 cells per sheet and 1,000,000 per workbook are read, and past that it fails; if none of the four encodings yields text it fails too, rather than shipping mojibake',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .csv 一起转逐个产出各自的 .md，想一次拿走就打成一个 ZIP',
        '转好的表格还能回转：Markdown 转 CSV、转 JSON、转 Excel 走的都是同一条链，其中经 JSON 的那几步会把首行当列名用掉',
        '格子里必须有换行或行内格式的话，走 CSV 转 HTML 或转 Word——管道表表达不了这些，那两条不需要先把它压平',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .csv files yield one .md each, and the set can be taken as a single ZIP',
        'The table goes back the other way: Markdown to CSV, to JSON and to Excel all sit in the same chain, and the steps that pass through JSON spend the first row on column names',
        'If a cell must keep a line break or inline formatting, take CSV to HTML or to Word — a pipe table cannot express those, and neither route has to flatten the cell first',
      ],
    },
    faq: [
      {
        q: {
          zh: '格子里有竖线，会把表格撑破吗？',
          en: 'A pipe inside a cell — will it break the table?',
        },
        a: {
          zh: '不会。写管道表时每个格子都做转义：竖线写成 `\\|`，反斜杠成对写。读回来还是原来那个值。',
          en: 'No. Every cell is escaped on the way out: a pipe becomes `\\|` and a backslash is doubled. Read back, it is the same value you started with.',
        },
      },
      {
        q: {
          zh: '第一行数据会变成表头还是照常保留？',
          en: 'Does the first row become the header, or is it kept as data?',
        },
        a: {
          zh: '照常保留。它同时充当管道表的表头行（下面紧跟 `---` 分隔线），但不会被「消耗」掉——不像 CSV 转 JSON 那样用首行当键名。',
          en: 'It is kept. It doubles as the pipe table’s header row, with the `---` rule beneath it, but it is not spent the way CSV to JSON spends row one on key names.',
        },
      },
      {
        q: {
          zh: '单元格里换行了，结果会怎样？',
          en: 'What happens to a cell that wrapped onto several lines?',
        },
        a: {
          zh: '折成一个空格。管道表一行就是一行，跨行需要别的格式；文字一个不少，但你原来在格子里排的版式没了。要留版式就走 CSV 转 HTML。',
          en: 'It collapses to a single space. One pipe-table row is one line, and spanning lines needs a different format — every word is still there, only the layout you built inside the cell is gone.',
        },
      },
      {
        q: {
          zh: '报表数据会离开这台电脑吗？',
          en: 'Does the report data ever leave this machine?',
        },
        a: {
          zh: '不会。解析 CSV、建表格、写 Markdown 全在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径。',
          en: 'No. Parsing the CSV, building the table and writing the Markdown all happen inside the extension’s own tab: the storage permission only, no host permissions, and no path in the bundle that executes remotely hosted code.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-csv',
    from: 'md',
    to: 'csv',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 表格转 CSV——离线、可批量、不上传',
      en: 'Markdown table to CSV offline, in batches, no upload',
    },
    desc: {
      zh: '把文档里的管道表变成能再计算的 CSV：首行当列名，其余行当记录，数字按值写出不被显示格式改写，文件带 BOM 让 Excel 直接双击不乱码。',
      en: 'A pipe table becomes a CSV you can compute on: first row as column names, values written as values, and a BOM so Excel opens the file without mojibake.',
    },
    lede: {
      zh: '表格写进 Markdown 容易，想再拿回电子表格里算就麻烦了。这条链路把 Markdown 先渲染成 HTML，再从 `<table>` 提取记录：首行给列名，其余每行一个对象，最后按**值**写成 CSV、不走显示格式——这条链上每个格子本来就是表格里的文本，所以 `2024-01-05` 不会被改写成日期序列号。正文（标题、段落、列表）没有单元格可落，不参与结果；但如果整篇没有表格，代码块里的一段 JSON 数组也会被读进来。',
      en: 'Getting a table into Markdown is easy; getting it back into a spreadsheet to compute on is not. This route renders the Markdown to HTML, then reads records out of the `<table>`: the first row supplies column names, every other row becomes an object, and the CSV is written from **values** rather than display text — and on this route every cell is already the table’s own text, so `2024-01-05` is not rewritten into a date serial. Headings, paragraphs and lists have no cell to land in and are not part of the result, but with no table at all, a JSON array inside a code block is read instead.',
    },
    keeps: {
      zh: [
        '首行当列名、其余行当记录，键的顺序就按表头那一行；不同行列数不一致时取所有行键名的并集，缺的格子写空值',
        '按值写出、不走显示格式：这条链上每个格子本来就是表格里的文本，所以不存在「日期被改成序列号」那一类二次加工',
        '文件开头带 UTF-8 BOM，Excel 双击就是正常中文，不需要「导入向导」',
        '以 `=`、`+`、`-`、`@` 或制表符 / 回车开头的文本会被加一个前导单引号，防止这份 CSV 再被 Excel 当公式执行——代价是那一格不是逐字节原样',
      ],
      en: [
        'The first row supplies column names and the rest are records, keys in header order; when rows disagree the keys are unioned and a missing cell is written empty',
        'Written from values rather than display text: every cell on this route is already the table’s own text, so nothing is reformatted on the way out',
        'The file starts with a UTF-8 BOM, so a double-click in Excel shows Chinese correctly without an import wizard',
        'Text beginning with `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with an apostrophe so the CSV cannot be re-evaluated as a formula by Excel — the cost is that such a cell is not a byte-for-byte copy',
      ],
    },
    limits: {
      zh: [
        '只有表格（或一段能当 JSON 数组读的代码块）能变成 CSV：整篇没有可解析的结构时直接报错，不会产出一份空文件',
        '多张表不行：HTML 转 JSON 那一步会把多张表并成「按小标题分组」的一个对象，而 JSON 转 CSV 只吃数组，于是报「JSON 不是数组」。要一张一张拿，先把它们分开转',
        '列名只由首行给：某行多出的单元格会被丢掉，缺的列写空；首行里有重复或为空的表头会互相覆盖（同名的后一格赢），跨 `colspan` 的表头也只算一格，所以表头要写干净',
        '格子里的链接只剩文字，地址不进 CSV；加粗、行内代码也只剩内容本身',
        '表格套在单元格里，等于文档里就有两张表：与「多张表」同一格——中转步把它们并成一个分组对象，CSV 那一步拒绝，整次转换报错',
      ],
      en: [
        'Only a table — or a code block that parses as a JSON array — becomes CSV: with nothing parseable in the document it fails rather than writing an empty file',
        'Several tables do not work: the HTML-to-JSON step merges them into one object keyed by their headings, and JSON-to-CSV accepts only arrays, so it reports “not an array”. Convert them one at a time',
        'The first row alone names the columns: extra cells in a later row are dropped and missing ones come out empty, a repeated or empty header overwrites its twin (the later cell wins), and a header spanning `colspan` counts as one cell — so write the header row cleanly',
        'A link inside a cell contributes its words only, so the address is not in the CSV, and bold or inline code arrive flattened',
        'A table nested inside a cell is a second table as far as this route is concerned: the middle step merges the two into one grouped object and the CSV stage refuses it, so the conversion fails the same way several tables do',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .md 一起转逐个产出各自的 .csv，想一次拿走就打成一个 ZIP',
        '想要的是对象数组而不是 CSV 行，走 Markdown 转 JSON——同一条提取逻辑，只是终点不同',
        '想整篇文档（含标题与段落）都进表格，是不可能的：CSV 只有行列，正文没有可落的地方。要留正文就走 Markdown 转 Word 或转 HTML',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .md files yield one .csv each, and the set can be taken as a single ZIP',
        'For objects rather than CSV rows, take Markdown to JSON — the same extraction, a different endpoint',
        'No route can put headings and paragraphs into a CSV: the format has only rows and columns, and prose has nowhere to land. Keep the prose by going Markdown to Word or to HTML',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的文档里有两张表，为什么转 CSV 失败？',
          en: 'My document has two tables — why does the CSV conversion fail?',
        },
        a: {
          zh: '因为多张表在中间那一步被并成了一个「按小标题分组」的对象，而 CSV 这一步只接受数组。把两张表分别放到两个文件里各转一次，或者先合成一张表再转。',
          en: 'Because several tables are folded by the middle step into one object keyed by their headings, and the CSV step accepts only arrays. Split them into two files and convert each, or merge them into one table first.',
        },
      },
      {
        q: {
          zh: '格子里的数字会被改成科学计数法吗？',
          en: 'Will a number in a cell come out in scientific notation?',
        },
        a: {
          zh: '不会。这条链上的格子本来就是表格里的文本，写 CSV 时按值原样落地，不走显示格式；表格单元格里也不存在「被 Excel 认出是数字再改写」这一步，因为值从 HTML 取出来就已经是字符串了。',
          en: 'No. Every cell on this route is the table’s own text, and the CSV writes those values as they are, without a display format — there is no step where Excel recognises a number and rewrites it, because the value read out of the HTML is already a string.',
        },
      },
      {
        q: {
          zh: '整篇没有表格，只有一段 JSON 代码块，能转吗？',
          en: 'No table, only a JSON code block — does that work?',
        },
        a: {
          zh: '能。没有表格时会把 `<pre>` / `<code>` 里的内容当 JSON 解析，是一个数组就照上面写；不是合法 JSON 或不是数组就报错，不返回空文件。',
          en: 'Yes. With no table the text of the `<pre>` / `<code>` block is parsed as JSON, and an array follows the same writer. Anything that is not valid JSON, or not an array, is reported instead of returning an empty file.',
        },
      },
      {
        q: {
          zh: '文档内容会被上传吗？',
          en: 'Is the document uploaded anywhere?',
        },
        a: {
          zh: '不会。渲染 Markdown、读表格、写 CSV 都在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，全程零网络请求。',
          en: 'No. Rendering the Markdown, reading the table and writing the CSV all happen inside the extension’s own tab: the storage permission only, no host permissions, and no requests at any point.',
        },
      },
    ],
  },
  {
    slug: 'html-to-csv',
    from: 'html',
    to: 'csv',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'HTML 表格转 CSV——离线、可批量、不上传',
      en: 'HTML table to CSV offline, in batches, no upload',
    },
    desc: {
      zh: '把网页保存下来的表格变成能再计算的 CSV：首行当列名，`<th>` 与 `<td>` 都算一格，链接只取文字，页面里的远程引用一个字节都不去取。',
      en: 'A table from a saved page becomes a CSV you can compute on: first row headers, `th` and `td` both count as cells, and no remote reference is ever fetched.',
    },
    lede: {
      zh: '网页存下来的是 HTML，想拿数据还得自己刮。这条链路只认文档里的 `<table>`：首行给出列名，其余每行一条记录，按值写成 CSV。取行取格都用「只看这张表自己」的作用域去读，所以内层表格的行不会被当成外层的数据行，表头用 `<th>` 写的文档也不会因为只读 `<td>` 而整列左移。链接取文字、表格外的脚本与样式变不成行，而页面里指向网络的图片与字体一概不会被请求——扩展本身也只有 storage 权限。',
      en: 'A saved page is HTML, and the data inside it still has to be scraped. This route reads only the `<table>` elements: the first row supplies column names, each other row becomes a record, and the CSV is written from values. Rows and cells are read with a “this table only” scope, so a table nested inside a cell does not have its rows mistaken for the outer table’s data, and a document whose header row is written with `th` does not shift a whole column left. Links contribute their text, scripts and styles outside the tables never become a row, and nothing a page points at on the network is ever requested — the extension itself carries only the storage permission.',
    },
    keeps: {
      zh: [
        '首行当列名、其余行当记录；`<th>` 和 `<td>` 都算一格，所以用 `<th>` 写表头的文档不会整列左移',
        '只取这张表自己的行与格：内层的行不会被摊平成外层的数据行（但内层那张表本身也算一张表，见下面的限制）',
        '按值写出、不走显示格式：格子本来就是页面里的文本；文件开头带 UTF-8 BOM，实测 `2024-01-05` 与 `1727000000000` 都原样落地',
        '没有 `<table>` 时会退一步读 `<pre>` / `<code>` 里的 JSON，能解析成数组就有 CSV；解析不了直接报错，不给空文件',
      ],
      en: [
        'The first row supplies column names and the rest are records, with both `th` and `td` counting as cells, so a header written as `th` cannot shift the row one column left',
        'Only the table’s own rows and cells are taken, so an inner table’s rows are never flattened into the outer table’s data — though that inner table still counts as a second table, which the limits below come back to',
        'Written from values rather than display text — the cells are the page’s own text — and the file starts with a UTF-8 BOM: measured, `2024-01-05` and `1727000000000` arrive exactly as written',
        'With no `<table>` at all, a JSON array inside `<pre>` / `<code>` is read instead; anything unparseable is reported rather than an empty file',
      ],
    },
    limits: {
      zh: [
        '一次只认一张表：页面里有两张以上（**表格套在单元格里也算两张**）时，中间那一步会把它们并成一个按文档里小标题顺序分组的对象（标题不够就用 `Sheet2` 这类名字），而 CSV 只接受数组，于是整次转换报错。要逐张拿，先各存成一份只含一张表的 HTML',
        '列数由首行决定：某行比表头多的单元格会被丢掉，少的列写空；首行里重复或为空的表头会互相覆盖，跨 `colspan` 的表头只算一格',
        '链接只剩文字，`href` 不进 CSV；表单控件与图片没有文字可贡献，脚本与样式也变不成行',
        '以 `=`、`+`、`-`、`@` 开头的文本会被加一个前导单引号，防止这份 CSV 再被 Excel 当公式执行——所以它不是逐字节原样',
        '读文档用的是宽松解码：脏字节不会变成正文，但也没有「编码猜错就报错」这道闸，编码很怪的旧文件请自己先确认',
      ],
      en: [
        'One table at a time: with two or more — and a table nested inside a cell counts as a second one — the middle step merges them into one object keyed by the document’s headings in order, falling back to names like `Sheet2` when there are not enough, and CSV accepts only arrays, so the whole conversion fails. Save one table per file to take them separately',
        'The first row defines the columns: a row with more cells than the header has the extras dropped and a row with fewer gets empty columns, a repeated or empty header overwrites its twin, and a header spanning `colspan` counts once',
        'A link contributes its text, so the `href` is not in the CSV, form controls and images have no text to contribute, and scripts and styles never become a row',
        'Text starting with `=`, `+`, `-` or `@` is prefixed with an apostrophe so the CSV cannot be re-evaluated as a formula, which means it is not a byte-for-byte copy',
        'The document is read with a lenient decoder: stray bytes do not become text, but there is no “fail if the encoding cannot be guessed” gate, so confirm a badly mangled old file yourself',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个 .html 一起转逐个产出各自的 .csv，想一次拿走就打成一个 ZIP',
        '要的是 JSON 对象而不是 CSV，走 HTML 转 JSON——那条能吃多张表（按 `<h2>` 分组成一个对象）',
        '要的是能再算的工作表而不是纯文本，走 HTML 转 Excel——但那是同一条链的延伸（HTML → JSON → CSV → Excel），所以「多张表」在那里同样被拒绝，只在页面只含一张表时好用',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several .html files yield one .csv each, and the set can be taken as a single ZIP',
        'For JSON objects rather than CSV rows, take HTML to JSON — that route does accept several tables, grouping them under their `<h2>` headings',
        'For a workbook you can keep computing in, take HTML to Excel — but that is the same chain extended (HTML → JSON → CSV → Excel), so several tables are refused there too and it works when the page holds one table',
      ],
    },
    faq: [
      {
        q: {
          zh: '页面里有多张表，能一次都转成 CSV 吗？',
          en: 'The page has several tables — can they all become one CSV?',
        },
        a: {
          zh: '不能。多张表在 HTML 转 JSON 那一步会并成一个按文档小标题顺序分组的对象，而 JSON 转 CSV 只接受数组，所以会明确报错。想全拿就分别存成只含一张表的 HTML，或者改走 HTML 转 JSON（那条能吃多张表）。',
          en: 'No. Several tables are merged by the HTML-to-JSON step into an object keyed by the document’s headings in order, and JSON-to-CSV accepts only arrays, so it fails with a clear message. Save one table per file, or take HTML to JSON instead — that route does accept several tables.',
        },
      },
      {
        q: {
          zh: '表格里的链接地址会丢吗？',
          en: 'Are the link addresses inside the table lost?',
        },
        a: {
          zh: '是，只留链接文字。要地址就先走 HTML 转 JSON（同样只取文字，但结构更完整）或直接编辑源文件。这条路的定位是「把看得见的表格变成能算的数据」，不是抓取。',
          en: 'Yes — only the link’s text comes through. If you need addresses, go HTML to JSON first, or edit the source. This route is “make the visible table computable”, not a scraper.',
        },
      },
      {
        q: {
          zh: '打开这份 HTML 时会自动去请求页面里引用的图片和样式吗？',
          en: 'Does opening that HTML fetch the images and stylesheets it references?',
        },
        a: {
          zh: '不会。扩展完全离线，只有 storage 权限、没有 host 权限，浏览器也拦得住；转换读的是文件自己的字节。',
          en: 'No. The extension is fully offline — the storage permission only, no host permissions, and the browser would block it anyway. The conversion reads the file’s own bytes.',
        },
      },
    ],
  },
  {
    slug: 'excel-to-markdown',
    from: 'xlsx',
    to: 'md',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Excel 转 Markdown 表格——离线、多工作表、不上传',
      en: 'Excel to Markdown table offline, multi-sheet, no upload',
    },
    desc: {
      zh: '把工作簿写成管道表：每个工作表一张表并冠一行小标题，日期按 ISO 文本落地，合并区与样式按纯文本的规矩取舍。批量、可预览、零网络请求。',
      en: 'A workbook becomes pipe tables — one per worksheet under its own heading, dates as ISO text, merges handled as plain text allows. Batch and fully offline.',
    },
    lede: {
      zh: '把 Excel 贴进 README、Issue 或文档里，需要的是一张 Markdown 管道表。这条链路先把工作簿写成 HTML 表格（SheetJS 的 `sheet_to_html`，日期格在此之前已被改成 ISO 文本），再交给 Markdown 的表格规则输出。多工作表在这里是**支持**的：每个表前面会写一行 `## 工作表名`，各成一表——终点是 Markdown，不经过「只接受数组」那一闸，所以不会像 HTML 转 CSV 那样在多张表上失败。代价也说清楚：管道表没有跨列，合并区被覆盖的格子根本不产生单元格，右边整排会左移一格。',
      en: 'Putting a spreadsheet into a README, an issue or a document means a Markdown pipe table. This route first writes the workbook as HTML tables (SheetJS’s `sheet_to_html`, with date cells already turned into ISO text) and then lets the Markdown table rule emit them. Multiple worksheets are **supported** here: each one gets a `## Sheet name` line above its table, because the endpoint is Markdown and never passes the “arrays only” gate that makes HTML to CSV fail on several tables. The cost is stated plainly: a pipe table has no column spanning, and the cells a merge covers emit nothing, so everything right of a merge shifts one column left.',
    },
    keeps: {
      zh: [
        '每个工作表一张管道表，多 sheet 时前面各写一行 `## 工作表名`——多张表在这条路上是正常输出，不是错误',
        '日期按 ISO 文本落地（`2024-01-05`，带时间的是 `2024-01-05 14:30:00`），不会被改回序列号；作者显式设定的显示格式照原样保留',
        '单元格取的是工作簿里的值与显示文本，所以公式那格给的是算好的数，不是 `=SUM(...)`',
        '首行后紧跟 `---` 分隔线，列数按最宽的一行补齐；格子里的竖线写成 `\\|`、反斜杠成对写，内容撑不破表',
      ],
      en: [
        'One pipe table per worksheet, each preceded by a `## Sheet name` line when the workbook holds several — multiple tables are a normal result on this route, not an error',
        'Dates land as ISO text (`2024-01-05`, or `2024-01-05 14:30:00` with a time) instead of being rewritten into serials, and a format the workbook author set explicitly is respected rather than overridden',
        'Cells carry the sheet’s value and display text, so a formula cell gives the computed number rather than `=SUM(...)`',
        'The first row is followed by the `---` rule and rows are padded to the widest one; a pipe in a cell becomes `\\|` and a backslash is doubled, so content cannot break the table',
      ],
    },
    limits: {
      zh: [
        '合并单元格左移：HTML 那一步用 colspan / rowspan 表达合并，但纯文本没有跨列概念，被覆盖的格子一个都不产生，于是合并区右边的列整体左移一格——要列位置稳定，先取消合并再转',
        '图片、图表、批注、条件格式与样式都不在 SheetJS 读出的单元格里：它们不是「在这里被丢掉」，而是从来没进过这一步',
        '格子里的换行与连续空白折成单空格，行内格式也不保留——管道表一行就是一行',
        '表头行里重复或为空的表头会互相覆盖（同名的后一格赢），首行没写到的列不会存在',
        '一张表最多读 50 万格、整个工作簿最多 100 万格，超过直接报错，不会给一张截断的表',
      ],
      en: [
        'Merged ranges shift columns: the HTML step expresses them as colspan / rowspan, but plain text has no spanning and the covered cells emit nothing, so the columns right of a merge shift one place left — unmerge first for stable positions',
        'Images, charts, comments, conditional formatting and styling are not in the cell grid SheetJS reads: they are not lost at this step, they never entered it',
        'Newlines and runs of whitespace inside a cell collapse to one space and inline formatting is not carried over — one pipe-table row is one line',
        'A repeated or empty entry in the header row overwrites its twin (the later cell wins), and a column the first row does not name will not exist',
        'At most 500,000 cells per sheet and 1,000,000 per workbook are read; past that it fails rather than emitting a truncated table',
      ],
    },
    notes: {
      zh: [
        '一批最多 200 个文件，单个文件上限 100 MB；多个工作簿逐个产出各自的 .md，想一次拿走就打成一个 ZIP',
        '要的是能排版的成品文档而不是表格，走 Excel 转 Word；只要第一个工作表的纯文本，走 Excel 转文本',
        '想让数据进 CSV 或 JSON：Excel 转 CSV 会把每个工作表写成一份 CSV 打包 ZIP，Excel 转 JSON 则一个文件按工作表名分组——那两条都不经过 HTML 提取，所以也不会撞上「多张表」那道闸',
      ],
      en: [
        'Up to 200 files per batch and 100 MB per file; several workbooks yield one .md each, and the set can be taken as a single ZIP',
        'For a document that keeps its layout, take Excel to Word; for the first sheet as plain text, take Excel to Text',
        'For the data as CSV or JSON: Excel to CSV writes one CSV per worksheet inside a ZIP, and Excel to JSON returns one file grouped by sheet name — neither goes through HTML extraction, so neither meets the “several tables” gate either',
      ],
    },
    faq: [
      {
        q: {
          zh: '工作簿里有五个工作表，会不会像 HTML 转 CSV 那样失败？',
          en: 'Five worksheets in the workbook — will it fail like HTML to CSV does?',
        },
        a: {
          zh: '不会。那条失败是因为多张表会被并成一个分组对象，而 CSV 那一步只接受数组；这条的终点是 Markdown，每张表各成一段并冠一行小标题，没有那道闸。',
          en: 'No. That route fails because several tables merge into one grouped object and the CSV stage accepts only arrays. This endpoint is Markdown: each table becomes its own section under a heading line, and there is no such gate.',
        },
      },
      {
        q: {
          zh: '合并过的单元格会变成什么？',
          en: 'What does a merged cell become?',
        },
        a: {
          zh: '合并区只有左上那一格有内容，其余格子根本不产出——所以合并区右边的列会整体左移一格，Markdown 管道表也没有跨列的写法。想让列位置不变，先在源文件里取消合并。',
          en: 'Only the top-left cell of a merged range carries content and the covered cells emit nothing, so the columns to the right shift one place left — and a pipe table has no syntax for spanning anyway. Unmerge in the source file to keep column positions.',
        },
      },
      {
        q: {
          zh: '公式那一格会给公式还是结果？',
          en: 'Does a formula cell give the formula or the result?',
        },
        a: {
          zh: '给结果：工作簿存下的显示文本 / 计算值。公式本身不会进文本类产物，需要公式就保留那份 .xlsx。',
          en: 'The result — the display text or value the workbook stores. Formulas do not travel into text artefacts, so keep the .xlsx if you need them.',
        },
      },
      {
        q: {
          zh: '含个人信息的表会在本机以外处理吗？',
          en: 'Is a sheet containing personal data processed anywhere off this machine?',
        },
        a: {
          zh: '不会。读工作簿、生成表格、写 Markdown 都在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，全程零网络请求。',
          en: 'No. Reading the workbook, building the tables and writing the Markdown all happen inside the extension’s own tab: the storage permission only, no host permissions, and no requests at any point.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-word',
    from: 'txt',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'TXT 转 Word 文档——离线、可批量、不上传',
      en: 'TXT to Word document offline, in batches, no upload',
    },
    desc: {
      zh: '把纯文本变成 Word 打得开的 .docx：换行、缩进与制表符原样保留，排版交给 Word。批量、可预览、零网络请求，不经过任何在线转换服务。',
      en: 'A plain-text file becomes a .docx Word opens: line breaks, indentation and tabs preserved, layout left to Word. Fully offline, never sent to a service.',
    },
    lede: {
      zh: '「把 txt 丢进 Word」看起来是最简单的一步，真正决定结果的是产物里放了什么。这条链路先按纯文本的老规矩把文件转成 HTML：转义 `&`、`<`、`>`，把每个换行写成 `<br>`，整段包在 `<pre>` 里；再由 HTML 转 Word 把这份 HTML 封装成 MHTML altChunk 塞进 .docx——也就是说**排版发生在 Word 打开它的那一刻**，不是由扩展硬编码一份 XML。换来的是行与缩进的忠实保留，代价是不同 Word / LibreOffice 版本的观感可能不同。这条路上没有任何字体、页边距或颜色可继承：源文件本来就没有这些对象。',
      en: '“Turn a txt into Word” sounds like the easiest step in the world, and what decides the result is what the artefact actually contains. This route first converts the file with plain text’s own rules: `&`, `<` and `>` are escaped, every newline becomes `<br>`, and the block is wrapped in `<pre>`; HTML to Word then packages that document as an MHTML altChunk inside the .docx — which means **the layout happens when Word opens it**, rather than being hardcoded into XML this extension assembles. The reward is faithful lines and indentation; the price is that different Word and LibreOffice builds can present it differently. Nothing is inherited on the way: the source file has no fonts, margins or colours to carry over.',
    },
    keeps: {
      zh: [
        '每一行换行都成为 Word 里的一个换行，不会被折进同一段——日志、清单、代码片段转出去还是一行一条',
        '前导空格与制表符按 `<pre>` 的规矩原样保留，ASCII 画的表格和缩进层级转过去还认得出来',
        '文本里的 `&`、`<`、`>` 是作为字符出现的，不会被当成标签吃掉；文件名会写进文档标题',
        '编码不是前提：先按 BOM 与 NUL 分布嗅探 UTF-16，再依次尝试 UTF-8 → GB18030 → GBK；四种都读不出文本时直接报错，不产出一份乱码 .docx',
      ],
      en: [
        'Every newline becomes a newline in Word instead of being folded into one paragraph, so logs, checklists and code snippets still read one item per line',
        'Leading spaces and tabs are preserved exactly as `<pre>` holds them, so an ASCII table or an indented outline is still recognisable after the conversion',
        'The `&`, `<` and `>` inside your text appear as characters rather than being swallowed as markup, and the file’s own name becomes the document title',
        'The encoding is not a precondition: UTF-16 is sniffed from the BOM and the NUL pattern first, then UTF-8 → GB18030 → GBK are tried, and a file none of them can read fails instead of shipping a mojibake .docx',
      ],
    },
    limits: {
      zh: [
        '排版由 Word 决定：产物里是封装好的 altChunk，Word 打开时才渲染，所以行距、字体回退与分页位置在不同软件、不同版本之间会有差异——它不是字节级固定的版式',
        '没有任何样式可继承：字号、字体、颜色、页边距全部取 Word 的默认值，想要样式请先在 Word 里加，或改走 Markdown 转 Word 让结构（标题、列表、表格）先进文档',
        '超长的一行不会被自动折断：`<pre>` 保留原样，宽行在 Word 里可能超出页宽。数据宽表请走 CSV 或 Excel 路线',
        '不生成图片、目录、页眉页脚或任何对象——纯文本里没有这些东西，转换也不会替你把它们凭空造出来',
        '一批最多 200 个文件、单个上限 100 MB；产物是 .docx 容器，多个文件一起转会打包成 ZIP 供一次拿走',
      ],
      en: [
        'Word owns the layout: the artefact holds a packaged altChunk and Word renders it when the file opens, so line spacing, font fallback and where pages break can differ across applications and versions — this is not a byte-fixed layout',
        'No styling is inherited: size, face, colour and margins all come from Word’s defaults. Style it in Word afterwards, or take Markdown to Word so structure (headings, lists, tables) enters the document first',
        'A very long line is not auto-wrapped: `<pre>` keeps it as written, so a wide row can run past the page. Data tables belong on the CSV or Excel route',
        'No images, table of contents, headers or footers are generated — plain text contains none, and the conversion does not invent them for you',
        'Up to 200 files per batch and 100 MB per file; the artefact is a .docx container, and several files together are handed over as one ZIP',
      ],
    },
    notes: {
      zh: [
        '想要一份真正能排版的文档：TXT → Markdown → Word，标题、列表与表格会以结构进文档，而不是当成一整块等宽文字',
        '想要一页纸的图片或 PDF：TXT → PDF 走的是整页渲染成位图的路线，产物没有文字层，选中不了文字',
        '手上其实是数据表，只是存成了 .txt：先把分隔符当 CSV 读（TXT → CSV 或直接用 .csv），再转 Excel，列位置才稳',
      ],
      en: [
        'For a document you really want to lay out: TXT to Markdown to Word, so headings, lists and tables enter as structure rather than as one block of monospaced text',
        'For a page image or PDF: TXT to PDF renders the whole page to bitmaps, so that artefact has no text layer and its words cannot be selected',
        'If the file is actually a data table stored as .txt: read the separator as CSV first (TXT to CSV, or just use the .csv), then go to Excel, where the column positions stay put',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么排版要到 Word 打开时才定？',
          en: 'Why is the layout decided when Word opens the file?',
        },
        a: {
          zh: '因为产物里封的是 MHTML altChunk：Word 按自己的 HTML 引擎渲染它。这样换来的是换行与缩进的忠实保留，也不必由扩展去拼一份 Word 的 XML 正文——代价就是不同软件的观感差异，这是刻意选的那一侧。',
          en: 'Because the file carries an MHTML altChunk: Word renders it with its own HTML engine. That buys faithful lines and indentation without this extension hand-assembling WordprocessingML, and the price is that viewers can differ — the side deliberately chosen.',
        },
      },
      {
        q: {
          zh: '日志里有几百行，会丢吗？',
          en: 'My log runs to hundreds of lines — will any be lost?',
        },
        a: {
          zh: '不丢。每个换行都写成 `<br>`，整段作为等宽块交给 Word；文本一个字符都不会被当标签解析（`&`、`<`、`>` 都先转义）。真正要注意的是超宽的单行不会被自动折行。',
          en: 'None. Every newline becomes a `<br>` and the whole block is handed over as monospaced content; not one character is parsed as markup, because `&`, `<` and `>` are escaped first. The thing to watch is a very long line, which is not auto-wrapped.',
        },
      },
      {
        q: {
          zh: '中文和 emoji 会正常显示吗？',
          en: 'Do Chinese text and emoji survive?',
        },
        a: {
          zh: '内容按 UTF-8 保留，不会替换成问号；实际用到的字形由 Word 的字体回退决定。如果某类字符在你的 Word 里显示成方框，那是字体问题，重转一次不会改变结果。',
          en: 'The bytes stay UTF-8 and are not replaced with question marks; which glyphs you actually see is Word’s font fallback. If a character renders as a box in your Word, that is a font matter, and converting again changes nothing.',
        },
      },
      {
        q: {
          zh: '合同或病历这类文本会经过服务器吗？',
          en: 'Do contracts or medical notes ever pass through a server?',
        },
        a: {
          zh: '不会。读文本、生成 HTML、封装 .docx 都在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径。',
          en: 'No. Reading the text, building the HTML and packaging the .docx all happen inside the extension’s own tab: the storage permission only, no host permissions, and no path in the bundle that executes remotely hosted code.',
        },
      },
    ],
  },
  {
    slug: 'json-to-pdf',
    from: 'json',
    to: 'pdf',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转 PDF——离线、带语法配色、不上传',
      en: 'JSON to PDF offline, syntax coloured, no upload',
    },
    desc: {
      zh: '先把 JSON 渲染成可折叠的语法高亮查看器，再把这份页面按 A4 分页写成 PDF。产物是位图、没有文字层，但结构与配色都在。',
      en: 'JSON becomes a collapsible, colour-coded viewer, and that page is captured to A4 pages inside a PDF — an image with no text layer, structure and colours intact.',
    },
    lede: {
      zh: '这条路是两步合成的，产物形态由后一步决定。前一步把 JSON 渲染成语法高亮的可折叠查看器：键、字符串、数字、布尔与 null 各有颜色，对象与数组带 `Object(n)` / `Array(n)` 的计数摘要，并且**默认全部展开**——所以折叠状态的节点不会被裁掉。后一步把这份 HTML 净化后离屏渲染成整页画布，再按 A4 切成多页写进 PDF。因此产物是「查看器的分页截图」：看起来像文档，但每个字都是位图，不能选中、不能被搜索。也正因为整页要一次渲染，它有高度上限：超过约 32768 px 会报「页面过高」，而不是给你一份被静默截断的 PDF。',
      en: 'This route is two steps, and the second one decides what you get. The first renders the JSON as a collapsible, syntax-coloured viewer: keys, strings, numbers, booleans and null each take a colour, objects and arrays carry an `Object(n)` / `Array(n)` count, and everything is **expanded by default**, so nothing hidden behind a collapsed node is left out. The second renders that document off-screen onto a page canvas, slices it into A4 pages and writes them into a PDF. So the artefact is a paginated picture of the viewer: it looks like a document, yet every glyph is a bitmap — nothing can be selected or searched. Because the whole page must be rendered in one pass, it has a height ceiling: past roughly 32768 px the job reports an over-tall page instead of handing you a silently truncated PDF.',
    },
    keeps: {
      zh: [
        '层级与配色进画面：缩进、键名颜色、`Object(n)` / `Array(n)` 计数都留在 PDF 里，默认展开所以没有藏在折叠状态下的内容被漏掉',
        '按 A4 分页：长文档得到多页 PDF，页与页之间是整页位图切片，而不是把内容压扁挤进一页',
        '渲染面宽度固定 800 px，与工作台预览同一套版式，所以「看到的」与「转出来的」是同一张页面',
        '不可信内容在渲染前净化：JSON 里的字符串只作为文本呈现，渲染边界还会剥掉远程子资源引用，产物不会在打开时替你去取网络上的东西',
      ],
      en: [
        'Hierarchy and colour reach the page: indentation, key colours and the `Object(n)` / `Array(n)` counts stay in the PDF, and the default-expanded state means nothing hidden behind a collapsed node is left out',
        'A4 slicing: a long document yields several pages of whole-page bitmaps rather than being squeezed flat into one',
        'The render surface is 800 px wide, the same layout the workbench preview uses, so what you saw and what comes out are the same page',
        'Untrusted content is sanitised before rendering: strings appear as text only, and the render boundary strips remote subresource references, so the artefact never goes fetching on your behalf when it opens',
      ],
    },
    limits: {
      zh: [
        '没有文字层：PDF 里每个字都是位图，不能选中、复制或被搜索引擎检索。要文字请用 JSON 转 HTML（浏览器里可直接打印）或转 TXT',
        '高度上限：整页捕获约 32768 px，深结构或超大 JSON 全部展开后很容易超过，这时报「页面过高」并让你分段，而不是静默截断',
        '分辨率按页高自动降档（2 / 1.5 / 1 倍像素比），特别高的文档字迹会比短文档更软',
        '等宽但非编辑器：长键名与长值会按 800 px 版式折行，列的位置不保证与编辑器里逐字符对齐',
        '解析不了的 JSON 直接报错，不会给你一份空白 PDF；单个文件上限 100 MB、一批最多 200 个',
      ],
      en: [
        'No text layer: every glyph in the PDF is a bitmap, so nothing can be selected, copied or searched. For text, take JSON to HTML (printable from the browser) or to TXT',
        'A height ceiling: whole-page capture tops out near 32768 px, and a deep or huge JSON fully expanded easily exceeds it — the job then reports an over-tall page and tells you to split, instead of truncating quietly',
        'Resolution steps down with page height (2 / 1.5 / 1 pixel ratio), so a very tall document comes out softer than a short one',
        'Monospaced, not an editor: long keys and long values wrap to the 800 px layout, so columns are not guaranteed to line up character-for-character',
        'JSON that cannot be parsed fails outright rather than producing a blank PDF; 100 MB per file and 200 files per batch',
      ],
    },
    notes: {
      zh: [
        '要的是能全文检索的档案：走 JSON 转 HTML，浏览器里直接 Ctrl+P 打印，得到带文字层的 PDF',
        '要的是当图表存档：走 JSON 转 PNG，一张图看完整个结构',
        '要的是能继续筛排的表格数据：先把 JSON 转 CSV 或 Excel，再决定要不要出 PDF',
      ],
      en: [
        'For a searchable archive: take JSON to HTML and print it from the browser, which yields a PDF with a real text layer',
        'For a picture of the structure to file away: take JSON to PNG, one image showing the whole tree',
        'For data you still want to filter: convert JSON to CSV or Excel first, then decide whether a PDF is the right end product',
      ],
    },
    faq: [
      {
        q: {
          zh: 'PDF 里的文字能搜索或复制吗？',
          en: 'Can I search or copy the text in that PDF?',
        },
        a: {
          zh: '不能。这条链路的终点是「整页渲染成位图再按 A4 分页」，产物不含文字层，也无法嵌入字体子集。这么选的代价是可搜索性，换来的是不需要把查看器的排版权交给字体嵌入逻辑——要文字层就转 HTML 再自行打印。',
          en: 'No. The route ends at “render the page to a bitmap, slice it into A4”, so the artefact has no text layer and no embedded font subsets. The cost is searchability; what it avoids is handing the viewer’s typography to a font-embedding step. For a text layer, convert to HTML and print it yourself.',
        },
      },
      {
        q: {
          zh: '为什么报「页面过高」而不是给我一份截断的 PDF？',
          en: 'Why does it report an over-tall page instead of just truncating?',
        },
        a: {
          zh: '整页捕获的上限约 32768 px，浏览器在远超这个高度时返回的往往是空白画布——那种「成功但全白」比一条明确的错误难查得多。所以这里选择当场失败并提示分段（或改转 HTML / PNG）。',
          en: 'Whole-page capture caps out near 32768 px, and browsers well beyond that return a blank canvas — “succeeded, but all white” is far harder to diagnose than a clear error. So this fails loudly and suggests splitting, or going to HTML / PNG instead.',
        },
      },
      {
        q: {
          zh: '折叠起来的那些节点会不出现在 PDF 里吗？',
          en: 'Will nodes I collapsed be missing from the PDF?',
        },
        a: {
          zh: '不会。查看器渲染时所有对象与数组都是展开状态，PDF 拍到的是完整的树——包括很深的一层。反过来说，这也正是高度容易吃满的原因。',
          en: 'No. The viewer renders every object and array expanded, so the PDF captures the whole tree, however deep. That is exactly why the page height runs away, too.',
        },
      },
      {
        q: {
          zh: '接口返回的原始 JSON 会外发吗？',
          en: 'Is the raw JSON from an API ever sent anywhere?',
        },
        a: {
          zh: '不会。解析、渲染、净化、分页、写 PDF 全在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，全程零网络请求。',
          en: 'No. Parsing, rendering, sanitising, slicing and writing the PDF all happen inside the extension’s own tab: the storage permission only, no host permissions, and no requests at any point.',
        },
      },
    ],
  },
  {
    slug: 'json-to-txt',
    from: 'json',
    to: 'txt',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转纯文本——离线、逐行可读、不上传',
      en: 'JSON to plain text offline, readable line by line, no upload',
    },
    desc: {
      zh: '把 JSON 变成结构查看器那份可读文字：每个键值各占一行、引号保留，配色与缩进不带过去。全程离线，文件不出本机。',
      en: 'JSON becomes the viewer’s readable text: one key and value per line, quotes kept, colour and indentation lost. Fully offline — nothing is uploaded.',
    },
    lede: {
      zh: '想要「能读的 JSON」但不想要 HTML 那层壳，这条路的产物就是一段纯文本。它是两步合成的：先把 JSON 渲染成可折叠的语法高亮查看器，再从那份页面里提取可读文字。实测一份三条记录的对象数组，拿到的是这样的形状——`[ Array(3){ Object(4)"name": "Alice",` 然后每个键各占一行、以 `},` 分隔、末尾收一个 `]`。也就是说：层级、数组与对象的**计数摘要**（`Array(3)`、`Object(4)`）会以文字留下来，字符串带引号、数字与布尔不带；而查看器里的缩进是 CSS 边距、颜色是样式，**都不会变成字符**。所以它适合贴进工单、聊天或纯文本笔记，不适合当成缩进良好的 JSON 副本——那份直接用原文件就好。',
      en: 'Sometimes you want readable JSON without the HTML wrapper, and this route hands back plain text. It is two steps: the file is rendered as a collapsible, syntax-coloured viewer, and the readable text is then extracted out of that page. Measured on an array of three objects, the result starts `[ Array(3){ Object(4)"name": "Alice",`, each key lands on its own line, records are separated by `},` and the file closes with `]`. So the structure and the `Array(3)` / `Object(4)` count summaries survive as words, strings keep their quotes while numbers and booleans do not — and the viewer’s indentation is a CSS margin and its colours are styles, which means **neither becomes a character**. Good for a ticket, a chat message or a notes file; not a substitute for a nicely indented JSON copy, which is what the original already is.',
    },
    keeps: {
      zh: [
        '逐行结构：每个键值对占一行，对象之间以 `},` 分开，数组与对象的开头带着 `Array(n)` / `Object(n)` 的计数摘要',
        '值按 JSON 类型呈现：字符串带引号，数字、布尔与 `null` 不带——所以 `30` 与 `"30"` 在文本里仍然分得开',
        '中文、emoji 与其他非 ASCII 字符按 UTF-8 原样保留，不会被转义成 `\\uXXXX`',
        '提取只读文字：脚本、样式这些节点整段不进入结果，页面里指向网络的引用也从不被请求',
      ],
      en: [
        'Line by line: one key and value per line, records separated by `},`, and arrays and objects carry their `Array(n)` / `Object(n)` count at the opening',
        'Values keep their JSON type in the text: strings are quoted while numbers, booleans and `null` are not, so `30` and `"30"` stay distinguishable',
        'Chinese text, emoji and other non-ASCII characters survive as UTF-8 and are not escaped into `\\uXXXX`',
        'Only text is extracted: script and style nodes never enter the result, and nothing the page points at on the network is ever fetched',
      ],
    },
    limits: {
      zh: [
        '没有缩进：查看器的层级是 CSS 边距与 `<details>` 折叠，不是空格或制表符，所以纯文本里只有换行表示层级',
        '没有配色与折叠交互：颜色与「点开看」都随 HTML 一起消失，只剩结构与摘要文字',
        '键的顺序与源文件一致，但对象内的键不会被重排或补全——缺的键就是没有那一行',
        '深层嵌套或超大文档会产出一段极长的文本：它是整份一次写出的，不做分页也不截断（要翻页就留在 HTML 那份）',
        '解析不了的 JSON 直接报错，不会给你一段半截文字；单个文件上限 100 MB、一批最多 200 个',
      ],
      en: [
        'No indentation: the viewer’s hierarchy is a CSS margin and `<details>` folding rather than spaces or tabs, so in plain text only line breaks mark depth',
        'No colour and no folding: the palette and the click-to-open behaviour leave with the HTML, and structure plus the count summaries are all that remains as words',
        'Key order follows the source, but nothing is invented or reordered inside an object — a key a record lacks simply has no line',
        'A deep or huge document yields a very long piece of text: it is written out whole, without pagination or truncation (stay on the HTML when you need to skim)',
        'JSON that cannot be parsed fails instead of returning half a file; 100 MB per file and 200 files per batch',
      ],
    },
    notes: {
      zh: [
        '要的是能对着屏幕读并顺手折叠：走 JSON 转 HTML，同一份内容、带配色与折叠，还能在浏览器里直接打印',
        '要的是能贴进表格或文档：JSON 转 CSV（对象数组按键取并集，缺的键留空）或转 Word',
        '只想取某个字段的值：本项目不做 JSONPath / jq 那类查询——转成 HTML 用浏览器搜索，或本地用命令行工具更合适',
      ],
      en: [
        'To read it on screen with folding and colour: take JSON to HTML — same content, plus the palette and click-to-open, printable straight from the browser',
        'To paste it into a table or document: take JSON to CSV (an array of objects becomes columns from the union of keys, missing ones left empty) or to Word',
        'To pull out one field’s value: this project does not do JSONPath or jq-style queries — search the HTML output in a browser, or use a command-line tool locally',
      ],
    },
    faq: [
      {
        q: {
          zh: '转出来的文本还是缩进良好的 JSON 吗？',
          en: 'Is the result nicely indented JSON?',
        },
        a: {
          zh: '不是。产物是查看器那份内容的文字提取，层级靠换行与 `Array(n)` / `Object(n)` 摘要表达，而不是靠空格。要规整缩进的 JSON，直接用源文件（工作台可预览并编辑文本），或用命令行 `jq .`。',
          en: 'No. The artefact is text extracted from the viewer, so depth shows as line breaks and `Array(n)` / `Object(n)` counts rather than as spaces. For indented JSON, use the source file (the workbench previews and lets you edit text) or `jq .` on the command line.',
        },
      },
      {
        q: {
          zh: '那行 `Object(4)` 是什么？会不会污染数据？',
          en: 'What is that `Object(4)` — does it pollute the data?',
        },
        a: {
          zh: '它是查看器给每个对象与数组的计数摘要，随文字一起被提取出来（实测：`[ Array(3){ Object(4)"name": "Alice",`）。它是给人读的辅助信息，但如果你要把文本再喂回程序，请选 JSON 转 CSV 或直接保留 .json。',
          en: 'It is the viewer’s count summary for each object and array, extracted along with the text (measured: `[ Array(3){ Object(4)"name": "Alice",`). It exists to be read by a person; if the text is going back into a program, take JSON to CSV or keep the .json instead.',
        },
      },
      {
        q: {
          zh: '含 token 或身份证号的 JSON 会离开这台电脑吗？',
          en: 'Does JSON containing tokens or ID numbers ever leave this machine?',
        },
        a: {
          zh: '不会。解析、渲染、提取文字都在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径。',
          en: 'No. Parsing, rendering and text extraction all happen inside the extension’s own tab: the storage permission only, no host permissions, and no path in the bundle that executes remotely hosted code.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-txt',
    from: 'csv',
    to: 'txt',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'CSV 转纯文本——离线、制表符分隔、不上传',
      en: 'CSV to plain text offline, tab separated, no upload',
    },
    desc: {
      zh: '把 CSV 变成制表符分隔的纯文本：一行一条记录、值原样保留，贴进聊天记录或纯文本编辑器都不散列。全程离线，不经过服务器。',
      en: 'A CSV becomes tab-separated plain text: one record per line, values as written, so it pastes into chat or a text editor without breaking columns.',
    },
    lede: {
      zh: '逗号分隔的表格贴进聊天窗口经常就散了——值里有个逗号就整行错位。这条路先把 CSV 交给 SheetJS 的解析器（引号里的逗号、字段内换行都按 CSV 语法算成一个单元格），渲染成 HTML 表格，再从表格里提取文字：单元格之间以制表符分隔、一行一条记录、首行也照样是一行。实测一份四列的表得到 `名称\\t数量\\t单价\\t\\n苹果\\t3\\t5.5\\t\\n…`，也就是每行末尾会多出一个制表符（提取实现如此，只有文件最后一行被去尾空白清掉）。值本身不做任何加工：`00123` 还是 `00123`，`2024-01-05` 不会被换成日期序列号。',
      en: 'Pasting comma-separated data into a chat window usually breaks it: one comma inside a value and the row is misaligned. This route first hands the CSV to SheetJS’s parser — a quoted comma or a newline inside a field stays one cell — renders it as an HTML table, and then extracts text from that table: cells separated by tabs, one record per line, the first row treated as just another row. Measured on a four-column sheet, the output is `名称\\t数量\\t单价\\t\\n苹果\\t3\\t5.5\\t\\n…`, i.e. each line carries a trailing tab as well (that is how the extraction works; only the file’s last row loses it to trimming). Values are not touched: `00123` stays `00123`, and `2024-01-05` is not turned into a date serial.',
    },
    keeps: {
      zh: [
        '单元格之间是制表符、每行一条记录：贴进纯文本编辑器、聊天窗口或对齐齐宽字体的终端里都不会因值内逗号而错位',
        '首行不被当表头消耗（不像 CSV 转 JSON 那样用它给列命名），一份 20 行的表转出去还是 20 行',
        '值按文件里的字符原样呈现：前导零、连字符、分数样式的 `1/2` 都不会被重新解释',
        '带引号的逗号、字段内换行、成对引号转义都按 CSV 语法解析成一个单元格，而不是按逗号切字符串',
      ],
      en: [
        'Tabs between cells and one record per line: pasted into a text editor, a chat window or a monospaced terminal, a comma inside a value cannot shift the row',
        'The first row is not spent naming columns (unlike CSV to JSON), so a 20-row sheet still yields 20 lines',
        'Values appear as the file’s own characters: leading zeros, hyphens and fraction-looking `1/2` are not reinterpreted',
        'Quoted commas, newlines inside a field and doubled quote escapes all parse into one cell under CSV’s grammar rather than a string split on commas',
      ],
    },
    limits: {
      zh: [
        '每行末尾多一个制表符：提取时每个单元格都跟一个制表符，只有文件最后一行被去尾空白清掉。看着像「对齐的表」，要拿去当 TSV 用请自己去掉行尾制表符',
        '字段内的换行会被折进那一行：纯文本一行就是一条记录，跨行的值不再保留原排版（要留住换行就走 CSV 转 HTML）',
        '产物是 UTF-8 **不带 BOM**：Windows 记事本一类按本地编码猜的工具可能把中文显示成乱码，遇到这种情况请用 CSV 转 Excel 或直接留 .csv',
        '没有任何样式：字体、列宽、合并、数字格式都不存在，源文件本来也没有',
        '空单元格保留为相邻的两个制表符（不是省略），所以列位置对得齐；一批最多 200 个文件、单个上限 100 MB，多份逐个产出各自的 .txt',
      ],
      en: [
        'A trailing tab ends each line: every cell contributes one, and only the file’s last row loses it to trimming. It reads as an aligned table, but strip the trailing tabs before treating it as real TSV',
        'Newlines inside a field get folded into the line: plain text is one record per line, so the original layout inside a cell is not kept (take CSV to HTML to preserve them)',
        'The artefact is UTF-8 **without a BOM**: tools that guess a local encoding can render Chinese as mojibake — use CSV to Excel, or keep the .csv, when that happens',
        'No styling at all: fonts, column widths, merges and number formats do not exist here, and the source file never had them',
        'Empty cells stay as adjacent tabs rather than vanishing, so columns still line up; up to 200 files per batch and 100 MB each, several files yielding one .txt apiece',
      ],
    },
    notes: {
      zh: [
        '要的是能继续算的数据表：走 CSV 转 Excel，或直接保留 .csv——纯文本这一格是给人读和贴的，不给程序解析用',
        '要的是能排版的表格：CSV 转 Markdown（管道表，格子里的竖线会被转义）或 CSV 转 HTML、转 Word',
        '只想看看有几行、字段是什么：CSV 转 JSON 会拿首行当键名，逐条对象更好读，但行数与列序仍以这份 CSV 为准',
      ],
      en: [
        'For data you still want to compute on: take CSV to Excel, or keep the .csv — this plain-text step is for reading and pasting, not for a program to parse',
        'For a table that keeps its layout: CSV to Markdown (a pipe table, with pipes inside cells escaped), or CSV to HTML or Word',
        'To see how many rows there are and what the fields are: CSV to JSON spends the first row on key names and reads better per record, but the row count and column order still come from this CSV',
      ],
    },
    faq: [
      {
        q: {
          zh: '这算是一份 TSV 吗？',
          en: 'Is this a TSV file?',
        },
        a: {
          zh: '形状像但不严格：每行末尾多一个制表符（最后一行除外），也没有 TSV 的引号规则。当「贴进聊天里的对齐文本」用它正好；要真 TSV，请自己去掉行尾制表符，或直接以 .csv 交付。',
          en: 'Close but not strict: every line but the last ends with an extra tab, and there are no TSV quoting rules. As aligned text to paste into a chat it is exactly right; for real TSV, strip the trailing tabs or ship the .csv.',
        },
      },
      {
        q: {
          zh: '值里有逗号或换行会怎样？',
          en: 'What about commas or newlines inside a value?',
        },
        a: {
          zh: '逗号没问题——那正是先按 CSV 语法解析的原因，一个带引号的逗号不会把行拆开。换行会被折进那一行，因为纯文本一行就是一条记录；这类值请走 CSV 转 HTML 或转 Excel。',
          en: 'Commas are fine — that is precisely why the file is parsed under CSV grammar first, so a quoted comma cannot split the row. Newlines fold into the line, because plain text is one record per line; take CSV to HTML or Excel for those values.',
        },
      },
      {
        q: {
          zh: '订单或名单这类表格数据会被上传吗？',
          en: 'Is order or contact data ever uploaded?',
        },
        a: {
          zh: '不会。解析 CSV、生成表格、提取文字都在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，全程零网络请求。',
          en: 'No. Parsing the CSV, building the table and extracting the text all happen inside the extension’s own tab: the storage permission only, no host permissions, and no requests at any point.',
        },
      },
    ],
  },
  {
    slug: 'json-to-word',
    from: 'json',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转 Word 文档——离线、可批量、不上传',
      en: 'JSON to Word document offline, in batches, no upload',
    },
    desc: {
      zh: '把 JSON 的结构交给 .docx：产物里带的是那份可折叠查看器的 HTML，Word 打开时才排版。全程离线，文件不出本机。',
      en: 'JSON becomes a .docx carrying the structure viewer’s own HTML: Word lays it out when the file opens. Fully offline — nothing is uploaded.',
    },
    lede: {
      zh: '「把 JSON 变成 Word」在这条路上不是一句口号，而是一个明确的取舍：先由 JSON 生成可折叠、带语法着色的查看器 HTML，再把这份 HTML **原样封装**进 .docx 的一个 MHTML altChunk 部件里（实测产物是一个含 `[Content_Types].xml` 与 `/word/document.xml` 的 OPC 容器）。也就是说，扩展不自己去拼 Word 的 XML 正文，排版发生在 **Word 打开文件的那一刻**——这与 TXT 转 Word、HTML 转 Word 是同一条机制。好处是结构与层级完整带过去，且不需要在本机实现一份 OOXML 写入器；代价是最终观感由 Word 的 HTML 引擎决定，我们无法在本机替它保证颜色与折叠的表现。',
      en: '“JSON into Word” on this route is a concrete trade-off rather than a slogan: the file first becomes a collapsible, syntax-coloured viewer, and that HTML is packaged **as it stands** into one MHTML altChunk part inside the .docx (measured: the artefact is an OPC container holding `[Content_Types].xml` and `/word/document.xml`). In other words, this extension does not assemble WordprocessingML itself — layout happens **when Word opens the file**, the same mechanism as TXT to Word and HTML to Word. What that buys is structure and hierarchy carried across whole, without a hand-written OOXML writer on the client; what it costs is that Word’s HTML engine decides the result, and nothing on this machine can promise how colour or folding will look there.',
    },
    keeps: {
      zh: [
        '结构与层级完整带走：键、值、对象与数组的嵌套关系来自同一份查看器 HTML，不会被压成一整段等宽文字',
        '计数摘要以文字形式留在文档里（实测形如 `Array(3)`、`Object(4)`），所以「这里本来有几项」在纸面上也读得到',
        '字符串带引号、数字与布尔不带，`null` 原样写出；中文与非 ASCII 按 UTF-8 保留，不会变问号',
        '产物是真正的 .docx 容器而不是改了扩展名的 HTML：Word 在「最近使用的文档」里认得它，也能直接附件发送',
      ],
      en: [
        'Structure and hierarchy travel intact: keys, values and the nesting of objects and arrays come from the same viewer HTML rather than being flattened into one block of monospaced text',
        'The count summaries stay in the document as words (measured shapes like `Array(3)` and `Object(4)`), so “how many items were here” is still readable on paper',
        'Strings keep their quotes while numbers and booleans do not, `null` is written as itself, and Chinese or other non-ASCII text survives as UTF-8 instead of turning into question marks',
        'The artefact is a real .docx container rather than HTML wearing a new extension: Word recognises it in recent documents and it attaches to mail as expected',
      ],
    },
    limits: {
      zh: [
        '**排版由 Word 决定**：altChunk 是「把 HTML 交给 Word 渲染」，所以字体、行距、分页位置都取决于打开它的那一份 Word；同一份文件在 LibreOffice 或 Google Docs 里可能不同',
        '语法配色与折叠属于尽力而为：颜色是 CSS，能不能被 Word 的 HTML 引擎采纳我们不在本机替你保证；折叠依赖 `<details>`，Word 可能按普通段落展开呈现',
        '不做「按记录成表」：文档里是树形视图，不是一张可以筛选排序的表。要表格请用 JSON 转 CSV（对象数组按键取并集）或转 Excel',
        '没有文字层之外的检索保证：能在 Word 里搜到的只是文档里那些文字，结构与计数摘要也在其中；深结构文档篇幅可观，翻页是常态',
        '解析不了的 JSON 直接报错，不产出一份空文档；单个文件上限 100 MB、一批最多 200 个，多份一起转会打包成 ZIP',
      ],
      en: [
        '**Word owns the layout**: an altChunk means “hand the HTML to Word to render”, so face, line spacing and where pages break depend on the Word that opens the file — the same document can look different in LibreOffice or Google Docs',
        'Syntax colour and folding are best-effort: colours live in CSS, which we do not certify against Word’s HTML engine from this machine, and folding depends on `<details>`, which Word may present as ordinary expanded paragraphs',
        'No “records into a table”: the document holds a tree view, not something to filter and sort. For a table, take JSON to CSV (an array of objects becomes columns from the union of keys) or to Excel',
        'No search guarantee beyond words: what is findable in Word is the text in the document, count summaries included, and a deep structure runs to pages',
        'JSON that cannot be parsed fails instead of producing an empty document; 100 MB per file and 200 files per batch, several files handed over as one ZIP',
      ],
    },
    notes: {
      zh: [
        '要在 Word 里继续编辑成一份正式文档：先 JSON 转 Markdown 再转 Word，或直接 JSON 转 HTML 后由 Word 打开，都能拿到更可预测的段落结构',
        '要的是一张能算的表：走 JSON 转 CSV 或转 Excel；要一份能归档的完整树：JSON 转 PDF 或转 HTML',
        '这份 .docx 只在 Word 里才见到最终版式：交付前请自己打开确认一次，尤其是包含配色或需要折叠层级的场合',
      ],
      en: [
        'To keep editing it as a formal document in Word: JSON to Markdown to Word, or JSON to HTML opened by Word, both give more predictable paragraph structure',
        'For a table you can compute on: take JSON to CSV or to Excel; for an archivable full tree: JSON to PDF or to HTML',
        'The .docx only shows its final layout inside Word: open it once before delivery, especially where colour or collapsed levels matter',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么不在本地直接生成 Word 的 XML？',
          en: 'Why not generate Word’s XML locally instead?',
        },
        a: {
          zh: '因为那要在浏览器里自己实现并长期维护一份 OOXML 写入器，而 altChunk 让 Word 用它自己的引擎渲染同一份 HTML。这一步是刻意的取舍：结构完整带走、代码不多一份，代价是版式归 Word 而不是归我们。',
          en: 'Because that means implementing and maintaining an OOXML writer inside the browser, whereas an altChunk lets Word render the same HTML with its own engine. The trade is deliberate: structure travels whole and no extra writer ships, and in exchange layout belongs to Word rather than to us.',
        },
      },
      {
        q: {
          zh: '颜色会丢吗？',
          en: 'Will the syntax colours be lost?',
        },
        a: {
          zh: '不好保证。颜色写在 CSS 里，altChunk 交给 Word 的 HTML 引擎解释，本机没有 Word 可以替你验证它到底采纳哪些——所以页面只承诺「结构与文字完整带走」，不承诺配色一致。介意这点就走 JSON 转 PDF（画面一致但不能改字）或转 HTML。',
          en: 'It cannot be promised. Colours live in CSS and the altChunk hands them to Word’s HTML engine, and there is no Word on this machine to certify which rules it honours — so the page promises structure and text, not a matching palette. If that matters, take JSON to PDF (same picture, no editing) or to HTML.',
        },
      },
      {
        q: {
          zh: '接口返回的原始 JSON 会外发吗？',
          en: 'Does the raw API response ever leave the machine?',
        },
        a: {
          zh: '不会。解析、渲染、封装 .docx 都在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，产物里也没有把远端资源当代码执行的路径。',
          en: 'No. Parsing, rendering and packaging the .docx all happen inside the extension’s own tab: the storage permission only, no host permissions, and no path in the bundle that executes remotely hosted code.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-txt',
    from: 'md',
    to: 'txt',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 转纯文本——离线、按阅读顺序、不上传',
      en: 'Markdown to plain text offline, in reading order, no upload',
    },
    desc: {
      zh: '去掉记号、留下阅读顺序：标题变成一行文字，链接把地址附在文字后，列表按位置重新编号。全程离线，不经过服务器。',
      en: 'Strip the markup: headings become lines, links keep their URL after the text, and ordered lists are renumbered. Offline — nothing is uploaded.',
    },
    lede: {
      zh: '很多地方只吃纯文本——工单系统、聊天的代码框以外、另一个编辑器的查找替换。这条路先把 Markdown 渲染成 HTML，再从那份 DOM 里按阅读顺序抽文字。实测一篇含标题、列表、表格、链接与图片的文档，得到的是：`# 标题` 变成一行「标题」，`**粗**` 与 `` `代码` `` 只剩文字，`- 项目` 变成**没有符号的一行**，有序列表按位置重新编号并给嵌套层每层两个空格，链接写成 `文字 [https://…]`，图片写成 `[Image: 替代文字]`。也就是说，这一层保的是「谁在谁前面、谁属于哪一层」，而不是「哪一段是几级标题」。表格是这步最容易意外的地方：实测每个单元格各占一行、后面跟一个制表符，因为渲染器会在单元格之间写换行、而提取器照抄。',
      en: 'Plenty of destinations accept nothing but plain text — ticket systems, the parts of a chat outside its code box, another editor’s find-and-replace. This route renders the Markdown to HTML first, then walks that DOM in reading order. Measured on a document holding a heading, lists, a table, a link and an image: `# Title` becomes the single line “Title”, `**bold**` and `` `code` `` keep only their words, `- item` becomes **a line with no bullet**, ordered lists are renumbered by position with two spaces of indent per nesting level, a link becomes `text [https://…]`, and an image becomes `[Image: alt text]`. What this layer preserves is who comes before whom and what nests inside what — not which paragraph was a level-two heading. Tables are where people get surprised: measured, every cell lands on its own line followed by a tab, because the renderer writes newlines between cells and the extractor copies them.',
    },
    keeps: {
      zh: [
        '阅读顺序与层级：标题、段落、列表项依次换行，嵌套列表每层缩进两个空格（最多 6 层，再深也不会把结构抹平）',
        '有序列表按位置重新编号，并尊重 `start`（`start="3"` 的列表从 3 开始），列表项不会被并进上一段',
        '链接把地址留在文字后面（`文字 [https://…]`），页内锚点与 `mailto:` 则只留文字',
        '图片用 `alt` 写成 `[Image: 替代文字]`，没有 alt 时写 `[Image]`，不会整个消失',
      ],
      en: [
        'Reading order and nesting: headings, paragraphs and list items each break the line, nested lists indent two spaces per level, capped at six, so structure is never flattened away',
        'Ordered lists are numbered by position and honour `start` (a list starting at 3 begins at 3), and an item is never merged into the paragraph above it',
        'A link keeps its address after the text as `text [https://…]`; in-page anchors and `mailto:` contribute text only',
        'Images become `[Image: alt text]` from their alt attribute, or `[Image]` when there is none, so nothing simply vanishes',
      ],
    },
    limits: {
      zh: [
        '无序列表的项目符号不保留：`- ` 与 `* ` 都会变成一行干净文字，靠换行表示「这是一条列表」',
        '表格不成行：实测单元格各占一行、后面跟一个制表符（渲染器在单元格之间写换行、提取器照抄）。要留表格请用 Markdown 转 HTML 或转 Word',
        '记号一律消失：标题层级、加粗、斜体、行内代码、围栏代码块的 ``` 都不进产物；任务清单的复选框也只剩后面的文字',
        '不执行 CSS，也不判断可见性：`display:none` 区域的文字照样会被抽出来；脚本与 `<style>` 整段丢弃',
        '产物是 UTF-8 纯文本、不带 BOM；三个以上连续换行压成两个，首尾空白被清掉',
      ],
      en: [
        'Bullets do not survive: both `- ` and `* ` become a clean line, and the line break alone says “this was a list”',
        'Tables do not stay on one line: measured, each cell lands on its own line followed by a tab, because the renderer writes newlines between cells and the extractor copies them. Use Markdown to HTML or to Word to keep a table',
        'All notation disappears: heading levels, bold, italic, inline code and fenced ``` markers are not in the output, and a task list keeps only the words after its checkbox',
        'Nothing about CSS or visibility is judged: text hidden by `display:none` is still extracted, while `script` and `<style>` are dropped whole',
        'The artefact is UTF-8 plain text without a BOM; runs of three or more newlines collapse to two and the ends are trimmed',
      ],
    },
    notes: {
      zh: [
        '要去掉记号但**保留表格**：走 Markdown 转 HTML（管道表成为真的 `<table>`）或转 Word',
        '要的是能打印、版式固定的成品：Markdown 转 PDF（整页渲染成图片，没有文字层）',
        '反方向也通：纯文本转 Markdown 会把整篇包进一个代码块，代码块长度不足时自动加长围栏，不会截断内容',
      ],
      en: [
        'To drop the notation but keep the table: take Markdown to HTML (the pipe table becomes a real `<table>`) or to Word',
        'For a fixed, printable artefact: Markdown to PDF, which renders whole pages to images and has no text layer',
        'The way back is deliberately lossy-safe: TXT to Markdown wraps the whole file in a code fence, lengthening it when the content already contains backticks, so nothing is cut off',
      ],
    },
    faq: [
      {
        q: {
          zh: '项目符号和标题层级都会没有吗？',
          en: 'Do the bullets and heading levels really disappear?',
        },
        a: {
          zh: '是。这一层的产物是纯文本，没有表示「二级标题」或「这一项是列表项」的语法，所以只留下换行、缩进与编号。要是你需要保住层级语义，选 Markdown 转 HTML 或转 Word。',
          en: 'Yes. Plain text has no syntax for “this was a level-two heading” or “this line is a list item”, so what remains is line breaks, indentation and numbering. If that semantics matters, take Markdown to HTML or to Word.',
        },
      },
      {
        q: {
          zh: '表格转出来为什么一格一行？',
          en: 'Why does my table come out one cell per line?',
        },
        a: {
          zh: '因为中间那步渲染器会在单元格之间写换行，而文字提取会把换行照抄进去（实测 `Name\t\nValue\t\n`）。同一条提取用在紧凑排版的表格上就是一行一条记录——差别只在源 HTML 的写法。要留表格请用转 HTML 或转 Word。',
          en: 'The renderer in the middle step writes newlines between cells, and the extractor copies them (measured: `Name\t\nValue\t\n`). The same extraction on a compactly formatted table gives one record per line — the difference is entirely how the source HTML is written. Keep the table by going to HTML or Word.',
        },
      },
      {
        q: {
          zh: 'README 里有敏感链接，转完会漏出去吗？',
          en: 'My README has private links — could converting leak them?',
        },
        a: {
          zh: '不会。渲染与提取都在扩展自己的标签页里完成，产物里也不请求网络；只申请 storage 权限、没有 host 权限。链接地址反而会被显式保留在文字后面，所以转出后可见范围由你决定。',
          en: 'No. Rendering and extraction happen inside the extension’s own tab, the artefact requests nothing, and the manifest carries the storage permission only. Link addresses are kept visibly after their text, so you decide who sees the result.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-html',
    from: 'txt',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'TXT 转 HTML 页面——离线、原样转义、不上传',
      en: 'TXT to HTML page offline, escaped as written, no upload',
    },
    desc: {
      zh: '把纯文本包成一个能直接打开的 HTML 页面：字符逐一转义、换行保留为 `<br>`、整段落在 `<pre>` 里，不把任何内容当标记解释。',
      en: 'Plain text becomes an HTML page you can open: characters escaped, line breaks kept, the body wrapped in `<pre>` with nothing interpreted as markup.',
    },
    lede: {
      zh: '手里是一份日志、一段代码输出或一个转义过的文本，想让它「在浏览器里像它自己」——要的是网页外壳，不是重新排版。这条路只做三件事：把 `&`、`<`、`>` 转成实体，把每个换行写成 `<br>`，然后把整段放进一个 `<pre>`；文档标题取你自己的文件名。所以它与 Markdown 那条路的关键区别是**不解释任何记号**：`# 井号` 就是井号，`* 星号` 就是星号，贴 HTML 片段也只会以字符显示，不会被执行。产物是自包含的单份 HTML，双击就能打开，也可以继续被本扩展转成 Word、PDF 或图片。',
      en: 'Sometimes what you have is a log, a code dump or an escaped blob of text, and you want it to behave like itself in a browser — a page wrapper, not a re-layout. This route does three things and no more: `&`, `<` and `>` become entities, every newline becomes `<br>`, and the whole block is placed inside a single `<pre>`, with your own file name as the page title. The difference from the Markdown route is that **no notation is interpreted**: `# hash` stays a hash, `* star` stays a star, and pasted HTML shows up as characters instead of running. The artefact is one self-contained page you can double-click, and it can go on through this extension to Word, PDF or an image.',
    },
    keeps: {
      zh: [
        '换行与连续空格：`<pre>` 原样保留缩进、对齐与制表符，日志和代码块的形状不变',
        '字符按字面呈现：`&`、`<`、`>` 转成实体，贴进去的标签只会显示为文字，不会成为活的标记',
        '文档标题取你自己的文件名，浏览器标签页与收藏里认得出来',
        '编码不是前提：先按 BOM 与 NUL 分布嗅探 UTF-16，再依次尝试 UTF-8 → GB18030 → GBK；四种都读不出文本时直接报错，不产出一份乱码页面',
      ],
      en: [
        'Line breaks and runs of spaces: `<pre>` keeps indentation, alignment and tabs, so a log or code dump holds its shape',
        'Characters appear literally: `&`, `<` and `>` become entities, so markup pasted in stays visible text and never becomes live markup',
        'The document title comes from your own file name, so the browser tab and a bookmark still identify it',
        'The encoding is not a precondition: UTF-16 is sniffed from the BOM and the NUL pattern first, then UTF-8 → GB18030 → GBK, and a file none of them can read fails instead of shipping a mojibake page',
      ],
    },
    limits: {
      zh: [
        '不识别 Markdown：`#`、`-`、`|`、围栏反引号都只是字符，想要标题与表格请用 TXT 转 Markdown 或直接写 .md',
        '整篇是一个 `<pre>` 块：没有标题层级、没有列表结构，屏幕阅读器读到的就是一大段等宽预格式化文字',
        '超长的行不会被折：`<pre>` 保持原样，窄窗口里可能出现横向滚动条（要自动折行请自行改 CSS 或走 Word 路线）',
        '产物只带默认版式（字体与留白来自文档自身的样式表），不带目录、高亮、行号这些编辑器功能',
        '一批最多 200 个文件、单个上限 100 MB；多份一起转逐个产出各自的 .html，想一次拿走就打成一个 ZIP',
      ],
      en: [
        'No Markdown is read: `#`, `-`, `|` and backtick fences stay characters — use TXT to Markdown, or write .md, when you want headings and tables',
        'The file is one `<pre>` block: no heading levels and no list structure, so a screen reader meets a single run of monospaced preformatted text',
        'Long lines are not wrapped: `<pre>` keeps them, so a narrow window can show a horizontal scrollbar (adjust the CSS yourself, or take the Word route)',
        'The page carries default typography only — fonts and padding from the document’s own stylesheet, with no table of contents, syntax highlighting or line numbers',
        'Up to 200 files per batch and 100 MB each; several files yield one .html apiece and can be taken as a single ZIP',
      ],
    },
    notes: {
      zh: [
        '想要带配色与折叠的结构化视图：那是 JSON 转 HTML 或 CSV 转 HTML 在做的事，这条只保证「像它自己」',
        '想给纯文本加上结构与样式再交付：TXT → Markdown → Word（或 → HTML 后自行编辑），比直接包一层 `<pre>` 更可排印',
        '只想打印或存档：TXT → PDF 会把整页渲染成图片，产物没有文字层，选中不了文字',
      ],
      en: [
        'For a structured view with colour and folding: that is JSON to HTML or CSV to HTML — this route only promises “behaves like itself”',
        'To give plain text structure and styling before delivery: TXT to Markdown to Word (or to HTML and edit) typesets better than one `<pre>` wrapper',
        'To print or archive it: TXT to PDF renders whole pages to images, so that artefact has no text layer and its words cannot be selected',
      ],
    },
    faq: [
      {
        q: {
          zh: '我在文本里贴了一段 HTML，会被执行吗？',
          en: 'I pasted HTML into the text — will it execute?',
        },
        a: {
          zh: '不会。`<` 与 `&` 在写出前就被转成实体，脚本与标签在产物里只是可见字符；这也是这条路径的核心保证。',
          en: 'No. `<` and `&` are turned into entities before the file is written, so scripts and tags remain visible characters in the artefact — that is the point of this route.',
        },
      },
      {
        q: {
          zh: '为什么 `# 第一章` 没变成标题？',
          en: 'Why didn’t “# Chapter 1” become a heading?',
        },
        a: {
          zh: '因为这条路径读的是纯文本，不解释任何记号——`#` 就是字符。要标题层级，走 TXT 转 Markdown（它会整段包成代码块，所以更稳的做法是自己写 .md）或直接准备 .md 文件。',
          en: 'Because this route reads plain text and interprets no notation — `#` is a character. For headings, go TXT to Markdown (which wraps the file as a code block, so authoring .md directly is steadier) or start from a .md file.',
        },
      },
      {
        q: {
          zh: '日志里的中文和旧编码文件能正常显示吗？',
          en: 'Will Chinese text and old-encoding logs display correctly?',
        },
        a: {
          zh: '按 UTF-8 → GB18030 → GBK 依次尝试（并先嗅探 UTF-16），老编辑器导出的 GBK 日志也能读进来；实在读不出就直接报错，不给一份乱码页面。',
          en: 'UTF-8 → GB18030 → GBK are tried in turn, with UTF-16 sniffed first, so a GBK log from an older editor still reads; if nothing matches it fails rather than producing a page of mojibake.',
        },
      },
      {
        q: {
          zh: '这份日志会被上传吗？',
          en: 'Is this log uploaded anywhere?',
        },
        a: {
          zh: '不会。读取、转义、包页全在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，全程零网络请求。',
          en: 'No. Reading, escaping and wrapping all happen inside the extension’s own tab: the storage permission only, no host permissions, and no requests at any point.',
        },
      },
    ],
  },
  {
    slug: 'json-to-html',
    from: 'json',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转 HTML 查看器——离线、可折叠、不上传',
      en: 'JSON to HTML viewer offline, collapsible, no upload',
    },
    desc: {
      zh: '把 JSON 变成一份能双击打开的自包含网页：可折叠的层级树、按类型着色、数组与对象带计数，值全部作为转义文字呈现。',
      en: 'JSON becomes a self-contained page you can double-click: a collapsible tree, colour by type, array and object counts, every value escaped as text.',
    },
    lede: {
      zh: '一坨压成一行的 JSON 用编辑器看很累，而在线格式化器要把数据交出去。这条路把 JSON 解析后渲染成一棵折叠树：键、字符串、数字、布尔与 `null` 各有独立样式，每个对象与数组都是一个默认展开的 `<details>`，摘要写着 `Object(4)`、`Array(3)`，空对象与空数组直接收成 `{}`、`[]`。所有名字与值都经过转义后作为**文字**写出，所以产物里没有能被浏览器执行的标记，也没有任何指向网络的引用——文件本身也只带一份内联样式表。渲染器是显式栈的迭代实现，这一点是刻意的：递归版本在解析成功之后仍会在很深的结构上把栈耗尽，把一次正常转换报成 `RangeError`。',
      en: 'A JSON blob squeezed onto one line is painful in an editor, and an online formatter asks you to hand over the data first. This route parses the file and renders a collapsible tree: keys, strings, numbers, booleans and `null` each get their own style, every object and array is a `<details>` expanded by default whose summary reads `Object(4)` or `Array(3)`, and empty ones collapse to `{}` and `[]`. Names and values are escaped and written as **text**, so the artefact contains no markup the browser can execute and no reference to the network — the file carries one inline stylesheet and nothing else. The renderer is an explicit-stack loop rather than recursion, deliberately so: the recursive version kept exhausting the stack on very deep documents after a successful parse, turning an ordinary conversion into a `RangeError`.',
    },
    keeps: {
      zh: [
        '类型可分辨：键、字符串、数字、布尔与 `null` 各自着色，不必靠引号去猜 `30` 与 `"30"` 是不是同一个东西',
        '计数随行：折叠状态下也看得见 `Object(4)` / `Array(n)`，「这里有几项」不用展开就知道',
        '值按文字写出：所有名字与标量都先转义，产物里没有可执行标记，也没有远程引用，双击打开不会替你请求任何东西',
        '深结构不再炸栈：渲染走显式栈的迭代实现，几百层嵌套的文档也只会得到一份很长的页面，而不是 `RangeError`',
      ],
      en: [
        'Types stay distinguishable: keys, strings, numbers, booleans and `null` are coloured separately, so nobody has to guess from quotes whether `30` and `"30"` are the same thing',
        'Counts travel with the node: `Object(4)` / `Array(n)` are visible even while collapsed, so “how many items here” needs no clicking',
        'Values are written as text: names and scalars are escaped first, so the artefact carries no executable markup and no remote reference — double-clicking it asks the network for nothing',
        'Deep structures no longer blow the stack: the renderer walks an explicit work list, so a document hundreds of levels deep yields a long page instead of a `RangeError`',
      ],
    },
    limits: {
      zh: [
        '默认全部展开：折叠能力在文件里（`<details>`），但初打开时树是全开的，超大文档会得到一屏接一屏的内容',
        '产物是给人看的展示物，不是可再解析的数据源：里面没有原始字节顺序与缩进，也没有「哪层是数组哪层是对象」的可编程语义',
        '搜索与折叠操作只有浏览器自带的：产物没有本工作台预览面板里的搜索框、计数器与表格视图',
        '不做的加工：不排序键、不去重、不展开 JSON 字符串里嵌套的 JSON、也不按字段做表格投影（那是预览里的表格视图）',
        '非法 JSON 直接报错而不是尽力修复；输入按严格解码链读取（UTF-16 嗅探 + UTF-8 → GB18030 → GBK），读不出文本时报错而非产出乱码',
      ],
      en: [
        'Everything starts expanded: the folding exists in the file as `<details>`, but the tree opens fully, so a huge document is a lot of scrolling',
        'The artefact is for reading, not for parsing back: key order and indentation are not preserved as data, and there is no machine-readable meaning in which level was an array',
        'Searching and collapsing are the browser’s own: the file has none of the workbench preview’s search box, match counter or table projection',
        'No processing is done: keys are not sorted, nothing is de-duplicated, JSON inside a string is not unpacked, and no per-field table projection happens (that is the preview’s table view)',
        'Invalid JSON fails instead of being repaired; input goes through the strict decode chain (UTF-16 sniffing plus UTF-8 → GB18030 → GBK) and fails rather than producing mojibake',
      ],
    },
    notes: {
      zh: [
        '要能筛排的数据表：JSON 转 CSV（对象数组按键取并集，缺的键留空）或转 Excel',
        '要一份可归档、可打印的快照：JSON 转 PDF（整页渲染成图片，没有文字层）或转 Word',
        '只想在浏览器里读着看却不需要文件：工作台预览自带搜索、可见行计数与数组表视图，比产物更适合翻阅',
      ],
      en: [
        'For data you can filter and sort: JSON to CSV (an array of objects becomes columns from the union of keys, missing ones empty) or to Excel',
        'For an archivable, printable snapshot: JSON to PDF — whole pages of bitmaps with no text layer — or to Word',
        'To read it in the browser without needing a file: the workbench preview has search, a visible-row count and an array table view, which suits skimming better than the artefact does',
      ],
    },
    faq: [
      {
        q: {
          zh: '这个 HTML 里会不会藏着我数据里的脚本？',
          en: 'Can a script inside my data survive into the HTML?',
        },
        a: {
          zh: '不会。键与值都是先转义再写出的文字，`<script>` 之类只会显示成字符；文件里也没有任何指向网络的引用。这也是本项目对「不可信输入」的统一做法：渲染边界先净化或转义。',
          en: 'No. Names and values are escaped before they are written, so `<script>` shows up as characters, and the file references nothing on the network. That is the project’s standing rule for untrusted input: sanitise or escape at the rendering boundary first.',
        },
      },
      {
        q: {
          zh: '为什么打开后没有搜索框？',
          en: 'Why is there no search box in the file?',
        },
        a: {
          zh: '产物是纯静态展示标记，搜索、匹配计数与数组表视图属于工作台的预览面板。要用浏览器的 Ctrl+F，或者回到工作台里预览。',
          en: 'The artefact is static presentation markup; search, match counts and the array table view belong to the workbench preview. Use the browser’s Ctrl+F, or preview inside the workbench.',
        },
      },
      {
        q: {
          zh: '很大的 JSON（几十 MB）能转吗？',
          en: 'Will a very large JSON file (tens of MB) convert?',
        },
        a: {
          zh: '能试，但有界：单个文件上限 100 MB、一批最多 200 个。深结构不会再炸栈，但产物会是非常长的一页——真要翻阅建议先在源头分段，或改用转 CSV / Excel。',
          en: 'You can try: 100 MB per file and 200 files per batch. Deep structures no longer exhaust the stack, but the result is a very long page — for real skimming, split the source or take CSV / Excel instead.',
        },
      },
      {
        q: {
          zh: '数据会离开这台电脑吗？',
          en: 'Does the data ever leave this machine?',
        },
        a: {
          zh: '不会。解析、着色、折叠标记全部在扩展自己的标签页里完成，只申请 storage 权限、没有 host 权限，全程零网络请求。',
          en: 'No. Parsing, colouring and the folding markup all happen inside the extension’s own tab: the storage permission only, no host permissions, and no requests at any point.',
        },
      },
    ],
  },
  {
    slug: 'html-to-json',
    from: 'html',
    to: 'json',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'HTML 转 JSON——离线、表格成对象、不上传',
      en: 'HTML to JSON offline — tables become objects, no upload',
    },
    desc: {
      zh: '把网页里的 `<table>` 变成对象数组：首行当键名，`<th>` 与 `<td>` 都算一格；多张表按小标题分组。全程离线，页面里不请求任何东西。',
      en: 'Turn a page’s `<table>` into objects: the first row supplies keys, `th` and `td` both count, and several tables group by heading. Offline — nothing is fetched.',
    },
    lede: {
      zh: '从保存下来的网页、邮件或富文本里取数据，最省事的结果是一份能喂给程序的 JSON。这条路只认文档里的 `<table>`：首行给出键名，其余每行成为一个对象；取行取格都用「只看这张表自己」的作用域，所以表头用 `<th>` 写的文档不会因为只读 `<td>` 而整列左移，表格套在单元格里也不会把内层的行摊平成外层的数据行。没有表格时会退一步：把 `<pre>` / `<code>` 里的内容当 JSON 解析（那是从代码块救回数据的常用一路），再不行就报错，不返回空结果。整个过程在标签页里完成——解析用 DOMParser，它只解析不执行，页面里指向网络的图片与脚本一概不会被请求。',
      en: 'When the data lives in a saved page, an email or a rich-text blob, the useful result is JSON a program can read. This route looks only at the document’s `<table>` elements: the first row supplies the keys and each later row becomes an object. Rows and cells are read with a “this table only” scope, so a page whose header row is written with `<th>` cannot shift every value one column left, and a table nested inside a cell does not have its rows flattened into the outer table’s data. With no table at all it falls back one step and parses the text of a `<pre>` / `<code>` block as JSON — the usual way to rescue data out of a code block — and otherwise reports failure rather than handing back an empty result. None of it reaches the network: DOMParser parses without executing, and images or scripts the page points at are never fetched.',
    },
    keeps: {
      zh: [
        '首行给键名、每行一个对象；`<th>` 与 `<td>` 同等对待，用 `<th>` 写表头的规范文档不会因此错位',
        '只看这张表自己：内层表格的行不会混进外层数据行，文档里表格套表格也不会凭空多出记录',
        '单元格取 `textContent` 并去掉首尾空白：链接与嵌套标记只剩文字，样式与结构不会污染值',
        '没有表格时读 `<pre>` / `<code>`：一份被包进代码块的 JSON 还能原样救回来',
      ],
      en: [
        'The first row names the keys and each later row becomes an object, with `th` and `td` treated alike, so a properly written header cannot shift the values',
        'Only the table’s own rows are read, so a nested table contributes neither rows nor phantom records to the outer one',
        'Cells come from `textContent` with the ends trimmed: links and nested markup leave only words, so styling and structure cannot contaminate values',
        'With no table, `<pre>` / `<code>` is read: JSON that someone wrapped in a code block can be rescued as it stands',
      ],
    },
    limits: {
      zh: [
        '多张表不再是一个数组：两张以上会输出以文档小标题为键的**对象**（标题不足时用 `Sheet2` 这类名字），顺序按文档而不是按语义',
        '列数由首行决定：某行比表头多出的单元格会被丢掉，缺的列不会补键；表头里重复或为空的格子会互相覆盖，跨 `colspan` 的表头只算一格',
        '合并区不展开：被 `colspan` / `rowspan` 覆盖的格子不产生值，所以那一行的列会左移（要稳定的列位置，先在源文件里取消合并）',
        '值一律是字符串：JSON 里不会有真数字与真日期；`colspan`、`scope`、样式、脚本、表单与图片都不进结果，链接地址也不保留',
        '畸形或空表格不会静默产出 `[]`：解析不出可用记录时报错；空数组、对象数组、混形数组这些情况请按 JSON 转 CSV 那条的 `_value` 规则去看',
      ],
      en: [
        'Several tables are no longer one array: two or more produce an **object** keyed by the document’s headings (falling back to names like `Sheet2`), in document order rather than semantic order',
        'The first row defines the columns: cells beyond it are dropped, short rows do not gain keys, a repeated or empty header overwrites its twin, and a header spanning `colspan` counts once',
        'Merged ranges are not expanded: cells covered by `colspan` / `rowspan` produce no value, so that row’s columns shift left — unmerge in the source for stable positions',
        'Every value is a string: no real numbers or dates in the JSON; `colspan`, `scope`, styles, scripts, form controls and images leave nothing behind, and link addresses are not kept',
        'A malformed or empty table does not quietly yield `[]` — it reports failure; for arrays of mixed or scalar shapes, see the `_value` rule on the JSON to CSV route',
      ],
    },
    notes: {
      zh: [
        '要的是能继续算的表格：取到 JSON 之后走 JSON 转 CSV 或转 Excel；多张表请先逐张转，别让分组对象撞上「只接受数组」那道闸',
        '要的是可读的网页或文档：直接 HTML 转 Word、转 PDF 或转 Markdown，不必先绕 JSON',
        '只想留一份可复查的原始数据：HTML 转 TXT 会按阅读顺序抽文字，比 JSON 更贴近页面看到的内容',
      ],
      en: [
        'For a table you can compute on: take the JSON on to CSV or Excel, and convert several tables one at a time so the grouped object never meets the “arrays only” gate',
        'For something readable: go HTML to Word, to PDF or to Markdown directly instead of routing through JSON',
        'To keep the page as it reads: HTML to TXT extracts words in reading order, which stays closer to the page than JSON does',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的页面里有三张表，会得到什么？',
          en: 'My page has three tables — what do I get?',
        },
        a: {
          zh: '一个对象，而不是数组：键取每张表前面的小标题（没有足够的标题时退到 `Sheet2` 这类名字），值分别是各自的对象数组。要三份彼此独立的数组，就把表分开到三个文件里逐张转。',
          en: 'An object rather than an array: the keys come from the headings above each table (falling back to names like `Sheet2` when there are not enough), each holding its own array of objects. For three independent arrays, split them into three files and convert one at a time.',
        },
      },
      {
        q: {
          zh: '转出来的数字为什么带引号？',
          en: 'Why are the numbers quoted?',
        },
        a: {
          zh: '因为 HTML 单元格里只有文字，这一层不做类型猜测——猜过就把 `00123` 变成 `123`、把 `1/2` 变成日期。需要真数字，请在下游按列自己转（本项目在 CSV / Excel 那几条路上刻意保留原字符）。',
          en: 'Because a cell holds words, and this layer guesses no types — guessing is how `00123` becomes `123` and `1/2` becomes a date. Convert per column downstream when you need numbers; the CSV and Excel routes here deliberately keep the file’s own characters.',
        },
      },
      {
        q: {
          zh: '打开那份 HTML 会加载它引用的图片和脚本吗？',
          en: 'Does opening that page fetch the images and scripts it references?',
        },
        a: {
          zh: '不会。这里读取的是文件自己的字节，解析用 DOMParser（只解析、不执行），扩展也只有 storage 权限、没有 host 权限，因此产物里指向网络的地址同样不会被请求。',
          en: 'No. The file’s own bytes are read, parsing goes through DOMParser (which parses without executing), and with the storage permission only and no host permissions, addresses inside the page are never fetched either.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-json',
    from: 'md',
    to: 'json',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 转 JSON——离线、表格变成对象、不上传',
      en: 'Markdown to JSON offline — tables become objects, no upload',
    },
    desc: {
      zh: '把 Markdown 表格变成对象数组：表头行给出键名，两张以上按 `##` 小标题分组，没有表格时读代码块。全程离线，不请求图片与脚本。',
      en: 'Turn Markdown tables into objects: the GFM header row supplies keys, and several tables group under their `##` headings. Offline, no uploads.',
    },
    lede: {
      zh: 'Markdown 里最像数据的是表格，最想要的数据格式是 JSON。这一条走两步：先把文档按 GFM 渲染成 HTML（`gfm: true`，所以管道符表格、删除线、任务清单、自动链接都被认出；`breaks: false`，段落里单个换行仍然是续行而不是换行），渲染结果先过 DOMPurify（html + svg 两套 profile，行内的 SVG 图形不会被当垃圾删掉），再交给只解析不执行的 DOMParser 取表格。表格读法是：首行给出键名，其余每行一个对象，取行取格都限定在「这张表自己」的作用域里，所以 `<strong>`、链接、嵌套标记只剩文字，套在单元格里的小表格也不会把它的行摊成外层数据行。文档里两张以上时结果不再是数组，而是一个以 `<h2>` 文字为键的对象——`##` 小标题是这些 `h2` 最常见的来源（setext 式的下划线标题、直接写在文档里的 `<h2>` 也算），而包装文档自己不插入任何标题，所以键与表格的配对完全由文档里真实的 `h2` 决定。一张表也没有时退一步：围栏代码块渲染成 `<pre>`，里面的 JSON 原样解析；再退一步按整页文字尝试；都不成就报错，不返回空数组。全过程在标签页里完成，Markdown 引用的图片一个字节都不会被取。',
      en: 'The most data-shaped thing in a Markdown file is its table, and the most useful data shape out of it is JSON. This route is two steps: the document is rendered to HTML as GFM (`gfm: true`, so pipe tables, strikethrough, task lists and autolinks are all recognised, while `breaks: false` keeps a single newline a soft wrap rather than a line break), the markup passes DOMPurify (the html and svg profiles, so an inline SVG diagram is not deleted as junk), and a non-executing DOMParser then reads the tables. In a table the first row supplies the keys and every later row becomes one object, with rows and cells read inside a “this table only” scope — so `<strong>`, links and nested markup leave only words, and a small table inside a cell cannot contribute its rows to the outer one. Two or more tables make the result an object rather than an array, keyed by the text of the document’s `<h2>` elements: a `##` heading is the usual source of those (a setext underline or an `<h2>` written straight into the document counts too), and the document wrapper inserts no heading of its own, so the pairing is decided entirely by real `<h2>` text. With no table at all it falls back one step and parses a fenced code block (which renders as `<pre>`) as JSON, then tries the page’s whole text, and otherwise reports failure instead of handing back an empty array. None of it touches the network: images the Markdown points at are never fetched.',
    },
    keeps: {
      zh: [
        '表格按 GFM 语法识别：表头行给出键名，每一条数据行成为一个对象，表头行自己不会混进结果',
        '只看这张表自己：单元格里的 `**粗体**`、链接与嵌套标记只留下文字，表格套在单元格里也不会凭空多出记录',
        '两张以上的表按 `##` 小标题分组：键就是文档里真实的 `h2` 文字，包装文档不会插入自己的标题来捣乱',
        '没有表格时读代码块：围栏代码块渲染成 `<pre>`，被包在里面的 JSON 能原样救回来',
      ],
      en: [
        'Tables are read as GFM syntax: the header row names the keys, each data row becomes one object, and the header row itself never appears in the result',
        'Only the table’s own rows and cells are read, so `**bold**`, links and nested markup leave words behind and a table inside a cell adds no phantom records',
        'Two or more tables group under the `##` headings: the keys are the document’s real `<h2>` text, since the wrapper inserts no heading of its own',
        'With no table, a fenced code block is read: it renders as `<pre>`, so JSON someone wrapped in a code fence comes back as it stands',
      ],
    },
    limits: {
      zh: [
        '分组键与表格按**出现顺序**配对，不是「就近的标题」：两张表之间多写一个不带表格的 `##` 小节，后面的键就整体错位；标题不够时退到 `Sheet2` 这类名字',
        '代码块回退只看文档里第一个 `<pre>`：它排在真正的 JSON 块之前就会解析失败，即使后面那块是合法 JSON',
        '表格那一步的值一律是字符串：JSON 里不会出现真数字与真日期，`00424`、`1,234`、`2024-01-05` 都按写下的字符保留（代码块回退不同——它把那段文字按 JSON 解析，里面的类型就是文档本来写的）',
        '键的三处坑：表头里重复或空白的格子互相覆盖；比表头多出的单元格被丢掉，比表头短的行不会补键；图片单元是空值（`<img>` 没有文字，`alt` 也不进结果），链接地址不保留',
        '两张表转不成 CSV / Excel：这一步给出的是对象，而 JSON 转 CSV 只接受数组，会报「JSON 内容必须是包含数据的数组才能转换为 CSV」——单张表才走得下去',
      ],
      en: [
        'Grouping keys pair with tables by **document order**, not by “nearest heading”: one extra `##` section between two tables shifts every later key; when there are too few headings the name falls back to `Sheet2`',
        'The code-block fallback reads only the first `<pre>` in the document, so a block ahead of the real JSON fails the parse even when the later one is valid',
        'Values taken from a table are always strings: no real numbers or dates appear in the JSON, and `00424`, `1,234` and `2024-01-05` keep the characters you wrote (the code-block fallback differs — it parses that text as JSON, so the types inside it are the document’s own)',
        'Three key pitfalls: a repeated or blank header cell overwrites its twin; cells beyond the header row are dropped and short rows gain no keys; an image cell is empty (`<img>` carries no text, `alt` included) and link addresses are not kept',
        'Two tables do not reach CSV or Excel: this step hands on an object, and JSON to CSV accepts arrays only, reporting “JSON must be an array containing data to convert to CSV” — only a single table travels on',
      ],
    },
    notes: {
      zh: [
        '要的是能继续算的数据：接到 JSON 转 CSV 或转 Excel，两张表请拆成两个文件逐张转，别让分组对象撞上「只接受数组」那道闸',
        '要的是给人看的文档：Markdown 转 HTML、Word、PDF 都能直接走，不必绕这一圈 JSON',
        '要的是纯文字：看 Markdown 转 TXT 那张页的说明，表格在那里会散成按阅读顺序排列的行，与这里的对象结构是两种取舍',
      ],
      en: [
        'For data you can compute on: carry the JSON on to CSV or Excel, splitting two tables into two files so the grouped object never meets the “arrays only” gate',
        'For a document someone reads: Markdown goes to HTML, Word or PDF directly, without this JSON detour',
        'For plain text: see the Markdown to TXT page — there the table loosens into reading-order lines, a different trade from the objects here',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的 Markdown 里有两张表，会得到什么？',
          en: 'My Markdown has two tables — what do I get?',
        },
        a: {
          zh: '一个对象，不是数组：键按出现顺序配上文档里的 `<h2>` 文字（Markdown 里通常就是写在那张表上面的 `##`，标题不够时退到 `Sheet2` 这类名字），值各是自己那张表的对象数组。要两份彼此独立的数组，就把两张表放进两个文件分别转。',
          en: 'An object rather than an array: the keys are the document’s `<h2>` text matched in document order (in Markdown, usually the `##` you wrote above the table; names fall back to `Sheet2` when there are too few), each holding its own array of objects. For two independent arrays, put the tables in two files and convert separately.',
        },
      },
      {
        q: {
          zh: '单元格里写了 `**加粗**` 和一个链接，JSON 里是什么？',
          en: 'A cell has `**bold**` and a link — what lands in the JSON?',
        },
        a: {
          zh: '只有文字。表格单元取的是渲染后元素的 `textContent` 并去掉首尾空白，所以标记与 `href` 都不进结果；图片单元因为没有文字而落成空字符串。需要保留链接地址，请先转成 HTML，那里 `href` 还在。',
          en: 'Words only. A cell comes from the rendered element’s `textContent` with the ends trimmed, so markup and `href` contribute nothing and an image cell becomes an empty string. Keep the addresses by converting to HTML first — there the `href` survives.',
        },
      },
      {
        q: {
          zh: '这条路要先把 Markdown 渲染成 HTML，会去加载文档里引用的图片吗？',
          en: 'This route renders HTML on the way — does it fetch the images the document references?',
        },
        a: {
          zh: '不会。marked 只在内存里把字符串变成 HTML 文本，DOMPurify 净化后交给 DOMParser（只解析、不执行），扩展也只有 storage 权限、没有 host 权限，所以指向网络的地址在整个过程里一次都没被请求。',
          en: 'No. marked turns the string into HTML text in memory, DOMPurify sanitises it, DOMParser parses without executing, and with the storage permission only and no host permissions, no address the document points at is ever requested.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-excel',
    from: 'md',
    to: 'xlsx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 表格转 Excel——离线、按写下的字符落地、不上传',
      en: 'Markdown table to Excel offline — values kept, no upload',
    },
    desc: {
      zh: 'Markdown 表格经 HTML、JSON、CSV 三步落进一张工作表：15 位以内的数字变可求和，`00424`、日期串和 16 位以上的账号保持原字符，`=` 开头加护栏。全程离线。',
      en: 'A GFM table lands in a worksheet via JSON and CSV: numbers become summable, 00424 and 16-digit IDs stay text, and a leading = is disarmed. Offline.',
    },
    lede: {
      zh: '四步的链：Markdown 按 GFM 渲染成 HTML（表格是管道符语法，表头行渲染成 `<thead>` 里的 `<th>`），从 HTML 里按「首行给键名、每行一个对象」取出 JSON，再把 JSON 摊成 CSV（列取所有记录键名的并集），最后由 CSV 写进工作表。真正决定产物形态的是最后一步：读取用的是 `raw: true`，SheetJS 的类型推断器因此完全碰不到数据，`00424` 不会缩成 `424`、`2024-01-05` 不会变成序列号 `45296.33…`、`1/2` 不会变成 2001 年 1 月 2 日；随后只有一道规则把该是数字的格子还回去——十进制形状、`String(Number(x)) === x` 逐字节回得来、且有效数字不超过 15 位。16 位以上刻意留在文本，因为 Excel 只渲染 15 位有效数字，`4111111111111111` 变成数字后打开就是 `4.11111111111111E+15`，那是同一件事晚一步发生。仍是文本的格子再套一层公式护栏，并把数字格式钉成文本——写出的 `xl/styles.xml` 里，那一格用的就是内置格式号 49。上一步 CSV 写的 UTF-8 BOM 在这一步解码时被 TextDecoder 剥掉，所以第一个表头不会带上不可见的 U+FEFF。全程离线，四步都在这个标签页里。',
      en: 'A four-step chain: the Markdown renders to HTML as GFM (the pipe table’s header row renders as `<th>` inside `<thead>`), JSON is lifted out of that HTML by “first row names the keys, every later row is one object”, the JSON is spread into CSV (columns are the union of every record’s keys), and the CSV is written into a worksheet. The last step is where the artifact’s shape is decided. It reads with `raw: true`, so SheetJS’s type inferrer never touches the data: `00424` does not shrink to `424`, `2024-01-05` does not become the serial `45296.33…`, and `1/2` does not become 2 January 2001. One rule then gives back the number type where it truly was one — decimal shape, `String(Number(x)) === x` returning the exact characters, and at most 15 significant digits. Sixteen and above deliberately stay text, because Excel renders only 15 significant digits and `4111111111111111` opens as `4.11111111111111E+15` once it is a number: the same loss, one step later. Cells still holding text then get the formula guard and a pinned text number format — in the written `xl/styles.xml` that cell carries the built-in format id 49. The UTF-8 BOM the CSV step wrote is stripped by TextDecoder while reading, so the first header never carries an invisible U+FEFF. All four steps run in this tab, offline.',
    },
    keeps: {
      zh: [
        '表头行成为工作表第一行，每条数据行一行；产物只有一张工作表，表名沿用读取那份 CSV 时得到的名字，而不是这一步新造的',
        '数字只在字节能逐字回来时才是数字：`1727000000000` 变可求和的数，`00424`、`1/2`、`2024-01-05` 保持写下的字符',
        '16 位以上的长数字留在文本，因为 Excel 只渲染 15 位有效数字；15 位以内一律不受影响',
        '最终仍是文本的格子加公式护栏，并把数字格式钉成文本（写出的样式表里那一格就是内置格式号 49）；负数已被判为数字，不会被多加前缀',
      ],
      en: [
        'The header row becomes the worksheet’s first row and each data row one row; the artifact holds a single sheet, named whatever the CSV read produced rather than a name this step invents',
        'A value is a number only when its bytes come back exactly: `1727000000000` becomes summable, while `00424`, `1/2` and `2024-01-05` keep the characters written',
        'Numbers of 16 or more significant digits stay text because Excel renders 15; nothing at or below 15 digits is touched',
        'Cells that remain text get the formula guard and a pinned text number format — the written styles sheet gives that cell the built-in format id 49; a negative number is already typed as a number and gains no prefix',
      ],
    },
    limits: {
      zh: [
        '两张以上的表转不成 Excel：中间那份 JSON 是以 `<h2>` 文字为键的对象，而 JSON 转 CSV 只接受数组，整批报「JSON 内容必须是包含数据的数组才能转换为 CSV」——把每张表放进各自的文件',
        '不会有多张工作表：这条链一次只吃得下一张表，产物永远单 sheet',
        '列由表头行定名：比表头多出的单元格被丢掉，比表头短的行不会补键；表头里重复或空白的格子互相覆盖；`colspan` / `rowspan` 不展开，被覆盖的格子不产生值',
        '值在中间那步全是字符串，靠最后一步的取数规则回头判数字：`1,234.50`、`¥100`、`45%`、`+33` 都不是十进制形状，留在文本',
        "护栏写在字符本身里：以 `=` `+` `-` `@` 开头又仍是文本的格子，产物中该格的值确实以一个 ' 开头（普通文字不受影响）——它换来的是「打开不会被当公式算」",
        '图片与链接只留文字：`![图](a.png)` 的单元格是空值，`[文字](链接)` 只写「文字」；样式、脚本、任务清单的复选框都不进工作表',
      ],
      en: [
        'Two or more tables do not reach Excel: the intermediate JSON is an object keyed by the document’s `<h2>` text, JSON to CSV accepts arrays only, and the batch fails with “JSON must be an array containing data to convert to CSV” — give each table its own file',
        'There is no multi-sheet output: this chain eats one table at a time, so the artifact is always a single sheet',
        'The header row names the columns: cells beyond it are dropped, short rows gain no keys, a repeated or blank header overwrites its twin, and `colspan` / `rowspan` are not expanded — covered cells produce no value',
        'Values are strings in the middle step and only re-typed at the last: `1,234.50`, `¥100`, `45%` and `+33` are not decimal-shaped and stay text',
        "The guard lives in the characters themselves: a text cell beginning with `=`, `+`, `-` or `@` holds a leading ' in the written file (ordinary words are untouched), which is what keeps it from being computed as a formula on open",
        'Images and links leave words only: a `![图](a.png)` cell is empty, `[text](url)` writes “text”, and styling, scripts and task-list checkboxes contribute nothing to the sheet',
      ],
    },
    notes: {
      zh: [
        '只想看数据、不需要电子表格：Markdown 转 JSON 或转 CSV，多张表的限制在那两页各自写着',
        '要给人阅读的成品：Markdown 转 Word、PDF 或 HTML，排版与样式都在那边',
        '反方向读回工作表：Excel 转 CSV / JSON / Markdown，多 sheet 会按 sheet 各自成段',
      ],
      en: [
        'For the data without a spreadsheet: Markdown to JSON or to CSV, each page stating its own multi-table limit',
        'For something someone reads: Markdown to Word, PDF or HTML, where the layout lives',
        'Coming the other way: Excel to CSV, JSON or Markdown, with each worksheet getting its own section',
      ],
    },
    faq: [
      {
        q: {
          zh: 'Markdown 表格里的数字，进到 Excel 会变成什么？',
          en: 'What happens to the numbers in my Markdown table?',
        },
        a: {
          zh: '看它写下的字符：十进制形状、能逐字节回得来、有效数字不超过 15 位的变成真数字，可以求和；`00424`、`2024-01-05`、`1/2`、16 位的卡号都留在文本，并钉住文本格式（写出的那一格是内置格式号 49）。',
          en: 'It depends on the characters written: decimal-shaped values that round-trip byte for byte with at most 15 significant digits become real, summable numbers; `00424`, `2024-01-05`, `1/2` and a 16-digit card number stay text, pinned to the built-in text number format.',
        },
      },
      {
        q: {
          zh: '为什么两张表就报错，一张就没事？',
          en: 'Why does one table work and two fail?',
        },
        a: {
          zh: '因为中间那步 HTML 转 JSON 对单张表给数组、对多张表给「标题 → 数组」的对象，而对象撞上 JSON 转 CSV 那道「必须是数组」的闸。要两张表，就把它们拆到两个 Markdown 文件里分别转，各自出一份 xlsx。',
          en: 'Because the HTML-to-JSON step in the middle yields an array for one table but an object of “heading → array” for several, and that object meets CSV’s “arrays only” gate. For two tables, split them into two Markdown files and convert separately, producing one workbook each.',
        },
      },
      {
        q: {
          zh: '四步都在本地跑吗？文件会不会经过网络？',
          en: 'Do all four steps run locally? Can the file touch the network?',
        },
        a: {
          zh: '四步都在扩展自己的标签页里完成，用的库（marked、DOMPurify、SheetJS 等）全部打进包里。扩展只申请 storage 权限、没有 host 权限，构建后的产物另有两道离线守卫盯着，所以既没有上传，也没有下载。',
          en: 'All four steps run inside the extension’s own tab, with every library (marked, DOMPurify, SheetJS) bundled in. The extension requests the storage permission and no host permissions, and two offline guards audit the built artifact, so nothing is uploaded and nothing is fetched.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-json',
    from: 'txt',
    to: 'json',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'TXT 转 JSON——离线、把文本里的 JSON 排好、不上传',
      en: 'TXT to JSON offline — format JSON inside a text file',
    },
    desc: {
      zh: '`.txt` 里其实是一段 JSON：解析后按两级缩进重排，数字与布尔保持类型，不是 JSON 就报错而不是包成字符串。全程离线。',
      en: 'JSON saved as .txt comes back indented two spaces, with numbers and booleans still themselves. Prose fails instead of being wrapped into a string. Offline.',
    },
    lede: {
      zh: '很多人手里的 JSON 就存成 `.txt`——从聊天工具、日志系统或旧编辑器里拿出来时，扩展名总是先丢。这一条走两步：TXT 先整段包进一个 `<pre>`（只转义 `&`、`<`、`>`，把换行写成 `<br>`，文档标题取文件名的主干（去掉扩展名），没有名字时是 `converted`），随后 HTML→JSON 发现文档里没有表格，就退一步把那个 `<pre>` 的文字当 JSON 解析，再用两级缩进重新写出。两个结果因此顺带得到：一份 minify 成一整行的数据变成可读的层级；类型是解析出来的类型——数字仍是数字、布尔仍是布尔、`null` 仍是 `null`，这与「从表格里取值」那条路相反，那里值一律是字符串。退一步也意味着边界清楚：**整段必须是合法 JSON**。带 `//` 注释、尾逗号或单引号的那一种会报解析错误，而不是把原文包成一个字符串塞进结果；普通文章、日志行同理。编码判定在第一步就做：先按 BOM 与 NUL 的奇偶形状认 UTF-16，再依次试严格的 UTF-8、GB18030、GBK，四种都不像文本就明确报错，不会产出乱码。全程在这个标签页里完成，只有 storage 权限，没有任何网络请求。',
      en: 'A lot of JSON lives in files named `.txt` — the extension is the first thing lost when data comes out of a chat app, a log viewer or an old editor. This route is two steps: the text is wrapped whole into a `<pre>` (only `&`, `<` and `>` are escaped, line breaks become `<br>`, and the document title is the file’s basename with the extension dropped, or `converted` when there is none), then HTML to JSON, finding no table in the document, falls back to reading that `<pre>` as JSON and writes it out again indented two spaces. Two results come with it: data minified onto one line becomes a readable hierarchy, and the types are the parsed ones — numbers stay numbers, booleans stay booleans, `null` stays `null`, which is the opposite of the table route, where every value is a string. The same fallback marks the boundary clearly: **the whole text has to be valid JSON**. A file with `//` comments, trailing commas or single quotes reports a parse error instead of having its contents wrapped into one string, and so does ordinary prose or log lines. Encoding is settled in the first step: UTF-16 from its BOM or NUL parity, then strict UTF-8, GB18030 and GBK in order, with an explicit failure when the bytes are not text at all. All of it runs in this tab on the storage permission only, with no network request.',
    },
    keeps: {
      zh: [
        '原文是 JSON 就按两级缩进重排：挤成一整行的 minify 数据，转完就是能读的层级',
        '类型是解析出来的类型：数字、布尔与 `null` 保持原样，不会被统一收成字符串',
        '嵌套原样保留：对象套数组、数组套对象都还在结果里，不会被摊平',
        '编码先判形状：UTF-16（BOM 或 NUL 奇偶）、UTF-8、GB18030、GBK 逐条严格解，四个都不像文本就报错而不是产出乱码',
      ],
      en: [
        'JSON in, two-space indentation out: data minified onto one line comes back as a readable hierarchy',
        'The types are the parsed ones — numbers, booleans and `null` stay themselves instead of collapsing into strings',
        'Nesting survives as it is: objects inside arrays, arrays inside objects, never flattened',
        'Encoding is settled by shape first: UTF-16 by BOM or NUL parity, then strict UTF-8, GB18030 and GBK, failing outright when the bytes are not text',
      ],
    },
    limits: {
      zh: [
        '认的是「整段是 JSON」：文章、日志、以文字写成的表格都会停在解析错误，原文不会被包成一个字符串交给你',
        '换行不带着走：TXT→HTML 把 `\n` 写成 `<br>`，取回的是 `textContent`——JSON 语法不依赖换行所以照常解析，但你自己排的空行与缩进不会原样出现',
        '值里的换行只有写成 `\n` 那一种转义才留得住：JSON 字符串里裸的换行本来就不合法，这一层不替它补',
        '重复键按 JSON 解析的既有语义只留最后一个（`{"a":1,"a":2}` 出来是 `2`），这一层不合并也不报错',
        '超长整数按 JavaScript 的 number 处理：20 位账号那一种在解析那一刻就可能变成科学计数，要保字符请走 CSV / Excel 那两条按值取数的路',
      ],
      en: [
        'What it reads is “the whole text is JSON”: essays, logs and tables written as words stop at a parse error, and the text is not handed back wrapped in a string',
        'Line breaks do not travel: TXT to HTML turns `\n` into `<br>` and the read-back is `textContent`, so JSON parses anyway, but the blank lines and indentation you typed are not reproduced',
        'A newline inside a value survives only as the `\n` escape: a bare one was never valid JSON, and this layer does not patch it',
        'Duplicate keys follow the parser’s own rule and keep the last one (`{"a":1,"a":2}` yields `2`) — no merging, no warning',
        'Huge integers go through JavaScript’s number: a 20-digit account can become exponential notation at parse time, so keep the characters by taking the CSV or Excel route instead',
      ],
    },
    notes: {
      zh: [
        '转完只想看：JSON→HTML 能把这份数据渲染成可折叠的网页树，键与值各自着色',
        '要表格：如果那段 JSON 是对象数组，走 TXT→CSV 或 TXT→Excel，键就是表头与列',
        '文本本身不是 JSON：走 TXT→HTML / PDF / Word，它们保留等宽排版，不假装认得数据',
      ],
      en: [
        'To read it afterwards: JSON to HTML renders the data as a collapsible web tree with keyed colours',
        'For a table: if that JSON is an array of objects, take TXT to CSV or TXT to Excel, where the keys become headers',
        'For text that is not JSON: use TXT to HTML, PDF or Word, which keep the monospace layout instead of pretending there is data',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的 JSON 存成了 `.txt`，转出来和原文件一样吗？',
          en: 'My JSON is saved as `.txt` — is the result the same file?',
        },
        a: {
          zh: '值一样，排版不一样。结果按两级缩进重新写出，所以原来手工排的空行、制表符对齐都不会保留；类型、顺序与嵌套都不变。要「一字不改」，那就不需要转，直接改扩展名即可。',
          en: 'Same values, different layout. The result is rewritten with two-space indentation, so hand-typed blank lines and tab alignment do not survive, while types, order and nesting do. For bytes that must not change, renaming the file is the honest answer.',
        },
      },
      {
        q: {
          zh: '为什么我这份「看起来就是 JSON」却转失败了？',
          en: 'It looks like JSON — why did it fail?',
        },
        a: {
          zh: '最常见的三种都不是合法 JSON：`//` 或 `/* */` 注释、最后一项后面的尾逗号、用单引号包字符串。`JSON.parse` 一律拒绝，这条路也就如实报错，不会猜你的意思、更不会把整段文字包成字符串装作成功。',
          en: 'The three usual suspects are not valid JSON: `//` or `/* */` comments, the comma after the last item, and single-quoted strings. `JSON.parse` rejects all three, and this route reports that plainly instead of guessing what you meant or wrapping the text in a string to look like a success.',
        },
      },
      {
        q: {
          zh: '这一步会把文件发给谁吗？',
          en: 'Does this step send the file anywhere?',
        },
        a: {
          zh: '不会。读的是文件自己的字节，两步都在扩展的标签页里，扩展只有 storage 权限、没有 host 权限；构建后的产物另有两道离线守卫逐条检查。',
          en: 'No. The file’s own bytes are read, both steps run inside the extension’s tab, the manifest carries the storage permission and no host permission, and two offline guards audit the built artifact.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-csv',
    from: 'txt',
    to: 'csv',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'TXT 转 CSV——离线、JSON 数组变表格、不上传',
      en: 'TXT to CSV offline — a JSON array becomes a table',
    },
    desc: {
      zh: '`.txt` 里是一段 JSON 数组时：键名取并集当表头、每条记录一行，没有键的元素写进合成的 `_value` 列而不是丢掉。全程离线。',
      en: 'A JSON array saved as .txt becomes a table: union keys as headers, one row per record, and bare values caught by a `_value` column instead of dropped. Offline.',
    },
    lede: {
      zh: '这条路和 TXT→JSON 共用第一步（文本整段包进 `<pre>`），中间那步把 `<pre>` 里的文字当 JSON 解析，最后由 JSON→CSV 把数组摊成表。所以成立的条件写在两步里：**文本得是一段 JSON 数组**。对象数组最顺：表头是所有记录键名的并集，某条记录没有的键留空格而不是整体左移；元素里没有键可挂（顶层是字符串或数字、或数组套数组）时，会加一列合成的 `_value` 把它们接住——本项目对这条的判断是「1000 条记录只写出 980 行还报成功」比多一列难看严重得多，所以宁可多一列。嵌套对象与数组在其单元里写成 JSON 文本，值不会被拆成多行。写出的 CSV 带 UTF-8 BOM（`json→csv` 那一步加的三个字节），数字按值写而不是按显示文本写：`1727000000000` 出来是完整一串，不会变成 `1.727E+12`；反过来，以 `=`、`+`、`-`、`@` 开头的**字符串**值会带一个防执行的前缀，因为导出后被人双击打开时那些字符正是公式的起手式。日期串不猜格式：`2024-01-05` 与 `1/2` 都按写下的字符落地。全程在这个标签页里，只有 storage 权限。',
      en: 'This route shares its first step with TXT to JSON (the text is wrapped whole in a `<pre>`), the middle step parses that `<pre>` as JSON, and JSON to CSV spreads the array into a table. So the conditions sit in those two steps: **the text has to be a JSON array**. An array of objects travels best — the header is the union of every record’s keys, and a key one record lacks becomes a blank cell rather than shifting the row left. When an element has no keys to hang anything on (top-level strings or numbers, arrays inside arrays), a synthetic `_value` column catches them: this project’s position is that 1 000 records writing 980 rows while reporting success is far worse than one extra column. Nested objects and arrays are written as JSON text inside their cell, so a value is never split across rows. The CSV carries a UTF-8 BOM (the three bytes the JSON to CSV step writes) and writes values rather than display text: `1727000000000` lands as the whole string of digits instead of `1.727E+12`, while a **string** beginning with `=`, `+`, `-` or `@` gains an anti-execution prefix, because those are exactly the characters a formula starts with once someone double-clicks the file. Dates are not guessed: `2024-01-05` and `1/2` keep the characters written. All of it in this tab, storage permission only.',
    },
    keeps: {
      zh: [
        '表头是所有记录键名的并集：某条记录没有的键留空格，后面的列不会整体左移',
        '没有键可挂的元素写进合成的 `_value` 列——顶层标量与嵌套数组都不丢，1000 条记录就出 1000 行',
        '嵌套对象与数组在其单元里写成 JSON 文本，一条记录占一行',
        '产物带 UTF-8 BOM，数字按值写出：时间戳与雪花 ID 保持完整一串，不会变成科学计数',
      ],
      en: [
        'The header is the union of every record’s keys, so a key missing from one record leaves a blank cell instead of shifting its columns',
        'Elements with no keys go into a synthetic `_value` column — top-level scalars and nested arrays are neither dropped nor silently skipped, so 1 000 records make 1 000 rows',
        'Nested objects and arrays are written as JSON text inside their cell, keeping one record per row',
        'The artifact carries a UTF-8 BOM and writes values, not display text: timestamps and snowflake IDs stay the full string instead of going exponential',
      ],
    },
    limits: {
      zh: [
        '文本必须是合法 JSON **数组**：对象会在中间那步被拒（界面报「JSON 内容必须是包含数据的数组才能转换为 CSV」），普通文章连第一步都过不去',
        '空数组 `[]` 与全空对象 `[{}]` 报错而不是给一份只有表头、没有内容的 CSV',
        '换行不带着走：`\n` 在第一步变成 `<br>`，JSON 语法不依赖它所以照常解析，但你手工排的版式不会保留',
        '以 `=`、`+`、`-`、`@` 开头的字符串值会带一个前导的防执行字符；被判为数字的负数不受影响',
        '值里的日期不会被识别：`2024-01-05` 出来还是那串字符——这一族刻意不猜格式，因为猜就把 `1/2` 变成了 2001 年 1 月 2 日',
      ],
      en: [
        'The text must be a valid JSON **array**: an object is refused by the middle step, with the interface reporting “JSON must be an array containing data to convert to CSV”, and prose never gets past the first',
        'An empty array `[]` or an all-empty-object `[{}]` reports failure rather than handing back a header-only file',
        'Line breaks do not travel: the first step turns `\n` into `<br>`, which JSON does not depend on, so your own layout is not preserved',
        'A string value starting with `=`, `+`, `-` or `@` gains a leading anti-execution character; negative numbers typed as numbers are untouched',
        'Dates inside values are not recognised: `2024-01-05` stays those characters, because guessing is how `1/2` became 2 January 2001',
      ],
    },
    notes: {
      zh: [
        '只要一份排好版的 JSON：走 TXT→JSON，同一份输入、少一步',
        '要的是工作簿而不是 CSV：TXT→Excel 走同一条链的最后一步，并按「值回得来才是数字」的规则取数',
        '文本不是 JSON：这条链无法凭空造出列，请看 TXT→HTML / PDF / Word 那几条保留排版的路',
      ],
      en: [
        'For tidy JSON only: TXT to JSON is the same input one step shorter',
        'For a workbook instead of CSV: TXT to Excel shares this chain’s last step and applies the round-trip typing rule',
        'For text that is not JSON: no columns can be invented here, so take the TXT to HTML, PDF or Word routes that keep the layout',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的 txt 每行一条记录，为什么不按行切成列？',
          en: 'My text file is one record per line — why not split it by lines?',
        },
        a: {
          zh: '因为「按行切」要先猜列在哪里：同一个文件里可能是制表符、多个空格、逗号或竖线，猜错就整列错位，而且没有一种猜测能让所有 txt 都对。这条路只认 JSON 那种自带结构的数据；其他文本请先另存为 CSV 或用能明确分隔的格式。',
          en: 'Because splitting by lines means guessing where the columns are: the same file might use tabs, runs of spaces, commas or pipes, and a wrong guess shifts every column with no rule that works for all text. This route reads only data that arrives structured, i.e. JSON; save as CSV first, or use a format with an explicit delimiter.',
        },
      },
      {
        q: {
          zh: '`_value` 那一列是什么，为什么会出现？',
          en: 'What is that `_value` column and why does it appear?',
        },
        a: {
          zh: '它是给「没有键可挂」的元素准备的合成列：`["a","b"]` 这种标量数组、或 `[{"a":1},"note"]` 里那条 `"note"`。没有它，这些元素只能被丢掉或让整行列数错位——所以宁可多一列。若你的记录本来就用了 `_value` 这个名字，合成列会退到 `_value_2`，两者都保住。',
          en: 'It is the synthetic column for elements with no keys to hang on: a scalar array like `["a","b"]`, or the `"note"` in `[{"a":1},"note"]`. Without it those elements would be dropped or would shift every row’s columns, so one extra column is the cheaper outcome. If your records already use `_value`, the synthetic one becomes `_value_2` and both survive.',
        },
      },
      {
        q: {
          zh: 'Excel 打开这份 CSV 会乱码吗？',
          en: 'Will Excel open this CSV as mojibake?',
        },
        a: {
          zh: '产物开头带三个字节 `EF BB BF`——那是 UTF-8 BOM，由 JSON→CSV 那一步写上。带 BOM 是让读表格的软件认出 UTF-8 的常见做法；若你的软件仍按地区代码页解释字节，用它的导入向导手工指定 UTF-8 更稳。',
          en: 'The artifact opens with the three bytes `EF BB BF` — a UTF-8 BOM, written by the JSON to CSV step. Emitting one is the usual way to help a spreadsheet reader settle on UTF-8; if your reader still applies a regional code page, name UTF-8 in its import wizard.',
        },
      },
    ],
  },
  {
    slug: 'json-to-md',
    from: 'json',
    to: 'md',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转 Markdown——离线、逐行成段、不上传',
      en: 'JSON to Markdown offline — a readable dump, no upload',
    },
    desc: {
      zh: 'JSON 先渲染成语法着色的查看器，再逐行落成 Markdown：键、值与 `Object(4)` 摘要都作为文字保留，没有标题也没有列表。全程离线。',
      en: 'Each JSON line becomes its own Markdown paragraph: keys, values and the Object(4) summaries stay as words. No headings, no lists, nothing uploaded.',
    },
    lede: {
      zh: '这一条走两步：`json>html` 先把解析后的值序列化成一份**自带样式的查看器**——每个字面量是一个 `<span class="json-line">`，对象与数组各是一个默认展开的 `<details>`，摘要写着 `Object(4)` / `Array(n)`，键、字符串、数字、布尔与 `null` 五类各自着色；接着 `html>md` 用 Turndown 把这份 HTML 写成 Markdown。Markdown 的结果因此由**上一层用了哪些标记**决定，而查看器用的全是 `<div>`、`<span>`、`<details>` 这些 Turndown 没有规则的块，它就把标记摘掉、只留内容。实测一份两层对象的产物形如：`Object(2)` 空行 `{` 空行 `"a": 1,` 空行 `"b": "hi"` 空行 `}`——一行一段、段间一个空行，键与顺序都在，缩进不在（层深由 CSS 的 `margin-left` 表达，不是字符），大括号与逗号作为文字留着。这条页最该说清的一件事就在这儿：**它不会把 JSON 变成文档结构**。没有 `#` 标题、没有 `-` 列表、没有围栏代码块，因为中间那份 HTML 里根本没有 `h1` 到 `h6`、`ul` 或 `pre`；想要一份真正的表格 Markdown，得让数据以 `<table>` 出现，那是 HTML→Markdown 与 Excel→Markdown 那两条路的事。着色与折叠标记不进产物，所以 Markdown 里既没有 `<span>` 也不会带样式表。值本身在解析那一刻定型：数字就是数字、`null` 就是 `null`，`escapeHtml` 只处理写进标记的字符串，产物取的是文字内容。全程离线，两步都在这个标签页里。',
      en: 'Two steps: `json>html` first serialises the parsed value into a **self-styled viewer** — every literal is a `<span class="json-line">`, every object and array a `<details>` that opens by default with `Object(4)` / `Array(n)` written in its summary, keys, strings, numbers, booleans and `null` each coloured; then `html>md` runs Turndown over that document. The Markdown is therefore decided by **which markup the layer above used**, and the viewer uses only `<div>`, `<span>` and `<details>` — elements Turndown has no rule for, so it drops the markup and keeps the content. Measured on a two-level object, the artifact reads: `Object(2)`, blank line, `{`, blank line, `"a": 1,`, blank line, `"b": "hi"`, blank line, `}` — one line per paragraph, keys and order intact, indentation absent because the depth lives in CSS `margin-left` rather than in characters, braces and commas surviving as text. That is the one thing this page has to say plainly: **it does not turn JSON into document structure**. There are no `#` headings, no `-` lists and no fenced block, because the intermediate HTML contains no `h1`–`h6`, `ul` or `pre`. For real tabular Markdown the data has to arrive as `<table>`, which is what the HTML to Markdown and Excel to Markdown routes do. Colouring and folding markers do not reach the output, so no `<span>` and no stylesheet comes with it. Values are settled at parse time — a number is a number and `null` is `null` — while `escapeHtml` guards what enters the markup and Markdown takes the text content. Both steps run in this tab, offline.',
    },
    keeps: {
      zh: [
        '键名、值与顺序都在：产物按查看器的书写顺序逐行落地，`"a": 1,` 这样的行一句一段',
        '分组的数量信息留着：`Object(4)` / `Array(n)` 摘要会作为一行文字出现，读得出规模',
        '类型体现在字符里：数字不带引号、布尔与 `null` 原样写出，与「从表格里取值」那条一路是字符串不同',
        '着色与折叠标记都不进产物：没有 `<span>`、没有内联样式表，Markdown 是纯文本',
      ],
      en: [
        'Keys, values and order are all there: the artifact follows the viewer line by line, one paragraph per `"a": 1,` line',
        'The size information stays: `Object(4)` / `Array(n)` summaries appear as their own line of text',
        'Types show through the characters: numbers carry no quotes and booleans and `null` are written as themselves, unlike the table route where every value is a string',
        'Neither colouring nor folding markers reach the output: no `<span>`, no inline stylesheet — the file is plain text',
      ],
    },
    limits: {
      zh: [
        '不会生成标题、列表或代码块：中间那份 HTML 只有 `div` / `span` / `details`，Turndown 没有可对应到 `#`、`-` 或 ``` 的结构，所以只会摘标记留文字',
        '层深不体现在缩进里：查看器的嵌套靠 CSS `margin-left`，产物里只剩先后顺序与大括号，深结构的可读性不如原 JSON',
        '每行一段意味着行与行之间是空行：Markdown 渲染器会把它读成一个个短段落，而不是一整块等宽文本',
        '长字符串里的换行与引号按 JSON 语义转义后写入，产物里看到的是那串转义字符，不是重新排版的正文',
        '要真正的表格请用 HTML 或 Excel 那条：只有以 `<table>` 出现的数据才会被写成 GFM 管道表',
      ],
      en: [
        'No headings, lists or code fences are produced: the intermediate HTML is only `div` / `span` / `details`, so Turndown has nothing to map onto `#`, `-` or ``` and just strips markup while keeping text',
        'Depth does not survive as indentation: the viewer nests through CSS `margin-left`, so the artifact keeps order and braces only, and deep structures read worse than the original JSON',
        'One line per paragraph means blank lines between every line: a renderer shows a run of short paragraphs, not one monospace block',
        'Newlines and quotes inside long strings travel as their JSON escapes, so the artifact shows that escape text rather than re-flowed prose',
        'For a real table take the HTML or Excel route: only data that arrives as `<table>` is written as a GFM pipe table',
      ],
    },
    notes: {
      zh: [
        '要能再解析回去的漂亮 JSON：直接用 JSON→HTML 或就留在 `.json`，本条不保证可逆',
        '要贴进文档给人看：如果数据其实是表格，先走 HTML→Markdown，那里有真正的管道表语法',
        '只想读结构而不必留档：工作台里的 JSON 树视图带搜索与表视图，比一份 Markdown 更趁手',
      ],
      en: [
        'To keep JSON that parses back cleanly: use JSON to HTML or leave it as `.json` — this route does not promise reversibility',
        'To paste into a document: if the data is really a table, go by HTML to Markdown, where the pipe-table syntax exists',
        'To read structure without filing it: the workbench JSON tree view has search and a table projection, which is handier than a Markdown dump',
      ],
    },
    faq: [
      {
        q: {
          zh: 'JSON 转 Markdown 会得到表格吗？',
          en: 'Does JSON to Markdown give me a table?',
        },
        a: {
          zh: '不会。中间那步产出的是折叠树的 HTML（`div` / `span` / `details`），里面没有 `<table>`，所以 Markdown 里不会有管道表——只有逐行的键与值。要表格，请先把数据渲染成带 `<table>` 的 HTML（或从 Excel / CSV 出发），再转 Markdown。',
          en: 'No. The middle step emits the collapsible tree as `div` / `span` / `details`, with no `<table>` in it, so the Markdown holds line-by-line keys and values rather than a pipe table. Render the data into HTML that actually contains a `<table>` (or start from Excel or CSV) when you want one.',
        },
      },
      {
        q: {
          zh: '为什么不干脆用代码块把 JSON 包起来？',
          en: 'Why not just wrap the JSON in a code block?',
        },
        a: {
          zh: '因为这一条不是「包起来」：它走的是查看器渲染，所以得到的是给人读的行文（带 `Object(4)` 这类摘要），也失去了缩进与可逆性。想让 Markdown 里原样保留 JSON，最快的办法是把它写进围栏代码块再转，或直接把 `.json` 改名——那是另一种取舍，本条不假装两全。',
          en: 'Because this route is not a wrapper: it renders the viewer, so you get human-readable lines with `Object(4)`-style summaries and lose both indentation and reversibility. To keep JSON verbatim in Markdown, put it in a fenced block yourself or rename the `.json` file — a different trade, which this page does not pretend to cover.',
        },
      },
      {
        q: {
          zh: '很深或者很大的 JSON 会怎么样？',
          en: 'What about very deep or very large JSON?',
        },
        a: {
          zh: '序列化查看器那一步是显式栈的迭代实现，不是递归——递归版本在解析成功之后仍会把栈耗尽，把一次正常转换报成 `RangeError`。同时查看器自身有行数与长度的预算，触顶时会在界面里写明实际读了多少，不会拿半棵树冒充整个文档。',
          en: 'The viewer serialisation is iterative over an explicit stack, not recursive — the recursive version used to exhaust the stack after a successful parse and reach the user as a `RangeError` from a conversion that had every right to finish. The viewer also works under line and length budgets, and when one is hit the interface says how much it actually read instead of passing a partial tree off as the document.',
        },
      },
    ],
  },
  {
    slug: 'html-to-xlsx',
    from: 'html',
    to: 'xlsx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'HTML 表格转 Excel——离线、按值取数、不上传',
      en: 'HTML table to Excel offline — values kept, no upload',
    },
    desc: {
      zh: '网页里的 `<table>` 经 JSON 与 CSV 落进一张工作表：15 位以内的数字可求和，`00424` 与 16 位账号保持字符，`=` 开头加护栏。全程离线。',
      en: 'A page table goes through JSON and CSV into one worksheet: 15-digit numbers become summable, 00424 and 16-digit IDs stay text, and = is disarmed. Offline.',
    },
    lede: {
      zh: '三步的链：`html>json` 从文档里取表格（首行给键名、其余行成对象，`<th>` 与 `<td>` 同等对待，行列都按「只看这张表自己」的作用域读取），`json>csv` 把数组摊成表（列是所有记录键名的并集，缺的键留空格），`csv>xlsx` 写进工作表。产物形态由后两步定：CSV 那一步按**值**而不是显示文本写单元格，所以时间戳与雪花 ID 不会被写成科学计数；最后一步用 `raw: true` 读，SheetJS 的类型推断器碰不到数据，随后只有一道规则把该是数字的格子还回去——十进制形状、`String(Number(x)) === x` 逐字节回得来、有效数字不超过 15 位。16 位以上刻意留在文本，因为表格软件只渲染 15 位有效数字，卡号那一级别的编号变成数字后就被读成 `4.11111111111111E+15`。仍是文本的格子会加公式护栏并把数字格式钉成文本（写出的 `xl/styles.xml` 里那一格就是内置格式号 49）。网页这一侧的既有规则同样跟着走：值在 JSON 那一步全是字符串，链接地址、样式、图片都不进表；两张以上的表交出的是按 `<h2>` 分组的对象，会撞在「只接受数组」那道闸上。全过程在这个标签页里，只有 storage 权限，指向网络的地址一次都不会被请求。',
      en: 'A three-step chain: `html>json` lifts tables out of the document (first row names the keys, later rows become objects, `<th>` and `<td>` count alike, rows and cells read inside a “this table only” scope), `json>csv` spreads the array into a table (columns are the union of every record’s keys, and a missing key leaves a blank cell), `csv>xlsx` writes the worksheet. The last two decide the artifact. The CSV step writes cells by **value** rather than display text, so timestamps and snowflake IDs are not written in exponential notation; the final step reads with `raw: true`, keeping SheetJS’s inferrer away from the data, and one rule alone gives the number type back — decimal shape, `String(Number(x)) === x` returning the exact characters, at most 15 significant digits. Sixteen and above deliberately stay text, because a spreadsheet renders 15 significant digits and a card number turned into a number reads back as `4.11111111111111E+15`. Cells still holding text get the formula guard and a pinned text format (that cell carries the built-in format id 49 in the written `xl/styles.xml`). The page side keeps its own rules: values are strings at the JSON step, so link addresses, styling and images contribute nothing, and two or more tables hand over an object grouped by `<h2>` that then meets the “arrays only” gate. All of it inside this tab on the storage permission, with no address the page points at ever fetched.',
    },
    keeps: {
      zh: [
        '表头行给列名、每条数据行一行：`<th>` 与 `<td>` 同等对待，用 `<th>` 写表头的规范文档不会整列左移',
        '数字只在字节能逐字回来时才是数字：`1727000000000` 可求和，`00424`、`1/2`、`2024-01-05` 保持写下的字符',
        '16 位以上的编号留在文本，并把数字格式钉成文本（写出的那一格是内置格式号 49）',
        '列取所有记录键名的并集：某行没有的键留空格，多余的单元格被丢，不会让后面几列错位',
      ],
      en: [
        'The header row names the columns and each data row becomes one: `<th>` and `<td>` count alike, so a properly written header cannot shift the values',
        'A value is a number only when its bytes come back exactly: `1727000000000` is summable while `00424`, `1/2` and `2024-01-05` keep the characters written',
        'Identifiers of 16 digits or more stay text, pinned to a text number format (the written cell carries the built-in format id 49)',
        'Columns are the union of every record’s keys: a key a row lacks becomes a blank cell and surplus cells are dropped instead of shifting later columns',
      ],
    },
    limits: {
      zh: [
        '两张以上的表转不成 Excel：`html>json` 对多张表交出的是以 `<h2>` 文字为键的对象，而 CSV 那一步只接受数组，界面报「JSON 内容必须是包含数据的数组才能转换为 CSV」——请逐张表分开转',
        '表格套在单元格里也算「两张」：内层表的存在会让整批失败，而不是把它的行摊进外层',
        '值在中间那步全是字符串，靠最后一步的取数规则回头判数字：`1,234.50`、`¥100`、`45%`、`+33` 都不是十进制形状，留在文本',
        '合并区不展开：被 `colspan` / `rowspan` 覆盖的格子不产生值，那一行的列会左移；链接地址、图片、样式与脚本都不进工作表',
        '产物只有一张工作表：这条链一次吃得下一张表，表名沿用读取 CSV 时得到的那一个',
      ],
      en: [
        'Two or more tables do not reach Excel: `html>json` gives an object keyed by the document’s `<h2>` text, CSV accepts arrays only, and the interface reports “JSON must be an array containing data to convert to CSV” — convert each table separately',
        'A table nested inside a cell counts as the second one: its presence fails the batch rather than flattening its rows into the outer table',
        'Values are strings at the middle step and re-typed only at the last: `1,234.50`, `¥100`, `45%` and `+33` are not decimal-shaped and stay text',
        'Merged ranges are not expanded: cells covered by `colspan` / `rowspan` produce no value so that row shifts left, and link addresses, images, styling and scripts contribute nothing to the sheet',
        'There is one worksheet: this chain eats a single table at a time, and the sheet keeps whatever name the CSV read produced',
      ],
    },
    notes: {
      zh: [
        '只想看数据不要工作簿：HTML→CSV 是同一条链的前两步，产物是带 BOM 的文本',
        '要保留网页排版：直接 HTML→PDF 或 HTML→Word，表格的合并与样式在那边更有落点',
        '从 Markdown 出发：Markdown→Excel 走同一条路的第一步是渲染，`##` 小标题会成为分组键',
      ],
      en: [
        'For the data without a workbook: HTML to CSV is this chain minus the last step, and hands back a BOM’d text file',
        'To keep the page’s layout: go HTML to PDF or Word directly, where merged cells and styling have somewhere to land',
        'Starting from Markdown: Markdown to Excel shares it, with the `##` headings becoming grouping keys',
      ],
    },
    faq: [
      {
        q: {
          zh: '网页表格里的数字进了 Excel 会是什么？',
          en: 'What becomes of the numbers in my page table?',
        },
        a: {
          zh: '看字符：十进制形状、能逐字节回得来、有效数字不超过 15 位的变成真数字；`00424`、`2024-01-05`、`1/2` 和 16 位编号留在文本并被钉住文本格式。这一族刻意不猜日期与千分位，因为猜就把 `1/2` 变成了某年某月某日。',
          en: 'It depends on the characters: decimal-shaped values that round-trip byte for byte with at most 15 significant digits become real numbers, while `00424`, `2024-01-05`, `1/2` and a 16-digit identifier stay text pinned to a text format. This family guesses neither dates nor thousands separators, because guessing is how `1/2` became a calendar day.',
        },
      },
      {
        q: {
          zh: '为什么我只想要一张表，也要经过 JSON 与 CSV？',
          en: 'Why route a table through JSON and CSV at all?',
        },
        a: {
          zh: '因为写工作簿的那一步只认「已经是一格一格的数据」。把网页取数（DOM 读取）与写表（工作簿容器）分开之后，取数规则只有一处：单元格文字、并集列、值保真——三条路（转 CSV、转 JSON、转 Excel）因此给出一样的判断，不会各自发明一套。',
          en: 'Because the workbook writer only understands data that is already cell-shaped. Separating page extraction (DOM reads) from sheet writing leaves one place where the rules live — cell text, union columns, value fidelity — so the CSV, JSON and Excel routes all reach the same verdict instead of each inventing its own.',
        },
      },
      {
        q: {
          zh: '转的时候会把页面引用的图片和脚本加载吗？',
          en: 'Does converting fetch the images and scripts the page references?',
        },
        a: {
          zh: '不会。读的是文件自己的字节，解析用 DOMParser（只解析、不执行），扩展只有 storage 权限、没有 host 权限，产物里也不会保留那些地址。',
          en: 'No. The file’s own bytes are read, parsing goes through DOMParser, which parses without executing, the extension holds the storage permission and no host permission, and the artifact keeps none of those addresses.',
        },
      },
    ],
  },
  {
    slug: 'json-to-png',
    from: 'json',
    to: 'png',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转 PNG——离线、一份整页长图、不上传',
      en: 'JSON to PNG offline — one tall image, no upload',
    },
    desc: {
      zh: '先把 JSON 渲染成可折叠的查看器，再把整页无损截成一张 PNG：换行由排版决定，高度超过 32768 px 就报错而不是截断。全程离线。',
      en: 'The viewer is captured whole into one lossless PNG: wrapping follows the layout, and past 32768 px of height it fails instead of truncating. Offline.',
    },
    lede: {
      zh: '要一张能贴进文档、截图工具又截不全的 JSON，这条路比截屏省事：`json>html` 先把解析后的值序列化成自带样式的查看器（每个字面量一行，对象与数组各是一个默认展开的 `<details>`，摘要写着 `Object(4)` / `Array(n)`，键、字符串、数字、布尔与 `null` 五类各自着色），`html>png` 再把净化后的文档离屏渲染成整页画布、无损编码成 PNG。两件事跟着走：**折行由排版而不是字符决定**——长字符串在页面宽度处断开，图里看到的是断开的样子；**颜色与层深是像素不是标记**——着色来自内联样式表，缩进来自 `margin-left`，所以它看起来像界面，而不像数据。上限是一条明确的失败而不是悄悄变短：单次整页捕获的高度上限是 32768 px（`MAX_CANVAS_EDGE × 4`），超出报「渲染高度过大」，因为浏览器在远超此高度时返回的是**空白画布**，那种「成功但全白」比一条错误难查得多。查看器不含任何指向网络的引用，所以这一路没有「图片取不到」可披露。输出参数在编码处按同一套边界再钳一次，最长边会重采样，而质量档只作用于有损编码——PNG 是无损的。全程在这个标签页里完成，只有 storage 权限。',
      en: 'When the JSON is longer than any screenshot you can take, this route is shorter than one: `json>html` serialises the parsed value into a self-styled viewer (one line per literal, every object and array a `<details>` that opens by default with `Object(4)` / `Array(n)` in its summary, keys, strings, numbers, booleans and `null` each coloured), and `html>png` renders that sanitised document offscreen and encodes the whole page losslessly as PNG. Two things follow. **Wrapping is decided by layout, not by characters**: a long string breaks at the page width, so the picture shows the broken-up text. **Colour and depth are pixels, not markup**: the palette comes from an inline stylesheet and the indentation from `margin-left`, so it looks like an interface rather than like data. The ceiling is an explicit failure instead of a quiet shortening: one capture is bounded at 32768 px of height (`MAX_CANVAS_EDGE × 4`) and past it the route reports “too tall to render”, because a browser returns a **blank canvas** well beyond that, and a white “success” is far harder to diagnose than an error. The viewer carries no remote reference, so this route has no image it could fail to fetch. Output options are re-clamped against the same bounds at encode time and the longest edge resamples, while a quality setting means anything only to a lossy encoder — PNG is lossless. All of it inside this tab on the storage permission.',
    },
    keeps: {
      zh: [
        '整页一次捕获：不必滚动截屏再拼接，一份长 JSON 就是一张图',
        '无损编码：着色边界与细线不被二次量化，能放大到多清由内容高度选中的像素密度决定（2x / 1.5x / 1x）',
        '排版原样进图：折叠摘要、缩进与语法着色都是渲染出来的样子，与浏览器里看到的一致',
        '没有远程引用也就没有静默丢失：查看器由本扩展自己写出，产物里不存在取不到的图片',
      ],
      en: [
        'One capture for the whole page: no scrolling and no stitching — a long JSON becomes one image',
        'Lossless encoding: colour edges and thin rules carry no compression artefacts, and how far monospace glyphs survive a zoom depends on the density the page height selected',
        'The layout goes into the picture as rendered: fold summaries, indentation and syntax colouring look as they do in the browser',
        'No remote references means nothing silently missing: the extension writes the viewer itself, so there is no image the artifact could fail to fetch',
      ],
    },
    limits: {
      zh: [
        '高度上限 32768 px：超限直接失败并说明，不给被截短的图，也不给那片空白画布',
        '文字在图里不是文字：PNG 是位图，产物里的键与值不能选中、搜索或复制',
        '长字符串按页面宽度折行，所以看到的是折过的样子；要留原文请走 JSON→TXT 或就留在 `.json`',
        '质量与目标体积是有损容器才有的档位：面板对 PNG 不提供它们，编码器也会忽略；这一路可调的只有最长边，超出会重采样',
        '图片是给人看的快照，不承诺能再解析回 JSON',
      ],
      en: [
        'A 32768 px height ceiling: past it the route fails with an explanation rather than handing back a trimmed image (or that blank canvas)',
        'Text inside the picture is not text: a PNG has no keys or values to select, search or copy',
        'Long strings wrap at the page width, so what you see is already broken up; take JSON to TXT or keep the `.json` for the original run',
        'Quality and a target file size belong to lossy containers: the panel does not offer either for PNG and the encoder ignores them, so the only dial that applies here is the longest edge, which resamples when exceeded',
        'The image is a snapshot for people to read, with no promise that it parses back to JSON',
      ],
    },
    notes: {
      zh: [
        '要能翻页的成品文档：JSON→PDF 走同一条渲染链，分页在那边',
        '要小体积的分享图：JSON→JPG 按 A4 分页逐页编码，长文件会出 ZIP',
        '要可复制、可搜索的文本：JSON→HTML 或 JSON→TXT，图片这一路只负责看起来像界面',
      ],
      en: [
        'For a paged document: JSON to PDF shares the rendering chain, with pagination on that side',
        'For smaller shareable pictures: JSON to JPG encodes A4 pages one by one, with long files arriving as a ZIP',
        'For copyable, searchable text: JSON to HTML or TXT — the image route only promises it looks like the interface',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么我的长 JSON 转出来是一张很高的图，而不是很多页？',
          en: 'Why does one long JSON become one very tall image instead of pages?',
        },
        a: {
          zh: '因为 PNG 这一路是「整页捕获」：净化后的文档一次性渲染成一张画布，高度由内容决定，只有 32768 px 的上限。分页是 PDF 那条路的形状（JSON→PDF 与 JSON→JPG 都经它），两边刻意不同——一张长图适合贴进聊天，分页适合打印。',
          en: 'Because the PNG route is a whole-page capture: the sanitised document becomes one canvas whose height follows the content, bounded at 32768 px. Paging is the shape of the PDF route (JSON to PDF and JSON to JPG both go through it), and the difference is deliberate — a tall image pastes into a chat, pages print.',
        },
      },
      {
        q: {
          zh: '转出来的图能复制文字吗？',
          en: 'Can text be copied out of the picture?',
        },
        a: {
          zh: '不能。本扩展没有「从图里读回文字」那一步，PNG 产物也没有文字层，只有像素。要能选中与搜索的结果，请走 HTML、TXT 或 Markdown——它们用的正是这条链的前两步。',
          en: 'No. There is no step here that reads words back out of an image, and the PNG carries no text layer, only pixels. For something selectable and searchable take HTML, TXT or Markdown, which use the first two steps of this very chain.',
        },
      },
      {
        q: {
          zh: '很大很大的 JSON 会不会被悄悄截掉？',
          en: 'Does a very large JSON get quietly trimmed?',
        },
        a: {
          zh: '不会，两处都朝「如实说」设计：查看器序列化有行数与长度预算，触顶时界面会写明实际读了多少；整页高度超过 32768 px 时报错，而不是交付空白画布或被截短的图。',
          en: 'No. Both ends are built to say what happened: the viewer works under line and length budgets and the interface states how much it actually read when one is hit, and past 32768 px of page height the route fails instead of delivering a blank canvas or a trimmed image.',
        },
      },
    ],
  },
  {
    slug: 'json-to-jpg',
    from: 'json',
    to: 'jpg',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JSON 转 JPG——离线、A4 分页逐页编码、不上传',
      en: 'JSON to JPG offline — A4 pages, no upload',
    },
    desc: {
      zh: 'JSON 先渲染成查看器，再按 A4 分页写成无损页面、逐页编码成 JPEG：多页会打包成 ZIP，长文件一页一张。全程离线。',
      en: 'JSON renders as the viewer, is written as lossless A4 pages, then each page is encoded to JPEG: several pages arrive in a ZIP. Fully offline.',
    },
    lede: {
      zh: '这条路的形状与 PNG 那一格不同，而且差别是**路由里写明的**：`json>html` 之后，同为图片目标的 JPEG 先走 `html>pdf` 再走 `pdf>jpg`，而不是「截一张长图再压缩」。理由写在 `html-to-pdf.ts` 的注释里——`html→png→jpg` 交回的是按页面宽度排布的一条长带，而一份要分享或打印的 JSON 快照通常需要页边界；所以这条链在终点相同的比较里显式让 `html>pdf` 优先（`edgePreference`）。产物有三个具体后果：**一页一图**，长文件出多张并以 ZIP 交付；**中间那份 PDF 的页面是无损位图**（逐页 PNG 数据 URL 再嵌进文档），有损只发生在最后那一次 JPEG 编码；**折行仍由页面宽度决定**，长字符串在页内断开，断开的样子进图。可调的是质量与最长边，编码前按 `clampQuality` / `clampMaxEdge` 再钳一次，因为它们也可能来自存储而不是这次点选。与 PNG 那一格共享的边界也还在：整页渲染高度上限 32768 px、查看器不含远程引用、图片里没有可复制的文字。全过程在这个标签页里完成，只有 storage 权限。',
      en: 'This route has a different shape from the PNG page, and the difference is **stated in the routing**: after `json>html`, a JPEG target goes through `html>pdf` and then `pdf>jpg` rather than “capture one tall image and compress it”. The reason is in the comment at `html-to-pdf.ts` — `html→png→jpg` hands back a single strip laid out at page width, while a JSON snapshot meant for sharing or printing usually wants page boundaries, so the tie between the two image ends is broken explicitly in favour of `html>pdf` (`edgePreference`). Three concrete consequences: **one image per page**, so a long file yields several pictures delivered in a ZIP; **the PDF in the middle carries lossless bitmaps** (each page is PNG data URL before it is embedded), so the only lossy step is the final JPEG encode; and **layout still decides wrapping**, since long strings break inside the page and that broken-up look is what gets imaged. Quality and the longest edge are adjustable and re-clamped before encoding by `clampQuality` / `clampMaxEdge`, because those values can also arrive from storage rather than from this click. The boundaries shared with the PNG page remain: a 32768 px ceiling on rendered page height, a viewer with no remote reference, and no copyable text inside an image. All of it inside this tab on the storage permission.',
    },
    keeps: {
      zh: [
        '按 A4 分页、一页一 JPEG：每张都是完整的一页，而不是一条被切开的长带',
        '只有一次有损：中间那份 PDF 的页面是无损 PNG，压缩只发生在最后交给 JPEG 的那一次',
        '语法着色与折叠摘要按渲染结果进图，看起来就是你在浏览器里看到的那份查看器',
        '质量与最长边可调，并在编码前按同一套边界再钳一次（存储里的值也钳）',
      ],
      en: [
        'A4 pages, one JPEG each: every picture is a whole page rather than a slice of one long strip',
        'Only one lossy step: the PDF in the middle holds lossless PNG pages, so compression happens once, on the way out',
        'Syntax colouring and fold summaries enter the image as rendered, so it looks like the viewer you saw in the browser',
        'Quality and the longest edge are adjustable and re-clamped against the same bounds before encoding, including values coming from storage',
      ],
    },
    limits: {
      zh: [
        '多页会打包成 ZIP：一份长 JSON 可能出十几张编号图片，只想要一张长图请走 JSON→PNG',
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过就报「要渲染的页数过多」，并让你用页码范围只选需要的页或先把文件拆开——每一页在编码前各自占着一张全尺寸画布，200 页已经是数百 MB，再往前是标签页自己崩掉，那比一条错误难说清得多',
        'JPEG 是有损的：等宽字形的细边与语法着色的小面积色块会留下压缩痕迹，低对比的那类最敏感',
        '文字进图就不可选：产物没有文字层，不能搜索也不能复制；要这些请走 JSON→TXT / HTML / Markdown',
        '整页渲染高度上限 32768 px 仍然适用，超限报错而不是交付被截短的内容',
        '不承诺能再解析回 JSON：这一格交付的是给人看的快照，不是数据交换格式',
      ],
      en: [
        'Several pages arrive as a ZIP: a long JSON can produce a dozen numbered pictures, so take JSON to PNG when you want one tall image',
        'At most 200 pages rasterise in one pass (`MAX_PDF_IMAGE_PAGES`): past that the route reports “too many pages to render at once” and points at a page range or splitting the file — every page holds a full-size canvas until it is encoded, 200 of them is already hundreds of megabytes, and beyond that the tab crashes itself, which is far harder to explain than an error',
        'JPEG is lossy: thin monospace edges and the small colour fields of syntax highlighting show artefacts, and low-contrast pairs suffer most',
        'Text inside an image is not selectable: there is no text layer to search or copy; take JSON to TXT, HTML or Markdown for that',
        'The 32768 px ceiling on rendered page height still applies, and exceeding it reports failure instead of delivering trimmed content',
        'No promise that it parses back to JSON: this page delivers a snapshot for people to read, not a data format',
      ],
    },
    notes: {
      zh: [
        '想要一张不分页的长图：JSON→PNG，同一条渲染链的另一半',
        '想要成品文档：JSON→PDF，页面就是文档本身、还能继续打印',
        '想要小体积又可读：先看 JSON→HTML 的渲染，再决定是截长图还是分页',
      ],
      en: [
        'For one unpaginated tall image: JSON to PNG, the other half of the same rendering chain',
        'For a finished document: JSON to PDF, whose pages are the artifact and still print',
        'For the smallest readable result: look at JSON to HTML first, then decide between a tall shot and pages',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么不干脆把长图压成 JPEG，而要分页？',
          en: 'Why page it instead of just compressing the tall image?',
        },
        a: {
          zh: '因为那条路交回的是按页面宽度排布的一条长带，而这条取舍写在路由里：同分的图片终点由 `edgePreference` 排序（`html>pdf` 是 0、`html>png` 是 10，小的排前面），不是实现顺带的后果。分页给的是页边界与一页一图，长图给的是单次捕获。',
          en: 'Because that route hands back a single strip laid out at page width, and the choice is written into the routing: the tie between the two image ends is ordered by `edgePreference` (0 on `html>pdf`, 10 on `html>png`, lower first), not an accident of implementation. Paging buys page bounds and one picture per page; the tall capture buys a single canvas.',
        },
      },
      {
        q: {
          zh: '一次有损和两次有损，差别在哪里？',
          en: 'One lossy step or two — where is the difference?',
        },
        a: {
          zh: '中间那份 PDF 的页面是无损 PNG，所以文字与色块在渲染之后只被 JPEG 编过一次。若中间先出 JPEG 再出 JPEG，细字与着色边界会被压两次——这条链刻意避开那种形状。',
          en: 'The PDF in the middle holds lossless PNG pages, so your glyphs and colour fields are JPEG-encoded exactly once after rendering. Going JPEG to JPEG would crush thin strokes and highlight edges twice, which is the shape this chain avoids.',
        },
      },
      {
        q: {
          zh: '长文件会得到几个文件？',
          en: 'How many files does a long document produce?',
        },
        a: {
          zh: '一页一张，张数由排版后的总高度除以页高决定；两张以上时产物是一个 ZIP。想要单份文件，请走 JSON→PNG（一张长图）或 JSON→PDF（一份文档）。',
          en: 'One picture per page, the count set by the laid-out height divided by page height, and two or more arrive inside a ZIP. For a single file take JSON to PNG (one tall image) or JSON to PDF (one document).',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-png',
    from: 'md',
    to: 'png',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 转 PNG——离线、整篇排成长图、不上传',
      en: 'Markdown to PNG offline — the whole document as one image',
    },
    desc: {
      zh: 'Markdown 先按 GFM 渲染成带样式的 HTML，再无损截成一张长图：表格有条纹、行内 SVG 图形保留。高度超过 32768 px 会报错而不是截断。',
      en: 'GFM renders to styled HTML, then the page is captured losslessly: striped tables and inline SVG diagrams survive the trip. Past 32768 px it fails, not trims.',
    },
    lede: {
      zh: '想把一份 README 或笔记「原样」甩进聊天工具，不必担心对面那套渲染器把它重新排版，一张图比一段文字可靠。这条路两步：`md>html` 用 marked 按 GFM 渲染（`gfm: true`，所以管道符表格、删除线、任务清单、自动链接都被认出；`breaks: false`，段落里单个换行仍是续行），渲染结果先过 DOMPurify（html + svg 两套 profile，因此**文档里内联的 SVG 图形不会被当垃圾删掉**——那是架构图与示意图最常见的写法），再由 `wrapHtmlDocument` 套上这份扩展自带的样式表；`html>png` 把净化后的文档离屏渲染成整页画布并无损编码成 PNG。图里看到的排版因此是这套样式决定的：正文最大宽度 800 px 居中、行高 1.7，表格 `border-collapse`、每个单元 1px 实线边框与内边距，表头与偶数行各带一层浅底，代码块是浅灰圆角块，`h1` 带一条下边线。三条边界照实说：**引用了网络地址或相邻路径的图片取不到字节**，因为渲染前先剥掉子资源引用（这既是离线主张也是渲染前提），结果卡会按张数披露丢了几张，被替换处留虚线方框；**整页高度上限是 32768 px**（`MAX_CANVAS_EDGE × 4`），超出报「渲染高度过大」而不是交付空白画布或被截短的图；**图里的文字不是文字**，PNG 没有文字层，不能选中、搜索或复制。全过程在这个标签页里完成，只有 storage 权限。',
      en: 'When a README or a note has to land in a chat exactly as it reads — the receiving side has no renderer left to re-lay it with — one picture is more dependable than a block of text. Two steps: `md>html` renders through marked as GFM (`gfm: true`, so pipe tables, strikethrough, task lists and autolinks are recognised, while `breaks: false` keeps a single newline a soft wrap), the markup passes DOMPurify with the html and svg profiles, so **an inline SVG diagram is not deleted as junk** (the usual way people draw architecture sketches), and `wrapHtmlDocument` wraps it in the stylesheet this extension ships; `html>png` then renders the sanitised document offscreen and encodes the whole page losslessly as PNG. That stylesheet is what the picture shows: an 800 px centred measure with 1.7 line height, `border-collapse` tables with a 1px rule and padding on every cell, a tinted header row and alternating rows, code blocks as light rounded panels, `h1` underlined. Three boundaries, stated plainly: **images referenced by network address or a sibling path have no bytes available**, because sub-resource references are stripped before rendering (the offline guarantee and the rendering precondition are the same act), the result card discloses how many were lost and each replaced reference keeps a dashed placeholder; **one capture is bounded at 32768 px of height** (`MAX_CANVAS_EDGE × 4`) and past that the route reports “too tall to render” instead of delivering a blank canvas or a trimmed image; and **text in the picture is not text** — a PNG has no text layer, so nothing can be selected, searched or copied. All of it inside this tab on the storage permission.',
    },
    keeps: {
      zh: [
        '排版进图而不是文字进图：表头条纹、代码块底色、`h1` 下边线都按自带的样式表渲染出来',
        '行内 SVG 图形保留：html + svg 两套净化 profile，架构图不会因为「不是 HTML 标记」被整块删掉',
        'GFM 表格按表格渲染：管道符语法变成有边框与条纹的表，而不是一排竖线',
        '无损编码：细线、小字号与色块边缘不糊，缩放查看时仍然锐利',
      ],
      en: [
        'The layout goes into the image: table striping, code-panel fills and the `h1` rule render exactly as the bundled stylesheet says',
        'Inline SVG diagrams survive: the html and svg sanitising profiles mean an architecture sketch is not deleted for being markup',
        'GFM tables render as tables, with borders and striping rather than a run of vertical bars',
        'Lossless encoding: thin rules, small type and colour fields take no second compression pass, while zoom headroom follows the density chosen for the height',
      ],
    },
    limits: {
      zh: [
        '整页高度上限 32768 px：超长文档会报错并说明，不给被截短的图；要分页请走 Markdown→PDF 或 Markdown→JPG',
        '引用的远程与相邻路径图片取不到字节：渲染前会剥掉这些引用，结果卡按张数披露，被替换的位置留虚线方框',
        '图里的文字不可复制：没有文字层，不能选中、搜索或无障碍朗读出来',
        '质量与目标体积是有损容器才有的档位：面板对 PNG 不提供它们，编码器也会忽略；这一路可调的只有最长边，超出会重采样',
        '等宽代码块按 800 px 正文宽度排版，超长行会横向溢出到面板内部而不是折行——那是样式表的行为，图片忠实拍下',
      ],
      en: [
        'A 32768 px height ceiling: an over-long document fails with an explanation rather than a trimmed picture; take Markdown to PDF or JPG for pages',
        'Images pointed at by a network address or a sibling path have no bytes: those references are stripped before rendering, the result card says how many were lost, and each replaced spot keeps a dashed placeholder',
        'Text inside the image cannot be copied: there is no text layer to select, search or read aloud',
        'Quality and a target file size belong to lossy containers: the panel does not offer either for PNG and the encoder ignores them, so the only dial that applies here is the longest edge, which resamples when exceeded',
        'Monospace code lays out inside the 800 px measure and very long lines overflow the panel rather than wrapping; that is the stylesheet’s behaviour and the image reproduces it faithfully',
      ],
    },
    notes: {
      zh: [
        '要能打印或分页的成品：Markdown→PDF，页面就是文档本身',
        '要小体积的分享图：Markdown→JPG 走同一条渲染链再分页逐张有损编码',
        '要能复制与搜索的文本：Markdown→HTML、TXT 或 Word，图片这一路负责的是「看起来就是我写的」',
      ],
      en: [
        'For something printable and paginated: Markdown to PDF, where the pages are the document',
        'For smaller shareable pictures: Markdown to JPG shares this rendering chain and then encodes pages lossily one by one',
        'For copyable, searchable text: Markdown to HTML, TXT or Word — the image route is for looking exactly like what you wrote',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的文档里有 Mermaid 画的图，会变成什么？',
          en: 'What happens to a Mermaid diagram in my document?',
        },
        a: {
          zh: '取决于它在源文件里长什么样。已经被渲染成内联 `<svg>` 的图会保留并出现在图里（净化用的是 html + svg 两套 profile）；仍是 ```mermaid 围栏源码的那一种，这一步只负责渲染 Markdown，不会替你把它画出来，产物里看到的就是代码块文字。',
          en: 'It depends on what is in the source. A diagram already written as inline `<svg>` is kept and shows up, because sanitising uses the html and svg profiles together. One still written as a ```mermaid fence is not drawn for you — this step renders Markdown, so the picture shows the code block’s text.',
        },
      },
      {
        q: {
          zh: '为什么图片位置是空的，还多了一块虚线框？',
          en: 'Why is an image slot empty, with a dashed box there?',
        },
        a: {
          zh: '因为那些字节本来就不在文件里。这条路完全离线，渲染前会剥掉指向网络与相邻路径的子资源引用（否则「打开一张图就发了四次请求」会变成事实），替换掉的位置是一个虚线方框（只在克隆那一步失败的那种直接空着），结果卡按张数写明丢了几张。把图片另存进同一个目录并不能绕过它——剥的是引用，不是文件。',
          en: 'Because those bytes were never in the file. The route is fully offline and strips sub-resource references to the network and to sibling paths before rendering — otherwise “open one image and fire four requests” would be true — so replaced slots keep a dashed box and the result card states how many were lost. Putting the images next to the file does not avoid it: what is removed is the reference, not the file.',
        },
      },
      {
        q: {
          zh: '一份很长的 Markdown 会出几张图？',
          en: 'How many images does a long Markdown file produce?',
        },
        a: {
          zh: '一张：整页捕获是一整块画布，高度由内容决定，上限 32768 px，超出就报错。想要一页一张的形状，请走 Markdown→PDF 或 Markdown→JPG。',
          en: 'One: a whole-page capture is a single canvas whose height follows the content, bounded at 32768 px, and beyond that the route fails. For one picture per page take Markdown to PDF or JPG.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-docx',
    from: 'csv',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'CSV 转 Word——离线、值按写下的字符落地、不上传',
      en: 'CSV to Word offline — values keep their characters',
    },
    desc: {
      zh: 'CSV 先按 `raw: true` 读成一张 HTML 表，再打包成 Word 文档：`00424`、`2024-01-05` 保持写下的字符，排版由 Word 决定。全程离线。',
      en: 'The CSV is read with raw: true into an HTML table, then packed as a Word file whose layout Word itself decides: 00424 and 2024-01-05 stay as written. Offline.',
    },
    lede: {
      zh: '两步：`csv>html` 用 `XLSX.read(text, { type: "string", raw: true })` 把文件读成一张表，再交给 `sheet_to_html`；`html>docx` 把这份文档交给 `asBlob` 打成一份真的 `.docx` 容器，内容是一段 MHT altChunk——也就是说**排版发生在 Word 里**，字体、列宽、配色都归打开它的那款软件，不归这条链。`raw: true` 是唯一要紧的一步：不加它，SheetJS 的类型推断器会先改写你的数据，实测同一格 `2024-01-05` 在不 raw 的读取下单元格里写的是 `data-t="n" data-v="45296.33383101852"` 而显示文本是 `1/5/24`，加了 raw 之后 `data-v` 与显示文本都是 `2024-01-05` 那一串字符，`00424` 也不会缩成 `424`。还有一条容易被误以为「转换弄丢了东西」的形状要说清：`sheet_to_html` **不产出表头语义**——实测每一行都是 `<tr><td …>`，没有 `<thead>` 也没有 `<th>`，所以第一行在 Word 里与普通行同样处理，想要「标题行」的外观，请在 Word 里勾选表格标题行或自己套样式。安全那条边界也照实说：这段 HTML 不是由我们渲染的，Word 会在用户机器上解析它，所以远程引用在打包前被整体剥掉（`stripRemoteResources`，含 `//host/x.png` 那种协议相对地址），否则一个远程 `<img>` 就变成由另一个应用发出的跟踪像素，落在 CSP 与离线守卫都看不见的地方；内联 SVG 则在净化**之前**先栅格成 PNG，因为 `html` profile 里没有任何 svg 标签——曾经失败过一次「产物是有效的空 .docx 而批次报成功」。打包失败会报 `errors.docxGen`，不会交出一份打不开的文件。全程在这个标签页里完成，只有 storage 权限。',
      en: 'Two steps: `csv>html` reads the file with `XLSX.read(text, { type: "string", raw: true })` and hands it to `sheet_to_html`; `html>docx` gives that document to `asBlob`, which packs a real `.docx` container whose body is an MHT altChunk — meaning **the layout happens in Word**: fonts, column widths and colours belong to whatever opens it, not to this chain. `raw: true` is the step that matters. Without it SheetJS’s inferrer rewrites your data first — measured on the same cell, a non-raw read writes `data-t="n" data-v="45296.33383101852"` and displays `1/5/24`, while the raw read writes and displays `2024-01-05`, and `00424` does not shrink to `424`. One shape that is often misread as the converter losing something: `sheet_to_html` **produces no header semantics** — measured, every row is `<tr><td …>` with no `<thead>` and no `<th>`, so the first row is treated like any other in Word; for a title-row look, mark it in Word or apply a style yourself. The security boundary is stated rather than glossed: this markup is not rendered by us — Word parses it on the user’s machine — so remote references are stripped before packing (`stripRemoteResources`, including protocol-relative `//host/x.png`), because otherwise one remote `<img>` becomes a tracking pixel issued by a different application, outside both the CSP and the offline guards. Inline SVG is rasterised to PNG **before** sanitising, since the `html` profile contains no svg tag at all — the earlier failure produced a valid but empty `.docx` while the batch reported success. A packing failure reports `errors.docxGen` instead of handing back a file that will not open. All of it inside this tab on the storage permission.',
    },
    keeps: {
      zh: [
        '值按文件里写下的字符落地：`00424`、`2024-01-05`、`1/2` 都不被推断成数字或日期（实测 `raw: true` 下 `data-v` 与显示文本一致）',
        '一个工作表一张表：按 CSV 字节解析就是一张表，产物里不会莫名多出第二张；若正文其实不是 CSV 形状而是 HTML（读取器先看内容再看后缀），多张 `<table>` 会被读成多个工作表，那种情况下每张表前会有一个取自表名的小标题',
        '单元格里的文字内容保留：`sheet_to_html` 写出的是格子里的字，不是重新格式化后的显示串',
        '远程引用被剥净再交给 Word：这条链不把「打开即发请求」的风险写进产物',
      ],
      en: [
        'Values land as the characters the file carries: `00424`, `2024-01-05` and `1/2` are not inferred into numbers or dates (measured: with `raw: true`, `data-v` and the displayed text agree)',
        'One worksheet, one table: read as CSV bytes there is a single sheet, so no second table appears out of nowhere — and if the payload is really HTML (the reader looks at content before the extension), several tables become several worksheets, each then preceded by a heading carrying its sheet name',
        'The words inside cells are kept: `sheet_to_html` writes what is in the cell rather than a re-formatted display string',
        'Remote references are stripped before Word sees the markup, so this chain does not write an open-and-request risk into the artifact',
      ],
    },
    limits: {
      zh: [
        '没有表头语义：实测每行都是 `<td>`，既无 `<thead>` 也无 `<th>`，所以 Word 不会知道你的第一行是标题行（要那个外观，请在 Word 里勾「标题行」或自己套样式）',
        '排版不由这条链决定：altChunk 意味着 Word 负责字体、列宽与分页，同一份 CSV 在不同软件里可能排得不一样',
        '数字类型不迁移：这里不恢复数字与日期类型（那是 CSV→Excel 那条按值取数的路），文档里就是一格一格的字',
        '指向网络或相邻路径的图片取不到字节，且远程引用会被剥掉，所以图不会出现在文档里；文字数据不受影响',
        '样式与公式不携带：CSV 本身没有格式，条件格式、批注、冻结窗格这些概念在这条链上没有任何对应物',
      ],
      en: [
        'No header semantics: measured, every row is `<td>` with no `<thead>` and no `<th>`, so Word is not told your first row is a title — tick “Header Row” there or style it yourself for that look',
        'The layout is not this chain’s decision: an altChunk means Word owns fonts, column widths and pagination, so the same CSV can lay out differently in different software',
        'Numeric types do not travel: nothing here restores number or date types (that is what CSV to Excel does with its round-trip typing rule), so the document holds words per cell',
        'Images pointed at the network or a sibling path have no bytes and remote references are stripped, so no pictures appear; the text data is unaffected',
        'Styling and formulas are not carried: a CSV has none, and conditional formatting, comments or frozen panes have no counterpart on this route',
      ],
    },
    notes: {
      zh: [
        '要可计算的电子表格：CSV→Excel，那条链会把确实是数字的格按「逐字节回得来」的规则还原',
        '要一份能贴进既有模板的文档：先转 HTML，再由你在 Word 里套样式，比指望这里携带格式更稳',
        '只是想要一份可读的纯文本表：CSV→TXT / CSV→Markdown，竖线排版在 Markdown 里还能继续编辑',
      ],
      en: [
        'For a computable spreadsheet: CSV to Excel, whose round-trip rule gives genuine numbers their type back',
        'For something that must fit an existing template: convert to HTML first, then apply your Word style there — more dependable than expecting styling to travel',
        'For a readable plain-text table: CSV to TXT or Markdown, where the pipe layout stays editable',
      ],
    },
    faq: [
      {
        q: {
          zh: '第一行是表头，Word 里会显示成表头吗？',
          en: 'My first row is a header — will Word show it as one?',
        },
        a: {
          zh: '不会自动。实测 `sheet_to_html` 每行都写成 `<td>`，没有 `<th>`，所以文档结构里没有「这是标题行」这一项，第一行不会以表头身份存在。要那种外观得由你在打开它的软件里把首行标成标题行——这份产物不替你决定。反过来说，这也意味着任何一行都能被安全地当成数据行处理，不会因为样式而错位。',
          en: 'Not automatically. Measured, `sheet_to_html` writes every row as `<td>` with no `<th>`, so the file carries no “this is the title row” information and no row is marked as a header; turning one into a header is your decision in whatever opens it, not this chain’s. The flip side: no row is special, so nothing shifts because of header styling.',
        },
      },
      {
        q: {
          zh: '为什么我的日期在 Word 里不是日期格式？',
          en: 'Why is my date not a date format in Word?',
        },
        a: {
          zh: '因为这条路刻意不猜类型。CSV 里 `2024-01-05` 只是一串字符，把它「还原成日期」正是把 `1/2` 变成某年某月某日、把邮编 `00424` 变成 `424` 的那一步。所以要的是可计算的日期列，请走 CSV→Excel 那条按值取数的路，而不是让文档替你做这个决定。',
          en: 'Because this route deliberately guesses nothing. In a CSV `2024-01-05` is characters, and “restoring” it is exactly the step that turns `1/2` into a calendar day and the zip `00424` into `424`. For real date columns take CSV to Excel with its round-trip rule rather than letting a document make that decision for you.',
        },
      },
      {
        q: {
          zh: '转换后的 .docx 会被 Word 拦住吗？',
          en: 'Will Word block the resulting .docx?',
        },
        a: {
          zh: '产物是一份 OPC 容器，正文以 altChunk 形式内嵌，排版由打开它的那款软件决定。要说明的是：远程引用在打包前已被剥净，文档里不含需要联网解析的子资源。打包抛错、或返回的不是 Blob 时，界面报转换错误，而不是交出一个未完成的文件。',
          en: 'It is an ordinary OPC container whose body is carried as an altChunk, so the layout belongs to whichever application opens it. The point worth stating: remote references are stripped before packing, so the document holds no subresource that would need the network. If packing throws, or hands back something that is not a Blob, the interface reports a conversion error rather than an unfinished file.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-png',
    from: 'csv',
    to: 'png',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'CSV 转 PNG——离线、整张表成一张图、不上传',
      en: 'CSV to PNG offline — one striped table image',
    },
    desc: {
      zh: 'CSV 先按 `raw: true` 读成 HTML 表，再整页无损截成一张 PNG：1px 边框与行条纹由自带样式表决定。高度超过 32768 px 会报错而不是截断。',
      en: 'Read with raw: true into HTML, then captured losslessly as one PNG: 1px rules and row striping come from the bundled stylesheet. Past 32768 px it fails.',
    },
    lede: {
      zh: '要把一张表甩进只吃图片的地方（聊天、幻灯片、表单附件），一张图比一段贴过去会散版的表格可靠。两步：`csv>html` 用 `raw: true` 读取（所以 `00424` 不会缩成 `424`、`2024-01-05` 不会变成 `1/5/24`，实测 `data-v` 与显示文本一致）并交给 `sheet_to_html` 写成一张表，再套上这份扩展自带的样式表；`html>png` 把净化后的文档离屏渲染成整页画布并无损编码。图里看到的排版因此是那条样式表决定的：正文最大宽度 800 px 居中、表格 `width: 100%` 且 `border-collapse`、每个单元 1px 实线边框加内边距、偶数行一层浅底——**注意条纹按行序落**：因为 `sheet_to_html` 不产出 `<th>`（实测每行都是 `<td>`），你的表头行不会得到特别待遇，它是第一行、白底，第二行才有浅底。列多而窄时文字换行而不是把画布撑宽（正文的 `word-wrap: break-word`），所以你得到的是一张排版宽度固定（800 px 正文）、高度随内容长的一张图，而画布的像素宽度按内容高度取 2x、1.5x 或 1x——越长的文档像素密度越低。两条边界：整页高度上限 32768 px（`MAX_CANVAS_EDGE × 4`），超出报「渲染高度过大」而不是交付空白画布或被截短的图；图里的文字不是文字，PNG 没有文字层。全过程在这个标签页里完成，只有 storage 权限，渲染前还会剥掉远程引用。',
      en: 'When a table has to go somewhere that only accepts pictures — chat, a slide, a form attachment — one image is more dependable than a paste that loses its layout. Two steps: `csv>html` reads with `raw: true` (so `00424` does not shrink to `424` and `2024-01-05` does not become `1/5/24`; measured, `data-v` and the displayed text agree), hands the sheet to `sheet_to_html`, and wraps it in the stylesheet this extension ships; `html>png` renders the sanitised document offscreen and encodes the whole page losslessly. What you see is that stylesheet: an 800 px centred measure, `width: 100%` tables with `border-collapse`, a 1px rule and padding on every cell, and one tint on even rows — and **the striping follows row order**, because `sheet_to_html` emits no `<th>` (measured: every row is `<td>`), so your header row gets no special treatment: it is row one, on white, and row two is the first tinted one. With many columns the text wraps rather than widening the canvas (`word-wrap: break-word` on the measure), so what you get is a fixed 800 px measure with a content-driven height, while the canvas pixels come out at 2x, 1.5x or 1x depending on that height — the taller the table, the lower the density. Two boundaries: one capture is bounded at 32768 px of height (`MAX_CANVAS_EDGE × 4`) and past it the route reports “too tall to render” instead of delivering a blank canvas or a trimmed image; and text in the picture is not text — a PNG has no text layer. All of it inside this tab on the storage permission, with remote references stripped before rendering.',
    },
    keeps: {
      zh: [
        '值按写下的字符进图：`raw: true` 让 `00424` 与 `2024-01-05` 保持原字符，图里不会出现被推断过的 `424` 或 `1/5/24`',
        '边框与条纹由自带样式表给出：每格 1px 实线、表格 100% 宽并折叠边框，偶数行一层浅底',
        '排版宽度固定、高度随内容：一张图就是一整张表，不用滚动拼接，像素密度则按高度取 2x / 1.5x / 1x',
        '无损编码：像素之间不引入新的量化损失，但能放大到多清楚由那档像素密度决定——很长的表落在 1x',
      ],
      en: [
        'Characters go into the picture as written: `raw: true` keeps `00424` and `2024-01-05`, so no inferred `424` or `1/5/24` shows up',
        'Rules and striping come from the bundled stylesheet: a 1px border on every cell, 100% width with collapsed borders, one tint on even rows',
        'A fixed 800 px measure with content-driven height: one image is the whole table, with no scrolling and no stitching, while the pixel ratio steps 2x → 1.5x → 1x as the page grows taller',
        'Lossless encoding: no extra quantisation between pixels, though how far it stays readable when zoomed depends on the density the height chose, and long tables land on 1x',
      ],
    },
    limits: {
      zh: [
        '表头不会被特别对待：没有 `<th>`，条纹按行序落，所以第一行是白底——想让表头在图里显眼，请在源数据里自己加视觉区分',
        '高度上限 32768 px：几千行的表会报错并说明，不给被截短的图；要分页请走 CSV→PDF 或 CSV→JPG',
        '文字不可选中、搜索或朗读：PNG 没有文字层，要这些请用 HTML / Markdown / Excel',
        '宽表不换画布宽度而是换行：列特别多时每列会挤窄，读起来不如原始 CSV 利落',
        '质量与目标体积是有损容器才有的档位：面板对 PNG 不提供它们，编码器也会忽略；这一路可调的只有最长边，超出会重采样',
      ],
      en: [
        'The header is not treated specially: with no `<th>`, striping follows row order, so row one is untinted — add your own visual cue in the source if it has to stand out',
        'A 32768 px height ceiling: a table of thousands of rows fails with an explanation rather than a trimmed picture; take CSV to PDF or JPG for pages',
        'Nothing is selectable, searchable or copyable: a PNG has no text layer, so use HTML, Markdown or Excel for that',
        'Wide tables wrap instead of widening: with many columns each one squeezes and it reads less cleanly than the CSV itself',
        'Quality and a target file size belong to lossy containers: the panel does not offer either for PNG and the encoder ignores them, so the only dial that applies here is the longest edge, which resamples when exceeded',
      ],
    },
    notes: {
      zh: [
        '要能打印的成品：CSV→PDF 走同一条 HTML 中转，分页与页边距在那边',
        '要小体积的分享图：CSV→JPG 按 A4 分页逐页有损编码，长表会出 ZIP',
        '要继续加工数据：CSV→Excel 或 CSV→JSON，图片这一格交付的是给人看的那一张',
      ],
      en: [
        'For something printable: CSV to PDF shares the HTML bridge, with pages and margins on that side',
        'For smaller shareable pictures: CSV to JPG encodes A4 pages lossily one by one, long tables arriving in a ZIP',
        'To keep working on the data: CSV to Excel or JSON — this page delivers the picture, not the dataset',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么图里第一行没有加粗或底色？',
          en: 'Why is the first row in the image not bold or shaded?',
        },
        a: {
          zh: '因为中间那份 HTML 里没有 `<th>`——实测 `sheet_to_html` 每行都写成 `<td>`，样式表里加粗与浅底是挂在 `<th>` 与偶数行上的，所以你的表头行只会按普通第一行的样子出现。要那个外观，可在源文件里插一行视觉分隔，或转成 HTML 后自己套样式。',
          en: 'Because the intermediate HTML has no `<th>` — measured, `sheet_to_html` writes every row as `<td>`, and the stylesheet’s bold and tint hang on `<th>` and on even rows, so a header row appears as just row one. Add a visual separator in the source, or style it after converting to HTML.',
        },
      },
      {
        q: {
          zh: '一张几百列的表会怎样？',
          en: 'What happens to a table with hundreds of columns?',
        },
        a: {
          zh: '宽度固定在 800 px 正文里，表格占满它，列数越多每列越挤，单元内文字换行；只有内容高度超过 32768 px 时这条链会明确报错。所以宽表更适合走 HTML 或 Excel，图片适合列数可控、想一眼看完的那类。',
          en: 'The measure stays 800 px wide and the table fills it, so more columns means narrower ones with wrapping text; the route only fails outright past 32768 px of content height. Wide tables belong with HTML or Excel — a picture is for tables you can take in at one look.',
        },
      },
      {
        q: {
          zh: '数字会在图里变成科学计数吗？',
          en: 'Do numbers go exponential in the image?',
        },
        a: {
          zh: '不会。这一路的读取用 `raw: true`，值以字符形态进表格，长整数与带前导零的编号原样显示——被推断成数字（进而可能被显示成科学计数）的是不按 raw 读的那条路。图里的样子就是你文件里的字符。',
          en: 'No. The read uses `raw: true`, so values enter the table as characters and long integers or zero-padded ids display exactly as typed; the inferred-into-a-number path is the non-raw read. What the picture shows is the characters in your file.',
        },
      },
    ],
  },
  {
    slug: 'csv-to-jpg',
    from: 'csv',
    to: 'jpg',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'CSV 转 JPG——离线、A4 分页逐页编码、不上传',
      en: 'CSV to JPG offline — A4 pages, no upload',
    },
    desc: {
      zh: '表格先写成无损的 A4 PDF 页面，再逐页编码成 JPEG：质量与目标体积在这里有档位，长表会跨页并打包成 ZIP。全程离线。',
      en: 'The table becomes lossless A4 PDF pages, then one JPEG per page: quality and target size have dials here, and long tables arrive in a ZIP. Offline.',
    },
    lede: {
      zh: '三步：`csv>html` 用 `raw: true` 读取并写成一张 HTML 表（`00424` 不缩成 `424`、`2024-01-05` 不会变成 `1/5/24`，实测 `data-v` 与显示文本一致），套上自带的样式表；`html>pdf` 把这份文档按 A4 分页，**每一页以无损位图嵌进 PDF**（渲染逐页走 `toDataURL` 的 PNG 那一条），`pdf>jpg` 再把每一页编码成 JPEG。这条形状是路由里写死的取舍，不是顺带：同为图片目标，PNG 走整页捕获得到一张长图，而 JPG 与 WebP 走 PDF 那条，因为同分的图片目标里这条排序由 `edgePreference` 决定（`html>pdf` 是 0、`html>png` 是 10，小的排前面），所以图片出口的分页形状是路由定的，不是顺带的。于是三件具体的事跟着来：**一页一图**，长表跨页、两张以上以 ZIP 交付；**只损失一次**，中间那份 PDF 的页面是无损的，压缩只在最后交给 JPEG 那一次发生；**这里才有档位可调**——质量与目标体积挂在有损容器上（编码器与面板都按这一条来），所以想让文字边缘更干净就升质量，想让文件更小就设目标体积，后者会先降质量、再降尺寸去追。要照实说的两条：最后那道编码是有损的，质量与目标体积就是为它准备的档位；而图里的文字不是文字，不能选中、搜索或朗读。高度那条边界与 CSV→PNG 共享同一个量法：32768 px 限制的是「整篇文档一次渲染成的那块画布」，A4 分页是在它之上切出来的，超限就报错。全程在这个标签页里完成，只有 storage 权限，渲染前会剥掉远程引用。',
      en: 'Three steps: `csv>html` reads with `raw: true` and writes one styled HTML table (so `00424` does not shrink to `424` and `2024-01-05` does not become `1/5/24`; measured, `data-v` and the displayed text agree); `html>pdf` lays that document out as A4 pages, **embedding each page as a lossless bitmap** (the per-page render goes down the PNG branch of `toDataURL`), and `pdf>jpg` then encodes every page as JPEG. That shape is a routing decision, not a side effect: between the two image ends, PNG takes the whole-page capture and yields one tall image, while JPG and WebP take the PDF route, because the tie between the two image ends is decided by `edgePreference` (0 on `html>pdf`, 10 on `html>png`, lower sorting first), so the paging shape of this output is a routing fact rather than a side effect. Three concrete things come with it: **one image per page**, so a long table spans pages and two or more arrive in a ZIP; **only one lossy step**, since the PDF in the middle holds lossless pages and compression happens once, on the way out; and **this is where the dials live** — quality and a target file size belong to lossy containers, for both the encoder and the panel, so a higher quality keeps text edges cleaner while a target size chases quality down first and resolution after. Two things stated plainly: the final encode on this route is lossy, and quality and a target size are precisely its dials; and text in the picture is not text, with nothing to select, search or read aloud. The height boundary is shared with CSV to PNG in the same measurement: 32768 px caps the one canvas the whole document is rendered into, and the A4 slicing happens on top of it, so an over-tall document fails. All of it inside this tab on the storage permission, with remote references stripped before rendering.',
    },
    keeps: {
      zh: [
        '一页一张 JPEG：长表按 A4 切开，每张都是完整的一页，适合直接翻页查看或打印',
        '只损失一次：中间那份 PDF 的页面是无损位图，压缩只在最后交给 JPEG 的那一次发生',
        '值按文件里的字符进表格，`raw: true` 让 `00424` 与 `2024-01-05` 保持原样',
        '质量与目标体积在这里可调（它们本就挂在有损容器上），编码后再按目标追逐',
      ],
      en: [
        'One JPEG per A4 page: a long table is cut into whole pages you can flip through or print',
        'Only one lossy step: the PDF in the middle holds lossless bitmaps, so compression happens once, on the way out',
        'Values enter the table as the characters in the file, and `raw: true` keeps `00424` and `2024-01-05` as typed',
        'Quality and a target file size are adjustable here (they belong to lossy containers), with a chase after encoding',
      ],
    },
    limits: {
      zh: [
        '最后一道是有损编码：质量与目标体积两个档位都是为它准备的，要严格还原同一套线条与字形请走 CSV→PNG',
        '多页出 ZIP，不是一张大图：想「一眼看完」请走 CSV→PNG（整页捕获）或 CSV→PDF（一份文档）',
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过就报「要渲染的页数过多」，并让你用页码范围只选需要的页或先把文件拆开——每一页在编码前各自占着一张全尺寸画布，200 页已经是数百 MB，再往前是标签页自己崩掉，那比一条错误难说清得多',
        '文字不可选中、搜索或朗读：产物是位图，要这些请用 HTML / Markdown / Excel',
        '条纹按行序落、第一行没有表头待遇：`sheet_to_html` 不产出 `<th>`（实测），样式表的浅底挂在 `<th>` 与偶数行上',
        '32768 px 量的是整篇文档一次渲染成的那块画布（A4 分页在其上切），超限报错而不是交付被截短的内容；排版宽度固定在 800 px 正文，画布像素密度按高度取档',
      ],
      en: [
        'The final encode is lossy, with quality and target size as its two dials — take CSV to PNG for an exact rendering of the same rules and glyphs',
        'Several pages arrive as a ZIP rather than one picture: for one view take CSV to PNG (whole-page capture) or CSV to PDF (one document)',
        'At most 200 pages rasterise in one pass (`MAX_PDF_IMAGE_PAGES`): past that the route reports “too many pages to render at once” and points at a page range or splitting the file — every page holds a full-size canvas until it is encoded, 200 of them is already hundreds of megabytes, and beyond that the tab crashes itself, which is far harder to explain than an error',
        'Nothing is selectable, searchable or copyable: the artifact is bitmap; use HTML, Markdown or Excel for that',
        'Striping follows row order and row one gets no header treatment: `sheet_to_html` emits no `<th>` (measured), while the stylesheet hangs its tint on `<th>` and even rows',
        'A 32768 px ceiling on the single canvas the whole document is rendered into (the A4 slicing happens on top of it), failing rather than trimming; the measure stays 800 px while the pixel density steps with height',
      ],
    },
    notes: {
      zh: [
        '要严格无损的一张图：CSV→PNG，整页捕获、无第二次压缩',
        '要能打印的成品：CSV→PDF，页面本身就是文档，比一叠图片更好归档',
        '要继续算：CSV→Excel / CSV→JSON，交付数据而不是交付画面',
      ],
      en: [
        'For one exactly-lossless picture: CSV to PNG, a whole-page capture with no second compression',
        'For something printable: CSV to PDF, where the pages are a document rather than a stack of images',
        'To keep computing: CSV to Excel or JSON, which deliver data instead of a picture',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的表很长，会得到几张图？',
          en: 'My table is long — how many images do I get?',
        },
        a: {
          zh: '按 A4 分页决定张数，两张以上时产物是一个 ZIP，里面一页一图。若你更想要一张连续的长图，那正是 CSV→PNG 的形状（同一份表格，整页一次捕获）。',
          en: 'The A4 slicing sets the count, and two or more pages arrive as a ZIP with one picture per page. If you would rather have one continuous image, that is exactly what CSV to PNG does with the same table.',
        },
      },
      {
        q: {
          zh: '质量与目标体积这两个档位，在这一格里分别做什么？',
          en: 'What do quality and target size actually do on this route?',
        },
        a: {
          zh: '两个都挂在有损容器上：编码器只在 JPEG / WebP 时用它们，面板也按同一条规则不给 PNG 摆这两档。设了目标体积时先沿质量档往下走，走不到再把画面缩小重试——所以「字看着更软」有两种来路：主动调低，或被目标体积逼下去。要严格还原请走 CSV→PNG，那里这两档都不存在，也不会做第二次量化。',
          en: 'Both belong to lossy containers: the encoder reaches for them only on JPEG and WebP, and the panel follows the same rule by not offering either for PNG. A target size is chased first down the quality ladder and then by scaling the picture, so softer-looking type has two possible causes — asked for, or pushed into it by the target. For an exact rendering take CSV to PNG, where neither dial exists and no second quantisation happens.',
        },
      },
      {
        q: {
          zh: '为什么不直接把长图压成一张 JPEG？',
          en: 'Why not just compress the tall image into one JPEG?',
        },
        a: {
          zh: '这条链在同分的图片目标上显式让 PDF 那一路优先（`html>png` 带较低的 `edgePreference`），因为同分的图片目标里排序由 `edgePreference` 决定（`html>pdf` 是 0、`html>png` 是 10，小的排前面）；它改变的是分页与页边界，不是压缩次数。想要一张长图，PNG 那一格就给。',
          en: 'The routing breaks the tie between image ends in favour of the PDF path (the PNG edge carries a lower `edgePreference`), because the ordering between the tied image ends comes from `edgePreference` (0 on `html>pdf`, 10 on `html>png`, lower first); what that choice changes is paging and page bounds, not the number of compressions. If you want the single tall picture, the PNG page is it.',
        },
      },
    ],
  },
  {
    slug: 'xlsx-to-png',
    from: 'xlsx',
    to: 'png',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Excel 转 PNG——离线、所有工作表一张长图、不上传',
      en: 'Excel to PNG offline — every sheet, one tall image',
    },
    desc: {
      zh: '每个工作表渲染成带表名小标题的表格，整叠堆成一张无损 PNG；高度超过 32768 px 报错而不是截断，长簿子的像素密度会降档。',
      en: 'Each worksheet renders as a titled table and the stack is captured losslessly in one PNG; past 32768 px it fails, and long workbooks drop a density step.',
    },
    lede: {
      zh: '要把一份工作簿「整个」发给别人看一眼，比截图省事的是这条：`xlsx>html` 先用 `cellDates: true` 与一份固定日期格式读取，再走 `normalizeDateCells`，最后由 `sheet_to_html` 把**每一个工作表各写成一张表**，多于一张时为每张前面加一个取代表名的小标题（`<h2>`）；这份 HTML 统一过 DOMPurify 后套上自带的样式表。`html>png` 再把整篇文档离屏渲染成一张画布并无损编码——所以产物是**一张按工作表顺序堆起来的长图**，不是每张表一张图。三件由实现决定的事：一、**日期长什么样由那条格式说得出**：纯日期渲染成 `2024-01-05`，带时分秒的是 `2024-01-05 14:30:00`，工作簿作者自己指定的格式被尊重（`[h]:mm:ss` 那种时长仍是 `124:48:00`），而没有任何显示文本的日期格保持原样、不替它编一个；二、**像素密度按高度降档**——高度超过 2000 px 用 1.5 倍、超过 4000 px 用 1 倍，所以多 sheet 的长簿子落在一倍密度——一块 CSS 像素只对应一个设备像素，这不是排版变了，而是为了让画布留在浏览器上限内；三、**上限是明确失败**：整页高度超过 32768 px 报「渲染高度过大」，因为远超时浏览器交回的是空白画布，那种「成功但全白」比一条错误难查。要照实说的还有：单元格的文字是转义后写进表格的，所以格子里打的标记只会显示为字符，而单元格自带的链接会变成真正的链接；正文在读出时净化一次、渲染前再净化一次。图里的文字不能选中、搜索或朗读；表头那一行不带 `<th>` 语义，样式表的浅底只会按行序落。全程在这个标签页里完成，只有 storage 权限。',
      en: 'When a workbook has to be shown to someone whole, this is shorter than screenshots: `xlsx>html` reads with `cellDates: true` and one fixed date format, runs `normalizeDateCells`, and lets `sheet_to_html` write **one table per worksheet**, prefixing each with an `<h2>` carrying the sheet name whenever there is more than one; that body passes DOMPurify once and is wrapped in the stylesheet this extension ships. `html>png` then renders the entire document offscreen into one canvas and encodes it losslessly — so the artifact is **one tall image stacked in worksheet order**, not a picture per sheet. Three things the implementation decides: first, **what a date looks like is sayable** — a plain date renders as `2024-01-05`, a real timestamp as `2024-01-05 14:30:00`, a format the workbook author chose is respected (`[h]:mm:ss` durations stay `124:48:00`), and a date cell with no display text is left alone rather than invented. Second, **density steps with height**: past 2000 px the ratio is 1.5×, past 4000 px it is 1×, so a long multi-sheet workbook lands on 1× — one device pixel per CSS pixel instead of two — which is the canvas staying inside the browser’s own limits, not a different layout. Third, **the ceiling fails out loud**: beyond 32768 px of rendered height the route reports “too tall to render”, because far past that a browser hands back a blank canvas, and a white “success” is harder to diagnose than an error. Also stated plainly: cell text is escaped into the table, so markup typed into a cell shows as characters, while a cell that carries a link becomes a real link; the body is sanitised once on the way out of the reader and again before rendering. Text in the picture cannot be selected, searched or read aloud, and the first row carries no `<th>` semantics, so the stylesheet’s tint falls by row order. All of it inside this tab on the storage permission.',
    },
    keeps: {
      zh: [
        '所有工作表进一张图：按簿内顺序堆叠，每张前面带一个取代表名的小标题',
        '日期有确定的样子：纯日期是 `2024-01-05`，带时间是 `2024-01-05 14:30:00`，作者自定的格式不被覆盖',
        '无损编码：像素之间不做第二次量化',
        '排版由自带样式表给出：每格 1px 实线、表格占满 800 px 正文、偶数行浅底',
      ],
      en: [
        'Every worksheet in one image: stacked in workbook order, each preceded by a heading carrying its sheet name',
        'Dates have a settled look: `2024-01-05` for a plain date, `2024-01-05 14:30:00` for a timestamp, and an author-chosen format is not overridden',
        'Lossless encoding: no second quantisation of the pixels',
        'The layout is the bundled stylesheet: a 1px rule per cell, tables filling the 800 px measure, one tint on even rows',
      ],
    },
    limits: {
      zh: [
        '很长的簿子像素密度会降档（排版高度 >2000 px 用 1.5 倍、>4000 px 用 1 倍，即一块 CSS 像素对应的设备像素变少）；要严格清晰请逐表转 HTML 或 PNG 分张',
        '整页高度上限 32768 px：超出报错而不是交付空白画布或被截短的图',
        '一张图就是一张图：想要「一个工作表一个文件」，请走 Excel→PDF（一份多页文档）或逐表另存后再转',
        '文字不可选中、搜索或朗读：PNG 没有文字层；图表、条件格式、批注与冻结窗格在这条链上没有对应物',
        '格子里打的标记会被转义成字符显示，只有单元格自带的链接变成真链接；正文净化两次（读出时与渲染前）',
      ],
      en: [
        'Long documents drop density (1.5× past 2000 px of layout height, 1× past 4000 px), which is fewer device pixels per CSS pixel rather than a different layout; convert sheet by sheet to HTML or PNG to keep the full ratio',
        'A 32768 px ceiling on rendered height: beyond it the route fails instead of delivering a blank canvas or a trimmed image',
        'One image is one image: for a file per worksheet take Excel to PDF (one multi-page document) or split the sheets first',
        'No text layer, so nothing to select, search or read aloud; charts, conditional formatting, comments and frozen panes have no counterpart on this route',
        'Markup typed into a cell is escaped into characters; only a cell’s own link becomes a real anchor, and the body is sanitised twice — on the way out of the reader and again before rendering',
      ],
    },
    notes: {
      zh: [
        '要一份能打印归档的成品：Excel→PDF，一份多页文档；分页按排版高度切，不按工作表边界切',
        '要严格清晰的一张表：先转到 HTML 再看需要截图，比在长图里降档更可控',
        '要继续加工数据：Excel→CSV / JSON / Markdown，那里交付的是值而不是画面',
      ],
      en: [
        'For a printable, archivable document: Excel to PDF, one multi-page file whose breaks follow the laid-out height rather than the sheet bounds',
        'For one exactly-crisp table: convert to HTML first and shoot what you need, which stays more controllable than dropping density in a long image',
        'To keep working on the data: Excel to CSV, JSON or Markdown, which deliver values rather than a picture',
      ],
    },
    faq: [
      {
        q: {
          zh: '三个工作表会得到几张图？',
          en: 'Three worksheets — how many images?',
        },
        a: {
          zh: '一张：这条链把整篇文档一次捕获成一张画布，三张表按簿内顺序堆在同一条长图里，每张前面有一个取代表名的小标题。想要一份文档而不是一张大图，请走 Excel→PDF。',
          en: 'One: the route captures the whole document into a single canvas, so all three tables stack into one tall image, each under a heading carrying its sheet name. For a document rather than one long picture, take Excel to PDF.',
        },
      },
      {
        q: {
          zh: '为什么图里的日期是 `2024-01-05`，不是我在 Excel 里看到的写法？',
          en: 'Why does a date read 2024-01-05 rather than how Excel shows it?',
        },
        a: {
          zh: '这条链用一份固定的日期格式渲染，并把「日期格」的显示文本收进正文；工作簿作者明确指定的格式（比如 `[h]:mm:ss` 的时长）会被尊重而不是覆盖。所以本地设置或软件默认写法不保证复刻——要那个外观，请转成 HTML 后自己套样式。',
          en: 'The route renders dates through one fixed format and folds each date cell’s display text into the body, while a format the workbook author chose explicitly is respected rather than overridden. So a regional setting or your software’s default is not guaranteed to be reproduced — for that look, convert to HTML and style it there.',
        },
      },
      {
        q: {
          zh: '很长的表转出来字很小，是我把图看小了吗？',
          en: 'The long sheet looks tiny — am I just viewing it small?',
        },
        a: {
          zh: '多半不是：内容高度超过 2000 px 时像素密度降到 1.5 倍、超过 4000 px 降到 1 倍，这是为了让画布留在浏览器上限内的取舍。所以长簿子每一行拿到的设备像素更少。要严格清晰，请逐张表分开转，或走逐表分开的路（先转 HTML 再决定），因为密度档只对「以 PDF 为输入」的转换开放，而 Excel→PDF 那一步根本不读它（只有把 PDF 转成图的那一步用得上）。',
          en: 'Most likely not: past 2000 px of content height the ratio steps to 1.5× and past 4000 px to 1×, a trade made to keep the canvas inside the browser’s limits, so a long workbook carries fewer pixels per row than a short one. For exact crispness convert one sheet at a time, or split the sheets, since the density dial is offered only for conversions taking a PDF as input, and Excel to PDF never reads it — the only step that uses it is the one rasterising a PDF.',
        },
      },
    ],
  },
  {
    slug: 'html-to-jpg',
    from: 'html',
    to: 'jpg',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'HTML 转 JPG——离线、一页一图、不上传',
      en: 'HTML to JPG offline — one image per A4 page',
    },
    desc: {
      zh: '文档整篇渲染一次、按 A4 切成无损页面，再逐页编码成 JPEG：两页以上打包成 ZIP，透明区域铺白。全程离线，脚本不执行、远程资源不取字节。',
      en: 'The page is rendered once, sliced into A4 pages stored losslessly, then encoded JPEG by JPEG; several pages arrive in a ZIP. Fully offline.',
    },
    lede: {
      zh: '这条路是**两步、一次损失**：`html>pdf` 把净化后的文档整篇渲染成一张画布，再按 A4 的毫米比例算出页数（页高 = 画布高 × 210 ÷ 画布宽，每 297 mm 一页向上取整），把这张画布切成同高的片段（最后一片按剩余高度收齐），**每片以无损位图（`toDataURL` 的 PNG 那一条）嵌进 PDF**；`pdf>jpg` 再把这份 PDF 每一页转成一张 JPEG。为什么图片出口要走 PDF 这一遭而不直接截长图：注册表里对同分的图片终点用 `edgePreference` 排序（`html>pdf` 是 0、`html>png` 是 10，小的优先），而 `html>png→jpg` 那条路交回的是「整篇文档按页面宽度排布的一条长带」——分页与页边界正是多页文档想要的答案；那条路上真正有害的是**两次 JPEG 编码**，它在源头被解决（切片存 PNG），而不是靠改路由避开。三件具体的事跟着来：**一页一图**，两页以上以 ZIP 交付；**白色铺底**，画布按 `#ffffff` 生成，原来的透明区域在图里是白；**密度不在这一格调，但不等于「绝不生效」**——没设过密度时中间那份 PDF 按默认 144 转图；滑杆只对「以 PDF 作为输入」的转换开放，而从上一批 PDF 转换留下的密度值会一路被带到每一步，包括这里的这一次。要说清的边界：最后那道编码是有损的（质量与目标体积就是为它准备的档位，目标体积先降质量、再缩尺寸去追）；产物是位图，里面没有可选中的文字；渲染前会剥掉指向网络与相邻路径的子资源引用，取不到字节的图片按张数在结果卡披露，所以「打开一张网页转出的图，顺带把它的广告像素拉回来」这种事不会发生。脚本从头到尾不执行：净化那一步删掉可执行标记，渲染用的 iframe 只给 `allow-same-origin`、没有 `allow-scripts`。全程在这个标签页里完成，只有 storage 权限。',
      en: 'This route is two steps with one loss: `html>pdf` renders the sanitised document into a single canvas, computes the page count from the A4 metric ratio (page height = canvas height × 210 ÷ canvas width, rounding up every 297 mm), slices that canvas into strips of one height, the last cut to what remains and **embeds each strip as a lossless bitmap (the PNG branch of `toDataURL`)**; `pdf>jpg` then turns each page of that PDF into a JPEG. Why an image exit travels through PDF instead of grabbing the tall canvas: the registry orders tied image ends by `edgePreference` (0 on `html>pdf`, 10 on `html>png`, lower first), and the `html>png→jpg` path hands back one strip laid out at page width — page bounds are the answer a multi-page document actually wants. What was genuinely harmful on that path was the **double JPEG encode**, fixed at the source by storing the slices as PNG rather than dodged by re-pointing the route. Three concrete things come with it: **one image per page**, two or more delivered in a ZIP; **a white ground**, because the canvas is produced on `#ffffff`, so transparent areas land as visible white; and **no density dial here, which is not the same as “it never applies”**: with nothing set the intermediate PDF rasterises at the default 144, and although the panel offers the slider only for conversions taking a PDF as input, a density left behind by an earlier PDF batch is forwarded to every step — including this one. The boundaries, stated: the final encode is lossy (quality and target size are its dials, and a target size goes down the quality ladder before it scales the picture); the artifact is a bitmap with no selectable text; and sub-resource references to the network or sibling paths are stripped before rendering, with unretrievable images disclosed by count on the result card — so a converted page cannot fetch its ad pixels on the way to becoming a picture. Nothing executes: sanitising removes the executable markup and the render frame is sandboxed to `allow-same-origin` with no `allow-scripts`. All of it inside this tab on the storage permission.',
    },
    keeps: {
      zh: [
        '一页一图：页数由 A4 比例下的排版高度决定，长网页得到的是成组的页面而不是一条长带',
        '切片无损：中间那份 PDF 的每一页存的是 PNG，压缩只在最后转 JPEG 那一次发生',
        '透明区域落白：画布按 `#ffffff` 生成、每页嵌入前再铺一次，而 JPEG 本来也没有透明度可保留',
        '不执行也不取码：脚本不跑、远程图片与字体不取字节，缺字节的图片按张数披露',
      ],
      en: [
        'One image per page: the count follows the laid-out height under the A4 ratio, so a long page becomes a set of pages rather than one long strip',
        'The slices are lossless: each page in the intermediate PDF is stored as PNG, so compression happens once, on the final JPEG',
        'Transparent areas land on white: the canvas is produced on `#ffffff`, each page is filled again before embedding, and a JPEG has no alpha left to keep',
        'Nothing runs and nothing is fetched: no scripts, no remote images or fonts, with images that have no bytes disclosed by count',
      ],
    },
    limits: {
      zh: [
        '最后那道编码是有损的：要严格还原同一套线条与字形请走 HTML→PNG（整页一张长图、无第二次量化）',
        '这一格不摆密度滑杆（面板只对以 PDF 为输入的转换给它）：没设过时中间 PDF 按默认 144 转图，而上一批 PDF 留下的密度值会被带进这一步',
        '两页以上出 ZIP：里面的单张文件按 `page-N.jpg` 编号取名',
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过就报「要渲染的页数过多」，并让你用页码范围只选需要的页或先把文件拆开——每一页在编码前各自占着一张全尺寸画布，200 页已经是数百 MB，再往前是标签页自己崩掉，那比一条错误难说清得多',
        '图里没有可复制的文字：不能选中、搜索或朗读，要这些请保留 HTML 或转 TXT / Markdown',
        '控件会被画进图里（任务清单的复选框正是这样出现的），但图里没有任何可点的东西：产物是排版出来的某一瞬，不是一个可交互的页面',
      ],
      en: [
        'The last encode is lossy: take HTML to PNG for an exact rendering of the same rules and glyphs (one tall canvas, no second quantisation)',
        'This route exposes no density slider (the panel offers it only for conversions taking a PDF as input): with nothing set the intermediate PDF rasterises at the default 144, while a density left from an earlier PDF batch is forwarded into this step',
        'Two or more pages arrive as a ZIP, the individual pictures named `page-N.jpg`',
        'At most 200 pages rasterise in one pass (`MAX_PDF_IMAGE_PAGES`): past that the route reports “too many pages to render at once” and points at a page range or splitting the file — every page holds a full-size canvas until it is encoded, 200 of them is already hundreds of megabytes, and beyond that the tab crashes itself, which is far harder to explain than an error',
        'No copyable text inside the image: nothing to select, search or read aloud — keep the HTML, or take TXT / Markdown, for that',
        'Controls are painted into the image — that is how a task-list checkbox appears — yet nothing in it responds: the artifact is one laid-out instant, not a page you can operate',
      ],
    },
    notes: {
      zh: [
        '要一份能打印归档的：HTML→PDF，页面就是文档本身，不必再拼回',
        '要严格无损的一张图：HTML→PNG，整页捕获、没有第二次量化',
        '要继续加工数据：网页里的表格用 HTML→CSV / HTML→JSON 取值，图片这一格交付的是版面',
      ],
      en: [
        'For a document instead of a stack of images: HTML to PDF, one multi-page file',
        'For one exactly-lossless picture: HTML to PNG, a whole-page capture with no second quantisation',
        'To keep working on the data: take HTML to CSV or JSON for the values — this page delivers the layout',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么一份网页转出来是很多张图，而不是一张长图？',
          en: 'Why do I get several images rather than one tall one?',
        },
        a: {
          zh: '因为图片终点在同分时按 `edgePreference` 排序（`html>pdf` 0、`html>png` 10），这条链因此交回 A4 分页；想要一张连续长图的是 PNG 那一格（整页一次捕获，上限 32768 px）。两种形状都在，选哪种由你点的目标决定。',
          en: 'Because the tied image ends are ordered by `edgePreference` (0 on `html>pdf`, 10 on `html>png`), so this route yields A4 pages; the single continuous picture is the PNG page, which captures the whole document into one canvas bounded at 32768 px. Both shapes exist, and the target you pick decides which you get.',
        },
      },
      {
        q: {
          zh: '两次编码会不会把文字越压越糊？',
          en: 'Does encoding twice smear the text progressively?',
        },
        a: {
          zh: '这条链只有一次有损：切片进 PDF 时存的是 PNG，最后的 JPEG 是唯一一次压缩。早先确实有过「PDF 里塞 JPEG、再转一次 JPEG」的两次压缩，那一版被换掉了——修的是切片的存储格式，不是把路由改道。',
          en: 'There is one lossy step here: slices enter the PDF as PNG, and the final JPEG is the only compression. An earlier shape really did embed JPEG in the PDF and encode it again; that version was replaced — the fix was the slice format, not re-pointing the route.',
        },
      },
      {
        q: {
          zh: '打开这份 JPG 会把网页里的图片再拉回来吗？',
          en: 'Will opening the JPG re-fetch the page’s images?',
        },
        a: {
          zh: '不会。产物是位图，里面不含指向任何东西的引用；生成它的那一步在渲染前已经把指向网络与相邻路径的子资源引用剥掉，取不到字节的图片会在结果卡上按张数写明。扩展本身只有 storage 权限。',
          en: 'No. The artifact is a bitmap carrying no reference to anything, and the step that made it strips sub-resource references before rendering, disclosing unretrievable images by count on the result card. The extension itself holds only the storage permission.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-jpg',
    from: 'md',
    to: 'jpg',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 转 JPG——离线、A4 分页逐页编码、不上传',
      en: 'Markdown to JPG offline — A4 pages, no upload',
    },
    desc: {
      zh: 'Markdown 先按 GFM 渲染成带样式的 HTML，再整篇渲染一次、按 A4 切片存无损页面，逐页编码成 JPEG；多页打包成 ZIP。全程离线。',
      en: 'GFM renders to styled HTML first, then the document is captured once, sliced into lossless A4 pages and encoded JPEG by JPEG, zipped when there are several.',
    },
    lede: {
      zh: '一组页面图能把长笔记按渲染结果原样递出去——贴过去的文字会被对面那套渲染器重新排版。三步：`md>html` 用 marked 按 GFM 渲染（管道符表格、删除线、任务清单、自动链接都被认出；段落里单个换行仍是续行），过 DOMPurify 的 html + svg 两套 profile（**文档里的内联 SVG 图形不会被删**），再套上自带的样式表；`html>pdf` 把这份文档整篇渲染成一张画布并按 A4 比例算页数、切成等高片段，**每片段以无损位图（PNG）嵌进 PDF**；`pdf>jpg` 再逐页转成 JPEG。所以形状与 HTML→JPG 完全相同（一页一图、两页以上 ZIP、透明铺白），差别都在第一段：Markdown 的语法在这一步变成排版，`#` 变成标题、`- 项目` 变成列表项、表格变成带边框与条纹的表。同分图片终点由 `edgePreference` 排序（`html>pdf` 0、`html>png` 10，小的优先），这条链因此交回分页而不是一条长带；那条路上真正有害的两次 JPEG 压缩已在源头修掉（切片存 PNG）。要照实说的四条：最后那道编码是有损的，质量与目标体积就是它的档位（目标体积先降质量、再缩尺寸）；中间那份 PDF 转图用默认密度，这一格没有那个滑杆；产物是位图，没有可选中、可搜索的文字；**Markdown 里以网络地址或相邻路径引用的图片取不到字节**——渲染前会剥掉这些引用，结果卡按张数披露，替换处是一个虚线方框，解不开的那种则直接留空。脚本不执行、全程离线，只有 storage 权限。',
      en: 'A set of page images hands a long note over exactly as this extension rendered it, which pasted text cannot do — the receiving side re-lays that out in its own renderer. Three steps: `md>html` renders through marked as GFM (pipe tables, strikethrough, task lists and autolinks are recognised; a single newline stays a soft wrap), passes DOMPurify’s html and svg profiles — **so an inline SVG diagram in the document is not deleted** — and is wrapped in the bundled stylesheet; `html>pdf` renders that document into one canvas, computes the page count from the A4 ratio, slices it into equal-height strips and **embeds each strip losslessly as PNG**; `pdf>jpg` then turns each page into a JPEG. The shape is therefore identical to HTML to JPG (one image per page, a ZIP from two pages up, transparency flattened to white), and what differs is the first leg: Markdown syntax becomes layout there — `#` turns into a heading, `- item` into a list item, a table into bordered and striped cells. Tied image ends are ordered by `edgePreference` (0 on `html>pdf`, 10 on `html>png`), which is why this route returns pages rather than one long strip; the genuinely harmful double JPEG on the other path was fixed at its source by storing the slices as PNG. Four things stated plainly: the final encode is lossy, with quality and target size as its dials (a target size lowers quality before it scales the picture); the intermediate PDF is rasterised at the default density, which this route does not expose; the artifact is a bitmap with no selectable or searchable text; and **images the Markdown points at by network address or sibling path have no bytes** — those references are stripped before rendering, the count is disclosed on the result card, and a replaced spot is either a dashed box or simply left blank. No scripts run, everything is offline, and the only permission is storage.',
    },
    keeps: {
      zh: [
        '语法变成排版：标题、列表、任务清单与表格按 GFM 渲染后再进图，图里看到的就是渲染结果',
        '内联 SVG 图形保留：净化同时挂 html 与 svg 两套 profile，示意图不会因「不是 HTML 标记」被删',
        '一页一图且切片无损：片段以 PNG 进 PDF，压缩只在最后转 JPEG 那一次发生',
        '透明铺白、多页成 ZIP：形状与 HTML→JPG 一致，长笔记是一组页面图而不是一条长带',
      ],
      en: [
        'Syntax becomes layout: headings, lists, task lists and tables render as GFM before they are imaged, so the picture shows the rendered document',
        'Inline SVG diagrams survive: sanitising runs the html and svg profiles together, so a sketch is not deleted for not being HTML',
        'One image per page with lossless slices: strips enter the PDF as PNG, and compression happens once, on the final JPEG',
        'White ground and a ZIP from two pages up: the same shape as HTML to JPG, a set of pages rather than one long strip',
      ],
    },
    limits: {
      zh: [
        '最后那道编码有损：要严格还原同样的线条与字形请走 Markdown→PNG（整页一张长图、无第二次量化）',
        '引用的图片取不到字节：以网络地址或相邻路径写的图会被剥掉引用，结果卡按张数披露，位置是虚线方框或空着',
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过就报「要渲染的页数过多」，并让你用页码范围只选需要的页或先把文件拆开——每一页在编码前各自占着一张全尺寸画布，200 页已经是数百 MB，再往前是标签页自己崩掉，那比一条错误难说清得多',
        '这一格不摆密度滑杆（面板只对以 PDF 为输入的转换给它）：没设过时中间 PDF 按默认 144 转图，上一批 PDF 留下的密度值会被带进来',
        '代码块与正文都在 800 px 的最大宽度内排版：样式表给正文 `word-wrap / overflow-wrap: break-word`，也留给 `<pre>` 本身 `overflow-x: auto`，两条规则作用在不同元素上，图按渲染出来的那一种落定',
        '图里没有可复制的文字，也不承诺能读回 Markdown：要编辑请保留 `.md`，要结构请走 Markdown→HTML / Word',
      ],
      en: [
        'The final encode is lossy: take Markdown to PNG for an exact rendering (one tall canvas, no second quantisation)',
        'Referenced images have no bytes: those written as network addresses or sibling paths lose their references, the card reports the count, and a spot is either a dashed box or left blank',
        'At most 200 pages rasterise in one pass (`MAX_PDF_IMAGE_PAGES`): past that the route reports “too many pages to render at once” and points at a page range or splitting the file — every page holds a full-size canvas until it is encoded, 200 of them is already hundreds of megabytes, and beyond that the tab crashes itself, which is far harder to explain than an error',
        'This route exposes no density slider (the panel offers it only for conversions taking a PDF as input): with nothing set the intermediate PDF rasterises at the default 144, while a density left from an earlier PDF batch travels into this step',
        'Code and prose lay out inside the 800 px measure: the stylesheet sets `word-wrap / overflow-wrap: break-word` on the body and keeps `overflow-x: auto` on `pre`, two rules on different elements, and the image reproduces whichever the render settled on',
        'No copyable text inside the image and no promise of reading Markdown back out: keep the `.md`, or take HTML / Word when you want structure',
      ],
    },
    notes: {
      zh: [
        '要一份可打印的成品：Markdown→PDF，页面就是文档本身',
        '要一张不分页的长图：Markdown→PNG，整页一次捕获（上限 32768 px）',
        '要给程序读的数据：Markdown→HTML 或 Markdown→CSV / JSON，图片这一格交付的是版面',
      ],
      en: [
        'For a printable document: Markdown to PDF, whose pages are the file itself',
        'For one unpaginated tall image: Markdown to PNG, a single capture bounded at 32768 px',
        'For data a program reads: Markdown to HTML, CSV or JSON — this page delivers the layout',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的图片为什么不见了？',
          en: 'Where did my images go?',
        },
        a: {
          zh: '如果它们是以网络地址或相邻路径引用的，字节本来就不在 `.md` 文件里，而这条路完全离线：渲染前会剥掉这些引用，结果卡按张数写明「丢了几张」，被替换的位置是一个虚线方框，解不开的那种直接空着。要带图的成品，请把图片放进真能读到字节的位置，或者接受这一格交付的是纯排版。',
          en: 'If they were referenced by network address or a sibling path, their bytes were never in the `.md` file, and this route is fully offline: the references are stripped before rendering, the result card states how many were lost, and a replaced spot is either a dashed box or left blank. Either put the images somewhere genuinely readable, or accept that this route delivers the typography.',
        },
      },
      {
        q: {
          zh: '会得到几张图，名字是什么？',
          en: 'How many pictures, and what are they called?',
        },
        a: {
          zh: '张数由渲染后的文档高度按 A4 比例决定（一页一张），两页以上打包成 ZIP，里面按 `page-N.jpg` 编号。想要一张不分页的连续图，那是 Markdown→PNG 的形状。',
          en: 'The count comes from the rendered height under the A4 ratio — one page per image — and two or more arrive in a ZIP with pictures named `page-N.jpg`. A single continuous image is what Markdown to PNG produces.',
        },
      },
      {
        q: {
          zh: '表格在图里会被渲染成什么样？',
          en: 'How does my table appear in the image?',
        },
        a: {
          zh: '进图的是渲染结果：管道符表格经 marked 变成真正的 `<table>`，自带样式表给它 100% 宽、每格 1px 实线、表头浅底与偶数行条纹。这也意味着「好看」是这份样式表的好看——换一份 CSS 就是另一个样子，而产物本身不含可编辑的表格结构。',
          en: 'The image carries the rendered result: a pipe table becomes a real `<table>` through marked, and the bundled stylesheet gives it full width, a 1px rule per cell, a tinted header and striped even rows. That also means the good looks belong to this stylesheet — different CSS, different picture — and the artifact holds no editable table structure.',
        },
      },
    ],
  },
  {
    slug: 'html-to-webp',
    from: 'html',
    to: 'webp',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'HTML 转 WebP——离线、一页一图、不上传',
      en: 'HTML to WebP offline — one image per A4 page',
    },
    desc: {
      zh: '文档整篇渲染一次、按 A4 切成无损片段存进 PDF，再逐页编码成 WebP：两页以上打包 ZIP，质量与目标体积可调。全程离线，脚本不执行。',
      en: 'The document is rendered once, sliced into lossless A4 pages inside a PDF, then encoded WebP page by page; several arrive in a ZIP. Fully offline.',
    },
    lede: {
      zh: '它与 HTML→JPG 走的是同一条链，只有终点不同：`html>pdf` 把净化后的文档整篇渲染成一张画布，按 A4 的毫米比例算页数（页高 = 画布高 × 210 ÷ 画布宽，每 297 mm 一页向上取整，最后一片按剩余高度收），切成同高片段并**以无损位图（`toDataURL` 的 PNG 那一条）嵌进 PDF**；`pdf>webp` 再把每一页转成一张 WebP。同一条 `createPdfToImageConverter` 工厂同时造出 JPEG 与 WebP 两个终点，所以**产物形状一样**：一页一图、两页以上 ZIP（里面按 `page-N.webp` 编号）、单页直接给一个 `.webp`。不一样的只有编码档位归属：WebP 与 JPEG 同属「有损容器」，质量与目标体积这两个参数对它们生效（`LOSSY_MIME_TYPES`），面板也正是按这一条决定给不给这两格；PNG 那一路则两者都不给、也不会拿去做二次量化。目标体积的追逐顺序是固定的：先把质量沿档位往下走，走不到再把画面缩小重试——所以「文件小了」有两种来路，看页面时值得知道是哪一种。要照实说的边界：这一格不摆密度滑杆（面板只对以 PDF 为输入的转换给它），但密度值会被每一步带走，上一批 PDF 转换留下的值就作用在这里的中间那份 PDF 上；没设过时用默认 144。整页捕获的高度上限 32768 px（一边最大 8192 px 的四倍）超过就明确报错，不给空白画布也不给半张图。图里的文字不是文字：没有文字层，不能选中、搜索或朗读。产物是无透明的白底图（画布按 `#ffffff` 生成、每页嵌入前再铺一次）。远程与相对路径的子资源引用在渲染前剥掉，取不到字节的图片按张数在结果卡披露——被替换的位置画虚线方框，只在克隆那一步失败的直接留空。全程在这个标签页里完成，只有 storage 权限，脚本从头到尾不执行：净化删可执行标记，渲染用的 iframe 只给 `allow-same-origin`、没有 `allow-scripts`。',
      en: 'This is the same chain as HTML to JPG with a different last step: `html>pdf` renders the sanitised document into one canvas, computes the page count from the A4 metric ratio (page height = canvas height × 210 ÷ canvas width, rounding up every 297 mm, the last slice cut to what remains), slices it into equal-height strips and **embeds each as a lossless bitmap (the PNG branch of `toDataURL`)**; `pdf>webp` then turns each page into a WebP. One factory, `createPdfToImageConverter`, builds both the JPEG and the WebP end, so **the artifact shape is identical**: one image per page, a ZIP from two pages up with members named `page-N.webp`, a single `.webp` when there is only one. What differs is only which dials belong: WebP and JPEG are the two lossy containers, so quality and a target size mean something here (`LOSSY_MIME_TYPES`) and the panel offers them on exactly that rule, while the PNG route offers neither and does no second quantisation. The chase order is fixed: quality walks down its ladder first, and only then does the picture scale — so “the file got smaller” has two possible causes worth telling apart. The boundaries, plainly: this route exposes no density slider (the panel gives it only to conversions taking a PDF as input), yet a density value is forwarded to every step, so one left from an earlier PDF batch applies to the intermediate PDF here; unset, it uses the default 144. The whole-page capture is bounded at 32768 px of height — four times the 8192 px edge ceiling — and past that the route fails rather than returning a blank canvas or half a picture. Text in the image is not text: no text layer, nothing to select, search or read aloud. The pictures are opaque on white (the canvas is produced on `#ffffff` and each page is filled again before embedding). Sub-resource references to the network or sibling paths are stripped before rendering and unretrievable images are disclosed by count, a replaced spot drawn as a dashed box while one that fails only during cloning is left blank. All of it runs in this tab on the storage permission, and nothing executes: sanitising removes the executable markup and the render frame is sandboxed to `allow-same-origin` with no `allow-scripts`.',
    },
    keeps: {
      zh: [
        '形状与 JPEG 那格一致：一页一图、两页以上 ZIP、成员名 `page-N.webp`',
        '切片无损：中间那份 PDF 存的是 PNG，压缩只发生在最后转 WebP 这一次',
        '质量与目标体积在这条路上是真档位（WebP 与 JPEG 同属有损容器）',
        '不透明白底：画布按 `#ffffff` 生成、每页嵌入前再铺一次',
      ],
      en: [
        'The same shape as the JPEG page: one image per page, a ZIP from two pages up, members named `page-N.webp`',
        'Lossless slices: the intermediate PDF stores PNG, so compression happens once, on the final WebP',
        'Quality and target size are real dials here — WebP and JPEG are the two lossy containers',
        'Opaque on white: the canvas is produced on `#ffffff` and every page is filled again before embedding',
      ],
    },
    limits: {
      zh: [
        '有损：质量先降、尺寸后降去追目标体积，两种「变小」的来路不一样，看效果时值得区分',
        '这一格不摆密度滑杆，但上一批 PDF 转换留下的密度值会被带到这一步；没设过时是默认 144',
        '整页捕获高度上限 32768 px：超过明确报错，不给空白画布或半张图',
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过就报「要渲染的页数过多」，并让你用页码范围只选需要的页或先把文件拆开——每一页在编码前各自占着一张全尺寸画布，200 页已经是数百 MB，再往前是标签页自己崩掉，那比一条错误难说清得多',
        '图里没有文字层：不能选中、搜索或朗读，要这些请保留 HTML 或转 TXT / Markdown',
        '远程与相对路径的图片取不到字节：引用被剥掉、按张数披露，位置是虚线方框或直接留空',
      ],
      en: [
        'Lossy: chasing a target size walks quality down first and only then scales the picture — two different reasons for “it got smaller”',
        'This route exposes no density slider, yet a density left from an earlier PDF batch is forwarded into this step; unset, it is the default 144',
        'A 32768 px ceiling on the whole-page capture height, failing outright rather than returning a blank canvas or half a picture',
        'At most 200 pages rasterise in one pass (`MAX_PDF_IMAGE_PAGES`): past that the route reports “too many pages to render at once” and points at a page range or splitting the file — every page holds a full-size canvas until it is encoded, 200 of them is already hundreds of megabytes, and beyond that the tab crashes itself, which is far harder to explain than an error',
        'No text layer: nothing to select, search or read aloud — keep the HTML, or take TXT / Markdown, for that',
        'Images referenced by network address or sibling path have no bytes: the references are stripped, the count is disclosed, and a spot is a dashed box or left blank',
      ],
    },
    notes: {
      zh: [
        '要严格无损的一张长图：HTML→PNG，整页捕获、没有第二次量化',
        '要能打印归档的成品：HTML→PDF，页面就是文档本身',
        '只要其中一页：可以先 HTML→PDF 再用 PDF→WebP 选页，避免整篇都出图',
      ],
      en: [
        'For one exactly-lossless tall image: HTML to PNG, a whole-page capture with no second quantisation',
        'For a printable document: HTML to PDF, whose pages are the file itself',
        'For a single page only: HTML to PDF, then PDF to WebP on that file with a page range',
      ],
    },
    faq: [
      {
        q: {
          zh: 'WebP 和 JPEG 这两格该选哪个？',
          en: 'WebP or JPEG — which page should I use?',
        },
        a: {
          zh: '两者的产物形状完全一样（一页一图、多页 ZIP、同一条 A4 切片与同一次有损编码），差别只在容器本身。本项目没有对本机样本做过两套体积对照，所以不宣称哪一种更小——需要小体积就在两格上各跑一次、用同一份文件比字节数，这比听任何保证可靠。',
          en: 'The artifact shape is identical (one image per page, a ZIP from two pages up, the same A4 slicing and the same single lossy pass); what differs is only the container. This project has not run a same-file size comparison between the two on this machine, so it claims neither is smaller — run both on your own file and compare byte counts, which beats any guarantee on this page.',
        },
      },
      {
        q: {
          zh: '为什么我的 WebP 是白底，不是原来网页的深色背景？',
          en: 'Why is the WebP on white rather than my page’s dark background?',
        },
        a: {
          zh: '这一路的画布按 `#ffffff` 生成，每页嵌入 PDF 前还会再铺一次白，而最后那次编码是 JPEG 之外唯一的有损容器、产物不透明。也就是说：页面自己没画出底色的地方，就会落成白。想让某处是别的颜色，请在源文档里真的把那个颜色画出来。',
          en: 'The canvas for this route is produced on `#ffffff`, each page is filled white again before it enters the PDF, and the final encode is opaque. So any area the page itself never paints lands as white. To get another colour there, paint it in the source document.',
        },
      },
      {
        q: {
          zh: '一张很长的网页会出一张超大的 WebP 吗？',
          en: 'Will one very long page become one enormous WebP?',
        },
        a: {
          zh: '不会。中间那份 PDF 是按 A4 切的，所以产出是一组页面图而不是单张长图：两页以上打包成 ZIP，每张的像素尺寸由那一页的排版高度与当时的渲染倍率决定。整篇一次捕获的高度上限 32768 px 仍然管着渲染那一步，超过就报错。',
          en: 'No. The intermediate PDF is sliced at A4, so you get a set of page images rather than one long picture: two or more arrive in a ZIP, each sized from that page’s laid-out height and the render scale in force. The 32768 px ceiling still governs the capture step, and exceeding it fails the conversion.',
        },
      },
    ],
  },
  {
    slug: 'markdown-to-webp',
    from: 'md',
    to: 'webp',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Markdown 转 WebP——离线、A4 分页逐页编码、不上传',
      en: 'Markdown to WebP offline — A4 pages, no upload',
    },
    desc: {
      zh: 'Markdown 先按 GFM 渲染成带样式的 HTML，再整篇渲染一次、按 A4 切成无损片段，逐页编码成 WebP；多页打包 ZIP。全程离线。',
      en: 'GFM renders to styled HTML first, then the document is captured once, sliced into lossless A4 pages and encoded WebP page by page, a ZIP when several.',
    },
    lede: {
      zh: '三步，最后一步换成 WebP：`md>html` 用 marked 按 GFM 渲染（管道符表格、删除线、任务清单、自动链接都被认出；段落里单个换行仍是续行），过 DOMPurify 的 html + svg 两套 profile（**文档里的内联 SVG 图形不会被删**），再套上自带的样式表；`html>pdf` 把这份文档整篇渲染成一张画布、按 A4 比例算页数并切成同高片段，每片段以无损位图（PNG）嵌进 PDF；`pdf>webp` 再逐页转成 WebP。因此产物形状与 Markdown→JPG、HTML→WebP 完全一致：一页一图、两页以上以 ZIP 交付（成员名 `page-N.webp`）、单页直接给一个 `.webp`；WebP 与 JPEG 同属有损容器，质量与目标体积这两格对它们生效，追逐顺序是先降质量、再缩尺寸。与 JPG 那格唯一的实质区别就是终点容器；本项目没在本机做过两套体积对照，所以这里不宣称谁更小——同一份文件各跑一次比字节数，比任何保证可靠。要说清的边界：中间那份 PDF 转图时这一格不摆密度滑杆（面板只对以 PDF 为输入的转换给它），但存储里的密度值会随每一步带走，没设过时是默认 144；整页捕获高度上限 32768 px，超过明确报错；图里没有可复制的文字；**Markdown 里以网络地址或相邻路径引用的图片取不到字节**——渲染前剥掉引用、结果卡按张数披露，被替换的位置画虚线方框，只在克隆那一步失败的那种直接留空。脚本不执行、全程离线，只有 storage 权限。',
      en: 'Three steps, the last one WebP: `md>html` renders through marked as GFM (pipe tables, strikethrough, task lists and autolinks are recognised; a single newline inside a paragraph stays a soft wrap), passes DOMPurify’s html and svg profiles — **so an inline SVG diagram is not deleted** — and is wrapped in the bundled stylesheet; `html>pdf` renders that document into one canvas, computes the page count from the A4 ratio, slices it into equal-height strips and embeds each losslessly as PNG; `pdf>webp` then encodes every page as WebP. The artifact shape is therefore identical to Markdown to JPG and HTML to WebP: one image per page, a ZIP from two pages up with members named `page-N.webp`, a single `.webp` for one page. WebP and JPEG are the two lossy containers, so quality and a target size apply here, chased by lowering quality first and scaling afterwards. The only substantive difference from the JPEG page is the final container; this project has run no same-file size comparison between the two on this machine, so neither is claimed to be smaller — convert your own file twice and compare byte counts. The boundaries: this route exposes no density slider (the panel offers it only for conversions taking a PDF as input) while a stored density is forwarded to every step and defaults to 144 when unset; the whole-page capture is bounded at 32768 px of height and fails past it rather than trimming; there is no copyable text in the image; and **images the Markdown points at by network address or sibling path have no bytes** — the references are stripped before rendering, the count is disclosed on the card, a replaced spot becomes a dashed box, and one that fails only during cloning is left blank. No scripts run, everything is offline, and the only permission is storage.',
    },
    keeps: {
      zh: [
        '语法变成排版：标题、列表、任务清单与表格按 GFM 渲染后再进图',
        '内联 SVG 图形保留：净化同时挂 html 与 svg 两套 profile',
        '一页一图且切片无损：片段以 PNG 进 PDF，压缩只在最后转 WebP 那一次发生',
        '质量与目标体积在这条路上是真档位（与 JPEG 同为有损容器）',
      ],
      en: [
        'Syntax becomes layout: headings, lists, task lists and tables render as GFM before imaging',
        'Inline SVG diagrams survive: sanitising runs the html and svg profiles together',
        'One image per page with lossless slices: strips enter the PDF as PNG, so compression happens once, on the final WebP',
        'Quality and target size are real dials here, the same lossy container class as JPEG',
      ],
    },
    limits: {
      zh: [
        '有损：目标体积先降质量、再缩尺寸，所以「文件小了」有两种来路',
        '引用的图片取不到字节：远程与相邻路径的引用被剥掉，位置是虚线方框或空着，卡片按张数披露',
        '这一格不摆密度滑杆；存储里留下的密度值仍会被带到中间那份 PDF 那一步',
        '整页捕获高度上限 32768 px，超过报错而不是交付半张图',
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过就报「要渲染的页数过多」，并让你用页码范围只选需要的页或先把文件拆开——每一页在编码前各自占着一张全尺寸画布，200 页已经是数百 MB，再往前是标签页自己崩掉，那比一条错误难说清得多',
        '图里没有可复制的文字，也不承诺能读回 Markdown：要编辑请保留 `.md`',
      ],
      en: [
        'Lossy: a target size lowers quality before it scales the picture, so “smaller” has two causes',
        'Referenced images have no bytes: remote and sibling references are stripped, a spot is a dashed box or blank, and the card reports the count',
        'This route exposes no density slider, yet a density left in storage still reaches the intermediate PDF step',
        'A 32768 px ceiling on the whole-page capture height, failing rather than trimming',
        'At most 200 pages rasterise in one pass (`MAX_PDF_IMAGE_PAGES`): past that the route reports “too many pages to render at once” and points at a page range or splitting the file — every page holds a full-size canvas until it is encoded, 200 of them is already hundreds of megabytes, and beyond that the tab crashes itself, which is far harder to explain than an error',
        'No copyable text inside the image and no promise of reading Markdown back out: keep the `.md`',
      ],
    },
    notes: {
      zh: [
        '要严格无损的版面：Markdown→PNG（整页一张长图）或 Markdown→PDF（一份文档）',
        '要一页一页对照体积：同一份文件分别走 Markdown→JPG 与 Markdown→WebP，比字节数',
        '要给程序读的数据：Markdown→HTML / CSV / JSON，这一格交付的是版面',
      ],
      en: [
        'For an exactly-lossless layout: Markdown to PNG (one tall image) or Markdown to PDF (one document)',
        'To compare sizes page by page: run the same file through Markdown to JPG and Markdown to WebP and compare byte counts',
        'For data a program reads: Markdown to HTML, CSV or JSON — this page delivers the layout',
      ],
    },
    faq: [
      {
        q: {
          zh: 'Markdown 转 WebP 和转 JPG 有什么不同？',
          en: 'How is WebP different from JPEG here?',
        },
        a: {
          zh: '前两步完全相同（GFM 渲染成同一份带样式表的 HTML，再切成同样的无损 A4 片段），只有终点容器不同：一个交 WebP、一个交 JPEG，两者都有损、都支持质量与目标体积。谁更小本项目没在本机量过，不做宣称——用你自己的文件各跑一次比字节数最可靠。',
          en: 'The first two steps are identical — GFM into the same styled HTML, sliced into the same lossless A4 pages — and only the final container differs. Both ends are lossy and both take quality and a target size. Which compresses smaller has not been measured here, so nothing is claimed; run your own file through both and compare byte counts.',
        },
      },
      {
        q: {
          zh: '我的表格会变成什么？',
          en: 'What happens to my tables?',
        },
        a: {
          zh: '管道符表格经 marked 变成真正的 `<table>`，自带样式表给它 100% 宽、每格 1px 实线、表头浅底与偶数行条纹，然后这一切被拍进图里。产物是位图：格子里的值不能再被选中或编辑，列宽由排版决定而不是由源文件的竖线数量决定。',
          en: 'A pipe table becomes a real `<table>` through marked, and the bundled stylesheet gives it full width, a 1px rule per cell, a tinted header and striped even rows — all of which is then imaged. The artifact is a bitmap: values cannot be selected or edited, and column widths come from layout, not from the number of bars in the source.',
        },
      },
      {
        q: {
          zh: '为什么转换报错说「渲染高度过大」？',
          en: 'Why did it fail with “too tall to render”?',
        },
        a: {
          zh: '整篇文档是一次性渲染成一张画布的，那条路径的高度上限是 32768 px（一边最大 8192 px 的四倍）。这条链宁可报错也不交空白或被截短的结果——远超这个高度时浏览器给的其实是画不出内容的空白画布，那种「成功但全白」比一条错误难查得多。要处理这么长的文档，请把它拆开，或者改走 Markdown→PDF 那样的分页产物。',
          en: 'The document is rendered into one canvas, and that path is bounded at 32768 px of height (four times the 8192 px edge ceiling). The route prefers failing over returning blank or trimmed output, because well past that height a browser hands back a canvas that draws nothing — a white “success” much harder to diagnose than an error. Split the document, or take the paged Markdown to PDF artifact instead.',
        },
      },
    ],
  },
  {
    slug: 'docx-to-csv',
    from: 'docx',
    to: 'csv',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Word 转 CSV——离线、表格首行当列名、不上传',
      en: 'Word tables to CSV offline — the first row names columns',
    },
    desc: {
      zh: 'mammoth 先把文档变成 HTML，表格里第一行给出列名、其余每行一条记录；值按写下的字符保留。两份表格会撞闸。全程离线。',
      en: 'Mammoth turns the document into HTML, the first table row supplies keys and values stay exactly as typed. Two tables in one file stop it. Offline.',
    },
    lede: {
      zh: '把 Word 里的表拉成 CSV 要过三道：`docx>html` 用 mammoth 读出文档体（显式 styleMap 把 Heading 1 到 4 映射成 `h1` 到 `h4`、Title 与 Subtitle 分别成 `h1.title` 与 `h2.subtitle`，字符样式认 Strong 与 Emphasis，列表按 `ul` / `ol` / `li` 重开），内嵌图片走 `mammoth.images.imgElement` 读成 data URI；结果过 DOMPurify 的 html profile。如果这一遍什么都没拿到，还有第二条路：`extractAltChunkHtml` 从 MHT 里把正文捞回来——**这个扩展自己产出的 `.docx` 正是那种容器**，所以 HTML→Word 的结果可以再被读回去。两条路都空则报 `errors.docxEmpty`（与打不开的 `errors.docxParse` 是两种报告）。`html>json` 取表格：**第一行给出键名，其余每行一条记录**，这一步不看它在原文里是不是标题行；行与格都按「只看这张表自己」的作用域读，所以套在单元格里的表不会被摊平成外层数据行——但**它的存在算第二张表**，见 limits。`json>csv` 把数组摊平：列是所有记录键名的并集，某行没有的键留空格，元素里没有键可挂的（顶层标量、嵌套数组）写进合成的 `_value` 列而不是丢掉；嵌套对象在其单元里写成 JSON 文本；产物开头带 UTF-8 BOM。全程在这个标签页里完成，只有 storage 权限；净化那一步之后还会 `stripRemoteResources`，因为 altChunk 捞回来的正文不是本项目写的标记——实测过一份 `afchunk.mht` 里带远程 `<img>` 的文档，不剥就会在你打开产物时发出请求。',
      en: 'Pulling a Word table into CSV passes three doors: `docx>html` reads the body with mammoth (an explicit styleMap maps Heading 1–4 to `h1`–`h4`, Title and Subtitle to `h1.title` and `h2.subtitle`, the Strong and Emphasis character styles are honoured, lists reopen as `ul` / `ol` / `li`) and embedded pictures come in through `mammoth.images.imgElement` as data URIs, then the result passes DOMPurify’s html profile. If that pass yields nothing there is a second one: `extractAltChunkHtml` recovers the body from the MHT — **and the `.docx` files this extension itself writes are exactly that kind of container**, so an HTML→Word result can be read back. When both passes come up empty the route reports `errors.docxEmpty`, deliberately different from the cannot-open `errors.docxParse`. `html>json` then lifts the table: **the first row supplies the keys and every later row is one record**, and that step does not ask whether the source row was a heading; rows and cells are read in a “this table only” scope, so a table nested inside a cell is not flattened into the outer rows — but its presence counts as a second table, see limits. `json>csv` spreads the array: columns are the union of every record’s keys, a key a row lacks becomes a blank cell, elements with no keys to hang on (top-level scalars, nested arrays) go into a synthetic `_value` column instead of being dropped, nested objects are written as JSON text inside their cell, and the file starts with a UTF-8 BOM. All of it happens in this tab on the storage permission, and after sanitising comes `stripRemoteResources`, because the altChunk body is markup this project never wrote — measured on a document whose `afchunk.mht` carried a remote `<img>`: unstripped, the artifact requested that URL when opened.',
    },
    keeps: {
      zh: [
        '第一行给列名、其余行给记录：这一步只看表格结构，不要求原文把首行标成标题行',
        '值按写下的字符落地：`00424`、`1/2`、`2024-01-05` 都不被推断成数字或日期',
        '没有键可挂的元素进合成 `_value` 列，一千条记录出一千行，不静默少行',
        '本扩展自己写的 `.docx` 能被读回：HTML→Word 与 Word→HTML 是可来回的一对',
      ],
      en: [
        'The first row names the columns and the rest are records: structure decides, no heading markup required',
        'Values land as the characters written, so `00424`, `1/2` and `2024-01-05` are not inferred into numbers or dates',
        'Elements with no keys go into a synthetic `_value` column, so 1 000 records write 1 000 rows instead of silently losing some',
        'The `.docx` files this extension writes can be read back: HTML→Word and Word→HTML are a round trip',
      ],
    },
    limits: {
      zh: [
        '两份表格就撞闸：文档里有两张以上 `<table>` 且至少一张带数据行时，中间那步交出的是分组对象——键取同序号的那个 `<h2>` 文字，那里没有对应标题时是 `Sheet2` 这类名字——而 CSV 那一步只接受数组，界面报「JSON 内容必须是包含数据的数组才能转换为 CSV」——请一张表一个文件',
        '表格套在单元格里也算两张：它不会污染数据行，但会让整批失败',
        '合并区不展开：被 `colspan` / `rowspan` 覆盖的位置不产生值，那一行的列会左移',
        '段落、页眉页脚、脚注正文与批注没有单元格可放，不进结果；但脚注的引用标记（形如 `[1]`）会留在所在单元格的值里，插入修订（`w:ins`）的文字也按正文读出——只有删除修订会消失',
        '打不开不是空文档：解不出容器报 `errors.docxParse`，解开了但没有可转内容报 `errors.docxEmpty`，两种说法在界面上分开',
      ],
      en: [
        'Two tables trip the gate: with more than one `<table>` and at least one carrying data rows, the middle step hands over a grouped object — keyed by the `<h2>` at the same index, or a `Sheet2`-style name where there is none — and the CSV step accepts arrays only, so the interface reports “JSON must be an array containing data to convert to CSV” — one table per file',
        'A table nested in a cell also counts as the second one: it does not pollute the data rows, but it fails the batch',
        'Merged ranges are not expanded: positions covered by `colspan` / `rowspan` produce no value, so that row shifts left',
        'Paragraphs, headers and footers, footnote text and comments have no cell to sit in and do not appear — though a footnote reference such as `[1]` stays inside the value of the cell carrying it, and inserted revisions (`w:ins`) are read as ordinary text while only deletions vanish',
        'Unreadable is not empty: a container that cannot be parsed reports `errors.docxParse`, while one that parses with nothing convertible reports `errors.docxEmpty`, and the interface keeps them apart',
      ],
    },
    notes: {
      zh: [
        '要工作簿而不是文本：Word→Excel 是同一条链再加一步取数与格式钉格',
        '要保留版面给人看：Word→HTML、Word→PDF 或 Word→Markdown，结构与文字都在',
        '只要文档里的文字本身：Word→TXT 按阅读顺序抽正文，比这里逐格取值更贴近页面',
      ],
      en: [
        'For a workbook rather than text: Word to Excel is this chain plus the typing and format-pinning step',
        'For something that reads like the document: Word to HTML, PDF or Markdown, which carry its structure and words',
        'For the words themselves: Word to TXT takes the body in reading order, which sits closer to the page than cell-by-cell values',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的 Word 文档里有两张表，为什么直接报错？',
          en: 'My document has two tables — why does it just fail?',
        },
        a: {
          zh: '因为中间那一步为了不把两张表的列混在一起，交出的是「小标题 → 该表数据」的对象，而对象过不了 CSV 那道「必须是数组」的闸。这不是没做完，而是不肯猜哪张表才是你要的。把两张表分别另存成两个文档，各转一次即可。',
          en: 'Because the middle step, rather than merge two tables’ columns, hands over an object of “heading → that table’s rows”, and an object cannot pass the CSV step’s arrays-only gate. That is a refusal to guess which table you meant, not unfinished work: save the two tables as two documents and convert each.',
        },
      },
      {
        q: {
          zh: '表里的日期和编号会被改写吗？',
          en: 'Will dates and ids in the table be rewritten?',
        },
        a: {
          zh: '不会。中间那步取到的单元文字是字符，这一层不做类型猜测——猜就把 `00424` 变成 `424`、把 `1/2` 变成某个日期。需要可计算的数字，请走 Word→Excel：那条链按「字节能逐字回来」的规则把确实是数字的格子还原成数字。',
          en: 'No. Cells arrive as characters and this layer guesses nothing — guessing is how `00424` becomes `424` and `1/2` becomes a calendar day. For summable numbers take Word to Excel, which restores the number type only where the bytes come back exactly.',
        },
      },
      {
        q: {
          zh: '为什么标题与段落都不在 CSV 里？',
          en: 'Why are my headings and paragraphs missing?',
        },
        a: {
          zh: '因为 CSV 只有一格一格的值：文档结构在中间那步变成 HTML 后被读成表格数据，标题、正文与批注没有能落值的列。要留结构请用 Word→Markdown、Word→HTML 或 Word→TXT；这里交付的是表格，不是文档。',
          en: 'Because CSV holds values in cells and nothing else: the document becomes HTML and is then read as table data, so headings, body text and comments have no column to land in. For structure take Word to Markdown, HTML or TXT — this route delivers a table, not a document.',
        },
      },
    ],
  },
  {
    slug: 'docx-to-xlsx',
    from: 'docx',
    to: 'xlsx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Word 转 Excel——离线、一张表进一张工作表、不上传',
      en: 'Word to Excel offline — one table, values kept',
    },
    desc: {
      zh: 'Word 表格经 HTML、JSON、CSV 三步落进一张工作表：数字只在字节能逐字回来时才是数字，16 位编号保持文本。两份表格会撞闸。全程离线。',
      en: 'A Word table travels HTML → JSON → CSV into one worksheet, where a number returns only if its bytes do and 16-digit ids stay text. Offline, no uploads.',
    },
    lede: {
      zh: '四步，前两步与 Word→CSV 完全相同：`docx>html` 用 mammoth 读出文档（Heading 1 到 4 成 `h1` 到 `h4`、Title 与 Subtitle 成带 class 的 `h1` / `h2`、列表按 `ul` / `ol` / `li` 重开、内嵌图片成 data URI），净化后成一份自带样式表的 HTML，捞不到正文时再从 MHT altChunk 里恢复；`html>json` 取表格，**第一行给出键名**、其余行成记录，行列都限定在「这张表自己」的作用域内；`json>csv` 摊成表；`csv>xlsx` 写工作簿。真正决定产物的是最后一步：读 CSV 用 `raw: true`，SheetJS 的类型推断器碰不到数据，`00424` 不缩成 `424`、`2024-01-05` 不变成序列号；随后只有一道规则把该是数字的格子还回去——十进制形状、`String(Number(x)) === x` 逐字节回得来、有效数字不超过 15 位。16 位以上刻意留在文本，因为表格软件只渲染 15 位有效数字，卡号那一级编号一旦成数就会被读成 `4.11111111111111E+15`。仍是文本的格子再加公式护栏，并把数字格式钉成文本——写出的 `xl/styles.xml` 里那一格就是内置格式号 49。产物是一张工作表，表名沿用读取 CSV 时得到的那一个。两条要照实说的边界：文档里有两张表（含套在单元格里的那种）时，中间那步交出的是分组对象，CSV 那步只接受数组，整批报「JSON 内容必须是包含数据的数组才能转换为 CSV」；合并区被 `colspan` / `rowspan` 覆盖的位置不产生值，那一行的列会左移。全程离线、只有 storage 权限，净化之后仍会剥掉远程引用。',
      en: 'Four steps, the first two identical to Word to CSV: `docx>html` reads the document with mammoth (Heading 1–4 become `h1`–`h4`, Title and Subtitle become classed `h1` / `h2`, lists reopen as `ul` / `ol` / `li`, embedded pictures arrive as data URIs), the result is sanitised and wrapped in the bundled stylesheet, and an empty pass falls back to the MHT altChunk; `html>json` lifts the table, **first row naming the keys**, later rows becoming records, all read inside a “this table only” scope; `json>csv` spreads it; `csv>xlsx` writes the workbook. The last step decides the artifact: the CSV is read with `raw: true`, so SheetJS’s inferrer never touches the data — `00424` does not shrink and `2024-01-05` does not become a serial — and one rule alone returns the number type: decimal shape, `String(Number(x)) === x` giving the exact characters back, at most 15 significant digits. Sixteen and above stay text deliberately, because a spreadsheet renders 15 significant digits and a card number turned into a value reads back as `4.11111111111111E+15`. Cells that remain text also get the formula guard and a pinned text number format — that cell carries the built-in format id 49 in the written `xl/styles.xml`. The output is a single worksheet, named whatever the CSV read produced. Two boundaries stated plainly: with two tables in the document (including one nested inside a cell) the middle step hands over a grouped object, the CSV step accepts arrays only, and the batch fails with “JSON must be an array containing data to convert to CSV”; and merged ranges are not expanded, so positions covered by `colspan` / `rowspan` produce no value and that row shifts left. Everything runs in this tab on the storage permission, and remote references are stripped after sanitising.',
    },
    keeps: {
      zh: [
        '数字只在字节能逐字回来时才是数字：`1727000000000` 可求和，`00424`、`1/2`、`2024-01-05` 保持原字符',
        '16 位以上的编号留在文本，并钉住文本格式（写出的那一格是内置格式号 49）',
        '列取所有记录键名的并集：某行缺的键留空格；比表头多出的单元格在取表那一步就被丢掉，所以后面几列不会错位',
        '一张表进一张工作表：中间那份 CSV 只有一个表，产物就是单 sheet，表名沿用读取结果',
      ],
      en: [
        'A value is a number only when its bytes come back exactly: `1727000000000` becomes summable while `00424`, `1/2` and `2024-01-05` stay as written',
        'Identifiers of 16 digits or more stay text, pinned to a text number format (the written cell carries the built-in format id 49)',
        'Columns are the union of every record’s keys and a missing key is a blank cell, while cells beyond the header row are dropped at the table step, so later columns cannot shift',
        'One table, one worksheet: the intermediate CSV has a single table, so the sheet count is one and its name is whatever the read produced',
      ],
    },
    limits: {
      zh: [
        '两张表就撞闸：只要至少一张带数据行，交出的是分组对象，过不了「只接受数组」那一步——请一张表一个文档',
        '段落、页眉页脚、脚注正文与批注不进工作簿；插入修订的文字与脚注引用标记会留在它们所在单元格的值里',
        '合并区不展开，被覆盖的位置不产生值；嵌套表算第二张表',
        '值在中间那步全是字符串，是否还原成数字由最后一步那三条规则决定：`1,234.50`、`¥100`、`45%`、`+33` 都不是十进制形状，留在文本',
        '本扩展写的 `.docx` 用的是 altChunk 容器，读回时会走恢复那一条路；用其他编辑器写的文档则看它自己的表格结构能否被 mammoth 认出',
      ],
      en: [
        'Two tables with data rows trip the gate: the grouped object cannot pass the arrays-only step, so keep one table per document',
        'Paragraphs, headers and footers, footnote text and comments do not reach the workbook, while inserted revisions and footnote references stay inside the value of the cell carrying them',
        'Merged ranges are not expanded and covered positions produce no value; a nested table counts as the second table',
        'Values are strings in the middle step and the final rule of three decides whether one comes back: `1,234.50`, `¥100`, `45%` and `+33` are not decimal-shaped and stay text',
        'The `.docx` files this extension writes carry an altChunk container and are read back through the recovery path; documents from other editors depend on whether mammoth recognises their table structure',
      ],
    },
    notes: {
      zh: [
        '只要一份文本表格：Word→CSV 是同一条链的前三步，产物是带 BOM 的 CSV',
        '要一份读起来像原文档的：Word→PDF、Word→HTML 或 Word→Markdown',
        '只想读回值不要类型判断：Word→JSON，那里值全是字符串、结构按 `<h2>` 分组',
      ],
      en: [
        'For a text table only: Word to CSV is the first three steps of this chain, ending in a BOM’d CSV',
        'For something that reads like the document: Word to PDF, HTML or Markdown, which carry its structure and text',
        'For values without any typing decision: Word to JSON, where everything is a string and grouping follows the `<h2>` text',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么我的 Word 表转成 Excel 后没有公式与格式？',
          en: 'Why did my Word table come out with no formulas or formatting?',
        },
        a: {
          zh: '因为这条链搬运的是格子里的值：Word 表格里的内容被读成文字，再以「值是否逐字节回得来」决定要不要还成数字。文档里的样式、条件格式与计算结果都不是它的取数对象——它交付的是一张可算的数据表，不是一份排版副本。',
          en: 'Because this chain carries values: the cells are read as text, and a number type returns only where the bytes round-trip. Styles, conditional formatting and computed results in the document are not what it extracts — what arrives is cell values, not a copy of the layout.',
        },
      },
      {
        q: {
          zh: '编号前面的零会丢吗？',
          en: 'Do leading zeros in my ids survive?',
        },
        a: {
          zh: '不会。`00424` 与 16 位账号都留在文本形态并被钉住文本格式（写出的那一格用内置格式号 49），所以那一格存下来的就是文本形态的值。代价是那些格子里存的是字符而不是数值；这是本项目在「保住编号」与「让它成数」之间刻意选的前者。',
          en: 'No. `00424` and a 16-digit identifier stay text and are pinned to a text format (the written cell uses the built-in format id 49), so what is stored there is text, not a number. The price is that those cells hold characters rather than a numeric value; that is the trade this project deliberately takes in favour of keeping identifiers intact.',
        },
      },
      {
        q: {
          zh: '两份表格能分别落到两个 sheet 吗？',
          en: 'Can two tables land on two worksheets?',
        },
        a: {
          zh: '不能。这条链一次吃得下一张表：多张表在中间那步是分组对象，CSV 那步不接受；而写工作簿那步读的也只有一份 CSV。要两份，请把两张表分成两个文档各转一次，各自得到一份工作簿。',
          en: 'Not on this route: it eats one table at a time, since several become a grouped object that the CSV step rejects, and the writer reads a single CSV anyway. Split the tables into two documents and convert each; you then have one workbook per table.',
        },
      },
    ],
  },
  {
    slug: 'txt-to-xlsx',
    from: 'txt',
    to: 'xlsx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'TXT 转 Excel——离线、文本得是 JSON 数组、不上传',
      en: 'TXT to Excel offline — the text must be a JSON array',
    },
    desc: {
      zh: '四步链：`.txt` 整段包进 `<pre>`，按 JSON 解析、摊成 CSV、再写工作簿。数字只在字节能逐字回来时才成数，16 位以上留在文本。全程离线。',
      en: 'Four steps: the text is wrapped in a pre block, parsed as JSON, spread into CSV and written as a workbook. Only round-trip values become numbers.',
    },
    lede: {
      zh: '这条链是四步，前两步决定了它能不能成立：`txt>html` 把整个文件按字符包进一个 `<pre>`（只转义 `&`、`<`、`>`，换行写成 `<br>`，文档标题取文件名的主干（去掉扩展名），没有名字时是 `converted`），**不解释任何记号**——`#` 就是 `#`，粘进去的 HTML 只会是显示出来的字符；`html>json` 发现文档里没有表格，就退一步把**第一个** `<pre>` 的文字当 JSON 解析。所以这一步真正要的条件是「文本本身是一段合法 JSON」，而且是**数组**：中间那步是对象的话，第三步 `json>csv` 会报「JSON 内容必须是包含数据的数组才能转换为 CSV」。两个细节值得知道：`<br>` 对 `textContent` 不贡献字符，所以你文件里的换行到取回时已经没了——JSON 语法不依赖换行，照常解析，但你手工排的版式不会带着走；回退只看第一个 `<pre>`，如果它排在真正的 JSON 块之前，就会解析失败而不是跳过去找。第三步摊成表：列是所有记录键名的并集，某条记录缺的键留空格，没有键可挂的元素写进合成的 `_value` 列而不是丢掉，产物开头带 UTF-8 BOM。第四步 `csv>xlsx` 才是决定工作簿形态的地方：读 CSV 用 `raw: true`，SheetJS 的推断器碰不到数据，随后只有一道规则把该是数字的格子还回去——十进制形状、`String(Number(x)) === x` 逐字节回得来、有效数字不超过 15 位；16 位以上刻意留在文本：那条规则的上限就是 15 位有效数字（仓库里按位数量过 30 万个整数的回写命中率，16 位起只剩 94.5%）。仍是文本的格子再加公式护栏，并把数字格式钉成文本（写出的那一格是内置格式号 49）。还有一条得说在前头：如果你的文本里存的是超长整数（比如 26 位账号），`JSON.parse` 那一刻它就已经是双精度值了，这条链保住的是**解析之后**的样子，超过 15 位有效数字就落在文本里——所以你看到的是那个双精度值自己的最短十进制写法，并且被当作文本存下——不是悄悄四舍五入过的数字。编码判定在第一步做：先按 BOM 与 NUL 的奇偶形状认 UTF-16，再依次试严格的 UTF-8、GB18030、GBK，四种都不像文本就明确报错。全程离线，只有 storage 权限。',
      en: 'Four steps, and the first two decide whether the route can run at all: `txt>html` wraps the whole file character by character into a `<pre>` (only `&`, `<` and `>` are escaped, newlines become `<br>`, and the document title is the file’s basename with the extension dropped, or `converted` when there is none), **interpreting no markup** — a `#` stays a `#`, and HTML pasted into the text shows up as characters; `html>json`, finding no table in that document, falls back to parsing the text of the **first** `<pre>` as JSON. So the real condition is “the text itself is valid JSON”, and an **array** at that: if the middle step yields an object, `json>csv` reports “JSON must be an array containing data to convert to CSV”. Two details worth knowing: `<br>` contributes nothing to `textContent`, so the line breaks in your file are gone by the time the text is read back — JSON does not depend on them, so it still parses, but your own layout does not travel; and the fallback reads only the first `<pre>`, so a non-JSON block ahead of the real one fails the parse instead of being skipped past. The third step spreads the array into a table: columns are the union of every record’s keys, a key a record lacks becomes a blank cell, elements with no keys go into a synthetic `_value` column rather than being dropped, and the file starts with a UTF-8 BOM. The fourth, `csv>xlsx`, is what shapes the workbook: the CSV is read with `raw: true`, so SheetJS’s inferrer never touches the data, and one rule alone returns a number type — decimal shape, `String(Number(x)) === x` giving the exact characters back, at most 15 significant digits. Sixteen and above stay text deliberately: the rule itself stops at 15 significant digits, measured in this repo over 300 000 sampled integers per digit length (94.5% survive at 16). Cells still holding text get the formula guard and a pinned text format (that cell carries the built-in format id 49). One caveat stated up front: if your text stores very long integers (a 26-digit account, say), `JSON.parse` has already turned it into a double, and this chain preserves what came **after** the parse — past 15 significant digits it lands in text, so what you see is that double’s own shortest decimal text, kept as a text cell, rather than a silently rounded number. Encoding is settled in the first step: UTF-16 from its BOM or NUL parity, then strict UTF-8, GB18030 and GBK in order, with an outright error when the bytes are not text at all. Everything runs offline on the storage permission.',
    },
    keeps: {
      zh: [
        '值按文件里写下的字符进工作簿：`raw: true` 加「逐字节回得来才成数」，`00424` 不缩成 `424`、`2024-01-05` 不变序列号',
        '16 位以上的编号留在文本并钉住文本格式（内置格式号 49），15 位以内一律不受影响',
        '记录形状不齐也能落表：列是键名并集，缺的键留空格，没有键的元素进合成的 `_value` 列',
        '编码逐条严格解：UTF-16（BOM 或 NUL 形状）、UTF-8、GB18030、GBK，都不像文本就报错而不是产出乱码',
      ],
      en: [
        'Values enter the workbook as the characters in the file: `raw: true` plus the round-trip rule, so `00424` does not shrink and `2024-01-05` is not a serial',
        'Identifiers of 16 digits or more stay text pinned to a text format (the built-in format id 49); nothing at or below 15 digits is touched',
        'Untidy records still land: columns are the union of keys, missing keys become blank cells and keyless elements go into a synthetic `_value` column',
        'Encoding is decoded strictly one candidate at a time — UTF-16 by BOM or NUL shape, then UTF-8, GB18030 and GBK — and unreadable bytes fail rather than turning into mojibake',
      ],
    },
    limits: {
      zh: [
        '文本得是一段合法 JSON **数组**：普通文字、日志、以竖线或制表符排的“伪表”都会明确报错，这条链不会替你造列',
        '是 JSON 但是对象（顶层 `{}`）也一样过不了第三道闸：报「JSON 内容必须是包含数据的数组才能转换为 CSV」',
        '回退读的就是那一个 `<pre>`：里面不是合法 JSON 就解析失败；`[]` 与 `[{}]` 也报错，不给只有表头的空表',
        '换行不带着走：`<br>` 不进 `textContent`，所以你写的缩进与空行不会出现在工作簿里（JSON 语法不依赖它们）',
        '超长整数按解析后的双精度值处理：超过 15 位有效数字留在文本，看得见的是近似值而不是原串的每一位',
      ],
      en: [
        'The text has to be valid JSON **array**: prose, logs and pseudo-tables laid out with pipes or tabs fail outright — this chain will not invent columns for you',
        'JSON that is an object at the top level fails the same gate, with “JSON must be an array containing data to convert to CSV”',
        'The fallback reads that single `<pre>`, so anything in it which is not valid JSON fails the parse; `[]` and `[{}]` also fail rather than producing a header-only sheet',
        'Line breaks do not travel: `<br>` leaves no trace in `textContent`, so your indentation and blank lines are not reproduced in the workbook (JSON does not need them)',
        'Huge integers are handled as the double they become at parse time: past 15 significant digits they stay text, so what you see is an honest approximation rather than every digit of the original',
      ],
    },
    notes: {
      zh: [
        '只要一份文本表格：TXT→CSV 是同一条链的前三步，产物是带 BOM 的 CSV',
        '文本其实是逐行记录：这条链帮不上，请先按能明确分隔的方式存成 CSV 再转',
        '要的是把 JSON 变得可读：TXT→JSON 或 JSON→HTML，一个重排缩进、一个给可折叠的树视图',
      ],
      en: [
        'For a text table instead of a workbook: TXT to CSV is this chain minus the last step, ending in a BOM’d CSV',
        'For line-oriented records, this chain cannot help: save with an explicit delimiter as CSV first, then convert',
        'To make the JSON readable: TXT to JSON re-indents it, and JSON to HTML turns it into a collapsible tree',
      ],
    },
    faq: [
      {
        q: {
          zh: '我的 txt 是每行一条记录，为什么不按行切成表格？',
          en: 'My txt has one record per line — why not split it into rows?',
        },
        a: {
          zh: '因为这条路不推断分隔符：同一个文件里可能是制表符、连续空格、逗号或竖线，没有一条规则能对所有 txt 都对，而猜错的代价是整列错位、还报成功。这条路只认自带结构的数据，也就是 JSON 数组；其他文本请先用明确分隔符存成 CSV，再走 CSV→Excel。',
          en: 'Because this route infers no delimiter: the same file might use tabs, runs of spaces, commas or pipes, no rule holds for all text, and a wrong guess shifts every column while still reporting success. This route reads data that arrives structured, i.e. a JSON array; otherwise save with an explicit delimiter as CSV and take CSV to Excel.',
        },
      },
      {
        q: {
          zh: '为什么我的 JSON 存成 txt 转成功了，数字却和原来不一样？',
          en: 'My JSON saved as txt converted fine — why do the numbers differ?',
        },
        a: {
          zh: '差异出在 JSON 解析那一步，而不是这条链的后面：`JSON.parse` 把所有数字都读成双精度值，超过 15 位有效数字本来就存不下。链子在最后一步按「字节能逐字回来」判定，所以这类长值会以文本形态留在表里，看得见而不是被悄悄改掉。要每一位都保住，请在源文件里把它写成字符串。',
          en: 'The difference is made at the parse, not later: `JSON.parse` reads every number as a double, and past 15 significant digits there is nowhere to put them. The final step then applies its round-trip rule, so such long values stay text — visible rather than silently altered. To keep every digit, write the value as a string in the source.',
        },
      },
      {
        q: {
          zh: '一份很大的 JSON 数组会出多大工作簿？',
          en: 'How big a workbook does a large JSON array make?',
        },
        a: {
          zh: '一条记录一行，行列数由所有记录键名的并集决定；这份产物只有一张工作表，表名沿用读取 CSV 时得到的那一个。要分页看，请先用文本处理切成几份，各转一次——这条链一次只写一张表。',
          en: 'One row per record, and the column count is the union of every record’s keys; the artifact is a single worksheet named whatever the CSV read produced. To work through it in parts, split the text and convert each — this route writes one sheet at a time.',
        },
      },
    ],
  },
  {
    slug: 'docx-to-jpg',
    from: 'docx',
    to: 'jpg',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'Word 转 JPG——离线、按 A4 一页一图、不上传',
      en: 'Word to JPG offline — one image per A4 page',
    },
    desc: {
      zh: '文档先由 mammoth 变成带样式的 HTML（内嵌图片会读成 data URI 留在页面里），再按 A4 切成无损片段、逐页编码成 JPEG；多页出 ZIP。全程离线。',
      en: 'Mammoth turns the document into HTML — embedded pictures arrive as data URIs — then it is sliced into A4 pages and JPEG-encoded one page at a time.',
    },
    lede: {
      zh: '三步：`docx>html` 用 mammoth 读出文档体（显式 styleMap 把 Heading 1 到 4 映射成 `h1` 到 `h4`、Title 与 Subtitle 成带 class 的 `h1` / `h2`，字符样式认 Strong 与 Emphasis，列表按 `ul` / `ol` / `li` 重开），**内嵌图片经 `mammoth.images.imgElement` 读成 data URI**（能带走的只有 png / jpeg / gif / webp / bmp / avif 那一类白名单，TIFF、EMF、WMF、SVG、HEIC 那几种会被剥掉 `src`），净化后套上自带的样式表；正文抓不到时第二条路会从 MHT altChunk 里恢复（本扩展自己写的 `.docx` 正是那种容器，所以 HTML→Word 的结果能再读回来）。`html>pdf` 把这份文档整篇渲染成一张画布、按 A4 的毫米比例算页数（页高 = 画布高 × 210 ÷ 画布宽，每 297 mm 一页向上取整，最后一片按剩余高度收），切成同高片段并**以无损位图（PNG）嵌进 PDF**；`pdf>jpg` 再逐页转成 JPEG，一页一图、两页以上打包成 ZIP（里面按 `page-N.jpg` 编号），单次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`），超过会明确让你用页码范围只选需要的页。这条路真正擅长的一件事，正好是别的取值路线做不到的：**文档里内嵌的图片会出现在产物里**——它们被读成 data URI 带进 HTML，再随排版进图；而 Word→TXT、Word→CSV 那些路只拿文字，图就没了。要说清的边界也不少：分页来自浏览器的排版，Word 自己的页面设置、页眉页脚与分节在这里没有对应物；产物是位图，没有可选中、可搜索的文字（这条链的 PDF 那一环也是页面图像，要可复制请走 Word→HTML / TXT / Markdown）；脚注的引用标记会以 `[1]` 上标的形式出现在它所在的那一行里，插入修订的文字被当正文读出，只有删除修订会消失；合并单元格按 HTML 的 `colspan` / `rowspan` 画出跨格（实测跨格宽是邻格两倍、跨行高是两倍）；取值那条路上被覆盖的位置不产生值、那一行的列会左移。中间那份 PDF 转图用的是默认密度（这一格不摆密度滑杆，但存储里留下的密度值会被带到这一步）；整页捕获的高度上限 32768 px（一边最大 8192 px 的四倍），超过报错而不是给空白画布。扩展只有 storage 权限、全程离线：脚本不执行（净化删可执行标记，渲染用的 iframe 只给 `allow-same-origin`），文档引用的远程图片取不到字节时会剥掉引用并在结果卡按张数披露。',
      en: 'Three steps: `docx>html` reads the body with mammoth (an explicit styleMap maps Heading 1–4 to `h1`–`h4`, Title and Subtitle to classed `h1` / `h2`, the Strong and Emphasis character styles are honoured and lists reopen as `ul` / `ol` / `li`), **embedded pictures come in through `mammoth.images.imgElement` as data URIs** (only the png / jpeg / gif / webp / bmp / avif allow-list survives; a TIFF, EMF, WMF, SVG or HEIC payload loses its `src`), the result is sanitised and wrapped in the bundled stylesheet, and when that pass finds no body a second one recovers it from the MHT altChunk (the `.docx` files this extension writes are exactly that kind of container, so an HTML→Word result can be read back). `html>pdf` renders the document into one canvas, computes the page count from the A4 metric ratio (page height = canvas height × 210 ÷ canvas width, rounding up every 297 mm, the last slice cut to what remains), slices it and **embeds each strip losslessly as PNG**; `pdf>jpg` then encodes each page as JPEG — one image per page, two or more in a ZIP with members named `page-N.jpg`, and at most 200 pages per run (`MAX_PDF_IMAGE_PAGES`), past which the route tells you to select a page range. What this route is genuinely good at is exactly what the value-extracting routes cannot do: **pictures embedded in the document appear in the output**, because they arrive as data URIs and travel into the image, while Word to TXT or CSV keeps only words and loses them. The boundaries are equally plain: pagination comes from browser layout, so Word’s own page setup, headers and footers and section breaks have no counterpart here; the artifact is a bitmap with no selectable or searchable text (the PDF in the middle is page images too, so take Word to HTML, TXT or Markdown when text must stay copyable); a footnote reference shows up as a superscript `[1]` in the line where it sits, and inserted revisions are read as ordinary text while only deletions disappear; merged cells are drawn as HTML spans here (measured: a spanning cell is twice its sibling’s width, a rowspan twice its height), while on the value-extracting routes the covered positions produce no value and that row shifts left. The intermediate PDF is rasterised at the default density (this route exposes no slider, though a density left from an earlier PDF batch travels into this step), and one capture is bounded at 32768 px of height — four times the 8192 px edge ceiling — failing rather than returning a blank canvas. The extension holds the storage permission and nothing reaches the network: scripts never run (sanitising removes executable markup and the render frame is sandboxed to `allow-same-origin`), and images the document references remotely have no bytes, so their references are stripped and the count is disclosed on the result card.',
    },
    keeps: {
      zh: [
        '内嵌图片里的 png / jpeg / gif / webp / bmp / avif 会留在产物里（读成 data URI 带进 HTML 再随排版进图）——取值类路线做不到这一件',
        '标题、列表与强调按 styleMap 变成真正的结构再渲染，产物看到的是排好版的面',
        '切片无损：中间那份 PDF 的页面是 PNG，压缩只发生在最后交给 JPEG 的那一次',
        '一页一图、两页以上 ZIP、成员名 `page-N.jpg`：分页由排版算出来而不是硬切',
      ],
      en: [
        'Embedded png, jpeg, gif, webp, bmp and avif pictures survive into the output (data URIs travelling through the layout into the image) — something the value-extracting routes cannot do',
        'Headings, lists and emphasis become real structure through the styleMap before rendering, so the picture shows a laid-out page',
        'Lossless slices: the intermediate PDF holds PNG pages, so compression happens once, on the final JPEG',
        'One image per page, a ZIP from two pages up with members named `page-N.jpg`: the breaks come from layout rather than a hard cut',
      ],
    },
    limits: {
      zh: [
        '一次最多渲染 200 页（`MAX_PDF_IMAGE_PAGES`）：超过会报错并让你用页码范围只选需要的页，或先把文档拆开',
        '产物是位图：没有文字层，文字不能选中、搜索或复制，Word 的页面设置、页眉页脚与分节也不参与分页（要可复制的文字请走 HTML / TXT / Markdown）',
        '脚注引用会以 `[1]` 出现在所在那一行的值里，插入修订的文字按正文读出；删除修订与批注不会出现',
        '整页捕获高度上限 32768 px；这一格不摆密度滑杆，但上一批 PDF 留下的密度值仍会被带到这一步',
        '文档以网络地址或相邻路径引用的外链图片取不到字节：引用在渲染前被剥掉，结果卡按张数披露，位置是虚线方框或直接留空',
      ],
      en: [
        'At most 200 pages per run (`MAX_PDF_IMAGE_PAGES`): past that the route fails and points at a page range or splitting the document',
        'The artifact is a bitmap: no selectable, searchable or copyable text, and Word’s page setup, headers, footers and section breaks take no part in the breaks (take HTML, TXT or Markdown for copyable words)',
        'A footnote reference appears as `[1]` inside the value of the line carrying it and inserted revisions read as ordinary text; deletions and comments do not appear',
        'A 32768 px ceiling on one capture, and while this route exposes no density slider, a density left from an earlier PDF batch is still forwarded into this step',
        'Pictures referenced by network address or sibling path have no bytes: the references are stripped before rendering, the count is disclosed on the card, and a spot is a dashed box or left blank',
      ],
    },
    notes: {
      zh: [
        '要一份单文件的多页文档：Word→PDF 走同一条渲染链（那里的文字同样是图像）',
        '要结构与文字都留住：Word→HTML 或 Word→Markdown，图片仍以内联数据形式跟过去',
        '只要格子里的值：Word→CSV / Word→Excel，那里交付的是数据而不是版面',
      ],
      en: [
        'For one multi-page file: Word to PDF, the same rendering chain (its text is imagery too)',
        'To keep structure and words: Word to HTML or Markdown, where pictures still travel as inline data',
        'For the values in the cells: Word to CSV or Excel, which deliver data rather than a page',
      ],
    },
    faq: [
      {
        q: {
          zh: '文档里的图片会跟着过去吗？',
          en: 'Do the pictures in my document come along?',
        },
        a: {
          zh: '内嵌在文档里的会——前提是类型在那几种位图之内（`png / jpeg / gif / webp / bmp / avif / ico`）：它们被读成 data URI 带进中间那份 HTML，再随排版进图；白名单外的（TIFF、EMF、WMF 这类）在渲染前就丢了 `src`，图上那一处换成虚线方框并按张数计入丢弃。以网络地址引用的那一种同样不会——这条路完全离线，那些引用在渲染前就被剥掉，结果卡按张数写明丢了几张。',
          en: 'Embedded ones do, provided the type is one of the rasters that carry their own bytes (`png / jpeg / gif / webp / bmp / avif / ico`): they are read as data URIs into the intermediate HTML and travel with the layout into the image. A TIFF, EMF or WMF loses its `src` before rendering, so its spot becomes a dashed box and counts among the dropped pictures. Pictures referenced over a network do not come along either — the route is fully offline, those references are stripped before rendering and the result card says how many were lost.',
        },
      },
      {
        q: {
          zh: '分页会照我在 Word 里设的吗？',
          en: 'Will it break pages the way Word does?',
        },
        a: {
          zh: '不会。中间那步是浏览器排版：文档被整篇渲染成一张画布，再按 A4 的高度比例切页。页边距、分节与页眉页脚这些 Word 概念没有对应物，所以页数与断点只由排版算出来。要沿用 Word 自己的分页，唯一的入口是 Word 导出的那份 PDF，再走 PDF→JPG。',
          en: 'No. The middle step is browser layout: the document is rendered into one canvas and sliced by the A4 height ratio. Margins, section breaks and headers have no counterpart, so page count and breaks come from that layout alone. Word’s own pagination is reachable only through a PDF that Word exported, followed by PDF to JPG.',
        },
      },
      {
        q: {
          zh: '为什么图里的字不能复制？',
          en: 'Why can’t the text in the image be copied?',
        },
        a: {
          zh: '因为产物是每页一张位图，没有文字层——这条链里的 PDF 那一环同样是页面图像，不是可取字的文本层。需要复制、搜索或朗读，请走 Word→HTML、Word→Markdown 或 Word→TXT；要保留观感又要有字，就只能由 Word 自己导出的 PDF 来做，那不在本扩展的路线里。',
          en: 'Because the artifact is one bitmap per page with no text layer — and the PDF in this chain is page images as well, not a text layer. For copying, searching or reading aloud take Word to HTML, Markdown or TXT; a text-bearing PDF has to come from Word itself, which is outside this extension’s routes.',
        },
      },
    ],
  },
  {
    slug: 'jpg-to-html',
    from: 'jpg',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JPG 转 HTML——离线、字节原样内嵌、不上传',
      en: 'JPG to HTML offline — the bytes travel unchanged',
    },
    desc: {
      zh: '文件以 data URI 内嵌进一份能直接打开的网页，`alt` 与 `title` 用你的文件名主干；不解码也不重编码，像素就是你原来那一份。全程离线。',
      en: 'The file is embedded as a data URI with your file name as alt and title; nothing is decoded or re-encoded, so the pixels are the ones you had.',
    },
    lede: {
      zh: '这条路只有一步，而且刻意做得很薄：`jpg>html` 把文件的**原始字节**用 `FileReader.readAsDataURL` 编成 data URI，写进一个 `<img src>`，再把这张图包进一份自带样式表的 HTML——**中间没有任何解码或重编码**，不像图片转图片那几路要先上画布再压一次。所以像素与源文件逐字节相同；体积是「每三个字节写成四个字符」再加一层约 2.6 KB 的外壳（`<style>` 里那份文档 CSS 与标签；文件名在 `<title>`、`alt`、`title` 各出现一次，所以它随名字长度略有增减），大图因此趋近 4/3（界面上 5 MB 的照片产出约 6.7 MB 的 HTML），小图则几乎全是这层外壳（本身就有 2.6 KB）。`alt` 与 `title` 都取**文件名的主干**（去掉扩展名，没有可用名字时退到 `converted`），并且按属性位置做了转义——这是这条唯一能给出的描述：它不读图里的内容，也不猜图里画了什么。文档 CSS 让图居中、`max-width: 100%`、`height: auto`，所以一张很宽的图最多显示到这份文档的版心（实测 1400 px 窗口下约 800 px：`body` 是 content-box 的 `max-width: 800px`，内边距不占这 800），窗口更窄时再跟着缩——两种缩放都不改动文件里的像素。这条路的用处是「把图交给一个只吃网页的地方」：单文件归档、图文一起存进笔记，或者作为 Markdown 与 Word 那两条链的中间形状（本扩展的图转 Markdown 正是先走这一步）。它也**不外发任何东西**：图就在文件里，打开这份 HTML 不取任何远程资源；SVG 那条路同样在写出前剥掉远程引用，所以两条都不会在你双击打开时发起请求。扩展本身也只有 storage 权限，转换全程离线。',
      en: 'This route is one step, and deliberately thin: `jpg>html` takes the file’s **raw bytes**, base64-encodes them through `FileReader.readAsDataURL` into a data URI, puts them in an `<img src>` and wraps that in a document with the bundled stylesheet — **no decode and no re-encode anywhere**, unlike the image-to-image routes, which must go through a canvas and compress again. So the pixels are byte-identical to your file, and the size is four characters per three bytes plus a wrapper of about 2.6 KB that shifts with the length of your file name (the name appears three times: `<title>`, `alt` and `title`) (the document CSS in `<style>` and the markup): a large photo converges on 4/3 — the 5 MB the interface shows comes out as roughly 6.7 MB of HTML — while a small one is almost all wrapper. `alt` and `title` both carry **the basename of your file** (extension dropped, falling back to `converted` when there is no usable name), escaped for attribute position — that is the only description this route can offer, because it never reads what is in the picture and never guesses at its contents. The document CSS centres the image with `max-width: 100%` and `height: auto`, so a very wide picture displays no wider than this document’s measure (measured at a 1400 px window: about 800 px, because `body` is content-box with `max-width: 800px` and its padding sits outside that 800) and keeps shrinking below that in a narrow window; neither kind of scaling changes a pixel in the file. What this is for: handing a picture to something that only accepts a web page — a single-file archive, a note that keeps its image next to its text, or the middle shape of the Markdown and Word chains (this extension’s image-to-Markdown goes through exactly this step). And it **sends nothing out**: the picture lives in the file, so opening the HTML fetches no remote resource, and the SVG route strips remote references on the way out too, so neither one makes a request when you double-click it. The extension itself holds only the storage permission, and the conversion never touches the network.',
    },
    keeps: {
      zh: [
        '像素逐字节不变：不解码、不上画布、不再压一次，所以没有第二代损失',
        '`alt` 与 `title` 取文件名的主干（去扩展名），并做了属性转义——不会把名字写成标记',
        '自包含：图就在文件里，打开这份 HTML 不取任何远程资源',
        '显示缩放不动数据：CSS 只决定它在页面上占多宽，文件里的像素一个都不变',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'Byte-identical pixels: no decode, no canvas, no second compression, so there is no generation loss',
        '`alt` and `title` carry the file’s basename with the extension dropped, escaped for attribute position so a name cannot become markup',
        'Self-contained: the picture is in the file, and opening it fetches no remote resource',
        'Display scaling never touches data: CSS decides how wide it looks on the page, not what the bytes are',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '不 OCR，也不生成任何关于内容的文字：产物里唯一的字符串来自你的文件名',
        '体积只增不减：每三个字节写成四个字符，再加约 2.6 KB 外壳（界面上 5 MB 的照片约产出 6.7 MB HTML），所以这一路不是「压缩」',
        '只包一张图：多张图请一个文件一次，或先做一张拼版（本扩展不提供拼图功能）',
        'JPG 本身是哪种编码、有没有被裁切，这一层不改也不查：它做的是搬运而不是处理',
        '邮件里不保显示：网页端邮件客户端（Gmail 便是）会剥掉 `data:` 图片，能不能显示由收件端决定——要进邮件正文请用外链图片或邮件自己的附件',
        '不产生可复制的图片对象：想在别的文档里用这张图，请直接拿原文件或走图片转图片那几路',
      ],
      en: [
        'No OCR and no invented description: the only string in the output comes from your file name',
        'The file only grows: four characters per three bytes plus about 2.6 KB of wrapper, so the 5 MB the interface shows becomes roughly 6.7 MB of HTML — this is not a compression route',
        'One picture per file: for several, convert one at a time — this extension has no collage or tile feature',
        'Whatever encoding or cropping the JPEG already had is neither examined nor changed: this route carries, it does not process',
        'No guarantee in email: webmail clients — Gmail among them — strip `data:` images and the recipient decides, so use an external picture or the mail attachment itself',
        'It yields no copyable image object: take the original file, or an image-to-image route, when a document needs the picture itself',
      ],
    },
    notes: {
      zh: [
        '要 Markdown 里的图片：JPG→Markdown 就是这条再加一步序列化',
        '要 Word 文档里的图片：JPG→Word 第一步同为 `jpg>html`，进 Word 那一步会把这条 data URI 收进包里独立的图片部件，`.docx` 内不再留 data URI',
        '要真正换格式（比如转 WebP / PNG）：那需要重编码，请走图片转图片那几页',
      ],
      en: [
        'For an image in Markdown: JPG to Markdown is this step plus a serialisation',
        'For a picture in a Word file: JPG to Word shares this first step, and the `html>docx` step lifts that data URI into its own image part, so no data URI is left in the `.docx`',
        'To actually change format (to WebP or PNG): that needs re-encoding, so take the image-to-image pages',
      ],
    },
    faq: [
      {
        q: {
          zh: '这跟我手动把图片拖进网页有什么区别？',
          en: 'How is this different from dropping the image into a web page myself?',
        },
        a: {
          zh: '结果形状一样，差别在它顺手做完三件小事：文件名变成 `alt` 与 `title`（并按属性转义）、文档带着居中与自适应宽度的样式、以及不需要你写任何 HTML。产物是一份能直接双击打开的自包含文件。',
          en: 'The shape is the same; what this adds is three small things done for you: the file name becomes `alt` and `title` (escaped for attribute position), the document ships centreing and width-fit styling, and you write no markup. The result is a self-contained file you can open directly.',
        },
      },
      {
        q: {
          zh: '图里的文字会被识别出来吗？',
          en: 'Will the text inside the picture be recognised?',
        },
        a: {
          zh: '不会。这条路连像素都不读——它只把文件字节编成 data URI。任何「图片转文字」的结果都需要 OCR，而本扩展不带着语言包与识别模型，也不联网调用别的服务，所以它交付的是图片本身，外加你的文件名。',
          en: 'No. This route never looks at pixels: it encodes the file’s bytes as a data URI. Anything resembling text needs OCR, and the extension ships no language packs or recognition models and calls nothing over the network, so it delivers the picture plus your file name.',
        },
      },
      {
        q: {
          zh: '为什么 HTML 比原图大那么多？',
          en: 'Why is the HTML bigger than my image?',
        },
        a: {
          zh: 'base64 每三个字节要写成四个字符，这是编码形态的固定开销；另加约 2.6 KB 的文档外壳（它随文件名长度略有增减）（`<style>` 里那份 CSS 与标签）。图越大越接近 4/3，图越小越被外壳主导。想变小请走图片转图片那几路做真实重编码，而不是这一路。',
          en: 'base64 writes every three bytes as four characters — the fixed cost of the encoding — plus a document wrapper of about 2.6 KB, which moves a little with the length of your file name (the CSS in `<style>` and the markup). The bigger the picture, the closer it gets to 4/3; the smaller, the more the wrapper dominates. To go smaller, take an image-to-image route and re-encode for real; this one is not a compressor.',
        },
      },
    ],
  },
  {
    slug: 'jpg-to-md',
    from: 'jpg',
    to: 'md',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JPG 转 Markdown——离线、内联图片、不做 OCR',
      en: 'JPG to Markdown offline — an inline image, no OCR',
    },
    desc: {
      zh: '产物是一行自包含的图片语法：`![名字](data:image/…;base64,… "名字")`，字节就是原文件；不识别图里的文字，也不产生描述。全程离线。',
      en: 'You get one self-contained image tag whose bytes are the original file. No OCR, so no text is invented and nothing is uploaded.',
    },
    lede: {
      zh: '两步，而且第二步几乎不做决定：`jpg>html` 先把文件的原始字节编成 data URI 放进一个 `<img>`（`alt` 与 `title` 都是你的文件名主干，去扩展名、无名时 `converted`，并做属性转义），`html>md` 再用 Turndown 把这份文档序列化。实测产物就是形如 `![合同扫描件](data:image/jpeg;base64,/9j/… "合同扫描件")` 的**一行图片语法**：那张 `<img>` 是页面 `body` 里唯一的元素，所以除这一行之外没有别的正文；样式表在 `<head>`，而序列化只取 `body`，CSS 不会漏进 Markdown。base64 负载整个写进 `.md`——每三个字节四个字符，另加图片语法本身那一点开销——所以文件自包含、拷走单个 `.md` 不必带附件目录。要说清的一条边界：**这不是「图片转文字」**。图里印着什么，这条链一概不知道——它不读像素，本扩展也不带 OCR 模型与语言包，更不会把图上传给谁去识别。想要能搜索、能复制的文字得靠识别工具：在本地跑的那种与这里无关，要把图传上去的那种则意味着文件出了本机。反过来，如果你的目的就是把一张图塞进一份 Markdown 笔记，并且希望它在本机打开、或在自己的编辑器预览里始终带图，那这一路正是为此形状做的；在别人家的托管站上显不显示，由那边怎么处理 `data:` 图片地址决定，这里不能替你保证。全程只有 storage 权限，不联网。',
      en: 'Two steps, and the second barely makes decisions: `jpg>html` first encodes the file’s raw bytes into a data URI inside an `<img>` (`alt` and `title` both carry the basename of your file, extension dropped, `converted` when there is no usable name, escaped for attribute position), and `html>md` then serialises that document with Turndown. Measured, the artifact is **one line of image syntax** looking like `![合同扫描件](data:image/jpeg;base64,/9j/… "合同扫描件")`: that `<img>` is the only element in the page’s body, so nothing else is in the way, and the stylesheet sits in `<head>` while the serialisation reads only the body, so no CSS leaks in. The base64 payload is written straight into the `.md` — four characters per three bytes, plus the image syntax itself — so the file is self-contained and a single `.md` travels without an attachments folder. The boundary stated plainly: **this is not “image to text”**. Whatever is printed in the picture is unknown to this chain — it never reads pixels, the extension ships no OCR model or language packs, and it uploads nothing anywhere. Searchable, copyable words need a recognition tool: one that runs locally has nothing to do with this route, one that takes the picture over the network means the file has left your machine. If instead your goal is to put one picture inside a Markdown note and have it render on your own machine or in your own editor’s preview, this is exactly that shape; whether some hosting site draws a `data:` picture depends on how it handles those addresses, which no page here can promise for it. All of it on the storage permission, with no network at all.',
    },
    keeps: {
      zh: [
        '自包含的一行图片语法：base64 写在 `.md` 里，拷走笔记不用带附件目录',
        '字节是原文件的字节：这条链不重编码，所以没有第二代损失',
        '`alt` 与 `title` 带你的文件名主干，可继续编辑成有意义的描述',
        '样式表不会漏进产物：那一步只取文档 `body`，head 里的 CSS 不参与',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'One self-contained image tag: the base64 lives in the `.md`, so the note travels without an attachments folder',
        'The bytes are your file’s bytes: no re-encoding on this chain, so no second-generation loss',
        '`alt` and `title` carry your file’s basename, ready for you to edit into something meaningful',
        'No stylesheet leaks: the serialisation reads the document body only, leaving the head’s CSS out',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '不做 OCR：图里印着的文字不会变成 Markdown 文字，这条路连像素都不读',
        '体积只增不减：base64 每三字节四字符，整段负载还挤在同一行里——这是内联换来的代价',
        '一行一文件：只包一张图，多张请分别转换，或自己写成标准外链图片语法',
        '不会替你写 `alt` 文案：产物里的描述来自文件名，语义得由你补',
        '想要「文字在仓库里、图在目录里」那种可 diff 的形状，这条路相反——它把图搬进了文本',
        '`data:` 图片能不能显示由收件端决定：网页端邮件客户端与一些托管站会剥掉它，那种场合请用外链图片',
      ],
      en: [
        'No OCR: text printed in the picture never becomes Markdown text, because this route never reads pixels',
        'The file only grows: base64 is four characters per three bytes and the whole payload sits on that one line — the price of inlining',
        'One picture per file: convert separately, or write a normal external image reference for several',
        'It will not write your `alt` copy: the description comes from the file name and the meaning is yours to add',
        'If you want words versioned in the repository and pictures in a folder — the diffable shape — this route does the opposite: it moves the image into the text',
        'Whether a `data:` picture displays is up to whatever receives it: webmail clients and some hosting sites strip it, so use an external reference in those cases',
      ],
    },
    notes: {
      zh: [
        '只想把图放进网页：JPG→HTML 就是这条的第一步，产物是 HTML 而不是 `.md`',
        '要文字版的图片内容：这需要 OCR，本扩展离线且不带模型，请自行用识别工具再把文字贴进 Markdown',
        '要 Word 里的图片：JPG→Word 第一步同为 `jpg>html`，那条 data URI 在进 Word 时换成包里的图片部件，`.docx` 里不留 data URI',
      ],
      en: [
        'To put the picture in a web page: JPG to HTML is this route’s first step, and the artifact is HTML rather than `.md`',
        'For a text version of what the picture says: that needs OCR, which this offline extension does not ship — run a recognition tool yourself and paste its words into Markdown',
        'For a picture inside a Word file: JPG to Word shares this first step, and that data URI becomes an image part inside the package — none is left in the `.docx`',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么我的 `.md` 突然变这么大？',
          en: 'Why did my .md suddenly get so big?',
        },
        a: {
          zh: '因为图片是内联的：base64 每三字节省四字符（约 4/3），整张图的字节都写进了文本文件。想要小一点的写法是外链——把图放在目录里、在 Markdown 里写 `![说明](图片.jpg)`；这条路只做内联，因为它保证拷走单个 `.md` 也还能显示。',
          en: 'Because the picture is inlined: base64 turns every three bytes into four characters (about 4/3), so the whole image sits inside a text file. The smaller alternative is an external reference — keep the picture in a folder and write `![caption](image.jpg)`; this route only inlines, which is what makes a single `.md` enough to still render.',
        },
      },
      {
        q: {
          zh: '它能把我拍的文档照片转成可编辑文字吗？',
          en: 'Can it turn a photo of my document into editable text?',
        },
        a: {
          zh: '不能，这一点页面上每条都写明：这条链产出的是图片语法那一行，不读像素，也不上传去问别的引擎——本扩展不携带 OCR 模型或语言包，所以这件事它刻意不做。要文字得另找识别工具：在本地跑的那种与这里无关，要把图传上去的那种就不再是「文件不出本机」。',
          en: 'No — every page in this family says so plainly: the route produces an image tag, never reads pixels, and uploads nothing to some other engine; the extension ships no OCR model or language packs, so it deliberately does not do this. Text needs a separate recognition tool: one running locally has nothing to do with this route, and one that receives your picture ends “the file never leaves this machine”.',
        },
      },
      {
        q: {
          zh: '产物长什么样，能给个例子吗？',
          en: 'What does the artifact look like — an example?',
        },
        a: {
          zh: '一行：`![文件名主干](data:…;base64,一长串 "文件名主干")`。`alt` 与 `title` 都来自你的文件名（去掉扩展名；没有可用名字时是 `converted`），中间是那台文件完整的 base64 负载。实测产物就这一行——上一步的 `body` 里只有那张 `<img>`，所以没有别的正文被序列化下来。',
          en: 'One line: `![basename](data:…;base64,a-long-run "basename")`. `alt` and `title` both come from your file name (extension dropped; `converted` when there is no usable name), and between the parentheses is the file’s full base64 payload. Measured, that single line is the whole artifact — the previous step’s body holds nothing but that `<img>`, so there is no other prose left to serialise.',
        },
      },
    ],
  },
  {
    slug: 'png-to-docx',
    from: 'png',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'PNG 转 Word——离线、字节原样进包、不上传',
      en: 'PNG to Word offline — the bytes ride inside',
    },
    desc: {
      zh: '图片作为包内媒体部件进 .docx，画它不需要任何一次取数；不重编码，透明与像素原样保留。全程离线，文件不出本机。',
      en: 'The picture travels as a media part inside the .docx, so nothing has to be fetched to draw it. No re-encode: alpha and pixels stay as they were.',
    },
    lede: {
      zh: '两步：`png>html` 先把文件的**原始字节**读成 data URI 放进一张 `<img>`，`html>docx` 再把这份文档交给打包器。关键在第二步的形态——它**不是**把 HTML 逐段翻译成 Word 段落，而是把文档体作为一个 altChunk 塞进包里，所以 Word 打开时按那份 HTML 重新排版；而被搬动的图片更妙：打包器会把 `<img>` 上那条 `data:` **从标记里提出来，写成包里一个独立的 base64 媒体部件**，并把引用重写到那个部件（这条是被 e2e 用夹具专属载荷钉住的：图在包内可解析，渲染它不需要任何一次取数）。于是两件事同时成立——`.docx` 里没有 data URI 残留，而**像素与你的文件逐字节相同**（这条链全程不解码、不上画布，透明通道照旧）。第二件事关乎隐私：`html>docx` 在写出前跑一遍 `stripRemoteResources`，因为这份标记**由 Word 在你这台机器上渲染**，一条远程 `<img>` 会变成别的程序替发出的请求，既看不见也拦不住；内层那份文档 CSS 也随包走，它的版心今天实测约 800 px，所以图的显示宽度由它和 Word 的页面一起决定，而不是由本扩展决定。产出名 `converted.docx`，打包失败明确报 `errors.docxGen` 而不是交出一个半成品。这份 .docx 再交给本扩展的 Word→HTML 也能取回内层标记（那条路有 altChunk 恢复），往返不丢图。',
      en: 'Two steps: `png>html` reads the file’s **raw bytes** into a data URI inside one `<img>`, and `html>docx` hands the document to the packer. The second step is the interesting one — it does not translate HTML into Word paragraphs; it carries the body in as an altChunk, so Word re-lays-it-out when the file opens. And the picture gets lifted further: the packer takes that `data:` off the `<img>` and writes it as its own base64 media part inside the package, rewriting the reference to point at the part (an end-to-end test pins this with a fixture-unique payload: the image resolves from inside the package, and drawing it costs no fetch). Two things follow — no data URI is left in the `.docx`, and the **pixels are byte-identical to your file**, since nothing on this chain decodes, resamples or recompresses, alpha included. The other consequence is privacy: `html>docx` strips remote references on the way out precisely because Word — not this extension — renders that markup on your machine, where one remote `<img>` would become a request issued by another application, invisible to every guard here. The inner document CSS goes in too, and its measure was measured today at about 800 px, so the picture’s displayed width is decided by that CSS and by Word’s page, not by this extension. The output is `converted.docx`; a packing failure reports `errors.docxGen` rather than handing back a half-written file. Feeding that `.docx` back through Word to HTML recovers the inner markup (that route has altChunk recovery), so the round trip keeps the picture.',
    },
    keeps: {
      zh: [
        '像素与透明通道逐字节不变：这条链不解码、不上画布、不再压一次',
        '图片是包里的媒体部件，不是 data URI：Word 从包内解析，渲染它不需要联网',
        '远程引用在写出前剥掉——那份标记由 Word 在你机器上渲染，不能替它决定要不要发请求',
        '产物仍是 .docx 容器，内层标记能被本扩展的 Word→HTML 取回；其它程序怎么读这份 altChunk，由那一侧决定',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'Byte-identical pixels and alpha: no decode, no canvas, no second compression on this chain',
        'The picture is a media part in the package, not a data URI: the reference reads from inside the file, so drawing it takes no request',
        'Remote references are stripped before writing, because Word renders that markup on your machine — a request is not this extension’s call to make',
        'Still a .docx container whose inner markup this extension’s Word to HTML route can recover; how other programs read that altChunk is up to them',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '文档体是 altChunk（内嵌的那份 HTML），不是 Word 原生段落：逐字排版与分页由 Word 打开时决定',
        '不产生可编辑的文字层：图就是图，Word 里选不中它里面的字，也没有题注、图文式样式可用',
        '显示尺寸由内层 CSS 与 Word 页面共同决定，本扩展不给缩放参数；要精确控制尺寸请在 Word 里改',
        '想要「一页一图」的 PDF 而不是文档，请走 PNG→PDF；想要能再编辑版式，图进 Word 也仍然只是图',
        '打包失败会报 `errors.docxGen` 并点名该文件，不会交出一个半成品',
      ],
      en: [
        'The body is an altChunk — that inner HTML — not native Word paragraphs, so Word decides typesetting and paging when it opens',
        'No editable text layer: it stays a picture, its words cannot be selected, and there are no captions or picture styles to apply',
        'Displayed size follows the inner CSS and Word’s page; this route exposes no scaling option — resize it in Word',
        'For one image per page take PNG to PDF; for a layout you can keep editing, a picture inside Word is still just a picture',
        'A packing failure reports `errors.docxGen` for that file rather than shipping a half-written file',
      ],
    },
    notes: {
      zh: [
        '只想放进网页：PNG→HTML 是这条的第一步，产物是 HTML 而不是 .docx',
        '要每页一张图的文档：PNG→PDF，一图一页、最多 200 页',
        '要文字版的内容：这需要 OCR，本扩展离线且不带模型，请自行用识别工具',
      ],
      en: [
        'To put it in a web page: PNG to HTML is this route’s first step, and the artifact is HTML, not a .docx',
        'For one image per page: PNG to PDF, a page per picture with a 200-page ceiling',
        'For the words inside the picture: that needs OCR, which this offline extension does not ship',
      ],
    },
    faq: [
      {
        q: {
          zh: '这样生成的 .docx，图片会不会变成「链接到外部文件」？',
          en: 'Does the picture end up linked to an external file?',
        },
        a: {
          zh: '不会。打包器把那条 data URI 提成包里独立的媒体部件并重写引用，字节就在包里，换台机器、换个目录，引用读的都是包里那一份；这是被端到端测试用夹具专属载荷钉住的一条。',
          en: 'No. The packer lifts that data URI out of the markup into its own media part and rewrites the reference, so the bytes live inside the package and another machine or folder still reads them from there — pinned by an end-to-end test using a fixture-unique payload.',
        },
      },
      {
        q: {
          zh: '如果 Word 打开它时提示在转换，是没生成好吗？',
          en: 'What if Word says it is converting the file when it opens?',
        },
        a: {
          zh: '文档体是一段作为 altChunk 附在包里的 HTML，把它渲染成文档内容这一步发生在阅读器那一侧。如果它给了你一句转换提示，那正是它在做这件事，并不代表文件没生成好；本扩展无法预见它会说什么。排版同样由它决定——好处是带来它自己的分页与页面设置，代价是不存在「Word 原生段落」可供逐字改样式。',
          en: 'The body is an HTML fragment attached to the package as an altChunk, and rendering it into document content happens on the reader’s side. If it shows a converting notice, that is it doing exactly this — not a sign the file came out wrong, and this extension cannot predict what it will say. Layout is likewise the reader’s: the upside is its own paging and page setup, the cost is that there are no native paragraphs to restyle word by word.',
        },
      },
      {
        q: {
          zh: '会被重编码或降分辨率吗？',
          en: 'Will it be re-encoded or downscaled?',
        },
        a: {
          zh: '不会。这条链只做搬运：`png>html` 读原始字节，打包那一步把同一批字节写成媒体部件，中间没有 canvas、没有再压一次。要真的降尺寸或换格式，请走图片转图片那几页，那里才有尺寸与质量的开关。',
          en: 'Neither. This chain only carries: `png>html` reads the raw bytes and the packer writes those same bytes as a media part — no canvas, no second compression. To actually shrink or reformat, take an image-to-image page, where the size and quality controls live.',
        },
      },
    ],
  },
  {
    slug: 'jpg-to-docx',
    from: 'jpg',
    to: 'docx',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'JPG 转 Word——离线、字节原样进包、不做 OCR',
      en: 'JPG to Word offline — bytes in, no OCR',
    },
    desc: {
      zh: '照片作为包内媒体部件进 .docx，画它不需要任何一次取数；像素原样、不重编码，但也不会识别图里的文字。全程离线。',
      en: 'The photo rides into a .docx as a media part, so nothing has to be fetched to draw it. Pixels are untouched, but nothing is read out of the picture.',
    },
    lede: {
      zh: '和 PNG→Word 是同一条两步链（`jpg>html` + `html>docx`），差别只在源是 JPG：没有透明通道可言，而**图里印着什么这条链一概不知道**。第二步的形态是关键——文档体不是一个一个段落翻译过去的，而是作为 altChunk 附在包里，由 Word 打开时渲染；图片则被打包器从 `<img>` 的 `data:` 里提出来，写成包里一个独立的 base64 媒体部件并重写引用（端到端测试用夹具专属载荷钉住了这条：图在包内可解，渲染它不需要取数）。所以 `.docx` 里没有 data URI 残留，而**像素与你的文件逐字节相同**——中间没有画布、没有再压一次，原本那张照片的压缩代际不会再加一代。`html>docx` 在写出前剥掉一切远程引用，理由是那份标记由 Word 在你机器上渲染，一条远程 `<img>` 就成了别的程序替你发出的请求；内层文档 CSS 也随之进包，版心今天实测约 800 px。这条最容易被误会的是「照片里的字能不能变文字」：**不能**，那需要 OCR，本扩展不带模型与语言包、也不上传任何东西；要文字得另找识别工具，再把结果贴进文档。产出名 `converted.docx`，失败报 `errors.docxGen`。',
      en: 'This is the same two-step chain as PNG to Word (`jpg>html` + `html>docx`); the source being a JPEG is the only difference — there is no alpha to speak of, and **whatever is printed in the picture stays unknown to the chain**. The second step decides the shape: the body is not translated paragraph by paragraph but attached to the package as an altChunk that Word renders when the file opens, while the picture is lifted off the `<img>`’s `data:` and written as its own base64 media part with the reference rewritten (an end-to-end test pins that with a fixture-unique payload: the image resolves inside the package and drawing it needs no fetch). So no data URI survives in the `.docx`, and the **pixels are byte-identical to your file** — no canvas, no re-compression, so the photograph does not gain another generation of loss. `html>docx` strips every remote reference first, because Word renders that markup on your machine and a remote `<img>` would become a request issued by another application on your behalf; the inner document CSS goes in with it, its measure measured today at about 800 px. What this page is most often misread as offering: **can the words in the photo become text?** No — that needs OCR, and this extension ships no models or language packs and uploads nothing anywhere; bring your own recognition tool and paste its words in. The output is `converted.docx`, and a failure reports `errors.docxGen`.',
    },
    keeps: {
      zh: [
        '像素逐字节不变：不解码、不上画布、不再压一次，照片不会再加一代损失',
        '图片是包里的媒体部件，不是 data URI：Word 从包内解析，渲染它不需要联网',
        '远程引用在写出前剥掉——标记由 Word 在你机器上渲染，请求不该由这条链替你决定',
        '文件名进 `alt` 与 `title`（去扩展名、属性转义），产物侧仍带着这个名字',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'Byte-identical pixels: no decode, no canvas, no second compression, so the photo gains no extra generation of loss',
        'The picture is a media part in the package, not a data URI: the reference reads from inside the file, so drawing it takes no request',
        'Remote references are stripped before writing, because Word renders that markup on your machine — the request is not this chain’s to make',
        'Your file name goes into `alt` and `title` (extension dropped, escaped for attribute position), so the artifact still carries it',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '不做 OCR：图里印着的文字不会变成 Word 里的字，这条链连像素都不读',
        '文档体是 altChunk（内嵌 HTML），不是 Word 原生段落：排版与分页由 Word 打开时决定',
        '不产生题注、图文样式或可搜索文字层；要那些请在 Word 里补——本扩展没有任何路线能从图里读出文字',
        '显示尺寸由内层 CSS 与 Word 页面共同决定，本扩展不给缩放参数',
        '想要一页一图的 PDF 请走 JPG→PDF；想要真换格式（WebP / PNG）请走图片转图片那几页',
      ],
      en: [
        'No OCR: text printed in the picture never becomes words in the document, because this chain never reads pixels',
        'The body is an altChunk — that inner HTML — not native Word paragraphs, so Word decides typesetting and paging when it opens',
        'No captions, picture styles or searchable text layer; add those in Word — no route here can read words out of a picture',
        'Displayed size follows the inner CSS and Word’s page; this route exposes no scaling option',
        'For one image per page take JPG to PDF; to actually change format (WebP, PNG) take the image-to-image pages',
      ],
    },
    notes: {
      zh: [
        '只想放进网页：JPG→HTML 是这条的第一步，产物是 HTML 而不是 .docx',
        '想把图塞进 Markdown 笔记：JPG→Markdown 与这条共享第一步',
        '要文字版的内容：这需要 OCR，本扩展离线且不带模型，请自行用识别工具',
      ],
      en: [
        'To put it in a web page: JPG to HTML is this route’s first step, and the artifact is HTML, not a .docx',
        'To drop the picture into a Markdown note: JPG to Markdown shares this route’s first step',
        'For the words inside the picture: that needs OCR, which this offline extension does not ship',
      ],
    },
    faq: [
      {
        q: {
          zh: '生成的 .docx 里，图片是内嵌还是外链？',
          en: 'Is the picture embedded or linked in the .docx?',
        },
        a: {
          zh: '内嵌，而且不是「以 data URI 内嵌」那种：打包器把那条 data URI 提成包里独立的媒体部件，引用指向那个部件。所以文件拷到别的机器、别的目录，引用读的都是包里那一份，显示它不需要联网。',
          en: 'Embedded — and not as a data URI: the packer lifts it into its own media part and points the reference there. So copying the file to another machine or folder still reads the picture from inside the package, and drawing it needs no network.',
        },
      },
      {
        q: {
          zh: '为什么不直接把照片转成 Word 里的文字？',
          en: 'Why not just turn the photo into words in Word?',
        },
        a: {
          zh: '那需要识别，而这条链不读像素。本扩展是完全离线的：不带 OCR 模型与语言包，也不把图上传给任何服务，所以它交付的是照片本身放进一个 .docx，加上你的文件名。要文字请用识别工具，再把结果贴进文档。',
          en: 'That needs recognition, and this chain never reads pixels. The extension is fully offline: no OCR models, no language packs, no uploading your picture anywhere — so it delivers the photograph itself inside a .docx, plus your file name. Run a recognition tool and paste its words in if you need text.',
        },
      },
      {
        q: {
          zh: '如果打开时 Word 说在转换，会丢东西吗？',
          en: 'If Word says it is converting on open, is anything lost?',
        },
        a: {
          zh: '如果它给了转换提示，那是因为它要把附在包里的这段 HTML 渲染成文档内容；图片本身不走这一步——字节还在同一个部件里。会变的是排版：分页、页边距与图的显示尺寸由那一侧决定，所以两次打开在页面设置不同的情况下可能不一样。',
          en: 'A converting notice means it is rendering the HTML fragment attached inside the package into document content; the picture itself does not pass through that step — its bytes stay in the same part. What can move is layout: paging, margins and the displayed size are the reader’s call, so two openings can differ if the page setup changed.',
        },
      },
    ],
  },
  {
    slug: 'gif-to-html',
    from: 'gif',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'GIF 转 HTML——离线、字节原样内嵌、不丢帧',
      en: 'GIF to HTML offline — every frame stays in the file',
    },
    desc: {
      zh: '整份文件以 data URI 内嵌进一份能直接打开的网页：不解码、不重编码，所以一帧都不丢；`alt` 与 `title` 用你的文件名主干。全程离线。',
      en: 'The whole file is embedded as a data URI: no decode, no re-encode, so no frame is dropped. Opens offline, nothing uploaded.',
    },
    lede: {
      zh: '这条路和图片转 HTML 的其他几位共用同一个转换器，而且刻意做得很薄：`gif>html` 把文件的**原始字节**用 `FileReader.readAsDataURL` 编成 data URI 写进一个 `<img src>`，再包进一份自带样式表的 HTML——**中间没有任何解码、上画布或重编码**。对 GIF 来说这一点正好是要害：动图的全部帧都还在那串字节里，**这一路不丢帧**，因为要丢帧得先读帧、而这条链连像素都不看。对照之下 GIF→PNG / JPG / WebP 那几路确实丢：它们取首帧重编码，并且会动用 `hasMultipleFrames` 在结果上写明丢了几帧——那才是需要披露丢帧的地方。要说清的边界是**播放由谁决定**：字节完整不等于一定动起来，是否播放、循环几遍，是打开这份 HTML 的那一侧的事，本扩展不替它保证。其余与位图转网页同形：`alt` 与 `title` 取**文件名主干**（去扩展名、无名时 `converted`）并按属性位置转义；内层 CSS 让图居中、`max-width: 100%`，版心实测约 800 px，所以宽图显示会收、文件里的一个像素都不变；体积是每三个字节写成四个字符再加约 2.6 KB 外壳（界面上 2 MB 的 GIF 约产出 2.7 MB 的 HTML），这一路不是压缩。`data:image/gif` 在剥远程引用的白名单之内，所以这份 HTML 再往下走一步（转 Markdown、转 Word）引用也不会被剥掉——它不外发任何东西，扩展本身也只有 storage 权限。',
      en: 'This route shares one converter with the other pictures-to-HTML pages, and it is deliberately thin: `gif>html` takes the file’s **raw bytes**, base64-encodes them through `FileReader.readAsDataURL` into a data URI inside an `<img src>`, and wraps that in a document with the bundled stylesheet — **no decode, no canvas, no re-encode anywhere**. For a GIF that is the whole point: every frame is still inside those bytes, so **this route drops none**, because dropping frames would mean reading them and this chain never looks at pixels. The contrast is real: GIF to PNG, JPG or WebP does take the first frame and re-encodes it, and those routes use `hasMultipleFrames` to say how many frames went missing — that is where the frame-loss disclosure lives. The boundary to state plainly is **who decides playback**: intact bytes do not guarantee motion, since whether it animates and how many times it loops belongs to whatever opens the file, and this extension promises nothing on their behalf. Everything else matches the other picture-to-HTML pages: `alt` and `title` carry the **basename** (extension dropped, `converted` when there is no usable name) escaped for attribute position; the inner CSS centres the image and caps it at `max-width: 100%` within a measure measured at about 800 px, so a wide picture scales on screen while the file stays untouched; the size is four characters per three bytes plus a wrapper of about 2.6 KB, so the 2 MB GIF the interface shows comes out as roughly 2.7 MB of HTML — this is not compression. And because `data:image/gif` is inside the allow-list that keeps references from reaching the network, taking one more step (to Markdown, to Word) does not strip the picture either. Nothing is ever sent out; the extension holds only the storage permission.',
    },
    keeps: {
      zh: [
        '一帧都不丢：不解码、不上画布、不再压一次，整份动图原样进 `data:` 负载',
        '`alt` 与 `title` 取文件名的主干（去扩展名），并按属性位置转义——名字不会变成标记',
        '自包含：图就在文件里，打开这份 HTML 不取任何远程资源',
        '`data:image/gif` 在引用白名单内，再往下一步转 Markdown / Word 也不会被剥掉',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'Not one frame lost: no decode, no canvas, no re-compression — the whole animation goes into the `data:` payload',
        '`alt` and `title` carry the file’s basename with the extension dropped, escaped for attribute position so a name cannot become markup',
        'Self-contained: the picture is in the file, and opening it fetches no remote resource',
        '`data:image/gif` is inside the reference allow-list, so a further step to Markdown or Word will not strip it either',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '不保证会动：字节完整是一回事，播放与循环次数由打开这份 HTML 的那一侧决定，本扩展不替它承诺',
        '不读内容也不做 OCR：产物里唯一的字符串来自你的文件名，图里印着什么这条链一概不知道',
        '体积只增不减：每三字节四字符再加约 2.6 KB 外壳（2 MB 的 GIF 约产出 2.7 MB HTML），不适合当压缩',
        '不改尺寸、不选帧、不裁切：想要这些请走图片转图片那几页，那里才有尺寸与质量开关',
        '只包一张图：多张图请一个文件一次，或自己先拼成一张（本扩展不提供拼图功能）',
      ],
      en: [
        'Motion is not guaranteed: intact bytes are one thing, playback and loop counts belong to whatever opens the page, and this extension makes no promise for it',
        'No OCR and no invented description: the only string in the output comes from your file name',
        'The file only grows: four characters per three bytes plus about 2.6 KB of wrapper, so a 2 MB GIF becomes roughly 2.7 MB of HTML — this is not compression',
        'No resizing, no frame picking, no cropping: take the image-to-image pages, where the size and quality controls live',
        'One picture per file: convert several one at a time, or tile them yourself first',
      ],
    },
    notes: {
      zh: [
        '要 Markdown 里的图：GIF→Markdown 就是这条再加一步序列化',
        '要 Word 文档里的图：GIF→Word 再走 `html>docx`，那条 data URI 会换成包里的图片部件',
        '要真的换格式或降尺寸：那需要重编码，也就必然只剩首帧，请走图片转图片那几页',
      ],
      en: [
        'For a picture in Markdown: GIF to Markdown is this step plus a serialisation',
        'For a picture in a Word file: GIF to Word adds `html>docx`, which turns that data URI into an image part inside the package',
        'To really change format or shrink it: that needs re-encoding, which means the first frame only, so take the image-to-image pages',
      ],
    },
    faq: [
      {
        q: {
          zh: 'GIF 转成 HTML 之后还会动吗？',
          en: 'Will my GIF still animate once it is HTML?',
        },
        a: {
          zh: '这条能保证的是「帧都还在」：文件字节原样内嵌，没有取首帧、没有重编码，所以动图的数据一个字节都没少。至于播不播、循环几遍，是打开这份 HTML 的那一侧（浏览器或宿主页面）决定的，本页不替它承诺——这也是为什么把 GIF 交给只收 PNG / JPG 的地方才是真正会丢帧的那一步。',
          en: 'What this route guarantees is that all frames survive: the file’s bytes go in verbatim, with no first-frame grab and no re-encoding, so nothing is subtracted from the animation. Whether it plays and how often it loops is decided by whatever opens the page — a browser or a host document — and this page makes no promise for them. That is also why handing a GIF to something that only accepts PNG or JPEG is the step that actually loses frames.',
        },
      },
      {
        q: {
          zh: '为什么产物比原文件大？',
          en: 'Why is the output bigger than my file?',
        },
        a: {
          zh: 'base64 每三个字节要写成四个字符，这是编码形态的固定开销；另加约 2.6 KB 的文档外壳（`<style>` 里那份 CSS 与标签，它随文件名长度略有增减）。想变小请走图片转图片那几路做真实重编码——只是那条路必然取首帧。',
          en: 'base64 writes every three bytes as four characters — the fixed cost of the encoding — plus a document wrapper of about 2.6 KB (the CSS in `<style>` and the markup, which moves a little with the length of your file name). To go smaller, take an image-to-image route and re-encode for real — accepting that it keeps the first frame only.',
        },
      },
      {
        q: {
          zh: '这跟我把 GIF 用 `<img>` 标签引到网页里有什么区别？',
          en: 'How is this different from just pointing an `<img>` at my GIF?',
        },
        a: {
          zh: '引用方式不同：外链要图另存在某个地方，别人只拿这份 HTML 就看不到；这里是内嵌，图随文件走，拷走单个 HTML 就能显示。它也不会在你双击打开时发起任何请求——`data:image/gif` 属于被允许留下的引用类型，后续再转 Markdown 或 Word 也不会被剥掉。',
          en: 'The reference is different: an external link needs the picture stored somewhere, and anyone who takes only the HTML sees nothing; here the picture travels inside the file, so a single copied page still shows it. It also issues no request when you double-click it — `data:image/gif` is one of the reference types allowed to survive, so a later step to Markdown or Word keeps it too.',
        },
      },
    ],
  },
  {
    slug: 'gif-to-md',
    from: 'gif',
    to: 'md',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'GIF 转 Markdown——离线、整段内联、不丢帧',
      en: 'GIF to Markdown offline — one inline tag, all frames',
    },
    desc: {
      zh: '一行自包含的图片语法，负载是整份动图的 base64：不取首帧、不重编码；能否播放由阅读器决定。全程离线，不上传。',
      en: 'One self-contained image tag whose base64 is the whole animation. No first-frame grab, no re-encode; playback is up to the reader.',
    },
    lede: {
      zh: '两步：`gif>html` 把文件的**原始字节**编成 data URI 放进一个 `<img>`（`alt` 与 `title` 都是文件名主干，去扩展名、无名时 `converted`，并做属性转义），`html>md` 再用 Turndown 把这份文档序列化。实测产物是**一行图片语法**：那张 `<img>` 是页面 `body` 里唯一的元素，样式表在 `<head>`、而序列化只取 `body`，所以 CSS 不会漏进 `.md`。对 GIF 而言关键在「不丢帧」：整份动图（每一帧、每一段扩展块）都在那串 base64 里，这一路既没有取首帧也没有重编码；而 GIF→PNG / JPG / WebP 那几路确实取首帧，并在结果上写明丢了几帧。边界要说清：**帧都在，不等于一定播**——是否播放、循环几遍由打开这份 `.md` 的阅读器决定，本页不替它承诺；`data:` 图片能不能显示也同理，网页端邮件客户端与一些托管站会剥掉它，那种场合请用外链图片。体积按每三字节四字符走，动图往往本就不小，所以整段负载会挤在同一行里，这是内联换来的代价。全程只有 storage 权限，不联网。',
      en: 'Two steps: `gif>html` encodes the file’s **raw bytes** into a data URI inside one `<img>` (`alt` and `title` both carry the basename of your file, extension dropped, `converted` when there is no usable name, escaped for attribute position), and `html>md` then serialises the document with Turndown. Measured, the artifact is **one line of image syntax**: that `<img>` is the only element in the page’s body, and the stylesheet sits in `<head>` while the serialisation reads only the body, so no CSS leaks into the `.md`. For a GIF the point is that no frame is lost — every frame, every extension block, is inside that base64, since this route neither grabs the first frame nor re-encodes anything, whereas GIF to PNG, JPG or WebP does exactly that and says how many frames went missing. State the boundary clearly: **surviving frames are not a promise of playback** — whether it animates and how it loops is up to whichever reader opens the `.md`, and this page says nothing for them. The same applies to whether a `data:` picture displays at all: webmail clients and some hosting sites strip it, so use an external reference there. The size runs at four characters per three bytes, and animations are rarely small, so the whole payload sits on one line — that is the cost of inlining. All of it on the storage permission, with no network at all.',
    },
    keeps: {
      zh: [
        '一帧都不丢：整份动图的字节都在 base64 负载里，不取首帧、不重编码',
        '自包含的一行图片语法：拷走单个 `.md` 就带着图，不必带附件目录',
        '`alt` 与 `title` 带你的文件名主干，可继续编辑成有意义的描述',
        '样式表不会漏进产物：那一步只取文档 `body`，head 里的 CSS 不参与',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'Not one frame lost: the whole animation lives in the base64 payload — no first-frame grab, no re-encode',
        'One self-contained image tag: copying a single `.md` carries the picture with it, no attachments folder needed',
        '`alt` and `title` carry your file’s basename, ready for you to edit into something meaningful',
        'No stylesheet leaks: the serialisation reads the document body only, leaving the head’s CSS out',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '不保证会动：帧都还在，但播放与循环由打开这份 `.md` 的阅读器决定',
        '`data:` 图片能不能显示由收件端决定：网页端邮件客户端与一些托管站会剥掉它，那种场合请用外链图片',
        '不做 OCR：图里印着的文字不会变成 Markdown 文字，这条路连像素都不读',
        '体积只增不减，而且整段 base64 挤在同一行——这是内联的代价，想要可 diff 的形状请改外链',
        '一行一文件：只包一张图，多张请分别转换，或自己写成标准外链图片语法',
      ],
      en: [
        'Motion is not promised: the frames all survive, but playback and looping belong to whichever reader opens the `.md`',
        'Whether a `data:` picture displays is up to whatever receives it: webmail clients and some hosting sites strip it, so use an external reference there',
        'No OCR: text printed in the picture never becomes Markdown text, because this route never reads pixels',
        'The file only grows and the whole payload sits on one line — the cost of inlining, and the reason an external reference is the diffable shape',
        'One picture per file: convert separately, or write a normal external image reference for several',
      ],
    },
    notes: {
      zh: [
        '只想放进网页：GIF→HTML 就是这条的第一步，产物是 HTML 而不是 `.md`',
        '要进 Word：GIF→Word 与这条共享第一步，那条 data URI 在进 Word 时换成包里的图片部件',
        '要真的换格式：GIF→PNG / JPG / WebP 会重编码，也就只剩首帧（结果会写明丢了几帧）',
      ],
      en: [
        'To put the picture in a web page: GIF to HTML is this route’s first step, and the artifact is HTML rather than `.md`',
        'For a Word file: GIF to Word shares this first step, and that data URI becomes an image part inside the package',
        'To actually re-encode: GIF to PNG, JPG or WebP keeps the first frame only, and says how many frames were lost',
      ],
    },
    faq: [
      {
        q: {
          zh: '把 GIF 转成 Markdown 会丢掉动画吗？',
          en: 'Does converting a GIF to Markdown kill the animation?',
        },
        a: {
          zh: '不会丢数据：这一路把整份文件的字节原样编进 base64，没有取首帧也没有重编码，所以每一帧都在。真正会丢动画的是「换成 PNG / JPG」那类需要重编码的路线。至于读这份 Markdown 的那一侧播不播，是它的显示决定，本扩展不替它保证。',
          en: 'No data is lost: the route encodes the file’s bytes verbatim into base64, with no first-frame grab and no re-encoding, so every frame is present. What actually kills the animation is a route that must re-encode — PNG or JPEG. Whether the reader animates it is that reader’s display decision, which this extension does not make.',
        },
      },
      {
        q: {
          zh: '为什么我的 `.md` 里有一行长得离谱？',
          en: 'Why is one line of my .md absurdly long?',
        },
        a: {
          zh: '因为整张动图都内联在那一行里：base64 每三个字节写成四个字符，而序列化只产出一行图片语法。想要「文字在文件里、图在目录里」那种可 diff、可读的形状，请自己写外链图片语法（`![说明](动画.gif)`）；这一路选择内联，是为了拷走单个 `.md` 也还能显示。',
          en: 'Because the whole animation is inlined on that line: base64 is four characters per three bytes, and the serialisation produces one image tag. For the diffable, readable shape — words in the file, pictures in a folder — write an external reference yourself (`![caption](animation.gif)`); this route inlines so that a single copied `.md` still shows the picture.',
        },
      },
      {
        q: {
          zh: '产物长什么样，能给个例子吗？',
          en: 'What does the artifact look like — an example?',
        },
        a: {
          zh: '一行：`![文件名主干](data:image/gif;base64,一长串 "文件名主干")`。`alt` 与 `title` 都来自你的文件名（去掉扩展名；没有可用名字时是 `converted`），中间是整份动图的 base64 负载。实测就这一行——上一步的 `body` 里只有那张 `<img>`，没有别的正文会被序列化下来。',
          en: 'One line: `![basename](data:image/gif;base64,a-long-run "basename")`. `alt` and `title` both come from your file name (extension dropped; `converted` when there is no usable name), and between the parentheses is the whole animation’s base64 payload. Measured, that single line is the artifact — the previous step’s body holds nothing but that `<img>`, so there is no other prose to serialise.',
        },
      },
    ],
  },
  {
    slug: 'bmp-to-html',
    from: 'bmp',
    to: 'html',
    shot: 'batch-results',
    published: '2026-10-21',
    title: {
      zh: 'BMP 转 HTML——离线、字节原样内嵌、不解码',
      en: 'BMP to HTML offline — raw bytes, no decode',
    },
    desc: {
      zh: '整份 .bmp 以 data URI 原样内嵌进一份能直接打开的网页：不解码、不重编码、不降尺寸；`alt` 与 `title` 用你的文件名主干。全程离线。',
      en: 'The whole .bmp is embedded verbatim as a data URI in a page you can open: no decode, no re-encode, no downscale. Fully offline.',
    },
    lede: {
      zh: '这条路和 BMP 的另一条出口**形态相反**，这一点值得先说清楚。`bmp>html` 是搬运：`FileReader.readAsDataURL` 把文件的原始字节编成 data URI 写进一个 `<img src>`，再包进自带样式表的 HTML——中间**没有解码、没有上画布、没有重编码**。而 `bmp>pdf` 是处理：它把同一份位图解码后铺在**白底画布**上重编码成 PNG 流（这是刻意的，jsPDF 自带的 BMP 解码分支会强走 quality-100 JPEG、无视白底、不给质量旋钮，写出的流还比源文件大）。所以「同一张 BMP 会不会被动过像素」取决于你走哪条：HTML 这条一个字节都不动，PDF 那条必然重走一遍画布。对 BMP 这种通常不带压缩的容器，搬运的代价要如实说：base64 是每三个字节写成四个字符，再加约 2.6 KB 的文档外壳（它随文件名长度增减），而源文件本身往往已经比同画面的 PNG 大一个数量级——所以**这一路绝不是用来变小的**，它是用来把图交给只收网页的地方。反过来，如果你要的是体积、或者要让背景落在白底上，PDF 那条才有压缩存放。其余与位图转网页同形：`alt` 与 `title` 取**文件名主干**（去扩展名、无名时 `converted`）并按属性位置转义；内层 CSS 居中、`max-width: 100%`，版心实测约 800 px，宽图显示会收而文件不动；`data:image/bmp` 在剥远程引用的白名单之内，所以打开这份 HTML 不发任何请求，再往下一步转 Markdown 也不会被剥掉。BMP 在这套界面里**只能作为输入**（浏览器不提供 BMP 编码器），所以没有「从别的格式转成 BMP」这条路。',
      en: 'This route is shaped **opposite** to BMP’s other exit, and that is worth saying first. `bmp>html` is carrying: `FileReader.readAsDataURL` turns the file’s raw bytes into a data URI inside an `<img src>`, wrapped in a document with the bundled stylesheet — **no decode, no canvas, no re-encode anywhere**. `bmp>pdf` is processing: it decodes the same bitmap, paints it onto a **white-filled canvas** and re-encodes it as a PNG stream — deliberately, because jsPDF’s own BMP branch forces a quality-100 JPEG, ignores the white fill, offers no quality knob, and writes a stream larger than the file it came from. So whether a BMP’s pixels are touched depends on which page you take: this one changes not a byte, that one necessarily redraws the canvas. For a container that usually ships uncompressed, state the cost honestly: base64 writes four characters per three bytes, plus a wrapper of about 2.6 KB that grows with the length of your file name, and the source is often an order of magnitude bigger than a PNG of the same picture — **this route is not a way to get smaller**, it is a way to hand the picture to something that only accepts a web page. If what you want is size, or a white ground behind the pixels, the PDF page is the one that stores compressed. Everything else matches the other pictures-to-HTML pages: `alt` and `title` carry the **basename** (extension dropped, `converted` when there is no usable name) escaped for attribute position; the inner CSS centres the image and caps it at `max-width: 100%` inside a measure measured at about 800 px, so a wide picture scales on screen while the file stays untouched; and `data:image/bmp` is inside the allow-list of references allowed to survive, so opening the page issues no request and one more step to Markdown keeps the picture too. One boundary belongs in plain sight: BMP is **input-only** in this interface — browsers cannot encode it — so there is no route that produces a .bmp.',
    },
    keeps: {
      zh: [
        '像素逐字节不变：不解码、不上画布、不再压一次（这与 BMP→PDF 必然重走画布相反）',
        '`alt` 与 `title` 取文件名的主干（去扩展名），并按属性位置转义——名字不会变成标记',
        '自包含：图就在文件里，打开这份 HTML 不取任何远程资源',
        '`data:image/bmp` 在引用白名单内，再往下一步转 Markdown 也不会被剥掉',
        '一批最多 200 个文件、单个 100 MB，与其他路线共用同一道闸门',
      ],
      en: [
        'Byte-identical pixels: no decode, no canvas, no re-compression — the opposite of BMP to PDF, which must redraw the canvas',
        '`alt` and `title` carry the file’s basename with the extension dropped, escaped for attribute position so a name cannot become markup',
        'Self-contained: the picture is in the file, and opening it fetches no remote resource',
        '`data:image/bmp` is inside the reference allow-list, so a further step to Markdown will not strip it either',
        'Up to 200 files per batch and 100 MB each — the same gate every other route shares',
      ],
    },
    limits: {
      zh: [
        '不会变小：base64 每三字节四字符再加约 2.6 KB 外壳，而 BMP 本身通常无压缩——要体积请走 BMP→PDF 或图片转图片那几页',
        '背景不由这条路决定：它不铺白底也不合成，画布上的事是 BMP→PDF 那条做的',
        '不降尺寸、不裁切、不改格式：想要这些请走图片转图片（那边才有最长边与质量开关）',
        '做不出 .bmp：浏览器不提供 BMP 编码器，BMP 在这套界面里只是输入格式',
        '不读内容也不做 OCR：产物里唯一的字符串来自你的文件名',
      ],
      en: [
        'This does not shrink anything: four characters per three bytes plus about 2.6 KB of wrapper, over a file that is usually uncompressed — for size take BMP to PDF or an image-to-image page',
        'No ground colour here: this route neither fills nor composites white — that is the BMP to PDF canvas',
        'No downscale, no crop, no format change: the image-to-image pages are where the longest edge and quality knobs live',
        'A .bmp cannot be produced: browsers do not encode BMP, so BMP is an input format only in this interface',
        'No OCR and no invented description: the only string in the output comes from your file name',
      ],
    },
    notes: {
      zh: [
        '要变小或要白底：BMP→PDF，解码后铺白底、按压缩流写入，每张一页',
        '要 Markdown 里的图：BMP→Markdown 就是这条再加一步序列化',
        '要真正换格式（PNG / JPG / WebP）：那需要重编码，请走图片转图片那几页',
      ],
      en: [
        'For size or a white ground: BMP to PDF, which decodes, fills white and writes a compressed stream, one page per picture',
        'For a picture in Markdown: BMP to Markdown is this step plus a serialisation',
        'To actually change format (PNG, JPG, WebP): that needs re-encoding, so take the image-to-image pages',
      ],
    },
    faq: [
      {
        q: {
          zh: '为什么转出来的 HTML 比我的 BMP 还大？',
          en: 'Why is the HTML bigger than my BMP already is?',
        },
        a: {
          zh: '两层叠加：BMP 常常不做压缩，所以源文件本来就大；data URI 又是每三个字节写成四个字符，再加约 2.6 KB 外壳（随文件名长度增减）。这一路是搬运不是压缩，所以体积只会升。想要降下来，走 BMP→PDF（图像流压缩存放）或图片转图片那几页。',
          en: 'Two things stack: BMPs are often uncompressed, so the source is already large, and a data URI writes four characters per three bytes plus about 2.6 KB of wrapper (which grows with the file name). This route carries rather than compresses, so size only goes up. For a smaller artifact take BMP to PDF, which stores the image stream compressed, or an image-to-image page.',
        },
      },
      {
        q: {
          zh: 'BMP 转 HTML 会像转 PDF 那样铺白底吗？',
          en: 'Does BMP to HTML fill a white background like BMP to PDF does?',
        },
        a: {
          zh: '不会。铺白底发生在 PDF 那条的画布上（解码→铺白→重编码），这一路根本不进画布，字节原样。所以如果 BMP 带了透明通道，这一路不会替你把它合成成白色；显示成什么样由打开它的浏览器按原文件决定。',
          en: 'No. The white fill happens on the PDF route’s canvas (decode, fill, re-encode); this route never enters a canvas and leaves the bytes alone. So a BMP that carries alpha does not get composited to white here — what you see is whatever the browser makes of the original file.',
        },
      },
      {
        q: {
          zh: '那为什么不干脆都用 PDF？',
          en: 'So why not just use PDF every time?',
        },
        a: {
          zh: '因为两条路给的不是同一个东西：HTML 这条**不动像素**，适合把原图交给只收网页的地方；PDF 那条要重走画布，换来的是压缩存放与「一张一页」的文档形状。哪个更重要取决于你交付的是图片本身，还是一份文档。',
          en: 'Because they hand over different things: this route does not touch pixels, which is what you want when a picture must reach somewhere that only accepts a web page; the PDF route redraws the canvas and, in exchange, gives you compressed storage and a one-image-per-page document. Which matters more depends on whether you are delivering the picture itself or a document.',
        },
      },
    ],
  },
];
