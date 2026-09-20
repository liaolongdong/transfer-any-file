# 为 Transfer Any File 贡献代码

简体中文 · [English](CONTRIBUTING.en.md)

欢迎贡献代码——格式需求与 bug 报告同样欢迎。这个项目不大，主张也很明确，所以整套规则压缩在这一页里：开发命令、技术栈、项目结构、新增转换器的流程、编码约定与文档同步要求都在下面。完整的机器校验规则见 `.qoder/rules/wxt-rules.md`，架构、命令与工作流见 `AGENTS.md`。

## 三步

1. **Fork，从 `main` 切分支，把开发循环跑起来**

   ```bash
   pnpm install          # Node.js ≥ 20.12（WXT 需要 util.parseEnv），pnpm 版本在 package.json 中锁定
   pnpm dev              # 热重载；把 .output/chrome-mv3 以「加载已解压的扩展程序」方式载入
   ```

2. **改代码，同时保证那些承诺依然成立**

   ```bash
   pnpm lint:all              # 类型检查 + eslint + stylelint + 格式检查 —— 必须通过
   pnpm verify:offline:source # 第一方源码不发起网络请求；wxt.config.ts 仍只声明 storage
   pnpm verify:meta           # package.json / public/_locales/en / wxt.config.ts / .github/repo-metadata.json 一致
   pnpm test:e2e              # 构建 + Playwright 跑 fixtures/ —— 必须通过
   pnpm verify:offline        # 构建之后断言产物 manifest：浏览器加载的那份只有 storage 权限
   ```

3. **提 PR**，说清楚改了什么、为什么改、跑了哪些检查。

## 全部命令

上面的「三步」是最小循环，完整清单如下。包管理器固定 `pnpm`（见 `package.json#packageManager`），勿混用 npm/yarn。

```bash
pnpm dev              # 开发模式，热重载（WXT）
pnpm build            # 生产构建，输出到 .output/chrome-mv3
pnpm package          # 打包 zip 用于分发
pnpm typecheck        # vue-tsc 类型检查
pnpm lint             # eslint
pnpm lint:style       # stylelint（assets/**/*.css 与 .vue）
pnpm format           # Prettier --write 全仓库
pnpm format:check     # Prettier --check 全仓库（不写盘）
pnpm lint:all         # typecheck + eslint + stylelint + format:check
pnpm verify:meta      # package.json / wxt.config.ts / public/_locales/en / .github/repo-metadata.json 保持一致
pnpm verify:offline   # 源码层检查 + 产物 manifest 断言（须先 pnpm build；缺 .output/chrome-mv3 时直接失败，不再静默跳过）
pnpm verify:offline:source # 只跑源码层：第一方源码无网络调用，wxt.config.ts 仅声明 storage 权限（无需先构建）
pnpm verify:listing   # CHROMEWEBSTORE.md 每个粘贴字段不超限、与 manifest 一致、速查区块未漂移
pnpm test:e2e         # 构建 + 基于 fixtures/ 的 Playwright 套件
pnpm assets:capture   # 重新生成商店与 README 用的截图和推广图（需先 pnpm build）
node scripts/render-demo-gif.mjs   # 重录 README 顶部的演示 GIF（需先 pnpm build，另需 PATH 上有 ffmpeg）
node scripts/render-icons.mjs   # 从 assets/*.svg 重新渲染两档图标
node scripts/verify-extension.mjs   # 校验构建产物内容
git tag v1.0.0 && git push --tags   # release.yml：产出商店包、校验包内容并创建 GitHub Release
```

演示 GIF 与截图一样从真实构建产物录制（`docs/assets/demo/demo-<locale>.gif`，中/英各一条，用 `DEMO_LOCALES="zh en"` 控制），界面交互变更后若不重录，README 会与实际控制台漂移。

`pnpm fix:all` 会重写全仓库，局部任务改用 `pnpm exec eslint --fix <file>` / `stylelint --fix <file>` / `prettier --write <file>`。

## 唯一那条真正重要的规则

**保持离线。** 不加网络请求，不加远程资源，不加权限，不做遥测。manifest 只申请 `storage`，并且没有任何第一方源文件发起请求——`pnpm verify:offline` 会在 `entrypoints/`、`components/`、`composables/`、`utils/` 里 grep `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon`，命中即失败。（打包进来的第三方转换器里确实存在未被调用的请求路径；让它们失效的是扩展没有 `host_permissions`，浏览器会直接拒掉。）如果某个改动确实需要其中之一，请先开 issue，不要塞进 PR。

其余要求都由它推出：用户文件、剪贴板内容、ZIP 条目与 storage 中的值一律视为不可信输入，在边界处校验（单文件 20 MB 警告 / 100 MB 拒绝，单批次 200 个文件），由它们生成的 HTML / SVG / Markdown 在渲染前必须经 DOMPurify 净化。

## 新增一个转换器

1. 新建 `utils/converters/<from>-to-<to>.ts`，实现 `Converter`（`from`、`to`、`convert(blob)`）；重型库在 `convert()` 内部动态 `import()`。
2. 若转换耗时较长、需要知道来源文件，或产出图片，就接收可选的第二个参数 `ctx` —— `{ signal, source, options }`。在可中断处响应 `signal`（取消中的批次要保留已完成的结果）；所有 canvas 编码都走 `encodeCanvas(canvas, mime, options)`，用户的输出参数才会生效；返回的字节与名义目标不是同一个容器时（多 sheet / 多页结果是 ZIP），用 `containerExt` 声明。
3. 在 `utils/converters/index.ts` 中注册。
4. 仅当引入了新格式时：扩展 `FileFormat`（`utils/core/types.ts`）、`FORMAT_INFO`（`utils/core/format-labels.ts`）、扩展名/MIME 映射（`composables/useFileDetect.ts`），并补齐中英文案。
5. 在 `fixtures/` 下加一个夹具，并在 `scripts/e2e-test.mjs` 里加一个场景。

经过新格式的多步路径由注册表的 BFS 自动发现，不需要手写链路。

## 技术栈

- [WXT](https://wxt.dev/) + Vue 3 + TypeScript + Element Plus（Manifest V3），Element Plus 通过 `unplugin-vue-components` + `ElementPlusResolver` 按需引入，命令式 API 由 resolver 自动导入
- 转换器：[marked](https://github.com/markedjs/marked)、[turndown](https://github.com/mixmark-io/turndown)、[mammoth](https://github.com/mwilliamson/mammoth.js)、[html-docx-js-typescript](https://github.com/caiyexiang/html-docx-js-typescript)、[jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image)、[pdf.js](https://mozilla.github.io/pdf.js/)、[SheetJS](https://sheetjs.com/)、[fflate](https://github.com/101arrowz/fflate)、[DOMPurify](https://github.com/cure53/DOMPurify)
- 重型依赖按转换器动态 `import()`，首屏保持精简（完整产物 3.76 MB）；ZIP 引擎 fflate 也走同一条路——五个调用点统一经 `utils/core/zip.ts` 的 `loadFflate()`，转换器由 `initConverters()` 静态注册，顶层 `import 'fflate'` 会把它拉回首屏；重型子组件在 `App.vue` 里用 `defineAsyncComponent` 懒加载

## 项目结构

```
entrypoints/
  background.ts        # 点击图标打开工作台
  options/             # 转换工作台（Vue 应用）
components/            # 共享 UI（上传、格式选择、预览、结果、历史）
composables/           # useConversion / useFileDetect / useHistory / useI18n / useTheme
utils/
  core/                # 转换器注册表（BFS 寻路）、类型、格式元数据
  converters/          # 每个转换对一个模块
  i18n/                # 中 / 英文词典
assets/                # 图标 SVG 母版、全局样式、主题令牌
docs/                  # 产品说明页 + 隐私政策（GitHub Pages 源目录，不打包进扩展）
  assets/screenshots/  # 1280×800 原始界面截图，README 与产品说明页使用
  assets/store/        # 社交预览图 + Chrome 应用商店推广图
    screens/           # 带文案的 1280×800 商店截图（中英两套）
scripts/               # e2e 套件、素材生成、图标渲染、元数据与离线断言
.github/
  workflows/           # ci.yml · static.yml（Pages）· release.yml · repo-meta.yml
  ISSUE_TEMPLATE/      # 问题反馈与新格式请求表单
  repo-metadata.md     # 仓库 About 描述、20 个 topics、社交预览图为什么这么写与怎么落地
CHROMEWEBSTORE.md      # 商店文案、权限说明、隐私披露
CHANGELOG.md           # 发布说明（.en.md 为英文对照）
CONTRIBUTING.md        # 一页说完全部贡献规则（.en.md 为英文对照）
SECURITY.md            # 漏洞披露渠道与离线攻击面说明（.en.md 为英文对照）
```

`docs/` 只是仓库文档，永远不会被复制进 `.output/chrome-mv3`——`public/` 会被 WXT 原样打包，所以截图与推广素材只能留在 `docs/assets/`。

## 值得先知道的约定

- **别名与组件写法**：本地模块用 `~/` 引入，不是 `@/`；SFC 一律 `<script setup lang="ts">`（技术栈与依赖清单见上一节）。
- **样式**：scoped CSS，使用 `assets/theme/tokens.css` 里的 `--fat-*` 设计令牌；不硬编码颜色。
- **国际化**：每一处用户可见文案都要同时存在于 `utils/i18n/zh.ts`（源）与 `en.ts`；组件里不写字面量。
- **日志**：`entrypoints/`、`components/`、`composables/`、`utils/` 中不得出现 `console`——错误通过 UI 反馈给用户。`scripts/` 下的脚本除外。
- **文档**：面向用户的改动要同时更新 `README.md`（中文）**和** `README.en.md`（英文）；商店文案在 `CHROMEWEBSTORE.md`；产品说明页是 `docs/index.html`。值得发布的改动要在 `CHANGELOG.md`（中文）与 `CHANGELOG.en.md`（英文）**各**记一条，版本号等于 `package.json#version`（发布 tag 也必须与之一致）。仓库的 GitHub About 描述改在 `.github/repo-metadata.json` 里，**不要**只在页面上手改，这样它才受版本管理并被 `pnpm verify:meta` 校验；每个值为什么这么写、本机没装 `gh` 时怎么一次性落地，见 `.github/repo-metadata.md`。安全漏洞走 `SECURITY.md`，不是 issue。仓库根的双语文档一律成对：中文是主文件，英文版用 `.en.md` 后缀（`CONTRIBUTING.md` / `CONTRIBUTING.en.md`、`SECURITY.md` / `SECURITY.en.md`、`CHANGELOG.md` / `CHANGELOG.en.md`），H1 下第一行是互指的语言切换行，改一边必须同步另一边。UI 变更后跑 `pnpm assets:capture` 重新生成截图，避免素材与实际界面漂移。
- **图标**：两份 SVG 母版对应两档尺寸——`assets/icon.svg`（文档 + 环形转换徽章）用于 48px 及以上，`assets/icon-small.svg`（加粗双向箭头）用于更小的位置，因为详细版的 5px 线条在 48px 以下会糊成一团。用 `node scripts/render-icons.mjs` 重新生成两档。
- 不要为了让检查通过而弱化 ESLint / Stylelint / TypeScript 配置。确实需要绕过某条规则时，把抑制范围限制到单独一行，并在 diff 里说明原因。

## 无障碍与对比度断言

端到端套件（`pnpm test:e2e`）在 6 种主题色 × 明暗共 12 组配置下逐项断言四组对比度：

- 顶栏品牌文字对顶栏背景 ≥ 4.5:1（WCAG 2.1 AA 文本类）
- 焦点环对卡片背景 ≥ 3:1（AA 用户界面组件类）
- 主按钮文字在**常态 / 悬停 / 按下**三种状态下均 ≥ 4.5:1——读数取自已放入文件、已选目标、确实可点击的那颗按钮（文本规则豁免禁用控件）
- 正文信息文字（拖放提示、粘贴提示、文件列表标题、文件大小、页脚）对各自底色 ≥ 4.5:1——同样是放进文件之后的真实页面，五串文字逐个读回；每档主题切换后先等 400ms，因为令牌带 0.18s 过渡，在过渡中间采样拿到的是插值色

另单独断言第一次 Tab 落在 skip link 上且该链接显示可见焦点环。2026-09-14 在真实页面实测的最低值为 4.70:1（浅色玫瑰红），深色六档均在 7.03:1 以上；信息文字那组 2026-09-20 实测最差 4.95:1（浅色玫瑰红的拖放提示）。

**墨色分工**：`--fat-text-secondary` 是信息文字唯一可用的墨色（浅色 4.95–5.44:1，深色 7.37–8.42:1）；`--fat-text-placeholder`（浅色 2.33–2.56:1）只留给 1.4.3 管不着的三种情形——真正的输入占位符、禁用控件、状态已由 ARIA 属性承载的装饰。把信息文字改成后者，上面第四组断言会直接变红。

**已知限制**：控件的填充色对它所在的背景还需 ≥ 3:1（WCAG 1.4.11），12 组里有 10 组满足，浅色的森林绿与活力橙主按钮不满足（最浅状态 2.21 / 2.96:1）——这两档填充本身就接近白色，再加深到 3:1 就要花掉文字那一侧的余量。改动 `assets/theme/tokens.css` 里的主题令牌时，上面这些断言会直接把回归拦下来。

## 许可证

一旦提交贡献，即表示你同意这些贡献按项目的 [MIT 许可证](LICENSE)发布。
