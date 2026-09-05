<div align="center">
  <img src="public/icon/128.png" alt="File Any Transfer icon" width="96" height="96" />

  # File Any Transfer

  **Convert files between common formats — entirely in your browser, entirely offline.**

  [简体中文](README.zh-CN.md) · English

</div>

---

File Any Transfer is a Chrome extension (Manifest V3) that converts documents, spreadsheets and images locally. No uploads, no servers, no account — your files never leave your machine.

## Features

- **One-click workbench** — click the toolbar icon to open a full-width conversion workbench in a new tab
- **Batch conversion** — convert multiple files at once, even with mixed source formats; each file resolves its own conversion path
- **Smart conversion chains** — multi-step paths are found automatically (e.g. Markdown → HTML → PDF), powered by a BFS-based converter registry
- **Per-file error isolation** — one broken file never blocks the rest of the batch; failures are listed with clear reasons
- **ZIP download** — batch results are bundled into a single ZIP, or download each file individually. The method is chosen per entry: text results (TXT / CSV / JSON / HTML / Markdown) are deflated and come out roughly 10× smaller, while already-compressed targets (PNG / JPEG / PDF / XLSX / DOCX) are stored as-is so no CPU is spent for no gain
- **Paste to convert** — press <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> to drop in a clipboard image or text snippet
- **Preview & edit** — preview source files and results; text results (Markdown / HTML / TXT / CSV) can be edited inline before downloading
- **Conversion history** — the last 50 conversions (metadata only) with one-click "reuse this format", search by file name, filter by source/target format, per-record delete, a size-trend sparkline, and JSON export/import (merged by record ID). A multi-file batch is labelled `"<first file> +N"`; new records also keep the full file list, so every file in the batch is searchable and all of them show on hover. Records saved by earlier versions can only match that label
- **Encoding-aware CSV** — reads UTF-8 with GBK fallback, writes UTF-8 with BOM so Excel opens it correctly
- **Archive intake** — drop a `.zip` and its supported files are extracted into the batch automatically
- **Multi-sheet aware** — XLSX → CSV exports every worksheet (a ZIP of per-sheet CSVs for multi-sheet workbooks)
- **PDF to image** — rasterize PDF pages to PNG; multi-page documents export as a ZIP of per-page images
- **Batch control** — append more files or clear the batch in one click; <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> starts conversion
- **Undo** — restore the previous batch of results in one click; available until you change the selected files or the target format
- **Confirm before big batches** — a dialog summarises the batch once it exceeds 5 files or 20 MB (fixed thresholds). It can be switched off in Preferences
- **Custom shortcuts** — rebind the convert shortcut in Preferences; reserved browser combos (<kbd>Ctrl+T/W/N/L</kbd>, <kbd>Tab</kbd>, <kbd>Esc</kbd>, …) are rejected
- **Completion notifications** — optional desktop notification when a batch finishes while the tab is in the background. Built on the web `Notification` API, so no extra extension permission is required
- **Keyboard accessible** — skip link to the main content, visible focus rings, and full `prefers-reduced-motion` support
- **Personalization** — 6 theme colors × light / dark / system, Chinese/English interface

## Supported conversions

| Category | From | To |
|---|---|---|
| Documents | Markdown, HTML, Word (.docx), PDF, TXT | Each other via HTML hub (e.g. MD → DOCX, PDF → MD, TXT → PDF); PDF also rasterizes to PNG/JPEG/WebP |
| Data | CSV ⇄ Excel (.xlsx), JSON | Each other and the document cluster via HTML/CSV bridges |
| Images | PNG, JPEG, WebP, BMP, GIF, SVG | PNG, JPEG, WebP (GIF renders its first frame; SVG is rasterized) |

> Notes: PDF output is rendered as images (text is not selectable). PDF input extracts text only (layout/images are not preserved). PDF → image renders each page; multi-page documents download as a ZIP of per-page PNGs. BMP, GIF and SVG are supported as input only — browsers cannot encode them. Multi-sheet XLSX → CSV downloads a ZIP containing one CSV per worksheet. The target dropdown lists every format and greys out unsupported ones with a reason: images cannot become text or tabular data (that needs OCR, which this offline extension does not bundle), and PDF cannot be reliably converted to tabular/structured data.

## Privacy

- All conversions run **100% locally** in the extension page
- The only permission requested is `storage` (for history and preferences)
- No analytics, no network requests, no data collection

## Installation

### From source

```bash
# Requirements: Node.js 18+, pnpm
pnpm install
pnpm build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `.output/chrome-mv3`

## Usage

1. Click the extension icon — the conversion workbench opens in a new tab
2. Drop files onto the upload zone (or click to select, or paste from clipboard)
3. Pick a target format — only formats reachable from *all* selected files are offered
4. Click **Convert**, then download a single file or the whole batch as a ZIP
5. Open **Preferences** (top right) to switch theme / language / dark mode, toggle completion notifications and the large-batch confirmation, or rebind the convert shortcut

## Development

```bash
pnpm dev        # dev mode with hot reload (WXT)
pnpm build      # production build to .output/chrome-mv3
pnpm package    # zip for distribution
pnpm typecheck  # vue-tsc
pnpm lint:all   # typecheck + eslint + stylelint
node scripts/render-icons.mjs  # re-render icons from assets/*.svg
```

### Tech stack

- [WXT](https://wxt.dev/) + Vue 3 + TypeScript + Element Plus
- Converters: [marked](https://github.com/markedjs/marked), [turndown](https://github.com/mixmark-io/turndown), [mammoth](https://github.com/mwilliamson/mammoth.js), [html-docx-js-typescript](https://github.com/caiyexiang/html-docx-js-typescript), [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image), [pdf.js](https://mozilla.github.io/pdf.js/), [SheetJS](https://sheetjs.com/), [fflate](https://github.com/101arrowz/fflate), [DOMPurify](https://github.com/cure53/DOMPurify)

### Project structure

```
entrypoints/
  background.ts        # opens the workbench on icon click
  options/             # the conversion workbench (Vue app)
components/            # shared UI (upload, format selector, preview, results, history)
composables/           # useConversion / useFileDetect / useHistory / useI18n / useTheme
utils/
  core/                # converter registry (BFS pathfinding), types, format metadata
  converters/          # one module per conversion pair
  i18n/                # zh / en dictionaries
assets/                # icon SVG masters, global styles, theme tokens
```

### Adding a new converter

1. Create `utils/converters/<from>-to-<to>.ts` implementing the `Converter` interface (`from`, `to`, `convert(blob)`)
2. Register it in `utils/converters/index.ts`
3. If it introduces a new format: extend `FileFormat`, `FORMAT_INFO` and the extension/MIME maps in `composables/useFileDetect.ts`

Multi-step paths through the new format are discovered automatically.

## License

[ISC](package.json)
