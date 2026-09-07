# Changelog

[简体中文](CHANGELOG.zh-CN.md) · English

All notable changes to **Transfer Any File** are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and the version in `package.json`
is the extension's manifest version, so a git tag `vX.Y.Z`, the built bundle and the store package
always name the same release.

## [Unreleased]

_No pending changes._

## [1.0.0] - 2026-09-07

First release: an offline file format converter for Chrome (Manifest V3). Every conversion runs in
a tab on your own machine — no server, no account, no network request.

### Added

- **Workbench** — clicking the toolbar icon opens the converter in a new tab. There is no popup and
  no side panel; the whole job happens on that one page.
- **14 formats** — documents (Markdown, HTML, Word `.docx`, PDF, TXT), data (CSV, Excel `.xlsx`,
  JSON) and images (PNG, JPEG, WebP, BMP, GIF, SVG); 46 registered direct routes, and BFS over the
  converter registry makes 143 source→target combinations selectable.
- **Automatic multi-step chains** — `Markdown → PDF` runs as `Markdown → HTML → PDF`, and the route
  is shown under the picker. Adding a converter instantly unlocks every route through it.
- **Mixed-format batches** — files of different types share one target; only formats reachable from
  _every_ selected file are offered. One unreadable file never blocks the batch: failures are listed
  per file with their reason.
- **Control** — cancel a long batch with finished results kept, undo the previous batch, confirm
  before a batch larger than 5 files or 20 MB, optional desktop notification when a job finishes in
  a background tab, rebindable `Ctrl/⌘ + Enter` to start a conversion.
- **Preview and edit** — source and result side by side with a draggable divider, synchronised
  scrolling and source-only / result-only modes; text results (Markdown, HTML, TXT, JSON, CSV) are
  editable inline before download.
- **Batch I/O** — ZIP download with a per-entry strategy (text deflated to roughly a tenth,
  already-compressed outputs stored as-is), ZIP intake (drop an archive and its supported files join
  the batch), one CSV per worksheet for multi-sheet workbooks, one image per page for multi-page
  PDFs, and paste-from-clipboard (`⌘V` / `Ctrl+V`).
- **Chinese spreadsheets stay readable** — CSV reads UTF-8 with automatic GBK fallback and writes
  UTF-8 with a BOM, so exports from domestic Chinese software open without mojibake.
- **History** — the last 50 conversions as metadata only (names, formats, sizes, never contents):
  search by file name, filter by source or target, reuse a combination in one click, per-record
  delete, a size-trend sparkline, and JSON export / import merged by record ID.
- **Personalisation** — 6 accent colours × light / dark / follow-system, applied before mount so
  there is no flash of the wrong palette; Chinese and English interface (default Chinese).
- **Accessibility** — skip link to the main content, visible focus rings, ARIA labelling and
  `prefers-reduced-motion` fallbacks; the always-visible surfaces are measured to clear WCAG 2.1 AA
  contrast in all 6 themes × light/dark by the end-to-end suite.
- **Privacy by structure** — the manifest requests only `storage`, declares no `host_permissions`
  and ships no remote code; `pnpm verify:offline` asserts on every CI run that no first-party source
  file issues a request.
- **Tooling** — WXT + Vue 3 + TypeScript + Element Plus (on-demand), heavy conversion libraries
  dynamically imported per converter so the first paint stays small; a Playwright suite that drives
  the built bundle over `fixtures/`; CI with lint, build and end-to-end; GitHub Pages published from
  `docs/`; a release workflow that builds the store package and checks its contents.

### Known limits (documented rather than hidden)

- PDF output is rendered page by page as images, so its text is not selectable or searchable.
- PDF input extracts text only; layout and embedded images are not preserved.
- No OCR — image → TXT/CSV/Excel is greyed out with the reason shown, because an OCR model would add
  tens of megabytes and a download, which the offline guarantee rules out.
- BMP, GIF and SVG can be converted _from_ but not _to_: browsers expose no encoders for them (GIF
  uses its first frame, SVG is flattened before rasterising).
- Limits: 100 MB per file (warned above 20 MB), 200 files per batch. No video, audio, e-book or CAD
  formats.

<!-- The link targets below only resolve once the tag exists; .github/workflows/release.yml creates the Release for a pushed `vX.Y.Z`. -->

[unreleased]: https://github.com/liaolongdong/transfer-any-file/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/liaolongdong/transfer-any-file/releases/tag/v1.0.0
