# Chrome Web Store Listing — Transfer Any File

> Last Updated: 2026-09-07
> Status: **not published yet.** This repo has no store listing to optimise — `manifest.json` carries no `key`, the README only documents "Load unpacked", and there is no extension ID anywhere in the tree. This file is the publish-ready asset pack: copy each field into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole), and keep it updated whenever permissions, features or graphics change.

**Character counts below are measured, not estimated** — re-measure after any edit (`node -e 'process.stdout.write(String("<text>".length))'`), because the store rejects over-length fields silently in some locales.

---

## Store Listing

**Extension Name** [REQUIRED] — 49 chars, limit 75

```
Transfer Any File — Offline File Format Converter
```

> Renamed on 2026-09-06 from `File Any Transfer`, for two reasons: the store name is the single strongest ranking signal and the old one carried no searchable term, while generic names in this category (`File Converter`, `ConvertX`, `FileForge`, `FileConverter`) are already held by high-volume projects; and `File Any Transfer` reads to an English speaker as the verb phrase "file any transfer" (≈ submit a transfer request), which never connected to format conversion. The word order fix keeps every original word.
>
> | Where                                                                 | Value                                                                                                                                                                                                                                                                                                                                                                                                          |
> | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Store listing / `wxt.config.ts → manifest.name`                       | `Transfer Any File — Offline File Format Converter`                                                                                                                                                                                                                                                                                                                                                            |
> | In-app brand (`utils/i18n/*.ts → appName`), tab title, promo graphics | `Transfer Any File`                                                                                                                                                                                                                                                                                                                                                                                            |
> | GitHub repo                                                           | `transfer-any-file` — matches the brand, the npm package name and this listing, so CWS / GitHub / Pages / npm resolve to **one entity**. The repository has since been created and pushed under this account, so the slug is fixed; GitHub search coverage comes from the About description + topics rather than the slug. The local working directory name is irrelevant to the repo name and may stay as-is. |

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
Transfer Any File converts your files between common formats without uploading them anywhere. Everything happens in a page inside your own browser: no server, no account, no queue, and nothing to wait for on a slow connection.

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
Found a bug, or need a format added? Open an issue at https://github.com/liaolongdong/transfer-any-file/issues

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
| Brand master          | 512×512 PNG  | ✅ Ready | `docs/assets/icon.png`                        |
| Brand mark            | 64×64 PNG    | ✅ Ready | `docs/assets/icon-mark.png`                   |
| Small Promo Tile      | 440×280 PNG  | ✅ Ready | `docs/assets/store/cws-small-promo.png`       |
| Marquee Promo Tile    | 1400×560 PNG | ✅ Ready | `docs/assets/store/cws-marquee-promo.png`     |
| GitHub social preview | 1280×640 PNG | ✅ Ready | `docs/assets/store/github-social-preview.png` |

All of them are generated, not hand-taken: `pnpm build && pnpm assets:capture` re-shoots every file from the current bundle, so a UI change cannot leave the store kit stale.

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

On the disclosure form: select **"We don't collect any user data from this extension"** — the extension has no code path that sends anything off the device (`fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon` appear nowhere in `entrypoints/`, `components/`, `composables/`, `utils/`, and no host permission is declared, which is also what keeps the unused request paths inside jsPDF / pdf.js inert). Re-run the same assertion before each submission with `pnpm verify:offline` — CI runs it on every push.

### Data Use Certification

- [x] Data is not sold to third parties
- [x] Data is not used for purposes unrelated to the extension's core functionality
- [x] Data is not used for creditworthiness or lending purposes
- [x] Limited Use: no data is transferred or shared at all

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED] — ⚠️ must be live before submission

```
https://liaolongdong.github.io/transfer-any-file/privacy.html
```

The page lives at `docs/privacy.html` (bilingual, no analytics, no external assets) and the repository is already pushed, but **the URL is 404 until the first Pages deploy of the current `static.yml` succeeds** — the version GitHub's own wizard created published the _repository_ as the site root, so `/transfer-any-file/privacy.html` only resolves once `docs/` is the artifact root. Verify before submitting, do not assume:

```bash
curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1   # expect: HTTP/2 200
```

This is a hard precondition rather than a nice-to-have — the dashboard will not accept a submission without a reachable policy URL.

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

Source of truth is `.github/repo-metadata.json`; `.github/workflows/repo-meta.yml` pushes it onto the repository. The repository itself already exists (`liaolongdong/transfer-any-file`, default branch `main`, ISC), but `GET /repos/liaolongdong/transfer-any-file` reports `description: null`, `homepage: null` and `topics: []` — none of this is applied yet, because `gh` is not installed on this machine. Land it either by running the workflow with a `REPO_METADATA_TOKEN` secret, or by the one-off `gh repo edit` at the end of this section; the purely manual path is the repository's **Settings → General → About** block.

**Repository name** — `transfer-any-file`

Every link already written into `README.md`, `README.zh-CN.md`, `docs/index.html` (including JSON-LD `codeRepository`), `docs/privacy.html` and this file points at `github.com/liaolongdong/transfer-any-file`, and the slug equals `package.json#name` and the manifest brand. Creating the repository under any other name silently breaks all of them.

**Description (About)** — 119 chars (GitHub allows 350; under 120 keeps the whole string inside Google's snippet width)

```
Offline file format converter for Chrome: 14 formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. No uploads.
```

It leads with the exact phrase `file format converter` on purpose: that is the keyword coverage the brand slug deliberately gives up, and the About field is where GitHub search and the search snippet read it from. `14 formats` is the same figure the workbench footer computes (`entrypoints/options/App.vue → formatCount`); re-derive it from the code, not from this file, if the converter set changes.

**Topics** — 18, one per group axis (GitHub accepts unlisted topic names, so a missing one is not an error):

| Group   | Topics                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose | `file-format-converter`, `file-converter`, `format-conversion`, `file-conversion`, `document-conversion`, `pdf-converter`, `image-conversion`, `batch-processing` |
| Values  | `offline-first`, `local-first`, `privacy-first`, `privacy-tools`                                                                                                  |
| Stack   | `chrome-extension`, `browser-extension`, `wxt`, `vue3`, `typescript`, `vite`                                                                                      |

`file-format-converter` and `file-converter` are not redundant, so keep both. Verified 2026-09-07: the former is a small topic whose listing tops out at 340 stars — the one surface where a zero-star repository appears near the top on day one — while the latter is head-dominated by ConvertX at 18.8k stars and is where the browsing volume actually is.

**Social preview** — Settings → General → Social preview → upload `docs/assets/store/github-social-preview.png` (1280×640, already generated by `pnpm assets:capture`). It is what every shared link renders as, and unlike stars it cannot be grown into later.

With `gh` installed and the repository pushed, the same three fields in one command:

```bash
gh repo edit liaolongdong/transfer-any-file \
  --description "Offline file format converter for Chrome: 14 formats — Markdown, Word, PDF, Excel, CSV, JSON, HTML, images. No uploads." \
  --homepage "https://liaolongdong.github.io/transfer-any-file/" \
  --add-topic file-format-converter --add-topic file-converter --add-topic format-conversion \
  --add-topic file-conversion --add-topic document-conversion --add-topic pdf-converter \
  --add-topic image-conversion --add-topic batch-processing --add-topic offline-first \
  --add-topic local-first --add-topic privacy-first --add-topic privacy-tools \
  --add-topic chrome-extension --add-topic browser-extension --add-topic wxt \
  --add-topic vue3 --add-topic typescript --add-topic vite
```

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

| Dashboard tab      | Source in this file                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Store listing      | **Store Listing** (name 49/75, short 129/132, detailed description, `Productivity`, single purpose, English + Chinese (China)) |
| Screenshots & icon | **Graphics & Assets** — 6 × 1280×800, `public/icon/128.png`, small and marquee promo tiles                                     |
| Privacy practices  | **Privacy & Data Use** — select "We don't collect any user data from this extension"                                           |
| Summary / rollout  | **Distribution** (public, all regions); the item ID lands here                                                                 |

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

## Version History

| Version | Date       | Changes                                                                                                                | Status |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.0.0   | 2026-09-07 | First submission: 14 formats / 46+ routes, batch + ZIP, multi-step chains, preview & edit, history, 6 themes, zh/en UI | Draft  |

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
- [x] Every slot under 48px uses the simplified tier; the detailed master is used at 48px and above
- [x] Only `storage` permission; every permission has a specific justification above
- [x] No remote code, no CDN assets, no `eval` / `new Function`
- [x] No obfuscation (Vite minification only); source maps excluded
- [x] Description matches shipped behaviour, including limitations
- [x] Screenshots at exactly 1280×800, generated from the built bundle
- [x] Privacy policy text authored (bilingual), hosted under `docs/`
- [ ] **GitHub Pages serving `docs/` as the site root** — `.github/workflows/static.yml` is written to do this, but the deploy currently live still publishes the repository root, which is why `https://liaolongdong.github.io/transfer-any-file/` and its `/privacy.html` answer 404 today. Order matters: merge, wait for the Pages run, then tick the next line.
- [ ] **Privacy policy URL is publicly reachable** (`HTTP/2 200` from the `curl -Is` above) and matches the disclosure form — blocks the submission outright
- [x] Public contact email chosen and consistent with `package.json#author.email`
- [ ] **Publisher name decided** — must match the CWS developer account's public name
- [x] Store name renamed to the brand + keyword form above (2026-09-06); `manifest.name` matches it
- [x] Repository created as `liaolongdong/transfer-any-file` (default branch `main`)
- [ ] About description + 18 topics above applied (GitHub search coverage lives here, not in the slug) — via `.github/workflows/repo-meta.yml` or the `gh repo edit` command
- [ ] GitHub social preview uploaded from `docs/assets/store/github-social-preview.png` — dashboard only, there is no API for it
- [x] `pnpm package` zip inspected: excludes `.git/`, `node_modules/`, `.test-*`, `CHROMEWEBSTORE.md`, `docs/`, `fixtures/` — asserted by `.github/workflows/release.yml`
- [ ] `pnpm lint:all` and `pnpm test:e2e` green on the commit being packaged

### Rejection History

_None yet — not submitted._
