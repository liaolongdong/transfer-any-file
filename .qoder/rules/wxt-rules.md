---
trigger: always_on
---

# WXT 项目规则 · Transfer Any File

> 本项目是**完全离线**的 Chrome MV3 文件格式转换扩展：点击图标在新标签页打开转换工作台（options 页面），本地完成文档 / 数据 / 图片三大类格式的批量与多步转换。以下为强制编码规则；架构、命令与工作流详见 `AGENTS.md`。

## 1. 技术栈

- 必须使用 WXT + Vue 3 + TypeScript + Element Plus + Vite（Manifest V3），保持最新稳定版。
- Element Plus 通过 `unplugin-vue-components` + `ElementPlusResolver` **按需引入**，禁止整包导入；命令式 API（如 `ElMessage`）由 resolver 自动导入，无需手动 import。
- 重型转换依赖（marked / turndown / mammoth / jspdf / pdfjs-dist / xlsx / dompurify / html-to-image 等）必须**动态 `import()`**，避免进入首屏包。

## 2. 代码质量

- 保证可维护性、可扩展性、可复用性；重复代码、公共方法与组件必须抽离复用，遵循良好设计模式与各技术栈最佳实践。
- 公共/复杂 API、关键假设与非显然算法使用简洁 JSDoc（解释「为什么」与约束，而非逐行复述）。
- 分层：纯逻辑放 `utils/`，响应式状态与生命周期副作用放 `composables/`，可复用界面放 `components/`。

## 3. 引入规则

- 同目录文件用 `./`；其它本地模块统一用 WXT 默认别名 `~/`（如 `~/utils/core/types`）。**本项目别名是 `~/`，不是 `@/`。**
- 类型导入使用 `import type`。

## 4. TypeScript

- 保持 strict（含 `noUnusedLocals` / `noUnusedParameters`），不得降低 `tsconfig.json`、ESLint、Stylelint 规则来绕过问题。
- 新增代码不使用 `any`（ESLint `no-explicit-any` 为 warn）；不可信数据用 `unknown` + 类型守卫收窄。
- 公共类型集中在 `utils/core/types.ts`，其余类型就近放所属模块。

## 5. Vue 3

- 默认 Composition API + `<script setup lang="ts">`；SFC 顺序 `<script>`、`<template>`、`<style>`。
- 单一事实来源：源状态尽量少，派生值用纯 `computed`，watcher 只承担副作用并清理异步任务。
- Props 只读、事件向上，使用类型化 `defineProps` / `defineEmits`；列表用稳定 key，避免同元素混用 `v-if` 与 `v-for`。

## 6. 样式

- 组件样式默认 `scoped`，优先 class 选择器。
- 复用 `assets/theme/tokens.css` 的 `--fat-*` 设计令牌，禁止硬编码重复颜色；覆盖 Element Plus 用 `--el-*` 或 `:deep()`。
- Stylelint 强制自定义属性命名 `^(fat|el)-[a-z0-9-]+$`；新增样式必须通过 `pnpm lint:style`（配置为标准规则，**无 recess-order 属性排序**）。

## 7. 格式化与静态检查

- 统一 ESLint + Prettier + Stylelint。Prettier：`semi`、`singleQuote`、`trailingComma: all`、`printWidth: 120`、`tabWidth: 2`、`arrowParens: avoid`、`singleAttributePerLine`、`endOfLine: lf`。
- 格式化是真守卫：`pnpm format:check`（已并入 `lint:all` 与 CI 的 lint job），修格式用 `pnpm format`。`.prettierignore` 只挡三类东西——构建生成物（`pnpm-lock.yaml`、`auto-imports.d.ts`、`components.d.ts`）、`fixtures/`（e2e 按字节和大小断言的转换输入，重排等于改断言）、`.qoder/`（规格与计划文档）。新增这三类之外的例外要说明理由。
- 禁止用宽泛 `eslint-disable` / `@ts-ignore` 规避规则；确需例外限制到最小行范围并说明原因。
- **本项目未配置 husky / lint-staged**，提交前必须手动运行 `pnpm lint:all`（typecheck + eslint + stylelint + format:check）并确保通过。

## 8. 日志

- 本项目**无 logger 封装**。运行时代码（`entrypoints` / `components` / `composables` / `utils`）不得遗留 `console` 调试输出；面向用户的错误通过 UI 反馈。
- 构建与测试脚本（`scripts/**`）可按需使用 `console`。

## 9. 安全与隐私（本地优先）

- 保持完全离线：无网络请求、无遥测、无数据收集；权限仅 `storage`。新增任何权限、`host_permissions` 或数据外传前，必须停下说明并获用户确认。
- 上传文件、剪贴板内容、ZIP 条目、storage 数据均视为**不可信输入**：边界处校验类型/大小/格式，失败安全降级。
- 渲染或转换不可信的 HTML/SVG/Markdown 前必须用 **DOMPurify 净化**；禁止对不可信内容使用 `v-html`、向实时 DOM 写 `innerHTML`、`eval` 或 `new Function`。

## 10. 国际化与文档

- 所有用户可见文案同时提供中英文，禁止在 Vue/TS 中硬编码可见字符串。`utils/i18n/zh.ts` 为源，`en.ts` 类型为 `typeof zh`，两者 key 集必须一致（`zh` 为源语言与兜底；存储里没有明确选择时，首次打开按浏览器语言解析，见 `useI18n.ts` 的 `resolveLocale`）。
- 文档按影响分层更新：功能/用法 → `README.md`（中文）+ `README.en.md`（英文，双语一致）；对外产品说明与隐私政策 → `docs/index.html` + `docs/privacy.html`（GitHub Pages 源目录，两者都把中英正文写进初始 HTML，但机制不同：**只有** `index.html` 靠 `lang` 属性 + CSS 切换显隐，`privacy.html` 是中英同时呈现、无切换规则）；Chrome 应用商店文案与披露答复 → `CHROMEWEBSTORE.md`；manifest **名称与描述** → `public/_locales/zh_CN/messages.json` 与 `public/_locales/en/messages.json`（`wxt.config.ts` 只放 `__MSG_extensionName__` / `__MSG_extensionDescription__` 两个键与 `default_locale: "zh_CN"`；`zh_CN` 是 Chrome 解析不到时的回落值，也是商店 listing 的**默认语言**，英文作为附加本地化并列；`en` 的值与 `package.json#description` 同步且 ≤132 字符）；manifest **权限** → `wxt.config.ts`。
- 仓库根的双语文档一律成对，**中文是主文件、英文用 `.en.md` 后缀**：`README.md` / `README.en.md`、`CHANGELOG.md` / `CHANGELOG.en.md`、`SECURITY.md` / `SECURITY.en.md`、`CONTRIBUTING.md` / `CONTRIBUTING.en.md`。H1 下第一行是互指的语言切换行（中文侧 `简体中文 · [English](X.en.md)`，英文侧 `[简体中文](X.md) · English`）；改一边必须同步另一边。新增根文档照此命名，**不要再引入 `*.zh-CN.md`**：这套约定在 2026-09-16 之前是反的（英文为主文件、中文为 `*.zh-CN.md`，只有 README 例外），历史 CHANGELOG 与旧文档里出现的 `*.zh-CN.md` 属于当时的记录，不要照着「改回去」。
- `docs/`、`CHROMEWEBSTORE.md` 只是仓库文档，**不得进入扩展产物**；素材禁止放 `public/`（WXT 会原样打包进 `.output/chrome-mv3`）。例外只有两个：`public/icon/` 与 `public/_locales/`——后者必须落在**扩展根**，Chrome 找不到 `_locales/` 就把 `__MSG_*__` 原样显示成字面量，所以既不要移动它、也不要「顺手」往 `public/` 里放别的文件。UI 变更后跑 `pnpm build && pnpm assets:capture` 重新生成 `docs/assets/` 下的 1280×800 截图与推广图，避免商店/README 素材与实际界面漂移。
- **运营类文档是中文单语，不适用上一条的成对规则**：`CHROMEWEBSTORE.md`、`.github/repo-metadata.md`、四份 `.github/workflows/*.yml` 的注释与 `::error::` 文案、`ISSUE_TEMPLATE` / `PULL_REQUEST_TEMPLATE` 都以中文为主（模板与商店文案里中英并列或纯英文的**粘贴值**照原样保留——商店后台那几块是给用户看的商品文案，中、英各一套，不是这份文档的语言）。工作流的 `name:` 与步骤 `name:` 保持英文，它们是 Actions 界面与徽章的稳定标识。新增运营文档默认不补 `.en.md`，唯一例外见下一条。
- **运营文档放 `.github/`，不放 `docs/`**：`docs/` 是 GitHub Pages 的站点源目录（`static.yml` 把除 `promo/` 外的全部内容发到公网），往里放上架 runbook 或发布配置说明等于把它们公开。`static.yml` 的 `Verify staged site` 按扩展名兜底——staging 里出现 `.md` 即失败。唯一的成对例外是 `.github/CWS_PUBLISHING_GUIDE.md` + 其 `.en.md`（2026-09-20 定案保留并长期同步：上架动作发生在英文的 CWS / Developer Console 界面里，英文那份不是中文那份的副本）。它适用上一条的全部成对约定——H1 下的语言切换行、小节 1:1、改一边必须同步另一边；唯一区别是它不在仓库根，切换行用同目录相对路径。英文那份引用 `CHROMEWEBSTORE.md` 的小节时，**照抄中文小节名**（那份文档是商店后台的粘贴素材，只有中文，没有被翻译过的标题）。
- 改 `CHROMEWEBSTORE.md` 的字段标签或章节标题，必须同批改 `scripts/check-store-listing.mjs` 里 `FIELDS` 的 `marker` 与 `## 提交速查` / `## 商店文案` 边界：脚本按字面 `includes` 定位粘贴块，不同步就抛 `heading not found`、`pnpm verify:listing` 与 CI 一起变红。同理，标题里别放 emoji、破折号与被反引号包住的代码——它们会进入 GitHub 的锚点 slug，指向该小节的链接随之失效；小节标题用纯文字，提醒写进正文首句。
- 本项目**无** HelpDialog、popup，且**尚未上架 Chrome 应用商店**（`CHROMEWEBSTORE.md` 是待提交素材，不是现网列表），勿引用不存在的商店链接。**有** `_locales/`：`public/_locales/zh_CN/`（`default_locale`，商店 listing 的默认语言）与 `public/_locales/en/`，只有 `extensionName` / `extensionDescription` 两个键。商店 listing 的语言由包内 locale 决定，不由后台决定；界面语言由 `useI18n` 决定，不由 `default_locale` 决定——这三件事分属三处，改对一处就要去另两处核对。

## 11. 优化与重构边界

- 大文件拆分、重复代码抽离、组件/类型/公共方法封装等优化，必须在**不影响原有功能与交互体验**的前提下进行。
- 若优化可能改变功能、交互、视觉、默认值、数据格式、权限或隐私边界，必须**停下询问确认**，不得以「应该没影响」作为继续依据。
- 优化后用相同场景验证行为等价，并及时清理被替代的死代码与引用。

## 12. 验证

- 每次功能开发或修复后必须自审 diff，禁止引入新问题或破坏存量功能与交互。
- 按改动范围执行：TS/Vue/运行时 → `pnpm lint:all`；入口/manifest/依赖/打包 → `pnpm build`；转换逻辑或端到端行为 → `pnpm test:e2e`（Playwright + `fixtures/`）；商店文案 `CHROMEWEBSTORE.md` → `pnpm verify:listing`；转换器注册与路由 → `pnpm verify:paths`；对外文档里的数字 → `pnpm verify:numbers`。
- 离线守卫分两层，**两层都跑过才算守全**：`pnpm verify:offline:source` 断言第一方源码无网络调用且 `wxt.config.ts` 只声明 `storage`；`pnpm verify:offline` 在此之上断言**产物** `.output/chrome-mv3/manifest.json` 的 `permissions` 恰为 `["storage"]`、无 `host_permissions` / `optional_permissions`——只有这一层能发现 WXT 模块或 manifest transform 加上的、源码里从没写过的权限，所以它在产物缺失时**直接失败**，不许改回「有产物才检查」。CI 的拓扑与此一致：lint job 跑源码层（干净检出、build 之前），build job 在 `pnpm build` 之后跑产物层，`release.yml` 同理。
- 改动 `docs/`、`CHROMEWEBSTORE.md` 或新增素材脚本后，`pnpm build` 并确认 `.output/chrome-mv3` 内**没有** `docs/`、`CHROMEWEBSTORE.md` 等文档产物；改到商店粘贴字段时另跑 `pnpm verify:listing`（限长、与 manifest 一致、速查区块未漂移）；对外文案里的数字（格式数、路径数、体积、阈值）必须从代码或构建输出取证，不得沿用旧文档估计——除体积外的那一类现在由 `pnpm verify:numbers` 执行：22 个数字从 `FileFormat`、路径基线、`conversion-policy`、各处常量、主题数与两份商店详描的实测字符数现推，再比对 15 份对外散文；故意改写句子后跑 `node scripts/check-prose-numbers.mjs --update` 重取引用基线，并读 diff 确认少掉的正是你删掉的那句。
