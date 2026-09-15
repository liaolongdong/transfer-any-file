<!-- English counterpart of wechat-article.md. Same facts, same assets; the Chinese draft is tuned for
     WeChat (links moved to the footer by the render script), this one reads as a standalone dev blog post. -->

# I turned file format conversion into a Chrome extension that never goes online

> 14 formats, 46+ conversion routes, 0 network requests. Three things this post tries to make clear: why online converters are the wrong tool for sensitive files, why the browser is already a converter, and which engineering trade-offs you actually hit when you move the work local.

![Concept illustration: a file changes format entirely inside the browser window, with no line leading to the cloud](assets/hero-local-conversion.png)

## 1. What "free online conversion" is free of

Drag a contract into any "free online converter" and roughly this happens:

1. your file uploads over your network to someone else's server;
2. that server runs the conversion with LibreOffice / FFmpeg / a commercial SDK;
3. the result comes back to you, and the server keeps a copy;
4. the page tells you "files are deleted within 24 hours".

Step 4 is a promise, not a mechanism. You can't verify it, and you can't verify what else happened while your file sat there — training corpora, format statistics, or something worse. For a company this stopped being a privacy question and became a compliance one: sending a payroll spreadsheet to an unknowable third party already counts as "providing data to a third party" under most data protection frameworks.

There's another cost nobody puts on the homepage. To convert one 3 MB file you upload 3 MB, queue, and download 3 MB. For the work I've moved local, the network round trip was the majority of the time.

So I built Transfer Any File on one premise: **converting a file has no reason to leave your machine.**

## 2. Your browser was already a converter — nobody used it for that

This isn't a clever framing. A Chromium browser today ships a genuinely complete codec stack:

- Images: PNG / JPEG / WebP encode natively; BMP / GIF / SVG decode natively.
- DOM and rich text: the browser _is_ an HTML engine — parsing and serialising are built in.
- A set of mature browser-only libraries: `marked` (Markdown → HTML), `turndown` (HTML → Markdown), `mammoth` (.docx → HTML), `pdf.js` (PDF → text/images), `SheetJS` (.xlsx ⇄ CSV/JSON), `jsPDF` + `html-to-image` (HTML → PDF/PNG), `fflate` (ZIP), `DOMPurify` (sanitising), plus `file-saver` and `html-docx-js-typescript` for the two directions that need them.

Put those together and you cover the 14 formats office work actually revolves around: Markdown, HTML, Word (.docx), PDF, TXT, CSV, Excel (.xlsx), JSON, PNG, JPEG, WebP, BMP, GIF, SVG.

The edges are just as clear, and I won't pretend they aren't there:

- **No OCR.** Turning a screenshot into text needs a model — tens of megabytes minimum, downloaded over the network, which contradicts the premise. So image → TXT/CSV/JSON/XLSX is **greyed out in the picker, with the reason shown on hover**, instead of failing after you click convert.
- **PDF output is a rendered image.** Text in a converted PDF is not selectable. PDF input only extracts text — layout and embedded images are dropped.
- **BMP / GIF / SVG are input-only**, because the browser ships no encoder for them. GIF takes its first frame; SVG is rasterised.
- Video, audio and ebooks are out of range.

An honest tool tells you what it can't do first.

## 3. The real leverage: treat conversion pairs as a graph

If you implement "format A → format B" directly, you write code for every pair: with 14 formats that's 91 combinations, forever, and adding a format means pairing it against all 13 existing ones.

Change the modelling and the problem inverts. **Each converter declares exactly one edge** (`from`, `to`, `convert(blob)`) and registers into a directed graph. When you need A → Z, run a BFS for the shortest path and execute it hop by hop.

```
Markdown ──► HTML ──► PDF
Word     ──► HTML ──► Markdown
JSON     ──► HTML ──► XLSX
SVG      ──► HTML ──► PNG
```

Two consequences. First, **multi-hop chains are computed, not written** — the user clicks "Markdown to PDF" once and two converters run. Second, **a new converter is about 20 lines**, and every route through it becomes available immediately. The graph currently holds 46 direct edges, and the footer line in the workbench ("14 formats supported, 46+ conversion paths") is computed from the graph at runtime, not pasted from copy.

"How many conversions do you support" has exactly one honest answer: **143 are reachable in the graph, 116 are offered in the UI.** The other 27 are greyed out by a policy layer (`utils/core/conversion-policy.ts`) — they're structurally reachable but semantically empty: 24 from images to TXT/CSV/JSON/XLSX (a raster image has no text layer without OCR) and 3 from PDF to CSV/JSON/XLSX (a PDF carries no table structure). I can't just delete those edges, because the same edge is perfectly valid for a different source (`htmlToJson` works fine on a real table), so the invalid pairs are filtered per source+target combination, with the reason surfaced in the UI.

![Diagram: converters connected like a metro map, with one highlighted two-hop path joining Markdown to PDF](assets/conversion-graph.png)

## 4. Batch is where it earns its keep

For a single file, online tools are fine. What forces the difference is "I have 40 files in 4 different formats".

**Mixed-source batches.** The drop may contain .md, .csv and .xlsx together. The dropdown still lists every format, but **only targets reachable from every file in the batch stay selectable** — the rest are disabled. Otherwise the user picks a target half the batch can't reach and half of it fails.

**Per-file error isolation.** One corrupt .docx must not destroy the batch. Each file resolves its own path, executes independently, and records its own failure reason. Each failure expands into a diagnostic — the full conversion path and which step it died on — that copies out as plain text ready to paste into an issue. Batches are cancellable mid-flight and completed results are kept.

**Pick the ZIP method per entry.** There are two intuitive answers: store everything (fast, but text results waste space) or deflate everything (compact, but pure CPU burn on PNG/PDF/XLSX, which are already compressed containers). The measured answer is **decide per entry**: text formats (TXT/CSV/JSON/HTML/Markdown/SVG/XML) deflate, roughly an order of magnitude smaller; anything already compressed is stored. I ran this through fflate on 7 MB of CSV alongside 6 MB of incompressible data: all-stored gave a 13.28 MB archive in 56 ms, all-deflate gave 7.04 MB in 1169 ms. Per-entry gets essentially the same size as all-deflate — about 47% below all-stored — without spending CPU on the entries that can't shrink.

**Chinese CSV is an encoding problem, not a language problem.** Read: try UTF-8, then GB18030, then GBK. Write: prepend a UTF-8 BOM. Skip that and Excel opens the file as mojibake, and Chinese-speaking users churn inside the first minute.

**Untrusted input gets sanitised.** Uploaded HTML, SVG and Markdown are all attack surface. Every HTML/SVG/Markdown document generated from a user file passes through DOMPurify before it is rendered, previews run in a `sandbox`ed iframe, and there is no `v-html`, no `eval`, no `new Function` anywhere in the runtime path.

**The first screen shouldn't carry pdf.js.** Every heavy dependency is dynamically `import()`ed inside its converter, and heavy child components are lazy-loaded with `defineAsyncComponent`. The whole extension builds to 3.73 MB, but opening the workbench never pulls `pdf.worker` (1.26 MB).

**Make repeated actions cheap.** A set of details you only notice after daily use: your 6 most recent target formats appear as a _Recently used_ group at the top of the picker, and only while they're still selectable for the current batch; dropping files works anywhere on the page, not just inside the dashed zone (a drop during a running conversion is ignored, with a forbidden cursor); clipboard contents convert with `⌘V` / `Ctrl+V`; the previous batch can be undone; the large-batch confirmation carries its own _Don't ask again_ box; the `Ctrl/⌘ + Enter` convert shortcut is rebindable; the split-divider position and the history card's collapsed state persist across sessions; and a long batch finishing in a background tab can optionally raise a desktop notification.

**"Convert to WebP" is only half the request.** When the target is an image, the workbench gains an output row: quality, longest edge, and a target file size the encoder chases by walking the quality ladder before it throws pixels away (a ceiling it tries for, not one it promises). Every route that can produce an image — image→image, SVG→image, HTML→image, PDF→image — goes through the same encoder call, so "quality 70%" cannot mean four different things. If the job recurs, the target plus its parameters save as a named preset card, restored in one click, and the preset is bound to the _target_ rather than to a source format: "PNG → 200 KB WebP" works whether the next drop is Markdown, PDF or PNG.

**Accessibility is a measurable number, not a goodwill gesture.** Three contrast pairs are read back off the live page in all 6 accent themes × light and dark — 12 configurations — and asserted per theme: topbar brand text against the topbar at 4.5:1 or better, the primary button's label in its rest, hover **and** pressed states at 4.5:1 or better, and the focus ring against a card at 3:1 or better (WCAG 2.1 AA for text and for user-interface components respectively). The suite separately asserts that the first Tab lands on the skip link and that it shows a visible ring. Not "looks fine". The button gate is the one that earned its keep: written as a measurement first, it reported the label failing 4.5:1 in 7 of the 12 configurations — 3.45:1 at worst, always in a hover or active shade rather than at rest — and the fix was to derive those two shades from where the label sits instead of from the theme's lightness ladder. The worst case today is 4.70:1. One gap stays open and is documented rather than hidden: 3:1 between a control's fill and the card behind it (WCAG 1.4.11) holds in 10 of the 12 but not under the light forest-green and orange buttons, whose fills sit close to white.

**"Offline" is a claim with a precise scope.** What CI asserts (`pnpm verify:offline`) is that first-party source contains no network call and that the manifest asks for `storage` alone with no `host_permissions`. It does _not_ assert that the string `fetch` is absent from the bundle — jsPDF and pdf.js carry unused code paths that call it. Those paths are never entered, and even if one were, with no host permission and no content script the extension cannot read a response or reach any website's data. That's the defensible version of "0 network requests", and it's the version worth writing down.

![Screenshot: Markdown source on the left, rendered HTML on the right, with a Rendered / Source / Edit / Copy switch on top](../assets/screenshots/preview-edit.png)

## 5. Where it is and how to install it

**It is not on the Chrome Web Store yet.** Stated plainly. Right now the only route is loading it from source, in four steps:

```bash
# Requires Node.js >= 20.12 and pnpm
git clone https://github.com/liaolongdong/transfer-any-file
cd transfer-any-file
pnpm install && pnpm build
```

Then `chrome://extensions` → enable "Developer mode" (top right) → "Load unpacked" → select `.output/chrome-mv3` → click the toolbar icon, and the workbench opens in a new tab.

Repository: [github.com/liaolongdong/transfer-any-file](https://github.com/liaolongdong/transfer-any-file). Product page and privacy policy: [liaolongdong.github.io/transfer-any-file](https://liaolongdong.github.io/transfer-any-file/).

Everything the store needs is already prepared: name and description copy, 1280×800 screenshots, a line-by-line justification for each permission, the privacy policy, and the data-disclosure answers — all in `CHROMEWEBSTORE.md` and `docs/privacy.html`. What's missing is a developer account and one submission. If you want to push that forward, open an issue on the repo.

Tech stack: **WXT + Vue 3 + TypeScript + Element Plus**, Manifest V3, `storage` as the only permission, ISC licence. How it's verified is part of the deliverable too: Playwright drives the built artifact through 208 assertions, and the fixtures it converts live in `fixtures/` next to the code.

## 6. Who shouldn't use it

- Video, audio, EPUB, CAD: use a proper service. Don't ask a browser to do this.
- Scanned pages or screenshots that need to become editable text: that's OCR, and it isn't here.
- PDF → Word with the layout intact: you'll get the text and lose the layout.
- A company machine that blocks unpacked extensions and won't grant Developer mode: this install path is closed to you.

But if what you're holding is **a contract, a payroll sheet, medical records, an unpublished manuscript, client data**, and you just need to move format between Markdown / Word / PDF / Excel / CSV / JSON / HTML / images — there is no reason for it to leave your machine.

---

**Repository**: [github.com/liaolongdong/transfer-any-file](https://github.com/liaolongdong/transfer-any-file) — the README ships in both English and Chinese, and the product page and privacy policy are under `docs/`.
**If this makes you hesitate for three seconds before uploading a file somewhere, a star is enough. It's the main distribution channel this project has.**
