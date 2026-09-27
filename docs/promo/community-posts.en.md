# Community distribution copy (English channels) · Transfer Any File

> Purpose: turn the shipped product facts into GitHub traffic, stars and — once the listing goes live — installs.
> Pairs with [`community-posts.md`](community-posts.md) (Chinese channels: Juejin / V2EX / Zhihu / Jike) and
> [`blog-article.en.md`](blog-article.en.md) (the long-form draft, already published at `/blog/` on the site).
> Nothing here publishes itself: every block is paste-ready, and posting is a manual, confirmed act.

## Facts to copy from (never from memory)

Same numbers as the Chinese file, same sources. `pnpm verify:numbers` derives every one of them from code or
from a recorded test run, so a number that moved in the code makes the prose fail rather than quietly age.

- 14 formats: 5 document, 3 data, 6 image (`utils/core/types.ts`)
- 48 direct routes registered (`scripts/__baseline__/conversion-paths.json`)
- BFS over that graph makes 143 combinations reachable, and the picker offers 116 of them: the other 27 are greyed out with a reason (24 image→text/data and 3 PDF→data pairs)
- One permission: `storage`. No host permissions, no upload step, works with networking off
- 100 MB per file, 200 files per batch; a batch above 5 files or 20 MB asks first
- Playwright drives the built artifact through 317 assertions
- The whole extension builds to 3.78 MB
- MIT, sole author ([github.com/liaolongdong](https://github.com/liaolongdong))
- **Not on the Chrome Web Store yet.** Installing means building and loading unpacked.

Links, in the order you should reach for them:

- Repository: <https://github.com/liaolongdong/transfer-any-file>
- Product page (bilingual EN/中文): <https://liaolongdong.github.io/transfer-any-file/>
- Per-route pages (what each conversion keeps and drops): <https://liaolongdong.github.io/transfer-any-file/convert/>
- Long-form post: <https://liaolongdong.github.io/transfer-any-file/blog/>

## dev.to / Hashnode (cross-post of the published article)

The canonical version is already on the site, so both platforms must point the canonical URL at it — that is what
keeps the site from being outranked by your own republication.

- Set canonical URL to `https://liaolongdong.github.io/transfer-any-file/blog/` in both dashboards.
- Body: paste from [`blog-article.en.md`](blog-article.en.md) (it was written as the article; the published page
  carries the same text with the site chrome around it).
- dev.to tags: `webdev`, `javascript`, `typescript`, `opensource`, `privacy`
- Hashnode tags: `web-development`, `typescript`, `open-source`, `privacy`, `productivity`

Titles, in descending order of how much they actually get clicked:

1. `I turned file format conversion into a Chrome extension that never goes online`
2. `Every "100% local" file converter still uploads. Here is one that cannot.`
3. `48 converters, one graph, zero uploads: building an offline format converter`

The one paragraph that earns the share is the rejection story, not the feature list: the store judged the
**artifact**, not reachability, so jsPDF's dead `pdfobject` branch and pdf.js's `_createCDNWrapper` — code paths
this app can never enter — were enough to fail review three times. The fix had to be a build-time `transform`
that deletes those strings from the bundle, plus a guard that re-reads the artifact on every dependency bump.

## Show HN

Title (≤64 chars, no marketing adjectives, the store status belongs in the comment):

```
Show HN: An offline file format converter as a Chrome extension (MIT)
```

Text field:

```
14 formats convert to each other on your own machine: Markdown, Word, PDF, TXT, HTML, CSV, XLSX, JSON and six
image formats. Each conversion is registered as an edge in a graph, and a route like Markdown → PDF is found by
BFS (Markdown → HTML → PDF) rather than hard-coded, so a new converter makes every path through it available at
once. Mixed batches work: 200 files of different source formats, one target, per-file error isolation.

The privacy claim is enforced, not asserted: one permission (storage), a CI guard over the source, and a second
guard that reads the built manifest after `pnpm build`. The latter exists because the bundler can add things the
source never mentioned.

What it deliberately cannot do: no OCR, so images cannot become text or spreadsheets; PDF output is per-page
images with no text layer; BMP/GIF/SVG are input-only because browsers ship no encoder for them.

Not on the Chrome Web Store yet, so installing means `pnpm build` and loading `.output/chrome-mv3` unpacked. I
will edit this comment with the store link when the listing is live.
https://github.com/liaolongdong/transfer-any-file
```

Reply posture for the first 12 hours, in this order:

- Someone asks "why an extension instead of a CLI / Pandoc / ImageMagick": agree the CLI is more capable, then
  say the audience is the person who will not install a toolchain for a one-off conversion, and that the graph +
  BFS part is what makes 14 formats tractable in about 20 lines per converter.
- Someone asks for a format: answer with whether the browser can encode it at all, and link the issue. "Cannot"
  is a fine answer; the app already says so in its own UI, with the reason.
- Someone says "PDF → Word is a lie": they are right to check. The app's own documentation says PDF input
  extracts text only, and the target picker greys out pairings that cannot be honoured. Quote the docs page
  rather than arguing.
- Never post the same comment in multiple threads, and never ask for upvotes. Both are how accounts get filtered.

## Reddit (pick ONE sub; cross-posting identical text is spam-flagged)

Ranked by how well this fits the sub's actual culture:

1. **r/chrome_extensions** — most on-topic, lowest reach.
2. **r/selfhosted** — frame it as "no third party ever sees the file"; expect "why not a CLI" and "why not
   Pandoc" as the top comment, and answer it in the post body preemptively.
3. **r/cooltools** — reach without technical hostility; needs screenshots, and the honest limits block goes last.
4. **r/LocalLLaMA / r/webdev** — only the build-time remote-code-strip story as its own post; that is a genuinely
   reusable finding.

Title and body for r/chrome_extensions:

```
Title: Open-source offline format converter (14 formats, MV3, one permission, MIT) — not on the store yet

Body:
WXT + Vue 3 + TypeScript. Files never leave the tab: no host permissions, and the manifest is checked after
build as well as at source level, because bundlers can add permissions the source never declared.

The part I would actually reuse in another extension: conversion is a graph. Each converter registers as an
edge (from, to, convert()), and BFS resolves multi-step routes, so Markdown → PDF runs as Markdown → HTML → PDF
without any call site knowing that. Adding a converter is about 20 lines and every path through it works
immediately. A policy layer then greys out pairings that are reachable but meaningless — image to spreadsheet,
for example — with the reason shown, instead of failing after you press Convert.

If you publish to the store, one warning from three rejections: the reviewer scans the *artifact*, not
reachability. Dead code in jsPDF that injects a cdnjs script, and pdf.js's CDN wrapper, were enough to fail an
extension whose only permission is storage. Runtime guards do not help, because the string is still in the
bundle. It has to be deleted at build time.

Repo: https://github.com/liaolongdong/transfer-any-file
Limits it states about itself: no OCR, PDF output has no text layer, BMP/GIF/SVG are input-only.
```

## awesome-list pull requests

One line each, in the list's own voice, with the licence and the offline claim attached. Match the
capitalisation, punctuation and link placement of the neighbouring entries — a PR that restyles the list gets
closed on form, not on merit.

For an "awesome Chrome extensions" / "awesome productivity" list:

```
- [Transfer Any File](https://github.com/liaolongdong/transfer-any-file) - converts 14 file formats between each
  other entirely in the browser: mixed-format batches, automatic multi-step routes, one permission, no uploads.
  MIT.
```

For an "awesome offline / local-first" list:

```
- [Transfer Any File](https://github.com/liaolongdong/transfer-any-file) - offline document, spreadsheet and image
  format conversion as a Manifest V3 extension. Ships with source-level and artifact-level privacy guards that
  assert the no-network claim in CI. MIT.
```

Before opening a PR: read that list's contributing rules (several require the entry to be non-commercial, or
require the PR author to be the maintainer — both are true here), search the list for a duplicate entry, and
check whether it wants the item already published somewhere (several reject "load unpacked only").

## X / Mastodon (short, and only after the store link exists)

```
14 file formats, converted inside your own browser tab. No upload step, one permission, works with networking
switched off — and that claim is a CI guard over the built manifest, not a line in a README.
MIT, offline-first: https://liaolongdong.github.io/transfer-any-file/
```

## Posting rules (every time)

1. Take every number from the fact list above; if the code changed, re-run `pnpm verify:numbers` first.
2. Say plainly that there is no store listing yet. Traffic that cannot install converts into "how do I install
   this?" issues, not users.
3. Keep the negative claims visible — no OCR, image-based PDF output, three image formats input-only. An
   overstated claim is a rejection risk for the listing and a trust cost in the thread.
4. No tracking parameters on any link. The project's own claim is that it issues no requests; appending `?utm_`
   undercuts it in the most visible place possible.
5. One channel first, then the rest. Simultaneous identical posts get flagged as marketing accounts.
6. Screenshots come from `docs/assets/` (generated by `pnpm assets:capture`). If the UI moved, re-capture before
   posting — a stale screenshot costs more trust than no screenshot.
7. Stay for a day. Corrections that are right get fixed in the docs, not deleted from the thread.
