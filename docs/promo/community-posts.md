# 社区分发文案（中文渠道）· Transfer Any File

> 用途：把已完成的产品事实投到中文渠道上，换回 GitHub 的访问与 star、以及商店上架后的安装量。
> 与 `wechat-article.md`（公众号长文）、`weibo-posts.md`（微博短帖）互补：本文件只管**掘金 / V2EX / 知乎 / 即刻·小红书**这四类社区帖。
> 这些草稿**不自动发布**，全部由开发者手工粘贴；发布前请读文末[发贴纪律](#发贴纪律每次都要过一遍)。
>
> 英文渠道（dev.to / Hashnode / Show HN / Reddit / X）见 [`community-posts.en.md`](community-posts.en.md)。

## 先用这一份事实表（所有渠道共用）

写任何一帖都从这里取数，**不要凭记忆**。每个数字都有出处，改动代码后由 `pnpm verify:numbers` 重新取证。

- 支持格式数：14 种格式（文档 5 / 数据 3 / 图片 6） | 出处 `utils/core/types.ts` 的 `FileFormat`
- 注册的直接路径：48 条直接路径 | 出处 `scripts/__baseline__/conversion-paths.json`
- 图上可达组合：143 个可达组合 | 出处 同一张图的 BFS 闭包
- 界面实际提供：提供 116 个组合，其余 27 个语义无效的置灰并说明原因 | 出处 `utils/core/conversion-policy.ts`
- 权限：只有 `storage` 一项 | 出处 `wxt.config.ts`
- 体积与阈值：单文件最大 100 MB、单批最多 200 个文件，超过 20 MB 或超过 5 个文件先弹确认 | 出处 `components/shared/FileUpload.vue`、`composables/useConversion.ts`
- 整包体积：3.78 MB | 出处 `pnpm build` 输出，按字节和 ÷ 1e6
- 端到端断言：跑 317 条断言 | 出处 `scripts/__baseline__/e2e-assertions.json`（一轮完整绿灯运行记录）
- 主题：6 种主题色，浅色 / 深色两组共 12 组配置逐组断言对比度 | 出处 `composables/useTheme.ts`
- 许可 / 作者：MIT，单一作者 Better（[@liaolongdong](https://github.com/liaolongdong)） | 出处 `LICENSE`、`package.json`
- 商店状态：**尚未上架**，只能自己构建后「加载已解压的扩展程序」 | 出处 `CHROMEWEBSTORE.md`

链接（按渠道决定放几个，能放链接就优先这几条）：

- 仓库：<https://github.com/liaolongdong/transfer-any-file>
- 产品说明页（中英双语）：<https://liaolongdong.github.io/transfer-any-file/>
- 逐条链路说明（10 条链路 + 一页总览）：<https://liaolongdong.github.io/transfer-any-file/convert/>
- 博客长文：<https://liaolongdong.github.io/transfer-any-file/blog/>

**一句必须如实说出来的话**：现在没有一键安装。所有中文渠道的帖子都要写明「未上架商店，需要 `pnpm build` 后加载解压目录」，不要让读者以为点一下就能装。这条诚实度换回来的是 issue 区没人抱怨「装不上」，以及审核员不会认为你在夸大。

## 掘金（技术长文，主渠道）

掘金读者要的是「怎么实现的」，不是「多好用」。这篇的骨架就是产品本身最有差异化的三件事：完全离线的**可验证性**、转换图的**寻路**、以及被商店拒了三次之后学到的**产物里不能留远程代码**。

- 标题：`一个字节都不上传的文件格式转换器：14 种格式、48 条边、BFS 寻路`
- 备选标题：`我把「离线转换」做成了可验证的断言，而不是 README 里的一句话`
- 分类建议：前端 / Chrome 扩展；标签：`Chrome 扩展` `前端` `开源` `隐私` `工具`

正文（可直接粘，图从 `docs/assets/` 里取，本地上传到掘金）：

```
先说清楚它是什么：一个 Chrome 扩展，把 Markdown、Word、PDF、TXT、HTML、CSV、Excel、JSON 和 6 种图片格式互转，全部在你自己的浏览器里完成。14 种格式，48 条直接路径，多步链路自动求出来。MIT 开源，尚未上架商店，需要 clone 后 pnpm build 再「加载已解压的扩展程序」。

链接在最后。下面讲三件我觉得值得写的实现细节。

## 一、「不上传」不是一个承诺，是一组可断言的性质

绝大多数「本地处理」的项目，这句话只存在于 README。我的做法是把它拆成两层守卫，写进 CI：

- `verify:offline:source`：扫第一方源码（entrypoints / components / composables / utils），断言没有 fetch、XMLHttpRequest、WebSocket、EventSource、sendBeacon；再断言 `wxt.config.ts` 只声明 `storage`、没有 host 权限。
- `verify:offline`：在 `pnpm build` 之后读产物 `.output/chrome-mv3/manifest.json`，断言 `permissions` 恰好是 `["storage"]`，且没有 `host_permissions` / `optional_permissions`。**产物缺失就直接失败**，不许写成「有产物才检查」——一条从没跑过的守卫等于没有守卫。

为什么要两层？因为 WXT 的模块和 manifest transform 会给产物加上源码里从没写过的权限。只扫源码的那条永远发现不了。

反过来说话也得准确：我不能写「包里没有任何 fetch 字符串」——jsPDF 和 pdf.js 的未调用路径确实带。正确的说法是「没有 host 权限，浏览器会直接拦下那些调用」，以及「关掉网络照样能用」。措辞的边界就是可验证性的边界。

## 二、48 条边 + BFS，代替 91 个 if

如果按「源格式 × 目标格式」写转换器，14 种格式两两组合是 91 对。我一条都没写。

每个转换对注册成图上一条边（`from` / `to` / `convert()`），`ConverterRegistry` 维护邻接表，用 BFS 求最短链路：Markdown → PDF 自动落成 Markdown → HTML → PDF，Word → Markdown 自动落成 Word → HTML → Markdown。新增一个转换器约 20 行，它参与的所有路径立刻可用，不需要改任何调用方。

代价是「可达」不等于「有意义」：图片转 CSV 在图上可能走得通，但语义上不成立。所以还有一层 `conversion-policy`，把 143 个可达组合里 27 个语义无效的（24 个图片 → 文本/数据，3 个 PDF → 表格数据）在下拉框里**置灰并给出原因**，而不是让用户点了转换才发现失败。这个「置灰而不是隐藏」的选择，是产品里我收到最多正面反馈的一处。

## 三、被商店拒了三次，第三次的原因我完全没想到

前两次是文案和功能描述的问题，改了就行。第三次是「内容政策 / Manifest V3 远程托管代码」，而我的 manifest 只有 `storage`、源码一个请求都没有。

真相是：商店按**产物内容**判定，与代码是否可达无关。jsPDF 里有一段把 cdnjs 的 `pdfobject` 当 `<script>` 注入的分支，pdf.js 里有一个 `_createCDNWrapper`。它们在我的项目里永远走不到，但**字符串躺在压缩产物里就是违规**。运行期加判断不是修法——它不改字符串。

修法只能落在构建期：`wxt.config.ts` 里一个 rollup `transform` 钩子，把这些分支整块从产物里删掉（注意必须是 `transform`，rolldown 在所有 JS 钩子之后才压缩，晚一步就匹配不到了）。然后加一条独立守卫 `verify:remote-code` 盯着产物：`http(s)://….js` 字面量、`importScripts(`、`<script src="http…">`、拼出来的 `await import("${…}")`、`createCDNWrapper`、`eval(`，以及 CSP 有没有放远程脚本源。

这条守卫同时兜住另一个风险：清除用的正则会随依赖升级静默失配。所以每次加依赖之后都必须重跑一次产物层的检查。

## 剩下的都是些琐碎但必要的部分

- 不可信输入一律按不可信处理：上传文件、剪贴板、ZIP 条目、storage 里的旧数据。渲染或转换 HTML/SVG/Markdown 前必须过 DOMPurify；不对不可信内容用 `v-html`。
- 中文编码：文本按 UTF-8 读，失败依次回退 GB18030 与 GBK；写 CSV 带 UTF-8 BOM，Excel 双击打开不乱码。
- 值保真比格式更重要：XLSX → CSV 按单元格存储值序列化（不是显示文本），日期在读取期统一成 ISO 形状而不是日序列号；CSV → XLSX 只在「解析后能精确回写」时才判成数值单元格，于是 `00123` 和一串 20 位数字不会被静默改坏。以 `= + - @` 开头的字段统一转义，防止 CSV 在 Excel 里被当公式执行。
- 首屏：重型转换库全部动态 `import()`，ZIP 引擎（fflate）也只在真正要用它的那个调用点 `await import()`。整包 3.78 MB，但打开工作台不会拉那 1.26 MB 的 `pdf.worker`。注意一个坑：`defineAsyncComponent` 不等于它的 import 也是懒的——被 `v-show` 常驻挂载的异步组件在启动那一刻就解析完了自己的 chunk。
- 测试没有单测框架，只有 Playwright 驱动**构建产物**跑 317 条断言，包括 6 种主题色 × 明暗共 12 组配置下的逐项对比度断言。
- 文档层跑过一遍：所有对外散文里的数字（格式数、路径数、组合数、阈值、断言总数）都由一条脚本现推再比对，历史陈述按文件排除在射程外。

## 链接

- 仓库（MIT，欢迎 issue）：<https://github.com/liaolongdong/transfer-any-file>
- 产品说明页（中英双语，含逐条链路的取舍）：<https://liaolongdong.github.io/transfer-any-file/>
- 转换一览：<https://liaolongdong.github.io/transfer-any-file/convert/>

安装方式暂时只有一种：clone → `pnpm install && pnpm build` → `chrome://extensions` 打开开发者模式 → 加载已解压的扩展程序 → 选 `.output/chrome-mv3`。
```

## V2EX（分享创造 / 奇客软件）

V2EX 的读者对「又是自我宣传」极其敏感，对「一个人做出来的东西」又确实宽容。所以：说清楚没上架、说清楚不做 OCR、把被拒三次当作主要内容之一。不堆卖点，不放徽章图。

- 节点：分享创造（首选）／奇客软件
- 标题：`写了个完全离线的文件格式转换扩展，14 种格式互转，被商店拒了三次终于搞清楚"离线"要怎么证明`

正文：

```
一个人做的，MIT 开源，还没上架 Chrome 商店，所以现在只能自己构建加载。

干什么的：Markdown / Word / PDF / TXT / HTML / CSV / Excel / JSON / 6 种图片格式互转，全在本机浏览器里，文件不出电脑。多步链路（比如 Markdown → PDF）不用你手工串，转换器注册成图上的边，跑 BFS 求最短路径。一次能转 200 个文件，源格式混着来也行，单个失败不拖整批。

三个当时卡住我的点，说说结论：

1. "不联网"这件事不能只写在 README 里。源码层扫第一方代码有没有网络调用，产物层读构建后的 manifest 断言权限恰好只有 storage。第二层必须在 build 之后跑，因为打包工具会往产物里加源码中没写过的东西。
2. 商店判"远程托管代码"是看**产物内容**，不看可达性。jsPDF 里注入 cdnjs 脚本的分支、pdf.js 里的 CDN wrapper，我这辈子都走不到，但字符串在包里就是违规。只能构建期整块删掉，运行期加 if 完全没用——它不改字符串。第三次拒审就是这个。
3. 转换的难点不是能不能转，是转坏了没人告诉你。所以 Excel → CSV 按存储值而不是显示文本序列化，日期写成 ISO 而不是 45296；CSV → Excel 只有能精确回写才算数字，`00123` 不会被改成 123；以 = 开头的字段一律转义。

明确不做的：OCR（图片转文字/表格，装了模型就不是离线了）、保留版式的 PDF 互转（PDF 输出是逐页图像，没有文字层；输入只提取文本）、BMP/GIF/SVG 输出（浏览器不提供编码器，GIF 只取首帧）。

技术栈 WXT + Vue3 + TS + Element Plus，Playwright 驱动构建产物跑测试。

仓库：<https://github.com/liaolongdong/transfer-any-file>
说明页（中英双语）：<https://liaolongdong.github.io/transfer-any-file/>

如果有想要但没支持的格式，直接开 issue，这条链路是真的会加：新增一个转换器约 20 行，它参与的所有路径自动可用。
```

## 知乎（挂在具体问题下面的回答，不要发专栏自吹）

回答比专栏有效，因为搜索意图已经在问题里了。目标问题类型：「有哪些免费的格式转换工具」「Word 转 Markdown 有什么好办法」「批量把 PNG 转 WebP」「如何在不联网的电脑上做格式转换」「PDF 转 Excel 表格」。

写法固定四段，不加粗不堆感叹号：

```
如果文件不能上传到别人的服务器，可选的方案其实只有三类：本机命令行工具、桌面软件、浏览器扩展。前两类大家都会提到，说下第三类里我在维护的一个开源项目（利益相关：是我写的，MIT）。

它是 Chrome 扩展，14 种格式互转：Markdown / Word / PDF / TXT / HTML / CSV / Excel / JSON，以及 PNG / JPEG / WebP / BMP / GIF / SVG。所有解析都在本机标签页里完成，manifest 只申请了扩展存储一项权限，断网也能用——这点可以自己验证，装完把网线拔了转一个文件即可。

针对你问的这个具体转换，能做到的和做不到的：
（此处按问题填：例如 PDF → Excel——做不到可靠还原，界面上这个组合是置灰的并写明原因，因为不需要 OCR 之外的能力才能"看起来"给出表格；Word → Markdown——语义结构会保留，内嵌图片以 data URI 写进 .md，页眉页脚批注不会保留。）

限制也说清楚：还没上架 Chrome 商店，需要 clone 之后 `pnpm build`，在 chrome://extensions 里加载 `.output/chrome-mv3`。单文件 100 MB、单批 200 个。PDF 输出是逐页渲染的图片，没有文字层。
仓库：<https://github.com/liaolongdong/transfer-any-file>
```

**注意**：知乎回答里那个「按问题填」的空不能偷懒。项目对 PDF → 表格这类问题给的是**否定答案**，把它写成能做的，就变成误导性功能描述——这是我被拒审时学到的最贵的一课。

## 即刻 / 小红书（短，带图）

图片用 `docs/assets/store/` 里的现成截图（1280×800，卖点已烧在图上，中英各一套），不要临时截一张糊的。

即刻（动态，控制在 300 字内）：

```
把「文件格式转换」做成了一个不联网的 Chrome 扩展，开源 MIT。
14 种格式互转，转换器注册成图上的边，多步链路自动 BFS：Markdown → HTML → PDF 是一次点击。
混合源格式批量转，单批 200 个，单个失败不拖整批；结果先看再下，文本能就地改。
只申请一项权限，断网照样能转——这点可以自己拔线验证。
还没上架商店，只能自己 pnpm build 加载。
仓库和说明页在评论区。
```

小红书（笔记，标题党要收敛在事实上）：

- 标题：`合同和体检报告别再传在线转换器了｜本地就能转格式`
- 正文要点（按此顺序写，别改顺序，顺序就是读者决策顺序）：
  1. 在线转换器第一步就是上传，「24 小时删除」只能靠对方守约；
  2. 这个扩展只申请一项权限，文件不出本机，断网可用，可以自己验证；
  3. 14 种格式：文档 / 表格 / 图片三类互转，一次能批量转 200 个；
  4. 中英界面，CSV 带 BOM，Excel 打开中文不乱码（这条对中文用户是真实痛点）；
  5. 诚实的限制：不含 OCR，PDF 转出不带文字层，目前需要自己构建安装（附具体命令）；
  6. 仓库地址放在正文最后一行，不要只放评论区。

## 发贴纪律（每次都要过一遍）

1. **数字只从上面那张事实表取**。改过代码就先 `pnpm verify:numbers`，别把旧帖子里的数字当现值。
2. **未上架商店这件事不能藏**。任何渠道都要写明构建安装路径；否则安装率没涨，先涨一批「怎么装」的 issue。
3. **不做否定式功能的正面表述**：没有 OCR、PDF 无文字层、BMP/GIF/SVG 不能作为输出——被问到就直接说不行，并说明界面上会置灰给原因。
4. **不放任何追踪参数**（`?utm_*` / `?from=*`）。项目主张是零网络请求，站点访问也不该被我们统计；链接一律干净 URL。
5. **一次只在一个渠道首发**。掘金发出去之后再同步其他渠道，同一时间群发会被平台判为营销号行为；跨平台同步时在正文首行写「本文首发于 XXX」。
6. **截图只用 `docs/assets/` 里脚本生成的那些**。UI 有改动时先 `pnpm build && pnpm assets:capture` 重取，再发贴——商店截图和实际界面漂移是最容易掉信任的细节。
7. 帖子发出后 24 小时内回来核对一次：链接是否可访问、有没有事实被读者指出错误。指出的错误如果成立，改代码或改文案，并在原帖更正，不要静默删评论式地编辑掉。
