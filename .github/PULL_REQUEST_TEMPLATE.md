<!--
标题沿用仓库既有风格：`type(scope): 描述`，中英文皆可。
Keep the title in the repository's existing style: `type(scope): description`, in either language.
-->

## 这个 PR 改了什么 / What changes

-

## 为什么 / Why

<!-- 动机与取舍；修 bug 时写根因，不要只写症状。 / Motivation and trade-offs; for a bug fix, name the root cause, not the symptom. -->

## 离线与隐私红线 / Offline red lines

- [ ] 没有新增权限，也没有新增 `host_permissions` / No new permission and no `host_permissions`
- [ ] 没有引入网络请求、远程资源或需要下载的模型 / No network call, remote asset or downloadable model
- [ ] 没有引入 `eval` / `new Function`；不可信输入（上传文件、剪贴板、ZIP 条目、storage 值）仍在边界处校验，HTML / SVG / Markdown 渲染前经 DOMPurify 净化
- [ ] `pnpm verify:offline` 通过

## 验证 / Verification

按改动范围勾选，并把实际输出贴进来；跑不了的项请写明原因。Tick what applies and paste the real output; explain anything you could not run.

- [ ] `pnpm lint:all`
- [ ] `pnpm verify:meta` — 改到 `package.json` / `wxt.config.ts` / `.github/repo-metadata.json` 时 / when those change
- [ ] `pnpm test:e2e` — 改到转换逻辑或端到端行为时 / when conversion logic or end-to-end behaviour changes
- [ ] `pnpm build` 且 `.output/chrome-mv3` 内没有 `docs/`、`CHROMEWEBSTORE.md` 等仓库文档
- [ ] `pnpm assets:capture` — 界面有变化时，截图必须与实现同步 / after any UI change, so store and README shots do not drift
- [ ] 新增转换器：同时补 `fixtures/` 样例与 `scripts/e2e-test.mjs` 场景 / new converter ships a fixture plus an e2e scenario

## 文档同步 / Documentation

- [ ] 用户可见文案同时提供中英文（`utils/i18n/zh.ts` 与 `en.ts` 的 key 集一致）
- [ ] `README.md` 与 `README.zh-CN.md` 成对更新
- [ ] 发布级改动在 `CHANGELOG.md` 与 `CHANGELOG.zh-CN.md` 各写一条，版本号等于 `package.json#version` / new release-worthy entry in both changelogs
- [ ] 影响对外说明时，同步 `docs/index.html` / `docs/privacy.html` / `CHROMEWEBSTORE.md` 与 `wxt.config.ts` 的 `description`（与 `package.json#description` 一致且 ≤132 字符）
- [ ] 新的对外数字（格式数、路径数、体积、阈值）已从代码或构建输出取证，而不是沿用旧文档
