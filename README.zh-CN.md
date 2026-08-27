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
- **ZIP 打包下载** — 批量结果一键打包为 ZIP，也可逐个单独下载
- **粘贴即转换** — 按 <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd> 直接粘贴剪贴板中的图片或文本
- **预览与编辑** — 源文件与结果均可预览；文本类结果（Markdown / HTML / TXT / CSV）可在下载前内联编辑
- **转换历史** — 保留最近 50 条记录（仅元数据），支持一键"复用此格式"
- **CSV 编码友好** — 读取时 UTF-8 失败自动回退 GBK，输出带 UTF-8 BOM，Excel 直接打开不乱码
- **个性化** — 6 种主题色，中英文界面切换

## 支持的转换

| 类别 | 源格式 | 目标格式 |
|---|---|---|
| 文档 | Markdown、HTML、Word (.docx)、PDF、TXT | 以 HTML 为枢纽互转（如 MD → DOCX、PDF → MD、TXT → PDF） |
| 数据 | CSV ⇄ Excel (.xlsx) | |
| 图片 | PNG、JPEG、WebP、BMP | PNG、JPEG、WebP |

> 说明：PDF 输出为图片渲染（文字不可选中）；PDF 输入仅提取文本（不保留版式与图片）；BMP 仅支持作为输入——浏览器无法编码 BMP；XLSX → CSV 导出第一个工作表。

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
