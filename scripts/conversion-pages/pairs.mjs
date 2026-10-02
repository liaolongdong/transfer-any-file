/**
 * Content source for the long-tail conversion landing pages under `docs/convert/`.
 *
 * Why a data module instead of hand-written HTML per page: every claim on these pages is a claim about
 * a converter in `utils/converters/`, and `scripts/render-conversion-pages.mjs` checks each entry
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
 * The date the pair content below was last revised. It is the only `lastmod` the generator has for the
 * pages it writes, and it lands in `docs/sitemap.xml`; bump it together with a content change so the
 * date a crawler reads is the date the claim was actually edited.
 */
export const PAGES_UPDATED = '2026-10-02';

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
      en: 'Convert Markdown to Word (.docx) offline — in batches, without uploading',
    },
    desc: {
      zh: '在浏览器本地把 .md 转成 .docx：标题层级、列表、表格、代码块写成真实 Word 段落，不是截图。批量、可预览、零网络请求。',
      en: 'Convert .md to .docx in your own browser: headings, lists, tables and code blocks become real Word paragraphs, not a screenshot. Batch, previewable, zero network requests.',
    },
    lede: {
      zh: 'README、需求文档、技术笔记写成 Markdown，要交给的却是一个只认 Word 的人。这条链路是 Markdown → HTML → Word：先由 marked 生成语义化 HTML，再打包成 .docx。产出的文字在 Word 里可选中、可改写、可加批注——这是它和「把 Markdown 截图成 PDF」最实际的区别。全程在你自己的电脑上完成，不发请求、不排队、不上传。',
      en: 'A README, a spec, or a release note starts life as Markdown and ends up with someone who only reads Word. This route is Markdown → HTML → Word: marked produces semantic HTML, and the packer turns it into a .docx. The text stays selectable, editable and commentable in Word — the practical difference from photographing your Markdown into a PDF. Every step runs on your own machine: no request, no queue, no upload.',
    },
    keeps: {
      zh: [
        '标题层级、有序与无序列表（含嵌套）、加粗、斜体、删除线、链接、引用块，写成 Word 的段落与样式',
        '表格转成 Word 表格；代码块与行内代码保留为等宽文字',
        '以 data URI 内嵌的图片随文档一起打包',
        '输入 .md 按 UTF-8 → GB18030 → GBK 依次解码，老编辑器留下的 GBK 文件也能读',
      ],
      en: [
        'Heading levels, ordered and unordered lists (nested included), bold, italic, strikethrough, links and block quotes become Word paragraphs and styles',
        'Tables become Word tables; code blocks and inline code keep a monospace face',
        'Images embedded as data URIs travel inside the document',
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
        '文档内嵌图片会被读出并以 data URI 写进 Markdown，不依赖任何网络',
        '表格转成 Markdown 表格；单元格内容保留，合并信息不保留',
        'HTML 中间产物先经 DOMPurify 净化，文档里的可执行脚本不会带进结果',
      ],
      en: [
        'Headings, lists (nested included), emphasis, links and paragraph structure map onto Markdown syntax',
        'Embedded images are read out and written into the Markdown as data URIs, with no network involved',
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
      en: 'Convert Excel to CSV (.xlsx → .csv) offline — cell values, not display text',
    },
    desc: {
      zh: '浏览器本地把 .xlsx 转成 CSV：按单元格值序列化，日期统一格式，带 UTF-8 BOM，公式注入被转义。多 sheet 每表一份 CSV 装进 ZIP。',
      en: 'Convert .xlsx to CSV in your browser: serialised from cell values, normalised dates, a UTF-8 BOM, formula injection escaped. Multi-sheet workbooks emit one CSV per sheet inside a ZIP.',
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
      en: 'Convert CSV to Excel (.csv → .xlsx) offline — long numbers stay exactly as written',
    },
    desc: {
      zh: '浏览器本地把 .csv 转成 .xlsx：只有能精确回写的字段才当数字存，长编号与前导零原样保留；GBK/GB18030 编码自动兜底。',
      en: 'Convert .csv to .xlsx in your browser: only fields that round-trip exactly become numbers, so long IDs and leading zeros survive; GBK/GB18030 input is decoded automatically.',
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
      en: 'Convert JSON to CSV — turn an array of objects into a spreadsheet offline',
    },
    desc: {
      zh: '浏览器本地把 JSON 对象数组转成 CSV：表头取所有键的并集，嵌套值以 JSON 文本入格，公式注入被转义，带 UTF-8 BOM。',
      en: 'Convert a JSON array of objects to CSV in your browser: headers are the union of every key, nested values land as JSON text, formula injection is escaped, and the file carries a UTF-8 BOM.',
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
        '字符串以 = + - @ 开头时转义，防止一个 JSON 字段在 Excel 里被当成公式执行',
      ],
      en: [
        'Headers are the union of all keys, ordered by first appearance; a missing key becomes an empty cell rather than a shifted row',
        'null and absent fields both write empty; numbers and booleans write their value',
        'Nested objects and arrays land in the cell as JSON text, so nothing is lost and a next step in jq or a spreadsheet formula can use them',
        'A string beginning with = + - @ is escaped, so one JSON field cannot execute as a formula in Excel',
      ],
    },
    limits: {
      zh: [
        '输入必须是数组。对象、数组套对象这类结构会直接报错（errors.jsonNotArray），而不是给你一个看起来成功的空文件',
        '不做扁平化：a.b.c 不会被拆成三列，需要拆就先用 jq 或「转成 Excel」之前的加工做一次',
        '不读取网络上的 JSON：文件必须是本地的那一份',
      ],
      en: [
        'The input must be an array. A bare object or an object of objects reports an error (errors.jsonNotArray) instead of producing a file that looks like success and is empty',
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
      en: 'Convert PDF to text (.pdf → .txt) locally — the text layer, no upload',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 提取 PDF 文字层，输出纯文本或 Markdown。扫描件没有文字层，所以这条对图片型 PDF 无解——项目不含 OCR。',
      en: 'pdf.js in your browser extracts the text layer to plain text or Markdown. A scan has no text layer, so image-only PDFs are a dead end here — the extension ships no OCR.',
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
      en: 'Markdown to PDF offline, rendered onto A4 — the output is an image, not a text layer',
    },
    desc: {
      zh: 'Markdown → HTML → PDF，本地按 A4 逐页切片成图像型 PDF。好处是哪台机器打开都一样，代价是没有文字层、不可选中检索。',
      en: 'Markdown → HTML → PDF, sliced page by page onto A4 locally. You get a file that looks identical everywhere; the price is no text layer, so nothing is selectable or searchable.',
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
      en: 'Word to PDF offline — an A4 image whose layout the browser decides',
    },
    desc: {
      zh: 'Word → HTML → PDF：mammoth 读语义结构后整页栅格化，按 A4 切片。文字层没有，版式与 Word 打印不尽相同，先预览再下载。',
      en: 'Word → HTML → PDF: mammoth reads the semantic structure, the page is rasterised and sliced onto A4. There is no text layer, and the layout is not Word’s own print output — preview before you download.',
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
      en: 'Convert PNG to WebP locally — batch it, tune quality or aim at a target size',
    },
    desc: {
      zh: '浏览器里把 PNG 编成 WebP，透明通道保留，质量档与目标体积先走质量阶梯再缩像素。最多 200 张一批，结果可打 ZIP。',
      en: 'Encode PNG to WebP in the browser with alpha preserved; the target-size lever walks the quality ladder before it throws pixels away. Up to 200 images per batch, with the batch downloadable as one ZIP.',
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
      en: 'Convert SVG to PNG — sanitised first, rasterised second, scripts never run',
    },
    desc: {
      zh: '浏览器本地把 SVG 栅格化成 PNG（也可出 JPEG / WebP）。矢量按当前尺寸渲染，脚本与事件属性先行剥离，外链资源不会去取。',
      en: 'Rasterise SVG to PNG in your browser (JPEG and WebP too), rendering the vector at the size you set. Scripts and event handlers are stripped before anything is drawn, and remote resources are never fetched.',
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
      en: 'Convert JPEG (JPG) to PNG locally — a lossless container, nothing uploaded',
    },
    desc: {
      zh: '浏览器本地把 .jpg / .jpeg 解码成像素再编为 PNG：尺寸原样，可选最长边，一批最多 200 张可打成一个 ZIP。EXIF 与 GPS 不会跟着走。',
      en: 'Decode .jpg / .jpeg to pixels in your own browser and re-encode as PNG: dimensions kept, an optional longest edge, up to 200 images downloadable as one ZIP. EXIF and GPS do not travel.',
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
      en: 'Convert PNG to JPEG — transparency flattens onto white, quality and target size included',
    },
    desc: {
      zh: '浏览器本地把 PNG 编成 JPEG：透明区域铺纯白展平，质量档 40%–90%、目标体积 20 KB–2 MB，先降质量再缩像素。最多 200 张一批。',
      en: 'Encode PNG to JPEG in your browser: transparency flattens onto pure white, with a 40%–90% quality step and a 20 KB–2 MB target size — quality is spent before pixels. Up to 200 images per batch.',
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
      en: 'Convert JPEG to WebP locally — another step down on size, with quality and a target',
    },
    desc: {
      zh: '浏览器本地把 .jpg 编成 WebP：质量档 40%–90%、目标体积 20 KB–2 MB，先走质量阶梯再缩像素。最多 200 张一批，结果可打 ZIP。',
      en: 'Encode .jpg to WebP in your browser with a 40%–90% quality step and a 20 KB–2 MB target size — the quality ladder first, pixels second. Up to 200 images per batch, with the batch downloadable as one ZIP.',
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
      en: 'Convert WebP to JPEG for recipients that will not take WebP — alpha flattens to white',
    },
    desc: {
      zh: '浏览器本地把 .webp 解码重编为 JPEG：透明铺纯白，质量档与目标体积照旧，一批最多 200 张。动图 WebP 只会留下一帧。',
      en: 'Decode .webp and re-encode it as JPEG in your browser: transparency flattens onto pure white, the quality and target-size levers apply as usual, up to 200 images per batch. Animated WebP yields one frame.',
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
      en: 'Convert PNG to PDF without redrawing a pixel — the page is the picture',
    },
    desc: {
      zh: '浏览器本地把 PNG 装进单页 PDF：常规路径不重画像素，页面尺寸由图像像素换算，横竖自动。一批最多 200 个，各自一个 PDF。',
      en: 'Put a PNG into a one-page PDF locally: the normal path never re-draws the pixels, the page is sized from the image’s own pixels and orientation follows. Up to 200 files, one PDF each.',
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
        '一批最多 200 个文件、单个 100 MB 上限，各自一个 PDF，可一起打包成 ZIP',
      ],
      en: [
        'No redraw on the normal path: the PNG is written into the PDF as a lossless stream, pixel-for-pixel the file you gave it',
        'The page is sized from the image pixels at 96 dpi (px × 72 ÷ 96 points), landscape automatically when it is wider than tall',
        'The one case that gives up losslessness is a side above 8192 px, which is resampled before embedding — otherwise the browser cannot draw it',
        'A file that will not decode, or reports zero size, raises its own error instead of handing back a blank PDF',
        'Up to 200 files per batch and 100 MB each, one PDF per file, downloadable together as one ZIP',
      ],
    },
    limits: {
      zh: [
        '页面不是 A4：它就是那张图的尺寸，打印或拼册时要靠「适合页面」',
        '不做多页合并——一批 20 张得到 20 个 PDF，不是一个 20 页的 PDF',
        'PDF 里没有文字层：源图本来也只有像素，搜索与复制都无从下手',
        '目标是 PDF 时输出参数面板不出现（面板只为图片目标显示），所以这里不能设 DPI 或最长边',
      ],
      en: [
        'The page is not A4 — it is the picture’s own size, so printing and imposition rely on “fit to page”',
        'No merging: a batch of 20 images gives 20 PDFs, not one PDF of 20 pages',
        'There is no text layer, because the source had only pixels; searching and copying have nothing to work on',
        'The output panel is not shown for a PDF target (it exists for image targets), so DPI and longest edge are not adjustable here',
      ],
    },
    notes: {
      zh: [
        '结果文件名默认在源名后加日期与时间，模板可在偏好设置里改；一批多个文件时可一次打包成 ZIP',
        '需要「一张图一页 A4」的排法：先转 PDF 再在打印时选适合页面，或把图放进 HTML 走 HTML → PDF（那条按 A4 分页）',
      ],
      en: [
        'Names default to the source name plus date and time, with the pattern editable in preferences; several files can come back as one ZIP',
        'For a “one image per A4 page” layout: print the PDF with fit-to-page, or place the image in HTML and take the HTML → PDF route, which paginates on A4',
      ],
    },
    faq: [
      {
        q: { zh: '能把多张 PNG 合成一个 PDF 吗？', en: 'Can several PNGs become one PDF?' },
        a: {
          zh: '不能。转换是逐文件进行的，一个输入对应一个 PDF；本项目没有把多个 PDF 拼成一个的能力。需要合册时请用 PDF 侧的工具，或直接打印 ZIP 里的多个文件。',
          en: 'No. Conversion is per file — one input, one PDF — and there is no capability here to join PDFs. For a booklet use a PDF-side tool, or print the several files out of the ZIP.',
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
      en: 'Convert JPEG to PDF — one photo per page, through one re-encode',
    },
    desc: {
      zh: '浏览器本地把 .jpg 装进单页 PDF：页面按像素尺寸换算、横竖自动。这条路解码后再编码一次，PNG 那条则不重编码，两者是有损与无损的对照。',
      en: 'Put a .jpg into a one-page PDF locally, sized from its pixels with orientation handled automatically. This route decodes and re-encodes once; the PNG route does not, which is the lossy/lossless contrast.',
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
        '一批最多 200 张、单个 100 MB 上限，各自一个 PDF，结果可一次打包成 ZIP',
      ],
      en: [
        'One picture per page: the page is computed from the pixels at 96 dpi and goes landscape when it is wider than tall',
        'The re-encode is handed to the container as a JPEG stream (the encoder is given 0.92), so photographic output stays a manageable size',
        'The canvas is filled pure white before the picture is drawn, so there is no black background and no browser-dependent one',
        'A side above 8192 px is scaled inside the limit first rather than silently clipped',
        'Up to 200 files per batch and 100 MB each, one PDF per file, downloadable as one ZIP',
      ],
    },
    limits: {
      zh: [
        '这是第二次有损编码：追求保真请先转 PNG，再走 PNG → PDF（那条不重编码）',
        '不合并多页——一批 N 张就是 N 个 PDF，本项目没有拼 PDF 的能力',
        '没有文字层：PDF 里的图搜不到、也复制不出文字',
        '页面不是 A4，且目标是 PDF 时输出参数面板不出现（DPI 只对 PDF 来源有意义）',
      ],
      en: [
        'It is a second lossy pass: for fidelity convert to PNG first and take PNG → PDF, which embeds without re-encoding',
        'No merging — N files are N PDFs, because joining PDFs is not something this extension does',
        'No text layer, so the picture cannot be searched or copied as text out of the PDF',
        'The page is not A4, and no output panel is offered for a PDF target (DPI means something only when the source is a PDF)',
      ],
    },
    notes: {
      zh: [
        '典型用法是一批照片或截图各自变成一个可直接发送的单页 PDF',
        '单个文件失败只报该文件的错误，批次里其余继续；结果文件名默认在源名后加日期与时间',
      ],
      en: [
        'The typical use is a set of photos or screenshots, each becoming a one-page PDF you can send on its own',
        'One bad file reports only itself while the batch continues, and names default to the source name plus date and time',
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
          zh: '不能，转换按文件一对一。要合册就用 PDF 侧的工具；本项目能给你的是 50 个单页 PDF 和一个装它们的 ZIP。',
          en: 'No — conversion is one-to-one per file. Use a PDF-side tool for a booklet; what this gives you is 50 one-page PDFs and the ZIP that carries them.',
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
      en: 'Convert Excel to JSON from cell values — and no worksheet gets dropped',
    },
    desc: {
      zh: '浏览器本地把 .xlsx 转成 JSON：单表给行对象数组，多表按工作表名分组；数字与布尔是真类型，日期是两段式 ISO 文本。',
      en: 'Convert .xlsx to JSON in your browser: one sheet becomes an array of row objects, several are grouped by sheet name; numbers and booleans stay typed and dates arrive as two-form ISO text.',
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
      en: 'Convert CSV to JSON — a field is numeric only when it round-trips exactly',
    },
    desc: {
      zh: '浏览器本地把 .csv 转成 JSON 行对象：字段先按原文读入，只在「解析→回写完全一致」时才恢复数字类型；GBK / GB18030 自动兜底。',
      en: 'Convert .csv to JSON row objects locally: every field is read as text and regains a numeric type only when parse-then-reprint reproduces it exactly; GBK / GB18030 input decodes automatically.',
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
      en: 'Convert JSON to Excel — two steps through CSV, nested values kept in the cell',
    },
    desc: {
      zh: '浏览器本地把 JSON 数组转成 .xlsx：表头取所有对象键的并集，嵌套对象与数组以 JSON 文本进单元格。链路是 JSON → CSV → Excel，中间不落盘。',
      en: 'Turn a JSON array into .xlsx in your browser: the header is the union of every object’s keys and nested values go into the cell as JSON text. The route is JSON → CSV → Excel, with nothing written in between.',
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
      en: 'Convert Markdown to HTML — a complete document, inline styles, scripts removed',
    },
    desc: {
      zh: '浏览器本地把 .md 渲染成可直接双击打开的完整 HTML：GFM 表格与任务列表可用，样式内联，脚本与事件属性在净化阶段移除。',
      en: 'Render .md into a complete, double-clickable HTML document locally: GFM tables and task lists work, styles are inlined, and scripts and event attributes are removed at the sanitise step.',
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
      en: 'Convert HTML to PDF as A4 page slices — scripts never run, remote assets are never fetched',
    },
    desc: {
      zh: '浏览器本地把 .html 渲染成多页 A4 PDF：800 px 版心按整页高度切片，切片是无损 PNG；脚本被移除，远程资源不会被取回。',
      en: 'Render .html into a multi-page A4 PDF locally: an 800 px layout sliced down its full height, stored as lossless PNG. Scripts are removed and remote resources are never fetched.',
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
        '分页只看高度，不懂「章节起新页」；纸张固定 A4 竖版，不能选横版或其它尺寸',
      ],
      en: [
        'There is no text layer: the characters are drawn, so search, copy and screen readers find nothing to work with',
        'Remote references are stripped before rendering, and what is left of them — the emptied reference, plus any relative path — is replaced by a dashed placeholder box; only a data: or blob: picture the browser can still decode reaches the PDF, one it cannot (a revoked blob:, an unreadable data:) leaves that position empty, and no remote image, font or stylesheet is ever downloaded',
        'Long documents drop resolution: past 2000 px of height the ratio is 1.5× and past 4000 px it is 1×, so very long pages are less crisp than short ones',
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
      en: 'Convert PDF to HTML locally — text and links restored, pages separated',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 按阅读顺序提取文字层，链接标注按协议白名单保留，每页之间插入分页线，产出一个自包含的 .html。全程不上传，也不含 OCR：扫描件没有文字层。',
      en: 'pdf.js in your browser extracts the text layer in reading order, keeps link annotations through a scheme allowlist, and puts a page break between pages — one self-contained .html. Nothing is uploaded, and there is no OCR: a scan has no text layer.',
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
      en: 'Convert PDF to JPEG locally — one page per image, density and quality adjustable',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 把 PDF 逐页渲染成 JPEG：渲染密度四档 96 / 144 / 200 / 300 DPI（默认 144）、质量档 40%–90%、可指定最长边，多页自动一页一张装进 ZIP。文件不出本机，也不含 OCR。',
      en: 'pdf.js in your browser renders each PDF page to JPEG at a density of 96, 144, 200 or 300 DPI (144 by default), with a 40%–90% quality step and an optional longest edge; multiple pages come back one per image inside a ZIP. Nothing leaves your machine, and there is no OCR.',
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
      en: 'Convert PDF to PNG locally — lossless page rasters with adjustable density and longest edge',
    },
    desc: {
      zh: '浏览器本地用 pdf.js 把 PDF 逐页渲染成 PNG：渲染密度四档 96 / 144 / 200 / 300 DPI（默认 144）、可指定最长边，多页自动一页一张装进 ZIP。PNG 没有质量档也不吃目标体积——无损的意思是不替你决定丢哪些像素。文件不出本机，也不含 OCR。',
      en: 'pdf.js in your browser renders each PDF page to PNG at a density of 96, 144, 200 or 300 DPI (144 by default), with an optional longest edge; multiple pages come back one per image inside a ZIP. PNG has no quality step and takes no target size — lossless means the encoder does not decide for you which pixels to drop. Nothing leaves your machine, and there is no OCR.',
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
      en: 'Convert PDF to WebP locally — one page per image, usually smaller than JPEG',
    },
    desc: {
      zh: '浏览器本地把 PDF 逐页渲染成 WebP：密度四档 96 / 144 / 200 / 300 DPI、质量档 40%–90%、可指定最长边，多页一页一张装进 ZIP。它与 JPEG 的差别只有体积与容器兼容性——渲染前一样先铺白底，所以这条路没有透明输出。文件不出本机。',
      en: 'Render each page of a PDF to WebP in your browser, at a density of 96, 144, 200 or 300 DPI, with a 40%–90% quality step and an optional longest edge, zipped one page per image. What separates it from JPEG is size and container support and nothing else — the page is painted white before rendering here too, so this route has no transparent output. Nothing leaves your machine.',
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
      en: 'Convert PDF to Word (.docx) locally — two steps, no intermediate on disk',
    },
    desc: {
      zh: '这条是多步链：pdf.js 先按阅读顺序把文字层提成 HTML，再由它打包成 .docx，中间的 HTML 只在内存里、不会写到你的下载目录。全程离线，无 OCR，也不生成原生 OOXML 段落结构。',
      en: 'This runs as a two-step chain: pdf.js lifts the text layer into HTML in reading order, and that HTML is packed into a .docx. The intermediate never leaves memory, so nothing extra lands in your downloads. Fully offline, no OCR, and no native OOXML paragraph tree either.',
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
        'The text layer enters the body in reading order, a short all-caps line becomes a heading and the rest become paragraphs — the same judgement PDF to HTML makes',
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
      en: 'Convert Word to HTML locally — body text and images in one self-contained file',
    },
    desc: {
      zh: '浏览器本地用 mammoth 读 .docx 的语义结构（标题、列表、粗斜体、超链接、表格），文档里的图片内联成 data URI，最后经 DOMPurify 净化输出单个 .html。不上传、不装 Office，也不读旧版 .doc。',
      en: 'mammoth in your browser reads the semantic structure of a .docx — headings, lists, bold and italics, hyperlinks, tables — inline images become data URIs, and the result is sanitised through DOMPurify into one .html. No upload, no Office, and no legacy .doc either.',
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
        '文档内的图片读成 data URI 内联进 HTML——所以这一个文件本身是完整的，不需要 accompanying 的 images 目录',
        '输出前经 DOMPurify 的 html 白名单净化，脚本与事件属性不会进产物；`target` 属性被显式保留，链接仍可在新标签打开',
        '如果这份 .docx 本身就是本扩展 HTML → DOCX 的产物（altChunk 包装），空结果时会识别并救回内嵌的那份 HTML',
      ],
      en: [
        'Heading levels: paragraphs styled Heading 1–4 map to `<h1>`–`<h4>`, and Title and Subtitle each land where they belong',
        'Ordered and unordered lists, bold and italics — including those applied by character style name — and hyperlinks',
        'Tables: mammoth writes table structure as `<table>` by default, with cell content travelling alongside its inline formatting',
        'Images inside the document are read out as data URIs inlined into the HTML, so the single file is complete and needs no companion images folder',
        'The output passes DOMPurify’s html profile before it is written, so scripts and event attributes do not reach the file; the `target` attribute is kept on purpose so links still open in a new tab',
        'If the .docx was itself produced by this extension’s HTML → DOCX route (an altChunk wrapper), an empty result triggers recovery of the embedded HTML',
      ],
    },
    limits: {
      zh: [
        '外观不进 HTML：字体、字号、颜色、行距、页边距、分栏与分页位置全部丢失，产物由浏览器排版',
        '页眉页脚、脚注与尾注、批注、修订记录、文本框、艺术字、图表与嵌入对象都不提取',
        '只读 .docx（Office Open XML 的 zip 包）；97–2003 的旧版二进制 .doc 不支持，先在别处存成 .docx 再拿来',
        '样式名不匹配默认映射时（比如自定义的"报告正文"样式），那段文字仍会输出，只是落在 `<p>` 而不是你以为的标签',
        '内联图片会让 HTML 明显变大：一本带几十张图的文档，产物体积接近原文档里的图片总和',
      ],
      en: [
        'Appearance does not enter the HTML: fonts, sizes, colours, leading, margins, columns and page breaks are lost, and the browser does the typesetting',
        'Headers and footers, footnotes and endnotes, comments, tracked changes, text boxes, WordArt, charts and embedded objects are not extracted',
        'Only .docx (the zipped Office Open XML package) is read; legacy binary .doc from 97–2003 is not, so save it as .docx first elsewhere',
        'When a style name falls outside the default mapping — a custom "Report Body" style, say — the text still comes out, just into a `<p>` rather than the tag you expected',
        'Inlined images make the HTML visibly larger: a document with dozens of pictures produces roughly the sum of those pictures in added bytes',
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
      en: 'Convert HTML to PNG locally — the whole page rasterised into one tall image',
    },
    desc: {
      zh: '浏览器本地把 .html 渲染到画布再编码为 PNG：800 px 宽、按内容实际高度出整页长图，远程引用与脚本在渲染前就被处理掉。全程不出本机，没有截图软件、也没有服务端渲染。',
      en: 'Render a .html file to a canvas in your own browser and encode it as PNG: 800 px wide, one tall image as long as the content actually is, with remote references and scripts dealt with before anything paints. No server-side renderer, no screenshot tool, and nothing leaves the machine.',
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
      ],
      en: [
        'Pictures referenced by URL or by a sibling path cannot get their bytes: under the offline guarantee nothing is requested, so they become dashed placeholder boxes before rendering — the position is kept, the content is not guessed. Only an undecodable data: or an already-revoked blob: leaves that position empty',
        'How many positions were affected is counted on the result card, so you never receive a silently image-less tall image',
        'Scripts do not run, so charts computed in JS, lazy-loaded sections and anything that needs interaction to appear are absent from the image',
        'Web fonts and remote `@import` rules cannot be fetched either, so type falls back to the system stack',
        'The width is fixed at 800 px with no viewport parameter, and iframes or remote embeds do not render',
        'The output is pixels: text in it is not selectable or copyable, as on every route to an image',
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
          zh: '那是被有意留下的占位：原文档在那里引用了一张取不到字节的图片。本项目不去网络请求任何东西，所以宁可把位置标出来，也不按地址"猜"它长什么样。卡片上会写明这一轮有几处如此处理。',
          en: 'Those are deliberate placeholders where the document referenced a picture whose bytes could not be obtained. The extension requests nothing over a network, so it marks the position rather than guessing what lived there, and the result card counts how many positions were handled that way.',
        },
      },
      {
        q: { zh: '长图能有多长？会不会失败？', en: 'How tall can the image be, and can it fail?' },
        a: {
          zh: '上限由浏览器能分配的画布决定（一边最大 8192 px），而且页面越长、渲染倍率越低，就是在往这个上限靠。真的分配不出来时会明确报这次转换失败，不会给你半张图。',
          en: 'By what the browser can allocate for a canvas (8192 px on an edge), and the taller the page the lower the render scale, which is the same pressure toward that ceiling. If the canvas genuinely cannot be allocated, the conversion reports failure for that file rather than handing back half an image.',
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
      en: 'Convert Excel to PDF locally — two steps, every sheet laid out in sequence',
    },
    desc: {
      zh: '这条是多步链：SheetJS 先把每个工作表写成带表名的 HTML 表格，再由它生成 A4 竖版 PDF；中间产物只在内存里。日期不会被读成一串数字，公式值取上次保存时缓存的结果。全程离线。',
      en: 'A two-step chain: SheetJS writes each worksheet as an HTML table under its own sheet name, and that becomes a portrait A4 PDF, with the intermediate held only in memory. Dates do not arrive as bare serial numbers, and formula cells carry the value cached when the file was last saved. Fully offline.',
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
      en: 'Convert GIF to PNG locally — the first frame, losslessly re-encoded, with frame loss disclosed',
    },
    desc: {
      zh: '浏览器本地把 GIF 解码后编成 PNG：静态图无损换容器，动图取首帧并在结果卡片上写明丢了帧。BMP / GIF / SVG 只能作为输入——浏览器不提供它们的编码器，所以这条的方向不可逆。',
      en: 'Decode a GIF in your own browser and encode it as PNG: a still gains a lossless container swap, an animation keeps its first frame and says so on the result card. Note the direction is one-way — a browser ships no encoder for BMP, GIF or SVG, so this route has no reverse.',
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
      en: 'Convert BMP to PNG locally — a lossless re-encode that usually shrinks a lot',
    },
    desc: {
      zh: '浏览器本地把 .bmp 解码后编成 PNG：像素尺寸与颜色原样带走，不再叠有损压缩。BMP 只能作为输入（浏览器不提供它的编码器），所以这条方向不可逆；一批最多 200 张，结果可打 ZIP。',
      en: 'Decode a .bmp and encode it as PNG inside your browser: pixel size and colour carry over with no lossy pass added. BMP is input-only here — a browser ships no encoder for it — so the route does not run backwards; up to 200 images per batch, downloadable as one ZIP.',
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
      en: 'Convert BMP to JPEG locally — one encode, with quality and a target size you control',
    },
    desc: {
      zh: '浏览器本地把 .bmp 解码后编成 JPEG：质量档 40%–90%、目标体积 20 KB–2 MB、可指定最长边，够不着目标时先降质量再缩像素。BMP 只能作为输入，方向不可逆。',
      en: 'Decode a .bmp and encode it as JPEG in your browser, with a 40%–90% quality step, a 20 KB–2 MB target size and an optional longest edge — an unreachable target gives up quality before pixels. BMP is input-only, so the route does not run backwards.',
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
      en: 'Convert SVG to JPEG locally — rasterised in place, with size and quality under your control',
    },
    desc: {
      zh: '浏览器本地把 .svg 栅格化后编成 JPEG：先净化掉脚本与事件属性、按 width / viewBox 定尺寸（都没有时按 1024 px 方形），再画到画布编码。SVG 只能作为输入，方向不可逆；需要透明请改选 PNG 或 WebP。',
      en: 'Rasterise a .svg in your own browser and encode it as JPEG: scripts and event attributes are sanitised out first, the size comes from width / viewBox (falling back to a 1024 px square when neither is a usable number), and only then does it paint to a canvas. SVG is input-only, so the route does not run backwards — for transparency take PNG or WebP.',
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
      en: 'Convert SVG to WebP locally — rasterised with transparency kept',
    },
    desc: {
      zh: '浏览器本地把 .svg 栅格化后编成 WebP：带 Alpha，所以透明图形的背景能留住；质量档 40%–90%、目标体积 20 KB–2 MB、最长边可调。尺寸按 width / viewBox 推断，外部引用一律不请求。',
      en: 'Rasterise a .svg and encode it as WebP inside your browser — with an alpha channel, so a transparent diagram keeps its background, plus a 40%–90% quality step, a 20 KB–2 MB target size and an adjustable longest edge. Size comes from width / viewBox, and nothing external is ever requested.',
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
      en: 'Convert TXT to Markdown locally — fenced as a code block, not one character changed',
    },
    desc: {
      zh: '浏览器本地把 .txt 包成带围栏的 Markdown 代码块：内容原样保留，围栏长度会按文本里出现的最长反引号串加长，所以你的三反引号不会把结构撑破。它不猜标题、不猜列表——那是"值保真"与"替你排版"的区别。',
      en: 'Wrap a .txt as a fenced Markdown code block in your own browser: content is carried verbatim, and the fence grows past the longest run of backticks in your text so your own triple backticks cannot blow the structure open. It guesses no headings and no lists — which is the difference between value fidelity and typesetting on your behalf.',
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
        '编码按严格 UTF-8 读：非 UTF-8 的旧文件（GBK / GB18030 导出）会报解码失败，而不是悄悄给你一屏乱码——那一屏乱码之后就没法复原了',
        '围栏之外没有别的加工：如果你想要"看起来像文档"的结构，请走 TXT → HTML 或 TXT → DOCX（它们是另一套取舍）',
        '反向也有路但不同源：Markdown → TXT 会剥掉标记，而这一条只是包一层，两者不互逆',
      ],
      en: [
        'No structure is manufactured: headings, lists, tables and emphasis are not inferred, and the whole result is one code block — which is the price of not touching the content',
        'The read is strict UTF-8: an older file saved as GBK or GB18030 reports a decode failure rather than quietly producing a screen of mojibake, which could not be undone afterwards',
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
          zh: '这条路径严格读 UTF-8，所以它会明确报解码失败而不是猜——猜错的解码是不可逆的。办法：先用能指定编码的工具转存成 UTF-8，再拿来转。（本项目的若干条文本路径确实做了 UTF-8 → GB18030 → GBK 的兜底解码，但那是那些路径的明确取舍，不适用于这条。）',
          en: 'This route reads strict UTF-8, so it reports a decode failure instead of guessing — and a wrong decoding cannot be undone. Re-save the file as UTF-8 with a tool that lets you name the encoding, then convert it. (Several other text routes in this project do fall back UTF-8 → GB18030 → GBK, but that is an explicit decision for those routes and does not apply here.)',
        },
      },
    ],
  },
];
