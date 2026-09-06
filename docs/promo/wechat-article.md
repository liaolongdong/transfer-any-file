# 我把"文件格式转换"做成了一个不联网的 Chrome 扩展

> 14 种格式、46+ 条转换路径、0 个网络请求。这篇文章讲清楚三件事：为什么在线转换器不适合处理你的敏感文件、浏览器为什么其实已经够用、以及做成本地工具会撞上哪些真实的工程取舍。

![一张概念插画：一份文件在浏览器窗口内部完成格式变换，没有任何连线通向云端](assets/hero-local-conversion.png)

## 一、"免费在线转换"免费的是什么

把合同拖进任何一个"免费在线转换"网站，发生的事情大致是：

1. 文件通过你的网络上行到对方服务器；
2. 服务器用 LibreOffice / FFmpeg / 商业 SDK 跑一次转换；
3. 结果回传给你，服务器留一份副本；
4. 页面告诉你"文件将在 24 小时内删除"。

第 4 步是承诺，不是机制。你无法验证它，也无法验证对方是否顺手做了别的事——训练语料、格式统计、或者更糟。对企业来说，这已经不是隐私问题而是合规问题：把含员工薪资的表格传给一个不知境的第三方服务，在多数数据保护框架下就已经构成"向第三方提供数据"。

还有一层成本没人写在首页上：你为了转换一个 3 MB 的文件，先上传 3 MB、再下载 3 MB，中间排队。我本地做过的事情，网络往返占了绝大部分时间。

所以我做了 Transfer Any File：**转换这件事，本来就不需要离开你的电脑。**

## 二、浏览器早就是一个转换器，只是没人用它

这不是取巧的说法。今天一个 Chromium 内核的浏览器里，已经躺着相当完整的编解码能力：

- 图片：PNG / JPEG / WebP 原生编码，BMP / GIF / SVG 原生解码；
- DOM 与富文本：浏览器本身就是 HTML 引擎，解析和序列化都是内建；
- 一堆成熟的纯前端库：`marked`（Markdown → HTML）、`turndown`（HTML → Markdown）、`mammoth`（.docx → HTML）、`pdf.js`（PDF → 文本/图像）、`SheetJS`（.xlsx ⇄ CSV/JSON）、`jsPDF` + `html-to-image`（HTML → PDF/PNG）、`fflate`（ZIP）、`DOMPurify`（净化）。

把这些拼起来，就能覆盖办公场景里最常见的那 14 种格式：Markdown、HTML、Word(.docx)、PDF、TXT、CSV、Excel(.xlsx)、JSON、PNG、JPEG、WebP、BMP、GIF、SVG。

边界同样清楚，而且我不会假装它不存在：

- **没有 OCR。** 把截图变成文字需要一个模型，几十 MB 起步、还要联网下载——这直接违背"离线"这个前提，所以图片 → TXT/CSV 在界面上是**置灰并写明原因**，而不是等你点了转换才报错。
- **PDF 输出是图片渲染**，转换得到的 PDF 文字不可选中；PDF 输入只提取文本，版式和图片不保留。
- **BMP / GIF / SVG 只能作为输入**，因为浏览器压根没有提供编码器。
- 视频、音频、电子书不在射程内。

一个诚实的工具应该先告诉你它不能干什么。

## 三、真正的杠杆：把转换对当成一张图

如果只做"格式 A → 格式 B"，你得为每一对组合手写代码：14 种格式两两之间是 91 对，写到天荒地老，而且新增一种格式要跟所有已有格式重新配对。

换个建模就完全不一样：**每个转换器只声明自己的一条边**（`from`、`to`、`convert(blob)`），注册进一张有向图；需要 A → Z 时，在图上做一次 BFS 求最短路径，然后逐段执行。

```
Markdown ──► HTML ──► PDF
Word     ──► HTML ──► Markdown
JSON     ──► HTML ──► XLSX
SVG      ──► HTML ──► PNG
```

结果有两个。第一，**多步链路是"求出来的"，不是写出来的**——用户点一次"Markdown 转 PDF"，实际跑了两段。第二，**新增一个转换器只有 20 行**，而所有经过它的路径立刻自动可用。当前这张图有 46 条直连边，工作台页脚那行"14 formats supported, 46+ conversion paths"就是从图里现算出来的，不是文案。

![示意图：多个转换器像地铁线路一样连成一张网，一条高亮的两跳路径把 Markdown 接到 PDF](assets/conversion-graph.png)

## 四、批量场景才见真章：几个踩过的坑

单个文件转换，在线工具也做得不错。真正逼出差异的是"我有 40 个格式不一样的文件"。

**混合源格式批次。** 拖进来的可能是 .md、.csv、.xlsx 各若干。目标格式下拉框只列出**对每一个文件都可达**的格式——否则用户选了个只有部分文件能转的目标，一半会失败。

**逐文件错误隔离。** 一个损坏的 .docx 不能毁掉整批。每个文件独立求路径、独立执行、独立记录失败原因；批次还能中途取消，已完成的保留。

**ZIP 压缩要按条目选择。** 直觉做法有两种：全部 stored（快，但文本结果体积白占）或全部 deflate（省空间，但对 PNG/PDF/XLSX 这些"已经压缩过"的产物纯粹烧 CPU）。实测的正确答案是**按条目决定**：文本类（TXT/CSV/JSON/HTML/Markdown）走 deflate，能小一个数量级；已是压缩容器的直接 stored。混合批次实测下来比一刀切省约 47%。

**中文 CSV 的编码现实。** 读取时 UTF-8 失败自动回退 GBK，写出时带 UTF-8 BOM——否则 Excel 打开必乱码。这种细节不做，中文用户第一分钟就会流失。

**不可信输入必须净化。** 用户上传的 HTML / SVG / Markdown 全是攻击面。任何由用户文件生成的 HTML、SVG、Markdown 在渲染前都要过 DOMPurify，预览跑在 `sandbox` 的 iframe 里，全程禁止 `v-html`、`eval`、`new Function`。

**首屏不该背着 pdf.js。** 所有重型依赖在转换器内部动态 `import()`，重型子组件用 `defineAsyncComponent` 懒加载。整个扩展产物 3.7 MB，但打开工作台时不会去拉 pdf.worker（1.26 MB）。

**无障碍不是慈善项目，是可测的指标。** 常驻可见的表面（顶栏品牌文字、skip link、焦点环）在 6 种主题 × 明暗共 12 组配置下都要达到 WCAG 2.1 AA，并且由端到端测试逐主题断言守护——不是"看着还行"。这里也留着一个已知缺陷：浅色的森林绿 / 活力橙主题下，主按钮只有 2.5–3.6:1，因为它的 base / hover / active 三档底色没法被同一种前景同时覆盖，要修得重排浅色主色阶。写在这里，免得别人替我发现。

![界面截图：左侧 Markdown 源码、右侧渲染后的 HTML，顶部是 Rendered / Source / Edit / Copy 切换](../assets/screenshots/preview-edit.png)

## 五、它现在在哪、怎么装

**还没上 Chrome 应用商店**，直说。目前只能源码加载，四步：

```bash
# 环境：Node.js ≥ 20.12、pnpm
git clone https://github.com/liaolongdong/transfer-any-file
cd transfer-any-file
pnpm install && pnpm build
```

然后 `chrome://extensions` → 打开右上角"开发者模式" → "加载已解压的扩展程序" → 选 `.output/chrome-mv3` → 点工具栏图标，工作台在新标签页打开。

仓库地址：[github.com/liaolongdong/transfer-any-file](https://github.com/liaolongdong/transfer-any-file)。

商店需要的东西已经准备好了：名称与描述文案、1280×800 截图、权限逐条说明、隐私政策、数据披露答复，都写在仓库的 `CHROMEWEBSTORE.md` 和 `docs/privacy.html` 里。上架还差一个开发者账号和一次提交——如果你想推动这件事，去仓库开个 issue 就行。

技术栈：**WXT + Vue 3 + TypeScript + Element Plus**，Manifest V3，权限只有 `storage`，ISC 协议。代码里的验证方式也一并交代：Playwright 驱动构建产物跑 159 条断言，夹具（`fixtures/`）随仓库走。

## 六、谁不该用它

- 要转视频、音频、EPUB、CAD：找专业在线服务，别为难浏览器。
- 要把扫描件 / 截图变成可编辑文字：需要 OCR，这里没有。
- 要把 PDF 转成排版完好的 Word：这里只能给你文本，版式会丢。
- 公司设备禁止安装未上架扩展、也没有开发者模式权限：这条路走不通。

反过来，如果你手上是**合同、薪资表、病例、未公开稿件、客户数据**，只是想在 Markdown / Word / PDF / Excel / CSV / JSON / HTML / 图片之间倒一下格式——那它不该有任何理由离开你的电脑。

---

**项目地址**：[github.com/liaolongdong/transfer-any-file](https://github.com/liaolongdong/transfer-any-file)（README 有中英双版，产品说明页与隐私政策在仓库的 `docs/` 下）
**如果它帮你在上传前多犹豫了一次那 3 秒钟，给个 Star 就够，这是它能得到的最主要推广渠道。**

<!-- 参考资料：微信正文外链不可点击，脚本会把链接统一搬到文末。 -->
