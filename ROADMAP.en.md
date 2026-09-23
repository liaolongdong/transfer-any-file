# Roadmap

[简体中文](ROADMAP.md) · English

This is not a list of promises — it is the judgement already being applied, written down so people know where help is welcome. Every item below comes from an actual measurement (defects from a repro, features from the last link in a chain that already works). Nothing here is scheduled because it sounds nice.

## Already in (on `main`, not yet released)

- **PDF page selection**: converting a PDF to images can be limited to the pages you name; empty still means the whole document.
- **Narrow-window usability**: the comparison view stacks once the two columns would be clipped and the divider rotates with it; this also fixed the older bug where the drag gesture was swallowed by the preview iframe.
- **Recoverable failures**: retry only the items that failed, instead of rerunning the whole batch.
- **Visible progress**: multi-step chains report which step they are on, ZIP packaging shows a loading state, and completion is perceivable inside the page (not only as a desktop notification).
- **One less round trip before first paint**: theme, colour mode and language now share a single storage read.

All of that exists only on `main`: the repository has never been tagged, and the GitHub Releases page is empty, because a release first has to get through the Chrome Web Store queue (see the rejection log in `CHROMEWEBSTORE.md`). `1.0.0` is the manifest version, not a version that has shipped.

## Next

1. **A batch of images → one multi-page PDF.** Today it is one image per PDF. This one needs a design first: what it touches is the "one independent result per file" data model and how the results area renders, not the converter.
2. **Controllable output file names.** Names are currently derived as "source name + target extension", which collides in batches and in multi-step chains.
3. **Drop a folder in.** Read-only directory traversal, with no new permissions.
4. **Keep existing results when the target changes; reuse parameters from a history entry; allow renaming and editing presets.** Three instances of one friction: the interface discards things unrelated to the choice you just made.
5. **List performance with a hundred-plus files.** The current list was designed for a handful.
6. **Animated WebP / APNG as input, with the frame-loss disclosure that comes with it.** Blocked on a precondition: an offline decodable test fixture. Reading the container without decoding it would be a speculative code path.

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
