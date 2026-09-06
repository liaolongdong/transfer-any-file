# Chrome Web Store Listing — File Any Transfer

> Last Updated: 2026-09-06
> Status: **not published yet.** This repo has no store listing to optimise — `manifest.json` carries no `key`, the README only documents "Load unpacked", and there is no extension ID anywhere in the tree. This file is the publish-ready asset pack: copy each field into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole), and keep it updated whenever permissions, features or graphics change.

**Character counts below are measured, not estimated** — re-measure after any edit (`node -e 'process.stdout.write(String("<text>".length))'`), because the store rejects over-length fields silently in some locales.

---

## Store Listing

**Extension Name** [REQUIRED] — 17 chars, limit 75

```
File Any Transfer
```

> ⚠️ **Decision needed before publishing.** The store's name field is the single strongest ranking signal, and the current name carries no searchable term. Recommended variant (49 chars, still under the limit):
>
> ```
> File Any Transfer — Offline File Format Converter
> ```
>
> Renaming means editing `wxt.config.ts → manifest.name` **and** the in-app brand, so it is a user-visible change that needs your sign-off. Nothing in this repo has been renamed.

**Short Description** [REQUIRED] — 129 chars, limit 132

```
Convert 14 file formats locally in your browser: Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. Batch, offline, no uploads.
```

Mirrored in `wxt.config.ts → manifest.description` and `package.json → description`. Keep the three in sync.

**Chinese (China) short description** — 66 chars, limit 132

```
在本机浏览器内互转 14 种文件格式：Markdown、Word、PDF、Excel、CSV、JSON、HTML、图片。支持批量，全程离线，无需上传。
```

**Detailed Description** [REQUIRED] — plain text, limit 16,000 chars

The store strips markdown, so this is written with `•` bullets and blank-line sections. It deliberately contains **no** implementation details (no framework, library or API names) and states the limitations up front — "misleading functionality" is a common rejection reason.

```
File Any Transfer converts your files between common formats without uploading them anywhere. Everything happens in a page inside your own browser: no server, no account, no queue, and nothing to wait for on a slow connection.

WHAT YOU CAN CONVERT
• Documents: Markdown, HTML, Word (.docx), PDF and plain text, in any direction
• Data: CSV, Excel (.xlsx) and JSON, in any direction
• Images: PNG, JPEG, WebP, BMP, GIF and SVG — converted to PNG, JPEG or WebP
• 14 formats and 46+ conversion routes in total. When two formats have no direct route, the workbench finds the intermediate steps itself — for example Markdown → HTML → PDF, or Word → HTML → Markdown

BUILT FOR REAL WORKLOADS
• Batch conversion: drop in a whole folder's worth of files, even a mix of different source formats — each file resolves its own route to the target
• Per-file error reporting: one unreadable file never blocks the rest of the batch, and every failure is listed with its reason
• ZIP download: convert forty files, download one archive. Multi-page PDFs and multi-sheet workbooks are automatically split into one output per page / per sheet
• Paste to convert: copy an image or a block of text and press Ctrl+V (⌘V on Mac)
• Preview and edit: view the source and the result side by side, and correct text output (Markdown / HTML / CSV / plain text) before downloading
• Archive intake: drop a .zip and the supported files inside join the batch automatically
• Excel-friendly CSV: reads UTF-8 and falls back to GBK, writes UTF-8 with a BOM so spreadsheets open without garbled characters
• Conversion history: the last 50 runs (file names, formats and sizes only), searchable by file name, filterable, reusable in one click, exportable and importable as JSON
• Undo the previous batch, confirm before a very large batch, and an optional desktop notification when a long job finishes while the tab is in the background
• Personalisation: 6 accent colours, light / dark / follow-system appearance, and a Chinese or English interface
• Keyboard friendly: start a conversion with Ctrl+Enter (⌘Enter), rebindable; skip-to-content link and visible focus indicators throughout

HOW TO USE
1. Click the toolbar icon — the workbench opens in a new tab
2. Drop files on the upload area, click to choose them, or paste from the clipboard
3. Pick the target format. Only formats that every selected file can reach are offered; the rest are greyed out with a reason
4. Press Convert, then download a single file or the whole batch as one ZIP

PRIVACY
• Your files never leave your device. The extension makes no network requests of any kind
• The only permission it requests is access to extension storage, used to keep your conversion history and preferences on this machine
• No analytics, no tracking, no sign-in, no advertising, no paid tier

PLEASE KNOW BEFORE INSTALLING
• PDF output is rendered page by page as an image, so text in a converted PDF is not selectable
• PDF input extracts the text; the original layout and embedded images are not preserved
• Images cannot be turned into text or spreadsheets — that needs OCR, which is not bundled
• BMP, GIF and SVG can be converted from, but not to, because browsers cannot encode them (GIF uses its first frame, SVG is flattened)
• One file up to 100 MB is accepted, and a batch is limited to 200 files

SUPPORT
Found a bug, or need a format added? Open an issue at https://github.com/<GH_OWNER>/file-format-converter/issues

Version 1.0.0 — first store submission.
```

**Chinese (China) detailed description** — same structure, translate faithfully; the in-app Chinese strings are the terminology source (`utils/i18n/zh.ts`): 转换工作台 / 批量转换 / 转换历史 / 目标格式 / 打包下载. Do not introduce synonyms the UI does not use.

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

Add `Chinese (China)` as an additional language with the ZH fields above — the extension UI ships both locales and defaults to Chinese.

---

## Graphics & Assets

| Asset                 | Dimensions   | Status   | Filename                                      |
| --------------------- | ------------ | -------- | --------------------------------------------- |
| Store Icon            | 128×128 PNG  | ✅ Ready | `public/icon/128.png`                         |
| Screenshot 1          | 1280×800 PNG | ✅ Ready | `docs/assets/screenshots/workbench-empty.png` |
| Screenshot 2          | 1280×800 PNG | ✅ Ready | `docs/assets/screenshots/batch-files.png`     |
| Screenshot 3          | 1280×800 PNG | ✅ Ready | `docs/assets/screenshots/batch-results.png`   |
| Screenshot 4          | 1280×800 PNG | ✅ Ready | `docs/assets/screenshots/preview-edit.png`    |
| Screenshot 5          | 1280×800 PNG | ✅ Ready | `docs/assets/screenshots/history.png`         |
| Screenshot 6          | 1280×800 PNG | ✅ Ready | `docs/assets/screenshots/dark-mode.png`       |
| Small Promo Tile      | 440×280 PNG  | ✅ Ready | `docs/assets/store/cws-small-promo.png`       |
| Marquee Promo Tile    | 1400×560 PNG | ✅ Ready | `docs/assets/store/cws-marquee-promo.png`     |
| GitHub social preview | 1280×640 PNG | ✅ Ready | `docs/assets/store/github-social-preview.png` |

All of them are generated, not hand-taken: `pnpm build && pnpm assets:capture` re-shoots every file from the current bundle, so a UI change cannot leave the store kit stale.

### Screenshot Notes

1. `workbench-empty` — first-run state: topbar brand + tagline, drop zone, empty history, and the "14 formats supported, 46+ conversion paths" footer. Sets expectations for a brand-new user.
2. `batch-files` — three mixed-format files (Markdown + CSV + Excel) staged with one target, showing the batch capability that most converters lack.
3. `batch-results` — "Conversion complete! 3 files" with per-file preview / copy / download and a single "Download ZIP (3)" action.
4. `preview-edit` — split source ↔ result with Rendered / Source / Edit / Copy controls. The strongest differentiator; also the hero image on the product page.
5. `history` — searchable, filterable history with "Reuse this format".
6. `dark-mode` — dark appearance, proof the UI is themeable.

Screenshots are English because the primary listing language is English. If you localise the listing to Chinese, re-shoot with `fat:locale: 'zh'` seeded in `scripts/capture-store-assets.mjs`.

---

## Permissions Justification

| Permission | Type        | Justification                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`  | permissions | Stores the user's own conversion history (file names, formats, sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) between sessions, via `chrome.storage.local`. Nothing is transmitted: the extension declares no host permissions and issues no network requests. |

No `host_permissions`, no content scripts, no `tabs`, no `<all_urls>`, no remote code. The toolbar icon is wired through `chrome.action.onClicked` → `chrome.runtime.openOptionsPage()`; the workbench is an extension page, so no website access is ever requested. Expect the install prompt to show **no** data-access warnings.

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** **No.**

| Data Type                    | Collected?               | Transmitted Off-Device? | Purpose                                                       | Shared with Third Parties? |
| ---------------------------- | ------------------------ | ----------------------- | ------------------------------------------------------------- | -------------------------- |
| Personally identifiable info | No                       | No                      | —                                                             | No                         |
| Health info                  | No                       | No                      | —                                                             | No                         |
| Financial info               | No                       | No                      | —                                                             | No                         |
| Authentication info          | No                       | No                      | —                                                             | No                         |
| Personal communications      | No                       | No                      | —                                                             | No                         |
| Location                     | No                       | No                      | —                                                             | No                         |
| Web history                  | No                       | No                      | —                                                             | No                         |
| User activity                | No (kept locally)        | No                      | On-device conversion history only                             | No                         |
| Website content              | No                       | No                      | —                                                             | No                         |
| User files                   | Processed on-device only | Never                   | Format conversion, then handed back to the user as a download | No                         |

On the disclosure form: select **"We don't collect any user data from this extension"** — the extension has no code path that sends anything off the device (`fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon` appear nowhere in `entrypoints/`, `components/`, `composables/`, `utils/`, and no host permission is declared). Verify again with the same grep before each submission.

### Data Use Certification

- [x] Data is not sold to third parties
- [x] Data is not used for purposes unrelated to the extension's core functionality
- [x] Data is not used for creditworthiness or lending purposes
- [x] Limited Use: no data is transferred or shared at all

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED] — ⚠️ must be live before submission

```
https://<GH_OWNER>.github.io/file-format-converter/privacy.html
```

The page itself is written and lives at `docs/privacy.html` (bilingual, no analytics, no external assets). It only becomes a valid URL after you (a) create the GitHub remote, (b) enable **Settings → Pages → Deploy from a branch → `master` /docs**, and (c) substitute `<GH_OWNER>`. Until then the extension cannot be published — the dashboard will not accept a submission without a reachable policy URL.

---

## Distribution

**Visibility**: Public
**Regions**: All regions

---

## Developer Info

| Field          | Value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Publisher Name | ⚠️ _you must provide_ — the CWS developer account name                                                     |
| Contact Email  | ⚠️ _you must provide_ — shown publicly on the listing; do not paste a personal mailbox without deciding to |
| Support URL    | `https://github.com/<GH_OWNER>/file-format-converter/issues`                                               |
| Homepage URL   | `https://<GH_OWNER>.github.io/file-format-converter/`                                                      |

---

## Version History

| Version | Date       | Changes                                                                                                                | Status |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.0.0   | 2026-09-06 | First submission: 14 formats / 46+ routes, batch + ZIP, multi-step chains, preview & edit, history, 6 themes, zh/en UI | Draft  |

---

## Review Notes

### Known Issues / Limitations (disclose proactively if the reviewer asks)

- PDF output is image-based by design (jsPDF renders the page); selectable-text PDF export is not offered. Documented in the description so it cannot be read as a misleading claim.
- PDF input is text extraction only; layout and embedded images are dropped.
- No OCR, so image → text/data is intentionally greyed out in the target picker rather than failing at convert time.
- BMP / GIF / SVG are input-only because browsers expose no encoders for them.
- The light forest-green and light orange themes leave the primary button at 2.5–3.6:1 contrast (see README "Measured contrast"); all always-visible surfaces meet WCAG 2.1 AA, and this residual is a known, documented gap rather than a regression.

### Pre-Publish Checklist

- [x] `manifest_version: 3`, MV3-only APIs
- [x] All four icon sizes exist and match their declared dimensions
- [x] Only `storage` permission; every permission has a specific justification above
- [x] No remote code, no CDN assets, no `eval` / `new Function`
- [x] No obfuscation (Vite minification only); source maps excluded
- [x] Description matches shipped behaviour, including limitations
- [x] Screenshots at exactly 1280×800, generated from the built bundle
- [x] Privacy policy text authored (bilingual), hosted under `docs/`
- [ ] **GitHub remote created and GitHub Pages enabled** — blocks privacy URL + support URL
- [ ] **Privacy policy URL is publicly reachable** and matches the disclosure form
- [ ] **Publisher name and public contact email decided**
- [ ] Store name / keyword variant approved (see "Decision needed" above)
- [ ] `pnpm package` zip inspected: excludes `.git/`, `node_modules/`, `.test-*`, `CHROMEWEBSTORE.md`, `docs/`, `fixtures/`
- [ ] `pnpm lint:all` and `pnpm test:e2e` green on the commit being packaged

### Rejection History

_None yet — not submitted._
