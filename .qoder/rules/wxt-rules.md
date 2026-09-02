---
trigger: always_on
---

# WXT 项目规则 · File Any Transfer

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
- 禁止用宽泛 `eslint-disable` / `@ts-ignore` 规避规则；确需例外限制到最小行范围并说明原因。
- **本项目未配置 husky / lint-staged**，提交前必须手动运行 `pnpm lint:all`（typecheck + eslint + stylelint）并确保通过。

## 8. 日志

- 本项目**无 logger 封装**。运行时代码（`entrypoints` / `components` / `composables` / `utils`）不得遗留 `console` 调试输出；面向用户的错误通过 UI 反馈。
- 构建与测试脚本（`scripts/**`）可按需使用 `console`。

## 9. 安全与隐私（本地优先）

- 保持完全离线：无网络请求、无遥测、无数据收集；权限仅 `storage`。新增任何权限、`host_permissions` 或数据外传前，必须停下说明并获用户确认。
- 上传文件、剪贴板内容、ZIP 条目、storage 数据均视为**不可信输入**：边界处校验类型/大小/格式，失败安全降级。
- 渲染或转换不可信的 HTML/SVG/Markdown 前必须用 **DOMPurify 净化**；禁止对不可信内容使用 `v-html`、向实时 DOM 写 `innerHTML`、`eval` 或 `new Function`。

## 10. 国际化与文档

- 所有用户可见文案同时提供中英文，禁止在 Vue/TS 中硬编码可见字符串。`utils/i18n/zh.ts` 为源，`en.ts` 类型为 `typeof zh`，两者 key 集必须一致（默认语言 `zh`）。
- 文档按影响更新：用户功能/用法 → `README.md` + `README.zh-CN.md`（双语一致）；manifest 名称/描述/权限 → `wxt.config.ts`。**本项目无 `docs/`、`_locales/`、HelpDialog、CWS、privacy.html，勿引用这些不存在的路径。**

## 11. 优化与重构边界

- 大文件拆分、重复代码抽离、组件/类型/公共方法封装等优化，必须在**不影响原有功能与交互体验**的前提下进行。
- 若优化可能改变功能、交互、视觉、默认值、数据格式、权限或隐私边界，必须**停下询问确认**，不得以「应该没影响」作为继续依据。
- 优化后用相同场景验证行为等价，并及时清理被替代的死代码与引用。

## 12. 验证

- 每次功能开发或修复后必须自审 diff，禁止引入新问题或破坏存量功能与交互。
- 按改动范围执行：TS/Vue/运行时 → `pnpm lint:all`；入口/manifest/依赖/打包 → `pnpm build`；转换逻辑或端到端行为 → `pnpm test:e2e`（Playwright + `fixtures/`）。
