/**
 * Source-format hubs for the site's conversion cluster.
 *
 * One entry per `FileFormat` value. A hub lists every target the workbench actually offers from that
 * source, in the same column order as the matrix, and gives each route a sentence that can be traced to
 * a converter in `utils/converters/`. A target that already has a pair page reuses that page's `desc`;
 * `targets` here is only for the routes without a page of their own, so the same fact is never written
 * twice and cannot drift between the hub and the page it links.
 *
 * `targets` is validated against the route baseline and `conversion-policy.ts` by the renderer: a key
 * that is unreachable, greyed out, the source itself, or already has a pair page fails the render.
 */

export const HUBS = [
  {
    from: 'md',
    slug: 'markdown',
    shot: 'workbench-empty',
    title: {
      zh: 'Markdown 转换：全部可用目标',
      en: 'Markdown conversions: every available target',
    },
    desc: {
      zh: '在浏览器本地把 Markdown 转成 HTML、Word、PDF、图片或表格数据。每条路线写清保留什么、丢掉什么。',
      en: 'Turn Markdown into HTML, Word, PDF, images or tabular data locally in Chrome. Each route says what it keeps and what it drops.',
    },
    lede: {
      zh: 'Markdown 是这组路线里最像「源文件」的格式：它只有结构，没有版式。所以每条出路的差别不在能不能转，而在目标格式肯不肯接住这些结构——Word 与 HTML 会保留标题、列表与表格，PDF 与图片只留下渲染后的样子，表格数据则要求文档里真的有一张表。',
      en: 'Markdown is the closest thing here to a source file: it carries structure, not layout. The routes therefore differ less in whether they work than in what the target is willing to keep — Word and HTML keep headings, lists and tables, PDF and images keep only the rendered look, and spreadsheet targets require the document to actually contain a table.',
    },
    limits: {
      zh: [
        '源文件先按 BOM / NUL 识别 UTF-16，再按 UTF-8 → GB18030 → GBK 依次解码；四种都不成立时报解码失败，不产出乱码文件',
        'HTML 之外的格式只能看到渲染结果或表格结构：CSS 版式、脚注、mermaid 图与自定义语法会被降级或丢弃',
        '指向 http(s) 的图片在渲染或打包前被剥掉；相对路径的图片只有在同一批次里也选入那个文件时才有字节可用',
        '一整批文件共用一个目标格式；混合格式批次只提供对所有文件都成立的目标',
      ],
      en: [
        'Input is decoded UTF-16 (by BOM or NUL spacing), then UTF-8 → GB18030 → GBK; if none of the four works the route reports a decode failure instead of writing mojibake',
        'Every target except HTML sees either the rendered result or the table structure, so CSS layout, footnotes, mermaid diagrams and custom syntax are flattened or dropped',
        'http(s) images are stripped before rendering or packing; a relative image only has bytes when that file is part of the same batch',
        'One target format applies to the whole batch; a mixed-format batch only offers targets that work for every file in it',
      ],
    },
    faq: [
      {
        q: { zh: 'Markdown 转 PDF 后还能选中文字吗？', en: 'Is the text in a Markdown to PDF result selectable?' },
        a: {
          zh: '不能。这条路线先把 Markdown 渲染成 HTML，再整页拍成图像切片写入 PDF，所以 PDF 里是页面图像，不是文字层。要可编辑的文档请选 Word；要能被搜索的文字请选 HTML 或 TXT。',
          en: 'No. The route renders Markdown to HTML and slices that rendering into page images, so the PDF holds pictures of pages rather than a text layer. Choose Word for an editable document, or HTML/TXT when the text itself has to stay searchable.',
        },
      },
      {
        q: {
          zh: '为什么 Markdown 转 Excel 要求文档里有表格？',
          en: 'Why does Markdown to Excel need a table in the document?',
        },
        a: {
          zh: 'Excel 的每一格都要求行列坐标，而标题和段落没有坐标。转换器先找 Markdown 表格（或一段能被当作 JSON 数组读的代码块），找不到就报错，而不是交出一张空表。',
          en: 'Every Excel cell needs a row and a column, and a heading or paragraph has neither. The converter looks for a Markdown table, or a code block that parses as a JSON array, and fails when there is none rather than handing back an empty sheet.',
        },
      },
      {
        q: { zh: '链接和图片会跟着走吗？', en: 'Do links and images travel with the result?' },
        a: {
          zh: '链接会：HTML 与 Word 保留可点击的地址，TXT 会把地址附在链接文字后面。图片分两种：data URI 内嵌的会跟着走；指向网络或相邻路径的取不到字节，渲染类目标会按张数披露。',
          en: 'Links do: HTML and Word keep clickable addresses, and TXT appends the address after the link text. Images depend on where the bytes are — embedded data URIs travel, while network or sibling-path references have no bytes and rendering targets count them in the drop disclosure.',
        },
      },
      {
        q: { zh: '一次能转多少个文件？', en: 'How many files can one batch hold?' },
        a: {
          zh: '最多 200 个文件，单个文件上限 100 MB；超过 5 个文件或 20 MB 的批次会先弹确认。每个文件独立执行路线，一个失败不会阻断其余文件。',
          en: 'Up to 200 files and 100 MB per file; a batch over five files or 20 MB asks for confirmation first. Each file walks the route on its own, so one failure does not stop the rest.',
        },
      },
    ],
    targets: {
      png: {
        zh: '把渲染后的整页拍成一张 PNG：宽度跟随页面布局，高度随内容增长；超过 32768 px 会报「页面过高」，不静默截断。取不到字节的图片按张数披露。',
        en: 'The rendered page is captured as one PNG: width follows the layout and height grows with the content. Past 32768 px the route reports an over-tall page instead of truncating silently, and images without bytes are counted.',
      },
      jpg: {
        zh: '先按 A4 切成多页，再把每一页编码成 JPEG；多页结果打包成 ZIP，透明区域铺白。长文档得到的是一组页面图，而不是一张压扁的长条。',
        en: 'The document is sliced into A4 pages and each page is encoded as JPEG; several pages arrive as a ZIP, with transparent areas filled white. A long document yields a set of page images rather than one flattened strip.',
      },
      webp: {
        zh: '与 JPEG 共用 A4 分页与栅格化，终点改成 WebP 编码；多页仍打包 ZIP，压缩参数与工作台里的其它 WebP 输出一致。',
        en: 'It shares the A4 slicing and rasterisation with JPEG and changes only the final encoder to WebP; several pages still arrive as a ZIP, with the same compression controls as every other WebP output.',
      },
    },
  },
  {
    from: 'html',
    slug: 'html',
    shot: 'workbench-empty',
    title: {
      zh: 'HTML 转换：全部可用目标',
      en: 'HTML conversions: every available target',
    },
    desc: {
      zh: '把 HTML 文件转成 Word、Markdown、PDF、图片或表格数据，全部在浏览器本地完成。表格与正文各有自己的出路。',
      en: 'Convert HTML to Word, Markdown, PDF, images or tabular data in the browser. Tables and prose each have their own route.',
    },
    lede: {
      zh: 'HTML 同时带着结构和呈现：标签说这是什么，CSS 说这看起来怎样。文档类目标接住标签与文字，图片类目标接住呈现，数据类目标只接住 `<table>`。想清楚你要的是哪一种，比选格式更重要。',
      en: 'HTML carries both structure and presentation: tags say what something is, CSS says what it looks like. Document targets keep tags and text, image targets keep the look, and data targets keep only the `<table>`. Knowing which of the three you need matters more than the format name.',
    },
    limits: {
      zh: [
        '脚本不会执行：解析后立即剥离 `<script>`、`<style>` 与内联事件处理器，页面里的动态内容不会出现在结果中',
        '远程图片、字体与样式表不会下载；渲染前剥离子资源引用，取不到字节的图片按张数披露',
        'CSS 版式只在图片与 PDF 路线上生效，Word、Markdown、TXT 与表格路线只保留语义结构',
        '一个 HTML 文件可以引用同目录的图片，但只有同一批次里也选入那张图片时才有字节可用',
      ],
      en: [
        'Scripts never run: `<script>`, `<style>` and inline event handlers are stripped after parsing, so anything the page would have rendered dynamically is absent',
        'Remote images, fonts and stylesheets are not downloaded; subresource references are stripped before rendering and images without bytes are counted',
        'CSS layout survives only on the image and PDF routes; Word, Markdown, TXT and table routes keep semantic structure alone',
        'An HTML file may reference an image sitting next to it, but the bytes exist only when that image is part of the same batch',
      ],
    },
    faq: [
      {
        q: { zh: 'HTML 里的 JavaScript 会被执行吗？', en: 'Does JavaScript inside the HTML run?' },
        a: {
          zh: '不会。文件先作为文本解析，`<script>`、样式与事件属性在进入转换器之前就被移除；没有 `eval`，也没有把页面挂进实时 DOM 去跑。动态生成的内容因此不会出现。',
          en: 'No. The file is parsed as text and `<script>`, styles and event attributes are removed before a converter sees it. Nothing is evaluated and the page is never mounted into the live DOM, so dynamically generated content does not appear.',
        },
      },
      {
        q: { zh: 'HTML 转 Word 与 HTML 转 PDF 有什么不同？', en: 'How are HTML to Word and HTML to PDF different?' },
        a: {
          zh: 'Word 得到的是可编辑段落与表格，版式按文档主题重排；PDF 得到的是 A4 页面图像，看起来更接近浏览器，但文字不可选中、也不能编辑。',
          en: 'Word receives editable paragraphs and tables, with layout rebuilt from the document theme. PDF receives A4 page images that look closer to the browser, but the text is neither selectable nor editable.',
        },
      },
      {
        q: { zh: '为什么 HTML 转 Excel 只拿到一部分内容？', en: 'Why does HTML to Excel keep only part of the page?' },
        a: {
          zh: 'Excel 只有行列。转换器读取 `<table>` 的行与单元格，正文、导航与样式没有坐标可放。页面没有表格时，它只尝试读取 `<pre>` 或 `<code>` 里的 JSON，再失败就报错。',
          en: 'Excel only has rows and columns. The converter reads the rows and cells of `<table>` elements, while prose, navigation and styling have no coordinates. With no table it only tries JSON inside `<pre>` or `<code>`, and fails otherwise.',
        },
      },
      {
        q: {
          zh: '本地的 `<img src="photo.jpg">` 会跟着走吗？',
          en: 'Does a local `<img src="photo.jpg">` travel with the result?',
        },
        a: {
          zh: '只有那张图片也在同一批次里时才会。扩展不会去磁盘上按路径翻找文件；取不到字节的引用会在渲染前被剥离，并在结果卡上按张数披露。',
          en: 'Only when that image is in the same batch. The extension does not go looking for files by path on disk; references it cannot read are stripped before rendering and counted on the result card.',
        },
      },
    ],
    targets: {
      jpg: {
        zh: '整页按 A4 切片后逐页编码 JPEG，多页输出 ZIP；透明区域铺白。脚本不会执行，远程图片与字体不取字节。',
        en: 'The whole page is sliced into A4 pages and each is encoded as JPEG, with several pages in a ZIP and transparent areas filled white. Scripts do not run, and remote images and fonts are not fetched.',
      },
      webp: {
        zh: '与 JPEG 同一条 A4 分页路径，终点编码为 WebP；多页打包 ZIP。相片类内容体积更小，代价是有损压缩。',
        en: 'It shares the A4 slicing path with JPEG and encodes each page as WebP; several pages arrive as a ZIP. Photographic pages get smaller at the cost of lossy compression.',
      },
    },
  },
  {
    from: 'docx',
    slug: 'word',
    shot: 'workbench-empty',
    title: {
      zh: 'Word 文档转换：全部可用目标',
      en: 'Word conversions: every available target',
    },
    desc: {
      zh: '把 .docx 转成 HTML、Markdown、PDF、图片或表格数据，在浏览器里离线完成。文档里的表格与正文各走各的路。',
      en: 'Convert .docx to HTML, Markdown, PDF, images or table data offline in Chrome. Tables and body text take separate routes.',
    },
    lede: {
      zh: 'Word 文档的价值常常在结构里：标题层级、列表、表格。mammoth 把 .docx 还原成语义 HTML，之后每条路线再决定保留哪一部分。分页、页眉页脚与批注属于 Word 的版式层，离开 Word 后基本不保留。',
      en: 'Much of a Word document’s value sits in its structure: heading levels, lists, tables. Mammoth turns the .docx back into semantic HTML, and each route then decides which part to keep. Pagination, headers, footers and comments belong to Word’s layout layer and mostly do not survive leaving it.',
    },
    limits: {
      zh: [
        '合并单元格、脚注、批注、修订痕迹与文本框没有稳定的 HTML 对应物，会被降级、合并或丢弃',
        '页眉、页脚、页码与 Word 自己的分页不进入结果；PDF 与图片路线按浏览器重新排版',
        '嵌入的图片来自文档内部，可以保留；链接到外部地址的图片不会下载，按张数披露',
        '输出文档的字体、页边距与行距由目标格式决定，不沿用原 .docx 的主题',
      ],
      en: [
        'Merged cells, footnotes, comments, tracked changes and text boxes have no stable HTML counterpart, so they are flattened, merged or dropped',
        'Headers, footers, page numbers and Word’s own pagination do not enter the result; PDF and image routes reflow in the browser',
        'Images embedded inside the document survive; images linked to an external address are not downloaded and are counted',
        'Fonts, margins and line spacing in the output belong to the target format, not to the original .docx theme',
      ],
    },
    faq: [
      {
        q: { zh: 'Word 转 PDF 会保留原来的分页吗？', en: 'Will Word to PDF keep the original pagination?' },
        a: {
          zh: '不会。文档先还原成 HTML，再由浏览器排版并按 A4 切片；分页取决于浏览器对这份 HTML 的排版，不读取 Word 的页面设置。',
          en: 'No. The document is rebuilt as HTML and laid out by the browser before being sliced into A4 pages. Pagination follows the browser’s layout of that HTML, not the page setup stored in Word.',
        },
      },
      {
        q: { zh: '批注和修订会被带过去吗？', en: 'Do comments and tracked changes travel?' },
        a: {
          zh: '不会。它们属于 Word 的审阅层，HTML 没有对应物，转换前就被丢弃。若这些内容重要，先在接受修订、导出批注之后再转。',
          en: 'No. They belong to Word’s review layer, which HTML has no counterpart for, and they are dropped before conversion. If they matter, accept the changes and export the comments first.',
        },
      },
      {
        q: { zh: '为什么 Word 转 Excel 只看到表格？', en: 'Why does Word to Excel show only the tables?' },
        a: {
          zh: '因为 Excel 只有单元格。转换器读取文档里的表格，标题与段落没有坐标可以落。文档没有表格时，它会尝试把一段 JSON 代码读成数组，否则明确报错。',
          en: 'Because Excel only has cells. The converter reads the document’s tables, while headings and paragraphs have no coordinates. Without a table it tries a JSON code block, and otherwise fails explicitly.',
        },
      },
      {
        q: { zh: '能批量转换一批 Word 文件吗？', en: 'Can a batch of Word files be converted together?' },
        a: {
          zh: '能。最多 200 个文件、单个 100 MB；整批共用一个目标格式，每个文件独立走路线，一个失败不会阻断其余文件。结果可以逐个下载或打成一个 ZIP。',
          en: 'Yes. Up to 200 files at 100 MB each, one target for the batch, and every file walks the route independently so one failure does not stop the rest. Results download one by one or as a ZIP.',
        },
      },
    ],
    targets: {
      xlsx: {
        zh: 'Word 表格经 HTML 中转后变成工作表，首行是表头；段落、页眉、页脚与批注没有单元格可放，不进入结果。',
        en: 'Word tables travel through HTML into worksheets with the first row as headers; paragraphs, headers, footers and comments have no cell and do not appear.',
      },
      csv: {
        zh: '表格行写成 CSV，单元格只保留文本；合并单元格按解析后的网格展开，样式、批注与修订全部丢失。',
        en: 'Table rows become CSV with text-only cells; merged cells expand into the parsed grid, and styling, comments and tracked changes are lost.',
      },
      json: {
        zh: '文档里的表格转成对象数组；没有表格时，正文中的 JSON 代码块可以被读出，否则报「没有表格结构」。',
        en: 'Tables become arrays of objects; with no table, a JSON code block in the body can still be read, and otherwise the route reports that no table structure exists.',
      },
      jpg: {
        zh: '渲染后按 A4 分页、逐页编码 JPEG，多页打包 ZIP；分页来自浏览器排版，不沿用 Word 的页面设置。',
        en: 'The rendering is sliced into A4 pages and encoded as JPEG, with several pages in a ZIP. Pagination comes from the browser’s layout, not from Word’s page setup.',
      },
      webp: {
        zh: '与 JPEG 相同的渲染与分页，终点为 WebP；多页 ZIP。外部图片取不到字节，会在结果卡上按张数披露。',
        en: 'It shares the rendering and slicing with JPEG and encodes each page as WebP; several pages arrive as a ZIP. External images without bytes are counted on the result card.',
      },
    },
  },
  {
    from: 'pdf',
    slug: 'pdf',
    shot: 'workbench-empty',
    title: {
      zh: 'PDF 转换：全部可用目标',
      en: 'PDF conversions: every available target',
    },
    desc: {
      zh: '把 PDF 转成页面图片、HTML、Word、Markdown 或纯文本，本地完成。扫描件没有文字层，数据类目标会被置灰。',
      en: 'Turn a PDF into page images, HTML, Word, Markdown or plain text locally. Scanned files have no text layer, and data targets are greyed out.',
    },
    lede: {
      zh: '本扩展把 PDF 当作两种东西看：有文字层的文档，或一叠页面图像。要文字时它只提取文字层，要样子时它把每一页渲染成图。没有 OCR，所以扫描件不会凭空长出文字；PDF 也没有表格结构，Excel、CSV 与 JSON 在界面上会被置灰。',
      en: 'This extension treats a PDF as one of two things: a document with a text layer, or a stack of page images. When you want text it extracts the text layer; when you want the look it renders every page. There is no OCR, so a scan does not grow text, and a PDF carries no table structure, which is why Excel, CSV and JSON are greyed out.',
    },
    limits: {
      zh: [
        '没有 OCR：只有页面图像、没有文字层的扫描件，文字类目标会得到空结果或直接失败',
        'PDF 没有表格结构，Excel、CSV、JSON 三个数据目标被 conversion-policy 置灰，界面上会给出原因',
        '页面图片按 pdf.js 渲染；单次最多栅格化 200 页，超过时明确拒绝并建议先选页',
        '提取出的文字会重排：原始换行、分栏、表格网格与精确字号不保留',
      ],
      en: [
        'No OCR: a scan with page images and no text layer gives text targets an empty result or a failure',
        'A PDF has no table structure, so the Excel, CSV and JSON targets are greyed out by conversion-policy and the interface says why',
        'Pages are rendered by pdf.js; one conversion rasterises at most 200 pages and refuses past that, suggesting a page range first',
        'Extracted text is reflowed: original line breaks, columns, table grids and exact type sizes do not survive',
      ],
    },
    faq: [
      {
        q: { zh: '扫描版 PDF 能转成 Word 吗？', en: 'Can a scanned PDF become Word?' },
        a: {
          zh: '不能识别文字。扫描页是图像，没有文字层可提取，Word 里不会出现可编辑的句子。本扩展不捆绑 OCR；需要识别时请先用专门的 OCR 工具生成带文字层的 PDF。',
          en: 'Not by reading it. A scanned page is an image with no text layer, so Word receives no editable sentences. This extension bundles no OCR; produce a text-layer PDF with a dedicated OCR tool first.',
        },
      },
      {
        q: { zh: '为什么 PDF 不能转 Excel？', en: 'Why can a PDF not become Excel?' },
        a: {
          zh: '因为 PDF 描述的是页面上的线段与文字位置，不是行列数据。把视觉上的表格还原成真实单元格需要结构识别，这份工具不假装能做；目标会被置灰并说明「PDF 没有表格结构」。',
          en: 'Because a PDF describes lines and text positions on a page, not rows and columns. Recovering a visual table into real cells needs structure recognition, which this tool does not pretend to do; the target is greyed out with “a PDF has no table structure”.',
        },
      },
      {
        q: { zh: 'PDF 转图片会是可搜索的文字吗？', en: 'Are PDF to image results searchable text?' },
        a: {
          zh: '不是。PNG、JPEG 与 WebP 都是像素，页面上的字变成图形。多页文档会打包成 ZIP，每页一张图；需要沿用的文字请走 TXT、HTML 或 Word 路线。',
          en: 'No. PNG, JPEG and WebP are pixels, so the words become shapes. A multi-page document arrives as a ZIP with one image per page; when the text must stay usable, take the TXT, HTML or Word route.',
        },
      },
      {
        q: { zh: '能只转其中几页吗？', en: 'Can I convert only some pages?' },
        a: {
          zh: '转图片时可以填写页码范围（如 2-5、8、11-13），解析按文档自称的页数进行；不填则整份处理。超过 200 页会拒绝，要求先缩小范围。',
          en: 'For image targets you can give a page range such as 2-5, 8, 11-13, resolved against the document’s own page count. Leave it blank to process everything. Past 200 pages the conversion is refused and asks for a narrower range.',
        },
      },
    ],
    targets: {},
  },
  {
    from: 'xlsx',
    slug: 'excel',
    shot: 'batch-files',
    title: {
      zh: 'Excel 转换：全部可用目标',
      en: 'Excel conversions: every available target',
    },
    desc: {
      zh: '把 .xlsx 转成 CSV、JSON、HTML、Markdown、Word、PDF 或图片。多工作表按表名分组，值优先于显示格式。',
      en: 'Convert .xlsx to CSV, JSON, HTML, Markdown, Word, PDF or images. Sheets are grouped by name, and values win over display formatting.',
    },
    lede: {
      zh: 'Excel 文件不只是一张表：它有多个工作表、公式、日期格式与显示规则。这份工具在数据类路线上坚持「值优先」——日期与数字先恢复成存储值，再序列化；在文档与图片路线上则把每个工作表摊成一张带标题的表格。公式本身不保留，留下的是它算出来的值。',
      en: 'An Excel file is more than a sheet: it has several worksheets, formulas, date formats and display rules. On data routes this tool insists on values — dates and numbers are restored before serialisation — while document and image routes lay every worksheet out as a titled table. Formulas do not survive; the value they produced does.',
    },
    limits: {
      zh: [
        '公式按计算结果导出，公式文本、命名区域与宏不保留',
        '单元格颜色、条件格式、列宽、图表、批注与冻结窗格不属于数据模型，在每条路线上都会丢失',
        '多工作表在 CSV / JSON 路线上按表名分组；单表目标可能得到一个 ZIP 或多节结构，取决于目标格式',
        '日期先按工作簿的显示格式规范化，避免把日期序列号直接写进结果',
      ],
      en: [
        'Formulas export their computed result; formula text, named ranges and macros do not survive',
        'Cell colours, conditional formatting, column widths, charts, comments and frozen panes are not part of the data model and are lost on every route',
        'Several worksheets are grouped by sheet name on CSV and JSON routes; single-table targets become a ZIP or a multi-section structure that fits the target',
        'Dates are normalised from the workbook’s display format first, so a serial number is not written into the result',
      ],
    },
    faq: [
      {
        q: { zh: '公式会变成值还是保留公式？', en: 'Do formulas become values or stay formulas?' },
        a: {
          zh: '变成值。读取时公式单元格给出缓存的计算结果，输出里没有公式文本，也没有重算能力。需要保留公式的工作簿请留在 Excel 里。',
          en: 'They become values. Formula cells expose their cached result when read, and the output carries neither formula text nor a calculation engine. A workbook that must keep its formulas belongs in Excel.',
        },
      },
      {
        q: { zh: '多个工作表会怎样输出？', en: 'What happens to several worksheets?' },
        a: {
          zh: '转 HTML、PDF 与图片时，每个工作表变成一个带表名标题的表格，按工作簿顺序排列；转 JSON 时按表名分组；转 CSV 时多表结果打成 ZIP，每表一份。',
          en: 'For HTML, PDF and images each worksheet becomes a titled table in workbook order. JSON groups by sheet name, and CSV delivers a ZIP with one file per sheet.',
        },
      },
      {
        q: { zh: '日期为什么不是原始序列号？', en: 'Why is a date not the raw serial number?' },
        a: {
          zh: 'Excel 把日期存成数字，直接导出会得到 45296 这类值。读取时按工作簿的日期格式识别并规范化，输出的 CSV / HTML / JSON 里是日期文本，而不是看起来像数字的序列。',
          en: 'Excel stores dates as numbers, and a raw export would hand back something like 45296. The reader recognises and normalises them from the workbook’s date format, so CSV / HTML / JSON carry date text rather than a number that merely looks numeric.',
        },
      },
      {
        q: { zh: '转出来的表能反向转回 Excel 吗？', en: 'Can the result be converted back into Excel?' },
        a: {
          zh: 'CSV 与 JSON 都能作为源格式转回 .xlsx，按值而不是显示文本恢复；但颜色、公式、图表与批注不会因为往返而回来——它们从一开始就没有进入数据模型。',
          en: 'CSV and JSON can both be converted back into .xlsx, restored from values rather than display text. Colours, formulas, charts and comments do not return in the round trip — they never entered the data model.',
        },
      },
    ],
    targets: {
      png: {
        zh: '整本工作簿渲染成一页长图：每个工作表一张带标题的表格，宽表整体缩放；超过 32768 px 高度会报错而不是截断。',
        en: 'The workbook is captured as one long image: a titled table per worksheet, with wide sheets scaled to fit. Past 32768 px of height the route fails instead of truncating.',
      },
      jpg: {
        zh: '先按 A4 分页再逐页编码 JPEG，长表跨页、多页 ZIP；分页按渲染宽度计算，不读取 Excel 的打印区域。',
        en: 'The rendering is sliced into A4 pages and encoded as JPEG, with long tables spanning pages and several pages in a ZIP. Pagination follows rendered width, not Excel’s print area.',
      },
      webp: {
        zh: '与 JPEG 相同的分页与编码路径，终点为 WebP；适合体积优先的表格快照，文字边缘会有有损压缩的代价。',
        en: 'It shares the pagination and encoding path with JPEG and writes WebP instead. A size-first snapshot of a table, at the cost of lossy edges on text.',
      },
    },
  },
  {
    from: 'csv',
    slug: 'csv',
    shot: 'batch-files',
    title: {
      zh: 'CSV 转换：全部可用目标',
      en: 'CSV conversions: every available target',
    },
    desc: {
      zh: '把 CSV 转成 Excel、JSON、HTML、Markdown、Word、PDF、TXT 或图片。按值读取，日期与长数字不被显示格式改写。',
      en: 'Convert CSV to Excel, JSON, HTML, Markdown, Word, PDF, TXT or images. Values are read as values, so dates and long numbers keep their digits.',
    },
    lede: {
      zh: 'CSV 看起来只是一堆逗号，真正麻烦的是解析前的类型判断：`1/2` 是日期还是分数，`00123` 是邮编还是数字。这条管线先按 `raw` 读入，再把明确是数字的字段恢复成数字，其余保持原字符——这是它能被信任的原因，也是它不会替你做更多猜测的原因。',
      en: 'A CSV looks like commas, but the hard part happens before parsing: is `1/2` a date or a fraction, is `00123` a postcode or a number? This pipeline reads raw first and only restores fields that are unambiguously numeric, leaving everything else as the characters it found. That is why it can be trusted, and why it will not guess further than that.',
    },
    limits: {
      zh: [
        '编码按 BOM、NUL 与 UTF-8 → GB18030 → GBK 的严格顺序判定；四种都不成立时报解码失败，不产出乱码',
        'CSV 没有标题层级、合并单元格或样式；表格之外的东西本来就不存在',
        '一列里混用日期与数字时按字段各自判断，不做整列强制转换',
        '一个 CSV 文件只对应一张表；多文件批次按文件各出一份结果',
      ],
      en: [
        'Encoding is decided by BOM, NUL and the strict UTF-8 → GB18030 → GBK chain; if none holds, the route reports a decode failure rather than writing mojibake',
        'A CSV has no heading hierarchy, merged cells or styling; anything outside the grid never existed',
        'A column mixing dates and numbers is judged field by field rather than coerced as a whole',
        'One CSV file is one table; a multi-file batch produces one result per file',
      ],
    },
    faq: [
      {
        q: { zh: '`00123` 会被当成数字 123 吗？', en: 'Will `00123` become the number 123?' },
        a: {
          zh: '只有整列都表现为数值时才会恢复成数字；带前导零的账号、邮编会保持原字符。日期同理：先确认它是工作簿能识别的日期，才规范化，避免把 `1/2` 猜成某一天。',
          en: 'A field is restored to a number only when it is unambiguously numeric; an account or postcode with a leading zero keeps its characters. Dates work the same way: the reader normalises one only after recognising it as a date, so `1/2` is not guessed into a particular day.',
        },
      },
      {
        q: { zh: 'CSV 转 PDF 后表格能编辑吗？', en: 'Is the table in a CSV to PDF result editable?' },
        a: {
          zh: '不能。PDF 路线把表格渲染成 A4 页面图像，文字不可选中。需要保留数据请选 Excel 或 JSON；需要可编辑文档请选 Word。',
          en: 'No. The PDF route renders the table into A4 page images, so the text is not selectable. Choose Excel or JSON to keep the data, or Word for an editable document.',
        },
      },
      {
        q: { zh: '多张表能一起转吗？', en: 'Can several tables be converted together?' },
        a: {
          zh: '把多个 CSV 放进同一批次，整批共用一个目标格式，每个文件各出一份结果；需要一次拿走时用 ZIP。一个 CSV 内部不会被拆成多张表。',
          en: 'Put several CSV files in one batch: they share a target and each produces its own result, with a ZIP when you want them in one download. A single CSV is never split into several tables.',
        },
      },
      {
        q: { zh: 'GBK 编码的 CSV 能读吗？', en: 'Can a GBK-encoded CSV be read?' },
        a: {
          zh: '能。先看 BOM 与 NUL，再依次尝试严格 UTF-8、GB18030、GBK；解出的文字还要通过控制字符闸门。若全部失败，会明确报解码失败，而不是产出一份乱码。',
          en: 'Yes. The reader checks BOM and NUL, then tries strict UTF-8, GB18030 and GBK, with a control-character gate on the result. If all fail it reports a decode failure rather than writing mojibake.',
        },
      },
    ],
    targets: {
      docx: {
        zh: 'CSV 先转 HTML 再转 Word：一张表写入文档，首行是表头；列宽自适应，字体与配色取文档默认值，不沿用 CSV 来源的任何样式。',
        en: 'The CSV goes through HTML into Word: one table with the first row as headers, adaptive column widths and the document’s default type and colours, with no styling carried over from the CSV.',
      },
      png: {
        zh: '整张表渲染成一张 PNG；宽表整体缩放以适应画布，行数过多导致高度超过 32768 px 时失败并说明。',
        en: 'The whole table is captured as one PNG with wide sheets scaled to fit. A table tall enough to pass 32768 px fails with an explanation.',
      },
      jpg: {
        zh: '按 A4 分页后逐页编码 JPEG，长表跨页、多页 ZIP；压缩对文字边缘有损，适合预览而非存档。',
        en: 'It is sliced into A4 pages and encoded as JPEG, with long tables spanning pages and several pages in a ZIP. Compression softens text edges, so this suits previews rather than archives.',
      },
      webp: {
        zh: '与 JPEG 一样的 A4 分页，终点 WebP；多页 ZIP。适合体积优先的表格快照，文字清晰度会下降。',
        en: 'The same A4 slicing as JPEG, encoded as WebP; several pages arrive as a ZIP. A size-first table snapshot, with softer text.',
      },
    },
  },
  {
    from: 'txt',
    slug: 'txt',
    shot: 'workbench-empty',
    title: {
      zh: 'TXT 转换：全部可用目标',
      en: 'TXT conversions: every available target',
    },
    desc: {
      zh: '把纯文本转成 HTML、Word、PDF、图片，或把其中的 JSON 变成表格。换行与空格保留，不推断 Markdown 语法。',
      en: 'Turn plain text into HTML, Word, PDF or images, or turn JSON text into a table. Line breaks and spaces stay; Markdown syntax is not inferred.',
    },
    lede: {
      zh: '纯文本没有结构，只有字符与换行。这条管线因此不假装认得标题或列表：转成 HTML 时整段放进 `<pre>`，转成文档时保留空白与等宽排版。唯一的例外是文本本身就是 JSON——那时它才有行列可谈，数据类目标也才成立。',
      en: 'Plain text has characters and line breaks, not structure. This pipeline therefore does not pretend to recognise headings or lists: HTML wraps the text in `<pre>`, and document routes keep whitespace and a monospace layout. The one exception is text that is already JSON — only then are there rows and columns, and only then do the data targets apply.',
    },
    limits: {
      zh: [
        '没有 Markdown 推断：`# 标题` 与 `- 列表` 保持字面字符，不会被解释成结构',
        'Excel、CSV 与 JSON 路线只对「整段内容是合法 JSON」的文本成立；普通文本会明确报错',
        'HTML 路线把整段放进 `<pre>`，超长行不会自动折行；图片与 PDF 路线按页面宽度排版',
        '编码判定与 CSV / JSON 相同：UTF-16（BOM 或 NUL 形状）、UTF-8、GB18030、GBK，最后过控制字符闸门',
      ],
      en: [
        'No Markdown inference: `# heading` and `- item` stay literal characters and are never interpreted as structure',
        'Excel, CSV and JSON routes only work when the whole text is valid JSON; ordinary prose fails explicitly',
        'The HTML route wraps everything in `<pre>`, so very long lines do not wrap; image and PDF routes lay out to page width',
        'Encoding detection matches CSV and JSON: UTF-16 by BOM or NUL shape, then UTF-8, GB18030 and GBK, with a control-character gate',
      ],
    },
    faq: [
      {
        q: { zh: 'TXT 转 HTML 会认 Markdown 吗？', en: 'Does TXT to HTML understand Markdown?' },
        a: {
          zh: '不会。文本按字面转义后放进 `<pre>`，`#`、`*` 与反引号都只是字符。要渲染 Markdown，请先把文件后缀改成 `.md` 再转。',
          en: 'No. The text is escaped literally inside `<pre>`, so `#`, `*` and backticks stay characters. To render Markdown, rename the file to `.md` first.',
        },
      },
      {
        q: { zh: '为什么 TXT 转 Excel 报错？', en: 'Why does TXT to Excel fail?' },
        a: {
          zh: '因为纯文本没有行列。转换器把文本放进 `<pre>` 后，只有一种情况能建立表格：整段文本是合法的 JSON 数组。否则它明确报错，而不是把每一行塞进一格。',
          en: 'Because plain text has no rows or columns. After wrapping the text in `<pre>`, the only way to build a table is for the whole text to be a valid JSON array. Otherwise the route fails rather than forcing every line into a cell.',
        },
      },
      {
        q: { zh: '换行与空格会保留吗？', en: 'Are line breaks and spaces preserved?' },
        a: {
          zh: 'HTML 与 Word 路线用 `<pre>` 与等宽排版保留它们；TXT 与 Markdown 路线原样搬运。图片与 PDF 路线按页面排版，超长行可能被页面宽度限制。',
          en: 'The HTML and Word routes keep them through `<pre>` and a monospace layout, and the TXT and Markdown routes carry them verbatim. Image and PDF routes lay out to a page, where very long lines meet the page width.',
        },
      },
      {
        q: { zh: '能读 UTF-16 或 GBK 的文本吗？', en: 'Can it read UTF-16 or GBK text?' },
        a: {
          zh: '能。先按 BOM 与 NUL 的奇偶形状识别 UTF-16，再走严格 UTF-8、GB18030、GBK；解出的文字若含三个以上非空白控制字符，会被判为「这不是文本」而不是继续产出。',
          en: 'Yes. UTF-16 is recognised from its BOM or NUL parity, then strict UTF-8, GB18030 and GBK are tried in order. If the decoded text carries three or more non-whitespace control characters, it is rejected as not text rather than written out.',
        },
      },
    ],
    targets: {
      xlsx: {
        zh: '只有当整段文本是合法 JSON 数组时才走得通：TXT→HTML 后按 JSON 读取，再转成表格。普通文本没有表格结构，会以错误结束。',
        en: 'It only works when the whole text is a valid JSON array: after TXT→HTML the content is read as JSON and turned into a sheet. Ordinary prose has no table structure and ends in an error.',
      },
      png: {
        zh: '按等宽 `<pre>` 排版整页渲染成 PNG，空白与换行保留；高度超过 32768 px 时报错而不是截断。',
        en: 'The monospace `<pre>` layout is captured whole as PNG, preserving whitespace and line breaks; past 32768 px of height the route fails rather than truncating.',
      },
      jpg: {
        zh: '按 A4 分页、逐页编码 JPEG，多页 ZIP；等宽文字在 JPEG 下会出现边缘振铃，适合预览。',
        en: 'It is sliced into A4 pages and encoded as JPEG, with several pages in a ZIP. JPEG ringing shows on monospace glyph edges, so this suits previews.',
      },
      webp: {
        zh: '同样按 A4 分页并编码 WebP；多页 ZIP。文本类内容用有损格式体积收益有限，清晰度会下降。',
        en: 'The same A4 slicing and a WebP encoder, with several pages in a ZIP. Lossy compression buys little on text and costs some sharpness.',
      },
    },
  },
  {
    from: 'json',
    slug: 'json',
    shot: 'batch-files',
    title: {
      zh: 'JSON 转换：全部可用目标',
      en: 'JSON conversions: every available target',
    },
    desc: {
      zh: '把 JSON 转成 Excel、CSV、HTML、Markdown、Word、PDF、TXT 或图片。数组变成行，对象变成列，值保持原类型。',
      en: 'Convert JSON to Excel, CSV, HTML, Markdown, Word, PDF, TXT or images. Arrays become rows, objects become columns, and values keep their type.',
    },
    lede: {
      zh: 'JSON 的麻烦不在语法，而在形状：顶层是对象还是数组，元素是不是都有同一组键。这条管线把对象数组当作表格，把嵌套对象序列化成单元格文本，把没有键的元素放进合成 `_value` 列——宁可多一列，也不静默丢行。',
      en: 'The trouble with JSON is not syntax but shape: whether the top level is an object or an array, and whether its elements share keys. This pipeline treats an array of objects as a table, serialises nested objects into cells, and puts keyless elements in a synthetic `_value` column — a spare column is better than a silently missing row.',
    },
    limits: {
      zh: [
        '表格类目标要求顶层是数组且至少有一个可落脚的值；空数组与全空对象会明确报错',
        '嵌套对象与数组在 CSV / Excel 单元格里变成 JSON 文本，结构化关系不在目标格式里重建',
        '文档与图片路线走的是语法着色查看器，不是数据表；键顺序与缩进按渲染结构决定',
        'JSON 里的 HTML 字符串不会被执行：渲染前经过净化，事件属性与脚本被移除',
      ],
      en: [
        'Table targets need a top-level array with at least one value to place; an empty array or an all-empty object fails explicitly',
        'Nested objects and arrays become JSON text inside a CSV / Excel cell, and the structure is not rebuilt by the target',
        'Document and image routes go through a syntax-coloured viewer rather than a table; key order and indentation follow the rendering',
        'HTML strings inside the JSON never execute: the rendering is sanitised, removing event attributes and scripts',
      ],
    },
    faq: [
      {
        q: { zh: '顶层是对象而不是数组，能转 Excel 吗？', en: 'Can a top-level object, not an array, become Excel?' },
        a: {
          zh: '表格路线要求数组。单个对象没有「行」的概念，转换会报「不是数组」。若对象里包着一个数组，先把它取出来存成 JSON 数组再转。',
          en: 'The table route needs an array. A single object has no notion of rows, so the conversion reports that the input is not an array. If an object wraps an array, extract that array into its own JSON file first.',
        },
      },
      {
        q: { zh: '嵌套对象会丢吗？', en: 'Are nested objects lost?' },
        a: {
          zh: '不会丢，但会变成文本。CSV / Excel 的一格里放不下层级，嵌套值被序列化成 JSON 字符串；需要逐层展开时，转 HTML 查看器或保持 JSON 格式更合适。',
          en: 'Not lost, but flattened into text. A CSV / Excel cell cannot hold a hierarchy, so a nested value is serialised as a JSON string. When the levels matter, the HTML viewer or keeping JSON is the better route.',
        },
      },
      {
        q: { zh: '数组里混了字符串和对象怎么办？', en: 'What if an array mixes strings and objects?' },
        a: {
          zh: '对象按各键成列，没有键的元素写进合成 `_value` 列。若恰好已有同名列，会改用 `_value_2` 之类不冲突的名字——两条数据都保留，不会覆盖。',
          en: 'Objects fill their own keys, and elements without keys go into a synthetic `_value` column. If a record already declares that name, a non-conflicting `_value_2` is used — both pieces of data survive.',
        },
      },
      {
        q: { zh: 'JSON 转 PDF 后能复制文字吗？', en: 'Can text be copied out of a JSON to PDF result?' },
        a: {
          zh: '不能。PDF 路线把语法着色后的查看器渲染成页面图像，文字不可选中。需要可复制的文本请选 TXT、HTML 或 Markdown。',
          en: 'No. The PDF route renders the syntax-coloured viewer into page images, so the text is not selectable. Choose TXT, HTML or Markdown when it has to stay copyable.',
        },
      },
    ],
    targets: {
      png: {
        zh: '整份 JSON 查看器渲染成一张长图，按页面布局换行；高度超过 32768 px 时失败并说明，不静默截断。',
        en: 'The whole JSON viewer is captured as one long image with layout-driven wrapping; past 32768 px of height it fails with an explanation rather than truncating.',
      },
      jpg: {
        zh: '按 A4 分页后逐页编码 JPEG，多页 ZIP；长 JSON 会跨很多页，适合分享快照。',
        en: 'It is sliced into A4 pages and encoded as JPEG, with several pages in a ZIP. Long JSON spans many pages, which suits sharing a snapshot.',
      },
      webp: {
        zh: '与 JPEG 相同的分页路径，终点 WebP；多页 ZIP，体积更小但对文字有损。',
        en: 'The same pagination as JPEG, encoded as WebP; several pages arrive as a ZIP, smaller but lossy on text.',
      },
    },
  },
  {
    from: 'png',
    slug: 'png',
    shot: 'batch-results',
    title: {
      zh: 'PNG 转换：全部可用目标',
      en: 'PNG conversions: every available target',
    },
    desc: {
      zh: '把 PNG 转成 JPEG、WebP、PDF、HTML 或 Markdown。图片没有文字层，所以文本与表格目标会被置灰并说明。',
      en: 'Convert PNG to JPEG, WebP, PDF, HTML or Markdown. An image has no text layer, so text and table targets are greyed out with a reason.',
    },
    lede: {
      zh: 'PNG 是像素，不是文字。要让图片进入文档世界，这份工具提供的是「把原始字节或重新编码的像素嵌进去」，不是 OCR。PNG 自身带透明度：转 JPEG 时铺白底，转 WebP 时保留 alpha，写进 PDF 时连同透明通道一起嵌入。',
      en: 'A PNG is pixels, not text. Where the tool moves an image into the document world it embeds the original bytes or the re-encoded pixels, never OCR. PNG carries transparency: JPEG flattens it onto white, WebP keeps the alpha, and the PDF embeds the PNG together with that channel.',
    },
    limits: {
      zh: [
        '没有 OCR：图片里就算有清晰的文字，也不会变成可编辑或可搜索的文本',
        '图片源格式到 TXT、CSV、JSON、Excel 的组合被 conversion-policy 置灰，界面会显示「图片没有文字层」',
        '超大图片按画布上限缩放，输出像素可能小于原图；上限在 image-utils 的 MAX_DIM',
        '转 JPEG 时透明区域铺白，这是有损画布路径的一部分；转 WebP 与 PDF 时 alpha 随像素保留',
      ],
      en: [
        'No OCR: even sharp text inside the picture does not become editable or searchable text',
        'Image sources to TXT, CSV, JSON and Excel are greyed out by conversion-policy, with the interface saying “an image has no text layer”',
        'Very large images scale to the canvas limit, so the output can carry fewer pixels than the source; the bound lives in image-utils as MAX_DIM',
        'JPEG flattens transparent areas onto white as part of its lossy canvas path; WebP and PDF keep the alpha with the pixels',
      ],
    },
    faq: [
      {
        q: { zh: 'PNG 里的文字能提取出来吗？', en: 'Can text inside a PNG be extracted?' },
        a: {
          zh: '不能。扩展不包含 OCR，图片对它是像素。需要文字时请先用 OCR 工具生成文本或带文字层的 PDF，再回到这里转换。',
          en: 'No. The extension bundles no OCR and treats a picture as pixels. Run an OCR tool first to produce text or a text-layer PDF, then come back to convert that.',
        },
      },
      {
        q: { zh: 'PNG 转 JPEG 会损失什么？', en: 'What is lost converting PNG to JPEG?' },
        a: {
          zh: '透明度变成白底，像素经过有损压缩，线条与文字边缘可能出现振铃。需要无损或需要 alpha 时请转 WebP，或保留 PNG。',
          en: 'Transparency becomes white, pixels go through lossy compression, and edges around lines and text can ring. Use WebP when losslessness or alpha matters, or keep the PNG.',
        },
      },
      {
        q: { zh: 'PNG 转 PDF 是什么样的一页？', en: 'What does a PNG to PDF page look like?' },
        a: {
          zh: '页面尺寸取图片自身的宽高比与像素（按 96 DPI 换算成点），不套 A4；PNG 的透明通道随原字节一起嵌入，PDF 里是整张图，没有文字层。',
          en: 'The page takes the image’s own aspect ratio and pixels, converted at 96 DPI rather than forced onto A4; the PNG’s alpha channel travels with its bytes. The PDF holds the picture as a whole and no text layer.',
        },
      },
      {
        q: { zh: '转 HTML 会把图片重新压缩吗？', en: 'Does PNG to HTML recompress the image?' },
        a: {
          zh: '不会。原始字节以 base64 data URI 嵌进 `<img>`，像素与源文件一致；HTML 体积约为图片的 4/3。',
          en: 'No. The original bytes are embedded in `<img>` as a base64 data URI, so the pixels match the source; the HTML grows to roughly 4/3 of the image size.',
        },
      },
    ],
    targets: {
      md: {
        zh: '图片以 data URI 内嵌进 HTML，再转成 Markdown 图片语法；整张图的 base64 会写进 .md，文件自包含但体积明显增大。',
        en: 'The picture is embedded in HTML as a data URI and then written as Markdown image syntax; the whole base64 payload lands in the .md, self-contained but noticeably larger.',
      },
      docx: {
        zh: '图片以 data URI 放进 HTML，再交给 Word：文档里是一张位图，没有文字层；体积按 base64 膨胀，长图会撑高页面。',
        en: 'The picture travels as a data URI through HTML into Word: the document holds a bitmap with no text layer, and the base64 payload inflates the file.',
      },
    },
  },
  {
    from: 'jpg',
    slug: 'jpg',
    shot: 'batch-results',
    title: {
      zh: 'JPEG 转换：全部可用目标',
      en: 'JPEG conversions: every available target',
    },
    desc: {
      zh: '把 JPEG 转成 PNG、WebP、PDF、HTML 或 Markdown。没有文字层，也没有透明通道；文本与表格目标会被置灰。',
      en: 'Convert JPEG to PNG, WebP, PDF, HTML or Markdown. There is no text layer and no alpha channel; text and table targets are greyed out.',
    },
    lede: {
      zh: 'JPEG 在拍摄那一刻就丢掉了透明与一部分高频细节，之后的每条路线只能决定要不要再丢一次。转 PNG 或 WebP 不会恢复细节；写进 PDF 会按图片自身尺寸建页，不套 A4。若需要图里的文字，唯一诚实的答案是先做 OCR。',
      en: 'A JPEG already gave up transparency and some high-frequency detail when it was captured; every route from here only decides whether to lose more. Converting to PNG or WebP does not restore detail, and writing to PDF builds a page at the image’s own size rather than A4. If the words inside matter, the honest answer is OCR first.',
    },
    limits: {
      zh: [
        '没有 OCR，也没有文字层；JPEG 里的文字只是像素',
        '图片源格式到 TXT、CSV、JSON、Excel 的组合被 conversion-policy 置灰并说明原因',
        '转 PNG 是无损容器装已有像素，不会提高清晰度；源文件的大小编码损失无法撤销',
        '超大图按 MAX_DIM 缩放，转 PDF 时页面尺寸也随之缩小',
      ],
      en: [
        'No OCR and no text layer; words in a JPEG are pixels',
        'Image sources to TXT, CSV, JSON and Excel are greyed out by conversion-policy, with the reason shown',
        'PNG is a lossless container for pixels that already exist, not a sharpness upgrade; the source’s encoding loss cannot be undone',
        'Very large images scale to MAX_DIM, and the PDF page size shrinks with them',
      ],
    },
    faq: [
      {
        q: { zh: 'JPEG 转 PNG 会变清晰吗？', en: 'Does JPEG to PNG become sharper?' },
        a: {
          zh: '不会。转换只是把已有像素放进无损容器，压缩造成的块效应与模糊已经写在像素里。要提升清晰度需要原始未压缩图像或超分辨率工具。',
          en: 'No. The conversion puts existing pixels into a lossless container; the blocking and blur from compression are already in those pixels. A sharper result needs the original uncompressed image or a super-resolution tool.',
        },
      },
      {
        q: { zh: 'JPEG 转 WebP 值得吗？', en: 'Is JPEG to WebP worth it?' },
        a: {
          zh: '通常能减小体积，但这是一次再编码，细节会再损失一点。若原图是高质量 JPEG 且要长期保存，转 PNG 做无损封装更稳；若目标是网页加载，WebP 的体积优势更实际。',
          en: 'It usually saves bytes, but it is a re-encode and gives up a little more detail. For a high-quality JPEG kept long term, wrapping the pixels in PNG is safer; for web delivery, WebP’s size advantage is the practical win.',
        },
      },
      {
        q: { zh: 'JPEG 转 PDF 是 A4 吗？', en: 'Is a JPEG to PDF page A4?' },
        a: {
          zh: '不是。页面按图片自身的宽高与像素建（96 DPI 换算成点），横图得到横向页面、竖图得到纵向页面；整张图铺满一页。',
          en: 'No. The page is built from the image’s own dimensions and pixels at 96 DPI: a landscape image gets a landscape page and a portrait one a portrait page, with the picture filling it.',
        },
      },
      {
        q: { zh: '能把多张 JPEG 分别转成 PDF 吗？', en: 'Can several JPEGs each become a PDF?' },
        a: {
          zh: '能。同一批次里每个文件各出一份 PDF，整批共用一个目标格式；需要一次下载就打 ZIP。当前版本不会把多张图合并成一份 PDF。',
          en: 'Yes. Each file in the batch produces its own PDF under one shared target, and a ZIP collects them in one download. This version does not merge several images into a single PDF.',
        },
      },
    ],
    targets: {
      md: {
        zh: '图片以 data URI 内嵌后转成 Markdown 图片语法：base64 写进 .md，文件自包含但体积膨胀；没有 OCR，不会产生文字。',
        en: 'The picture is embedded as a data URI and written as Markdown image syntax: the base64 payload lands in the .md, self-contained but larger. There is no OCR, so no text appears.',
      },
      html: {
        zh: '整张图的原始字节以 data URI 嵌入 HTML，`alt` 取文件名；不重新编码，所以像素与源文件一致，HTML 体积约为图片的 4/3。',
        en: 'The original bytes are embedded in HTML as a data URI with the file name as `alt`; nothing is re-encoded, so the pixels match the source and the HTML grows to about 4/3 of the image size.',
      },
      docx: {
        zh: '经 data URI 放进 Word：文档里是位图，没有可编辑文字；不重编码，按原像素嵌入。',
        en: 'The data URI travels into Word: the document holds a bitmap with no editable text, embedded at its original pixels without re-encoding.',
      },
    },
  },
  {
    from: 'webp',
    slug: 'webp',
    shot: 'batch-results',
    title: {
      zh: 'WebP 转换：全部可用目标',
      en: 'WebP conversions: every available target',
    },
    desc: {
      zh: '把 WebP 转成 PNG、JPEG、PDF、HTML 或 Markdown。浏览器能解码，也能把它作为目标格式重新编码。',
      en: 'Convert WebP to PNG, JPEG, PDF, HTML or Markdown. The browser decodes it and can also re-encode it as a target format.',
    },
    lede: {
      zh: 'WebP 是浏览器原生支持的现代图片格式，可以是无损也可以是有损，还可能是多帧动画。这份工具能把它当作源：解码成画布后转成 PNG / JPEG / PDF；但写进文档的路线只嵌入原始字节，接收方能不能显示取决于那个工具。',
      en: 'WebP is a modern image format the browser handles natively; it can be lossless or lossy, and it can carry several frames. This tool uses it as a source — decoded onto a canvas for PNG, JPEG or PDF — while document routes embed the original bytes, leaving display support to the receiving tool.',
    },
    limits: {
      zh: [
        '没有 OCR；图片到 TXT、CSV、JSON、Excel 的组合被置灰并说明',
        '转 PNG 是无损封装，不会恢复有损 WebP 已经丢掉的细节',
        '多帧 WebP 会按单帧处理；动画与后续帧不保留（本轮不做动图输入）',
        '文档路线嵌入原始 WebP 字节，Word 与多数 Markdown 阅读器对它的支持并不一致',
      ],
      en: [
        'No OCR; image to TXT, CSV, JSON and Excel are greyed out with a reason',
        'PNG is a lossless container and does not restore detail a lossy WebP already lost',
        'A multi-frame WebP is treated as one frame; the animation and later frames are not kept (animated input is out of scope this round)',
        'Document routes embed the original WebP bytes, and support in Word and most Markdown readers is inconsistent',
      ],
    },
    faq: [
      {
        q: { zh: 'WebP 转 PNG 会更大吗？', en: 'Will WebP to PNG be larger?' },
        a: {
          zh: '通常会。PNG 是无损容器，WebP 的压缩优势在这里消失；若原图很大，输出可能显著变大。需要体积时请转 JPEG，或保留 WebP。',
          en: 'Usually yes. PNG is a lossless container, so WebP’s compression advantage disappears and a large source can produce a much larger file. For size, choose JPEG or keep the WebP.',
        },
      },
      {
        q: { zh: '能转多帧 WebP 动画吗？', en: 'Can an animated WebP be converted?' },
        a: {
          zh: '只会取一帧。当前版本没有把多帧 WebP 当作动画输入，也不提供丢帧披露；需要保留动画时请留在 WebP。',
          en: 'Only one frame is taken. This version does not treat multi-frame WebP as animated input and gives no frame-loss disclosure; keep it as WebP to preserve the animation.',
        },
      },
      {
        q: { zh: 'WebP 放进 Word 会显示吗？', en: 'Will a WebP display inside Word?' },
        a: {
          zh: '取决于 Word 的版本与平台。转换器按原始字节嵌入，不转码；要保证显示，先转成 PNG 或 JPEG 再写入文档。',
          en: 'It depends on the Word version and platform. The converter embeds the original bytes without transcoding; to guarantee display, convert to PNG or JPEG before building the document.',
        },
      },
      {
        q: { zh: '转 PDF 的页面尺寸怎么定？', en: 'How is the PDF page size decided?' },
        a: {
          zh: '取图片自身的宽高（按 96 DPI 换算成点），整张图铺满一页，透明处铺白；不是 A4，也不裁切。',
          en: 'From the image’s own dimensions at 96 DPI: the picture fills one page with transparency filled white. It is not A4 and nothing is cropped.',
        },
      },
    ],
    targets: {
      md: {
        zh: 'WebP 原始字节以 data URI 进入 Markdown 图片语法；许多 Markdown 阅读器不认 WebP 的 data URI，能否显示取决于目标工具。',
        en: 'The original WebP bytes enter Markdown image syntax as a data URI; many Markdown readers do not accept WebP data URIs, so display depends on the tool reading it.',
      },
      html: {
        zh: '原样嵌入 WebP 的 data URI，浏览器能直接显示；不转码、不重编码，像素与源文件一致。',
        en: 'The WebP data URI is embedded as-is and the browser displays it directly; nothing is transcoded or re-encoded, so the pixels match the source.',
      },
    },
  },
  {
    from: 'bmp',
    slug: 'bmp',
    shot: 'batch-results',
    title: {
      zh: 'BMP 转换：全部可用目标',
      en: 'BMP conversions: every available target',
    },
    desc: {
      zh: '把 BMP 转成 PNG、JPEG、WebP、PDF、HTML、Markdown 或 Word。BMP 只能作为输入，浏览器没有它的编码器。',
      en: 'Convert BMP to PNG, JPEG, WebP, PDF, HTML, Markdown or Word. BMP is input-only: the browser ships no BMP encoder.',
    },
    lede: {
      zh: 'BMP 是接近原始像素的容器，文件大、没有压缩、通常也没有透明通道。它能被浏览器读进来，却不能被浏览器写出去，所以它只出现在源格式这一侧。转 PNG 是最接近无损的出路，转 JPEG 或 WebP 则用体积换细节。',
      en: 'BMP is close to raw pixels: large, uncompressed and usually without transparency. Browsers read it but cannot write it, which is why it only appears as a source. PNG is the closest lossless exit; JPEG and WebP trade detail for size.',
    },
    limits: {
      zh: [
        'BMP 不是可写格式：工作台只允许它作为源，目标列表里不会出现它',
        '没有 OCR；图片到 TXT、CSV、JSON、Excel 的组合被置灰并说明',
        'BMP 的原始字节很大，内嵌进 HTML / Word 时按 base64 再膨胀约三分之一',
        '转 PDF 会解码、铺白底并按图片尺寸建页；不是 A4，也不是可编辑表格',
      ],
      en: [
        'BMP is not writable: the workbench only offers it as a source and never as a target',
        'No OCR; image to TXT, CSV, JSON and Excel are greyed out with an explanation',
        'BMP bytes are large, and embedding them in HTML or Word adds about a third again through base64',
        'PDF decodes, fills white and builds a page at the image size; it is neither A4 nor an editable table',
      ],
    },
    faq: [
      {
        q: { zh: '为什么不能转成 BMP？', en: 'Why can there be no BMP output?' },
        a: {
          zh: '因为浏览器不提供 BMP 编码器，扩展也不捆绑一个。硬写一个编码器会让产物多出几十 KB，只为一种几乎没人要求的输出；BMP 只作为输入存在。',
          en: 'Because browsers ship no BMP encoder and the extension does not bundle one. Writing one would add tens of kilobytes for an output almost nobody asks for, so BMP stays an input format.',
        },
      },
      {
        q: { zh: 'BMP 转 PNG 是无损的吗？', en: 'Is BMP to PNG lossless?' },
        a: {
          zh: '像素本身是无损的：解码后按原尺寸重新编码成 PNG，没有有损压缩步骤。但超过 MAX_DIM 的图会先缩放，那一部分损失发生在画布上限。',
          en: 'The pixels are lossless: the image is decoded and re-encoded at its original size with no lossy step. An image beyond MAX_DIM is scaled first, and that loss comes from the canvas bound.',
        },
      },
      {
        q: { zh: 'BMP 带透明吗？', en: 'Can a BMP carry transparency?' },
        a: {
          zh: '常见的 24/32 位 BMP 可能带 alpha，但浏览器解码与这条管线的处理按不透明处理：转 JPEG、WebP 或 PDF 时透明区域铺白。',
          en: 'A 24- or 32-bit BMP may carry alpha, but browser decoding and this pipeline treat it as opaque: transparent areas are filled white for JPEG, WebP and PDF.',
        },
      },
      {
        q: { zh: '转 Markdown 会内嵌整张图吗？', en: 'Does BMP to Markdown embed the whole image?' },
        a: {
          zh: '会。原始 BMP 字节以 base64 data URI 写进图片语法，文件自包含但会很大，而且很多阅读器不认 BMP 的 data URI。想稳妥预览请先转 PNG。',
          en: 'Yes. The original BMP bytes go into image syntax as a base64 data URI: self-contained but large, and many readers do not accept a BMP data URI. Convert to PNG first for a reliable preview.',
        },
      },
    ],
    targets: {
      md: {
        zh: 'BMP 原始字节内嵌成 data URI 再转 Markdown 图片语法；多数阅读器不认 BMP 的 data URI，链接可能显示为破图。',
        en: 'The original BMP bytes are embedded as a data URI and written as Markdown image syntax; most readers do not accept a BMP data URI, so the image may show as broken.',
      },
      html: {
        zh: '原样嵌入 BMP 的 data URI；浏览器可以显示，但 BMP 通常比 PNG / JPEG 大得多，HTML 也会跟着变大。',
        en: 'The BMP data URI is embedded as-is: the browser displays it, but BMP is usually far larger than PNG or JPEG, and the HTML grows with it.',
      },
      docx: {
        zh: 'Word 对 BMP 支持良好，文档里是一张位图；不重编码，体积随原文件。',
        en: 'Word supports BMP well, so the document holds a bitmap; nothing is re-encoded and the size follows the source.',
      },
      pdf: {
        zh: 'BMP 解码后铺白底、编码成 PNG 再写入 PDF；每张图占一页，页面尺寸取图片本身，不是 A4。',
        en: 'The BMP is decoded, filled white, encoded as PNG and written to PDF: one image per page, with the page sized to the picture rather than A4.',
      },
      webp: {
        zh: 'BMP 先解码成画布再编码 WebP；不存在透明通道，白底不会被写入，有损参数沿用工作台的 WebP 输出设置。',
        en: 'The BMP is decoded onto a canvas and encoded as WebP; there is no alpha to keep, so the white fill is not written, and lossy settings follow the workbench WebP options.',
      },
    },
  },
  {
    from: 'gif',
    slug: 'gif',
    shot: 'batch-results',
    title: {
      zh: 'GIF 转换：全部可用目标',
      en: 'GIF conversions: every available target',
    },
    desc: {
      zh: '把 GIF 转成 PNG、JPEG、WebP、PDF、HTML、Markdown 或 Word。只取首帧，动画不保留，结果会明确披露。',
      en: 'Convert GIF to PNG, JPEG, WebP, PDF, HTML, Markdown or Word. Only the first frame is used, the animation is not kept, and the result says so.',
    },
    lede: {
      zh: 'GIF 既能是静态图，也能是动画。这份工具按静态图处理：解码第一帧，丢掉其余帧。是否真的丢帧由 `hasMultipleFrames` 读取块结构后决定，所以单帧 GIF 不会被误报成有损。需要动画本身时，正确的做法是继续用 GIF 或改用视频格式。',
      en: 'A GIF can be a still image or an animation. This tool treats it as a still: it decodes the first frame and drops the rest. Whether frames were actually lost is decided by `hasMultipleFrames`, which walks the block structure, so a single-frame GIF is not falsely reported as lossy. When the animation itself matters, keep the GIF or move to a video format.',
    },
    limits: {
      zh: [
        '只取首帧，动画与后续帧不保留；多帧文件会在结果卡上给出丢帧披露',
        'GIF 不是可写格式：浏览器不提供 GIF 编码器，它只作为源格式出现',
        '没有 OCR；图片到 TXT、CSV、JSON、Excel 的组合被置灰并说明',
        'GIF 的索引色与透明在画布路径上重新解释：转 JPEG 与 PDF 时透明铺白，转 PNG / WebP 时 alpha 随画布保留',
      ],
      en: [
        'Only the first frame survives; a multi-frame file gets a frame-loss disclosure on the result card',
        'GIF is not writable: browsers ship no GIF encoder, so it only appears as a source',
        'No OCR; image to TXT, CSV, JSON and Excel are greyed out with a reason',
        'GIF’s indexed colour and transparency are reinterpreted on the canvas path: transparent areas become white for JPEG and PDF, and follow the canvas result for PNG / WebP',
      ],
    },
    faq: [
      {
        q: { zh: '动画 GIF 会动吗？', en: 'Will an animated GIF stay animated?' },
        a: {
          zh: '不会。目标是静态格式时只取第一帧，其余帧丢弃，结果卡会说明这一点；HTML 与 Markdown 路线嵌入的是原始 GIF 字节，浏览器可能仍会播放，但这条路线不转码也不能保证接收端支持。',
          en: 'No. Static targets take the first frame and drop the rest, and the result card says so. The HTML and Markdown routes embed the original GIF bytes, which a browser may still animate, but that route does not transcode and cannot guarantee support at the other end.',
        },
      },
      {
        q: { zh: '为什么单帧 GIF 没有丢帧提示？', en: 'Why is there no frame-loss note for a single-frame GIF?' },
        a: {
          zh: '因为披露只在真的丢帧时出现。转换器读取 GIF 的块结构，数到第二个 image descriptor 才判定为多帧；单帧文件没有可丢的东西，就不写这句废话。',
          en: 'Because the disclosure only appears when frames are actually lost. The converter walks the block structure and counts a second image descriptor before calling the file multi-frame; a single-frame file has nothing to lose, so the sentence is not written.',
        },
      },
      {
        q: { zh: 'GIF 转 WebP 能保留透明吗？', en: 'Does GIF to WebP preserve transparency?' },
        a: {
          zh: '首帧的透明像素会随画布进入 WebP，编码器保留 alpha；转 JPEG 或 PDF 则一定铺白。无论哪种，动画都已不在。',
          en: 'Transparent pixels of the first frame enter the canvas and then WebP, which keeps the alpha; JPEG and PDF always fill white. Either way, the animation is gone.',
        },
      },
      {
        q: { zh: '能把 GIF 转成视频吗？', en: 'Can a GIF become a video?' },
        a: {
          zh: '不能。目标格式里没有视频容器，这份工具也不捆绑编码器。需要视频时请用专门的转码工具；这里能提供的是首帧的静态图或一页 PDF。',
          en: 'No. There is no video container among the targets and this tool bundles no video encoder. Use a dedicated transcoder for video; what this offers is the first frame as a still or as one PDF page.',
        },
      },
    ],
    targets: {
      md: {
        zh: 'GIF 首帧的原始字节内嵌成 data URI 再转 Markdown；动画与其余帧不保留，多数阅读器也不认 GIF 的 data URI。',
        en: 'The original bytes of the first frame are embedded as a data URI and written as Markdown; the animation and later frames do not survive, and most readers do not accept a GIF data URI.',
      },
      html: {
        zh: 'GIF 原始字节嵌入 HTML：浏览器里会播放原动画，但这条路径不转码，也不保证离线阅读端能取到帧。',
        en: 'The original GIF bytes are embedded in HTML: a browser plays the animation, but this path does not transcode and cannot guarantee another reader will find the frames.',
      },
      docx: {
        zh: '写入 Word 的是首帧位图，动画丢失；多帧文件的结果会带「丢帧」披露。',
        en: 'Word receives a bitmap of the first frame and the animation is lost; a multi-frame source carries the frame-loss disclosure on its result.',
      },
      webp: {
        zh: '取首帧后编码 WebP，动画不保留；透明像素按输出设置处理，多帧文件的结果带丢帧披露。',
        en: 'The first frame is encoded as WebP and the animation is not kept; transparent pixels follow the output settings, and a multi-frame source carries the frame-loss disclosure.',
      },
    },
  },
  {
    from: 'svg',
    slug: 'svg',
    shot: 'batch-results',
    title: {
      zh: 'SVG 转换：全部可用目标',
      en: 'SVG conversions: every available target',
    },
    desc: {
      zh: '把 SVG 转成 PNG、JPEG、WebP、PDF、HTML、Markdown 或 Word。矢量输出不可写，栅格化后才有图片与文档。',
      en: 'Convert SVG to PNG, JPEG, WebP, PDF, HTML, Markdown or Word. Vector output is not writable, so images and documents come from rasterising it.',
    },
    lede: {
      zh: 'SVG 是代码描述的图形，不是像素。写进 HTML 时它保持矢量，但脚本、事件处理器与远程引用会在净化时被剥离；转成图片、PDF 或 Word 时先栅格化成 PNG，于是缩放不再无损。浏览器不能写 SVG，所以它只能作为源格式。',
      en: 'An SVG describes a drawing in code rather than pixels. Written into HTML it stays vector, but scripts, event handlers and remote references are stripped during sanitisation; turning it into an image, PDF or Word rasterises it to PNG first, so scaling stops being lossless. Browsers cannot write SVG, which is why it is source-only.',
    },
    limits: {
      zh: [
        'SVG 不是可写格式：目标列表里不会出现它，转换只能从它出发',
        '脚本、内联事件、外部 `<use>` 与远程图片在净化或栅格化前被剥离；动效与交互不会保留',
        '转图片、PDF、Word 都经过 PNG 栅格化：矢量边缘变成像素，缩放不再无损',
        '没有 OCR；图片到 TXT、CSV、JSON、Excel 的组合被置灰并说明',
      ],
      en: [
        'SVG is not writable: it never appears as a target, only as a starting point',
        'Scripts, inline events, external `<use>` and remote images are stripped before sanitising or rasterising; animation and interaction do not survive',
        'Images, PDF and Word go through PNG rasterisation: vector edges become pixels and scaling stops being lossless',
        'No OCR; image to TXT, CSV, JSON and Excel are greyed out with a reason',
      ],
    },
    faq: [
      {
        q: { zh: 'SVG 里的脚本会执行吗？', en: 'Do scripts inside an SVG run?' },
        a: {
          zh: '不会。SVG 在进入 HTML 或栅格化之前先被净化：`<script>`、事件属性、外部引用与 `javascript:` 地址全部移除。图形保留，行为不保留。',
          en: 'No. The SVG is sanitised before it enters HTML or a rasteriser: `<script>`, event attributes, external references and `javascript:` URLs are all removed. The drawing stays; the behaviour does not.',
        },
      },
      {
        q: { zh: 'SVG 转 PNG 会变模糊吗？', en: 'Does SVG to PNG become blurry?' },
        a: {
          zh: '栅格化后就是位图，放大到超过栅格尺寸才会模糊；输出时按画布与 MAX_DIM 决定像素。要无限缩放，请继续使用 SVG。',
          en: 'Once rasterised it is a bitmap, and blur appears only when it is scaled beyond the raster size. The output pixels follow the canvas and MAX_DIM. For unlimited scaling, keep the SVG.',
        },
      },
      {
        q: { zh: 'SVG 转 HTML 还是矢量的吗？', en: 'Is SVG to HTML still vector?' },
        a: {
          zh: '是。净化后的 SVG 标记直接进入 HTML，浏览器按矢量渲染；远程字体、图片与脚本引用被剥离，所以外观可能与原页面不同。',
          en: 'Yes. The sanitised SVG markup goes straight into the HTML and the browser renders it as vector. Remote fonts, images and script references are stripped, so it can look different from the original page.',
        },
      },
      {
        q: { zh: '图表里的文字能编辑吗？', en: 'Is text inside a chart editable?' },
        a: {
          zh: '转 HTML 时它仍是 SVG 文本，能在源码里改；转成 PNG、PDF 或 Word 后就是像素，没有文字层。需要可编辑的图表文字，请选 HTML 或保留 SVG 源文件。',
          en: 'In HTML it remains SVG text and can be edited in the source. As PNG, PDF or Word it is pixels with no text layer. For editable chart labels, choose HTML or keep the SVG source.',
        },
      },
    ],
    targets: {
      md: {
        zh: 'SVG 先栅格化成 PNG 再嵌入 HTML，最后转成 Markdown 图片语法：矢量结构丢失，得到的是位图；含远程资源的引用不会下载。',
        en: 'The SVG is rasterised to PNG, embedded in HTML and written as Markdown image syntax: the vector structure is replaced by a bitmap, and remote references are not downloaded.',
      },
      docx: {
        zh: 'SVG 栅格化为 PNG 后写入 Word：文档里是位图，失去缩放无损性；脚本与外链在栅格化前被剥离。',
        en: 'The SVG is rasterised to PNG and written to Word: the document holds a bitmap that no longer scales losslessly, with scripts and external links stripped before rasterising.',
      },
    },
  },
];
