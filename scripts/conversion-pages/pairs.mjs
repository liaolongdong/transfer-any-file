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
export const PAGES_UPDATED = '2026-09-25';

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
  webp: { zh: 'WebP', en: 'WebP', ext: '.webp' },
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
        '一批最多 200 个文件，单个 100 MB 上限；结果文件名沿用源文件名',
        '需要「同一份数据既要 CSV 又要 Excel」时，可以在工作台里连续两步转，不必回到源文件',
      ],
      en: [
        'Up to 200 files per batch and 100 MB each; output names follow the source file',
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
          zh: '这条链路按逗号分隔的 CSV 处理。分号或制表符分隔的文件先在 Excel 里另存为标准 CSV，再转。',
          en: 'This route parses comma-separated CSV. For semicolon- or tab-separated files, save as standard CSV in Excel first.',
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
        '批量最多 200 个文件；多个 PDF 结果一次打包成 ZIP 下载',
      ],
      en: [
        'If the recipient has to edit, take Markdown to Word instead — that is the editable artifact',
        'Up to 200 files per batch; several PDFs come back in one ZIP',
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
        'Up to 200 files per batch; several PDFs arrive in one ZIP',
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
      zh: '浏览器里把 PNG 编成 WebP，透明通道保留，质量档与目标体积先走质量阶梯再缩像素。最多 200 张一批，结果打 ZIP。',
      en: 'Encode PNG to WebP in the browser with alpha preserved; the target-size lever walks the quality ladder before it throws pixels away. Up to 200 images per batch, delivered as a ZIP.',
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
        '一批最多 200 张、单张上限 100 MB；结果一次打包成 ZIP',
        '输出参数在界面里设置后会被记住，同一批的所有图片共用一次设置',
      ],
      en: [
        'Up to 200 images per batch and 100 MB each, returned as a single ZIP',
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
        '一批最多 200 个文件；结果一次打包成 ZIP',
      ],
      en: [
        'A common icon workflow: convert a set of SVGs, set the longest edge, then run a second batch at another size',
        'Up to 200 files per batch, returned in one ZIP',
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
];
