<div align="center">
  <img src="public/icon/128.png" alt="Transfer Any File icon" width="96" height="96" />

# Transfer Any File

**Convert 14 file formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images — without uploading a byte.**

A Chrome extension (Manifest V3) that does every conversion inside a tab on your own machine. No server, no account, no queue, no file ever leaving your laptop.

[简体中文](README.zh-CN.md) · English

  <!-- Badges and links point at github.com/liaolongdong/transfer-any-file and at the GitHub
       Pages site built from docs/ by .github/workflows/static.yml. -->

[![Star this repo](https://img.shields.io/github/stars/liaolongdong/transfer-any-file?style=for-the-badge&logo=github&label=%E2%AD%90%20Star%20this%20repo&color=yellow)](https://github.com/liaolongdong/transfer-any-file/stargazers)

[![Manifest V3](https://img.shields.io/badge/Manifest_V3-ready-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/get-started)
&nbsp;
![14 formats · 46+ routes](https://img.shields.io/badge/14_formats_-_46%2B_routes-green?style=for-the-badge)
&nbsp;
![Zero network requests](https://img.shields.io/badge/zero_network_requests-brightgreen?style=for-the-badge)
&nbsp;
![CI](https://img.shields.io/github/actions/workflow/status/liaolongdong/transfer-any-file/ci.yml?style=for-the-badge&label=CI)
&nbsp;
![Website](https://img.shields.io/website?url=https%3A%2F%2Fliaolongdong.github.io%2Ftransfer-any-file%2F&label=website&style=for-the-badge)
&nbsp;
![License ISC](https://img.shields.io/badge/license-ISC-blue?style=for-the-badge)

[Quick start](#quick-start) · [How it works](#how-it-works) · [Supported formats](#supported-conversions) · [Privacy](#privacy) · [FAQ](#faq) · [Contributing](#contributing) · [Product page](https://liaolongdong.github.io/transfer-any-file/)

</div>

![Split preview of a Markdown file converted to HTML, source on the left, rendered result on the right](docs/assets/screenshots/preview-edit.png)

---

## Why this exists

Most "free online converter" sites ask you to upload the file first. That is fine for a public dataset and unacceptable for an HR spreadsheet, a client contract, a medical report, or a draft you have not told anyone about yet. They also add an account wall, a daily quota, a 25 MB cap, and an upload round-trip for something your laptop can finish in 40 milliseconds.

Transfer Any File keeps the whole job local. The converters run in the extension page, so a 3 MB Word file becomes Markdown without a single packet leaving the machine — and it still works on a plane.

## Quick start

```bash
# Requirements: Node.js 20.12+ (WXT needs util.parseEnv) and pnpm
pnpm install
pnpm build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select `.output/chrome-mv3`
4. Click the toolbar icon — the workbench opens in a new tab

There is no store listing yet; `CHROMEWEBSTORE.md` holds the publish-ready listing copy, graphics and disclosure answers for when there is.

## How it works

```
drop / pick / paste files          pick one target format
        │                                  │
        ▼                                  ▼
  detect format  ──────►  BFS over the converter graph  ◄── finds the shortest route
  (extension +            14 formats · 46+ direct routes
   magic bytes)                      │
                                     ▼
                     convert file-by-file, cancellable
                     one failure ≠ a failed batch
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
              download one file              batch → single ZIP
              preview & edit first           history written (metadata only)
```

Because every conversion pair registers itself as an edge, multi-step chains are discovered rather than hard-coded: Markdown → HTML → PDF, or Word → HTML → Markdown, run as one click. Adding a converter is 20 lines and instantly unlocks every route through it.

## Supported conversions

| Category  | From                                   | To                                                                                                      |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Documents | Markdown, HTML, Word (.docx), PDF, TXT | Each other via the HTML hub (e.g. MD → DOCX, PDF → MD, TXT → PDF); PDF also rasterizes to PNG/JPEG/WebP |
| Data      | CSV ⇄ Excel (.xlsx), JSON              | Each other and the document cluster via HTML/CSV bridges                                                |
| Images    | PNG, JPEG, WebP, BMP, GIF, SVG         | PNG, JPEG, WebP (GIF renders its first frame; SVG is rasterized)                                        |

> Notes: PDF output is rendered as images (text is not selectable). PDF input extracts text only (layout and images are not preserved). PDF → image renders each page; multi-page documents download as a ZIP of per-page PNGs. BMP, GIF and SVG are input-only — browsers cannot encode them. Multi-sheet XLSX → CSV downloads a ZIP with one CSV per worksheet. The target dropdown lists every format and greys out unreachable ones with a reason: images cannot become text or tabular data (that needs OCR, which this offline extension does not bundle), and PDF cannot be reliably converted to tabular/structured data.

## What you can do with it

**Batch and scale**

- **Mixed-format batches** — drop 40 files of different types; each resolves its own route to the shared target, and only formats reachable from _every_ selected file are offered
- **Per-file error isolation** — one broken file never blocks the batch; failures are listed with their reason
- **ZIP download with per-entry compression** — text results (TXT / CSV / JSON / HTML / Markdown) are deflated and come out roughly 10× smaller, while already-compressed targets (PNG / JPEG / PDF / XLSX / DOCX) are stored as-is so no CPU is spent for no gain
- **Archive intake** — drop a `.zip` and its supported files are extracted into the batch automatically
- **Multi-sheet and multi-page aware** — XLSX → CSV exports every worksheet; PDF → image exports every page
- **Size guards at the boundary** — warns above 20 MB, rejects above 100 MB per file, caps a batch at 200 files

**Preview and edit**

- **Split view** — source and result side by side with a draggable divider, plus Source-only / Result-only modes and sync scrolling
- **Inline editing** — text results (Markdown / HTML / TXT / CSV) can be corrected before you download them
- **Paste to convert** — <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> drops in a clipboard image or text snippet
- **Encoding-aware CSV** — reads UTF-8 with GBK fallback, writes UTF-8 with BOM so Excel opens it without mojibake

**Control and recovery**

- **Undo** — restore the previous batch of results in one click; the snapshot is dropped when you change the selected files or the target format
- **Confirm before big batches** — a summary dialog once a batch exceeds 5 files or 20 MB (fixed thresholds), switchable off in Preferences
- **Custom shortcuts** — <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> starts a conversion and is rebindable; reserved browser combos (<kbd>Ctrl+T/W/N/L</kbd>, <kbd>Tab</kbd>, <kbd>Esc</kbd>, …) are rejected
- **Completion notifications** — optional desktop notification when a batch finishes while the tab is in the background, built on the web `Notification` API so no extra permission is needed
- **Cancellation** — a long batch can be stopped mid-run; finished files are kept

**History and personalization**

- **Conversion history** — the last 50 conversions (metadata only) with one-click "reuse this format", search by file name, filter by source/target format, per-record delete, a size-trend sparkline, and JSON export/import (merged by record ID). A multi-file batch is labelled `"<first file> +N"`; new records also keep the full file list, so every file in the batch is searchable and all of them show on hover. Records saved by earlier versions can only match that label
- **Keyboard accessible** — skip link to the main content, visible focus rings, and full `prefers-reduced-motion` support
- **Measured contrast** — the always-visible surfaces (topbar brand text, skip link, focus rings) clear WCAG 2.1 AA in all 6 themes × light/dark, asserted per theme by the end-to-end suite. Known limitation: on the light green and orange themes the primary button still sits at 2.5–3.6:1, because no single foreground survives its base/hover/active shades — fixing that means re-deriving the light primary scale, which has not been done
- **Personalization** — 6 theme colors × light / dark / system, Chinese/English interface

## Privacy

- All conversions run **100% locally** in the extension page — no first-party source file issues a request (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` appear nowhere in `entrypoints/`, `components/`, `composables/` or `utils/`, asserted by `pnpm verify:offline`), and the manifest declares no host permissions, so Chrome itself refuses anything a request-shaped path left inside a third-party converter library might try
- The only permission requested is `storage`, used for history (file names, formats, sizes — never contents) and preferences
- No analytics, no tracking, no account, no ads, no paid tier
- Full text: [`docs/privacy.html`](docs/privacy.html) · store-facing answers: [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md)

## Usage

1. Click the extension icon — the conversion workbench opens in a new tab
2. Drop files onto the upload zone (or click to select, or paste from clipboard)
3. Pick a target format — only formats reachable from _all_ selected files are offered
4. Click **Convert**, then download a single file or the whole batch as a ZIP
5. Open **Preferences** (top right) to switch theme / language / dark mode, toggle completion notifications and the large-batch confirmation, or rebind the convert shortcut

## FAQ

**Does any part of my file get uploaded?**
No. The converters are JavaScript bundled into the extension, and the manifest requests only `storage`. There is no server to upload to and no host permission that would allow a request.

**Can it convert PDF to editable Word or Excel?**
Not losslessly. PDF input extracts text, and PDF output is rendered page-by-page as images, so converted PDFs are not text-selectable. Word and Excel go through HTML as the hub format.

**Why can't I turn a screenshot into a text file?**
That requires OCR, and no OCR engine is bundled — it would add tens of megabytes and a model download, which the offline guarantee rules out. Image → TXT/CSV is greyed out with that reason instead of failing later.

**Does it work without internet?**
Yes. Once installed, everything including the UI, fonts and converters is local; airplane mode changes nothing.

**How is this different from an online converter?**
Same job, opposite direction: online tools ship your file to a machine you don't control and delete it "within 24 hours"; this one never has a copy to delete. The trade-off is breadth — online tools cover hundreds of formats including video and audio, this one covers 14 document, data and image formats that browsers can decode.

**Is there a file-size or batch limit?**
100 MB per file (warned at 20 MB), 200 files per batch, and a confirmation dialog above 5 files or 20 MB total.

## Development

```bash
pnpm dev              # dev mode with hot reload (WXT)
pnpm build            # production build to .output/chrome-mv3
pnpm package          # zip for distribution
pnpm typecheck        # vue-tsc
pnpm lint:all         # typecheck + eslint + stylelint
pnpm verify:meta      # package.json / wxt.config.ts / .github/repo-metadata.json stay in sync
pnpm verify:offline   # no network call in first-party source, storage-only manifest
pnpm test:e2e         # build + Playwright suite over fixtures/ (159 assertions)
pnpm assets:capture   # regenerate store/README screenshots + promo graphics
node scripts/render-icons.mjs   # re-render icons from assets/*.svg
git tag v1.0.0 && git push --tags   # release.yml: build the store zip, verify it, open the GitHub Release
```

### Tech stack

- [WXT](https://wxt.dev/) + Vue 3 + TypeScript + Element Plus
- Converters: [marked](https://github.com/markedjs/marked), [turndown](https://github.com/mixmark-io/turndown), [mammoth](https://github.com/mwilliamson/mammoth.js), [html-docx-js-typescript](https://github.com/caiyexiang/html-docx-js-typescript), [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image), [pdf.js](https://mozilla.github.io/pdf.js/), [SheetJS](https://sheetjs.com/), [fflate](https://github.com/101arrowz/fflate), [DOMPurify](https://github.com/cure53/DOMPurify)
- Heavy dependencies are dynamically imported per converter, so the first paint stays small (whole bundle: 3.7 MB)

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
docs/                  # product page + privacy policy (GitHub Pages source, not bundled)
  assets/screenshots/  # 1280×800 UI shots used here, on the page and in the store
  assets/store/        # social preview + Chrome Web Store promo tiles
scripts/               # e2e suite, asset capture, icon rendering, metadata + offline guards
.github/
  workflows/           # ci.yml · static.yml (Pages) · release.yml · repo-meta.yml
  ISSUE_TEMPLATE/      # bug report and format request forms
CHROMEWEBSTORE.md      # store listing copy, permissions justification, disclosures
CHANGELOG.md           # release notes (CHANGELOG.zh-CN.md is the Chinese twin)
SECURITY.md            # disclosure channel and the offline attack-surface claims
```

`docs/` is repository documentation only — it is never copied into `.output/chrome-mv3`.

### Adding a new converter

1. Create `utils/converters/<from>-to-<to>.ts` implementing the `Converter` interface (`from`, `to`, `convert(blob)`)
2. Register it in `utils/converters/index.ts`
3. If it introduces a new format: extend `FileFormat`, `FORMAT_INFO` and the extension/MIME maps in `composables/useFileDetect.ts`

Multi-step paths through the new format are discovered automatically.

## Contributing

1. Fork, branch off `main`, and run `pnpm install && pnpm dev`
2. Keep it offline: no new permission, no network call, no remote asset — say so in the PR if a change needs one
3. Run `pnpm lint:all` and `pnpm test:e2e`, and add a fixture + scenario for any new converter

Issues and format requests: [github.com/liaolongdong/transfer-any-file/issues](https://github.com/liaolongdong/transfer-any-file/issues)

## License

[ISC](LICENSE)

---

<div align="center">

**If this saves you from uploading a sensitive file one more time, a star helps the next person find it.**

[![Star this repo](https://img.shields.io/github/stars/liaolongdong/transfer-any-file?style=for-the-badge&logo=github&label=%E2%AD%90%20Star%20this%20repo&color=yellow)](https://github.com/liaolongdong/transfer-any-file/stargazers)

Authored by [Better](https://github.com/liaolongdong).

</div>
