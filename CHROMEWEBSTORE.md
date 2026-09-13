# Chrome Web Store Listing — Transfer Any File

> Last Updated: 2026-09-13
> Status: **not published yet.** This repo has no store listing to optimise — `manifest.json` carries no `key`, the README only documents "Load unpacked", and there is no extension ID anywhere in the tree. This file is the publish-ready asset pack: copy each field into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole), and keep it updated whenever permissions, features or graphics change.
>
> Re-checked 2026-09-08: the GitHub Pages site **is live** (`https://liaolongdong.github.io/transfer-any-file/` and
> `/privacy.html` both answer `HTTP/2 200`), and the repository exists as `liaolongdong/transfer-any-file` — but its
> About block is still empty (`description: null`, `homepage: null`, `topics: []`), so the `repo-meta.yml` step has
> never run. The remaining manual gaps are the store account itself and that About block.

Revised 2026-09-12/13 (all figures below measured from this file with a script, not estimated): the English name was extended to 57 characters with an image keyword and **reverted to 49 the same round** — see _Extension Name_ for the measurements that decided it; the Chinese name was introduced at 33/75 (it has no earlier value — the section itself is new). A COMMON CONVERSIONS / 常用转换 block was added to both detailed descriptions in this round, because the route phrases users type — "markdown to pdf", "csv to excel", "png to webp" — appeared nowhere in them, and then **cut back the same round** from one dense prose paragraph to five category bullets: the block now names **31 of the 116 selectable pairs** (711 characters EN / 391 ZH), and whole-description format-token density fell from **93 → 73** occurrences in English and **95 → 77** in Chinese, where the peak single token is `PDF` at 13. The complete per-format matrix — every direct edge, every multi-step target and every greyed pair with its reason — now lives on the product page, which can carry that enumeration without any listing-policy exposure. Finally, the privacy line "makes no network requests of any kind" was reworded into the behaviourally verifiable form, so it still stands up to a reviewer checking with a proxy.

Revised 2026-09-11: the Chinese short description was extended into its unused characters, a QUESTIONS / 常见问题 section was added to both detailed descriptions, the listing screenshots are now generated with a caption bar in both English and Chinese, and the repository topics were expanded to the full 20-topic budget.

**Character counts below are measured, not estimated** — re-measure after any edit with `pnpm verify:listing`, which
prints every paste field against its real limit and fails if the sheet drifts from `wxt.config.ts`, `package.json` or
`.github/repo-metadata.json`. The store rejects over-length fields silently in some locales — it truncates rather than
erroring — so a field that grows 3 characters can reach production as a cut-off sentence.

---

## Submission worksheet (提交速查)

The whole dashboard, in tab order, with nothing to decide while you are filling it in. Short fields are verbatim and
safe to paste; everything long is referenced by section so this block cannot drift from the copy it points at.

**Pre-flight, from the repository** — all four must pass before you touch the dashboard:

```bash
pnpm verify:listing   # every field below is inside its limit and agrees with manifest/package/repo-metadata
pnpm verify:offline   # first-party source issues no network request; manifest is storage-only
pnpm build            # the artifact you upload
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # HTTP/2 200, or the submit button is dead
```

### Tab 1 — Store listing

| Field             | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| Name              | below — 49/75, and it must equal `wxt.config.ts → manifest.name`              |
| Short description | below — 129/132, and it must equal `manifest.description`                     |
| Full description  | _Detailed Description_ → the English fenced block (6,939 measured characters) |
| Category          | `Productivity`                                                                |
| Languages         | English only until the _Locale gate_ is resolved                              |

```
Transfer Any File — Offline File Format Converter
```

```
Convert 14 file formats locally in your browser: Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. Batch, offline, no uploads.
```

Chinese (China) — three gated fields, in _Store Listing_ above each heading: name 33/75, short description 98/132,
detailed description 2,832 characters. Paste them only if the uploaded package ships `_locales/zh_CN/`; otherwise the
dashboard has no tab to paste them into.

### Tab 2 — Screenshots & icon

Icon: `public/icon/128.png`. Screenshots: five, in this order, from `docs/assets/store/screens/` —
`screen-01-workbench`, `02-batch`, `03-zip`, `04-preview`, `05-history`. Leave `06-dark-mode` out (five is the
maximum and it is the weakest evidence). Then the promo tiles in _Graphics & Assets_ — one set, promo tiles cannot be
localized. Captions are already burned into the PNGs; the dashboard has no caption field.

### Tab 3 — Privacy practices

| Question                             | Answer                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Single purpose                       | paste the one-liner from _Store Listing → Single Purpose_              |
| Permission justification (`storage`) | paste from _Permissions Justification_                                 |
| Does this item handle user data?     | **Yes** — see _Data handling_ below, do not answer "no data collected" |
| Privacy policy URL                   | `https://liaolongdong.github.io/transfer-any-file/privacy.html`        |
| Limited Use certifications           | the four ticks in _Data Use Certification_                             |

The two fields most likely to be typed badly at 11pm, verbatim:

```
Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
```

```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

On the data-declaration question, tick the types that match reality (user files; the app-activity line for local
history) and write in the description field:

```
Files are read into the extension page's memory, converted there, and returned to the user as a download. Conversion history and preferences are stored locally via chrome.storage.local. No data is transmitted, uploaded, synced or shared with anyone, including the developer; there is no server.
```

### Tab 4 — Distribution

Public · all regions · default price (free). The 32-character item ID appears here; keep it out of git and put it in
the `CHROME_EXTENSION_ID` secret described in _Hand-over to automation_.

### Reviewer notes (optional, saves a round-trip)

```
No account or login is required. After installing, click the toolbar icon: the converter opens as a tab. Test the round trip with any .md or .csv file — the result downloads locally. The extension works with networking disabled.
```

### Two things to settle before the $5

1. **The locale gate.** Without `_locales/` in the package there is no Chinese listing tab, for an extension whose UI
   defaults to Chinese and whose primary audience is Chinese-reading. That is a manifest change, not a paste — see
   _Locale gate_.
2. **Publisher name.** _Developer Info_ leaves it to you; it is public on the listing and it is the account-holder's
   name or organisation as Google bills it.

---

## Store Listing

**Extension Name** [REQUIRED] — 49 chars, limit 75

```
Transfer Any File — Offline File Format Converter
```

> Set to 57 characters on 2026-09-12 by adding `& Image`, and **reverted to 49 in the same round**. Three
> measurements decided it, and the first one is the reason the earlier rationale ("26 characters of the budget
> were going unused") was not a real argument:
>
> - **Length.** Every competitor listing measured in this category fits in 44 characters, so the 75-character
>   ceiling is not a budget to spend — it is a maximum nobody in the category approaches. At 49 this name is
>   already the longest on the results page.
> - **The exact term is not winnable.** `image converter` belongs to listings with 100,000+ users. Adding a token
>   you cannot rank for at zero installs buys nothing, and the image family is already named three times over where
>   it is indexed: `images` in the short description, the six formats in the detailed description's image bullet,
>   and `image-conversion` in the repository topics.
> - **What Google actually says about this field** is the opposite of a keyword-budget instruction: _"Shorter
>   titles are easier to remember and stand out in the store"_ and _"Do not stuff the title with keywords"_. There
>   is no published ranking weight for the name field, so the claim this section used to make was folklore.
>
> One noun phrase, not a list — and the remaining budget stays empty on purpose. A format-enumerating variant
> (`…Converter for Word, PDF and Images`, 74 measured characters) was considered and rejected: it is the exact shape
> the keyword-spam policy describes (that text warns against symbols and against "feature lists or descriptions",
> so spelled-out words are the safer half of the compromise), and it truncates in the browser's own extension
> surfaces. Enumerating everything is not even an option to weigh — naming all seven convertibility classes runs to
> 103 characters, past the 75-character field itself.

> Renamed on 2026-09-06 from `File Any Transfer`, for two reasons: the old name carried no word for _conversion_ or _format_, so a search for either could not reach it, while generic names in this category (`File Converter`, `ConvertX`, `FileForge`, `FileConverter`) are already held by high-volume projects; and `File Any Transfer` reads to an English speaker as the verb phrase "file any transfer" (≈ submit a transfer request), which never connected to format conversion. The word order fix keeps every original word.
>
> | Where                                                                 | Value                                                                                                                                                                                                                                                                                                                                                                                                          |
> | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Store listing / `wxt.config.ts → manifest.name`                       | `Transfer Any File — Offline File Format Converter`                                                                                                                                                                                                                                                                                                                                                            |
> | In-app brand (`utils/i18n/*.ts → appName`), tab title, promo graphics | `Transfer Any File`                                                                                                                                                                                                                                                                                                                                                                                            |
> | GitHub repo                                                           | `transfer-any-file` — matches the brand, the npm package name and this listing, so CWS / GitHub / Pages / npm resolve to **one entity**. The repository has since been created and pushed under this account, so the slug is fixed; GitHub search coverage comes from the About description + topics rather than the slug. The local working directory name is irrelevant to the repo name and may stay as-is. |

### ⚠️ Locale gate — every `Chinese (China)` field below needs a code change first

Google localises a listing only into locales the **package** declares: _"Each locale corresponds to one of the
`_locales/LOCALE_CODE` directories included in the extension."_ This extension has no `_locales/` at all — its
Chinese/English switching is in-app Vue state (`composables/useI18n.ts`), invisible to the manifest — so today the
dashboard's language dropdown offers **one** language, and `Chinese (China)` cannot be added from the listing page.
The item **name** compounds it: the dashboard reads it from the manifest, so a Chinese name is only reachable by
putting `__MSG_extensionName__` in `wxt.config.ts` and the string in `_locales/zh_CN/messages.json`.

Two ways forward, and the choice is not mine to make in a document:

| Option                           | What it takes                                                                                                                                         | Consequence                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ship the English listing now** | Nothing. Paste the three EN fields, skip the three ZH ones.                                                                                           | The ZH copy below stays unused. The in-app UI still defaults to Chinese for the primary audience — only the store page is English.                                                                                                                                                                                                          |
| **Add a Chinese locale**         | `default_locale: "en"` + `_locales/en/messages.json` + `_locales/zh_CN/messages.json`, with manifest `name` and `description` moved into `__MSG_*__`. | Unlocks the `Chinese (China)` tab **and** localises what Chrome itself shows (extensions page, install prompt) for users on a Chinese browser UI. Touches the manifest and the metadata-sync chain (`verify:meta` compares manifest ↔ `package.json` ↔ `repo-metadata.json`), so it is a code change with its own review, not a copy-paste. |

Either way, promo tiles are unaffected: _"Small promo tiles and marquee promo tiles cannot be localized."_ One
English promo set is correct. The detailed descriptions below stay **duplicated in both languages in this file** so
option two is a packaging decision rather than a rewrite.

**Chinese (China) extension name** — 33 chars, limit 75

```
Transfer Any File — 离线文件格式与图片转换扩展
```

Needed by the `Chinese (China)` tab described above, which does not exist until the package ships `_locales/zh_CN`.
The brand token stays untranslated (`utils/i18n/zh.ts → appName` is also `Transfer Any File`).

The keyword phrase after the em dash no longer mirrors the English name word for word, and that is deliberate rather
than drift. The three arguments that removed `Image` from the English field do not carry over: this name is 33 of 75
characters, well inside the 44-character ceiling every competitor in the category sits under; 图片转换 is a native
compound rather than a bolted-on English token, and it names a third of the format families the extension converts;
and this is the locale the primary audience lands on. 文件格式转换 remains the phrase a Chinese user types, and the
name still reads as one noun phrase instead of a list — the same shape rule the English field follows.

**Short Description** [REQUIRED] — 129 chars, limit 132

```
Convert 14 file formats locally in your browser: Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. Batch, offline, no uploads.
```

Mirrored in `wxt.config.ts → manifest.description` and `package.json → description`. Keep the three in sync.

**Chinese (China) short description** — 98 chars, limit 132

```
在本机浏览器内互转 14 种文件格式：Markdown、Word、PDF、Excel、CSV、JSON、HTML、图片。支持混合批量、多步链路、预览编辑与 ZIP 打包，全程离线，不上传、无账号。
```

Extended on 2026-09-11 from the previous 75-char version. The Chinese page is where the primary audience lands, and the field had 57 characters going unused. Everything added is a capability the extension already ships (mixed-format batches, multi-step chains, preview and editing, ZIP download, no upload, no account) written as one readable sentence — not as a comma-separated keyword list, which is the shape the store rejected elsewhere as keyword stuffing. Note that no PDF-to-Word or PDF-to-Excel capability is implied here, because the extension does not convert PDF losslessly.

**Detailed Description** [REQUIRED] — plain text, guarded at 16,000 chars (English block measured 6,939; Chinese block below measured 2,832)

_Google documents no length for this field_ — the 75- and 132-character limits are stated in their docs, the 16,000 is
not. Treat it as this repo's own guard (`pnpm verify:listing`) sized to the counter the dashboard shows, and confirm
against that counter at submission time rather than citing 16,000 back to a reviewer.

The store strips markdown, so this is written with `•` bullets and blank-line sections. It deliberately contains **no** implementation details (no framework, library or API names) and states the limitations up front — "misleading functionality" is a common rejection reason.

```
Transfer Any File is an open-source, offline file format converter for Chrome. It converts your files between common formats without uploading them anywhere. Everything happens in a page inside your own browser: no server, no account, no queue, and nothing to wait for on a slow connection.

WHY THAT MATTERS
An online converter has to copy your file onto a machine you do not control before it can do anything with it. For a public dataset that is fine. For an HR spreadsheet, a client contract, a medical report or a draft you have not told anyone about yet, it is not — and "we delete it within 24 hours" is a promise you have to take on trust. This one never has a copy to delete.

WHAT MAKES IT DIFFERENT
• One batch, many source formats. Most converters handle one format at a time. Here a folder of Markdown, CSV and Word files goes to a single target in one run, each file resolving its own route — and one unreadable file does not fail the rest.
• Look before you download. Source and result side by side, with text results editable in place, so a wrong output does not mean converting the whole folder again.
• Nothing has to leave the machine. One permission (extension storage), no upload step, and it keeps working with the network switched off — you can disconnect and check for yourself.

WHAT YOU CAN CONVERT
• Documents: Markdown, HTML, Word (.docx), PDF and plain text, in any direction
• Data: CSV, Excel (.xlsx) and JSON, in any direction
• Images: PNG, JPEG, WebP, BMP, GIF and SVG — converted to PNG, JPEG or WebP
• 14 formats and 46 direct conversion routes. When two formats have no direct route, the workbench finds the intermediate steps itself — for example Markdown → HTML → PDF, or Word → HTML → Markdown

COMMON CONVERSIONS
The pairings people reach for most all work today.
• Documents: Markdown ↔ HTML, Markdown → PDF, Markdown → Word, Word → PDF, HTML → Word, HTML → PDF, HTML → plain text, plain text → Markdown
• Data: CSV ↔ Excel, CSV ↔ JSON, Excel → JSON, either spreadsheet → HTML
• Images: PNG ↔ JPEG, PNG ↔ WebP, JPEG → WebP, SVG → PNG, and any image format → PDF
• From PDF: PDF → HTML, PDF → plain text and PDF → Word. These read the page as text, so the original layout is not carried over — PLEASE KNOW below spells out what that means
• A pairing not listed here still works whenever the two formats are connected somewhere in the graph, and the workbench shows the route it will take before it starts

BUILT FOR REAL WORKLOADS
• Batch conversion: drop in a whole folder's worth of files, even a mix of different source formats — each file resolves its own route to the target
• Per-file error reporting: one unreadable file never blocks the rest of the batch, and every failure is listed with its reason
• Failure diagnostics: expand any failed file to see the route it tried and the step that broke, with a one-click copy of that summary for filing an issue
• ZIP download: convert forty files, download one archive. Multi-page PDFs and multi-sheet workbooks are automatically split into one output per page / per sheet
• Paste to convert: copy an image or a block of text and press Ctrl+V (⌘V on Mac)
• Preview and edit: view the source and the result side by side, and correct text output (Markdown / HTML / CSV / JSON / plain text) before downloading
• Recent targets: the formats you convert to most often are grouped at the top of the target picker
• Archive intake: drop a .zip and the supported files inside join the batch automatically
• Excel-friendly CSV: reads UTF-8 and falls back to GBK, writes UTF-8 with a BOM so spreadsheets open without garbled characters
• Conversion history: the last 50 runs (file names, formats and sizes only), searchable by file name, filterable, reusable in one click, exportable and importable as JSON
• Undo the previous batch, confirm before a very large batch, and an optional desktop notification when a long job finishes while the tab is in the background
• Personalisation: 6 accent colours, light / dark / follow-system appearance, and a Chinese or English interface
• Keyboard friendly: start a conversion with Ctrl+Enter (⌘Enter), rebindable; in the side-by-side view, 1 / 2 / 3 switch between source, split and result and ← / → move the divider; skip-to-content link and visible focus indicators throughout

HOW TO USE
1. Click the toolbar icon — the workbench opens in a new tab
2. Drop files on the upload area, click to choose them, or paste from the clipboard
3. Pick the target format. Only formats that every selected file can reach are offered; the rest are greyed out with a reason
4. Press Convert, then download a single file or the whole batch as one ZIP

PRIVACY
• Your files never leave your device. There is no upload step and no server to upload to: converting a file makes no network request, and the whole thing works with the network switched off
• The only permission it requests is access to extension storage, used to keep your conversion history and preferences on this machine
• No analytics, no tracking, no sign-in, no advertising, no paid tier

PLEASE KNOW BEFORE INSTALLING
• PDF output is rendered page by page as an image, so text in a converted PDF is not selectable
• PDF input extracts the text; the original layout and embedded images are not preserved
• Images cannot be turned into text or spreadsheets — that needs OCR, which is not bundled
• BMP, GIF and SVG can be converted from, but not to, because browsers cannot encode them (GIF uses its first frame, SVG is flattened)
• One file up to 100 MB is accepted, and a batch is limited to 200 files

QUESTIONS
• Is it free? Yes. Open source under the ISC licence, with no account, no paid tier, no advertising and no feature held back.
• Do I need to be online? No. After installation the interface and every converter run from your own machine, and the text is set in your system fonts instead of a downloaded webfont, so working on a plane or on an air-gapped laptop makes no difference.
• Why can't a screenshot be turned into text? That needs OCR, and no OCR engine is bundled: it would add tens of megabytes and a model download, which the offline guarantee rules out. Those targets are greyed out with that reason instead of failing at convert time.
• How many files can it take at once? Up to 200 files in a batch and 100 MB per file, with a confirmation prompt above 5 files or 20 MB in total. Multi-page PDFs and multi-sheet workbooks become one output per page or per sheet, delivered as a single ZIP.
• Where is the conversion history kept? In extension-local storage on your own machine, holding file names, formats and sizes only, never file contents. It can be searched, filtered, exported and cleared from the workbench.
• Also works in other Chromium browsers, not only Chrome.

SUPPORT
Found a bug, or need a format added? Open an issue at https://github.com/liaolongdong/transfer-any-file/issues

Version 1.0.0 — first store submission.
```

**Chinese (China) detailed description** — paste-ready text for the `Chinese (China)` listing tab. It mirrors the
English version section by section. Terminology is taken from the shipped interface (`utils/i18n/zh.ts`) rather than
invented: 转换工作台 / 批量转换 / 目标格式 / 打包下载 ZIP / 转换历史 / 复用此格式 / 偏好设置 / 主题色 / 显示模式 /
界面语言 / 撤销 / 复制诊断信息 / 最近使用. Do not introduce synonyms the UI does not use.

```
Transfer Any File 是一款开源、完全离线的 Chrome 文件格式转换扩展，在你的电脑本地完成常见文件格式之间的相互转换，全程不上传。所有转换都在你自己浏览器里的一个页面完成：没有服务器、没有账号、不需要排队，也不受网速影响。

为什么值得在意
在线转换器必须先把你的文件复制到一台你控制不了的机器上，才能开始处理。对一份公开数据集来说无所谓；对一份 HR 表格、客户合同、体检报告，或者一份还没告诉任何人的草稿，就不是回事了——而「24 小时内自动删除」只能靠对方遵守承诺。这款扩展从来就没有一份供人删除的副本。

它不一样的地方
• 一次批量，多种源格式。多数转换器一次只能处理一种格式。在这里，一整个文件夹的 Markdown、CSV、Word 可以一次转向同一个目标格式，每个文件各自求出自己的路径——而且一个读不了的文件不会拖垮整批。
• 先看再下。源文件与结果左右对照，文本类结果还能就地修改，输出不满意不必把整个文件夹重转一遍。
• 数据不必离开本机。只申请一项权限（扩展存储），没有上传环节，断网之后照常可用——你可以断开网络自己验证。

能转换什么
• 文档：Markdown、HTML、Word (.docx)、PDF、纯文本，任意方向互转
• 数据：CSV、Excel (.xlsx)、JSON，任意方向互转
• 图片：PNG、JPEG、WebP、BMP、GIF、SVG，可转出为 PNG、JPEG 或 WebP
• 共 14 种格式、46 条直接转换路径。两个格式之间没有直连路径时，转换工作台会自动求出中间步骤——例如 Markdown → HTML → PDF，或 Word → HTML → Markdown

常用转换
大家最常用的这些组合今天都可用。
• 文档：Markdown ↔ HTML、Markdown → PDF、Markdown → Word、Word → PDF、HTML → Word、HTML → PDF、HTML → 纯文本、纯文本 → Markdown
• 数据：CSV ↔ Excel、CSV ↔ JSON、Excel → JSON、两种表格都能转 HTML
• 图片：PNG ↔ JPEG、PNG ↔ WebP、JPEG → WebP、SVG → PNG，以及任意图片 → PDF
• 从 PDF 出发：PDF → HTML、PDF → 纯文本、PDF → Word。这三条是把页面当作文本来读，因此不保留原版式——「安装前请了解」会说明这意味着什么
• 这份清单没有列出的组合，只要两种格式在转换图上彼此相连就能转，而且工作台会在开始之前显示它将要经过的路径

面向真实工作负载
• 批量转换：一次拖入一整个文件夹的文件，源格式不同也没关系——每个文件各自求出到目标格式的路径
• 逐文件错误报告：单个无法读取的文件不会阻断整批，每个失败文件都会连同原因单独列出
• 失败诊断：展开任意一个失败文件，能看到它尝试的转换路径和出错的那一步，还能一键复制诊断信息用于提交问题
• 打包下载：转换 40 个文件，下载 1 个 ZIP 压缩包。多页 PDF 和多工作表 Excel 会自动按"每页一个 / 每表一个"拆分输出
• 粘贴即转换：复制一张图片或一段文字，按 Ctrl+V（Mac 上为 ⌘V）即可
• 预览与编辑：源文件与结果左右对照显示，文本类结果（Markdown / HTML / CSV / JSON / 纯文本）可在下载前就地修改
• 最近使用：你常转的目标格式会以下拉顶部的「最近使用」分组呈现
• 压缩包解包：拖入一个 .zip，其中受支持的文件自动加入批次
• 中文友好的 CSV：读取 UTF-8 并在失败时回退 GBK，写出时带 BOM，用 Excel 打开不乱码
• 转换历史：保留最近 50 次转换的元数据（仅文件名、格式与体积），支持按文件名搜索、筛选、一键「复用此格式」，以及 JSON 导出与导入
• 可撤销上一批结果、超大批次转换前确认、任务在后台标签页完成时可选发送桌面通知
• 个性化：6 种主题色、浅色 / 深色 / 跟随系统三种显示模式，中文与英文界面
• 键盘友好：Ctrl+Enter（⌘Enter）开始转换且可改绑；左右对照视图下按 1 / 2 / 3 切换原文件、并排与结果，按 ← / → 移动分隔条；提供跳转主内容链接与清晰的焦点提示

使用方法
1. 点击工具栏图标——转换工作台在新标签页打开
2. 把文件拖到上传区，或点击选择，或直接从剪贴板粘贴
3. 选择目标格式。下拉框只提供对全部已选文件都可达的格式，其余格式置灰并给出原因
4. 点击「开始转换」，然后单个下载或把整批「打包下载 ZIP」

隐私
• 你的文件不会离开本设备。没有上传环节，也没有可供上传的服务器：完成一次转换不发起任何网络请求，断网状态下照常可用
• 唯一申请的权限是扩展存储，用于把转换历史和偏好设置保存在本机
• 无统计埋点、无追踪、无登录、无广告、无付费版本

安装前请了解
• PDF 输出是逐页渲染成的图片，因此转出 PDF 里的文字不可选中
• PDF 输入只提取文本，原有版式与内嵌图片不会保留
• 图片无法转换为文本或表格——那需要 OCR，本扩展未内置
• BMP、GIF、SVG 只能作为输入，不能作为输出，因为浏览器未提供它们的编码器（GIF 取首帧，SVG 先展平）
• 单文件最大 100 MB，单批最多 200 个文件

常见问题
• 完全免费吗？是。以 ISC 协议开源，没有账号、没有付费版、没有广告，也没有任何功能被保留。
• 需要联网吗？不需要。安装完成后，界面与全部转换器都在你自己的电脑上运行，文字使用系统自带字体而非下载的网络字体，在飞机上或内网隔离的电脑上使用没有区别。
• 为什么不能把截图转成文本？那需要 OCR，而扩展没有内置任何 OCR 引擎——它会带来几十 MB 体积和一次模型下载，与完全离线的承诺冲突。这些目标格式会置灰并给出该原因，而不是等到转换时才失败。
• 一次能处理多少文件？单批最多 200 个文件、单文件最大 100 MB，超过 5 个文件或总计 20 MB 会先弹确认框。多页 PDF 与多工作表 Excel 会按每页一个、每表一个的方式输出，并打包为一个 ZIP。
• 转换历史存在哪里？存在本机的扩展存储中，只包含文件名、格式与体积，绝不保存文件内容。可在工作台内搜索、筛选、导出与清空。
• 除 Chrome 外，其他 Chromium 内核浏览器同样可用。

支持
发现缺陷，或希望新增某种格式？请到 https://github.com/liaolongdong/transfer-any-file/issues 提 issue

1.0.0 版本——首次提交商店。
```

**Category** [REQUIRED]

```
Productivity
```

**Single Purpose** [REQUIRED]

```
Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
```

**Primary Language** [REQUIRED]

```
English
```

`English` must match the default locale the package actually ships. Chinese is **not** offered as an additional
listing language today — see _Locale gate_ above; it needs `_locales/zh_CN/` in the package, not a dashboard setting.
The in-app UI ships both languages and defaults to Chinese either way, and Google's own consistency rule for the
option case is only that _"localized item metadata shouldn't significantly change the described set of features"_ —
the ZH descriptions above mirror the EN ones feature for feature.

---

## Graphics & Assets

| Asset                 | Dimensions   | Status   | Filename                                      |
| --------------------- | ------------ | -------- | --------------------------------------------- |
| Store Icon            | 128×128 PNG  | ✅ Ready | `public/icon/128.png`                         |
| Brand master          | 512×512 PNG  | ✅ Ready | `docs/assets/icon.png`                        |
| Brand mark            | 64×64 PNG    | ✅ Ready | `docs/assets/icon-mark.png`                   |
| Small Promo Tile      | 440×280 PNG  | ✅ Ready | `docs/assets/store/cws-small-promo.png`       |
| Marquee Promo Tile    | 1400×560 PNG | ✅ Ready | `docs/assets/store/cws-marquee-promo.png`     |
| GitHub social preview | 1280×640 PNG | ✅ Ready | `docs/assets/store/github-social-preview.png` |

Everything here is generated, not hand-taken: `pnpm build && pnpm assets:capture` re-shoots every file above — and every listing screenshot below — from the current bundle, so a UI change cannot leave the store kit stale.

### Listing screenshots

Each row is one carousel position. The raw capture is what the README and the product page use; the two listing files are that same shot with the caption bar composited on, one per store language. **The captions below are a mirror, not the source** — `SCREEN_CAPTIONS` in `scripts/capture-store-assets.mjs` is what is burned into the PNGs, so edit there and re-run `pnpm build && pnpm assets:capture`. A caption states what its own shot proves: the ZIP row reads "one mixed batch" rather than a file count, because the script stages a three-file batch (`:256`), and caption text is store metadata reviewed under the same rules as the listing copy.

| #   | Raw capture (`docs/assets/screenshots/`) | Listing file, English (`docs/assets/store/screens/`) | Listing file, Chinese        | Caption (EN / ZH)                                                                      |
| --- | ---------------------------------------- | ---------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `workbench-empty.png`                    | `screen-01-workbench.png`                            | `screen-01-workbench-zh.png` | Drop, pick a format, convert on your own machine / 拖入、选格式，在你自己电脑上转换    |
| 2   | `batch-files.png`                        | `screen-02-batch.png`                                | `screen-02-batch-zh.png`     | Batch: Markdown, CSV and Excel in one run / 批量：Markdown、CSV、Excel 一次转完        |
| 3   | `batch-results.png`                      | `screen-03-zip.png`                                  | `screen-03-zip-zh.png`       | One mixed batch, one ZIP download / 一次混合批量，一个 ZIP 下载                        |
| 4   | `preview-edit.png`                       | `screen-04-preview.png`                              | `screen-04-preview-zh.png`   | Preview side by side, edit before you download / 左右对照预览，下载前直接改            |
| 5   | `history.png`                            | `screen-05-history.png`                              | `screen-05-history-zh.png`   | Searchable, filterable history with one-click reuse / 历史可搜索、可筛选、一键复用格式 |
| 6   | `dark-mode.png`                          | `screen-06-dark-mode.png`                            | `screen-06-dark-mode-zh.png` | 6 accent colours, light / dark / system / 6 种主题色，浅色 / 深色 / 跟随系统           |

Four constraints drive this set:

- **Five per language page, and five is the ceiling.** Google asks for _"at least 1—and preferably the maximum allowed
  5—screenshots"_, so one of the six above is a spare. Drop **#6** first (`dark-mode`): it is the weakest evidence,
  and theme support is already stated in the listing copy.
- **Everything gets downscaled to 640×400.** Google: _"all screenshots are downscaled to 640x400 pixels"_. The PNGs
  stay 1280×800 for retina surfaces, but the only render that matters for legibility is the halved one — which rules
  out any caption smaller than this set's bar, and is why the UI is captured at its natural density rather than
  shrunk to make room for a header band.
- **The language pages do not inherit — but only the Chinese page exists after the locale gate.** EN and ZH tabs have
  independent screenshot slots, so both sets must be uploaded, and the Chinese set is captured from a Chinese
  workbench rather than the English one re-captioned. Until the package ships `_locales/zh_CN/` there is no second
  tab to upload to, so the `-zh` files wait in the repo.
- **Caption text is store metadata, and it has to be burned in.** There is no per-screenshot caption field in the
  dashboard — unlike an app store, CWS stores screenshots ordered and nothing else — so the only place a caption can
  live is the PNG. That text is reviewed under the same policy as the description, so it stays inside the vocabulary
  the listing already uses: no competitor brand names, no absolute privacy claims, nothing that hints a PDF can
  become a spreadsheet (`PDF → CSV / JSON / Excel` is greyed out in the picker), and no framing of `PDF → Word` as
  layout-preserving, because it is text extraction.

The caption bar is composited, not cropped: the UI keeps its full 1280×800 resolution and the bar sits over the bottom strip. Scaling the interface down to free up room for a header band would push its 12px text below legibility.

### Icon tiers

Two masters cover two size regimes: `assets/icon.svg` draws a document sheet with a circular conversion badge for the large slots, while `assets/icon-small.svg` strips the artwork down to bold bidirectional arrows so it survives 16px.

| Tier       | Master           | Use                          |
| ---------- | ---------------- | ---------------------------- |
| Simplified | `icon-small.svg` | anything rendered under 48px |
| Detailed   | `icon.svg`       | 48px and above               |

The split is arithmetic, not taste: the detailed master's text lines are 5px tall on a 128 grid, so at 26px they land on ~1px and read as a white smear. That is why the favicon, the landing-page nav mark and the small promo tile all point at `icon-mark.png` — the slots where the extension is actually seen most are the small ones. `Brand master` above feeds the GitHub repository avatar and the JSON-LD `logo`/`image` pair, so CWS, GitHub and Pages all resolve to the same artwork.

### Screenshot Notes

1. `workbench-empty` — first-run state: topbar brand + tagline, drop zone, empty history, and the "14 formats supported, 46+ conversion paths" footer. Sets expectations for a brand-new user.
2. `batch-files` — three mixed-format files (Markdown + CSV + Excel) staged with one target, showing the batch capability that most converters lack.
3. `batch-results` — "Conversion complete! 3 files" with per-file preview / copy / download and a single "Download ZIP (3)" action.
4. `preview-edit` — split source ↔ result with Rendered / Source / Edit / Copy controls. The strongest differentiator; also the hero image on the product page.
5. `history` — searchable, filterable history with "Reuse this format".
6. `dark-mode` — dark appearance, proof the UI is themeable.

The raw English captures double as the README and product-page imagery. The Chinese captures are intermediates: they exist only long enough to be composited, because both READMEs and the product page reuse the English set. `scripts/capture-store-assets.mjs` runs both locales in a single pass, so the Chinese tab cannot be left showing an English workbench.

---

## Permissions Justification

| Permission | Type        | Justification                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`  | permissions | Stores the user's own conversion history (file names, formats, sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) between sessions, via `chrome.storage.local`. Nothing is transmitted: the extension declares no host permissions and issues no network requests. |

No `host_permissions`, no content scripts, no `tabs`, no `<all_urls>`, no remote code. The toolbar icon is wired through `chrome.action.onClicked` → `chrome.runtime.openOptionsPage()`; the workbench is an extension page, so no website access is ever requested. Expect the install prompt to show **no** data-access warnings.

---

## Privacy & Data Use

### Data handling — read this before touching the disclosure form

**The extension handles user data. It transmits none of it.** Those are different questions, and the dashboard form
asks the first one.

Google's own wording ([user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)):

> "Generally, by 'handle' we mean collecting, transmitting, using, or sharing user data."
>
> "Extensions are required to disclose how they handle user data, **even when data is processed or stored locally on a
> user's device and is not transmitted to external servers or third parties**."

Reading the files the user picks, keeping a conversion history and storing preferences in `chrome.storage.local` all
count as handling. So the form is **not** answered by "nothing leaves the machine" — that is the transmission
question, and it comes later on the same page.

| Data type                    | Handled?                              | Transmitted Off-Device? | Purpose                                                       | Shared with Third Parties? |
| ---------------------------- | ------------------------------------- | ----------------------- | ------------------------------------------------------------- | -------------------------- |
| Personally identifiable info | No                                    | No                      | —                                                             | No                         |
| Health info                  | No                                    | No                      | —                                                             | No                         |
| Financial info               | No                                    | No                      | —                                                             | No                         |
| Authentication info          | No                                    | No                      | —                                                             | No                         |
| Personal communications      | No                                    | No                      | —                                                             | No                         |
| Location                     | No                                    | No                      | —                                                             | No                         |
| Web history                  | No                                    | No                      | —                                                             | No                         |
| App activity                 | Yes — kept on-device                  | No                      | Conversion history and recently-used target formats           | No                         |
| Website content              | No                                    | No                      | —                                                             | No                         |
| User files                   | Yes — read, converted, then discarded | Never                   | Format conversion, then handed back to the user as a download | No                         |

**On the form: declare that the extension handles user data**, tick the types the live form offers for what actually
happens (user files, and the app-activity / other-types line covering the local history), and use the description
field for the sentence that is true: _processed entirely on-device, never transmitted to the developer or anyone
else, never retained after the tab is closed._ Confirm the checkbox labels against the dashboard rather than
hardcoding them — Google revises that list, and this file has no way to know what the form says next month.

**Do not select "We don't collect any user data from this extension."** It is inaccurate for an extension that opens
the user's files, and an inaccurate declaration is a stated policy violation, not a formatting nit: Google warns
that discrepancies "can result in suspension of the item and, in some instances, ban of the entire publisher entity".
This is the one mistake in this document that can cost the whole developer account.

What the offline guarantee does buy you is the _other_ answers on that page — no transmission, so nothing to
certify under the transfer rules. Re-run the assertion behind it before each submission with `pnpm verify:offline`
(no network call appears anywhere in `entrypoints/`, `components/`, `composables/` or `utils/`, and the manifest
declares no host permission), and remember that the request paths sitting unused inside jsPDF / pdf.js can neither
read a response nor reach any website's data. CI runs `verify:offline` on every push.

### Data Use Certification

Tick each statement the form presents for the data declared above:

- [x] Data is not sold to third parties
- [x] Data is not used or transferred for purposes unrelated to the item's core functionality
- [x] Data is not used or transferred to determine creditworthiness or for lending purposes
- [x] Limited Use: data is processed on-device only, and is not transferred or shared at all

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED] — ⚠️ must be live before submission

Required because the item **handles** user data, not because of any permission: Google's FAQ answers this case
directly — _"My extension or app handles user data, but only stores information locally. Do I still need to post a
privacy policy? Yes."_

```
https://liaolongdong.github.io/transfer-any-file/privacy.html
```

The page lives at `docs/privacy.html` (bilingual, no analytics, no external assets). **Verified live 2026-09-08**:
GitHub Pages now serves `docs/` as the site root, so both `https://liaolongdong.github.io/transfer-any-file/` and
`/privacy.html` answer `HTTP/2 200`. Earlier revisions of this file recorded a 404 here — that was the deploy created
by GitHub's own wizard, which published the _repository_ root instead of `docs/`; `.github/workflows/static.yml` has
since replaced it.

Still verify rather than assume, because a later Pages regression blocks the submission outright — the dashboard will
not accept a submission whose policy URL is unreachable:

```bash
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # expect: HTTP/2 200
```

---

## Distribution

**Visibility**: Public
**Regions**: All regions

---

## Developer Info

| Field          | Value                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Publisher Name | ⚠️ _you must provide_ — the CWS developer account name                                                                 |
| Contact Email  | `924902324@qq.com` — displayed publicly on the store listing (decided 2026-09-06); matches `package.json#author.email` |
| Support URL    | `https://github.com/liaolongdong/transfer-any-file/issues`                                                             |
| Homepage URL   | `https://liaolongdong.github.io/transfer-any-file/`                                                                    |

---

## GitHub Repository Metadata

Source of truth is `.github/repo-metadata.json`; `.github/workflows/repo-meta.yml` pushes it onto the repository. Re-checked 2026-09-08 against `GET /repos/liaolongdong/transfer-any-file`: the repository exists (default branch `main`, license `ISC`), but it still reports `description: null`, `homepage: null` and `topics: []` — **none of the About metadata has been applied yet**, because `gh` is not installed on this machine and the workflow has never been given a `REPO_METADATA_TOKEN`. Land it either by running the workflow with that secret, or by the one-off `gh repo edit` at the end of this section; the purely manual path is the repository's **Settings → General → About** block.

**Repository name** — `transfer-any-file`

Every link already written into `README.md`, `README.zh-CN.md`, `docs/index.html` (including JSON-LD `codeRepository`), `docs/privacy.html` and this file points at `github.com/liaolongdong/transfer-any-file`, and the slug equals `package.json#name` and the manifest brand. Creating the repository under any other name silently breaks all of them.

**Description (About)** — 119 chars (GitHub allows 350; under 120 keeps the whole string inside Google's snippet width)

```
Offline file format converter for Chrome: 14 formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. No uploads.
```

It leads with the exact phrase `file format converter` on purpose: that is the keyword coverage the brand slug deliberately gives up, and the About field is where GitHub search and the search snippet read it from. `14 formats` is the same figure the workbench footer computes (`entrypoints/options/App.vue → formatCount`); re-derive it from the code, not from this file, if the converter set changes.

**Topics** — 20, one per group axis (GitHub accepts unlisted topic names, so a missing one is not an error). This fills GitHub's 20-topic budget, so any future addition has to displace an existing one:

| Group   | Topics                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose | `file-format-converter`, `file-converter`, `file-conversion`, `document-conversion`, `markdown-converter`, `pdf-converter`, `image-conversion`, `xlsx`, `csv`, `batch-processing` |
| Values  | `offline-first`, `local-first`, `privacy-first`, `privacy-tools`                                                                                                                  |
| Stack   | `chrome-extension`, `browser-extension`, `wxt`, `vue3`, `typescript`, `vite`                                                                                                      |

`file-format-converter` and `file-converter` are not redundant, so keep both. Verified 2026-09-07: the former is a small topic whose listing tops out at 340 stars — the one surface where a zero-star repository appears near the top on day one — while the latter is head-dominated by ConvertX at 18.8k stars and is where the browsing volume actually is.

Revised 2026-09-11 to use the full budget. Three format-specific topics were added — `markdown-converter`, `xlsx` and `csv` — because each names a conversion people actually search for and the project performs it; `format-conversion` was dropped to stay inside the cap, since it duplicates `file-format-converter` and `file-conversion` without contributing a distinct phrase.

**Social preview** — Settings → General → Social preview → upload `docs/assets/store/github-social-preview.png` (1280×640, already generated by `pnpm assets:capture`). It is what every shared link renders as, and unlike stars it cannot be grown into later.

`gh` is not installed here, so the two paths that work are these. Prefer the first — it keeps
`.github/repo-metadata.json` as the single source of truth and re-applies itself on every push to `main`:

1. **Workflow.** Add a `REPO_METADATA_TOKEN` repository secret (classic PAT, `repo` scope, or fine-grained with
   _Administration → Read and write_ on this repository), then run
   **Actions → Sync repository About → Run workflow**. Nothing else to type.
2. **One-off `curl`.** Same token in `$PAT`; two calls, because GitHub splits About and topics across endpoints. The
   `topics` call **replaces the entire list**, so send all twenty names at once.

```bash
PAT='…'   # export it in this shell only; never commit it

curl -sS -X PATCH https://api.github.com/repos/liaolongdong/transfer-any-file \
  -H "Authorization: Bearer $PAT" -H "Accept: application/vnd.github+json" \
  -d '{"description":"Offline file format converter for Chrome: 14 formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. No uploads.","homepage":"https://liaolongdong.github.io/transfer-any-file/"}'

curl -sS -X PUT https://api.github.com/repos/liaolongdong/transfer-any-file/topics \
  -H "Authorization: Bearer $PAT" -H "Accept: application/vnd.github+json" \
  -d '{"names":["file-format-converter","file-converter","file-conversion","document-conversion","markdown-converter","pdf-converter","image-conversion","xlsx","csv","batch-processing","offline-first","local-first","privacy-first","privacy-tools","chrome-extension","browser-extension","wxt","vue3","typescript","vite"]}'
```

Check it landed: `curl -sS https://api.github.com/repos/liaolongdong/transfer-any-file | grep -E '"(description|homepage)"'`
— unauthenticated is fine, these fields are public. The **social preview** image has no API at all; upload it in
Settings → General → Social preview.

---

## First Publication (manual)

The store **cannot** be automated end to end, and pretending otherwise wastes a submission slot.
`publish-browser-extension` — the CLI this repository already ships through WXT — states the rule
verbatim: "You are responsible for uploading and submitting an extension for the first time by
hand." Creating the item, pasting the listing text, uploading screenshots and ticking the
disclosure form all happen in the dashboard; the API only pushes a package onto an item that
already exists. Do this sequence once, then every later version is a tag push.

### 1. One-time account setup

1. Enable **2-step verification** on the Google account — Google refuses to publish or update an
   item from an account without it.
2. Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and pay the one-time **$5** registration fee.
3. Finish the developer profile (identity, address, phone) and **verify the contact email**. An
   unverified email shows up as "Submit for review" doing nothing, which reads like a bug in the
   dashboard and is not one. The public contact email is `924902324@qq.com` (decided 2026-09-06).

### 2. Preconditions, checked from the repository

```bash
pnpm verify:offline   # no network call in first-party source, storage-only manifest
pnpm verify:meta      # the 132-char short description agrees in package.json and wxt.config.ts
pnpm verify:listing   # every paste field below is inside its limit and agrees with the manifest
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # must be HTTP/2 200
```

The privacy policy URL is a hard gate: the dashboard rejects a submission whose policy is not
reachable. It is served by GitHub Pages from `docs/` (`.github/workflows/static.yml`) — a Pages
deploy of that workflow has to have **completed successfully** first, so run the `curl` above
rather than trusting that it has. Do this before the dashboard, not while filling it in.

### 3. Produce the package

`pnpm build && pnpm package` writes `.output/transfer-any-file-<version>-chrome.zip`. The
recommended path is pushing the tag: `.github/workflows/release.yml` asserts that the tag matches
`package.json#version`, runs both guards above, verifies that `manifest.json` sits at the archive
root with no repository files alongside it, and attaches the zip to a GitHub Release.

### 4. Fill the dashboard item

Everything pasted here already exists in this file — copy, do not retype:

| Dashboard tab      | Source in this file                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Store listing      | **Store Listing** (name 49/75, short 129/132, detailed description, `Productivity`, single purpose). One locale until the _Locale gate_ section above is resolved. |
| Screenshots & icon | **Graphics & Assets** — upload 5 of the 6 × 1280×800 shots (drop `dark-mode`), `public/icon/128.png`, small and marquee promo tiles                                |
| Privacy practices  | **Privacy & Data Use** — declare that the item _handles_ user data; on-device-only, never transmitted. **Not** "we don't collect any user data".                   |
| Summary / rollout  | **Distribution** (public, all regions); the item ID lands here                                                                                                     |

Submit for review, then watch **Package → status** in the dashboard, or ask the API:
`pnpm exec wxt-publish-extension status` with the credentials below configured.

### 5. Hand-over to automation (after the item exists)

Copy the 32-character **item ID** from the dashboard URL, then generate OAuth credentials for the
Chrome Web Store API. The maintained path is the CLI's own wizard, which walks through the Google
Cloud side (enable _Chrome Web Store API_ in a project, create an OAuth client, exchange an
authorisation code for a refresh token) and writes `.env.submit`:

```bash
pnpm exec wxt-publish-extension init   # interactive; .env.submit is gitignored
```

Add four repository secrets — `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`,
`CHROME_REFRESH_TOKEN` — and the `Submit to the Chrome Web Store` step in `release.yml` stops
reporting "skipped" and starts publishing on the next tag. Useful flags for the first runs:

| Flag                                                     | Effect                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--dry-run`                                              | Authenticate only; uploads nothing and submits nothing. Run it before trusting a tag. |
| `--chrome-skip-submit-review`                            | Upload the package as a draft without requesting review.                              |
| `--chrome-publish-target trustedTesters`                 | Limited rollout instead of `default` (public).                                        |
| `--chrome-api-version v2` + `--chrome-service-account-*` | The v2 API path, for accounts issued a service account rather than an OAuth client.   |

Note that the OAuth flags are labelled `[Deprecated: API v1.1 only]` by the CLI: Google is moving
this API to v2 with service accounts, so if `init` cannot create a v1.1 client, use the v2 flags.
The workflow keeps the v1.1 triple because it is what a first-time developer account is handed today.

### Not automatable (do not schedule it, then wonder)

- Creating the item, and any edit to listing text, screenshots, promo tiles or privacy disclosures.
- The **GitHub social preview** image (Settings → General → Social preview), from the same file
  `docs/assets/store/github-social-preview.png` that `pnpm assets:capture` regenerates.
- Review itself: plan 1–5 working days for a first submission, and bump `package.json#version` on
  every attempt — an update with a version equal to or below what is live is rejected outright.

---

## After Publication

The dashboard reports listing-level numbers, and each one points at a different asset in this file. Read them before editing anything, so the change is aimed at the number that is actually weak:

| Dashboard metric                | What a weak value points at                                                             | The asset that fixes it                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Impressions                     | The listing is not being found                                                          | The name, the short description and the 20 topics — the only levers on discovery             |
| Detail-page views ÷ impressions | People saw the listing in search and did not click it                                   | The icon and the first screenshot                                                            |
| Installs ÷ detail-page views    | People opened the page and did not install                                              | The first screenshot, the opening sections of the detailed description, the permission story |
| Uninstalls                      | Onboarding or stability, not the listing copy                                           | First-run behaviour inside the extension                                                     |
| Rating                          | Review handling; a falling rating suppresses installs independently of everything above | Reply to reviews, and fix what they report                                                   |

Three conventions make the numbers attributable:

- Tag every external promotion link with UTM parameters, e.g. `?utm_source=v2ex&utm_medium=post&utm_campaign=launch`. The dashboard's **Analytics → Traffic sources** groups installs by `utm_source`, so a channel that produces nothing is visible instead of guessed at. For GitHub links a plain `?ref=` is enough — the repository's **Insights → Traffic → Referrers** reports those.
- Record the day-one baseline (impressions, detail-page views, installs) before announcing the extension anywhere, so the first week's movement has something to be measured against.
- Add the live Chrome Web Store badges to both READMEs, which is why their badge rows carry none today: there is no listing to link to yet, and a badge pointing at a missing item is worse than no badge. Once the item exists, key the three shields to the 32-character item ID copied from the dashboard URL, with all three linking to the listing:
  - `https://img.shields.io/chrome-web-store/v/<ITEM_ID>?label=CWS&logo=googlechrome&logoColor=white&color=4285F4`
  - `https://img.shields.io/chrome-web-store/users/<ITEM_ID>?label=Users&logo=googlechrome&logoColor=white&color=4285F4`
  - `https://img.shields.io/chrome-web-store/rating/<ITEM_ID>?label=Rating&color=4285F4`

  The rating badge only reads a meaningful number once the extension has at least one rating, so expect it to look odd for the first few days.

Because the dashboard reports listing-level numbers rather than per-screenshot ones, change one asset at a time and let a reporting cycle pass before the next edit — a batch of simultaneous changes cannot be attributed to any single one of them.

---

## Version History

| Version | Date       | Changes                                                                                                                                                                                                                                          | Status |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.0.0   | 2026-09-07 | First submission: 14 formats / 46 direct routes, batch + ZIP, multi-step chains, preview & edit, failure diagnostics, recently-used target group, history, 6 themes, zh/en UI. Listing copy is complete in **both** English and Chinese (China). | Draft  |

---

## Review Notes

### Known Issues / Limitations (disclose proactively if the reviewer asks)

- PDF output is image-based by design (jsPDF renders the page); selectable-text PDF export is not offered. Documented in the description so it cannot be read as a misleading claim.
- PDF input is text extraction only; layout and embedded images are dropped.
- No OCR, so image → text/data is intentionally greyed out in the target picker rather than failing at convert time.
- BMP / GIF / SVG are input-only because browsers expose no encoders for them.
- Two contrast pairs are asserted by the end-to-end suite in all 6 accent themes × light/dark (12 combinations): topbar brand text on the topbar at 4.5:1 or better, and the focus ring on a card at 3:1 or better. Known gap: on the light forest-green and light orange themes the primary button sits at 2.5–3.6:1, because no single foreground covers its base/hover/active shades. Closing it means re-deriving the light primary scale; the limitation is documented in the README rather than presented as passing.

### Pre-Publish Checklist

- [x] `manifest_version: 3`, MV3-only APIs
- [x] All four icon sizes exist and match their declared dimensions
- [x] Every slot under 48px uses the simplified tier; the detailed master is used at 48px and above
- [x] Only `storage` permission; every permission has a specific justification above
- [x] No remote code, no CDN assets, no `eval` / `new Function`
- [x] No obfuscation (Vite minification only); source maps excluded
- [x] Description matches shipped behaviour, including limitations
- [x] Screenshots at exactly 1280×800, generated from the built bundle
- [x] Privacy policy text authored (bilingual), hosted under `docs/`
- [x] **GitHub Pages serving `docs/` as the site root** — verified 2026-09-08: `https://liaolongdong.github.io/transfer-any-file/` returns `HTTP/2 200`, which is what `.github/workflows/static.yml` is written to produce. The earlier repository-root deploy (created by GitHub's own wizard, which put the repo root at the site root) has been superseded; re-run the `curl` below if the artifact path ever changes.
- [x] **Privacy policy URL is publicly reachable** — `HTTP/2 200` confirmed 2026-09-08, and it matches the disclosure form. Re-check with `curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1` immediately before each submission: this blocks the submission outright if it ever regresses
- [x] Public contact email chosen and consistent with `package.json#author.email`
- [ ] **Publisher name decided** — must match the CWS developer account's public name
- [x] Store name renamed to the brand + keyword form above (2026-09-06); `manifest.name` matches it
- [x] Repository created as `liaolongdong/transfer-any-file` (default branch `main`)
- [ ] About description + 20 topics above applied (GitHub search coverage lives here, not in the slug) — via `.github/workflows/repo-meta.yml`, or the `curl` one-off in _GitHub Repository Metadata_ (`gh` is not installed here)
- [ ] GitHub social preview uploaded from `docs/assets/store/github-social-preview.png` — dashboard only, there is no API for it
- [x] `pnpm package` zip inspected: excludes `.git/`, `node_modules/`, `.test-*`, `CHROMEWEBSTORE.md`, `docs/`, `fixtures/` — asserted by `.github/workflows/release.yml`
- [ ] `pnpm lint:all`, `pnpm verify:meta`, `pnpm verify:offline`, `pnpm verify:listing` and `pnpm test:e2e` green on the commit being packaged

### Rejection History

_None yet — not submitted._
