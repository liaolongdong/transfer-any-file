# Roadmap

[简体中文](ROADMAP.md) · English

This is not a list of promises — it is the judgement already being applied, written down so people know where help is welcome. Every item below comes from an actual measurement (defects from a repro, features from the last link in a chain that already works). Nothing here is scheduled because it sounds nice.

## Already in (on `main`, shipped inside 1.2.1 — the store still serves 1.0.0)

- **PDF page selection**: converting a PDF to images can be limited to the pages you name; empty still means the whole document.
- **Narrow-window usability**: the comparison view stacks once the two columns would be clipped and the divider rotates with it; this also fixed the older bug where the drag gesture was swallowed by the preview iframe.
- **Recoverable failures**: retry only the items that failed, instead of rerunning the whole batch.
- **Visible progress**: multi-step chains report which step they are on, ZIP packaging shows a loading state, and completion is perceivable inside the page (not only as a desktop notification).
- **One less round trip before first paint**: theme, colour mode and language now share a single storage read.
- **Controllable output file names**: a placeholder template set in preferences (`{name}` `{date}` `{time}` `{index}` `{target}`); leaving it empty falls back to "source name + target extension". Batches and multi-step chains no longer collide.
- **Drop a folder in**: drag a directory into the workbench and only the convertible files inside it are read, with no new permissions. Depth and entry counts are capped, and the part that got cut off is stated in the interface instead of silently dropped.

- **A page on the site you can use without installing anything**: `/diff/` compares two files (or two pasted texts) line by line and word by word inside your own browser. It is the only page on this site that asks for a file of yours, which makes it the only place where "offline" can be verified on the spot — the source is still `tools/file-diff.html` in the repository, what is published is a byte-for-byte copy of it, and the two offline guards scan exactly those bytes.

All of that lives only on `main`. **Release position, read from the remote on 2026-10-19**: the repository has one tag, `v1.2.1`, and the GitHub Releases page holds exactly that one release — 1.1.0 and 1.2.0 reached the changelog and `package.json` but left no tag and no release behind. The manifest version is **1.2.1**, no longer 1.0.0. The store still serves 1.0.0: the 1.2.1 package uploaded successfully through the pipeline but was not queued for review under the current settings, so the next store action is clicking "Submit for review" in the console rather than repackaging (the four live values are authoritative in the 「现网状态」 block at the top of `.github/CHROMEWEBSTORE.md`).

## Next

1. **A batch of images → one multi-page PDF.** Today it is one image per PDF. This one needs a design first: what it touches is the "one independent result per file" data model and how the results area renders, not the converter.
2. **Keep existing results when the target changes; reuse parameters from a history entry; allow renaming and editing presets.** Three instances of one friction: the interface discards things unrelated to the choice you just made.
3. **List performance with a hundred-plus files.** The current list was designed for a handful.
4. **Animated WebP / APNG as input, with the frame-loss disclosure that comes with it.** Blocked on a precondition: an offline decodable test fixture. Reading the container without decoding it would be a speculative code path.

> Two more items used to sit in this section: "controllable output file names" and "drop a folder in". Both shipped and moved to the section above, so the numbering here restarts — the direction wasn't dropped, the work finished. Keeping the old numbers would make "item N" point at the wrong thing somewhere else, and that costs more than a renumber.

## Deliberately not happening

- **Any network request, telemetry, account or cloud conversion.** Having `storage` as the only permission is not a shortcut — it is the product's claim itself.
- **Swapping in wasm or a heavyweight decoder to support one more format.** Package size is part of what we state outward; trading an order of magnitude of bundle for a single format is a bad deal.
- **Keeping animation when the target can only carry one frame, while claiming nothing was lost.** If something is dropped, it has to be said — that is the shared standard behind every lossy-disclosure decision in this project.
- **System-level integration beyond what a context menu can do.** That needs extra permissions and a native program, which is a different product from "install it and it works".

## What makes a good first contribution

- **Copy fixes**: the two files under `utils/i18n/` change as a pair, and `en.ts` is typed as `typeof zh` — change one side and the build goes red.
- **A new converter**: `CONTRIBUTING.md` has the full flow; once registered in the registry, multi-step paths are discovered by graph search, so no chains are written by hand.
- **More assertions around an existing conversion**: `scripts/e2e-test.mjs` plus `fixtures/` drive the real built artifact, so you see the reading immediately.
- **Contrast of theme tokens**: existing assertions catch regressions outright, which makes this the "do it right and get feedback" kind of task.

The maintainer labels suitable issues with `good first issue`. Until a label is on something, this section is the criterion.

## How this file is maintained

Add, never silently delete. When direction changes, say why in the text itself rather than rewriting history — a roadmap that gets quietly rewritten and code that silently changes behaviour are the same problem.
