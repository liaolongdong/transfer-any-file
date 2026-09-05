<div align="center">
  <img src="public/icon/128.png" alt="File Any Transfer 图标" width="96" height="96" />

  # File Any Transfer

  **常见文件格式互转，完全在浏览器本地完成，全程离线。**

  简体中文 · [English](README.md)

</div>

---

File Any Transfer 是一款 Chrome 扩展（Manifest V3），在本地完成文档、表格与图片的格式转换。无需上传、无服务器、无需注册——你的文件永远不会离开你的电脑。

## 功能特性

- **一键工作台** — 点击工具栏图标，在新标签页打开全宽的转换工作台
- **批量转换** — 一次转换多个文件，支持混合源格式；每个文件独立解析各自的转换路径
- **智能转换链** — 自动寻找多步转换路径（如 Markdown → HTML → PDF），基于 BFS 的转换器注册表驱动
- **逐文件错误隔离** — 单个损坏文件不会阻塞整批任务，失败文件会连同原因单独列出
- **ZIP 打包下载** — 批量结果一键打包为 ZIP，也可逐个单独下载。压缩方式按条目选择：文本类结果（TXT / CSV / JSON / HTML / Markdown）走 deflate，体积可缩小约 10 倍；本身已压缩的目标（PNG / JPEG / PDF / XLSX / DOCX）则直接存储，不白耗 CPU
- **粘贴即转换** — 按 <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> 直接粘贴剪贴板中的图片或文本
- **预览与编辑** — 源文件与结果均可预览；文本类结果（Markdown / HTML / TXT / CSV）可在下载前内联编辑
- **转换历史** — 保留最近 50 条记录（仅元数据），支持一键"复用此格式"、按文件名搜索、按源/目标格式筛选、单条删除、体积趋势图，以及 JSON 导出/导入（按记录 ID 合并）。多文件批次显示为 `"<首个文件名> +N"`；新记录会额外保存完整文件列表，因此批次里每个文件都能被搜索到，悬停也可查看全部成员。旧版本保存的记录仍只能匹配这个标签
- **CSV 编码友好** — 读取时 UTF-8 失败自动回退 GBK，输出带 UTF-8 BOM，Excel 直接打开不乱码
- **压缩包解包** — 拖入 `.zip` 自动解出其中可转换的文件，直接整批转换
- **多工作表感知** — XLSX → CSV 导出全部工作表（多表工作簿输出"每表一个 CSV"的 ZIP 包）
- **PDF 转图片** — PDF 逐页光栅化为 PNG，多页文档自动打包为"每页一张图"的 ZIP
- **批量操作增强** — 一键追加文件 / 清空批次；<kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> 快捷开始转换
- **撤销** — 一键恢复上一批转换结果；更换所选文件或目标格式后该快照失效
- **大批次转换前确认** — 当批次超过 5 个文件或 20 MB 时弹出汇总确认框（阈值固定），可在偏好设置中关闭
- **自定义快捷键** — 在偏好设置中重新绑定转换快捷键；浏览器保留组合（<kbd>Ctrl+T/W/N/L</kbd>、<kbd>Tab</kbd>、<kbd>Esc</kbd> 等）会被拒绝
- **完成通知** — 转换完成时若页面处于后台，可选发送桌面通知。基于 Web `Notification` API 实现，不需额外的扩展权限
- **键盘可达** — 提供跳转主内容的 skip link、可见焦点环，完整支持 `prefers-reduced-motion`
- **个性化** — 6 种主题色 × 浅色 / 深色 / 跟随系统，中英文界面切换

## 支持的转换

| 类别 | 源格式 | 目标格式 |
|---|---|---|
| 文档 | Markdown、HTML、Word (.docx)、PDF、TXT | 以 HTML 为枢纽互转（如 MD → DOCX、PDF → MD、TXT → PDF）；PDF 还可逐页转为 PNG/JPEG/WebP |
| 数据 | CSV ⇄ Excel (.xlsx)、JSON | 互相转换，并经 HTML/CSV 桥接进入文档簇 |
| 图片 | PNG、JPEG、WebP、BMP、GIF、SVG | PNG、JPEG、WebP（GIF 取首帧、SVG 光栅化） |

> 说明：PDF 输出为图片渲染（文字不可选中）；PDF 输入仅提取文本（不保留版式与图片）；PDF → 图片逐页渲染，多页文档下载为"每页一张 PNG"的 ZIP 包；BMP、GIF、SVG 仅支持作为输入——浏览器无法编码它们；多工作表 XLSX → CSV 会下载包含"每表一个 CSV"的 ZIP 包。目标格式下拉会列出全部格式，并对不支持的转换置灰、给出原因：图片无法转换为文本或表格数据（这需要 OCR，本扩展完全离线、未内置），PDF 也无法可靠转换为表格/结构化数据。

## 隐私

- 所有转换 **100% 在本地** 的扩展页面内完成
- 仅申请 `storage` 一项权限（用于历史记录与偏好设置）
- 无统计埋点、无网络请求、不收集任何数据

## 安装

### 从源码构建

```bash
# 环境要求：Node.js 18+、pnpm
pnpm install
pnpm build
```

然后在 Chrome 中：

1. 打开 `chrome://extensions`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择 `.output/chrome-mv3` 目录

## 使用方法

1. 点击扩展图标——转换工作台在新标签页打开
2. 将文件拖入上传区（或点击选择、或直接粘贴剪贴板内容）
3. 选择目标格式——下拉框只会列出所有已选文件都能到达的格式
4. 点击 **开始转换**，随后单个下载或整批打包为 ZIP
5. 打开右上角 **偏好设置**，可切换主题 / 语言 / 显示模式，开关完成通知与大批次确认，或重新绑定转换快捷键

## 开发

```bash
pnpm dev        # 开发模式，热重载（WXT）
pnpm build      # 生产构建，输出到 .output/chrome-mv3
pnpm package    # 打包 zip 用于分发
pnpm typecheck  # vue-tsc 类型检查
pnpm lint:all   # typecheck + eslint + stylelint
node scripts/render-icons.mjs  # 从 assets/*.svg 重新渲染图标
```

### 技术栈

- [WXT](https://wxt.dev/) + Vue 3 + TypeScript + Element Plus
- 转换器：[marked](https://github.com/markedjs/marked)、[turndown](https://github.com/mixmark-io/turndown)、[mammoth](https://github.com/mwilliamson/mammoth.js)、[html-docx-js-typescript](https://github.com/caiyexiang/html-docx-js-typescript)、[jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image)、[pdf.js](https://mozilla.github.io/pdf.js/)、[SheetJS](https://sheetjs.com/)、[fflate](https://github.com/101arrowz/fflate)、[DOMPurify](https://github.com/cure53/DOMPurify)

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
```

### 新增一个转换器

1. 创建 `utils/converters/<from>-to-<to>.ts`，实现 `Converter` 接口（`from`、`to`、`convert(blob)`）
2. 在 `utils/converters/index.ts` 中注册
3. 若引入了新格式：扩展 `FileFormat`、`FORMAT_INFO`，以及 `composables/useFileDetect.ts` 中的扩展名/MIME 映射

经过新格式的多步转换路径会被自动发现。

## 许可证

[ISC](package.json)
