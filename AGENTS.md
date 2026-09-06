# AGENTS.md · File Format Converter

> **完全离线的 Chrome MV3 文件格式转换扩展**。点击工具栏图标在新标签页打开转换工作台（options 页面），在浏览器本地完成文档 / 数据 / 图片三大类格式的批量与多步转换，支持预览编辑、历史记录与 ZIP 打包。无网络请求、无账号，文件不出本机。
>
> 强制编码规则见 `.qoder/rules/wxt-rules.md`；本文件补充架构、命令、约定与陷阱，二者冲突时以规则文件为准。

## 改动优先级

隐私与离线 > 功能正确性 > 数据/行为兼容性 > 可维护性 > 性能 > 代码风格。

- 改动前先读相关实现，不臆测行为；只做满足需求的最小完整改动，不顺手重构或格式化无关文件。
- 未经用户明确要求，不改变既有功能、交互、默认值、存储结构或权限，不提交/推送/发布，不升级依赖或改写 lockfile。

## 常用命令

| 用途               | 命令                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| 开发（热重载）     | `pnpm dev`                                                                                |
| 生产构建           | `pnpm build`（输出 `.output/chrome-mv3`）                                                 |
| 打包分发 zip       | `pnpm package`                                                                            |
| 类型检查           | `pnpm typecheck`（vue-tsc）                                                               |
| ESLint / Stylelint | `pnpm lint` / `pnpm lint:style`                                                           |
| 全量检查           | `pnpm lint:all`（typecheck + eslint + stylelint）                                         |
| E2E 测试           | `pnpm test:e2e`（= build + `node scripts/e2e-test.mjs`，Playwright + Chrome）             |
| 图标重建           | `node scripts/render-icons.mjs`（源 `assets/*.svg` → `public/icon/*.png`）                |
| 商店/文档素材      | `pnpm assets:capture`（= build 后跑 `scripts/capture-store-assets.mjs`）                  |
| 公众号稿排版       | `pnpm promo:wechat`（`scripts/render-wechat-html.mjs`，内联样式 + 图片内嵌 + 外链转文末） |
| 产物校验           | `node scripts/verify-extension.mjs`                                                       |

> 包管理器固定 `pnpm`（见 `package.json#packageManager`），勿混用 npm/yarn。`pnpm fix:all` 会重写全仓库，局部任务改用 `pnpm exec eslint --fix <file>` / `stylelint --fix` / `prettier --write <file>`。

## 架构总览

- **`entrypoints/background.ts`**：极简 Service Worker，仅 `action.onClicked` → `runtime.openOptionsPage()`。**无消息路由、无 sidepanel、无保活/闹钟**——勿照搬其它扩展的后台模式。
- **`entrypoints/options/`**：主界面（Vue 应用，转换工作台）。
  - `index.html`：用 `<meta name="manifest.open_in_tab" content="true">` 声明在新标签页打开。
  - `main.ts`：挂载前读取 storage 应用主题（避免默认主题闪烁），导入 `~/assets/styles/global.css`。
  - `App.vue`：装配层——调用 `initConverters()`，编排 `useConversion` / `useI18n`，重型子组件用 `defineAsyncComponent` 懒加载，绑定 `Ctrl/⌘+Enter` 开始转换。
- **转换引擎（核心）**：
  - `utils/core/types.ts`：`FileFormat` 枚举、`Converter` / `ConvertResult` / `ConversionStep` / `FileFormatInfo` 接口。
  - `utils/core/registry.ts`：`ConverterRegistry` 单例，维护 from→to 邻接表，用 **BFS** 求最短多步路径（`findConversionPath`）与全部可达目标（`getAllSupportedTargets`）。
  - `utils/converters/*.ts`：每个转换对一个模块，实现 `Converter`（`from`/`to`/`convert(blob)`），重型依赖内部动态 `import()`。
  - `utils/converters/index.ts`：`initConverters()` 幂等注册全部转换器（启动时调用一次）。
- **`composables/`**：`useConversion`（批量转换编排：逐文件路径解析、错误隔离、`AbortController` 取消、fflate ZIP、写历史）、`useFileDetect`（扩展名优先 + MIME 兜底）、`useHistory`（最近 50 条**元数据**，模块级共享）、`useI18n`（中/英，默认 `zh`，模块级响应式）、`useTheme`（6 主题 × light/dark/system）。
- **`components/`**：`shared/`（FileUpload、FormatSelector、ConversionProgress、ResultDownload、ComparisonView、PreviewDialog、PreferencesMenu、CollapsibleCard）+ `options/HistoryPanel`；`popup/` 为空占位（无 popup）。
- **`utils/core/` 其它工具**：`format-labels.ts`（`FORMAT_INFO` 元数据 + label/category）、`text-decode.ts`（UTF-8 + GBK 兜底）、`html-document.ts`、`image-utils.ts`、`preview.ts`、`alt-chunk.ts`、`format.ts`（`formatSize`）。
- **`utils/storage.ts`**：唯一存储边界。`STORAGE_KEYS`（全部 `fat:` 前缀）+ `storageGet/Set`（try/catch 静默降级）+ `onStorageChange`（返回取消订阅）。仅用 `storage.local`，**无加密、无 session**。
- **`assets/`**：`theme/tokens.css`（`--fat-*` 令牌，6 主题 + dark）、`styles/global.css`（`@import` tokens + 基础样式 + reduced-motion）、图标 SVG 源。
- **对外文档层（不打包进扩展）**：`docs/index.html`（产品说明页，兼作 GitHub Pages 根目录，含 JSON-LD `SoftwareApplication` + `FAQPage`）、`docs/privacy.html`（双语隐私政策，CWS 必需）、`docs/llms.txt` / `robots.txt` / `sitemap.xml`、`docs/assets/`（截图与推广图，由 `scripts/capture-store-assets.mjs` 生成）、`docs/promo/`（中英推广稿与公众号/微博文案，**草稿不发布**，生成的 `*.html` 已 gitignore）、`CHROMEWEBSTORE.md`（商店文案与披露，**尚未上架**）。
- **`utils/stubs/unbundled-dep.ts`**：`wxt.config.ts` 将 jspdf 未用的 `html2canvas`/`canvg` 别名到此空 stub，减包约 200KB。

## 核心数据流

上传/粘贴文件 → `useFileDetect` 识别格式 → `availableTargets` 取所有源格式可达目标的**交集**（混合格式批次只提供对全部文件有效的目标）→ 选目标 → `convert()`：对每个文件独立 `findConversionPath` 逐步执行多步链，`AbortController` 支持取消，**逐文件错误隔离**（单个失败不阻断批次）→ 结果下载（单文件或 ZIP）→ 成功批次写入历史（仅元数据，best-effort）。

## 新增转换器

1. 新建 `utils/converters/<from>-to-<to>.ts` 实现 `Converter`（`from`/`to`/`convert(blob)`），重型依赖动态 `import()`。
2. 在 `utils/converters/index.ts` 的 `initConverters()` 注册。
3. 引入新格式时：扩展 `utils/core/types.ts` 的 `FileFormat`、`utils/core/format-labels.ts` 的 `FORMAT_INFO`、`composables/useFileDetect.ts` 的 `EXTENSION_MAP`/`MIME_MAP`，并补中英文案。

> 经过新格式的多步路径由 BFS 自动发现，无需手写链路。

## 安全与隐私基线

- 默认离线：无网络请求/遥测/数据收集，权限仅 `storage`。新增权限、host、远程资源或任何数据外传前必须获用户确认并更新 README 隐私说明。
- 上传文件、剪贴板、ZIP 条目、storage 数据均为**不可信输入**：边界处校验类型/大小（如 100MB 上限）/格式，失败安全降级。
- 渲染或转换不可信 HTML/SVG/Markdown 前必须 **DOMPurify 净化**（参考 `md-to-html`/`docx-to-html`/`html-to-pdf`/`html-to-png`/`svg-to-html`）；禁止 `v-html`、向实时 DOM 写 `innerHTML`、`eval`、`new Function`。
- 不把用户文件内容写入日志、截图、`fixtures/` 或提交记录。

## 性能约定

- 首屏精简：重型子组件用 `defineAsyncComponent`；重型转换库在转换器内部动态 `import()`。
- 主题在 `main.ts` 挂载前应用，避免闪烁。
- 保留 `wxt.config.ts` 中 jspdf 的 `html2canvas`/`canvg` stub 别名（除非启用 jspdf `.html()`）。

## i18n 与文档同步

- 文案源 `utils/i18n/zh.ts`，`en.ts` 类型 `typeof zh`；增删改 key 时中英必须一致。默认 `zh`，`t(key, params)` 支持 `{param}` 插值。
- 文档按影响分层更新：功能/用法 → `README.md` + `README.zh-CN.md`（双语一致）；对外产品说明/隐私政策 → `docs/index.html` + `docs/privacy.html`；商店文案 → `CHROMEWEBSTORE.md`；manifest 名称/描述/权限 → `wxt.config.ts`（`description` 与 `package.json` 同步且 ≤132 字符）。
- 根目录**无** `index.html`（产品页故意放 `docs/`，避开与 `entrypoints/options/index.html` 混淆）；亦无 `_locales/`、HelpDialog、popup；**尚未上架 Chrome 应用商店**，勿引用不存在的商店链接。

## 测试与验证

- **无单元测试框架（无 vitest）**。端到端用 Playwright：`scripts/e2e-test.mjs` 加载构建产物，跑各转换场景并截图到 `.test-screenshots/`，夹具在 `fixtures/`（由 `scripts/make-fixtures.cjs` 生成）。
- 交付前按改动范围执行：`pnpm lint:all`（必过）；涉及入口/manifest/依赖/打包 → `pnpm build`；涉及转换逻辑或端到端行为 → `pnpm test:e2e`。
- CI（`.github/workflows/ci.yml`，Node 20）：lint（`pnpm lint:all`）+ build + e2e。
- 截图脚本与 e2e 共用一套「静态服务 + mock `chrome.storage`」启动方式，目前**故意保留两份**（避免改 1290 行测试文件引入回归）；出现第三个消费方时再抽 `scripts/e2e-harness.mjs`。
- 不为通过检查而弱化规则、跳过或隐藏错误；无法运行的项在交付时说明原因。

## 常见陷阱

- **别名是 `~/`**（WXT 默认），不是 `@/`。
- **Element Plus 按需**：禁止整包导入；`ElMessage` 等由 resolver 自动导入，无需手动 import；样式用 CSS（非 SCSS）。
- **storage key 必须带 `fat:` 前缀**并集中在 `STORAGE_KEYS`；`storageGet/Set` 已 try/catch，历史/偏好为 best-effort，失败不得卡住转换 UI。
- **模块级共享状态**：`useHistory`/`useI18n`/`useTheme` 用模块级 `ref`/`reactive` + `initialized` 守卫做跨组件单例；新增此类状态须保持幂等初始化与 `onStorageChange` 清理。
- **转换语义边界**（改动前须确认）：PDF 输出为图片（文字不可选）；PDF 输入仅提取文本；多 sheet XLSX→CSV 输出 ZIP；多页 PDF→图片输出 ZIP；BMP/GIF/SVG 仅支持作为输入（浏览器无法编码），GIF 取首帧、SVG 栅格化。
- **文档素材不得入包**：`docs/` 与 `CHROMEWEBSTORE.md` 是仓库文档，而 `public/` 会被 WXT 原样打包——截图/推广图只能放 `docs/assets/`。UI 变更后必须重跑 `pnpm assets:capture`，否则商店截图与实际界面漂移。
- **对外文案数字要取证**：格式数 14 / 路径数 46+ 来自工作台页脚（`App.vue` 的 `formatCount`/`pathCount`），体积来自 `pnpm build` 输出，阈值来自 `FileUpload.vue` / `useConversion.ts`；改这些常量时同步改 `README*`、`docs/*`、`CHROMEWEBSTORE.md`。

## 完成标准

- 需求满足，既有功能、交互、数据与隐私边界无未确认变化。
- 自审 diff：无遗留调试 `console`、无敏感数据、无无关改动、异常路径已处理。
- `pnpm lint:all` 通过；按范围补 `pnpm build` / `pnpm test:e2e`，或说明未验证项。
- 交付说明：改了什么、关键原因、执行了哪些验证、剩余风险。
