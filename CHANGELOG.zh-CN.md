# 更新日志

简体中文 · [English](CHANGELOG.md)

**Transfer Any File** 的所有值得记录的变更都写在这里。格式遵循
[Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)；`package.json` 中的版本号即扩展
manifest 的版本号，因此 `vX.Y.Z` 标签、构建产物与商店包始终指向同一次发布。

## [未发布]

_暂无待发布的改动。_

## [1.0.0] - 2026-09-07

首个版本：面向 Chrome（Manifest V3）的离线文件格式转换扩展。所有转换都在你自己电脑的一个标签页里
完成——无服务器、无账号、无网络请求。

### 新增

- **转换工作台** —— 点击工具栏图标即在新标签页打开。没有弹窗，也没有侧边栏，全部操作都在那一页里。
- **14 种格式** —— 文档（Markdown、HTML、Word `.docx`、PDF、TXT）、数据（CSV、Excel `.xlsx`、JSON）
  与图片（PNG、JPEG、WebP、BMP、GIF、SVG）；注册表中有 46 条直接路径，经广度优先搜索共 143 个可选的
  源→目标组合。
- **自动多步链路** —— Markdown → PDF 实际按 Markdown → HTML → PDF 两步串跑，路径显示在选择框下方；
  新增一个转换器即自动解锁所有经过它的路径。
- **混合批次与失败隔离** —— 不同源格式共用一个目标，只列出对批次内全部文件都可达的格式；单个文件读取
  失败不会阻断整批，失败逐条列出原因。
- **过程可控** —— 长批次可随时取消（已完成结果保留）、上一轮结果可撤销、超过约 5 个文件或 20 MB 先弹
  确认、任务在后台标签页完成时可选发送桌面通知、开始转换的 `Ctrl/⌘ + Enter` 可改绑。
- **预览与编辑** —— 源文件与结果左右对照，分隔条可拖、滚动可同步，并可切换仅原文件 / 仅结果；文本类
  结果（Markdown、HTML、TXT、JSON、CSV）可就地修改后再下载。
- **批量输入输出** —— ZIP 打包按条目选择压缩策略（文本 deflate 后约小 10 倍，已压缩产物直接 stored）、
  拖入 `.zip` 自动展开并把支持的条目并入批次、多工作表逐个输出 CSV、多页 PDF 逐页输出图片、支持
  剪贴板粘贴转换（`⌘V` / `Ctrl+V`）。
- **中文表格不乱码** —— CSV 读取先试 UTF-8、失败自动回退 GBK，写出时带 BOM，国内系统导出的表格能正常
  读入，转出的 CSV 双击进 Excel 也不会变方块。
- **转换历史** —— 保留最近 50 次成功转换的元数据（文件名、格式、体积，绝不含文件内容）：可按文件名
  搜索、按源/目标筛选、一键复用格式组合、逐条删除、体积趋势小图，以及按记录 ID 合并的 JSON 导出导入。
- **个性化** —— 6 种主题色 × 浅色 / 深色 / 跟随系统，主题在挂载前应用因此不会闪错色；中英双语界面
  （默认中文）。
- **无障碍** —— 跳转至主内容链接、可见焦点环、完整 ARIA 标注与 `prefers-reduced-motion` 降级；常驻
  可见面的对比度由端到端套件在 6 主题 × 浅/深全部组合下实测达到 WCAG 2.1 AA。
- **隐私即结构** —— manifest 只申请 `storage`，不声明 `host_permissions`，也不含远程代码；
  `pnpm verify:offline` 在每次 CI 中断言第一方源码不发起任何请求。
- **工程链路** —— WXT + Vue 3 + TypeScript + Element Plus（按需引入），重型转换库按转换器动态引入以保持
  首屏精简；Playwright 套件直接驱动构建产物、使用 `fixtures/` 样例；CI 覆盖 lint、构建与端到端；
  GitHub Pages 从 `docs/` 部署；发布工作流负责产出商店包并校验包内容。

### 已知限制（写在前台，不做隐藏）

- PDF 输出逐页渲染为图片，转出的 PDF 文字不可选定、不可搜索。
- PDF 输入只提取文本，原排版与内嵌图片不保留。
- 不做 OCR —— 图片 → TXT/CSV/Excel 在选择框中置灰并写明原因，因为内置 OCR 模型会多出几十 MB 并引入
  模型下载，与离线承诺冲突。
- BMP、GIF、SVG 只能作为输入，浏览器不提供它们的编码器（GIF 取首帧，SVG 先展平再栅格化）。
- 上限：单文件 100 MB（超过 20 MB 时提示），单批 200 个文件。不做视频、音频、电子书与 CAD 格式。

<!-- 下方的链接在标签存在后才可访问；推送 `vX.Y.Z` 后由 .github/workflows/release.yml 创建 Release。 -->

[未发布]: https://github.com/liaolongdong/transfer-any-file/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/liaolongdong/transfer-any-file/releases/tag/v1.0.0
