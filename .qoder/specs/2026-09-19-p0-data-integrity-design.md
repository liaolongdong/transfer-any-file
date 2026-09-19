# P0 隐私披露 + 数据完整性修复 · 设计规格

日期：2026-09-19　范围：`transfer-any-file` v1.0.0（未上架）
轨道：用户选定「先清 P0 + 数据损坏」

## 0. 目标与不变量

修复 9 项已核验缺陷，使产品重新具备提交 Chrome Web Store 审核的条件，并消除转换层的静默数据损坏。

硬不变量（任何一项被触碰即停下询问）：

- 权限保持 `storage` 单一；无 `host_permissions`、无 `optional_permissions`、无远程资源。
- 第一方源码零网络调用（`verify:offline` 断言范围不变）。
- 不改 `fat:` 存储键集合与结构；不改界面语言/主题/预设/历史的既有语义。
- 不新增用户可见交互（无新开关、无新面板）。
- 中英 i18n 键集保持相等（`en.ts: typeof zh` 由 vue-tsc 守住）。

## 1. 用户已定的三个取舍

| 决策 | 选择 | 后果 |
| --- | --- | --- |
| ⑤ PDF 页面切片 | JPEG → **PNG** | 所有文档→PDF 文字无损；二次有损链消除；图片多的文档 PDF 体积上升 |
| ⑥⑦ 电子表格 | **值保真为默认** | `00424`/20 位账号/日期不再被改坏；JSON 出真数字；CSV 出 ISO 日期 |
| ⑨ 内联 SVG 进 Word | **栅格成 PNG 内嵌** | Word 必定渲染；docx 内丢矢量 |

## 2. 修复项

### F-1 ① `html→docx` 剥离远程子资源（P0，隐私）

`utils/converters/html-to-docx.ts`：在 `DOMPurify.sanitize` 之后、`asBlob` 之前插入
`stripRemoteResources(sanitized)`（`utils/core/html-sanitize.ts:96`）。

- `isLocalUrl` 已放行 `data:`/`blob:`，mammoth 内联的 base64 图片不受影响。
- 与 `html-raster.ts:84`、`ComparisonView.vue`、`PreviewDialog.vue` 的既有边界做法对齐。
- 顺序：`replaceInlineSvgWithPng` → `sanitize` → `stripRemoteResources` → `asBlob`（见 F-8）。

### F-2 ② 隐私政策补两项存储披露（P0）

`docs/privacy.html` 英文清单（约 `:191-193`）与中文清单（约 `:250-252`）各补：

- 图片输出参数（`fat:outputOptions`）：最长边、质量、体积上限、PDF 清晰度。
- 转换预设（`fat:presets`）：**含用户自行输入的预设名称**、目标格式与输出参数。

措辞保持既有「仅存本机、不上传、可清除」框架。同步核对 `CHROMEWEBSTORE.md` 的隐私披露块。

### F-3 ③ 产品页商店死链（P0）

`docs/index.html:5414`（zh-CN）与 `:5417`（en）当前把 `https://chrome.google.com/webstore/detail/ITEM_ID`
渲染为真实 `<a href>`。改为与 `README.md:29-32` 同口径：移除锚点、保留纯文本说明「尚未上架」。
上架后再以真实 URL 恢复，恢复时同步 `CHROMEWEBSTORE.md`。

### F-4 ④ `verify:offline` 产物断言在 CI 中恒未执行（P0）

`scripts/check-offline.mjs:90` 的 `if (fs.existsSync(builtManifest))` 改为：缺失时
`process.exit(1)` 并提示「产物 manifest 断言需要 `.output/chrome-mv3`，请先构建」，
新增 `--source-only` 旗标供纯源码场景使用。

`.github/workflows/ci.yml`：把 `verify:offline` 从 lint job 拆到 build job 之后执行
（lint job 保留 `--source-only` 变体，使源码层断言仍在最快反馈路径上）。

`AGENTS.md` 与 `.qoder/rules/wxt-rules.md` 中「产物只有 storage 权限」的描述同步为真实执行位置。

### F-5 ⑤ 消除二次有损 + 让路由偏好显式化

**F-5a** `utils/converters/html-to-pdf.ts:50`：
`pageCanvas.toDataURL('image/jpeg', 0.92)` → `toDataURL('image/png')`；
`:52` `pdf.addImage(pageImgData, 'JPEG', …)` → `'PNG'`。
`addImage` 末位 `'FAST'` 保留。

**F-5b** 路由不再依赖注册顺序。`utils/core/types.ts` 的 `Converter` 增加可选
`edgePreference?: number`（越小越优先，缺省视为同值）；`ConverterRegistry.register()`
（`registry.ts:13-24`）按 `(edgePreference, 注册顺序)` 稳定插入 adjacency。
`utils/converters/index.ts` 为 `html→*` 出边显式声明偏好，**取值使当前解析结果逐条不变**，
并在文件注释写明：不声明时退化为注册顺序。

验收：对**全部源格式 × 全部目标格式组合**（14 × 13 = 182 对，含不可达者）跑路径快照，
改动前后 `findConversionPath` 结果**逐条一致**。
这是「不改变产品语义、只去掉隐式依赖」的判据。

### F-6 ⑥ `csv→xlsx` 值保真 + 公式中性化

`utils/converters/csv-to-xlsx.ts` 重写核心（现仅 `XLSX.read(text,{type:'string'})` + `write`）：

1. 用 `XLSX.read(text, { type: 'string', raw: true })` 解析，使每个字段落成**字符串单元格**。
   （执行期纠正：原文写的 `XLSX.utils.csv_to_sheet` **在 SheetJS 0.18.5 里不存在**，
   `utils` 只暴露 33 个函数、CSV 仅经 `PRN` 的 `dsv_to_sheet_str` 进入。实测 `raw` 在
   `read` 上确实是「不做类型推断」的开关——`xlsx.js:8349` 的 `else if(o.raw)` 短路在
   布尔/数字/日期/公式各分支**之前**，故无需退回手工切分，也不必自己重写引号、内嵌换行、
   CRLF、`sep=` 与分隔符猜测。）
2. 逐格判定是否转数字，需**同时**满足两条：
   ① 往返检查 `/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/` 且 `String(Number(v)) === v`；
   ② **有效数字 ≤ 15**。
   前导零、`1.50`、`1e5` 由 ① 自然挡下，不需要额外分支。
   ② 是执行期补的（用户决策，`4ad9f3e`）：往返检查的边界是 2^53 而且是软的，实测 16 位整数有
   **94.5%** 能通过 ① 被判成数字，而 Excel 显示只保留 15 位有效数字——`4111111111111111`
   （Visa 形状）与 `6222021234567890`（银联形状）都会渲染成 `4.11111111111111e+15`。
   16 位银行卡号恰好落在这一档，与本项要消灭的缺陷同类，故 ① 单独不足以封住。
   有效数字只数尾数的数字字符（不计符号、小数点、指数，不去末尾零）。
3. 其余一律 `{ t: 's' }`，并设 `z: '@'` 文本格式，避免 Excel 打开后二次重解析。
4. **顺序必须是「先判数字，再对落选的文本单元格跑 `guardCsvValue`」**。
   （执行期纠正：原文把守卫写在判数字之前，那是**新的数据损坏**——
   `DANGEROUS_PREFIX` 含 `-`，`-42` 会被改写成文本 `'-42`，而旧转换器产出的是数字 `-42`。
   数字单元格不可能被 Excel 重读为公式，所以守卫只需作用于文本格。）
5. 日期字符串（`2024-01-05`、`1/2`）**一律不猜**，保持文本。

产物变化：`00424` 不再变 `424`；20 位账号不再变 `1.23457E+19`；`=1+1` 不再成为活公式。
副作用（需在 CHANGELOG 说明）：纯数字列若被判为文本，Excel 会提示「以文本形式存储的数字」。

### F-7 ⑦⑧ `xlsx→csv/json/html` 值保真 + 公式单元格策略统一

`utils/converters/xlsx-to-csv.ts:30`：读取选项改为
`{ type:'array', cellDates:true, dateNF:'yyyy-mm-dd hh:mm:ss' }`——删掉非法的 `raw:false`
（读取期不识别，被选项归一化丢弃），`dateNF` 从 `sheet_to_csv` 调用处（`:41`、`:54`）**移到读取处**。
`sheet_to_csv` 增加 `raw: true`。

`utils/converters/xlsx-to-json.ts`：`:10` 补 `cellDates:true` 与 `dateNF`；`:17`
`sheet_to_json` 的 `raw:false` → `raw:true`，使 JSON 出现真数字与真布尔。

`utils/core/csv-guard.ts`：`guardFormulaCells` 增加公式分支——凡 `cell.f` 存在，
无论 `cell.t`，一律 `cell.v = "'" + String(cell.v ?? '')`、`delete cell.f`、`delete cell.w`。
同步改写 `:22-25` 的 JSDoc：现文档把「formula-result cells 不会被 Excel 重新解析」写成前提，
而这正是漏洞的成因，必须改成正确说明。

HTML 侧**保持显示文本、不做 raw 改动**，两个消费点各自独立：
`utils/converters/data-to-html.ts`（XLSX/CSV→HTML 产物）与 `utils/core/preview.ts`（XLSX 预览）。
理由：HTML 是给人看的，`1,234.50` 与 `25.0%` 是正确输出。

**顺带记录一个不在本轮的隐患**：`preview.ts:55` 是全项目唯一没有净化器的 HTML 落点
（`sheet_to_html` 直写 `renderedHtml`），而 SheetJS 不转义 `data-v`、写超链接时也不过滤 scheme。
目前靠 `PreviewDialog.vue:214/226/238` 的 `sandbox=""` iframe 兜住——**一个属性之差就是真洞**。
本轮不改（改它要引入 `stripRemoteResources` + 转义，属安全面变更且现网有 sandbox 保护），
列为 §5 的待议项，理由与现状一并留档。

**待实测项**：`raw:true` + `cellDates:true` 下 `sheet_to_csv` 对日期单元格输出的是
ISO 串还是 JS `Date.toString()`。若是后者，在 `sheet_to_csv` 之后显式格式化日期列，
不得让 ISO 目标退化成 `3/15/24`。

**已知的方案缺陷，实现时必须解开**：`dateNF:'yyyy-mm-dd hh:mm:ss'` 是**全表一个格式**，
会把纯日期格写成 `2024-01-05 00:00:00`——比现状更差。按 `cellDates:true` 后单元格是 JS
`Date` 这一事实处理：时间部分全为零则输出 `yyyy-mm-dd`，否则 `yyyy-mm-dd hh:mm:ss`。
实现位置（读取期 `dateNF` 分列 vs 写出后显式格式化）由实测结果决定，但**产物必须满足**：
`2024-01-05` 不带 ` 00:00:00`，`2024-01-05 14:30` 不丢时间。

### F-8 ⑨ 内联 SVG 进 DOCX（`svg→html→docx` 路径；`md→…` 依赖 F-9）

新增 `utils/core/svg-embed.ts`，导出
`replaceInlineSvgWithPng(html: string): Promise<string>`：

1. `DOMParser` 解析（惰性，不加载资源）。
2. 对每个 `<svg>`：先 `DOMPurify.sanitize(svgMarkup, { USE_PROFILES: { svg:true, svgFilters:true } })`
   ——**栅格化前净化**，沿用 `svg-rasterize.ts:20-29` 的纵深防御理由并写进注释。
3. 复用 `svg-rasterize.ts` 的尺寸推导：把 `prepareSvg` 从「接受 Blob」重构为
   「接受已净化的 SVG 字符串」，抽到共享位置，`svg-rasterize.ts` 与本模块同用，不复制逻辑。
4. 画布 → `toDataURL('image/png')` → 用 `<img src="data:image/png;base64,…" alt="">` 替换原节点。
5. 无固有尺寸的 SVG 走 `DEFAULT_DIM`（1024）方形回落，与 `svg-rasterize.ts:6` 一致。

`utils/converters/html-to-docx.ts` 在 F-1 的顺序里，**在 `DOMPurify.sanitize` 之前**调用它。
原因：`USE_PROFILES:{html:true}` 不含任何 svg 标签（DOMPurify `purify.es.mjs:300` 的 svg 集
只在默认档或 `svg` 档生效），先 sanitize 就没有 SVG 可转了。

不改动：`svg-to-html.ts`（内联 `<svg>` 对浏览器输出是正确的，改成 `<img>` 是降级）、
`conversion-policy.ts`（`svg→docx` 与 `svg→md` 修好后应当可选）。

`svg→md`：`html-to-md` 走 turndown，`<img src="data:image/png;base64,…">` 会转成 Markdown
图片语法，不再产出空文件。
`svg→txt` 的过度拦截：本轮**不动**，单独记为待议（`text-formats.ts:58-82` 的 `extractText`
能否从 SVG 的 `<text>` 取到内容需实测，取不到则维持现状是正确的）。

### F-9 `md-to-html` 的 SVG 白名单（F-8 的前置，非可选项）

**自检修正**：本节初稿把 `md→html→docx` 划到「已知限制、不在本轮」，是错的——`md→html`
（`utils/converters/md-to-html.ts:22`）用 `USE_PROFILES:{html:true}`，DOMPurify 的 `html` 档
不含任何 svg 标签，**内联 `<svg>` 在上一步就被删干净**，F-8 在 `html→docx` 边界无从补救。
不修这里，F-8 只覆盖 `svg→html→docx` 一条路。

改法：`md-to-html.ts:22` 的 profile 扩为
`USE_PROFILES: { html: true, svg: true, svgFilters: true }`。

安全面论证（这是本节存在的全部理由，不能省）：

- 这不是新引入的信任决策。`svg-to-html.ts:20-25` **已经**用 `{ svg:true, svgFilters:true }`
  处理用户上传的不可信 SVG 文件，本项目对该 profile 的安全边界已有先例。
- DOMPurify 的 svg 档自带 `svgDisallowed`（`purify.es.mjs:306`）：`script`、`set`、`animate`、
  `foreignobject`、`use` 等一律排除；`on*` 事件属性由 DOMPurify 默认剥离。
  `<foreignObject>` 可嵌 HTML/script 这条路径正是被 `svgDisallowed` 关掉的。
- 因此这是**把两个边界统一到同一 profile**，不是扩大安全面。若评审不同意，
  退路是接受 F-8 只修 `svg→html→docx`，并把 `md→…` 的 SVG 丢失写进 README 限制小节。

一次改动同时修好三条路：`md→html`（产物不再丢图）、`md→html→docx`（接 F-8 栅格化）、
`md→html→png`（`html-raster.ts:77` 用默认档、本就允许 svg，此前是被上游删掉了）。

`html→*` 与 `docx→*` 边界不动：它们消费的已经是 HTML，svg 是否在内由上游决定。

## 3. 验证

按项目规则 `.qoder/rules/wxt-rules.md` §12 与 `AGENTS.md` 完成标准：

1. `pnpm lint:all`（typecheck + eslint + stylelint）必过。
2. `pnpm verify:meta`、`pnpm verify:offline`（含新的产物断言）、`pnpm verify:listing` 全绿。
3. `pnpm build`，并确认 `.output/chrome-mv3` 内无 `docs/`、无 `CHROMEWEBSTORE.md`。
4. **F-1 断言（本轮唯一的隐私修复，必须有验证）**：夹具 HTML 含
   `<img src="https://…">`、`<link href="https://…">`、`style="background:url(https://…)"`、
   `@import url(https://…)` 各一处，外加一个 `<img src="data:image/png;base64,…">` 作对照；
   转 DOCX 后解包 altChunk，断言四个 `https://` 全部消失、**`data:` 那张仍在**
   （证明 `isLocalUrl` 没有误伤 mammoth 的内联图）。
5. **F-4 断言（关键：证明新守卫真的会失败）**：一个从没跑过的守卫正是这条缺陷本身，
   加完不验证等于重犯。临时在 `wxt.config.ts` 塞一个 `host_permissions: ["<all_urls>"]`，
   跑 `pnpm verify:offline` 确认**新断言变红**，再撤回。此步骤的结论写进交付说明。
   同时确认 `--source-only` 变体在无 `.output` 时仍绿。
6. **F-5b 路径快照**：改前改后对全部 182 个源×目标组合跑 `findConversionPath`，断言逐条一致。
7. **F-6/F-7 夹具**：在 `scripts/make-fixtures.cjs` 增补一个含
   `00424 / 20 位数字 / =1+1 / 2024-01-05 / 1/2 / 1,234.50 / 0.25%` 的 CSV 与一个
   带公式无缓存值、带合并单元格的 XLSX；e2e 断言转换后读回的值。
   另断言 F-7 的日期双形态：纯日期不带 ` 00:00:00`、带时间的不丢时分。
8. **F-8/F-9 夹具**：一个含内联 `<svg><rect/></svg>` 的 `.md` 与一个独立 `.svg` 文件；
   断言 `svg→docx` 产物**非空白**（解包 altChunk 检查含 `data:image/png`）、
   `md→html` 产物保留 `<svg>`、`md→docx` 与 `md→png` 不再丢图。
   F-9 另加一条恶意样本断言：`<svg><script>…</script><foreignObject>…</foreignObject></svg>`
   经 `md→html` 后 `script` 与 `foreignObject` 均不存在。
9. `pnpm test:e2e`（Playwright + 真实构建产物）。
10. 自审 diff：无调试 `console`、无无关改动、无 `eslint-disable`。

无法在本机验证、须在交付说明里写明的：Word 打开 docx 的实际渲染（无 Word）；
`raw:true` 下日期输出的确切形态（以实测为准，见 F-7 待实测项）。

## 4. 文档同步

- `CHANGELOG.md` + `CHANGELOG.en.md`（中文为主文件，成对）：F-1 安全、F-6/F-7 输出变化、F-5 质量提升。
- `README.md` / `README.en.md`：**措辞不变**。F-5a 只把切片从 JPEG 换成 PNG，
  PDF 仍然是「整页图片、文字不可选」——这条既有说明依然准确，不要顺手改弱它。
  需要新增的是「文档→PDF 的文字边缘不再出现 JPEG 振铃伪影」这一条改进记录。
- `docs/index.html` / `docs/privacy.html`：F-2、F-3。
- `CHROMEWEBSTORE.md`：F-2 隐私披露块；改字段标签时同步 `scripts/check-store-listing.mjs` 的 `FIELDS.marker`。
- `AGENTS.md` / `.qoder/rules/wxt-rules.md`：F-4 的真实执行位置；「BMP/GIF/SVG 仅输入」不受影响。
- UI 若变动：`pnpm build && pnpm assets:capture`（本轮预期无 UI 变动）。

## 5. 明确不在本轮范围

- 第四节 ⑪–㉓ 交互与无障碍缺陷（下一轨道）。
- 第五节其余守护洞（Prettier 未执行、`verify:meta` 可静默通过、e2e 子串断言、
  散文数字无断言、`CWS_PUBLISHING_GUIDE*.md` 被发到公网、`llms.txt` fflate 说法错误、
  `release.yml:253` 的 `wxt-publish-extension` 未声明、`popup-verify.png` 与「无 popup」矛盾）。
- 审计报告第七节的功能池 1–13；其中第 9 项（右键另存网页图片）需权限决策，未启动。
- `xlsx@0.18.5` CVE 换源（需用户点头）。
- `svg→txt` 过度拦截（见 F-8 末段，需实测 `extractText` 能否取到 `<text>`）。
- `preview.ts:55` 无净化器（见 F-7 记录，现由 `PreviewDialog.vue` 的 `sandbox=""` 兜住）。
- 引擎层其余中低危（审计报告 M6–M16、L17–L24）：空表抛原始 `TypeError`、`html-to-md`
  超大表 `RangeError`、`colspan/rowspan` 网格错位、`alt-chunk` 全量解压无体积上限、
  `JPG→PDF` 二次编码、`html-raster` 不吃 `maxEdge`、CRLF 双倍行距、`HTML→JSON` 首行丢失、
  22 个转换器只有 3 个响应取消。这些是**同一层的存量问题**，本轮只挑了会造成静默数据
  损坏与隐私落空的，其余留作下一轨道，避免一次改动铺得过宽无法回归。
