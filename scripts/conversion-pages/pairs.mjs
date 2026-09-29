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
export const PAGES_UPDATED = '2026-09-30';

/**
 * The date the first conversion page entered the repository, used as `datePublished` in the `Article`
 * node. Unlike {@link PAGES_UPDATED} this one never moves: it is a repository fact, taken from
 * `git log --reverse -- docs/convert` (`b441af2`, 2026-09-25), and it states when the content was
 * written down — not when it went live. As of this revision the pages sit on a feature branch, so
 * GitHub Pages has not served any of them; do not read this as a release date.
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
        '外链图片不会被去网上取：图片要么以 data URI 内嵌，要么先本地准备好（离线前提）',
      ],
      en: [
        'No text layer: the words cannot be selected, copied, full-text searched or read by a screen reader — the pages are images',
        'Noticeably heavier than a text-based PDF of the same content',
        'Margins and page breaks follow the rendered height; you cannot dictate "start on page 3", and a tall table can be cut in two',
        'Remote images are not fetched: embed them as data URIs or have the files on hand locally — that is the offline premise',
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
        '远程资源在渲染前被剥掉（data: / blob: / 相对路径保留），远程图片、远程字体与远程 CSS 都不会下载',
        '长文档像素比会降：高度超过 2000 px 用 1.5 倍、超过 4000 px 用 1 倍，超长页的字不如短页锐利',
        '分页只看高度，不懂「章节起新页」；纸张固定 A4 竖版，不能选横版或其它尺寸',
      ],
      en: [
        'There is no text layer: the characters are drawn, so search, copy and screen readers find nothing to work with',
        'Remote resources are stripped before rendering (data:, blob: and relative references remain), so remote images, fonts and stylesheets are never downloaded',
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
          zh: '远程引用在渲染前被剥掉了，这是离线承诺的必要部分。把图片内联成 data URI，或让它们以相对路径与 HTML 同目录，就会出现在 PDF 里。',
          en: 'Remote references are stripped before rendering — that is what keeps the offline promise. Inline the images as data URIs or let them sit beside the HTML as relative paths and they will appear in the PDF.',
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
];
