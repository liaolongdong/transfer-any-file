# Contributing to Transfer Any File

Contributions are welcome — format requests and bug reports included. This project is small and opinionated, so here is the whole rule set in one page.

## Three steps

1. **Fork, branch off `master`, and get the dev loop running**

   ```bash
   pnpm install          # Node.js ≥ 20.12 (WXT needs util.parseEnv), pnpm pinned in package.json
   pnpm dev              # hot reload; load .output/chrome-mv3 as an unpacked extension
   ```

2. **Make the change, keeping the guarantees intact**

   ```bash
   pnpm lint:all         # typecheck + eslint + stylelint — must pass
   pnpm test:e2e         # build + Playwright over fixtures/ — must pass
   ```

3. **Open a pull request** that says what changed, why, and which checks you ran.

## The one rule that matters

**Keep it offline.** No network request, no remote asset, no new permission, no telemetry. The manifest requests only `storage`, and the shipped code contains no `fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon`. If a change genuinely needs one of those, open an issue first — do not slip it into a PR.

Everything else follows from that: user files, clipboard content, ZIP entries and storage values are all treated as untrusted input, validated at the boundary (20 MB warning / 100 MB rejection per file, 200 files per batch), and any HTML / SVG / Markdown produced from them is sanitised with DOMPurify before it is rendered.

## Adding a converter

1. Create `utils/converters/<from>-to-<to>.ts` implementing `Converter` (`from`, `to`, `convert(blob)`); import heavy libraries dynamically inside `convert()`.
2. Register it in `utils/converters/index.ts`.
3. Only if it introduces a new format: extend `FileFormat` (`utils/core/types.ts`), `FORMAT_INFO` (`utils/core/format-labels.ts`), the extension/MIME maps (`composables/useFileDetect.ts`), and the zh/en dictionaries.
4. Add a fixture under `fixtures/` and a scenario in `scripts/e2e-test.mjs`.

Multi-step routes through your new converter are discovered automatically by the registry's BFS — no wiring needed.

## Conventions worth knowing

- **Stack**: WXT + Vue 3 (`<script setup lang="ts">`) + TypeScript + Element Plus, all on-demand. Alias is `~/`, not `@/`.
- **Styling**: scoped CSS using the `--fat-*` tokens in `assets/theme/tokens.css`; no hard-coded colours.
- **i18n**: every user-visible string exists in both `utils/i18n/zh.ts` (source) and `en.ts`; no literals in components.
- **Logging**: no `console` in `entrypoints/`, `components/`, `composables/`, `utils/` — errors surface in the UI. Scripts under `scripts/` are exempt.
- **Docs**: user-facing changes update `README.md` **and** `README.zh-CN.md`; store copy lives in `CHROMEWEBSTORE.md`; the product page is `docs/index.html`. After a UI change, run `pnpm assets:capture` so the screenshots do not drift.
- Do not weaken ESLint / Stylelint / TypeScript settings to make a check pass. If a rule genuinely must be bypassed, scope the suppression to the single line and explain why in the diff.

贡献须知：本项目是完全离线的 Chrome 扩展，**不接受**任何引入网络请求、远程资源或新增权限的改动；中英文文案与文档（`README.md` / `README.zh-CN.md`）必须同步修改；提交前请本地跑通 `pnpm lint:all` 与 `pnpm test:e2e`。详细编码规则见 `.qoder/rules/wxt-rules.md`，架构说明见 `AGENTS.md`。

## Licence

By contributing you agree that your contributions are licensed under the project's [ISC licence](LICENSE).
