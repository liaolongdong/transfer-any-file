# 为 Transfer Any File 贡献代码

简体中文 · [English](CONTRIBUTING.en.md)

欢迎贡献代码——格式需求与 bug 报告同样欢迎。这个项目不大，主张也很明确，所以整套规则压缩在这一页里。完整的机器校验规则见 `.qoder/rules/wxt-rules.md`，架构、命令与工作流见 `AGENTS.md`。

## 三步

1. **Fork，从 `main` 切分支，把开发循环跑起来**

   ```bash
   pnpm install          # Node.js ≥ 20.12（WXT 需要 util.parseEnv），pnpm 版本在 package.json 中锁定
   pnpm dev              # 热重载；把 .output/chrome-mv3 以「加载已解压的扩展程序」方式载入
   ```

2. **改代码，同时保证那些承诺依然成立**

   ```bash
   pnpm lint:all         # 类型检查 + eslint + stylelint —— 必须通过
   pnpm verify:offline   # 第一方源码不发起网络请求；manifest 权限仍只有 storage
   pnpm verify:meta      # package.json / public/_locales/en / wxt.config.ts / .github/repo-metadata.json 一致
   pnpm test:e2e         # 构建 + Playwright 跑 fixtures/ —— 必须通过
   ```

3. **提 PR**，说清楚改了什么、为什么改、跑了哪些检查。

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

## 值得先知道的约定

- **技术栈**：WXT + Vue 3（`<script setup lang="ts">`）+ TypeScript + Element Plus，全部按需引入。别名是 `~/`，不是 `@/`。
- **样式**：scoped CSS，使用 `assets/theme/tokens.css` 里的 `--fat-*` 设计令牌；不硬编码颜色。
- **国际化**：每一处用户可见文案都要同时存在于 `utils/i18n/zh.ts`（源）与 `en.ts`；组件里不写字面量。
- **日志**：`entrypoints/`、`components/`、`composables/`、`utils/` 中不得出现 `console`——错误通过 UI 反馈给用户。`scripts/` 下的脚本除外。
- **文档**：面向用户的改动要同时更新 `README.md`（中文）**和** `README.en.md`（英文）；商店文案在 `CHROMEWEBSTORE.md`；产品说明页是 `docs/index.html`。值得发布的改动要在 `CHANGELOG.md`（中文）与 `CHANGELOG.en.md`（英文）**各**记一条，版本号等于 `package.json#version`（发布 tag 也必须与之一致）。仓库的 GitHub About 描述改在 `.github/repo-metadata.json` 里，**不要**只在页面上手改，这样它才受版本管理并被 `pnpm verify:meta` 校验；每个值为什么这么写、本机没装 `gh` 时怎么一次性落地，见 `.github/repo-metadata.md`。安全漏洞走 `SECURITY.md`，不是 issue。仓库根的双语文档一律成对：中文是主文件，英文版用 `.en.md` 后缀（`CONTRIBUTING.md` / `CONTRIBUTING.en.md`、`SECURITY.md` / `SECURITY.en.md`、`CHANGELOG.md` / `CHANGELOG.en.md`），H1 下第一行是互指的语言切换行，改一边必须同步另一边。UI 变更后跑 `pnpm assets:capture` 重新生成截图，避免素材与实际界面漂移。
- **图标**：两份 SVG 母版对应两档尺寸——`assets/icon.svg`（文档 + 环形转换徽章）用于 48px 及以上，`assets/icon-small.svg`（加粗双向箭头）用于更小的位置，因为详细版的 5px 线条在 48px 以下会糊成一团。用 `node scripts/render-icons.mjs` 重新生成两档。
- 不要为了让检查通过而弱化 ESLint / Stylelint / TypeScript 配置。确实需要绕过某条规则时，把抑制范围限制到单独一行，并在 diff 里说明原因。

## 许可证

一旦提交贡献，即表示你同意这些贡献按项目的 [MIT 许可证](LICENSE)发布。
