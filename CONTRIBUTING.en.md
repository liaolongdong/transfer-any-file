# Contributing to Transfer Any File

[简体中文](CONTRIBUTING.md) · English

Contributions are welcome — format requests and bug reports included. This project is small and opinionated, so here is the whole rule set in one page: the commands, the tech stack, the project structure, how to add a converter, and the coding and documentation conventions are all below. The mandatory coding rules live in `.qoder/rules/wxt-rules.md`; architecture, commands, conventions and workflows in `AGENTS.md`.

## Three steps

1. **Fork, branch off `main`, and get the dev loop running**

   ```bash
   pnpm install          # Node.js ≥ 20.12 (WXT needs util.parseEnv), pnpm pinned in package.json
   pnpm dev              # hot reload; load .output/chrome-mv3 as an unpacked extension
   ```

2. **Make the change, keeping the guarantees intact**

   ```bash
   pnpm lint:all              # typecheck + eslint + stylelint — must pass
   pnpm verify:offline:source # first-party source makes no network call; wxt.config.ts still declares `storage` only
   pnpm verify:meta           # package.json / public/_locales/en / wxt.config.ts / .github/repo-metadata.json agree
   pnpm test:e2e              # build + Playwright over fixtures/ — must pass
   pnpm verify:offline        # after the build: asserts the manifest the browser actually loads is `storage`-only
   ```

3. **Open a pull request** that says what changed, why, and which checks you ran.

## All commands

The three steps above are the minimal loop; the full list is here. The package manager is pinned to `pnpm` (see `package.json#packageManager`) — do not mix in npm or yarn.

```bash
pnpm dev              # dev mode with hot reload (WXT)
pnpm build            # production build to .output/chrome-mv3
pnpm package          # zip for distribution
pnpm typecheck        # vue-tsc
pnpm lint             # eslint
pnpm lint:style       # stylelint (assets/**/*.css and .vue)
pnpm lint:all         # typecheck + eslint + stylelint
pnpm verify:meta      # package.json / wxt.config.ts / public/_locales/en / .github/repo-metadata.json stay in sync
pnpm verify:offline   # source-level checks plus the built-manifest assertion (needs pnpm build first; fails outright when .output/chrome-mv3 is missing)
pnpm verify:offline:source # source level only: no network call in first-party source, wxt.config.ts declares `storage` only (no build needed)
pnpm verify:listing   # every CHROMEWEBSTORE.md paste block is within its limit, agrees with the manifest, and the quick-reference scaffold has not drifted
pnpm test:e2e         # build + Playwright suite over fixtures/
pnpm assets:capture   # regenerate store/README screenshots + promo graphics (needs pnpm build first)
node scripts/render-demo-gif.mjs   # re-record the demo GIF at the top of the README (needs pnpm build, plus ffmpeg on PATH)
node scripts/render-icons.mjs   # re-render both icon tiers from assets/*.svg
node scripts/verify-extension.mjs   # check the built package contents
git tag v1.0.0 && git push --tags   # release.yml: build the store zip, verify it, open the GitHub Release
```

Like the screenshots, the demo GIF is recorded from the real build output (`docs/assets/demo/demo-<locale>.gif`, one per language, chosen with `DEMO_LOCALES="zh en"`); if the UI changes and the GIF is not re-recorded, the README drifts from the actual workbench.

`pnpm fix:all` rewrites the whole repository; for a local task use `pnpm exec eslint --fix <file>` / `stylelint --fix <file>` / `prettier --write <file>` instead.

## The one rule that matters

**Keep it offline.** No network request, no remote asset, no new permission, no telemetry. The manifest requests only `storage`, and no first-party source file issues a request — `pnpm verify:offline` greps `entrypoints/`, `components/`, `composables/` and `utils/` for `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon` and fails on a hit. (Unused request paths do exist inside bundled third-party converters; what makes them inert is that the extension holds no `host_permissions`, so the browser refuses them.) If a change genuinely needs one of those, open an issue first — do not slip it into a PR.

Everything else follows from that: user files, clipboard content, ZIP entries and storage values are all treated as untrusted input, validated at the boundary (20 MB warning / 100 MB rejection per file, 200 files per batch), and any HTML / SVG / Markdown produced from them is sanitised with DOMPurify before it is rendered.

## Adding a converter

1. Create `utils/converters/<from>-to-<to>.ts` implementing `Converter` (`from`, `to`, `convert(blob)`); import heavy libraries dynamically inside `convert()`.
2. If the conversion is long, needs to know which file it came from, or produces an image, take the optional second argument `ctx` — `{ signal, source, options }`. Honour `signal` at your cancellable points (a batch that is being cancelled keeps its finished results), and route any canvas encoding through `encodeCanvas(canvas, mime, options)` so the user's output parameters apply. Return `containerExt` when the bytes are a different container from the nominal target (a multi-sheet or multi-page result is a ZIP).
3. Register it in `utils/converters/index.ts`.
4. Only if it introduces a new format: extend `FileFormat` (`utils/core/types.ts`), `FORMAT_INFO` (`utils/core/format-labels.ts`), the extension/MIME maps (`composables/useFileDetect.ts`), and the zh/en dictionaries.
5. Add a fixture under `fixtures/` and a scenario in `scripts/e2e-test.mjs`.

Multi-step routes through your new converter are discovered automatically by the registry's BFS — no wiring needed.

## Tech stack

- [WXT](https://wxt.dev/) + Vue 3 + TypeScript + Element Plus (Manifest V3). Element Plus is pulled in per component through `unplugin-vue-components` + `ElementPlusResolver`; imperative APIs such as `ElMessage` are auto-imported by the resolver.
- Converters: [marked](https://github.com/markedjs/marked), [turndown](https://github.com/mixmark-io/turndown), [mammoth](https://github.com/mwilliamson/mammoth.js), [html-docx-js-typescript](https://github.com/caiyexiang/html-docx-js-typescript), [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image), [pdf.js](https://mozilla.github.io/pdf.js/), [SheetJS](https://sheetjs.com/), [fflate](https://github.com/101arrowz/fflate), [DOMPurify](https://github.com/cure53/DOMPurify)
- Heavy dependencies are dynamically imported per converter, so the first paint stays small (whole bundle: 3.74 MB); heavy child components are lazy-loaded with `defineAsyncComponent` in `App.vue`

## Project structure

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
  assets/screenshots/  # raw 1280×800 UI shots used by the READMEs and the product page
  assets/store/        # social preview + Chrome Web Store promo tiles
    screens/           # captioned 1280×800 listing screenshots (English and Chinese)
scripts/               # e2e suite, asset capture, icon rendering, metadata + offline guards
.github/
  workflows/           # ci.yml · static.yml (Pages) · release.yml · repo-meta.yml
  ISSUE_TEMPLATE/      # bug report and format request forms
  repo-metadata.md     # why the About description and 20 topics read this way, and how they get applied
CHROMEWEBSTORE.md      # store listing copy, permissions justification, disclosures
CHANGELOG.md           # release notes, Chinese primary (.en.md is the English pair)
CONTRIBUTING.md        # the whole rule set, in one page (Chinese primary, this file is .en.md)
SECURITY.md            # disclosure channel and the offline attack-surface claims (Chinese primary)
```

`docs/` is repository documentation only — it is never copied into `.output/chrome-mv3`. WXT packs `public/` verbatim, which is why screenshots and promo art stay under `docs/assets/`.

## Conventions worth knowing

- **Aliases and SFCs**: local modules are imported through `~/`, not `@/`; every SFC uses `<script setup lang="ts">` (the stack and dependency list are in the section above).
- **Styling**: scoped CSS using the `--fat-*` tokens in `assets/theme/tokens.css`; no hard-coded colours.
- **i18n**: every user-visible string exists in both `utils/i18n/zh.ts` (source) and `en.ts`; no literals in components.
- **Logging**: no `console` in `entrypoints/`, `components/`, `composables/`, `utils/` — errors surface in the UI. Scripts under `scripts/` are exempt.
- **Docs**: user-facing changes update `README.md` (Chinese) **and** `README.en.md` (English); store copy lives in `CHROMEWEBSTORE.md`; the product page is `docs/index.html`. Release-worthy changes get one entry in **both** `CHANGELOG.md` (Chinese) and `CHANGELOG.en.md` (English), whose version equals `package.json#version` (that is also what the release tag must match). The repository's GitHub About block is edited in `.github/repo-metadata.json` — not by hand in the dashboard — so it stays versioned and checked by `pnpm verify:meta`; why each value reads the way it does, and how to apply it on a machine without `gh`, is in `.github/repo-metadata.md`. Security reporting goes to `SECURITY.md`, not an issue. Bilingual root documents are always a pair: Chinese is the primary file and English carries the `.en.md` suffix (`CONTRIBUTING.md` / `CONTRIBUTING.en.md`, `SECURITY.md` / `SECURITY.en.md`, `CHANGELOG.md` / `CHANGELOG.en.md`); the first line under each H1 is a switch line linking both ways, and editing one requires editing the other. After a UI change, run `pnpm assets:capture` so the screenshots do not drift.
- **Icons**: two SVG masters cover two size regimes — `assets/icon.svg` (document sheet + conversion badge) for slots 48px and up, `assets/icon-small.svg` (bold swap arrows) for anything smaller, because the detailed artwork's 5px text lines dissolve below 48px. Regenerate both with `node scripts/render-icons.mjs`.
- Do not weaken ESLint / Stylelint / TypeScript settings to make a check pass. If a rule genuinely must be bypassed, scope the suppression to the single line and explain why in the diff.

## Accessibility and contrast assertions

The end-to-end suite (`pnpm test:e2e`) asserts three contrast pairs across all 6 themes × light/dark, 12 combinations:

- topbar brand text against the topbar at 4.5:1 or better (WCAG 2.1 AA for text)
- the focus ring against a card surface at 3:1 or better (AA for user-interface components)
- the primary button's label in its **rest, hover and pressed** states at 4.5:1 or better — read off the enabled button with a file and a target staged, because the text rule exempts disabled controls

It separately asserts that the first Tab lands on the skip link and that the link shows a visible ring. Measured worst value on the live page (2026-09-14): 4.70:1, rose in light mode; the dark themes land at 7.03:1 and up.

**Known limitation**: a control's fill also needs 3:1 against the surface behind it (WCAG 1.4.11). That holds in 10 of the 12 combinations but not under the forest-green and orange buttons in light mode (2.21 / 2.96:1 at their lightest state) — those two fills sit close to white, and deepening them to clear 3:1 would spend the label's margin. Change a theme token in `assets/theme/tokens.css` and these assertions catch the regression.

## Licence

By contributing you agree that your contributions are licensed under the project's [MIT licence](LICENSE).
