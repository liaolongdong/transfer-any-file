<div align="center">
  <img src="public/icon/128.png" alt="Transfer Any File 图标" width="96" height="96" />

# Transfer Any File

**14 种文件格式互转——Markdown、Word、PDF、Excel、CSV、JSON、HTML、图片——一个字节都不用上传。**

一款 Chrome 扩展（Manifest V3），所有转换都在你自己电脑上的一个标签页里完成。无服务器、无账号、无排队，文件永远不出本机。

简体中文 · [English](README.md)

  <!-- 徽章与链接均指向 github.com/liaolongdong/transfer-any-file，创建并推送该仓库后即生效。 -->

[![给这个项目加星](https://img.shields.io/github/stars/liaolongdong/transfer-any-file?style=for-the-badge&logo=github&label=%E2%AD%90%20Star%20this%20repo&color=yellow)](https://github.com/liaolongdong/transfer-any-file/stargazers)

[![Manifest V3](https://img.shields.io/badge/Manifest_V3-ready-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/get-started)
&nbsp;
![14 种格式 · 46+ 条路径](https://img.shields.io/badge/14_formats_-_46%2B_routes-green?style=for-the-badge)
&nbsp;
![零网络请求](https://img.shields.io/badge/zero_network_requests-brightgreen?style=for-the-badge)
&nbsp;
![CI](https://img.shields.io/github/actions/workflow/status/liaolongdong/transfer-any-file/ci.yml?style=for-the-badge&label=CI)
&nbsp;
![License ISC](https://img.shields.io/badge/license-ISC-blue?style=for-the-badge)

[快速开始](#快速开始) · [工作原理](#工作原理) · [支持的格式](#支持的转换) · [隐私](#隐私) · [常见问题](#常见问题) · [参与贡献](#参与贡献)

</div>

![Markdown 转 HTML 的左右对照预览：左侧源码，右侧渲染结果](docs/assets/screenshots/preview-edit.png)

---

## 为什么做这个

绝大多数"免费在线转换"网站第一步就是让你上传文件。公开数据集无所谓，但 HR 表格、客户合同、体检报告、还没告诉任何人的草稿就不一样了。而且它们还附带账号墙、每日额度、25 MB 上限，以及为你的本地操作白白付出一次上传往返。

Transfer Any File 把整件事留在本地。转换器全部跑在扩展页面里，一个 3 MB 的 Word 文件变成 Markdown，不需要有一个数据包离开你的机器——在飞机上照样能用。

## 快速开始

```bash
# 环境要求：Node.js 20.12+（WXT 依赖 util.parseEnv）、pnpm
pnpm install
pnpm build
```

然后在 Chrome 中：

1. 打开 `chrome://extensions`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择 `.output/chrome-mv3` 目录
4. 点击工具栏图标——转换工作台在新标签页打开

目前尚未上架应用商店；`CHROMEWEBSTORE.md` 保存了随时可提交的商品文案、素材与披露答复。

## 工作原理

```
拖入 / 选择 / 粘贴文件           选择一个目标格式
        │                                  │
        ▼                                  ▼
  识别格式   ──────►  在转换器图上做 BFS 寻路  ◄── 自动求出最短路径
  （扩展名 +           14 种格式 · 46+ 条直连路径
   魔数字节）                      │
                                     ▼
                     逐文件转换，可随时取消
                     单个失败 ≠ 整批失败
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
                  下载单个文件                 整批 → 一个 ZIP
                  可预览可编辑                 写入历史（仅元数据）
```

每个转换对都把自己注册成图上的一条边，所以多步链路是"寻路求出来的"而不是写死的：Markdown → HTML → PDF、Word → HTML → Markdown，都是一次点击。新增一个转换器只需约 20 行，它参与的所有路径立刻自动可用。

## 支持的转换

| 类别 | 源格式                                 | 目标格式                                                                                |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| 文档 | Markdown、HTML、Word (.docx)、PDF、TXT | 以 HTML 为枢纽互转（如 MD → DOCX、PDF → MD、TXT → PDF）；PDF 还可逐页转为 PNG/JPEG/WebP |
| 数据 | CSV ⇄ Excel (.xlsx)、JSON              | 互相转换，并经 HTML/CSV 桥接进入文档簇                                                  |
| 图片 | PNG、JPEG、WebP、BMP、GIF、SVG         | PNG、JPEG、WebP（GIF 取首帧、SVG 光栅化）                                               |

> 说明：PDF 输出为图片渲染（文字不可选中）；PDF 输入仅提取文本（不保留版式与图片）；PDF → 图片逐页渲染，多页文档下载为"每页一张 PNG"的 ZIP 包；BMP、GIF、SVG 仅支持作为输入——浏览器无法编码它们；多工作表 XLSX → CSV 会下载包含"每表一个 CSV"的 ZIP 包。目标格式下拉会列出全部格式，并对不可达的转换置灰、给出原因：图片无法转换为文本或表格数据（这需要 OCR，本扩展完全离线、未内置），PDF 也无法可靠转换为表格/结构化数据。

## 你能用它做什么

**批量与规模**

- **混合源格式批次** — 一次拖入 40 个不同类型的文件，每个文件各自求出到公共目标的路径；下拉只提供对**所有**已选文件都可达的格式
- **逐文件错误隔离** — 单个损坏文件不会阻塞整批，失败文件连同原因单独列出
- **ZIP 打包 + 按条目压缩** — 文本类结果（TXT / CSV / JSON / HTML / Markdown）走 deflate，体积可缩小约 10 倍；本身已压缩的目标（PNG / JPEG / PDF / XLSX / DOCX）直接存储，不白耗 CPU
- **压缩包解包** — 拖入 `.zip`，其中可转换的文件自动加入批次
- **多工作表 / 多页感知** — XLSX → CSV 导出全部工作表；PDF → 图片导出全部页面
- **边界大小防护** — 单文件超过 20 MB 提示、超过 100 MB 拒绝，单批最多 200 个文件

**预览与编辑**

- **左右对照视图** — 源文件与结果并排，可拖动分隔条，支持仅看源 / 仅看结果与同步滚动
- **内联编辑** — 文本类结果（Markdown / HTML / TXT / CSV）可在下载前直接改
- **粘贴即转换** — <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> 直接粘贴剪贴板中的图片或文本
- **CSV 编码友好** — 读取时 UTF-8 失败自动回退 GBK，输出带 UTF-8 BOM，Excel 打开不乱码

**控制与恢复**

- **撤销** — 一键恢复上一批转换结果；更换所选文件或目标格式后该快照失效
- **大批次转换前确认** — 批次超过 5 个文件或 20 MB 时弹出汇总确认框（阈值固定），可在偏好设置中关闭
- **自定义快捷键** — <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> 开始转换，可重新绑定；浏览器保留组合（<kbd>Ctrl+T/W/N/L</kbd>、<kbd>Tab</kbd>、<kbd>Esc</kbd> 等）会被拒绝
- **完成通知** — 页面处于后台时，批次完成可选发送桌面通知；基于 Web `Notification` API，不需额外扩展权限
- **可中断** — 长批次可中途停止，已完成的文件保留

**历史与个性化**

- **转换历史** — 保留最近 50 条记录（仅元数据），支持一键"复用此格式"、按文件名搜索、按源/目标格式筛选、单条删除、体积趋势图，以及 JSON 导出/导入（按记录 ID 合并）。多文件批次显示为 `"<首个文件名> +N"`；新记录会额外保存完整文件列表，因此批次里每个文件都能被搜索到，悬停也可查看全部成员。旧版本保存的记录仍只能匹配这个标签
- **键盘可达** — 提供跳转主内容的 skip link、可见焦点环，完整支持 `prefers-reduced-motion`
- **可测量的对比度** — 常驻可见的表面（顶栏品牌文字、skip link、焦点环）在 6 种主题色 × 明暗共 12 组配置下均达到 WCAG 2.1 AA，并由端到端测试逐主题断言守护。已知限制：浅色的森林绿 / 活力橙主题下，主按钮仍只有 2.5–3.6:1，因为它的 base / hover / active 三档底色无法被同一种前景同时覆盖——这需要重排浅色主色阶，目前尚未处理
- **个性化** — 6 种主题色 × 浅色 / 深色 / 跟随系统，中英文界面切换

## 使用方法

1. 点击扩展图标——转换工作台在新标签页打开
2. 将文件拖入上传区（或点击选择、或直接粘贴剪贴板内容）
3. 选择目标格式——下拉框只会列出所有已选文件都能到达的格式
4. 点击 **开始转换**，随后单个下载或整批打包为 ZIP
5. 打开右上角 **偏好设置**，可切换主题 / 语言 / 显示模式，开关完成通知与大批次确认，或重新绑定转换快捷键

## 隐私

- 所有转换 **100% 在本地** 的扩展页面内完成——`fetch`、`XMLHttpRequest`、`WebSocket`、`sendBeacon` 在打包代码中一处都没有，manifest 也不声明任何 host 权限，因此不存在文件外发的路径
- 仅申请 `storage` 一项权限，用于保存历史（文件名、格式、体积——绝不含文件内容）与偏好设置
- 无统计埋点、无追踪、无账号、无广告、无付费版
- 完整文本：[`docs/privacy.html`](docs/privacy.html) · 面向商店的披露答复：[`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md)

## 常见问题

**我的文件会被上传吗？**
不会。转换器是打包进扩展的 JavaScript，manifest 只申请了 `storage`。既没有可上传到的服务器，也没有允许发请求的 host 权限。

**能把 PDF 转成可编辑的 Word / Excel 吗？**
不能无损做到。PDF 输入只提取文本，PDF 输出是逐页渲染成图片，因此转换得到的 PDF 文字不可选中。Word 与 Excel 之间以 HTML 作为枢纽格式。

**为什么不能把截图转成文本文件？**
那需要 OCR，而项目没有内置任何 OCR 引擎——它会带来几十 MB 体积和一次模型下载，与"完全离线"的承诺冲突。所以图片 → TXT/CSV 是置灰并给出原因，而不是等到转换时才失败。

**没有网络能用吗？**
可以。装好之后，界面、字体、转换器全部在本地，飞行模式下表现完全一致。

**和在线转换工具比，差别在哪？**
同一件事，方向相反：在线工具把你的文件送到你不控制的机器上，并承诺"24 小时内删除"；本扩展从来没有一份可删除的副本。代价是覆盖面——在线工具能吃几百种格式（含音视频），这里覆盖浏览器可解码的 14 种文档 / 数据 / 图片格式。

**有体积或数量限制吗？**
单文件上限 100 MB（20 MB 起提示），单批最多 200 个文件，超过 5 个文件或总计 20 MB 会先弹确认框。

## 开发

```bash
pnpm dev              # 开发模式，热重载（WXT）
pnpm build            # 生产构建，输出到 .output/chrome-mv3
pnpm package          # 打包 zip 用于分发
pnpm typecheck        # vue-tsc 类型检查
pnpm lint:all         # typecheck + eslint + stylelint
pnpm test:e2e         # 构建 + 基于 fixtures/ 的 Playwright 套件（159 条断言）
pnpm assets:capture   # 重新生成商店与 README 用的截图和推广图
node scripts/render-icons.mjs   # 从 assets/*.svg 重新渲染图标
```

### 技术栈

- [WXT](https://wxt.dev/) + Vue 3 + TypeScript + Element Plus
- 转换器：[marked](https://github.com/markedjs/marked)、[turndown](https://github.com/mixmark-io/turndown)、[mammoth](https://github.com/mwilliamson/mammoth.js)、[html-docx-js-typescript](https://github.com/caiyexiang/html-docx-js-typescript)、[jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image)、[pdf.js](https://mozilla.github.io/pdf.js/)、[SheetJS](https://sheetjs.com/)、[fflate](https://github.com/101arrowz/fflate)、[DOMPurify](https://github.com/cure53/DOMPurify)
- 重型依赖按转换器动态 `import()`，首屏保持精简（完整产物 3.7 MB）

### 项目结构

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
  assets/screenshots/  # 1280×800 界面截图，README / 产品页 / 商店共用
  assets/store/        # 社交预览图 + Chrome 应用商店推广图
scripts/               # e2e 套件、素材生成、图标渲染、产物校验
CHROMEWEBSTORE.md      # 商店文案、权限说明、隐私披露
```

`docs/` 只是仓库文档，永远不会被复制进 `.output/chrome-mv3`。

### 新增一个转换器

1. 创建 `utils/converters/<from>-to-<to>.ts`，实现 `Converter` 接口（`from`、`to`、`convert(blob)`）
2. 在 `utils/converters/index.ts` 中注册
3. 若引入了新格式：扩展 `FileFormat`、`FORMAT_INFO`，以及 `composables/useFileDetect.ts` 中的扩展名/MIME 映射

经过新格式的多步转换路径会被自动发现。

## 参与贡献

1. Fork 后从 `master` 切分支，跑 `pnpm install && pnpm dev`
2. 保持离线底线：不新增权限、不发起网络请求、不引用远程资源；确有必要请在 PR 里写明
3. 提交前跑 `pnpm lint:all` 与 `pnpm test:e2e`，新增转换器请一并补上 fixture 与测试场景

问题反馈与格式需求：[github.com/liaolongdong/transfer-any-file/issues](https://github.com/liaolongdong/transfer-any-file/issues)

## 许可证

[ISC](LICENSE)

---

<div align="center">

**如果它帮你少上传了一次敏感文件，加个星能让下一个人更容易找到它。**

[![给这个项目加星](https://img.shields.io/github/stars/liaolongdong/transfer-any-file?style=for-the-badge&logo=github&label=%E2%AD%90%20Star%20this%20repo&color=yellow)](https://github.com/liaolongdong/transfer-any-file/stargazers)

作者：[Better](https://github.com/liaolongdong)

</div>
