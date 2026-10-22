# 让它对外可见 · 命令包与核对清单

> 这份清单只负责一件事：**这一轮的对外内容改动已经写完并本地验证过，剩下「收下、发布、让人看到」的动作**。
> 所有写操作（commit / push / 商店 / 社区发帖 / 搜索后台）由仓库所有者执行或在场确认——本文只给命令和核对点。
> 放在 `.github/` 而不是 `docs/`：`docs/` 是 GitHub Pages 的站点源，`static.yml` 会把除 `promo/` 外的全部内容发到公网，
> 而这份文档讲的是「怎么让别人看到」，它本身不该成为一个公开页面。相关分工见 [`AGENTS.md`](../AGENTS.md) 的「对外文档层」。

## 1. 这一轮改了什么，线上现在是什么状态

本机实测（2026-09-22，改动尚未推送）：`https://liaolongdong.github.io/transfer-any-file/` 与 `/privacy.html`、
`/sitemap.xml` 都是 200，而 **`/convert/` 与 `/blog/` 是 404**——新页面还没上线的唯一原因就是提交没到 `main`（见第 4 节）。

| 对外面                                      | 本轮动作                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `docs/convert/`（1 索引 + 10 张配对落地页） | **新增**。全部由数据源生成：文案只改 `scripts/conversion-pages/pairs.mjs`  |
| `docs/blog/index.html`                      | **新增**。把原本躺在 `docs/promo/blog-article.en.md` 的草稿变成真实发布页  |
| `docs/index.html`                           | 3 条长尾 FAQ + 对应 JSON-LD `Question`、配对页入口区块、导航与 footer 内链 |
| `docs/sitemap.xml`                          | 由生成器重写，现在 **14 条 URL**                                           |
| `docs/llms.txt`                             | 新增「Route-by-route detail」12 条链接，逐条按已验证事实改写               |
| `README.md` / `README.en.md`                | 顶部导航各加两个入口，正文加「逐条链路的取舍，各写成一页。」一节           |
| `docs/promo/community-posts.md` / `.en.md`  | **新增**，中文与英文渠道稿（含发帖纪律）                                   |
| `CHANGELOG.md` / `CHANGELOG.en.md`          | 「未发布」段各加一条，中英成对                                             |
| `.github/workflows/ci.yml`                  | lint job 新增 `Verify generated site pages`（跑 `pnpm pages:check`）       |
| `.prettierignore`                           | 排除生成物 `docs/convert/` 与 `docs/sitemap.xml`，守卫换成字节比对         |

产品页 FAQ 现在可见条目与结构化数据是 **22 问 × 2 语言 = 44 条 `Question`**，1:1 对应，脚本核对过无差集。

**2026-10-02 复核**（上面那格 404 是 09-22 那一轮的档案，不是今天的现网）：`/convert/`、`/convert/index.html`、
`/blog/`、`/llms.txt` 都已 200，`/security.txt` 仍 404——它和这轮新加的 14 张配对页一样还没进 `main`。

## 2. 验证：本机已经全部跑过

下表是 2026-09-26 这一轮（存量代码深度评审 + 安全评审）收口时的实测；上面第 1 节那份清单属于同一分支上
更早的站点生成层那一轮，记录照旧成立，只是数字要以这里为准。

| 命令                                                         | 结论                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint:all`                                              | 通过（typecheck / eslint / stylelint / format:check 四道；本轮 4 个文件经 `prettier --write` 校正后转绿，改动只是换行与强调号写法）。收口时又跑一遍，仍四道全绿                                      |
| `pnpm verify:meta`                                           | 通过，英文简介 127/132                                                                                                                                                                               |
| `pnpm verify:listing`                                        | 通过，7 个粘贴字段在限内且与各事实源一致                                                                                                                                                             |
| `pnpm verify:paths`                                          | 通过，48 条边 / 182 对                                                                                                                                                                               |
| `pnpm pages:check`                                           | 通过，12 个文件等于数据源渲染结果（改过 `STATIC_PAGES` 的 `lastmod` 之后重渲染，仍等于提交字节）。同一轮新加的 `validateStaticDates()` 第一次运行就把 `docs/privacy.html` 页脚那两行落后的日期报了红 |
| `pnpm verify:numbers`                                        | 通过，23 项事实比对 **31 份**对外散文（`docs/privacy.html` 本轮起入列；这份清单也在其中，它引用的数字同样会老化）                                                                                    |
| `pnpm verify:offline:source` / `pnpm verify:offline`         | 两层都通过，扫描 **87** 个第一方文件（本轮把 `.js` / `.mjs` 与入口 HTML 纳入，目录缺失改为直接失败）；产物 manifest 权限恰为 `["storage"]`，无 host / optional                                       |
| `pnpm verify:remote-code:source` / `pnpm verify:remote-code` | 两层都通过，产物 **46** 个文件；本轮给这条守卫补了两条形状——拼出来的远程 `import()` 与远程 `Worker`                                                                                                  |
| `pnpm build`                                                 | 通过，5.4 s，整包 **3,784,824 B**（68 个文件，`Σ` 打印 3.78 MB；首屏 JS 440,057 B / 21 个 chunk）；`.output/chrome-mv3` 内**没有** `docs/`、`CHROMEWEBSTORE.md` 等文档产物                           |
| `pnpm test:e2e`                                              | 通过，**317/317**（100%），约 10 分钟（21:27:07 首张截图 → 21:37:11 末张），87 张截图落 `.test-screenshots/`                                                                                         |

**这一轮把 e2e 跑满了**，因为改动落在运行时与净化链上（子资源剥离、五个转换器、`utils/core` 新增一个模块），
不是只动文档。断言总数 317 一格没增也没减：两处新夹具向量跑在已有的那条「零子资源请求」哨兵断言里面，
后半程那条 `HTML→TXT` 的有序列表编号检查也折进已有的一条断言，而不是新开一条。
以后再补跑的成本（本机需要手动装过 ffmpeg 与 chromium 二进制）：

```bash
pnpm test:e2e        # = wxt build + node scripts/e2e-test.mjs，断言基线 452 条
```

**2026-09-29 这一轮（JSON 预览的树 / 数组表 / 搜索 + 仓库外的对比页）跑满了 e2e，改在 `E2E_HEADLESS=true` 下跑**：
321/321 通过，87 张截图照旧落 `.test-screenshots/`。断言总数从 317 涨到 321 全在「JSON Result Preview」那一节——
原先只有一条「能打开预览」，现在多了树行数、搜索高亮与计数器、数组表投影、两个面板互斥、原文视图保真。
上面那张表是 09-26 的实测，记录照旧成立，只是**基线数字以这里为准**。

同一轮另有两个非交互事实：整包 **3,823,982 B / 65 个文件**，首屏 JS **442,958 B / 19 个 chunk**
（新增的两个 JSON 组件与 `utils/core/json-view.ts` 全在 PreviewDialog 的懒加载 chunk 里，首屏那 19 个 chunk
只多了 34 条 i18n 文案）；两道离线守卫的口径同步扩到 `tools/`——源码层扫 **94** 个第一方文件，
产物层 **44** 个文件。本机还有一个环境坑值得记着：**有头**模式下从第二张 `fullPage` 截图开始会 30 s 超时，
连带把后面的小节拖成「option not available」假红；同一个页面在无头模式与最小单标签探针里都是 150 ms 级。
判红之前先用无头复跑确认，别急着改产品代码。

同一轮还有一支**不进契约**的真 Chrome 探针（`.test-tmp/verify-json-ui.mjs`，gitignore 内）：交互半段 20 项，
对比度半段 6 主题 × 深浅 = 12 组 × 27 个面。它抓到一个会被下一次「顺手改回 `ref`」复活的缺陷：
`PreviewDialog` 用 `ref` 存 JSON 模型，Vue 的深响应把那 2.6 万个节点逐个包成代理，`buildJsonTable` 里
`byColumn.get(col)?.find(id => tree.nodes[id].parentId === rowId)` 这种内层读全都走代理链——有头实测
**384 KiB 的 JSON 点开预览要冻 21 s 才画出第一行**（Playwright 的 `evaluate` 也被堵在同一段里）。机制单独取证：
同一份夹具在 Node 侧跑五个模型入口（`node --experimental-strip-types .test-tmp/probe-reactivity.mjs`，
26 136 个节点，裸对象 vs 同一对象过 `reactive()`），`buildJsonTable` 72.8 ms → 17 681 ms（**243×**），
`defaultExpanded` 4.0 → 47.9 ms，`visibleRows` 3.7 → 38.9 ms，`searchJson` 4.9 → 19.6 ms，五者合计
**123 ms 对 18 774 ms** ——和浏览器里那 21 s 是同一件事。换成 `shallowRef` 之后同一份夹具实测
upload→按钮 757 ms、**点击预览→首行画出 477 ms**，展开全部 859 ms 画满 5 000 行、重置展开 83 ms；
模型语义一点没动，因为 `inspectJson` 返回之后本来就没有人改它。这条写进 `PreviewDialog.vue` 的注释里，
别只留在这里。对比度半段顺带把 `tokens.css` 那段纸面算式变成了页面实测：12 组 × 27 个面全部清过各自声明的
底线，五种色墨亮色最差 4.95:1（rose 激活行的 `null`）、暗色最差 7.37:1，落到 4.5:1 以下的只有悬停才出现的两个
图标面（3.25 与 3.56:1，它们欠的是 WCAG 1.4.11 的 3:1），另外两处占位灰语义文本与一处下划线色因此改成了
`--fat-text-secondary` 与 `--fat-focus-ring`。

**包这一层本轮没有动**（未跑 `pnpm package`）：`.output/transfer-any-file-1.0.0-chrome.zip` 仍是
2026-09-23 00:39 那一次构建的产物，1,146,773 B，sha256 `db83fe65…12f05`。而被当成「只改了一个变量」样本
记下来的那一份是 `dd8688b2…c0b0b3` / 1,146,878 B——它既不在这个路径上，`/tmp` 里的备份也不在了。换掉它的
是谁、哪一次操作，仓库里查不到。**这条核对动作现在仍然要做**，只是理由变了：条目已上线（2026-10-02 实测详情区版本
1.0.0、上次更新 2026-09-30），所以下一次提交要防的不再是「换掉待裁决的样本」，而是「不知道商店上挂的是哪个包」
（第 8 节那条「不许重打包」的禁令是为那个样本设的，随裁决生效已解除）。

**2026-09-30 这一轮（带图片引用的 Markdown / HTML 转 PDF 报错）也在 `E2E_HEADLESS=true` 下跑满**：
325/325 通过，87 张截图照旧落 `.test-screenshots/`。新增的 4 条全部落在同一个新小节
「Markdown With Unresolvable Images Still Renders」——PDF 产物存在、结果卡出现「虚线方框」那条披露、
零子资源请求哨兵在夹具同时带远程 / 协议相对 / 相对路径三类不可解析引用时仍然为空、以及一条 data URI
静默对照（同一份文档把图片换成内联的，就**不该**再出现那条披露）。这一轮把基线抬到 **325**，现值见下一段；
上面几段里的是各轮当时的记录。
同一轮整包字节 **3,823,982 → 3,825,780 B**（+1,798 B，仍 65 个文件，`Σ` 打印 3.83 MB）；首屏 JS 本轮未重测。
有头模式再次从第二张 `fullPage` 截图起 30 s 超时，并把后面的小节连带拖成「option not available」假红——
与上一轮记的是同一个环境坑，判红之前先无头复跑，别急着改产品代码。

**2026-09-30 21:51 这一轮（预览整篇复制 + 偏好面板加宽自滚）也在 `E2E_HEADLESS=true` 下跑满，基线数字以这一段为准**：
**327/327 通过**，87 张截图，无小节跳过。这一段是当天唯一一条零失败记录——白天三轮全量都在负载形态上假红
（315/326、317/329，另有 `E2E_ONLY` 子集一次超时），而那两个分母本身是分支量（抛错位置决定还剩几条没跑），
所以 325 一直守到这一轮才动。**基线 → 327**，十句对外引用同批换数（`docs/index.html` 两句、`docs/blog/index.html`
两句、四份推广稿四句、本清单第 52 行那句「断言基线 N 条」——最后这句不在 `verify:numbers` 的句式射程内，
守卫管不到它，只能手工带上）。新增的 2 条：预览页头那枚整篇复制按钮（桩掉 `navigator.clipboard.writeText`，
断言写进去的字节 == 面板里的全文，外加那条成功提示），以及 500 px 高的视口下偏好面板自己滚而不把最后一项
顶出屏幕（量到面板底边 483 ≤ 500）。同轮还改了量具本身（采样前仿真 `prefers-reduced-motion`、`contrast()`
认得 `oklab()` / `color(srgb …)`）——这一轮是它第一次随全绿通过，但**别把它读成因果**：机器同时从 load 300+
掉到 8.35（21:29 重启），量具改动与这轮绿之间的因果还证不了。
产物是 10:03 那一次构建（65 个文件、**3,826,224 B**，`Σ` 打印 3.83 MB；比上一段多 444 B，本轮之间进源码的是
复制按钮与面板加宽，未逐项归因），本轮没有重新构建，所以上面那些断言吃的就是这份产物。
同一轮还修了 `AGENTS.md` 与 `.qoder/rules/wxt-rules.md` 里那句**现状描述**：它们写着守卫比对「31 份对外散文
（含 `docs/convert/` 的 11 个生成页）」，而今天它打印的是 `23 facts … matched across 42 documents`
（20 份手写 + 22 个生成页，配对页从 11 张扩到 21 张那一批起就没人跟着改这两句——它不在这 23 个事实的射程内）。
**上面表格里那格「31 份」照旧不动**，它是 09-26 那轮的实测记录；两处的区别就在这儿：一个是现状主张，一个是档案。

**2026-09-30 23:19–23:28 这一轮（结果卡按张数披露 + 面板末项可见）也在 `E2E_HEADLESS=true` 下跑满**：
**327/327 通过**，87 张截图，无小节跳过。这一轮换的是**判据**而不是条数——占位那条从「出现『虚线方框』字样」
改成「数得出 3 处、且同时说出『留空』与『虚线方框』两种形状」，它的静默对照组（图片已内嵌为 data URI 的同一份
文档）随之从「不出现方框字样」改成「不出现『处位置』这半句」；偏好面板那条从「popover 底边在视口内」改成
「面板确实可滚、真的滚到底、末项底边落在视口内」（500 px 视口实测末项 470 ≤ 500、popover 483）。三处都是
1:1 替换，所以**断言总数一格没动**，`scripts/__baseline__/e2e-assertions.json` 也保持 327（脚本只在数值变化时
才重写，所以它的 mtime 不会跟着每一轮绿跑走）。契约变更只在增删断言时发生：上一条记的 325 → 327 才是需要把
十句对外引用同批改数的那种轮次。

同一轮把「丢了几张」这条链路打通了：`utils/core/html-raster.ts` 数出来的是**真数**（渲染前被替换的引用数
加上克隆时才失败的数目），`ConvertResult.imagesDropped` 因此从布尔改成数字，`composables/useConversion.ts`
逐文件累加，`ResultDownload.vue` 对整批求和后经 i18n 的 `{count}` 插值渲染——中英文案两处 key 集仍然一致。
措辞同时覆盖两种形状，因为事实就是两种：渲染前替换掉的会在原位置留一个描边方框，只在克隆时失败的
（浏览器解不开的 `data:`、已经 revoke 的 `blob:`）在那里什么都不留。落到的对外同族清单：`AGENTS.md` 的
转换语义边界、两份 README、`scripts/conversion-pages/pairs.mjs` 的六条字符串（再 `pnpm pages:render`，
`html-to-pdf` 与 `markdown-to-pdf` 两张生成页随之更新）、`docs/index.html` 的同一条 FAQ 四处（zh JSON-LD、
en JS 数组、可见 zh、可见 en）、`.github/CHROMEWEBSTORE.md` 的中英两块加速查表，以及两份上架手册。

商店详描的实测字符数这轮换完措辞是**英文 8,902 / 中文 3,142**（上一段的 8,853 / 3,125 是它那一轮的档案，
不动）。这里留一条取证纪律：中文那一度被写成 3,145，**是抄了一段被污染的 `verify:listing` 回显**，
`pnpm verify:numbers` 立刻在四处报不符——数字要读守卫自己打印的那一行，别读终端回声。
本轮重新构建过：65 个文件、**3,826,293 B**（比上一段 +69 B，`Σ` 打印 3.83 MB；增的是 i18n 两句与结果卡那枚
计数），首屏 JS 本轮未重测。跑过的门禁：`lint:all`、`verify:meta`、两道离线守卫（源码层 + 产物层）、
两道远程代码守卫、`verify:paths`、`verify:numbers`、`verify:listing`、`pages:check`，随后 `build` 与全量 e2e。

**紧接着的素材重拍轮（同一晚，`14767fb`）也重新构建了：65 个文件、3,826,293 B——与上一段逐字节相同，
因为这一轮一行源码都没改，改的只是 `docs/assets/` 下的图。** 上一段挂着的那句「首屏 JS 本轮未重测」
在这里补上，档案本身不动：**444,660 B / 19 个 chunk**（口径仍是解析 `options.html` 的 `.js` 引用后逐个
`stat`，与 09-29 那轮的 442,958 B / 19 个可比；chunk 数没变，多的 1,702 B 是 i18n 与结果卡计数落进首屏块）。

重拍了 24 张：`docs/assets/screenshots/` 七张原始界面图、`docs/assets/store/screens/` 十四张带卖点文案的
商店图（七状态 × 中英）、`docs/assets/store/` 三张推广图。脚本服务的是 `.output/chrome-mv3` 本体，
并在日志里把页脚读数打出来自证渲染到的是当前数据，所以「素材与实际界面同源」这句话这次是有据的。
像素逐张与 `HEAD` 比对：`preview-edit` 变 0.44%（集中在弹窗页头那条 12 px 高的文字带，即新增的整篇复制
按钮），`batch-results` 变 10.05%（结果卡那 166 px 的带，即按张数披露）。**归因要写清**：这批图上一版
停在 2026-09-18，中间跨了并发会话的名称模板、JSON 三视图与偏好项，所以这次是「素材追平实际界面」，
不是「本轮改动的配图」。

同一次构建顺手清掉一笔体积欠账：`Σ` 早已跨过取整边界（3,825,780 B 起就是 3.83），而对外散文还写着
旧值——`verify:numbers` **不守体积**，这类漂移没有机器兜底。回填 16 处，载体是
`docs/index.html`（指标卡、中英取证句、取证注释、两处 JS 注释里的字样，共 6 处，3.82→3.83）、
`docs/llms.txt`、两份 `CONTRIBUTING*`、`docs/blog/index.html` 中英、两份 `docs/promo/community-posts*`
共 3 处、`docs/promo/wechat-article.md` 与 `blog-article.en.md` 各一处（3.78→3.83）；
gitignore 的 `docs/promo/wechat-article.html` 跑 `pnpm promo:wechat` 跟上。
**按档案留下的**：两份 CHANGELOG 的每一条「仍是 3.7x MB」、`.github/CHROMEWEBSTORE.md` 版本历史里的
3.76 / 3.74、以及本文件表格里 3,784,824 B 那一格——那些是那一天的实测，回填等于造假记录。
`docs/index.html` 里还有第七个 `3.82`，它是 GitHub octicon 路径上恰好相邻的数字，不是体积，别一起换。

一处**明知未动**的：产品页的「本页最后更新 2026-09-29」四处与 `docs/sitemap.xml` 的 `lastmod` 由
`scripts/render-site-pages.mjs` 的 `STATIC_PAGES.updated` 成组守着（`pages:check` 比对页内日期主张与
sitemap），本轮只回填了体积数字、没有推进那组日期，所以「最后更新」指的仍是上一轮的页面文本。
要推进就是改 `STATIC_PAGES.updated` + 四处页内日期再跑 `pages:render`，不是手改 `docs/sitemap.xml`。

这一轮的十道门禁全 `exit 0`：`lint:all`、`verify:meta`、两道离线守卫、两道远程代码守卫（产物层在这轮
构建之后重跑过）、`verify:paths`、`verify:numbers`、`verify:listing`、`pages:check`。没有跑 e2e——本轮
没有源码改动，而 `pnpm test:e2e` 自带一次 build，会把刚验证过的产物换掉。

**10-02 这一轮（配对页 21 → 35 + 扩展层提货）重新构建过**：65 个文件、**3,827,393 B**（比上面那格的
3,826,293 B 多 1,100 B，`Σ` 仍打印 3.83 MB，所以那 16 处对外体积字样一处都不用动——增的是
`utils/core/row-key.ts` 这个新模块、批次汇总那一行与历史行的体积列）。首屏 JS 本轮未重测。

素材按纪律同批重拍（`pnpm build && pnpm assets:capture`）：**12 张变了**——`screenshots/` 的
`batch-results`（汇总那一行）、`history`（结果体积那一列）、`preview-edit`（弹窗背后那张卡多了一行，
整页截图随之位移），以及把这几张嵌进去的 6 张商店卖点图与 3 张推广图。`workbench-empty` / `batch-files` /
`output-preset` 一张没变，这本身就是改动面的证据：只落在结果卡、历史行与预览弹窗三处。
**是在真实构建产物里看过的**：`batch-results.png` 上那行读作 `Combined size: 16.9 KB → 8.9 KB`，
与三行结果各自的 2.8 / 3.0 / 3.2 KB、三个源文件各自的 151 B / 47 B / 16.7 KB 对得上。

这一轮跑过的门禁：`lint:all`（typecheck + eslint + stylelint + format:check）、`verify:meta`、
`verify:listing`、`verify:numbers`（23 事实 × 56 份散文）、`verify:paths`、`pages:check`（37 文件）、
两道离线守卫与两道远程代码守卫（源码层 95 文件、产物层扫 44 文件；产物里唯一的 HTML 是它自己的
`options.html`，`docs/` 与 `.github/` 没进包）、`build`、全量 e2e **327 / 327**。

守卫**有牙**这件事这轮也量过一次：把新加的 14 条 `published` 分别改成 `2027-01-01` 与 `2026/10/02`，
`pages:render` 都以 `exit=1` 拒绝写盘，`docs/convert` 与 `docs/sitemap.xml` 一个字节没动；从备份还原后
`diff` 为空、重渲染与还原前的产物逐字节相同。

**2026-10-02 这一轮（任务列表保真 / PDF 书签进标题层 / 批次步进度与耗时）也在 `E2E_HEADLESS=true` 下跑满**：
331/331 通过，约 11 分钟（21:05:48 首张截图 → 21:16:57 末张），87 张截图照旧落 `.test-screenshots/`。
断言总数从 327 涨到 331，四条全部落在本批的三个功能上：`Task list round-trip` 一条（`- [x]` 的两态与嵌套
一起过 `md→html→md` 回环）、`PDF outline headings` 两条（书签按 outline 深度落成 `hN`；另一条钉**没有**书签
的文档一条标题都不许多出来）、`Multi-step Conversion Path Hints` 里一条（单文件两跳链：条出现、百分比动过、
结果卡报耗时、历史行同数——同一句主张的四个读数折成一条，否则套件总数就跟着这一段读了几个子串走）。
这个数是那一跑自己写进 `scripts/__baseline__/e2e-assertions.json` 的，不是 `327 + 4` 算出来的：红运行报出的
分母是分支量而不是源里的条数，只有零失败、零跳过的整轮才有资格记档。散文里跟着它变的是**十句 / 七份**——
`docs/index.html` 与 `docs/blog/index.html` 中英各两处（那两句带着「实测」日期，同批从 09-30 改成 10-02）、
`docs/promo/` 四份共五处，外加这份清单第 55 行那条 bash 注释：它不在 `verify:numbers` 的匹配模式内，
只能手工带过去。`CHANGELOG.md:753` 与 `CHANGELOG.en.md:1098` 的 `327/327` 是 09-30 那一轮的记录，不动。

顺带记两处几何，和一次被实测推翻的预期：

- **窄窗口里历史行的按钮点不到**，是量 720 px 时撞上的，不在原计划里。折叠卡片的 `.collapsible-body`
  只有 `min-height: 0`、没有 `min-width: 0`，而 grid 项的自动最小尺寸取 min-content，于是那条
  `white-space: nowrap` 的长文件名把整张卡片撑得比列宽还宽，卡片自己的 `overflow-x: hidden` 把同一行上的
  删除按钮裁进了裁剪区。720 px 下删除键的落点失效，640 px 下删除与「复用此格式」两个都失效；补上
  `min-width: 0` 之后 body 宽度 731 → 686，文件名那一格多让出 45 px，900 px 与 1280 px 逐像素相同。
- 单文件批次把进度条的文本标签关掉，计划里预计「卡片高度变化 ≤ 2 px」，实测 **8.41 px**（`.el-progress`
  从 14.41 px 变 6 px，那 6 px 就是描边本身）。它不是批次中途会跳的那种变化——`totalCount` 在进循环之前
  就是定值——所以设计照原样成立，但那条预期是错的，写在这里免得下次照抄。

产物 **3,829,991 B / 65 个文件**（`Σ` 仍打印 3.83 MB，对外那 16 处体积字样一处不动）。素材按纪律同批重拍：
12 张变了、12 张没变，变的名单与中英读数见提交 `a7d75cb`。这一轮跑过的门禁：`lint:all`、`verify:meta`、
`verify:paths`（48 条边 / 182 对，本批 0 个新转换器）、`pages:check`（37 文件）、`verify:numbers`
（23 项事实 × 56 份散文）、`verify:listing`、两道离线守卫与两道远程代码守卫（源码层 95 文件、产物层扫
44 文件；产物里唯一的 HTML 仍是它自己的 `options.html`）、`build`，以及上面那轮全量 e2e。

**同一天收口之后又落了两笔**（`255a909` 代码与散文、`0faba3b` 素材）：`formatDuration` 补了一档下限，
不足 100 毫秒的批次报「耗时 < 0.1 s」而不是 `0.0 s`——素材里那两行 `sample.csv · 15.9 KB · 0.0 s`
与 `sample.md · 2.8 KB · 0.0 s` 就是它要防的形状：`0.0 s` 在屏幕上与「这一格没读数」长得一样。
历史行那格的显隐同时从真值改成判在场（`!== undefined`），否则测到 0 ms 的批次会变成结果卡有数、
历史行空白。**断言总数一格没动，仍是 331**：套件对这一格的判据是「最新一行有数字」与「结果卡有耗时行」，
`< 0.1 s` 两句都满足，所以这条改动不可能改到那份对外契约——重跑（21:53:21 → 22:03:58，约 10.6 分钟，
87 张截图，零失败零跳过）只是确认它确实没改到。素材按同一批纪律又拍了一遍，12 变 / 12 没变的分法与
上一轮相同，真正因这条读数而变的只有历史那三张，其余九张是墙钟时间戳跟着走。产物 **3,830,033 B /
65 个文件**（比上一批 +42 B，`Σ` 仍打印 3.83 MB，对外那 16 处体积字样照旧不动）。

**2026-10-03 的四路评审没有推翻这一轮，但找出了五处真错**（标准 / 规格 / 安全 / 回归-体验-性能四路，
对象是那 21 笔；每条评审结论都回到代码或实测再核一遍，其中两条主张复核后不成立、没有采纳）。落地的
修复分三层：

- **扩展源码三处。** `useConversion` 的步数预解从「循环起手之后」提到 `isConverting` 置真之前——中间那次
  唯一的 `await currentTemplate()`（冷加载时它的 `initPromise` 还没落地）会让浏览器绘出的那一帧带着转换中
  状态却没有分母，按钮读成 `(0/0)`，一个什么批次都不描述的读数；`HistoryPanel` 耗时那格从判真值改成判
  `durationText()` 非空，于是批次中途墙钟回拨测出的负读数不再留下一个「结果卡有数、历史行空白」的空格；
  `pdf-to-html` 的 `takeBookmark` 在文档没有书签时立刻返回 0，省掉逐行两次正则加一次码点切分——绝大多数
  PDF 没有 outline，而输出与改前逐字相同。
- **重建工具从四条守恒加到五条**（判据与被变异过的事实都写在第 4.2 节）。断言 5 比的是「工作树的条目数 ≥
  重建结果的条目数」：前四条只在两份 ref 之间做守恒，而合并现场手写的条目既不在 `MERGE_HEAD` 也不在
  `ORIG_HEAD`，照原样落盘会连人写的内容一起抹掉，而输出读起来完全正常。同批还修掉搬运本身的空隙泄漏
  （一条已提升的条目夹在本轮条目中间时，旧写法把那段空隙连条目一起抄回未发布区：内容重复、总数守恒，
  前四条一条都不红）与 `## [未发布]` 空 body 时多插的那个空行（重建结果会被 `format:check` 判红），
  并让 `gitShow` 拒绝以 `-` 开头的 ref 参数。
- **文档里三处假话。** `CHANGELOG*` 那句「产物逐字节不变」站不住：`pdf→html` 的 `<head>` 现在把
  `h1…h6` 全列出来，而那张样式表是无条件写下的，所以那一侧字节会变；`pdf→md` 仍然逐字节相同，因为
  `html→md` 只读 `<body>`。配对页数据源里 `pdf→docx` 的英文卖点还停在「书签进标题层」之前的口径，
  改数据源重渲染后只有那一张页动了一行。`.github/CHROMEWEBSTORE.md` 有一处「下方某节」指向一个不存在
  的小节名，换成 `[上架后的运营](#上架后的运营)`，并补上 10-02 那次回填缺的变更记录（没有任何粘贴字段的
  字节与字符数被改动）。
- **真实 PDF 的书签命中率量出来了：63 条里落位 7 条，两份真实文档一条都不落。** 规格 §7 要求「拿一份真实带目录的
  PDF 手动跑一次，把命中率写进这条记录的注释里」，这一格现在补完了。搜索面两轮的口径不同，分别记：上一轮
  `find ~ -maxdepth 6 -name '*.pdf'` 扫到 87 份，24 份字节里出现 `/Outlines`，按文件名去重 18 份，其中 14 份的
  `/Outlines` 指向空字典 `<<>>`（Word 系导出常见：容器总写，条目一条没有）；本轮换成跳过隐藏目录与 `node_modules`
  与 `fixtures/` 的遍历（同一台机器，最深 6 层），91 份里 5 份被 `getOutline()` 读出真条目，书签数分别 42 / 12 / 12 /
  9 / 9，按「字节数 + 书签数」去重是 3 份独立文档、共 63 条。这两轮合起来说明的就是「别拿 `/Outlines` 存在当有书签」。
  **量法**：一次性探针落在 `.test-tmp/`（`.gitignore`、`eslint.config.mjs` 的全局 ignore、`.prettierignore` 三处都覆盖它），
  headless Chrome 加载**真实构建产物**的 options 页，把文件按 `{name, mimeType, buffer}` 直接喂给工作台的 `input[type=file]`
  （所以真实文档一个字节都不必进 `fixtures/`，隐私边界不破），走 `pdf→html`，从结果 iframe 的 `srcdoc` 里数 `<hN>`；
  判据用的 `outlineKey` 是从 `utils/converters/pdf-to-html.ts` 源码里整段取出来跑的，不是重写的一份，`MAX_KEY_CHARS`
  也从同一处读。**已知答案对照先过**：`fixtures/sample-outline.pdf` 在这套量具下读出「4 条书签 / 落位 3 / 未落 1」，
  与 e2e 那条断言的三落一空形状相符，量具才算可信。三份真实文档的落位是 **7 / 63**：一份 9 条里 7 条落位（剩 2 条的标题在提取
  出来的正文里根本不存在）；一份 42 条（全部深度层 0，本应全是 `<h1>`）零落位，其中 12 条的标题确实出现在正文文本里
  （「出现在正文里」用的是去掉标签后整篇的小写子串判据，比落位的整行判据宽，只会上界不会低估），但没有一条与整行相等；
  另一份 12 条零落位，且 0 条标题出现在正文里。零落位的那两份仍分别拿到了 45 个和 2 个 `<h2>`，
  那来自全大写几何启发式，书签这条路径没碰过它——这正是设计里那条退路的样子。**顺手证伪了一条看起来很像缺陷的线索**：
  产物里既没有 `cmaps/` 也没有 `standard_fonts/`（`pdf-to-html.ts` 也只设了 `workerSrc`），页面 console 在第三份文档上确实
  报了 3 次 `cMapUrl` 与 3 次字体缺失，但三份文档各自的「产物提取 / node 裸跑 pdf.js / node 补上这两套资源」三列
  中日韩字符数逐份相等（7565 / 9 / 651，每份的三列都同值；对照组夹具是 0 / 0 / 0），一条字符都没丢，所以命中率低跟这套资源缺失无关。样本只有三份文档、
  来自一台机器的少数几个导出器，它不构成任何「生产者 X 的 PDF 命中率是 Y」的总体估计。**对外文案的写法照旧是对的，而且
  现在有了实测背书**：只写判据与退路，从没写命中率——`scripts/conversion-pages/pairs.mjs` 里 pdf→html 那条写明「整行相等」
  这个前提，pdf→docx 那条写「与 PDF → HTML 同一套判断」，`CHANGELOG*` 的措辞同此。要把这 7 / 63 提上去，路子是行首编号归一
  （`1. 引言` 认作 `引言`）、前缀匹配、或「标题出现在行内即点亮」三条之一，**它们都会新增今天不会产生的标题**，与规格
  「宁可漏也不造」的定案相反，属改输出语义，未动，需要所有者点头才做。探针是一次性的，跑完即删（它的读数只在这几句里）。
  **紧接着的那一轮把这三条逐条量了：都不抬，读数见下一条。**
- **三条抬升路量完了：都不抬；`utils/converters/pdf-to-html.ts` 一个字节没动。** 上一轮那句「它们都会新增今天不会产生的
  标题」是推断，读数说它两头都不准：**按能保住今天这些落位的方式放宽，三条一条新标题都不产生**（不点亮，自然不产生）；
  真会产生新标题的，是把下限压到 2 码点那种脆放宽，和一条当初没列进来的形状（行首项目符号），见下。
  **量具先自证**：`.test-tmp/make-extracted-key.mjs` 把 `outlineKey`、`MAX_KEY_CHARS`、`MAX_BOOKMARK_DEPTH` 从转换器源码
  整段切出（只去掉两处 TS 标注，切完断言五处关键片段仍在），`.test-tmp/outline-rules-measure.mjs` 用 node 端 pdf.js 复刻
  同一套行分组与书签遍历，四个输入的基线全部复现上一轮记的数——夹具 4 条落 3，三份真实文档 7 / 9、0 / 42、0 / 12
  （真实文档合计 **7 / 63**，连夹具是 10 / 67），连「12 条标题出现在正文里」那个较宽判据也在那份 42 条的文档上复现（12 / 42）。
  **13 条候选规则 × 4 个输入的读数**：① 行首编号归一——四个输入的 `titlesWithLeadNum` 全是 **0**，一条书签标题都不带行首
  编号，这条规则在这个语料上没有任何可观测收益，它唯一露脸的地方是风险：自测表里 `2020 年度报告` 会被削成 `年度报告`。
  ② 前缀匹配、③ 标题出现在行内——与整行相等**取并集**时，下限 6 码点和 10 码点两档的读数都是 **+0**（四处全零）；把它当
  「替换掉相等」来读就反向**掉**命中，夹具 3→2、那份 9 条的 7→2，因为短标题今天是靠整行相等落的。**下限压到 2 码点时这两条分开了**：
  ② 仍然是 **+0**（`[3,7,0,0]`，连夹具都没动），正读数只出自 ③ 这一条——**+7**，全部来自那份 42 条的文档，形状是标题 2 码点
  vs 整行 4 码点，而多出来那两个字符是行首符号加空格，所以「标题在行首」这个前提对它根本不成立：前缀判据在这份文档上一次都不点火，
  只有包含判据能判出来。`moved 0`，7 条新增没有一条落在全大写启发式本就会给的标题上，也没有一条达到 80（量的是整行 `trim()` 后的
  UTF-16 长度 `>= 80`，与转换器那条 `< 80` 同一个口径）或以句末标点收尾（`[.。;；,，]$`）——但这同时是最脆的一种放宽：那份文档里
  最短的一批标题（2 码点）在全文最多 8 行里都出现过，两个码点的子串在任何正文里都不算稀有。
  **从这 7 条的形状里长出第四条路**：挡在前面的装饰不是编号而是项目符号，所以「行首符号归一」（去掉 `- ` 这类前缀后
  **仍要求整行相等**）买到的是同样的 +7，三份真实文档合计 **7 / 63 → 14 / 63**，夹具一条不动。它被改写的行数占比是
  夹具 0 / 7、那份 9 条的 17 / 38、42 条的 51 / 964、12 条的 17 / 65。代价要说清：这是一条会**改写标题键**的新规则，
  而它的自测表记着自己不管的形状——符号与数字粘连时（`- ·1 引言` 里的 `·1`，符号后面没有空格可减）就只脱得掉最外层的
  `- `，剩下 `·1 引言` 原样留着。
  **连续行拼接**（上一轮没列的那条）也量了：两行 / 三行拼成一行后再要求整行相等，四个输入全 **+0**；换成「同页连续三行
  窗口内含标题即点亮」点亮的是同样 7 条，但承载它们的元素从 4 码点变成 22–42 码点的正文串（7 条里 6 条带点线或页码形状），
  那才是「新增今天不会产生的标题」真正对应的那种形状；而且窗口形式在夹具上反向掉一条落位（3→2），所以窗口只能当增量、
  不能当替换。**天花板不在匹配器上**：63 条里今天落位 7 条，另有 12 条的标题文本能在提取出的正文里找到（其中 7 条就在
  自己那一页），剩下 **44 条属于「整条标题的字符从没被提取出来过」**，那部分换任何判据都过不去。那份 42 条的 miss 分布是
  本页单行 7 / 他页单行 5 / 跨行 0 / 全文无 30——**跨行 0** 说明「把断行接起来」这条想象中的路在真实语料上抓不到东西；
  那份 12 条的是 12 / 12 全文无、且 `resolvedPage 0 / 12`。这条读数的口径要说清：量具只判「`dest[0]` 是不是带 `num`/`gen`
  的直接页引用、且 `getPageIndex()` 没抛」，所以它证的是**12 条里 0 条能解析出页码**，命名目标是最可能的形状但没有被单独证实
  （`dest` 为 `null` 也落在同一个 0 里）；何况第一重不可达（字符根本没被提取出来）已经把它判死了，页码只是第二重。
  **决定**：转换器不改，规格「宁可漏也不造」的定案不变，对外文案照旧只写判据与退路。若哪天要动，这轮数据指向的不是那三条
  而是「行首符号归一」——+7 / 63、判据仍是整行相等、零落位搬迁——但它仍属改输出语义，要所有者点头。
  **与上一轮相反的一处约定**：探针这轮**不删**，量具与日志留在 `.test-tmp/`（`make-extracted-key.mjs`、
  `outline-rules-measure.mjs`、`outline-scan.mjs` 与几份 `outline-*.log`），理由是 13 条规则 × 4 个输入的读数全在里面，
  删掉等于下一轮重造量具；那个目录被 `.gitignore`、`eslint.config.mjs` 的全局 ignore 与 `.prettierignore` 三处覆盖。
  **这些日志不是「只有结构性读数」**：`mask()` 会把每条标题与每行正文折空白后截前 16 个码点打出来，所以里面确有用户文档的片段
  ——它们只留在 `.test-tmp/`，一个字节都不进提交，写进本文的只有码点数、字符类与占比。
  **这一笔的验证**：只动本文，扩展源码一行没碰，所以跑的是一条十步链——`lint:all`、`verify:meta`、`verify:offline:source`、
  `verify:remote-code:source`、`verify:paths`、`pages:check`、`verify:numbers`、`verify:listing`，再加产物层那两道
  （`verify:offline`、`verify:remote-code`，对着上一笔构建出来的产物跑），全部 `exit 0`。**落盘之后在同一棵提交后的树上
  重跑了一次 `pnpm build`**（`exit 0`），产物仍是 **3,830,068 B / 65 个文件**、`Σ` 打印 3.83 MB，与图片压缩那一笔之后一模一样，
  65 个文件里 `docs`、`*.md`、`CHROMEWEBSTORE*` 命中 0——所以「文档改动不进产物」这句是这一格自己的实测，不是上一笔的延续。
  e2e 没重跑，依据就是这一格：字节没动，被断言的那些读数也就没动。

验证同上一段的口径：`lint:all`、`verify:meta`、`verify:paths`、`pages:check`、`verify:numbers`、
`verify:listing`、两道离线守卫与两道远程代码守卫（源码层与产物层都跑）、`build`，以及全量 e2e 在
`E2E_HEADLESS=true` 下重跑一轮——**331/331 零失败零跳过**（05:57:27 → 06:09:01，约 11.6 分钟，87 张截图），
`scripts/__baseline__/e2e-assertions.json` 一个字节没动，因为这一轮没有新增断言，三处源码修复都不落在
被断言的那几个读数上。素材**没有**重拍，理由是三条被拍的屏（`workbench-empty`、`batch-files`、`history`）
的像素都不依赖这些改动：预解提前只改转换进行中的第一帧，而素材与套件都不拍那一帧；历史那格只在「没有读数」
或负读数时才改显隐；书签早退不改输出。重拍只会让那九张跟着墙钟时间戳走。产物 **3,830,049 B / 65 个文件**
（比上一批 +16 B，正是那三处扩展源码；`Σ` 仍打印 3.83 MB，对外那 16 处体积字样照旧不动）。

- **那条从没跑起来的产物校验，现在跑起来了，而且它的牙是跑通之后才补上的。** `scripts/verify-extension.mjs`
  把 `.output/chrome-mv3` 当真扩展装进浏览器：它不在 CI 的任何 job 里（`ci.yml` 的 e2e job 跑
  `e2e-test.mjs`，走 HTTP、不装载），也不是 npm script，只在 `AGENTS.md` 命令表里作为「产物校验」存在，
  而这台机器上它一次都没跑起来过——`.qoder/specs/2026-09-23-opportunity-report.md` 记的就是这一条。
  值得说的是：**09-25 那一轮还在往里加断言**（`CHANGELOG.md` 未发布区那条「原先会安静地通过它声称要拦的事」），
  加进一份跑不起来的脚本，那些断言一次也没被执行过。2026-10-03 实测它需要的只是一个吃
  `--load-extension` 的浏览器：品牌 Chrome 有头与无头两档都回 `ERR_BLOCKED_BY_CLIENT`，Playwright 自带
  Chromium 在这台 mac13 上装不上（`Playwright does not support chromium on mac13`），两条都是这一轮亲测；
  用新加的 `VERIFY_EXT_CHROME` 指一个 Chrome for Testing 153 就能跑。首跑 **exit 0**，读数是：worker 从
  `chrome-extension://…/background.js` 出现、`__MSG_extensionName__` 解析成中文名、`extensionDescription`
  66 字符、首屏零重 chunk、两次转换各自懒加载（`marked` + `purify` 一对，`pdf-` chunk + `pdf.worker` 一对）、
  整轮零条出网请求、扩展页零 console 报错。**绿不等于守得住**：那一次的 ID 是从装载路径算出来的，脚本
  从没看过 worker 一眼，而产物缺 `_locales/` 时它的失败形状是一条 15 s 选择器超时。于是补三条断言加一道
  装载守卫，每一条都拿坏包验过会红（坏包放 `.test-tmp/mutants/`，用新加的 `VERIFY_EXT_PATH` 指过去，真实
  构建一个字节没动）：缺 `manifest.json` → 立刻退并说明先 `pnpm build`（原来是一条读起来像界面坏了的超时）；
  从 manifest 删掉 `background` → 红在「90 s 内没出现 MV3 service worker，`action.onClicked` 这唯一入口没被
  验证」那句；把 `extensionName` 的消息体写成字面量 `__MSG_extensionName__` → 红在「manifest name 与
  `chrome.i18n` 的那条解析出来还带着 `__MSG_`」，两格。**已知答案对照**是同一份产物换个路径的逐字节拷贝，
  它仍 exit 0。顺带量到一条形状：`_locales/` 整个没有、或被引用的那个 key 找不到时，Chrome 不报「装载失败」，
  而是**启动挂住**——两份坏包都是 180 s 超时加一个 stack trace，所以新加的 90 s 装载守卫做的事，就是把这种
  形状变成点名哪份包、为什么的红。反过来，「这一轮是不是测了机器上另一份拷贝」不需要一句 ID 比对来守：
  那份比对写过又删了，因为在 worker 缺席就直接退的版本里它恒真；认出错包的是解析出来的名字和 `.drop-zone`
  那个选择器。这一轮改的是 `scripts/**` 与四份文档，扩展源码一行没碰，收口时重建产物仍是
  **3,830,049 B / 65 个文件**（那是那一轮的读数；今天的读数在下面那格，因为 10-03 图片压缩这一笔动到了扩展源码），
  这就是不重跑 e2e 的依据。

- **打包下载里的图片改压缩了，代价与收益都按生产形状量过。** 开关只有一处：`utils/core/format.ts` 的
  `ZIP_COMPRESSIBLE_EXT` 多了 `png` / `jpg` / `webp`，`downloadAllZip` 于是把这三类条目交给 `ZipDeflate({ level: 6 })`
  而不是 `ZipPassThrough`。测量用同一个形状（fflate `Zip` 逐条目、level 6 对比 stored 归档），样本是 09:23 那轮
  e2e 之前用**扩展自己的编码器**（真装载产物里的 `canvas.toBlob`）出的图，机器空载：一页 1200×1800 的纯色文档
  （白底、蓝标题、46 条文字横线）PNG 条目 205,146 → 102,846 B（**−49.9%**）、JPEG 127,134 → 11,379 B
  （**−91.1%**）、WebP 8,340 → 4,167 B（**−50.0%**）；100 页那种 PNG 从 5,127,922 → 2,570,422 B（−49.9%，631 ms）；
  十四张真实商店截图 1,001,353 → 932,645 B（−6.9%，129 ms）。压不动的那一侧一并量了：2400×1600 渐变加逐像素
  噪点，PNG 10,620,869 → 10,622,340 B（**+0.014%**）、WebP +0.010%、JPEG 反而 −0.022%，10.62 MB 压完 1,356 ms
  （约 130 ms/MB）。node 的 `deflateSync` 逐条目给出 −49.91% / −91.72% / −50.83%，与归档口径一致；**level 9 的
  doc.jpg 是 −91.85%**，注释与散文一律取 level 6 那一档，因为产品用的是它——上一轮写下的 91.9% 就是这么来的，
  本轮改成 91.1%。多出来的 CPU 不吃界面：在装载起来的扩展页里，40 MB 条目压完时外部 ping 的最差一次往返
  **9 ms**（同一轮两个正对照：500 ms 忙等读到 534 ms、同步压 10 MB 读到 1,462 ms），所以时间落在「下载全部」
  已有的加载态里。`pdf` / `xlsx` / `docx` 没跟着进：仓库夹具量出 67–78% 的减量，但那是几 KB 的文本为主样本，
  不是带图的几十 MB 产物，没有实测就维持原判。e2e 新增一条 `Image entries of a PNG bundle are deflated`（方法位
  必须是 8），它的牙不是推的：同一批字节（两张 PNG + 一张 JPEG + 一张 WebP）按两种方法各打一份，读中央目录，
  deflated 那份四格全 `8`、stored 那份四格全 `0`——开关退回 stored 这条就红。同一次运行还把两份归档各解回来逐字节
  比对（四条目源字节 237,558，deflated 归档 66,936 B、stored 归档 238,014 B，解出的 sha256 与原文件全等），所以
  `CHANGELOG*` 那句「解回来的字节与改动前逐字相同」是量出来的，不是推的。全量一轮 **332/332 零失败**（有头，
  09:23:17 → 09:34:48，约 11.5 分钟，87 张截图），基线由那一轮自己写下 331 → 332，十句散文同批跟上；素材**没有**重拍，
  理由与被拍三屏的旧账同一条：ZIP 的条目方法不改那三屏的像素。产物 **3,830,068 B / 65 个文件**（+19 B，正是
  那张 `Set` 多出的三个扩展名字面量），`Σ` 仍打印 3.83 MB，对外那 16 处体积字样照旧不动。收口时把这 12 步在
  最终树上重跑一遍（全 `exit 0`），并把它构建的产物与 09:23 那轮 e2e 所跑的构建逐文件比哈希：65 格全等、字节和
  仍是 3,830,068——两次构建之间源码只差注释与文档，所以「e2e 与 `verify-extension` 测的就是最终这一份」是
  量出来的，不是靠「注释不进包」推出来的。

- **站点有了第一张能放入自己文件的页面，而它的源仍在两道守卫的射程内。** `tools/file-diff.html`（2,865 → 3,346 行，106,632 → 126,414 B）现在自带站点归属：canonical、OG 一组、`WebApplication` + `BreadcrumbList`、面包屑加安装 CTA 的 `<nav class="sitebar">`、页脚「最后更新」行，全部写绝对地址 `https://…/transfer-any-file/…`，所以 `file://`（仓库本地用）与 Pages（公网用）两种宿主下同一份字节都成立。`scripts/render-site-pages.mjs` 把它**逐字节复制**成 `docs/diff/index.html`（`cmp` 无差），并把这条副本注册进 `files`——注册点必须早于 `--check` 分支，否则守卫对这个文件失明（那个分支不枚举目录，实测本文件的 `readdirSync` 出现 0 次）。`STATIC_PAGES.diff.dateClaims` 读的是**源**而不是副本：两者字节相同，而指向副本会让一棵还没有 `docs/diff/` 的树永远渲染不出来。入口四处对齐：`chrome()` 的 `site-nav` 加一颗 `/diff/`（一处改动覆盖 36 张生成页）、产品页 `#features` 下方一条 `.try-line`、`docs/llms.txt` 一行、`docs/404.html` 一个入口；`PAGES_UPDATED` 与 `STATIC_PAGES.home.updated` 一起推到 10-19，页内五处日期读数同批改，两处「2026-10-17 实测」是记录不是主张、不动。

  新守卫**有牙**这件事当场验了两次，认的是「红在该红的那一句」而不是「跑过了就行」：把源的 canonical 改成 `https://example.invalid/diff/`，`pages:check` 回 `✗ tools/file-diff.html canonicalises to …, but this site serves the page at …` 且 `exit=1`，还原后 `md5` 与改前逐字相同、`--check` 回 0；给副本多追加一个换行，`--check` 点名 `docs/diff/index.html` 且 `exit=1`，`pages:render` 之后 `cmp` 无差。

  真浏览器一侧用 Playwright（`channel:'chrome'`）在这张页上跑了 26/26（一次性探针 `.test-tmp/diffprobe/page-check.mjs`，**不在套件里**）：http 与 `file://` 两种宿主都零 pageerror、除文档自身之外零请求（`<link rel="icon" href="data:,">` 是为了不再让浏览器去打一个 404 的 `/favicon.ico`，同时不给这张页添加第一个外部依赖——站点另外三张页用的是 `assets/icon-mark.png`，这里刻意不同）；`载入示例` 走通真实比较，读数 hunks 4 / added 4 / removed 4 / same 19 / 83%；**播动画那一份收敛到不播动画那一份的读数**（`statMs` 除外——它量的是比较耗时，跨轮本就该不同），reduce 档零中间帧、`animationName=none` 且起始态直接是终态。这一轮从这条实测里拔出一处真缺陷：初版补间从「上一次写入的**目标**」起跳，而一次揭示会写两次（`reportStats()` 与 `layout()`），屏幕上就先跳过头再收回来；改成从**当前显示值**起跳之后轨迹读作 `1 ⟶ 2 ⟶ 3 ⟶ 4`。同一形状的另一条教训：断言 `.stat` 的动画必须在 `#statsBar:not([hidden])` **之后**读，规则写的是 `.stats:not([hidden]) .stat`，藏着的时候读到 `none` 与动效偏好无关。

  素材**没有重拍**，逐条理由：工作台那两条淡入只改入场状态，落定像素不变，而被拍的是 `workbench-empty` / `batch-files` / `history` 三屏的静止态；count-up 整条都在站点页上，`assets:capture` 那 24 张里没有一张渲染它。所以「重拍」这轮只会让九张图跟着墙钟时间戳走，不会多证明任何东西。

  这一轮跑过的门禁：`lint:all`、`pages:check`（**38 文件**）、`verify:meta`、两道离线守卫（源码层 95 文件、产物层 manifest 只有 `storage`）、两道远程代码守卫、`verify:paths`、`verify:numbers`（**23 项事实 × 57 份散文**，新增的第 57 份就是 `docs/diff/index.html`，它不在 `generatedPages('convert')` 那一路、只能点名收进 `DOCS`）、`verify:listing`、`verify:release-ci`、`build`，全量 e2e **358/358**（88 张截图，零失败零跳过，断言总数一格未动，因此那十句对外散文也没动）。产物 **3,843,197 B / 65 个文件**，比改动前那一棵树（同一台机器 `git worktree add --detach /tmp/taf-head HEAD` + `wxt prepare` + `wxt build` 独立建出的 **3,842,846 B / 65 个文件**）多 **351 B**。**`Σ` 对两份都打印 3.84 MB**——3.83 → 3.84 的跨界发生在本轮之前的 `main` 上，所以那 16 处对外体积字样在同一轮里被一次性回填（见下面那一格），跨轮比字节要用排序尺寸多重集，别拿两份打印值直接相减（见 `bundle-size-proof-method`）。

- **把上一轮欠的体积账一次结掉：16 处「3.83 MB」→「3.84 MB」。** 载体清单与 10-01 那格不同，本轮实测的分布是 `docs/index.html` **6 处**（指标卡、中英取证句各一、取证注释那一行、两处 JS 注释里把标签文字当标识符引用的字样）、`CONTRIBUTING.md` 与 `.en.md` 各一、`docs/llms.txt`、`docs/blog/index.html` 中英两处、`docs/promo/{community-posts.md×2, community-posts.en.md, wechat-article.md, blog-article.en.md}` 五处。**README 与 `.github/CHROMEWEBSTORE.md` 一处也没有**（前者用徽章、后者那格是历史陈述）——我上面那句把 README 和商店表列进载体是错的，按实测改在这里。回填用脚本做，每个 needle 在**自己那份文件里**必须恰好命中一次、否则整体不写盘：`docs/index.html` 里 GitHub octicon 的 `d=` 路径含 `1.23.82`，批量 replaceAll 会连它一起换（回填后该路径仍 1 处命中，已自证）。历史陈述一格未动：清单第 99 / 113 / 141 / 158 / 160 / 162 / 178 / 220 / 234 / 323 / 334 / 382 行是各轮当时的读数。同一笔还把 `docs/index.html` 那两句可见版本章从 **1.2.0 对齐到 1.2.1**（`verify:meta` 只守 JSON-LD 那个 `softwareVersion`——它是从 `package.json` 现读的——所以可见文字与它不一致时没有门会变红；这轮把页脚日期推到 10-19 之后，同一句里既写「1.2.0」又写「最后更新 2026-10-19」就是自己打自己）。

  这一笔之后重跑的门禁：`verify:numbers`（23 × 57，`exit=0`）、`pages:check`（38 文件，`exit=0`）、`pnpm format:check`、`pnpm lint:style`；产物没有变化（只动文档），所以按第 3 节那条自证规则**不需要**重跑 e2e——判据是「这一笔没进源码」，不是「体积数字很小」。

- **与上游撞车的一次记录（方法教训，不是缺陷）**：上面那一格「16 处 3.83 → 3.84」是**重复劳动**——`84bbfe5`
  （10-18，PR #22 `docs/size-384`）在 main 上已经做过同一件回填，且 `docs/index.html` 那 6 处的 needle 与
  替换文本**逐字相同**（比对的是 `gh api .../commits/84bbfe5` 返回的 patch，不是记忆）。看不见它的原因是
  **本会话的 `origin/main` 是会话开始时的陈旧缓存**：`git fetch` 直连 github.com:443 超时（这台机器的代理
  65532 当时没在听），而那条命令被 `| tail` 的退出码报成了成功。合并时无冲突风险（同一位置的同一改动），
  但**下一轮开工前要先确认真取到了上游**：`gh api repos/…/commits?sha=main` 走 api.github.com 是通的，
  它能一次性回答「这条账上游做了没有、`origin/main` 现在指向哪」，比 `git ls-remote` 可靠。
  同一时段上游还有 `3cc2b69`：把「1.2.1 已上传、未提审」写进了 `CHROMEWEBSTORE.md` 的现网状态块，
  所以本轮 ROADMAP 那句发版位置陈述与它同源、不矛盾（排队提审那一步由仓库变量控制，实测
  `actions/variables` 返回 `total_count: 0`，即 `CWS_AUTO_SUBMIT` 至今未设）。

  **合并落地时的对账（`a31e793` → `feature-dev`）**：`git merge` 零冲突。**自动合并落地那一刻、手改之前**，
  11 份重叠文件相对 `781887a` 只多出 **24 行、0 删行**（`git diff --stat 781887a` 在那一刻读的）；
  提交里那份是 `+42 / −2`，多出来的全是我这一场的更正与下面这几格。上游那 24 行逐字集中在
  `CHROMEWEBSTORE.md` 的现网状态块与本节 10-18 那一格——
  这正好反证那 16 处 needle 与上游确实同一形状，否则合并会在这些句子上出冲突或删行。**零冲突不等于零代价**：
  上游没碰的那一行被我这侧改掉了一句历史读数——第 3 节 10-03 那一格里「`Σ Total size` 只给到 3.8x MB」跟着
  对外文案一起换成了 3.84，而同一句前面写的相加值是 3,830,068 B，按那档取整打印的正是 3.83。已经改回 3.83 并在那里
  写明「今天同一条命令打印 3.84」。**没有门禁会为这一格变红**：`verify:numbers` 不守体积，而它按文件读的是
  对外散文里那些句子。教训是把「回填 N 处」做脚本时，needle 命中的文件范围要按**主张是现值还是读数**分档，
  不能只按「这个数出现了几次」分档。

  同批复测的产物账：合并后的树 `find .output/chrome-mv3 -type f` 求和得 **3,843,197 B / 65 个文件**，与合并前那一轮
  收口时留下的逐文件排序多重集（`.test-tmp/sizes-after.txt`）**逐字节相同**——这一场只动 `.github/*`，包必须是同一份，
  这也是「合并没碰源码」唯一有用的证据形式。上面那一格原先抄的是 3,843,223 B / 差 377 B，这一轮复现不了（那份读数
  没有留档，多半是中途一次构建的值被抄进了终稿），已按能复现的 3,843,197 B / 351 B 改写；3,842,846 B 那一格是
  隔离工作树独立建出的读数，本轮没有重建它，差值只能按两份读数相减记。

  **推到远端之后的现场（2026-10-19 晚，全部向 API 取，不是本地推断）**：`main` 由 `a31e793` 快进到 `ff61868`
  （90 个文件），`ff61868` 上那条 CI 三个 job 全绿（Lint & Type Check / Build Extension / E2E Tests），
  `Deploy GitHub Pages` 成功——线上 `https://…/transfer-any-file/diff/` 的 md5 与仓库里 `docs/diff/index.html`
  逐字节相同（`0435cc1bb06034f0dd93c60a001a4edc`），所以「逐字节相同」这条不变量在 Pages 上也成立。
  `Release Prepare` 同时成功并开出 **PR #23「1.3.0 发布准备」**（head `5c0b47f`、base `ff61868`、40 个文件）。
  远端标签仍只有 `v1.2.1` 一枚——`v1.3.0` 要等那张 PR 被合并才推，而合并它归所有者。
  **一张要人点一次的图**：PR #23 的 CI 停在 `completed / action_required`，那条 run 的 `event=pull_request`、
  head 是 `github-actions[bot]` 推上去的 `5c0b47f`，而且 `commits/5c0b47f/check-runs` 返回**空**——没有失败的检查，
  只有一场从没跑过的。两条 REST 批准端点用带 `repo` + `workflow` scope 的 classic PAT 都回 404
  （`POST .../approve-workflow-run`、`PUT .../approve`），所以这不是凭据不够，是这一步没有公开 API，只能人在
  Actions 页面按「Approve and run」。`mergeable_state=unstable` 就是这个空档，读成「检查挂了」是错的。
  **推送路由**：那一段时间 `github.com:443` 整面超时而 `api.github.com` 正常（系统代理写着 65532 却没进程在听），
  最后一次 `git push origin main` 以 exit=128 失败，改 `git push ssh://git@ssh.github.com:443/<owner>/<repo>.git main:main`
  一次推成——不改 remote、不动 `git config`；推完用 `gh api .../branches/main` 核实，再 `git fetch` 同一个 SSH 地址
  把本地 `origin/*` 对上，否则 `git status -sb` 会拿着陈旧缓存报「ahead 18」。

- **工作台那行「支持 14 种格式，48+ 转换路径」从页脚挪进空态拖放区。** 判据不是审美：那行字回答的是「我这格式能不能转」，
  而这个疑问在**放入文件之前**产生；页脚在 900px 高的窗口里位于折叠区之外，等于从来没被读到。顶栏不是落点——它不
  sticky，且已经载着副标题（价值主张那一行）。放文件之后目标下拉列出的是这批文件真正可达的目标，那本来就是比全局
  计数更强的信息，所以这行只在空态出现一次、不随状态位移。
  **一次挪动的真实半径是 5 处**（都不是编译器会管的）：`utils/i18n/{zh,en}.ts` 的键从 `footer.stats` 改成
  `upload.stats`（`en.ts` 是 `typeof zh`，只改一边编译即红）；`App.vue` 删掉 `<footer>` 与它的两条 CSS 规则，
  并把 `.footer` 从主题过渡的选择器组里摘出来（那段的注释也点名了页脚，一起改）；`FileUpload.vue` 收两个
  `number` props——数值**仍由 `App.vue` 的 `formatCount`/`pathCount` 算出后传下去**，因为对外文档引用的取证位置
  就是这两个量；`scripts/e2e-test.mjs` 三处读点换选择器（能力计数、中英两次语言切换的复读）；
  **`INFO_TEXT` 那五个正文信息文字采样点里 `.footer` 换成 `.drop-stats`**——这是「五组对比度」那句对外主张的
  判据之一，删而不换会让主张悄悄 overstated。
  数值 1:1 迁移，**断言总数仍是 358**（换判据不等于改契约），所以那十句对外散文一个字没动。
  素材按规则**重拍了**：这一行落在被拍的 `workbench-empty` 屏的像素上，24 张全更新（脚本自己打的取证行现在是
  `[en] workbench drop zone reports: "14 formats supported, 48+ conversion paths"`）。
  一条接受而非修掉的副作用：拖放板是 `role="button"`，可访问名由内容算出，所以那一行会进按钮名——与它上面的
  粘贴提示同一种既有形状（提示本来就在板内），单独给它 `aria-hidden` 会把信息对读屏整体抹掉，改板的
  `aria-label` 又是另一处可见行为，都没做。

  **这一笔的归因过程值得记**：改完第一次全量 40 条红，形状是「format not detected / 120 s `waitForFunction` 超时 /
  20 s 截图超时」，从第 52 节起级联。当时 load average 68→250（吃 CPU 的是 Qoder 自身与 WeChat，不是套件），
  而**夹具 `git status` 干净**排除了「我杀掉的运行写坏了夹具」这一支。等 load 降到 9 重跑：**358/358、0 红
  0 跳过、119 节全过**。中间还跑了一个 30 秒定向探针确认改动面本身（`.drop-stats` 渲染出 14/48、墨色与
  `.paste-hint` 同为 `rgb(91,107,128)`、`.footer` 命中 0、首屏 405 ms）——**探针自己的 staging 步骤超时是探针的
  `chrome.storage` mock 太糙，不是应用坏了**；这条区别只有对照着看才分得出来。判据照旧：先 `uptime` + `ps` 看谁在
  吃机器、再查夹具脏不脏，**不要去抬超时**（见 `8176a67` 那条「别去抬那个 30 s」）。

- **10-20 这一轮（三处禁用态 / 对齐 / 窄屏缺陷 + `Disabled Button States` 一节）**：定案轮 **410/410、0 红 0 跳过、
  92 张截图**，基线由这一轮自己写下 402 → 410，十句对外散文同批跟上（`docs/index.html` 中英各一、
  `docs/blog/index.html` 中英各一、`docs/promo/{community-posts.md×2, community-posts.en.md, wechat-article.md,
blog-article.en.md}` 五处），加本节第 55 行那句「断言基线 N 条」——那一句不在 `verify:numbers` 的四条 pattern
  射程内，只能手改，别指望门替我看见。同一行那串等式也跟 `452d006` 对齐了（`pnpm test:e2e` 现在是
  `wxt build + node scripts/e2e-test.mjs`，绕开新加的 postbuild，不再每轮多打一次 zip）。同批把 `release.yml`
  的 Release 标题改成 `$TAG`（线上 `v1.2.1` 那条已用 `gh release edit` 同步改名并由 API 回读自证），
  dry-run 摘要那行跟上，那一步已无用的 `VERSION` 摘掉。

  三处缺陷都带读数：无目标时 `.convert-btn` 与可用态同为 `#2563eb`（可用态规则是 `!important`，EP 的禁用色不是，
  所以禁用态照旧吃主题实色）；转换中的 `.add-files-btn` 白底白字（文本按钮禁用后背景透明、标签仍是
  `--fat-on-btn-solid`）；119px 高的结果告警里图标顶 604 对标题顶 566；360px 下 sync 右缘 420 越过卡片右缘 344
  而 `document.scrollWidth` 仍报 360——`overflow: clip` 是静默裁切，永远不会出滚动条。

  **两条方法账，比缺陷本身更值钱**：(1) 新那一节的令牌探针会撒谎——减动效那条 `*` blanket 给探针元素也上了过渡，
  同一 task 内连续读五个令牌，后四个读到的是上一个值，红字里那串 `want rgb(241,245,249) / rgb(241,245,249) /
rgb(241,245,249)` 就是它；修法是内联 `transition: none !important`，再加一条「五令牌至少三种不同」的自检，
  让量具坏的时候自己报名。(2) 裸调 `section()` 而不写 `if (section(...))` 会被 `E2E_ONLY` 穿透——那一节在子集
  运行里照跑，而 `skippedSections` 不为它 +1，于是「非完整轮不写基线」那道闸一起失效。

  **负载形态（五轮全量，红三轮、绿两轮）**：红的三轮形状各不相同——第一轮 54 条散在互不相关的章节（`PDF→JPG`
  30 s `waitForFunction` 超时、109 次 20 s 截图超时），第二轮红到 38 条被我中途停掉，第三轮只剩 6 条、全部落在
  历史那几节（读到过渡中的行数 `50 → 52`、未落盘的写 `expected 51`、筛选与搜索各读到一份旧列表）。吃 CPU 的
  是桌面上两个 Qoder 实例、同机另一会话的门禁运行，以及我派出的只读评审 agent（它们只跑 `pnpm` 就能把 1 分钟
  load 顶到 184，而 `ps` 里看不到一个热进程——负载记账看的是排队深度，不是 %CPU 列），不是套件也不是应用。
  两轮全绿：修正评审意见之前一轮 410/410（也是它第一次把基线从 402 写成 410），评审修正之后**定案轮**再 410/410。
  中间还有一格值得记：我第一次把「同一 task 里连续读到旧值」的探针 bug 判成了 UI 缺陷，红字里那串
  `want rgb(241,245,249) / rgb(241,245,249)` 才是真相。历史几节单独跑（`E2E_ONLY=history,batch-member`）
  `exit=0`，这就是「量具问题」与「应用问题」的分判证据，判据仍是上一格那条：先 `ps` 看谁在吃机器，
  再 `E2E_ONLY` 定向复现，**不抬超时**。

  **素材这一格要改口径**：`assets:capture` 在同一棵干净树上连跑两次，**28/28 张 PNG 全不相同**（连 `icon.png`
  与 `workbench-empty.png` 都在内），所以「重拍后的字节差」不能用来把改动归因到某张图。本轮提交 15 张，记的是
  「最后一次运行的产出」这个事实，不是「这些像素是我搬的」。归因改用确定性取值：干净树与改动树各跑一次 DOM 探针，
  只有 `保存为预设`（primary + plain、禁用）两格从 `rgb(37,99,235)` / `rgb(109,158,246)` 变成
  `rgb(241,245,249)` / `rgb(24,24,37)`。一处预测被当场推翻：空工作台**不渲染** `.convert-btn`（那颗按钮是 staged
  之后才出现的），所以 `workbench-empty` 与 `screen-01*` 逐字节未变；我先前用 `getBoundingClientRect()` 判「在画面
  内」是错的——折叠卡片里的元素矩形照样非零，要判可见得读 `visibility` / `opacity`。

  `.el-button--text` 那一族四条选择器在本项目匹配不到任何元素（EP 2.14.3 给文本按钮发的是
  `el-button--primary is-text`，仓库里没有 `type="text"`），本轮只把同族规则一起加上 `:not(.is-disabled)`，
  真正拦住「禁用还点亮」的是 `--primary` 那条；那四条该不该一并删是另一笔账，删之前要先证没有别的宿主版本发这个类。
  本轮跑过的门禁：`lint:all`（含 `--max-warnings 0`）、`build`、`verify:meta`、两层离线（96 个第一方文件 /
  产物 manifest 权限恰为 `["storage"]`）、两层远程代码、`verify:paths`（48 边 / 182 对）、`pages:check`
  （60 文件）、`verify:listing`、`verify:numbers`（23 事实 × 65 散文）、`verify:release-ci`、全量 e2e，
  全部 `rc=0`；退出码逐个现捕——管道会把它们吞成 `tail` 的 0，这一轮我自己先踩过一次。

- **同日第二轮（窄屏两行不肯缩的控件）：413/413、92 张截图、基线 410 → 413。** 上一轮派出去的只读窄屏审计给了五处候选，本轮**逐处实测**，结果不是一边倒的：

  _成立两处_。`HistoryPanel.vue` 的 `.history-head` 与已修的工具栏同形——趋势图 `flex: 0 0 auto`（120px svg）加三枚 `nowrap` 文本按钮 `flex-shrink: 0`，祖先 `.collapsible-body` 是 `overflow: clip`：480px 起「清空历史」就压出框 16px，**430px 及以下它的中心命中测试落到 null，也就是清空历史这个动作点不到**，而 `document.scrollWidth` 从头到尾等于视口宽（360/390/430/480 全是），所以永不出滚动条。`entrypoints/options/App.vue` 的 `.result-actions` 是另一回事：中文两个槽位放得下（360px 下 29..331 落在 302px 的行里、`scrollWidth` 与行宽相等，320px 下 29..291 落在 262px 里），**英文放不下**——`Convert Again` + `Retry failed files (1)` 在 360px 需要 309px、超出自己盒子 7px，320px 则伸到 x=338 而卡片止于 304，于是整页 `scrollWidth` 涨到 338。两处都改成可换行（历史那行只在 ≤480px 换，结果那行不加断点，因为在放得下的宽度上 wrap 本来就是惰性的），改完两个语种在 360 与 320 都是 `scrollWidth == clientWidth`。

  _证伪三处_，记下来免得下一轮重新怀疑：审计说工具栏在 481–520 那一段仍会被裁——实测 520/560/640 一个违规都没有（`.comparison-toolbar` 四个控件、零越框）；说 `PreferencesMenu` 的 `.theme-grid` 缺 `minmax(0, …)` 会顶破 320px 的弹层——实测三轨各 92.66px、标签 `nowrap` 但只有 33px 宽，`overflow-x: visible` 且没有越界；说 `.file-list-header` 在 360px 只剩 ~9px 余量——实测中文 360/320 都在框内。审计的算术推算与真实几何差得比预期远，**这就是「候选要先实测」那条纪律的用处**。

  本轮也推翻了我自己写进注释的一个数：给 `.result-actions` 补 wrap 时我先在注释里写了「中文在 360px 占 29..246」——那是没测过就落进文件的数字，随后用两个语种各跑一遍才拿到真值（中文 29..331 / 29..291），注释按实测改写。量具也错了一次：命中测试若不先 `scrollIntoView`，视口外的控件一律报不可点，于是 1280px 上「三个按钮全 NOHIT」是仪器假阳而不是缺陷；修正后 `.history-head` 与 `.comparison-toolbar` 在宽视口都是 `hit=ok`。

  三条新断言并入 `Disabled Button States` 那一节。评审在这节里抓到一个**我自己造的真空**：那条历史断言的前置条件是 `head.querySelector('svg')` 代表「趋势图已渲染」，而那一行三枚 `el-button :icon` 各自也渲染 `<svg>`——所以只要 `.history-head` 存在它就恒 true，「没图就没有越框对象」这道保险形同没写，跑绿跑红都抓不到它（它一直绿）。改成指向组件自己的类名 `.history-trend`（挂在 `v-if="records.length >= 2"` 上），并按要求在本节里真跑第二批转换。另一条教训同型：只钉 `getComputedStyle(...).flexWrap === 'wrap'` 测不到英文那一格（中文两个槽位在任何宽度都放得下），于是另起一页按 `fat:locale: 'en'` 种子、用「一个文件转换失败」的真实批次断结局。

  **牙齿当场验过**：把两条 wrap 规则同时摘掉重跑，三条断言各自报出自己的数——`wrap=nowrap, last button right 479 vs clip right 343`、`flex-wrap is nowrap`、`retry right 338 vs card right 300, document scrollWidth 337 vs clientWidth 316`；装回来之后 `413/413` 零失败零跳过，基线由这一轮自己写下。摘规则用的是一次性编辑、按原样装回，不用 `git checkout`（共享工作树里那会连别人的改动一起抹）。

  定案之前的三轮都值记一笔：第一轮在 `History import size cap` 处报 `ENOSPC: no space left on device`——本机磁盘当时只剩 40 Mi，清掉自己的可再生输出（`.test-screenshots` 37 MB 与本会话的探针/日志）后回到 3.1 Gi；第二轮红在 `Merged image PDF: the merge finished before the cancel landed`，那是**取消与完成抢跑**的计时判据，且该节在本节之前跑，与本轮的 CSS 无关（转换进行中那张卡根本不挂载），单跑该节 `248/248 rc=0`；第三轮把整轮改成 `E2E_HEADLESS=true` 才走通——有头模式下 IDE 的渲染进程把合成饿到每张 `fullPage` 截图超时 20 s，一轮里 17 次超时把 30 条断言拖成 9 分钟，这与第 462-469 行那一格同源：**先 `df` + `ps` 看是谁在吃机器，不抬超时、不改判据**。素材**没重拍**：这两条规则只在 ≤480px 与「放不下」时生效，被拍的是 1280×800 的静止屏，逐条判据见 [[asset-recapture-trigger]]。

- **同日第三轮（SEO：六张配对页 43 → 49）。** 上一轮窄屏批次收口后，把机会清单里那条「下轮 = N2 扩容」做了：往
  `scripts/conversion-pages/pairs.mjs` 加 `csv-to-pdf`、`excel-to-word`、`pdf-to-markdown`、`svg-to-pdf`、
  `word-to-png`、`webp-to-word` 六条（143 条可达配对里，界面实际提供的 116 个组合此前只有 43 张页）。
  每条都写满 `title` / `desc` / `lede` / `keeps` / `limits` / `notes` / `faq` 的中英两套，取材只从实现来——
  写之前读了 `data-to-html.ts`、`pdf-to-html.ts`、`html-to-pdf.ts`、`svg-raster-common.ts`、`image-to-html.ts`、
  `html-to-docx.ts` 与 `image-pdf.ts`。即便如此，**第一稿仍有 11 条主张与实现不符、另有 4 处漏写或只写了含糊的一半**（表里 15 行），
  全部由落笔后的逐条核查拦下——这一格才是这批真正值得复用的部分。

  这一轮最值钱的不是页面，是**守卫把「文案能怎么写」变成了「文案只能这么写」**：`pnpm pages:render` 第一次跑就拦了
  12 条——英文标题 61/76/64/71 字符超 60 的 SERP 预算、英文描述 163–201 超 160（「Google 只渲染这么多，剩下的爬虫读不到」），
  以及六条 hub 重复陈述（`targets` 只服务于「没有自己页面的那条路」，页面一立，hub 里那段必须撤，否则同一个事实两处写、
  将来必然不一致）。改完再跑，又拦了**孤儿页面**：`docs/index.html` 的 `.pairs` 网格与 `docs/llms.txt` 里没链接的页面直接判失败。
  三条链一起看完的结论是：这套生成站没有「先上线再补一致性」这一步，写不进数据源的话就印不出来。

  本轮跑过的守卫（逐个现捕退出码，全部 `rc=0`）：`pages:render` → **66 个文件**（`docs/convert/` 50 张）→
  `pages:check`（66 文件等于数据源渲染结果）→ `verify:numbers`（23 事实 × **71** 份散文，新增的 6 份自动进射程）→
  `lint:all` → `build`（产物 `.output/chrome-mv3` 内 `convert/*.html`、`sitemap.xml`、`llms.txt` 命中 **0**）→
  两层离线、两层远程代码、`verify:meta`、`verify:paths`（48 边 / 182 对，未变）、`verify:listing`、`verify:release-ci`。
  e2e 与素材**都没重跑/没重拍**，判据是同一条：这一笔没进扩展源码（动的只有 `scripts/conversion-pages/*` 与站点页），
  产物字节由 `build` 与两道产物层守卫现读。

  核查那一道的产出（每条都自己回到实现取证，不是照抄核查意见）：

  | 第一稿写的                                          | 实现实际做的                                                                                               | 取证                                                             |
  | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
  | CSV 的日期「解析阶段先归一」                        | CSV 按 `raw: true` 读，根本没有归一那一步；归一是 XLSX 那条                                                | `utils/converters/data-to-html.ts:57`                            |
  | 「表头行不会与数据行合并」                          | `sheet_to_html` 不产 `<th>`，首行也照写成一格                                                              | 本机 `node -e` 造表跑 `sheet_to_html`，`HAS_TH false`            |
  | 「列多时按页面宽度缩放」（继承自被撤下的 hub 文案） | 版面固定 `RENDER_WIDTH = 800`，`toCanvas({ width: RENDER_WIDTH })`，不随列数变宽                           | `utils/core/html-raster.ts:7,309`                                |
  | 「多于五个或 20 MB 就弹确认」                       | 还要 `confirmConvertEnabled` 为真，偏好里可以关掉（默认开）                                                | `composables/useConversion.ts:458`                               |
  | 「合并单元格被摊平成普通格子」                      | `make_html_row` 按 `!merges` 写 `colspan`/`rowspan`，且这两个属性在 DOMPurify 的 html 白名单里，净化后仍在 | `node_modules/xlsx/xlsx.mjs:20976-20977` + 同一条 `node -e` 实测 |
  | 「多 sheet 转 JSON 也打成一包」                     | JSON 是**一份**文件、按表名分组；只有 CSV 那条给 ZIP                                                       | `utils/converters/xlsx-to-json.ts:38-41`                         |
  | 「产出是 Word 原生表格」                            | `asBlob` 打的是 MHT **altChunk**，Word 打开时才渲染；沿用 `html-to-docx` 那页既有口径                      | `utils/converters/html-to-docx.ts:17-21`                         |
  | 「文本项按位置排序，不靠 PDF 内部顺序」             | `getTextContent()` 没开 `sort: true`：只按 y 归行、按 x 补空格，行序仍是读出来的顺序                       | `utils/converters/pdf-to-html.ts:264,302-309`                    |
  | 「标题层级不会带过来」                              | 会：书签命中的行按 `depth + 1` 落成 h1–h6（深度取到 5），无书签时短而整行大写的行升成 `<h2>`               | `pdf-to-html.ts:59,127,167,179,250`                              |
  | 「可以勾『合并为一份 PDF』把一批 SVG 并成多页」     | SVG 不在可合并集合里（注释就写明它走另一条栅格化路），那道开关对 SVG 批次根本不出现                        | `utils/core/image-pdf.ts:20-27`、`useConversion.ts:242`          |
  | 「剥 `foreignObject` 与外部实体」                   | `stripSvgActiveContent` 只删 `<script>` 与 `on*`；「在净化过的文档里栅格化」也改回真实形状——走 `<img>`     | `utils/core/svg-raster-common.ts:13-20`                          |
  | 「WebP 进 Word 打开即显示」                         | 转换器不转码，画不画得出来取决于那款 Word 对 WebP 的支持——这正是被撤下的 hub 文案已经写明的那格            | `hubs.mjs` 本轮删除的 `webp.targets.docx`                        |
  | 漏写：A4 分页可能把一行切成两半                     | `sliceHeightPx` 是固定高度切，不做行对齐                                                                   | `utils/converters/html-to-pdf.ts:39,48-55`                       |
  | 漏写：页与页之间在 Markdown 里是一条 `* * *`        | 页末写 `<hr>`，turndown 默认 `hr: '* * *'`，且 `html-to-md` 没另加 `hr` 规则                               | `pdf-to-html.ts:332`、`turndown.cjs.js:581`                      |
  | 含糊：「整页高度有上限」                            | 上限是 `MAX_CANVAS_EDGE × 4` = 32768 px；另补一条：空文档是 `errors.docxEmpty` 直接失败，不交空白图        | `utils/core/html-raster.ts:28`、`docx-to-html.ts:66`             |

  一般式：**「读过源文件」不等于「读的是这一条链路经过的那几个分支」**——这 15 条里没有一条是凭格式名编的，全是从相邻链路的
  形状借来的（XLSX 的归一安到 CSV 头上、PDF 的 `sort` 安到归行头上、CSV→JSON 的「首行当键名」反过来安到 HTML 头上）。
  所以文案落笔后必须再来一遍逐条对回，而且**能实测的就实测**（`sheet_to_html` 那两条是 `node -e` 直接跑出来的，不是读出来的）。

  一笔欠账已在同一轮关掉：`AGENTS.md` 与 `.qoder/rules/wxt-rules.md` 里那些复述守卫输出的句子
  （「`docs/convert/` 的 36 个生成页」「比对 57 份对外散文」）**在本轮之前就已经老化**——`verify:numbers` 不守这两个数字，
  它只打印给自己看。修法不是把数字换成当轮实测值（那样下一次渲染就再老化一次），而是把**没人守的计数从指令文档里摘掉**：
  两处现在都写「份数与生成页页数由脚本现枚举（`generatedPages('convert')` 与 `DOCS`），别在这里抄死」。同批把
  `AGENTS.md` 架构那格里写死的「35 张」也换成「条目数以 `pairs.mjs` 的 `PAIRS` 为准」。改完 `verify:numbers` 仍
  打印 23 事实 × **71** 份散文且 `rc=0`——那两个数字本来不在它的判据里，所以这一笔不会以红灯的形式提醒任何人，
  这正是它老化的原因。**留下的一般式：指令文档里只写「去哪里量」，不写「量出来是多少」。**

- **同日第四轮（窄屏：JSON 数组表的行号列钉住，413 → 421）。** 接着上一轮的窄屏审计往下量，这一轮把**没量过的三处**
  先量了：JSON 预览弹窗（树视图长键、数组表 14 列）、图片输出参数行、PDF 选页行。结论分两半——
  **两处不是缺陷**：树视图的行是 `white-space: normal` 且 `.json-body` 本来就 `overflow-x: auto`，长键折行、
  需要时横向滚，量到的 338 px 行宽只是滚动前的矩形；输出参数那排 `.output-options` 早就是 `flex-wrap: wrap`，
  320 px 下三个字段各自换行、最右 229 < 面板右 291，没有一处被裁。**一处是真缺陷**：数组表按设计会横向滚
  （`width: max-content`，14 列实测 2437 px 可滚），而 `#` 那一列跟着滚走了——360 px 视口下 `scrollLeft = 600`
  把行号送到 **x = −570**，读者对着第 9 列却再也说不出这是第几行。

  修法是给 `tbody th.json-index` 上 `position: sticky; left: 0`，表头那格再补 `left: 0` 并把 `z-index` 抬到 2
  （`thead th` 原本已 `top: 0` 钉上边，角格要同时吃两个轴、且压住后到的钉住格）。**难点不在钉住，在底色**：
  斑马纹写在 `tr` 上，钉住的格子若留透明，滚过去的正文会直接从它下面透出来。所以先量 12 组（6 主题 × 明暗）
  再动手：奇数行往上的第一层不透明背景在六套浅色里全是 `rgb(255,255,255)`、六套深色全是 `rgb(30,30,46)`，
  与 `--el-bg-color` 逐组相等；偶数行取 `--fat-surface-2`。两条都按令牌比，不写死颜色。

  **牙齿当场验过**（摘掉那三条规则 → 重跑同一节）：该红的五条各自报出自己的数——
  `position static, left auto`、`Δ -600.00 px`、命中测试不再落在这格、奇数行底色 `rgba(0, 0, 0, 0)`、
  偶数行同；**该绿的三条照旧绿**：「网格确实横向可滚 1590 px」「数据列整整挪了 −600 px（证明这一滚是真的）」
  「表头角格纵向仍钉在顶部（它测的是另一个轴，与这次摘掉的规则无关）」。装回用 `mv` 备份件，
  还原后 `shasum -a 256` 与动手前那一行逐字相同，再重跑全量。新节 `Sticky JSON Row Ordinals` 八条，
  基线 413 → **421**（`421/421`、零失败零跳过，93 张截图），十句复述它的对外文案同批改数。

  跑这一轮的机器不干净：起手 load 90（并发会话的 Chrome for Testing 在 52% CPU），所以定案轮等到 26 才开跑，
  全程 `E2E_HEADLESS=true`；变异轮与定案轮之间隔了一次 `pnpm build`，两次都现读产物层守卫。

- **10-21 第二轮（SEO：配对页 49 → 55）。** 接着上一批再加六条链路：TXT→PDF、Word→TXT、GIF→PDF、
  SVG→HTML、CSV→HTML、Excel→TXT。`pages:render` 这一轮的拦截比上一轮温和（没有超预算的句子），
  但照样按名字要账：六段 hub `targets` 必须撤、`docs/index.html` 的 `.pairs` 网格与 `docs/llms.txt`
  必须同批加链接，还多拦了一条——**`published` 比 `PAGES_UPDATED` 新就失败**，理由是 sitemap 的
  `lastmod` 与页面自称的发布日期说的是同一个 URL，两者不能互相打脸。于是站点更新日期随内容一起动，
  这正是 `PAGES_UPDATED` 那段注释写的规矩。

  核查那一轮这次抓得更狠（**5 条不实 + 5 条夸大 + 5 条漏写**），几条会直接误导用户：
  `xlsx→txt` 写「合并区其余格是空字段、列不错位」——`make_html_row` 对被覆盖的格子直接 `continue`，
  一个 `<td>` 都不产，合并区右边的列整体左移；`csv→html` 写「页面自带横向滚动」——`DOCUMENT_CSS`
  只给 `pre` 写了 `overflow-x:auto`，列少时是断行挤进去；`gif→pdf` 写「结果卡写明哪些文件是动图」
  「失败自动重试整组」——`lostFrames` 是整批一个布尔（`image-pdf.ts` 里 `||=` 折叠）、提示只有一句，
  重试是界面上整组重来；`docx→txt` 写「不是本扩展自己产出的 altChunk 才报错」——没有这个分叉，
  `errors.docxEmpty` 在还原之后统一抛。补写的五条里最值钱的是 `boundWorkbook` 的格子预算
  （每表 50 万 / 每簿 100 万，超过报错而不是截断）与 `txt→pdf` 的采样台阶（>4000 CSS px 降到 1 倍，
  长日志比短文件糊一档）。

- **10-21 第三轮（安全：SVG→HTML 的产物不再带远程引用，421 → 427）。** 上一批写 `svg→html` 文案时，
  我照被撤下的 hub 那句话写了「外部引用不取字节」。核查没放过它，实测也没放过它：
  **DOMPurify 的 `svg` + `svgFilters` 配置只管可执行 markup，不管网络**——`<image href>`、`feImage href`、
  `fill="url(https://…)"`、`style="…url(...)"`、样式里的 `url()` 与 `@import` 全都留在产物里。
  这条链路的特别之处是**没有人在我们这边渲染它**，是用户双击打开那张 HTML，于是请求由用户的浏览器发出。
  取证：一张带四个远程目标的 SVG 走完整链路 → 下载产物 → 用同一台浏览器打开，
  **修之前打 4 次、修之后 0 次**（`/track-*` 命中数由本地服务器现记，不是推断）。

  修法是一行复用，不新写第二套逻辑：`wrapHtmlDocument(...)` 之后过一遍 `stripRemoteResources`
  （它本来就覆盖 `image` / `feimage` / `use` 的 href、`background` / `ping`、`srcdoc`、`srcset`、
  meta refresh、动画标签与 CSS 的 `url()` / `@import` / `image-set()`）。这与仓库立过的两条边界同源：
  `html-to-docx.ts`「Word 打开文件时不该替你发请求」、`html-raster.ts`「sandboxed srcdoc iframe
  即使禁脚本也会取子资源」——**同一规则漏了第三个出口**，而漏的原因和上次一样：那两处都有人渲染，
  只有这一处是交给用户打开。副产物是 SMIL 也一并解决：svg 配置允许 `animateTransform` /
  `animateMotion` / `animateColor`（只禁 `animate` 与 `set`），`ANIMATION_TAGS` 把它们整块删掉。

  新节 `SVG HTML Subresource Egress` 六条：一个向量一个标记，另三条是**必须不被误删**的对照
  （内联 `<svg>`、`url(#g)` 与 `data:image/png;base64,`、`.marker-box` 规则与 `<title>` 里的源文件名）。
  牙齿当场验过：把那一行改回 `await wrapped.text()` 重跑，该红的三条各自报出自己的数
  （5 个 canary URL 全在、动画元素在、样式里的远程 `url()` 在），该绿的三条照旧绿；装回用备份件 `mv`，
  `shasum -a 256` 与动手前逐字相同。定案轮 `427/427、0 红 0 跳过、94 张截图`，基线由这一轮自己写下
  （套件末尾那句 `the prose was held to 421` 就是它催我去同步那十句的）。素材没重拍：工作台像素不变。

- **10-21 第四轮（安全：同一类缺口的第二个出口，427 → 432）。** 上一笔修完 SVG→HTML 之后，顺着「这份
  markup 会被谁渲染」把其余出口又查了一遍，`docx-to-html` 的 **altChunk 还原路径**是同一类洞：mammoth 读不了
  altChunk 文档，于是走 `extractAltChunkHtml` 把内嵌 MHT 里的 HTML **原样**交出来，随后只过 DOMPurify
  （它的职责是可执行 markup，远程 URL 是它明确保留的）。手工造一份第三方形状的 `.docx`（`word/afchunk.mht`
  里放一张 `<img src="http://…">`，fflate 现拼，不进 `fixtures/`——二进制夹具会正好藏掉被测的那一行）：
  **转换出的 `.html` 一打开就打那个地址**。修法和 SVG 那笔同一条：`wrapHtmlDocument` 之后过
  `stripRemoteResources`。为什么这条该剥而 `md-to-html` 不该剥：**看远程引用是内容还是附带物**——
  Markdown 作者写 `![](http…)` 就是要那张远程图，剥掉等于把功能做坏；altChunk 里的是另一个工具塞进来的
  不透明 markup，与 SVG 同形。这条判据连同取证方法写进记忆，避免下一轮顺手给四个文件都加 strip。

  新节 `DOCX AltChunk Egress` 五条（识别为 Word / 正文确实被还原 / 产物里没有 canary / 文档自己的文字与
  data URI 都还在 / **打开产物实测 0 次请求**）。牙齿当场验过：把那一行改回 `await wrapped.text()` 重跑，
  该红的两条各自报出证据（`the delivered page would fetch: ["/canary/altchunk-img.png"]`、
  `opening the delivered page fetched [...]`），该绿的三条（识别、还原、本地内容保留）照旧绿——
  后者正是「钝刀全删」骗不过去的那一格。装回用备份件 `mv`，`shasum -a 256` 与动手前逐字相同。

  同批把 `docx-to-html` 那页的文案补齐（远程子资源在写文件前剥掉、altChunk 还原是通用的而不是「只认自家
  产物」），并修掉一处中英混排的手滑（「不需要 accompanying 的 images 目录」）。定案轮
  `432/432、0 红 0 跳过`，基线由这一轮自己写下，十句对外载数同批 427 → 432。素材没重拍：改的是产物字节，
  工作台像素不变。

- **10-21 第五轮（UX/无障碍：焦点环的「谁来画」与开关的「叫什么名」，432 → 444）。** 用真键盘把工作台走了一遍 Tab：空态 6
  个、排队两个文件后 14 个、跑完一批后 28 个、偏好面板展开 42 个可见可聚焦控件，逐个都进得去（第一版量具报的
  5 个「不可达」是量具自己造的——环从点击处起算，跳过链接与触发按钮落在环的另一侧，空态那一档 6 个全绿可以反证）。
  真缺口在**代理元素**那一类：`el-switch` / `el-checkbox` / `el-radio-button` 把焦点放在一个尺寸为 0 的透明
  `input` 上，环画在**兄弟**代理节点上，所以 `global.css` 那条全局 `:focus-visible` 够不着——环色由 Element Plus
  自带的 `--el-switch-on-color` / `--el-checkbox-input-border-color-hover` /
  `--el-radio-button-checked-border-color` 决定，而它们的值都是 `--el-color-primary`，不是本仓库认证到 3:1 的
  `--fat-focus-ring`。12 组主题×模式实测只有**浅绿**过不了线：`#10b981` 在卡片上 2.54:1、在工作台面上
  2.42:1，同一处 `--fat-focus-ring` 是 `#059669`（3.77 / 3.60）。这个主题的 `--fat-primary` 本来就不够 3:1，
  所以 tokens.css 早把它自己的环指到 `--fat-primary-active`——只是这三族绕过了那一步。修法一条规则，选择器逐字
  抄 Element Plus，几何（2px / offset 1px）不动，只把 `outline-color` 并回 token。

  同一趟 Tab 走到第二个出口：偏好面板里那两枚 `el-switch`，**一枚有 aria-label、一枚没有**。通知开关的行标签是一个
  兄弟 `<span class="pref-label">`，而 Element Plus 的 switch 不套 `<label>`，所以读屏软件念出来是「切换，已关闭」
  ——没有主语。修法一行、用现成的 key（`prefs.notifyOnComplete`），中英两份早就在了，不涉及新增文案；取证就是同一次
  走查的前后两读数：改之前那枚的 accessible name 实测是空串，改之后是「转换完成后发送桌面通知」。

  新节 `Hidden-Input Focus Rings` 十二条：三族各三条（几何 / 等于 token / ≥3:1），两核名字（走到的四枚控件都得有
  可读名字；两枚开关的名字必须等于同行那个可见标签），加一格「这两色在本主题必须真的不同」防空转。牙齿当场验过：
  把选择器改成不匹配的类名重跑，三族的颜色与对比度各自变红（`got rgb(16,185,129)`、`2.54:1`）加上那格守卫共 7 条红，
  几何三条照旧绿；改回后 12 条全绿。名字那两核不靠摘规则验——改之前那枚开关的 `aria-label` 本就不存在，空串是同一次
  走查实测到的。

  **测量自己的一次假信号，记下来**：`outline-color` 在 tokens.css 的过渡清单里，第一版读数把**过渡中途的插值帧**
  当成了结论，于是报出「checkbox 的环是 3px currentColor、radio 只有 1px 灰边」——都不存在。对代理节点上的动画逐个
  finish 之后，三族都是干净的 2px solid。e2e 里沿用了 `Skip Link & Focus Ring` 那节早就写下的同一条警告（focus 与
  read 必须分两次往返）。

  同批把产物里所有 `:focus-visible{…outline…}` 规则枚举了一遍收口：其余要么直接用 token（`.el-button` /
  `.el-input__wrapper` / `.el-select__wrapper` / `.collapsible-head` / preset / json / theme-item /
  shortcut），要么是本应用**根本不渲染**的控件（纯 `el-radio`；`el-tag__close` ——两处 `el-tag` 都没开
  `closable`），所以没有顺手加规则。素材没重拍：鼠标焦点不触发 `:focus-visible`，工作台像素不变。
  **留给下一轮的一条**（属于交互改动，要先问）：偏好弹层默认不抢焦点环，键盘用户得先走完一整页才进得去弹层
  ——`el-popover` 的 `trap-focus` 能关掉这段距离，但那是改交互语义。定案轮 `444/444、0 红 0 跳过`，
  基线由这一轮自己写下，十句对外载数同批 432 → 444。

- **10-21 第六轮（站点表格类配对页 55 → 58，外加一轮自查抓出的错账）。** 补的三对都在界面实际提供的
  116 个组合里（缺口按 `conversion-policy` + 路径基线现算是 61 格，这一批吃掉 3 格）：
  `csv-to-markdown`、`markdown-to-csv`、`html-to-csv`。写完之后独立核查（子智能体 + 我自己回读源码 +
  在真实构建产物里跑）**推翻或收紧六处**，全部已改：① 表格套在单元格里等于文档里有**两张表**，
  这条链的中转步会把它们并成分组对象、CSV 步拒绝，所以整次转换**失败**——我原来的「内层被压平」既与实现
  不符、也跟自己另一条 limits 打架；② `html→xlsx` 现读基线是 `html>json`、`json>csv`、`csv>xlsx`
  （`scripts/__baseline__/conversion-paths.json`），所以 **hub 上那句「多张表各成一张工作表」是上一批就存在
  的错账**，一并改掉，新页里「改走 HTML 转 Excel」的建议也撤了；③ 格子里的图片不是「只剩文字」而是
  **空的**（`textContent` 取不到东西），表格外的图才走 `![alt](src)`；④ HTML 侧用的是
  `decodeTextBlobLenient`，它**没有**「四种编码都读不出就报错」那道闸，坏字节会以替换符落地——我把严格链
  的保证错安到它头上了；⑤ 这条链上每个格子本来就是字符串，所以「不会变成 `1.727E+12`」那个实测对比在
  本路由不可达，改成「不走显示格式、文本原样」；⑥ `guardCsvValue` 还管 TAB / CR，表头重复或为空会互相
  覆盖、跨 `colspan` 的表头只算一格（补进 limits），而编码链漏了 UTF-16 嗅探（同页 limits 写「四种编码」、
  keeps 只列三种，对不上）。顺手修掉 `utils/converters/html-to-md.ts` 里一条与实现矛盾的旧注释：管道表的
  列数由**最宽的一行**定，不是表头那一行。

  关键主张有实测兜底，不只是读代码：两张表的 HTML 转 CSV 在真产物里失败，界面那句就是「JSON 内容必须是
  包含数据的数组才能转换为 CSV」；一张表那格取到下载字节——`EF BB BF` 打头，`日期,金额,备注` /
  `2024-01-05,1727000000000,'=1+1` / `plain,3.14159265358979,ok`，长整数没被写成科学计数法、`=` 开头带了
  防执行的前导单引号、日期没被改成序列号。文案里的 `<table>` / `<th>` / `<pre>` 在产物里都是 `&lt;`，
  三张新页与既有生成页同形（6 个内联 `<script>`、`fetch(` 0、远程 `src` 0）。
  渲染器继续当最好的审稿人：`.pairs` 网格与 `docs/llms.txt` 少一个入口就**拒绝写盘**，
  `csv-to-markdown` 的英文描述初稿 171 字被 SERP 预算拦回 160 以内。

  验证：`pages:render`（**76** 文件）与 `pages:check` 逐字节一致、`verify:numbers`（23 个事实 × **81** 份文档）、
  `lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code`，逐个现捕退出码全为 0。
  本轮不动扩展运行时（只改一条注释），断言数仍 **444**，素材不重拍。**同批再吃一格**：
  `excel-to-markdown`（`xlsx→md`，页面 58 → **59** 张），它吃的是缺口里搜索量最高的一族之首——多工作表在
  这条路上是**正常输出**（终点是 Markdown，不撞「只接受数组」那道闸），正好与上面第 ② 条形成对照，页里
  FAQ 第一题就问「五个工作表会不会像 HTML 转 CSV 那样失败」。英文描述初稿 173 字再次被 SERP 预算拦回
  160 以内。缺口现 **57** 格，下一批优先 `txt→*` 与 `json→*`（各 8 格）。

- **10-21 第七轮（把上一轮写错的那类事实变成可执行断言，444 → 452）。** 新节 `Table Boundary Routes` 八条，
  钉的全是**跨两个转换器才出现**的形状——文档守卫与 `pages:check` 都读不出来，而上一轮正是它们让文案出错：
  一张 `<table>` 转 CSV 成功（BOM、表头来自首行、`1727000000000` 不被写成科学计数法、`=1+1` 带防执行的
  前导单引号）；两张表被拒，界面原话「JSON 内容必须是包含数据的数组才能转换为 CSV」；**表格套在单元格里
  也算两张**，被同一条闸拒掉（这就是上一轮那条错账，现在是断言而不是散文）；多工作表的 `.xlsx` 转 Markdown
  成功且形状是「每个 sheet 一行 `## 名字` + 一张管道表」（实测 2 标题 / 2 表）。夹具用内存里的
  `{name, mimeType, buffer}`，不进 `fixtures/`——这三份文档的形状就是测试自己要精确控制的那一种。

  **两处红都是我的量具，不是产品**：BOM 我按 `0xef,0xbd,0xbf` 断言（`EF BB BF` 的第二字节是 `0xBB`）；
  分隔行正则 `/\|\s*-{3,}/g` 按**格子**匹配，两张表数出 4 而不是 2。两条都是先改量具再复跑，产品一次没红过
  ——这也正是把对外主张写成断言的意义：错的写法当场暴露，而不是等到有人照页面去复现。牙齿由此而来，
  不需要再摘规则（摘了就等于把被测的那条边界改掉）。

  断言总数 444 → **452**，十句对外载数同批改数（`docs/index.html` ×2、`docs/blog/index.html` ×2、
  四份推广稿 ×5、本清单那句手改 ×1），基线由定案轮自己写下；素材不重拍（无 UI 改动）。

- **10-21 第八轮（SEO 缺口再吃两格：TXT→Word、JSON→PDF，59 → 61 张页）。** 两格都取自剩余缺口里搜索意图
  最明确的一族（`txt→*` 与 `json→*` 各 8 格）。写法沿用第七轮立下的规矩：**先按路径基线把每一步读出来，
  再对每一步的实现写句子**，所以两条新页的核心主张都是机制而不是形容词——TXT→Word 的产物里是
  **MHTML altChunk**，排版发生在 Word 打开它的那一刻（换来换行 / 缩进 / 制表符忠实保留，代价是不同软件的
  行距与字体回退会差），这条同时解释了为什么「没有样式可继承」与「超宽单行不自动折」；JSON→PDF 的
  查看器每个 `<details>` 都带 `open`（默认全展开 ⇒ 折叠节点不会被漏掉），而 `html-raster` 有
  `MAX_CAPTURE_HEIGHT = 32768` 与按页高降档的像素比（⇒「没有文字层」「过高即报错而非静默截断」「越高越软」
  三条 limits 全部有据）。写稿时删掉了一条原本想写的句子（超长值换行而非截断），因为回读
  `JSON_VIEWER_CSS` 没有支撑它的那条声明——不确定就不写。

  `hubs.mjs` 里 txt 的 `docx` 与 json 的 `pdf` 两格同步摘除；四个镜像带入口（缺一个渲染器拒绝写盘），
  `txt-to-word` 的英文描述初稿 166 字被 SERP 预算再次拦回 160——这条守卫连续三批都在改我的稿子。
  验证：`pages:render` **78** 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 × **83** 文档）、
  `lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code` 全 rc=0，并实测 `.output/chrome-mv3`
  里搜不到这两个 slug。不动运行时，断言数仍 **452**，素材不重拍。**缺口现 55 格**，下一批仍是
  `txt→*` / `json→*` 的其余目标。

- **10-21 第九轮（两格纯文本出口，61 → 63 张页；顺带又清一条 hub 旧账）。** `json→txt` 与 `csv→txt`，
  写稿前先在真实构建产物里把两份产物的字节读出来，所以页里的形状句全是实测：CSV 四列表得到
  `名称\t数量\t单价\t\n苹果\t3\t5.5\t\n香蕉\t6\t2.0`——**每行末尾都带一个制表符**，只有最后一行被整体
  trim 掉；FAQ 因此正面回答「这算 TSV 吗」（像，但不严格）。JSON 数组得到 `[ Array(3){ Object(4)"name": "Alice",`
  起头、一键一行、`},` 分隔，字符串带引号而数字与布尔不带，非 ASCII 不被转义；而查看器的缩进是 CSS 边距、
  颜色是样式，**都不会变成字符**。
  撞见的第二条**先于本批存在**的错账：json hub 的 `txt` 那格写着「缩进保留到可读的程度」，与实测相反
  （没有任何缩进字符）。它因新建页面按规则摘除，错账随之消失。两条连上一轮的 `html→xlsx` 一起说明同一件事：
  hub 摘要与页面是两处独立 prose，**没有守卫比对二者**，所以补页时必须顺手复核同一对格式的 hub 那句。
  `csv-to-txt` 的英文描述初稿 165 字被 SERP 预算拦回 160——连续第四批在改我的稿子。

  验证：`pages:render` **80** 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 × **85** 文档）、
  `lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code` 全 rc=0，实测 `.output` 里搜不到
  `*-to-txt.html`。不动运行时，断言数仍 **452**，素材不重拍。**缺口现 53 格**。

- **10-21 第十轮（第 64 张页：JSON→Word；顺带撤掉第四条无法本机认证的对外断言）。** 产物形状在上一批就已
  实测：一个含 `[Content_Types].xml` 与 `/word/document.xml` 的 OPC 容器，里面带的是查看器那份 HTML 的
  **MHTML altChunk**——所以新页写的是「排版发生在 Word 打开它的那一刻」，并**只承诺结构与文字完整带走**，
  明确不承诺配色与折叠表现（本机没有 Word 可代为认证它的 HTML 引擎采纳哪些 CSS；"Word 渲染效果" 在本仓是
  已知未验证项）。因新建页面按「同一事实不在 hub 与页面各写一份」摘除的那格，原文写着
  「语法颜色退化为文字样式」——那是**一个关于 Word 行为的正面断言，我们没有任何本机证据**，属同类第 4 条
  （前三条：`html→xlsx` 多表各成一工作表、`json→txt` 缩进保留到可读的程度、`html→txt` 表格按行输出）。
  四条同因：hub 摘要、配对页、`llms.txt` 是三份独立 prose，**没有任何守卫互相比对**，只有「先量产物、
  再写句子」挡得住。页内同时给了替代方案（要表格走 CSV / Excel；介意版式一致性就转 PDF 或 HTML；
  交付前自己在 Word 里打开确认一次）。

  实测数字：**81 文件 / 64 张页**，`verify:numbers` 读到 **86** 份文档（上一批 80 文件 / 63 页 / 85 文档）。
  一处记账瑕疵如实记：`71498fa` 的提交信息里「`pages:render` __ 文件」那格因取数脚本抓空而留白，
  正确值就是本段的 81 / 86；不改写已推送的提交信息（`--amend` 不在授权内），在此补正。

  验证：`pages:render` 与 `pages:check` 逐字节一致、`verify:numbers`、`lint:all`、`build`、产物层
  `verify:offline` / `verify:remote-code` 全 rc=0；`.output/chrome-mv3` 里搜不到该 slug。不动运行时，
  断言数仍 **452**，素材不重拍。**SEO 缺口现 52 格**。推送第一发 `Empty reply from server`，按 API 核实
  远端未动后原样重试成功。

- **10-21 第十一轮（文本形态互换两格：Markdown→TXT、TXT→HTML，64 → 66 张页）。** 两页都按第九轮定下的规矩
  先量产物再写句子。md→txt 的实测形状：标题成为一行文字、强调与行内代码只剩文字、`- 项目` 成为**没有符号的
  一行**、有序列表按位置重编号且嵌套每层两空格、链接写成 `文字 [url]`、图片写成 `[Image: alt]`；最容易写错的
  表格实测是**一格一行 + 每格后一个制表符**（marked 在单元格之间写换行、提取器照抄），limits 与 FAQ 各说一次，
  并指到 md→HTML / md→Word 作为保留表格的路——这与第十轮修的 `html→txt` 错账同源，两处说法现已一致。
  txt→html 只做转义 `&`/`<`/`>`、`\n`→`<br>`、整段进 `<pre>` 三件事，核心主张是「不解释任何记号」
  （`#` 就是 `#`，贴 HTML 只显示为字符），limits 如实写「整篇一个 pre 块、无标题层级」「超长行不折」。
  两条 hub 摘要（md 的 txt、txt 的 html）按镜像规则摘除，复核后确认这两句本身与新页一致——属正常清理，
  **不计入前十轮那四条无证据断言**。四镜像齐备。

  验证：`pages:render` **83** 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 × **88** 文档）、
  `lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code` 全 rc=0，`.output` 里搜不到两个 slug。
  不动运行时，断言数仍 **452**，素材不重拍。**SEO 缺口现 50 格**。

- **10-21 第十二轮（高频一对：JSON→HTML 与 HTML→JSON，66 → 68 张页）。** 两侧都是这一族搜索量最高的写法，
  页里的关键句子仍是机制而不是形容词：JSON→HTML 的产物所有名字与值**先转义再写出**（没有可执行标记、没有任何
  远程引用、只带一份内联样式表），且渲染是**显式栈的迭代实现**——递归版本会在解析成功之后把栈耗尽，把一次
  正常转换报成 `RangeError`，这条注释就在函数头上，页里把它写成 limits 与 keeps 各一格。HTML→JSON 三条边界
  同源于本轮已修的两条错账：`<th>` 与 `<td>` 必须同等对待（否则规范表头整列左移）、行列都按「只看这张表自己」
  的作用域取（嵌套表不污染外层）、多张表交出的是**按小标题分组的对象**而不是数组（标题不足退到 `Sheet2`），
  在 limits、notes 与 FAQ 各说一次并互指。值一律是字符串：这一层不猜类型（猜过就把 `00123` 变成 `123`、
  把 `1/2` 变成日期）。

  两条 hub 摘要（json 的 html、html 的 json）按镜像规则摘除，复核后与新页一致，属正常清理，**不计入前十轮
  那四条无本机证据的断言**。四镜像齐备。验证：`pages:render` **85** 文件、`pages:check` 逐字节一致、
  `verify:numbers`（23 事实 × **90** 文档）、`lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code`
  全 rc=0，`.output` 里搜不到两个 slug。不动运行时，断言数仍 **452**，素材不重拍。**SEO 缺口现 48 格**。

- **10-21 第十三轮（Markdown 族收口两格：md→JSON、md→Excel，68 → 70 张页）。** 这一轮真正值得记的是
  **只读评审派一次拦下四处错账**，全部落在「写得太满」的那一类句子上：① 「`##` 是 `<h2>` 的唯一来源」错——
  setext 式下划线标题与文档里直接写下的 `<h2>` 同样进键位，而真正让配对可预测的事实是「包装文档不插入任何标题」
  （`utils/core/html-document.ts` 的模板只有 `<title>` / `<style>` / `<body>`）与「按**出现顺序**配对」；
  ② 「值一律是字符串」只对表格那一步成立，代码块回退走 `JSON.parse`、类型是文档本来写的，两处收窄成
  「表格那一步的值」；③ `Sheet1` 与「Excel 打开时自己再猜一遍」被删——前者是 SheetJS 读取默认名、仓库里
  没有实测记录，后者是对消费端软件行为的断言，都改写成产物侧事实；④ 公式护栏要写成「产物中该格的值确实以一个
  ' 开头」，不能写成 Excel 的显示行为。
  三处补测把改完的句子重新钉住：`z = '@'` 在写出的 `xl/styles.xml` 里就是 `cellXfs` 的 `numFmtId="49"`
  （对 `xlsx@0.18.5` 现测，此前只有注释背书）；marked 的 GFM 表头确实渲染成 `<thead>` 里的 `<th>`；
  json→csv 写的 UTF-8 BOM 确实被 `TextDecoder` 剥掉（`ef bb bf 61 2c 62` 解出 3 个码点）。
  `-42` 因 `DECIMAL_SHAPE` 允许前导 `-` 先被判成数字、不吃前缀，`+33` 不是十进制形状、留文本并被加护栏——
  这条顺序（先取数后护栏）写在 `csv-to-xlsx.ts:45-47`，页里按它写，不按「危险前缀一律加引号」的想当然写。

  两条 hub 摘要（md 的 json、md 的 xlsx）按镜像规则摘除，复核后与新页一致，属正常清理，**不计入前十轮那四条
  无本机证据的断言**。四镜像齐备（`docs/llms.txt` 的 md→JSON 那句随 ② 一起收窄）。验证：`pages:render`
  **87** 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 × **92** 文档）、`lint:all`、`build`、
  产物层 `verify:offline` / `verify:remote-code`、`verify:meta` 全 rc=0，`.output` 里搜不到两个 slug。
  只动站点数据源与生成页，不碰运行时，断言数仍 **452**，素材不重拍。**SEO 缺口现 46 格**。

- **10-21 第十四轮（TXT 族两格：txt→JSON、txt→CSV，70 → 72 张页）。** 两条页共用同一个诚实核心：**这条路认的不是
  「文本」，是「碰巧存成 `.txt` 的 JSON」**——`txt>html` 把整段包进 `<pre>`，`html>json` 在没有表格时读第一个 `<pre>`
  的 `textContent`，所以类型是解析出来的类型（数字、布尔、`null` 保持原样，与表格那条一路是字符串正好对照），
  而注释 / 尾逗号 / 单引号那三种「看起来像 JSON」一律如实报错，不把原文包成一个字符串装作成功。一条随带的
  机制事实值得记：`\n` 在第一步变成 `<br>`，`textContent` 不还原行分隔符，**排版不带着走**，但 JSON 语法不依赖
  换行，所以照常解析——属于「同一个函数在两条链上的两种后果」那一类，写法上只报机制不报轮次。20 位整数在
  `JSON.parse` 那一刻就可能变科学计数，页里把要保字符的用户指回 CSV / Excel 那两条按值取数的路。
  txt→CSV 三条按代码写：表头是键名并集、缺键留空格；无键元素进合成 `_value`（记录自己用了 `_value` 时退到
  `_value_2`，见 `valueColumnFor`）；`[]` 与 `[{}]` 抛错而不是产出只有表头的文件。为什么不按行猜列，FAQ 给的判据是
  「猜列要先猜分隔符，制表符 / 多空格 / 逗号 / 竖线都可能在同一个文件里，猜错整列错位」——不是「我们做不到」，
  是「猜错比不猜更糟」。**SERP 预算第五次退回英文描述**（165 与 164 字符），改写到 160 内才让渲染通过。

  hub 那侧摘除 txt 的 `csv` 与 `json` 两条摘要（复核后与新页一致，属正常镜像清理，**不计入前十轮那四条无本机证据
  的断言**），txt 的 `xlsx` 摘要保留——那一格还没有页。四镜像齐备。验证：`pages:render` **89** 文件、`pages:check`
  逐字节一致、`verify:numbers`（23 事实 × **94** 文档）、`lint:all`、`build`、产物层 `verify:offline` /
  `verify:remote-code`、`verify:meta` 全 rc=0，`.output` 里搜不到两个 slug。断言数仍 **452**，素材不重拍。
  **SEO 缺口现 44 格**。

- **10-21 第十五轮（json→Markdown、html→Excel，72 → 74 张页）。** 这一轮的价值在**又抓到一条先于本页存在的
  对外错账**并把它替换掉：hub 里 `json.md` 那句写着「对象、数组与标量变成**标题、列表或代码块**结构」——
  中间那步 `json>html` 产出的其实只有 `div` / `span` / `details` / `summary`，Turndown 对没有规则的标记
  只摘标记留文字，所以产物里既没有 `#` 也没有 `-` 更没有围栏。判法不是推理而是**直接量**：把查看器那一层
  真实形状的标记喂给本仓依赖的 `turndown`（Node 里就能跑，不需要 DOM），实测输出
  `Object(2)` / 空行 / `{` / 空行 / `"a": 1,` / 空行 / `"b": "hi"` / 空行 / `}`——一行一段、键与顺序都在、
  缩进不在（层深由 CSS `margin-left` 表达）。新页把「不会生成文档结构」写成核心事实，并在 notes 与 FAQ 里
  把要管道表的用户指回 HTML→Markdown 与 Excel→Markdown。
  `html→Excel` 一格则全部沿用今天已经量过的四条：值保真规则（十进制形状 + `String(Number(x)) === x` +
  有效数字 ≤ 15）、`z = '@'` 在写出的 `xl/styles.xml` 里就是 `numFmtId="49"`、并集列与缺键空格、
  多张表（含嵌套表）撞「只接受数组」那道闸、产物单 sheet 且表名沿用读取结果。

  两条 hub 摘要按镜像规则摘除，其中 `json.md` 那条是**被替换的错误主张**，`html.xlsx` 那条复核后与新页一致。
  四镜像齐备。验证：`pages:render` **91** 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 ×
  **96** 文档）、`lint:all`、`build`、产物层两条离线守卫、`verify:meta` 全 rc=0，`.output` 里搜不到两个 slug。
  断言数仍 **452**，素材不重拍。推送时遇到一次 `HTTP/2 stream 1 was not closed cleanly`（exit 128），
  按既有办法改 `-c http.version=HTTP/1.1 -c http.postBuffer=1` 重试一次即成功，并用 API 核实远端 sha。
  **SEO 缺口现 42 格**。

- **10-21 第十六轮（json→PNG、json→JPG，74 → 76 张页；页面与本轮记账同一笔提交）。** 这一格的价值在把
  **路由里的显式取舍写成用户读得懂的区别**：同一份 `json>html` 查看器，PNG 走 `html>png` 得到一张整页长图，
  而 JPG 走 `html>pdf → pdf>jpg` 得到 A4 分页——不是实现顺带的后果，而是 `html-to-png.ts` 上那句
  `edgePreference: 10` 与 `html-to-pdf.ts:14` 的注释写明的选择（`html→png→jpg` 只会交回一条按页面宽度排布的
  长带）。第二条真实后果是**只损失一次**：中间那份 PDF 的页面是逐页 `toDataURL('image/png')` 嵌进去的无损位图
  （`html-to-pdf.ts:75`），压缩只发生在最后交给 JPEG 的那一次。第三条与 PNG 共享：整页高度上限 32768 px
  （`MAX_CANVAS_EDGE × 4`）超限报错，因为远超时浏览器交回的是空白画布——「成功但全白」比一条错误难查得多。
  PNG 页里的两条「不承诺」也照实写：图里没有可复制的文字、不承诺能再解析回 JSON；质量档对无损的 PNG 不起作用，
  能调的是最长边与目标尺寸（`clampQuality` / `clampMaxEdge` 在编码处再钳一次，因为它们也会从存储里来）。

  hub 摘除 json 的 `png` 与 `jpg` 两条摘要（复核后与新页一致，属正常镜像清理，**不计入前十轮那四条无本机证据的
  断言**）。四镜像齐备。验证：`pages:render` 93 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 ×
  98 文档）、`lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code`、`verify:meta` 全 rc=0。
  运行时零改动，断言数仍 **452**，素材不重拍。**SEO 缺口现 40 格**。

- **10-21 第十七轮（md→PNG，76 → 77 张页；页面、四镜像与记账同一笔提交）。** 这张页把「排版是谁决定的」讲清楚：
  `md>html` 之后进图的是 `wrapHtmlDocument` 自带样式表的形状——正文最大宽度 800 px、`border-collapse` 表格每格 1px 实线、
  表头与偶数行各带浅底、代码块是浅灰圆角块、`h1` 带下边线（逐条对 `utils/core/html-document.ts` 的 `DOCUMENT_CSS`），
  `html>png` 只负责把这份文档整页捕获成无损 PNG。第二条是本仓特有的正向事实：行内 SVG 图形不会被删，因为净化用的是
  html + svg + svgFilters 三套 profile（`md-to-html.ts` 里那段注释记的就是「曾经只用 html 把整张图删掉」）。反向的三条
  边界照实写：指向网络与相邻路径的图片取不到字节（渲染前剥子资源引用，替换处留虚线方框、结果卡按张数披露）、整页高度
  32768 px 超限报错、图里没有可复制的文字。FAQ 那条「把图片放进同目录也绕不过」说的是「剥的是引用不是文件」——这是
  用户最容易误读成 bug 的形状。`markdown` hub 的 `png` 摘要块按镜像规则摘除——就是它被守卫拒绝的那一格：本轮第一次跑 `pages:render` 时报「hub targets describes png, which is not an open target without a pair page」，我先把它当成「没有块」，是报错本身纠正了我。
  四镜像齐备。验证：`pages:render` 94 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 × 99 文档）、`lint:all`、
  `build`、产物层 `verify:offline` / `verify:remote-code`、`verify:meta` 全 rc=0，`.output` 搜不到新 slug。运行时零改动，
  断言数仍 **452**，素材不重拍。**SEO 缺口现 39 格**。
- **10-21 第十八轮（csv→Word、csv→PNG，77 → 79 张页）。** 这一格又推翻**两条先于页面存在的 hub 主张**，都出自同一次实测：
  用本仓 `xlsx` 在 Node 里跑 `sheet_to_html`（`raw: true` 与不加 raw 各一份），产物**每一行都是 `<tr><td …>`，没有 `<thead>` 也没有 `<th>**
——于是 csv hub 那句「首行是表头」不成立，csv→Word 页里改成「第一行不带表头语义，想要标题行外观请在 Word 里勾或自己套样式」；同一份实测还显示
不加 raw 时 `2024-01-05`写成`data-t="n" data-v="45296.33383101852"`而显示文本是`1/5/24`，加 raw 后 `data-v` 与显示文本都是原字符。
第二条被推翻的是「宽表整体缩放以适应画布」：`DOCUMENT_CSS`里表格是`width: 100%`+`border-collapse`、正文 800 px 且 `word-wrap: break-word`，
所以宽表是**挤窄换行**而不是缩放，页里照这个写；顺带把「条纹按行序落、第一行是白底」这条从两处实测合出来的结论写明（没有 `<th>`，而样式表的浅底挂在 `<th>`与`:nth-child(even)`上）。
csv→Word 的另一组事实回读自`html-to-docx.ts`：正文以 MHT altChunk 内嵌 ⇒ 排版归 Word；`stripRemoteResources`在净化之后跑（Word 会在用户机器上解析这段标记，
远程`<img>` 就是别的程序发出的跟踪像素，落在 CSP 与离线守卫都看不见的位置）；内联 SVG 必须在净化**之前**栅格化（`html`profile 没有任何 svg 标签，
曾经失败成「有效的空 .docx + 批次报成功」）；打包失败报`errors.docxGen` 而不交出打不开的文件。

  四镜像齐备。SERP 预算这一轮拦下 csv→PNG 的英文描述（165 字符），删掉开头的 "The table is" 才放行。实测计数写进账而不是预测：
  `pages:render` 96 文件、`verify:numbers` 23 事实 × 101 文档、`pages:check` 逐字节一致、`lint:all`、`build`、产物层 `verify:offline` /
  `verify:remote-code`、`verify:meta` 全 rc=0，`.output` 里搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。
  **SEO 缺口现 37 格**。

- **10-21 第十九轮（对第十八轮的更正：只读评审推翻 4 类句子，其中一类被我复制到三张页）。** 提交 `e6bdb8b` 之后照例派只读评审逐句对实现查真伪，它推翻的四条我都复核过源码才改：
  ① **「CSV 只有一个工作表」说成绝对**——读取器先看内容再看后缀，正文其实是 HTML 时多张 `<table>` 会变成多个工作表，而 `workbookToHtmlBody` 在多 sheet 时给每张表前面写一个 `<h2>` 表名，所以那句从「保证」改成「按 CSV 字节解析时」并补上那一支；
  ② **「能调的是最长边与目标尺寸」对 PNG 是错的**——`LOSSY_MIME_TYPES` 只含 jpeg/webp（`image-utils.ts:43`），目标体积追逐那一支对 PNG 直接 early-return（`:111-112`），面板也用 `isLossyImageFormat` 不给 PNG 摆质量档（`output-options.ts:34-38,98-100`）；
  ③ **「宽度固定」把排版宽度说成了像素宽度**——`RENDER_WIDTH=800` 固定的是排版，画布像素宽度按内容高度取 `pixelRatio` 2x / 1.5x / 1x（`html-raster.ts:306-311`），所以长的表反而更稀；这一条与更早那页里已经写对的「高度超过 2000 px 用 1.5 倍、超过 4000 px 用 1 倍」是同一事实，现在三页说法一致；
  ④ **替 Word 叙述行为**（「能像其他 .docx 一样打开」「Word 只会把第一行当成普通行」「Word 打开时不会去取文档外的东西」）——本仓只量自己的字节，这些改成产物侧说法（OPC 容器 + altChunk 内嵌 ⇒ 排版归打开它的软件；远程引用打包前剥净 ⇒ 文档内不含需要联网解析的子资源；打包抛错或返回非 Blob 时报转换错误）。
  ①③④各一处，②是**同一句被复制到 json→PNG、md→PNG、csv→PNG 三页**——这类「一句写对就到处贴」的复件是评审最划算的地方，也是一次改动必须按出现次数断言的替换（本轮用带 expected-count 的补丁脚本，命中数不符就不写盘）。

  验证（改的就是被提交的那棵树）：`pages:render` 96 文件、`pages:check` 逐字节一致、`verify:numbers`（23 事实 × 101 文档）、`lint:all`、`build`、产物层 `verify:offline` / `verify:remote-code`、`verify:meta` 全 rc=0。运行时零改动，断言数仍 **452**。

- **10-21 第二十轮（csv→JPG、xlsx→PNG，79 → 81 张页 / 缺口 35）。** 这两格把「图片出口」一族的说法收口一致：
  csv→JPG 讲清**路由取舍 + 只损失一次**（中间那份 PDF 的页面走 \`toDataURL\` 的 PNG 那一条，压缩只在最后交给 JPEG 那次发生；同为图片目标，PNG 拿整页长图、JPG 与 WebP 走 PDF 分页，因为一条按页面宽度排布的超高长带在分享与打印两场景都难用），
  并明确「质量与目标体积的档位在这一格才存在」——这正是第十九轮被推翻那句的反面（\`LOSSY_MIME_TYPES\` 只含 jpeg/webp，PNG 一路编码器忽略目标体积、面板也不摆质量档）；
  xlsx→PNG 讲清**多 sheet 的产物形状**（\`sheet_to_html\` 一表一工作表、多于一个时每个前面加 \`<h2>\` 表名，于是整篇文档一次捕获成一张按簿内顺序堆起来的长图）、**日期的确定形态**（\`cellDates\` + \`XLSX_TEXT_DATE_FORMAT\` +
  \`normalizeDateCells\`：纯日期 \`2024-01-05\`、带时间 \`2024-01-05 14:30:00\`、作者自定格式被尊重、没有显示文本的日期格不替它编造），以及**密度按高度降档**（>2000 px 用 1.5x、>4000 px 用 1x）。
  「宽表整体缩放以适应画布」这一说法在 csv 与 excel 两个 hub 里都出现过，本轮随摘要一起摘掉，换成排版宽度与像素宽度的区分。

  四镜像齐备。实测计数写入账而不是预测：`pages:render` 98 文件、`verify:numbers` 23 事实 × 103 文档（与「文件数 = 页数 + 17、文档数 = 页数 + 22」再次吻合）、`pages:check` 逐字节一致、`lint:all`、`build`、产物层
  `verify:offline` / `verify:remote-code`、`verify:meta` 全 rc=0，`.output` 搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第廿一轮（对第廿轮的更正：只读评审又推翻 6 类句子，其中一类同时存在于已推送的 json→JPG 页）。** 逐条回读源码后改掉：
  ① **「JPEG 对 1px 边框与 12px 小字先付出代价」「字看起来发软」没有本机取证**——仓库里记录过的只有文件体积那组数（\`html-to-pdf.ts\` 的注释），把 FAQ 整条换成「质量与目标体积这两个档位在这条路上各做什么、
  为什么字会变软有两种来路」（\`LOSSY_MIME_TYPES\` 只在 JPEG/WebP 用它们、追逐顺序是先降质量再缩尺寸）；② **「单张超长图在聊天与打印里都难用」是开发者理由而不是事实**，两处（csv→JPG 与 json→JPG）都改成路由事实：
  同分图片终点由 \`edgePreference\` 排序（\`html>pdf\` 0、\`html>png\` 10，小的排前面）；③ **32768 px 那条边界被我写成「单页高度」**，实际量的是整篇文档一次渲染成的那块画布，A4 分页是在它之上切的（\`html-to-pdf.ts\` 自己也要过这一关）；
  ④ **「格子里写的标记按标记处理」是错的**——实测 \`sheet_to_html\` 转义单元格文字，只有 \`cell.h\`/\`cell.l\` 才产出标记（链接变成真 \`<a>\`），且这条链的净化跑两次（\`data-to-html.ts:40\` 与 \`html-raster.ts:256\`），
  连带 ⑤ **xlsx→PNG 那句「远程图片按张数披露」在这条路上是空话**（工作簿转出的 HTML 里根本不会有 \`<img>\`），删掉；⑥ **「长簿子的字比短页面小一圈 / 更软」是观看结论**，改成产物事实（一块 CSS 像素对应的设备像素从 2 降到 1），
  以及 **「Excel→PDF 里密度是可调档、多 sheet 各自成段」两处都不成立**——\`html>pdf\` 只按排版高度切且不读 \`dpi\`，密度档只对以 PDF 为输入的转换有效。

  替换继续用带 expected-count 的补丁（第 1 批 17 条全中；第 2 批 25 条中 24、第 3 批 6 条，未命中的那条是我凭记忆猜的旧措辞，grep 出原文后才改对）。实测计数写入账：`pages:render` 98 文件、`verify:numbers` 23 事实 × 103 文档。
  全链 rc=0（render/check/numbers/lint:all/build/两条产物层离线守卫/meta），运行时零改动，断言数仍 **452**。

- **10-21 第廿二轮（html→JPG、md→JPG，83 张页 / 缺口 33）。** 两格把「图片出口」的最后一族补齐，措辞全部按第廿一轮那份负面清单写：
  分页形状说成路由事实而不是使用场景（\`edgePreference\`：\`html>pdf\` 0、\`html>png\` 10，小的优先），并且把「为什么这样路由」的出处交给 \`html-to-pdf.ts:11-16\` 那段注释——它明说走 PDF 是 feature（多页文档要的是页边界），
  真正的缺陷是**两次 JPEG 编码**、已在源头修成 PNG 切片；画质论一律删掉，换成「最后那道编码有损，质量与目标体积是它的档位（先降质量再缩尺寸）」；**密度档明确不归这两格调**（中间那份 PDF 按默认密度转图，滑杆只对以 PDF 为输入的转换有效）；
  透明铺白写成画布按 \`#ffffff\` 生成这一产物事实。新增加的一条正面事实：\`html>pdf\` 的页数是按 A4 毫米比例从画布尺寸算的（页高 = 画布高 × 210 ÷ 画布宽、每 297 mm 一页向上取整），所以「一页一图」不是近似说法而是算法。

  hub 摘除 html 的 `jpg` 与 markdown 的 `jpg` 两条摘要（复核后与新页一致，属正常镜像清理）。四镜像齐备。实测计数：`pages:render` 100 文件、`verify:numbers` 23 事实 × 105 文档（关系仍成立：100 = 83 + 17、105 = 83 + 22）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta` 全 rc=0，`.output` 搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第廿三轮（对第廿廿二轮的更正：83 张页 / 缺口 33）。** 评审这次给的多数是「说满了一半」的类别，改完比原句更有用：
  ① **密度那条我写成了「这一格调不到」——不够准**：面板确实只对以 PDF 为输入的转换摆滑杆，但 \`optionsForStep\` 把 \`dpi\` 转发给每一步，
  \`useConversion\` 取存储快照时也不清它，所以**上一批 PDF 转换留下的密度值会作用在这条链中间那份 PDF 上**；三处（html→JPG、md→JPG、xlsx→PNG 的 FAQ）统一改成「没设过时按默认 144，留下的值会被带进来」。
  ② **虚线方框只是两种形状之一**：被替换的引用画方框、只在克隆那一步失败的（解不开的 \`data:\`/已 revoke 的 \`blob:\`）直接留空——两处 FAQ 与一处 limits 补齐这半句（这也是 AGENTS 里早就写明的那条）。
  ③ **「控件不会进图」是错的**：复选框就是被画进去的（marked 发 \`<input type=checkbox>\`、样式表给它边距），改成「控件会被画进图里，但图里没有任何可响应的东西」。
  ④ **「超长代码行会溢出面板而不折行」没有取证**，而样式表同时有正文的 \`overflow-wrap: break-word\` 与 \`pre\` 的 \`overflow-x: auto\` 两条作用在不同元素上的规则——改成把两条规则摆出来、不预判结果。
  ⑤ **透明铺白的原因不止一个**（画布 \`#ffffff\`、每页嵌入前再铺一次、JPEG 无透明度）；⑥ **等高片段那句**：只有最后一片按剩余高度收；
  ⑦ **「被压扁的一条长带」形容 PNG 不准确**（那是全分辨率长画布），改成「一条长带」；⑧ **md→JPG 开头那句「对面的渲染器会把表格排歪」是使用场景理由**，改成产物事实。
  ⑨ **不执行的机制写准**：不是「用 DOMParser 所以不跑」，而是净化删可执行标记 + 渲染 iframe 只给 \`allow-same-origin\`、没有 \`allow-scripts\`。

  补丁仍带 expected-count（32 条中 31、随后按 grep 出的原文补 1 条；两条按新 wording 再补）。实测计数写入账：`pages:render` 100 文件、`verify:numbers` 23 事实 × 105 文档。
  全链 rc=0；运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第廿四轮（html→WebP、md→WebP，85 张页 / 缺口 31）。** 两条链的最后一步由同一个工厂 `createPdfToImageConverter` 造出（JPEG 与 WebP 是它的两个实例），所以产物形状抄自已被实测过的 JPEG 两页：一页一图、两页以上 ZIP、成员名 `page-N.webp`、切片是 PNG、有损只发生在最后那一次。差异只在容器归属：`LOSSY_MIME_TYPES` 同时含 jpeg 与 webp，因此质量与目标体积这两档在这里确实存在（与 PNG 那几页正好相反）。
  本轮唯一新写的主张是把话收回去：html hub 与 markdown hub 的 WebP 摘要各写着「相片类内容体积更小 / photographic pages get smaller」，而本机从没做过同一份文件在两个容器下的体积对照——那句随摘要摘除，页里 FAQ 明说「不宣称谁更小，拿自己的文件各跑一次比字节数」。密度一句按第廿三轮更正后的口径写：这一格不摆滑杆（面板只对以 PDF 为输入的转换给它），但存储里的 \`dpi\` 会随每一步带走，未设时是默认 144。
  SERP 预算这一轮拦下 markdown→WebP 的英文描述（161 字符，超 1），改写成「a ZIP when several」后放行——**它是当天第六次退回我的英文措辞**，也是第一次只超一个字符：预算是字符级的，不是大概级的。

  另完成一次阈值清扫：把数据源里所有「数字+单位」的出现次数拉出来与源码常量对过——`(px*72)/96`（`image-pdf.ts:40`）支持全部「96 dpi 换算」的说法；`maxEdge` 实际档位是 `[4096,2560,1920,1600,1280,800]`（`OutputOptions.vue:98`），与页里「最长边可缩到 800–4096 px」一致；44 处 `8192 px` 除 html→PNG 那处已修正的混淆外都在讲单边上限/重采样；100 MB、20 MB、6 个最近目标、12 套预设、200 页合并均对得上。**结论：类阈值错误只找到那一处，已修。

  四镜像齐备。实测计数：`pages:render` 102 文件、`verify:numbers` 23 事实 × 107 文档（关系仍成立）、`pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta` 全 rc=0，`.output` 搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第廿六轮（docx→CSV、docx→Excel，87 张页 / 缺口 29）。** 这两格是站点上「Office 之间」那一族里搜索量最高的两个说法（word to excel / word to csv），
  每一句都对着实现写：\`docx>html\` 的 styleMap 是显式列出的（Heading 1-4 → \`h1\`-\`h4\`、Title/Subtitle → 带 class 的 \`h1\`/\`h2\`、Strong/Emphasis、\`ul/ol/li\` 重开），内嵌图片经 \`mammoth.images.imgElement\` 读成 data URI；
  **正文取不到时有第二条路**——\`extractAltChunkHtml\` 从 MHT 里恢复，而本扩展自己写的 .docx 正是那种容器，所以 HTML→Word 与 Word→HTML 构成一对可来回的形状；两条路都空才报 \`errors.docxEmpty\`，与打不开的 \`errors.docxParse\` 分开。
  取数与落地全部沿用已实测的规则：首行给键名（**不看原文是否把首行标成标题行**）、并集列与缺键空格、合成 \`_value\` 不静默少行、值保真三条件、16 位以上留文本并钉内置格式号 49、多张表（含嵌套表）撞「只接受数组」闸。

  随摘要摘掉的两句错账：docx hub 的 xlsx 摘要写「首行是表头」（同 csv hub 那条一个性质，中间那步并不产出标题行语义），csv 摘要写「合并单元格按解析后的网格展开」（实际被 \`colspan\`/\`rowspan\` 覆盖的位置根本不产生值，那一行的列会左移——与新页写的相反）。

  四镜像齐备。实测计数：`pages:render` 104 文件、`verify:numbers` 23 事实 × 109 文档（关系仍成立）、`pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta` 全 rc=0，`.output` 搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第廿九轮（txt→Excel、docx→JPG，89 张页 / 缺口 27）。** 两格各自带一条「只有这条路能给」的正面事实：
  txt→Excel 把「文本得是合法 JSON 数组」这个成立条件写满四步（`<br>` 不进 `textContent`，所以排版不带着走而 JSON 照常解析；回退只看第一个 `<pre>`；对象过不了数组闸；超长整数在 `JSON.parse` 那一步就成双精度、
  链子按逐字节规则把它留在文本——说的是「如实标注的近似值」而不是「保住每一位」）；docx→JPG 的正面事实是**内嵌图片会出现在产物里**（`mammoth.images.imgElement` 把图读成 data URI 带进 HTML），这正好是 Word→TXT/CSV 做不到的那件。
  两页都把今天新立的两条限定主动写进去：`MAX_PDF_IMAGE_PAGES = 200`（docx→JPG 的 limits 第一条）与「脚注引用会以 `[1]` 留在值里、`w:ins` 被当正文读出」。
  分页归浏览器排版、Word 的页面设置没有对应物这句也照写，并给出「要 Word 自己的分页就请在 Word 里导出 PDF 再走 PDF→JPG」这条出路。

  英文侧另记一笔：docx→JPG 的描述原本 163 字符，渲染前按 SERP 预算先削到 154（当天第八次退回，这次是我主动预削）。四镜像齐备，txt 的 xlsx 与 docx 的 jpg 两条 hub 摘要按镜像规则摘除。
  实测计数：`pages:render` 106 文件、`verify:numbers` 23 事实 × 111 文档（关系仍成立）、`pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta` 全 rc=0，`.output` 搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第卅轮（jpg→HTML、jpg→Markdown，91 张页 / 缺口 25）。** 这两格挑的是「image to html / image to markdown」这类高频问法，而且卖点正好是**反着说**：
  这条链**不读像素**，所以不会有 OCR、不会有编造的内容描述——一个完全离线、不带模型也不上传任何东西的扩展做不到那一类事，页里把它写成首要边界而不是含糊带过。
  正面事实全部回读自 \`image-to-html.ts\`：\`jpg>html\` 是一步直连，文件字节经 \`FileReader.readAsDataURL\` 原样进 \`<img>\`，**不解码也不重编码**（与图片转图片那几路先上画布再压一次形成对照），所以像素逐字节相同、体积约 4/3；
  \`alt\` 与 \`title\` 都取 \`documentTitle\`（去扩展名的主干、无名时 \`converted\`）并按属性位置转义。jpg→Markdown 的产物用本仓 \`turndown\` 实测为一行
  \`![主干](data:…;base64,… '主干')\`，且 \`html>md\` 只取 \`doc.body.innerHTML\`，所以 \`<head>\` 里那份样式表不会漏进产物。

  四镜像齐备；jpg hub 的 `html` 与 `md` 两条摘要按镜像规则摘除（复核后与新页一致，其中「没有 OCR」那句本来就是那两页的核心）。实测计数：`pages:render` 108 文件、`verify:numbers` 23 事实 × 113 文档
  （关系仍成立：文件 = 页 + 17、文档 = 页 + 22）、`pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta` 全 rc=0，`.output` 搜不到两个 slug。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第卅一轮（只改散文：独立核查翻掉那两页的七处说法）。** 上一轮写完派了只读核查，抓出的都不是拼写而是事实，逐条回读或实测后才改：
  ① 体积那句从「约 4/3」改成**可复算的公式**——每三字节写四字符，另加约 2.7 KB 固定外壳（`<style>` 里那份文档 CSS 与标签；按本仓 `formatSize` 的 1024 口径实测外壳 2,716 B、源 5.0 MB 产出 6.7 MB HTML）。
  合成的小输入（几十字节）没写进页，因为真实 JPG 没那么小，那句话复现不了。
  ② 「很大的图在窗口里缩放显示」不精确：`body` 是 **content-box** 的 `max-width: 800px`，2rem 内边距不占这 800，1400 px 窗口里图的实际显示宽度量得 798.75 px，所以句子改成「最多到版心约 800 px，窗口更窄才跟着缩」。
  ③ 删掉「SVG 那条路上『打开即请求』在这里没有对应物」——`utils/converters/svg-to-html.ts:38` 早已在写出前跑 `stripRemoteResources`，对照根本不成立，两条都不发请求。
  ④ 删掉两处「若原文档里还有段落，Turndown 会把它们留在两侧」：`jpg>html` 的 `body` 里只有那张 `<img>`，那是从别的页抄来的**不可达分支**。
  ⑤ 「照片转文字与完全离线互斥」说过头了（本地 OCR 存在）：改成「本扩展不带模型与语言包；本地跑的识别工具与这里无关，要把图传上去的那种才意味着文件出了本机」。
  ⑥ 两张新页各补一条别的页都有的闸门：一批最多 200 个文件、单个 100 MB（keeps 由四条变五条，中英对齐）。
  ⑦ 顺带翻掉三处兄弟页的**适用场景错账**：jpg→HTML 与 png→HTML 把「邮件正文 / 邮件模板」列为去处，而主流邮件客户端拦 `data:` 图片；SVG→HTML 列了「邮件正文预览」。三处把邮件从用途清单里摘掉，两张位图页另在 limits 里明写「不适合邮件，请用外链图片或邮件自己的附件」。

  本轮零运行时改动、零新页（仍是 91 张页 / 缺口 25），四镜像与 hub 未动。实测计数：`pages:render` 108 文件、`pages:check` 逐字节一致、`verify:numbers` 23 事实 × 113 文档、`lint:all`、`build`、
  产物层两条离线守卫、`verify:meta` 全 rc=0。断言数仍 **452**，素材不重拍。

- **10-21 第卅二轮（再一轮只改散文，核查员抓到八处、本轮改掉七处）。** 先更正上一轮记账里的一处错数：
  `jpg>html` 的外壳不是 2,716 B——那个数把 23 字符的 `data:image/jpeg;base64,` 前缀算进了外壳。逐字节复算是 **2,695 B**，
  按 `formatSize` 渲染成 **2.6 KB**，而且它**不固定**：文件名在 `<title>`、`alt`、`title` 各出现一次，随名字长度增减。
  页面上三处（lede / limits / faq，中英各三）与本页记账一起改口。5.0 MB → 6.7 MB 那句经复核仍成立。
  其余六处：① png→HTML 的「`alt` 取源文件名」漏了**去扩展名**这一半（`documentTitle` 会剥掉后缀）；
  ② 「主流邮件客户端会拦 `data:` 图片」说过头——Apple Mail 与 Thunderbird 会渲染，改成「网页端邮件客户端（Gmail 便是）会剥掉，
  能不能显示由收件端决定」；③ 「塞进 Markdown 笔记或 README，移到别处仍显示」对**托管站**是空头承诺（GitHub 一类会剥 `data:` 图地址），
  改成本机与自己的编辑器预览，并写明别人家由那边决定；④ 六张 Word 族页面上「内嵌图片会跟着过去」全部补上**类型白名单**
  （`png / jpeg / gif / webp / bmp / avif / ico`，读自 `html-sanitize.ts:83`）：白名单外（TIFF / EMF / WMF）在 `docx>html` 就丢了 `src`，
  渲染族会换成虚线方框并按张数计入丢弃（`html-raster.ts:116` 的 `carriesOwnBytes` 判空即换），不渲染族那一格直接空着且**不计数**；
  ⑤ 「JPG→Word 走同一条内嵌路」是错的——`html>docx` 会把 data URI 从 altChunk 提成包里独立的图片部件并重写引用，
  `.docx` 里没有 data URI（判据在 `scripts/e2e-test.mjs:2262-2266` 那段注释与被钉住的载荷）；
  ⑥ SVG 页「要进 Word 或 PDF 会**先**栅格化」步序错：`svg>pdf` 第一步就栅格化，而 `svg>docx` = `svg>html` → `html>docx`，
  栅格化发生在第二步。
  还记下两处**已知未改**：SVG 页「净化后什么都不剩才报错」经复核是半对（`<svg>` 外壳使全 `<use>` 雪碧图非空 → 照样交付空白页），
  本轮只把中文那条限定清楚、英文侧与 faq 待下轮；jpg→Markdown 尚未补邮件那条对称披露。
  零运行时改动、零新页（仍 91 张 / 缺口 25）。

- **10-21 第卅三轮（把上一轮挂账的两笔散文改掉，无新数字）。** ① SVG→HTML 的 limits 第 3 条英文侧补齐中文那条限定：
  「净化后什么都不剩才报错」只在整份文件一个字不剩时成立；全 `<use>` 的雪碧图净化后 `<svg>` 外壳仍在、串非空，所以 `svg-to-html.ts:24` 的
  `!cleanSvg.trim()` 闸不触发，产物照样交付、只是画不出东西——这与同页第 4 条原本就是同一件事的两侧，改完不再互相打脸。
  复核过该页 faq 不复述这句（全仓 grep「空白页面 / blank page」在这页只命中 limits 两条），所以中文侧不必再动。
  ② jpg→Markdown 补上与邮件同形的那条对称披露：`data:` 图片能否显示由收件端决定，网页端邮件客户端与一些托管站会剥掉它，
  那种场合请用外链图片（limits 由五条变六条，中英对齐）。
  实测计数：`pages:render` 108 文件、`pages:check` 逐字节一致、`verify:numbers` 23 事实 × 113 文档、`lint:all`、`build`、
  产物层两条离线守卫、`verify:meta` 全 rc=0。改动面就三个文件（数据源 + 两张生成页），运行时零改动、断言数仍 **452**、素材不重拍。

- **10-21 第卅四轮（png→Word、jpg→Word，93 张页 / 缺口 23）。** 先把缺口算准：路径基线里 182 格中 39 格是 `null`（不可达），
  **可达 143**；可写目标 11 种，`conversion-policy` 再屏蔽 27 格（6 种图片 → txt/json/csv/xlsx = 24，PDF → json/csv/xlsx = 3），
  得**界面提供 116**，减去 93 张页 = **23 格**——这与对外印的 143 / 116 两个数字自洽，之前的「182 减 27」是错的口径。
  这两格挑的是「png/jpg to word」这类高频问法，核心事实只有一条、但很少有人说得准：
  `html>docx` 的打包器会把 `<img>` 上那条 `data:` **从标记里提出来写成包里独立的 base64 媒体部件**并重写引用，
  所以产物 `.docx` 里没有 data URI 残留、Word 渲染这张图不需要任何一次取数（判据不是注释，是 `scripts/e2e-test.mjs:2262-2266`
  那条用夹具专属载荷钉住的用例，它专门避开通用 PNG 头、防止「图被吃掉仍绿」）。
  文档体则是 altChunk：排版与分页由 Word 打开时决定，本扩展不产出原生段落——这条同时写进 limits 和 faq，
  因为「Word 打开时提示在转换」是那类用户一定会问的事。内层那份文档 CSS 的版心是本轮早些时候实测的约 800 px，
  所以显示尺寸写成「由内层 CSS 与 Word 页面共同决定」，不假装本扩展能控制。
  两条被刻意**不写**的主张：`.docx` 的体积（部件是 base64 再进 zip，没量过就不写）、以及任何「Word 一定能正确渲染 altChunk」的
  消费端断言（只说由它决定）。jpg 侧另把「不做 OCR」放在 limits 第一条与 faq 第二条，因为它最常被误期待成「照片转文字」。
  png hub 与 jpg hub 的 `docx` 摘要按镜像规则摘除（jpg hub 的 `targets` 摘完变空对象，渲染守卫接受这个形状），
  四镜像同批改：`docs/index.html` 的 `.pairs` 网格、`docs/llms.txt`、`docs/convert/index.html` 与 sitemap 由渲染生成。
  实测计数：`pages:render` **110 文件**、`verify:numbers` 23 事实 × **115 文档**（关系仍成立：文件 = 页 + 17、文档 = 页 + 22）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。运行时零改动，断言数仍 **452**。
  一条踩过的工具链坑记在这：`docs/llms.txt` **没有 prettier parser**，把它列进 `prettier --write` 会让整条 `&&` 链在它那里静默短路——
  render 一次都没跑、而后续 `;` 分隔的门禁照样报绿。llms.txt 只能手改（单行一条），prettier 只喂 `.mjs` 与 `.html`。

- **10-21 第卅五轮（gif→HTML、gif→Markdown，95 张页 / 缺口 21）。** 这两格的正面事实只有一条，但它是**这批里少见的「反着说」**：
  这条路**不丢帧**。`gif>html` 与图片转 HTML 的其他几位共用同一个转换器（`image-to-html.ts`，`FileReader.readAsDataURL` 把整份文件原样编进 data URI），
  既没取首帧也没重编码，所以动图的每一帧、每一段扩展块都还在负载里；真正会丢帧的是 `image-convert.ts` 那几条（它们取首帧重编码，
  并且正是它们调用 `hasMultipleFrames` 在结果上写明丢了几帧——这句现在也写进页面，作为对照而不是含糊带过）。
  另一条边界按今天立的规矩写：**字节完整 ≠ 一定播放**。是否播、循环几遍由打开这份 HTML/`.md` 的那一侧决定，页面只承诺数据侧、不替消费端担保；
  `data:` 图片能否显示同理由收件端决定（网页端邮件客户端与一些托管站会剥掉），这条也进了 Markdown 页的 limits。
  **顺带翻掉一条先于本批存在的 hub 错账**：gif hub 的 `docx` 摘要原本写着「写入 Word 的是首帧位图，动画丢失」——
  但 `gif>docx` 的链是 `gif>html` + `html>docx`（路径基线现读），全程不重编码，帧根本不会丢，而且那条 data URI 会被提成包里独立的图片部件。
  这正是「hub 摘要与配对页是两份独立 prose、没有任何守卫比对」的那类账：本批把 md / html 两条摘要按镜像规则摘除（页面已建），
  `docx` 那条改写为「原字节进包、帧一段不少、播不播由 Word 决定」，`webp` 那条经复核仍成立（`gif>webp` 确实取首帧）故保留。
  实测计数：`pages:render` **112 文件**、`verify:numbers` 23 事实 × **117 文档**（关系仍成立：文件 = 页 + 17、文档 = 页 + 22）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0；四镜像齐备（sitemap、
  `docs/convert/index.html`、`docs/index.html` 的 `.pairs` 网格、`docs/llms.txt` 各点名一次）。运行时零改动，断言数仍 **452**，素材不重拍。

- **10-21 第卅六轮（只改散文：核查员对两张 Word 页复核 14 条，翻掉 6 条过度主张）。** 先记好消息：它**实跑了打包器**
  （Node 24 直调 `html-docx-js-typescript` 的 `getMHTdocument` / `asBlob`）验出本批四条核心主张成立——`.docx` 内不残留 data URI、
  媒体部件里的负载与原文件**逐字节相同**、`<style>` 随包进 altChunk（所以「版心约 800 px」那句站得住）、引用确实被重写。
  翻掉的 6 条全是**替消费端说话**或**没有取证来源**那一类：
  ① 两处 faq 问句把「Word 打开时会提示在转换」当既定事实（全仓没有任何打开 Word 的观测，e2e 只读产物字节），改成条件句
  「如果它给了转换提示……」，答句把渲染归到阅读器那一侧并明说本扩展无法预见它说什么；
  ② 「能交给任何读 Word 的程序」——这个包靠 `aFChunk` 与 MHT 的 `Content-Location` 内部解析，LibreOffice / Google Docs 均未测，
  改成「其它程序怎么读这份 altChunk，由那一侧决定」；
  ③ 「这条最常被问的是……」——完全离线、无埋点，没有任何问题频次数据，改成「最容易被误会的是」；
  ④ jpg limits 第 3 条中英**指向相反且都错**（中文说改走 Word→HTML、英文说改走 HTML→Word），而两条都造不出文字层
  （`html>docx` 只把同一张 `<img>` 写进 altChunk，`docx>html` 也只回取那张 `<img>`），统一成「请在 Word 里补；本扩展没有任何路线能从图里读出文字」；
  ⑤ 「不会交出一个打不开的 .docx」——唯一守卫是 `result instanceof Blob`，全包没有 OOXML / MHT 合法性校验，「打不开」无从判定，
  改成「不会交出一个半成品」（中英 lede 与 limits 共四处同改）；
  ⑥ 「也不会去找你原来的照片路径」——重写后的引用恰是一个绝对假路径 `file:///C:/fake/imageN.png`（库内 `utils.ts:12`），
  不认 MHT 内定位的阅读器真会去试它，这句反而可能说反；删掉，只说「引用读的是包里那一份」。
  页数与数字类主张不变（仍 95 张 / 缺口 21；`pages:render` 112 文件、`verify:numbers` 23 事实 × 117 文档）。

- **10-21 第卅七轮（bmp→HTML，96 张页 / 缺口 20）。** 这一页的正面事实是**同一种源在两条路上形态相反**：
  `bmp>html` 是搬运（`FileReader.readAsDataURL` 把原始字节写进 `<img src>`，不进画布），
  而 `bmp>pdf` 是**单步处理**（`bmp>pdf` 在路径基线里只有一步，不经 HTML）——解码后先 `fillStyle = '#FFFFFF'` 铺白底、
  再 `toDataURL('image/png', 0.92)` 重编码写入。这条链上有两处非显然的实现事实，都取自 `utils/core/image-pdf.ts` 的注释：
  ① 重编码是**选择不是限制**——jsPDF 4.2.1 自带 `processBMP`，但它强走 quality-100 JPEG、无视白底、不给质量旋钮，
  写出的流比源文件还大；② 页面尺寸按像素推（`px × 72 / 96`）而不是 A4，这与 docx→JPG 那条「切 A4 一页一图」正好相反，
  两页措辞已分开。体积方向也如实写：BMP 常无压缩、base64 再放大 4/3，所以**这一路不会变小**，
  要变小或要白底都该走 PDF 那条（图像流按 'FAST' 压缩存放，注释里记着未压缩存储曾把 PNG 页面撑到源的 9.5–95.6 倍）。
  另两条边界同时进页：`data:image/bmp` 在 `html-sanitize.ts:83` 的白名单内（所以再走一步 Markdown 不会被剥），
  而 BMP 在这套界面里**只能作输入**（浏览器不提供编码器）。
  顺带把 bmp hub 的 `docx` 摘要改掉：原文「Word 对 BMP 支持良好、体积随原文件」是替消费端说话且没取证，
  换成第卅六轮那张 Word 页同款的产物侧说法（data URI 提成包内图片部件、其它程序怎么读由那一侧决定）；
  `html` 摘要按镜像规则摘除。**仍留一笔未查证**：bmp hub 的 `webp` 摘要写着「白底不会被写入」，
  而画布分支看着是铺白底的，二者待下轮实测 `bmp>webp` 产物再判。
  **同轮补记（已查证，无需改）**：`utils/converters/image-convert.ts:50-53` 的白底是**只在 JPEG 出口**铺的
  （注释原话「For JPEG, fill white background (no transparency support)」，`fillStyle='#FFFFFF'` 在 `if` 里面），
  WebP 与 PNG 出口都不铺——所以 bmp hub 那句「白底不会被写入」方向是对的，不是错账；
  而 `utils/core/image-pdf.ts:139-140` 的白底是**无条件**铺的（WebP / BMP / GIF 三种源都走那条），
  两句看着冲突其实各自说的是不同的路：`bmp>webp` 一步（不铺白）与 `bmp>pdf` 一步（铺白后重编码成 PNG 流）。
  第卅七轮那张 bmp→HTML 页里「要白底请走 BMP→PDF」因此成立，而不必改成「图片转图片那几页」。

- **10-21 第卅八轮（bmp→PDF，97 张页 / 缺口 19）。** 这一页的三条正面事实全部取自 `utils/core/image-pdf.ts` 的注释与代码，
  而且第卅七轮那条「同一种源两条路形态相反」在这里闭合：`bmp>pdf` 是**单步处理**（不经 HTML），解码后先铺白底、按 PNG 数据 URL
  （质量参数 0.92）写入；页面尺寸由像素按 `px × 72 / 96` 推、方向随宽高，**混合方向逐页声明自己的尺寸**——这与 Word 族「切 A4 一页一图」
  是两种不同的东西，两页措辞已分开（那边是文档分页，这边是图片装页）。重编码写成「**选择而不是限制**」：jsPDF 4.2.1 自带 BMP 分支，
  但它强走 quality-100 JPEG、无视白底、不给质量旋钮、写出的流比源文件大。体积这一格**方向反过来**且如实标注为不写数字：
  BMP 常无压缩而 PDF 里图像流压缩存放（同一处注释记着未压缩存储曾把 PNG 页面撑到源的 9.5–95.6 倍），所以这是 BMP 诸出口里
  唯一通常会变小的一条。合并模式的 200 页上限与「任一张失败整组不产出」也写进 limits/faq（`MAX_MERGED_PAGES`，BMP 在 `MERGEABLE_IMAGE_FORMATS` 里）。
  另两处刻意改口以避免过度主张：notes 里 BMP→PNG 只说「那条路上只有 JPEG 出口铺白底」（不写「透传」——BMP→PNG 仍要过一遍画布，
  透传是 PNG 源进 PDF 那条的做法），以及 faq 里「A4 与缩放到纸张」明确答「都没有，纸张是文档层的事」。
  **工具链老坑第四次踩到**：数据源里写代码片段时不能用裸单引号——`fillStyle = '#FFFFFF'` 与 `toDataURL('image/png', 0.92)`
  两处把 `pairs.mjs` 直接解析炸掉（prettier 报 `Unexpected token, expected ","`，连带 `lint:all`、`verify:numbers`、`verify:meta` 一起红，
  而 `build` 与 `verify:paths` 照样绿——因为它们不解析这份数据源）。改法是换成词（「把 `fillStyle` 设为白色」「PNG 数据 URL（质量参数 0.92）」），
  不要试 `\'`：用 Edit 写转义容易落成 `\\'`，反而更坏。**判据**：任何一次 `pages:render` 之前先跑 prettier，它比守卫更早暴露这类语法问题。
  实测计数：`pages:render` 114 文件、`verify:numbers` 23 事实 × 119 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0；
  生成物整目录暂存 + `git archive HEAD` 隔离树重跑 `render --check` 自证。运行时零改动，断言数仍 **452**。

- **10-21 第卅九轮（svg→Word 一张 + 核查员对 gif/bmp 三页翻掉 7 条，98 张页 / 缺口 18）。**
  svg→Word 这页的主张全在「**哪一步变位图**」：`svg>docx` = `svg>html` + `html>docx`（基线现读），第一步**不栅格化**
  （`svg-to-html.ts:21-23` 用保留 svg 与 svgFilters 的配置），位图化发生在第二步——`html-to-docx.ts:29-36` 先把内联 SVG
  经 `replaceInlineSvgWithPng`（`svg-embed.ts`：剥活动性内容→规范化尺寸→画布→PNG 数据 URL，`fitToMaxDim` **只缩不放**）
  换成 `<img>`，**再**净化。顺序写成页面上的因果：html profile 里没有 svg 标签，先净化就会把用户的图形连同可执行标记一起删掉、
  产出一份合法但空白的 .docx 而界面报成功。第三条是用户可见的：`svgRasterized` 由转换器返回、经 `useConversion.ts:775` 上抛、
  在 `ResultDownload.vue:357-360` 单独成行显示，所以「这次把矢量变位图了」不靠用户自己想到去看分辨率。
  **核查员这一轮翻出的最有价值的一条不是措辞而是机制**：`FileUpload.vue:386` 从 ZIP 解包出来的文件是
  `new File([data], base)` **不带 type**，于是 `readAsDataURL` 出来的前缀是 `data:application/octet-stream`，
  它不匹配 `html-sanitize.ts:83` 的图片白名单，`html>docx` 的 `stripRemoteResources` 会把 `src` 整个删掉——
  同一张图在「用户直接选文件」与「从 ZIP 解包」两种来源下，进 Word 的结果**不一样**。
  gif/bmp 页原先写的「类型在白名单内，所以再往下一步不会被剥」因此改成带前提的说法，并给两张 Word 页各补一条 limits 说明这一形。
  其余六条：① 丢帧枚举漏了 GIF→PDF（`image-pdf.ts:113` 的 GIF 分支同样调 `hasMultipleFrames`、:206 回传 `lostFrames`），四处补齐；
  ② Markdown 页「拷走单个 .md 也还能显示」与同页 limits「能否显示由收件端决定」互斥，改成「还能带上图」；
  ③ faq 末句「…才是真正会丢帧的那一步」反向暗示本工具不丢帧，改成「在本工具之外又多丢一次帧的一步」；
  ④ bmp→Markdown 的 notes 缺显示警示（同站 bmp hub 已写「多数阅读器不认 BMP 的 data URI」），按同口径补上；
  ⑤ 「比同画面的 PNG 大一个数量级」没有取证，改成不带倍数的方向说法（越平差距越大、越接近噪声差距越小）；
  ⑥ keeps 第 5 条「本扩展不提供拼图功能」只在中文侧存在，英文补齐。
  另外把 svg hub 的 `md` 摘要里「SVG 先栅格化成 PNG 再嵌入 HTML」改掉——`svg>md` 的链是 `svg>html`+`html>md`，
  第一步不栅格化，那句与同页第卅六轮的改口自相矛盾；`docx` 摘要按镜像规则摘除。
  **数字门又拦下一次**：新页 title.en 61 字符超 60 预算，`pages:render` 直接拒写（改短后 56）。
  实测计数：`pages:render` 115 文件、`verify:numbers` 23 事实 × 120 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。运行时零改动，断言数仍 **452**。

- **10-21 第四十二轮（再加三格：webp→HTML、webp→Markdown、bmp→Markdown，101 张页 / 缺口 15）。** 这批把位图搬运族剩下的三个高频格补上，
  并且**顺带查出一个真的产品缺口**（不是措辞问题）：`utils/core/animated-image.ts` 的说明写明它的量测范围**只有 GIF**——
  动图 WebP 的 `VP8X` ANIM 位与 APNG 的 `acTL` 都不在里面，而 `image-convert.ts:22` 的 `lostFrames` 正是
  `from === FileFormat.GIF && hasMultipleFrames(...)`。于是 **WebP→PNG / JPG 这类会取首帧的路线现在丢了多少动画并不告诉用户**：
  丢帧是真的，披露是没有的。三条相关的页面文案因此都按「限制写明」处理（webp→HTML 的 limits 第 2 条、webp→Markdown 的 limits 第 2 条
  与 notes 第 2 条、以及两页 faq 里的原话「帧检查目前只覆盖 GIF」），修代码本身**不在本轮做**——它会改变用户可见的提示与
  e2e 断言计数，属于需要单独确认的行为变更，已单独立项。
  另外三条正面事实：WebP 带 alpha，而搬运路线不重新采样，所以透明原样保留（对照 WebP→JPG 那一趟会把它合成掉）；
  搬运路线**没有取首帧这一步**，动图 WebP 的每一帧都在负载里；BMP 则是「最难看的组合」——源常无压缩再乘 base64 的 4/3，
  且 BMP 的 `data:` 图片在很多阅读器里根本不画，所以那页把「位置是空的未必是转坏了」直接写成 faq 第一条。
  三页都带今天立的类型前提：`data:image/webp` / `data:image/bmp` 在白名单内**且仅当类型被浏览器认出**，
  从 ZIP 解包的文件不带类型、前缀是 `application/octet-stream`，往 Word 走一步就会被剥。
  记账同步：webp hub 的 md / html 摘要与 bmp hub 的 md 摘要按镜像规则摘除（webp hub 的 `targets` 摘完是空对象，守卫接受）；
  四镜像同批补齐。数字门这一批又拦两次：`bmp-to-md` 的 `desc.en` 185 字符超 160（削到 154），
  `webp` hub 摘除时先撞了一次锚点不匹配（上一轮删掉 `html` 之后 `md` 的邻居已经变了），按现文重读后才改对。
  实测计数：`pages:render` 118 文件、`verify:numbers` 23 事实 × 123 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。运行时零改动，断言数仍 **452**。

- **10-21 第四十三轮（再加一格：png→Markdown，102 张页 / 缺口 14）。** 这一页的主角是**透明**：`png>html` 不重新采样也不上画布，
  所以 alpha 与像素都是原样，而 PNG→JPG 那一趟会把它合成到白底上（`image-convert.ts:22` 的白底条件只对 JPEG 成立，本轮已复核）。
  产物经 Turndown 实为**一行图片语法**、`body` 里只有那张 `<img>`、head 里的样式表不参与序列化。
  三条限制照今天的规矩写明：显示由收件端决定（网页端邮件客户端与一些托管站不画 `data:` 图片）、体积按 base64 上浮且整段挤在同一行、
  以及类型前提——从 ZIP 解包的文件不带 MIME 类型，前缀会是 `application/octet-stream`，这一路不受影响，但同一种字节再往 Word 走一步会被剥 `src`。
  记账：png hub 的 `md` 摘要按镜像规则摘除（该 hub 的 `targets` 摘完是空对象），四镜像同批补齐。
  实测计数：`pages:render` **119 文件**、`verify:numbers` 23 事实 × **124 文档**（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。
  运行时零改动，断言数仍 **452**，素材不重拍。剩余 14 格：docx(json,webp) xlsx(jpg,webp) csv(webp) txt(png,jpg,webp) json(webp)
  bmp(docx,webp) gif(docx,webp) svg(md)——其中图片族的 `→webp/jpg` 全部是「先到 PDF 再从 PDF 出图」的三步链（`html>pdf` + `pdf>webp`），
  这是下一批文案最该讲清的一条反直觉事实。

- **10-21 第四十四轮（docx→WebP、xlsx→JPG，104 张页 / 缺口 12）。** 这两格写的就是上一条预告的那件反直觉事：**文档转图片中间真的产出一份 PDF**
  （`docx>html` + `html>pdf` + `pdf>webp`；`xlsx>html` + `html>pdf` + `pdf>jpg`，均为基线现读）。
  三个可证的具体点全部取自实现：`html-to-pdf.ts:33` 用 `new jsPDF('p','mm','a4')`（A4 纵向）、`:75-77` 每页 `toDataURL('image/png')` 后
  `addImage(..., 'PNG', ..., 'SLOW')`（**中间那一趟是无损 PNG 切片**，压缩档选的是省字节那一档）；`pdf-to-image.ts:127` 出图前把画布
  `fillStyle = '#ffffff'` 铺白底、`:133` 用 `encodeCanvas` 带上输出选项（所以质量/目标尺寸**只在终点生效**，整条链只量化一次）；
  `:37/:92-101` 是 200 页上限与「过长明确报 `errors.pdfTooManyImagePages` 而不是静默截断」；`:166-169` 明确 ZIP 条目名
  `page-N.jpg` 的 N 是**文档页号**（部分转换也对得上）。xlsx 侧还补了一条常被误会的安慰：这条路**不经过**「JSON 必须是数组」那一步，
  所以多张工作表不会被那道闸拦下（对照记忆里的 `html→csv/xlsx` 多表失败）。
  **本轮自犯并已纠正一个操作错误**：删 excel hub 的 `jpg` 摘要时按内容匹配，结果命中的是 **txt hub** 的 `jpg`（两条措辞相近、
  都提到 A4 分页），于是渲染守卫一次报出两件事——「excel 仍重复解释 jpg」与「txt 的 jpg 没有摘要了」。
  这条教训的形状与之前「按 slug: 'md' 去 awk 读到空」同源：**hub 摘要必须按归属 hub 定位再改，不能按措辞全局匹配**。
  修正方式：把 txt 那条原文按字节还原（`png` 与 `webp` 之间），再删 excel 自己那条。
  实测计数：`pages:render` **121 文件**、`verify:numbers` 23 事实 × **126 文档**（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。
  运行时零改动，断言数仍 **452**，素材不重拍。另：本轮把上一条提交里被我写错的两处轮次标题（「第卅轮」「第卅一轮」）改回
  第四十二、第四十三轮——提交信息本身已推送，不改历史，以这条记录为准。
  实测计数：`pages:render` 113 文件、`verify:numbers` 23 事实 × 118 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。
  这一轮按上一笔的教训**整目录暂存 `docs/convert`**，并在 `git archive HEAD` 的隔离树里重跑 `render --check` 自证。运行时零改动，断言数仍 **452**。

- **10-21 第四十五轮（只改散文：webp / bmp 三页核查翻掉 7 条，其中一条按核查员的改法反而会更错）。**
  最有分量的一条不是措辞：**`lostFrames` 是布尔值**（`utils/core/types.ts:43`），界面那句是固定文案
  （`utils/i18n/zh.ts:247` / `en.ts:232`），`animated-image.ts` 走到第二帧就返回、从不计数。所以「结果会写明丢了几帧 /
  says how many frames went missing」这一族句子在我写的四个页面上都不实（含 gif→PNG 的中文标题），
  统一改成「固定提示只保留第一帧、不报帧数」。其余：WebP→PNG **不铺白底**（`image-convert.ts:51-54` 的白底条件只对
  `image/jpeg`），原句把 PNG 那一半说反，已分开；bmp→Markdown 的「想要真正变小的出口是 BMP→PDF」补上
  「通常 / 幅度看内容 / 那一路会先铺白底」；两处 `an usually-uncompressed` 语法错；bmp→Markdown 的 faq 教的验证办法本身不成立——
  **浏览器打开 `.md` 只显示源码**（核查员实测 `contentType=text/markdown`、`img` 数量 0），改成贴进 `<img src>` 或看 BMP→HTML 的产物；
  webp→Markdown 的 faq 把「邮件正文」当「只收文本的地方」，与本仓对 `data:` 图片的既有口径自相冲突，换成工单 / 搜索索引。
  **需要记的判断**：核查员第 2 条给的改法（GIF→WEBP 保住动画但 alpha 会被铺白）与它自己贴的证据相互矛盾——代码里没有
  `image/webp` 的铺白分支，所以没照抄，只写代码支撑得住的说法。已经对的一条：gif→PNG 那页 limits 早写明
  「动 WebP 与 APNG 同样只留一帧，但本项目的丢帧提示目前只对 GIF 给出」，与任务 #27 同口径，不改。
  实测计数不变：`pages:render` 121 文件、`verify:numbers` 23 事实 × 126 文档、`pages:check`、`lint:all`、`build`、
  产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。运行时零改动，断言数仍 **452**。

- **10-21 第四十六轮（gif→Word、txt→PNG，106 张页 / 缺口 10）。** gif→Word 这一格专门纠一个反着传的常见说法：
  「GIF 进 Word 就只剩一张静态图」。**这条链不做取帧这一步**——`gif>html` 把整份文件的原始字节编成 data URI，
  `html>docx` 再由打包器把那条 `data:` 提成包里独立的 base64 媒体部件并重写引用（判据同 `scripts/e2e-test.mjs:2262-2266`
  那条夹具专属载荷用例），所以帧一段不少；而**播不播是 Word 那一边的事**，页面只承诺数据侧完整。
  与此对照着写的两条：GIF→PNG / JPG / WebP / PDF **必须**过画布、只剩一帧，且那句提示是固定的
  （`lostFrames` 是布尔值，界面从不报帧数——上一条刚改的那族错话）；gif hub 的 `docx` 摘要按镜像规则摘除。
  txt→PNG 讲的是**中间形态**：`txt>html` + `html>png` 两步到图片，是文字族里唯一不套 PDF 的形状
  （同族 Word/Excel/TXT→JPG 都是「先做一份 PDF 再逐页出图」的三步链），产出一张连续长图而非一页一页的纸；
  渲染走工作台同一套路径——净化后离屏排到 `RENDER_WIDTH = 800`、`pixelRatio` 按整页高度取档（越高取越低），
  高度超过 `MAX_CAPTURE_HEIGHT`（32768 px）时明确报 `errors.renderTooTall` 而不是静默截断。
  两条 faq 把「为什么和 Word 出来的图长得不一样」「图里的字能不能复制」直接答掉。
  txt hub 的 `png` 摘要按镜像规则摘除；四镜像同批补齐。
  实测计数：`pages:render` **123 文件**、`verify:numbers` 23 事实 × **128 文档**（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。
  运行时零改动，断言数仍 **452**。今天累计：配对页 91 → **106**、缺口 25 → **10**。

- **10-21 第四十七轮（只改散文：核查员对 docx→WebP / xlsx→JPG 复核 14 条、翻掉 7 条，其中 4 条是「这条链上根本碰不到」的机制错账）。**
  最重的两条属于**失败路径与功能可用性**：① 「文档过长会在出图那一步明确报『页数太多』」在这条链上**永不触发**——
  `MAX_PDF_IMAGE_PAGES = 200` 面对的是中间那份 PDF，而 html→pdf 在 32768 px 单次渲染上限下最多约 29 页（`32768 ÷ 1131`），
  真实失败是渲染步的 `errors.renderTooTall`（`utils/i18n/zh.ts:377` 与 `:363` 是**两条不同文案**，我把两条路混成一条）；
  ② 「ZIP 条目 `page-N` 在部分转换时也对得上页号」也碰不到——`ctx.pageRange` 只在**上传源是 PDF** 时才下发
  （`composables/useConversion.ts:585,768`、`components/shared/OutputOptions.vue:54,63,119`），文档源没有这个控件。
  ③ 「表格过宽会报错」不实：**只有高度有闸**，宽度没有任何检查，超出 800 版心的右侧列被静默裁掉
  （`html-raster.ts:297,302` 与 html-to-image 的捕获框 / viewBox 同宽）→ 改成「宽表请先拆列或走 Excel→PDF」。
  ④ 「中间那一趟不重新采样」说过头：整页确实按 `RENDER_WIDTH = 800` 加密度档重画一遍，正确主张是「**不做第二次有损编码**」；
  ⑤ 「脚注、批注、修订、文本框都不进中间那份 HTML」被 mammoth 实测推翻大半：脚注作为末尾列表进、`w:ins` 按正文读出、
  文本框内容照常成段，**只有批注不落**；⑥ 「条件格式的结果只是颜色」也不对——读取不传 `cellStyles`（`data-to-html.ts:73`），
  颜色同样不出现，且与同页「底色不进 HTML」自相矛盾；⑦ 「内嵌图片读成 data URI 所以会出现」缺白名单前提
  （TIFF / EMF / WMF 会被剥成占位框）。第 5、6 条的证据是核查员**内存构造 docx 跑 mammoth、实跑 `sheet_to_html` 出的真字节**。
  实测计数不变：`pages:render` 123 文件、`verify:numbers` 23 事实 × 128 文档、`pages:check` 逐字节一致、`lint:all`、`build`、
  产物层两条离线守卫、`verify:meta` 全 rc=0；`页数太多` / `pdfTooManyImagePages` 在数据源里 grep 已归零。运行时零改动，断言数仍 **452**。

- **10-21 第四十八轮（docx→JSON、gif→WebP，108 张页 / 缺口 8）。** docx→JSON 整页围绕**有几张表决定产出形状**这一条写：
  `doc.querySelectorAll` 取 `table` 命中**一张**时是对象数组（首行当键名），**两张及以上**时是按文档顺序分组的对象、
  组名取同级 `h2`、缺标题回落 `SheetN`（`json-to-html.ts:142,187-189`），**没有表**才退去读第一个 `<pre>` / `<code>` 的
  `textContent` 再 `JSON.parse`，两条都不成立就报 `errors.htmlToJson`（`html-to-json` 那一步，不是「没有表格结构」那句话）。
  并且把**下游连带后果**写在同一页：分组对象过不了「只吃数组」那道闸（`json>csv` 会拒），所以要多张表就一次转一张或改走不经过它的链——
  这正是记忆里那条跨转换器形状坑的正向用法。faq 里钉死三个细节：重复/空表头后者赢、`colspan` 只算一键、**多出的单元格在取表这步就丢**。
  gif→WebP 讲两条常被混为一谈的方向：它**确实丢动画**（一步 `gif>webp` 走 `image-convert.ts`，`drawImage` 只取一帧），
  但**不铺白底**——那层 `#FFFFFF` 只在终点是 JPEG 时画，所以 GIF 的 1 位透明带着 alpha 进 WebP，与 GIF→JPG 正好相反；
  并明确「提示是固定一句、界面从不报帧数」以及「要保动画走 GIF→HTML / Markdown / Word 那几条搬运路」。
  记账：word hub 的 `json` 与 gif hub 的 `webp` 摘要按镜像规则摘除，四镜像同批补齐。
  数字门这一轮又拦两次：docx→JSON 的 `desc.en` 161 → 削短；gif→WebP 的 `desc.en` 164 → 再削。
  实测计数：`pages:render` 125 文件、`verify:numbers` 23 事实 × 130 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。
  运行时零改动，断言数仍 **452**。
  **另记一处我自己造成的文档损坏**：这一轮的 ledger 追加把「- **10-21 第四十九轮（只改散文：核查员对 gif→Word / txt→PNG 复核 32 条、翻掉 8 条，其中一条是产品语义层面的错账）**
  最重的一条：**`<pre>` 根本不折行**。真机 Chrome 实测 `white-space: pre` 下 `clientWidth 734 / scrollWidth 2912`，超出 800 版心（内容盒 734 px）的长行不是换行而是被裁掉，
  而我原先在 limits 里写的是「长行会按这个宽度换行」——配上另一条「不会静默截断」，两句话合起来正好把这条链**唯一会静默丢内容**的方向讲反了。
  现改成「超过约 734 px 的长行会被裁掉而不是换行，请先自己拆短行」，并删掉「宽表格会被换行」（这条链的文档体只有一个 `<pre>`，根本没有表格）。
  其余七条：① 「TXT→PDF 不受单次渲染上限约束」错——`html>pdf` 用的正是同一个 `renderHtmlToCanvas` 与同一道 `MAX_CAPTURE_HEIGHT` 判定（`html-to-pdf.ts:26`、`html-raster.ts:302`），已改成「同一道上限，超长同样报错」；
  ② 「文字变图片里唯一不套 PDF 的形状」以偏概全——`md/json/csv/xlsx/docx/html→png` 全是两步不经 PDF（基线现读），现限定为 **TXT 这一族里**唯一；
  ③ faq1 把「Word/Excel 那几族」说成一页一张，实际只有以 JPG/WebP 收尾的路线才套 PDF，转 PNG 都是同类两步；
  ④ desc 的中文写「一步到图片」与本页 lede「两步」自相矛盾（基线两条边），已统一成两步；
  ⑤⑥ Word 侧的两处过度主张收窄：打包器改写后的引用是绝对假路径 `file:///C:/fake/imageN.gif`（库内 `utils.ts:14-19`），所以「读的都是包里那一份 / 照样显示」这类话只能说成「引用指向包内部件」；
  剥掉 `src` 后 `<img>` 仍带着 `alt` 与 `title`（= 文件名），说「那一格空着」也是对 Word 渲染的断言，已改成「不生成部件、显示什么由打开它的程序决定」。
  ⑦ 引用行号纠偏：钉住载荷的断言在 `scripts/e2e-test.mjs:2271-2275`（2263-2270 是注释），且那枚夹具载荷是 1×1 **PNG**——GIF 只是因为提升逻辑与 MIME 无关才顺带成立，本轮已把三处引用改成 2271-2275 并在此注明。
  核查员同时用真字节证实了另外三条：无类型 File 经 `readAsDataURL` 得 `data:application/octet-stream;base64,`、正常 `.gif` 得 `data:image/gif;base64,`、
  直接喂 GIF data URI 给打包器确实产出独立的 `Content-Type: image/gif` base64 部件且产物内无 data URI 残留。
  实测计数不变：`pages:render` 125 文件、`verify:numbers` 23 事实 × 130 文档、`pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。运行时零改动，断言数仍 **452**。

- **10-21 第五十轮（txt→JPG、txt→WebP，110 张页 / 缺口 6）。** 这两格把第四十九轮那批教训当成硬约束写：
  **长行不折行**（`<pre>` 超约 734 px 内容区是被裁掉，宽度无闸）直接进两页的 limits 与 faq 第一条，不再写「按版心换行」；
  **高度才是闸**（32768 px → `errors.renderTooTall`，TXT→PDF 同一道），并据此写明「这条链的中间 PDF 排不到几百页，
  出图那一步的页数上限在这里碰不到」——正是上一轮被核查抓出的那条混淆，这次主动写对；页码选择只在源是 PDF 时存在，所以两页都注明
  「没有选页这一步」。形状上「一页一张的纸」与 TXT→PNG 的连续长图相对，终点唯一一次有损量化、白底来自渲染器写死的
  `backgroundColor`（`html-raster.ts:7,309,312`）。
  实测计数：`pages:render` 127 文件、`verify:numbers` 23 事实 × 132 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0；
  生成物整目录暂存 + `git archive HEAD` 隔离树 `render --check` 自证。运行时零改动，断言数仍 **452**。今日累计 91 → **110** 张页、缺口 25 → **6**。

- **10-21 第五十一轮（bmp→Word，111 张页 / 缺口 5）。** 这一格复用第卅六与四十九轮真字节验证过的机制（打包器把 `<img>` 上的 data URI 提升成包内独立媒体部件、提升逻辑与 MIME 无关），
  并把三条边界写在同页：体积**只随源文件上浮**（BMP 常无压缩 + base64 4/3，要小就走会重编码或压缩存放的路）；
  **类型前提**（ZIP 解包无 MIME 类型 ⇒ 前缀是 `application/octet-stream` ⇒ 不在图片白名单 ⇒ 连部件都不生成，Word 里显示成什么由那一侧决定）；
  altChunk ⇒ 排版与显示尺寸归 Word。bmp hub 的 `docx` 摘要按镜像规则摘除，四镜像补齐。
  实测计数：`pages:render` 128 文件、`verify:numbers` 23 事实 × 133 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、`pages:check` 逐字节一致、
  `lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0；生成物整目录暂存 + `git archive HEAD` 隔离树 `render --check` 自证。
  运行时零改动，断言数仍 **452**。今日累计 91 → **111** 张页、缺口 25 → **5**。

- **10-21 第五十二轮（csv→WebP、xlsx→WebP，113 张页 / 缺口 3）。** WebP 族的表格两格按第五十轮的模板写：三步、中间一份 PDF、终点单次量化；
  四条硬规矩先落在页面上（宽度无闸⇒超约 800 px 版心的右列被裁掉不换行、高度有闸⇒32768 px 报 `errors.renderTooTall`、
  中间 PDF 排不到几百页所以页数上限不可达、无 pageRange）。xlsx 侧额外写明**多张表各有标题且不经过「只吃数组」那一步**，
  以及「样式与条件格式完全不进中间 HTML」（第四十九轮核查实测结论，避免与 Excel→WebP 自身的底纹说法自相矛盾）。
  csv / excel 两个 hub 的 `webp` 摘要按镜像规则摘除，四镜像补齐；`desc.en` 又被 160 预算拦下一次（182 → 削短）。
  实测计数：`pages:render` 130 文件、`verify:numbers` 23 事实 × 135 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、
  `pages:check` 逐字节一致、`lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0。
  运行时零改动，断言数仍 **452**。今日累计 91 → **113** 张页、缺口 25 → **3**。

- **10-21 第五十三轮（json→WebP、bmp→WebP，115 张页 / 缺口 1）。** json 这格的独特事实是**图里是查看器那一页**：一行一键值、`Array(n)` / `Object(n)` 摘要、语法着色，
  而**缩进是 CSS 不是字符**；查看器的预算触顶提示属于页面内容，因此会跟着进图——这是刻意的（半棵树冒充整份文档比一条报错更难查）。
  bmp 这格写的是 BMP 诸出口里唯一会降体积的方向（常无压缩的位图→有损容器），并把代价写在同一句：像素重画一遍、不再逐字节相同；
  同时纠正两处容易顺嘴说错的：不铺白底（白只在终点是 JPEG 时画，`image-convert.ts:51-54`）、常见 24 位 BMP 本来就没有 alpha，换容器不会凭空生出。
  两条 hub 的 `webp` 摘要按镜像规则摘除、四镜像补齐；`desc.en` 又被 160 拦一次（187 → 削短）。
  实测计数：`pages:render` 132 文件、`verify:numbers` 23 事实 × 137 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、`pages:check` 逐字节一致、
  `lint:all`、`build`、产物层两条离线守卫、`verify:meta`、`verify:paths` 全 rc=0；生成物整目录暂存 + 隔离树 `render --check` 自证。运行时零改动，断言数仍 **452**。
  今日累计 91 → **115** 张页、缺口 25 → **1**（仅剩 svg→Markdown，它需要先实测 Turndown 对内联 `<svg>` 的产出，两次 jsdom 探针都失败，不能凭猜写）。
  本轮另有一处**自我造成本**：用整行小节标题做锚点替换时忘了把标题写回 `new_string`，`## 3. 收下改动` 被吞掉过一次（第五十一轮也犯过同一样）。
  教训固定为**用标题做锚点时，new_string 必须原样带回那一行标题**，收口要 `grep -n "^## "` 数一遍小节前。上一次修复把这句教训本身错写成了一个 `## 3.` 开头的标题行，本条已把它折回正文，账本重新只有一个 `## 3.`。

- **10-21 第五十四轮（svg→Markdown，116 张页 / 缺口 0，覆盖收尾）。** 这格拖了两轮是因为必须先答「Turndown 拿内联 `<svg>` 到底产出什么」：直接喂一段 `<h1>` + 带 `<text>` 的 svg + 一个 `<p>`，实测得 `# T` / `hi there` / `after` 三段——**元素整个被丢，只有里面的文字漏出来**，而那条链真正的做法是第二步内部先跑 `replaceInlineSvgWithPng`（`utils/converters/html-to-md.ts:39`）把每个内联 SVG 画成 PNG 数据 URL、换成 `<img>` 再序列化，所以产物是**一行内联 PNG 图片语法**、`<svg>` 标记不会留在 `.md` 里。界面那句「已栅格化」的条件写成**产物里真的有 `data:image/png`**，不是照抄内部计数——图落在表格单元格里时 `gfmTable` 会把格子摊平成纯文本，那张图根本进不了 Markdown，照计数报就会误报。
  这一轮还抓出**渲染守卫自己的一处真缺陷**：矩阵那节比的是「渲染出来的链接数 == 格子数」，用的却是 `Map.get` 的原值——hub 锚点归零时它是 `undefined`，`undefined !== 0` 恒真，于是「116 格全有页」这个本该绿灯的状态被判成红灯（报错信息里两侧都印 0，看着像别的坏了）。改成两侧同用 `?? 0`，算术一字未动，只是让**零成为可表达的状态**；这不是放水，放水的是把那条比较删掉。摘除 svg hub 剩下的最后一条 `targets` 摘要后，它与其他 13 个 hub 同形成 `targets: {}`。
  同一轮把**独立核查在已上线四页上抓出的 9 条**全部按实现改回：① Word→Excel 是 `docx>html → html>json → json>csv → csv>xlsx` 四步，**同样经过** `json>csv` 那道闸，所以「多表就走去不经过那道闸的路线」那句是我编的，现在写成「多表文档转 Excel 在同一位置失败，没有绕得开的现成路线」；② 分组名是表与文档里的 `h2` **逐位配对**（第 N 张配第 N 个），配对用完才回落 `SheetN`（`json-to-html.ts:187-189`），不是「取同级小标题」；③ 无表时退的是**三档**——第一个 `<pre>`、第一个 `<code>`、整份 `<body>` 文字（:201-203），原先「两条都不成立」漏了我自己写下的第三档；④ mammoth 会把 Word 表格里**算好并存下的公式结果**作为文字带进来，「公式不在取数范围」错，改成「会进来但不重新求值」；⑤ `html>md` 把表格格子摊平成 `textContent`，所以「Word→Markdown 会带 colspan 进标记」错，只有 Word→HTML 会；⑥ GIF→HTML / Markdown / Word 三条确实不重编码，但「帧一段不少」要收窄成「帧都在文件里，播不播由读它的那一边决定」；⑦ 两张**英文 lede 里混进了中文片段**（`doc.querySelectorAll 取 table`、`mimeType 恰为 image/jpeg`），已发布过一轮，改成纯英文且不引入裸单引号；⑧ TXT 两页的「约 734 px 内容区 + 交给浏览器按 A4 纵向排版」两句都错——实测排版版心是固定的 800 px（`utils/core/html-raster.ts:7`），`<pre>` 减去自身内边距后文字区 **702 px**（右边缘约 718 px），A4 只存在于 `html>pdf` 的毫米映射（210 mm 宽、每 297 mm 一切，800 px 宽下约每 **1131 px** 一页）；⑨ 这两页原先都没写**页数决定容器**：单页出 `converted.jpg` / `converted.webp`，两页以上打包成 `converted.zip`、成员按文档页码命名 `page-N.*`（`utils/converters/pdf-to-image.ts:157-175`），各补一条 keeps。
  为 ⑦ 这类泄漏补了一条**可复跑的量具**：`node .test-tmp/prose-check.mjs` 把 116 条 `en` 字段全扫一遍找 CJK，顺带查 734、中英条目数与 `title.en` ≤ 60 / `desc.en` ≤ 160。现在只剩两处命中，都是**示例数据本身**（一份 CSV 表头样本、一段 alt 文本样例），不是没翻的正文。
  实测计数：`pages:render` **133** 文件、`verify:numbers` 23 事实 × **138** 文档（文件 = 页 + 17、文档 = 页 + 22 仍成立）、`pages:check` 逐字节一致，`lint:all` / `build` / `verify:offline` / `verify:remote-code` / `verify:meta` / `verify:paths` **六条全 rc=0**。运行时零改动，断言数仍 **452**。
  今日累计 91 → **116** 张页、缺口 25 → **0**：界面对用户实际提供的 116 个可选组合，现在每个都有自己那张「走几步、留什么、丢什么」的页面。

- **10-21 第五十五轮（散文更正轮：把「702 px」写成可复算的式子，并修好我自己那把会漏扫的量具）。** 上一笔把 TXT 页的宽度主张改成
  「实测 702 px」，但那仍是**读者复算不了的数**。这轮改成从 CSS 现推：`utils/core/html-document.ts` 写死 body
  `max-width: 800px` + `padding: 2rem` 且**没有 box-sizing 重置** ⇒ 在 800 px 版心里 body 的内容盒是 736；`pre` 块级填满它，
  自身 `border: 1px` + `padding: 1rem` ⇒ 文字区 736 − 2 − 32 = **702 px**（与上一轮 headless 量到的 offsetWidth 736 /
  clientWidth 734 逐格对上）。同时补上被漏掉的一半机制：`pre` 是 `overflow-x: auto`，所以超出的行尾**既不换行也不会被画进图里**
  ——三页原先都写成「被裁掉」，把「会滚但画不出来」说成了「静默截断」。
  **最贵的一条是量具自己说谎**：我为「英文字段混进中文」写的那个扫描器，`walk()` 在遇到数组时先返回、**没有检查数组里的字符串**，
  于是它报的「clean」是零扫描的假绿——第 54 轮那句「已无 734」就是它印的。`grep -n 734` 一跑就发现 `txt-to-png` 的两条 limits
  还停在旧数字上。修法是让字符串检查也吃数组元素，并把 14 个 hub 一起纳入扫描面（现在 116 pairs + 14 hubs 全走）。
  这是 [[verify-harness-lies-quietly]] 的又一个实例：**判据「扫过、零命中」必须先自证扫描真的触达了那一层**。
  另一条工具事实：`verify:numbers` 按「数字 + 关键词」的形状抓句子，我把一个宽度算式直译成「某个数字 + minus + 扣掉的几项」之后，
  它把那句读成**可达组合数（143）那一族**的引用并变红——所以算式句里不让那个词紧跟在数字后面（改成「把这几项从版心里扣掉」）。
  **把守卫的 offending 字符串原样抄进账本，会让账本自己变成它的命中面**：这条句子第一次就红在账本里，不在页面里。
  实测计数：`pages:render` 133 文件、`pages:check` 逐字节一致、`verify:numbers` 23 事实 × 138 文档，
  `lint:all` / `build` / `verify:offline` / `verify:remote-code` / `verify:meta` / `verify:paths` 全 rc=0。运行时零改动。
  **CI 回执（`472a6a6`，本轮收口时读回）**：三条 job 全绿——Lint & Type Check / Build Extension / E2E Tests 均 completed/success。
  上一笔 `96bcecf` 的 run 显示 `cancelled`：同分支连推会被取消，那是队列行为、不是失败，不要读成红灯。
  **覆盖收口后的结构自证（四条都是现量，不是推断）**：14 个 hub 的路由条目合计 **116**，且每条都带「有专页 →」链接
  （逐 hub：7+10+10+7+10+6+10+10+7+6+7+10+6+10）；`docs/convert/**` 生成页里 `id="to-` 锚点剩 **0** 个，
  而全站对 `/convert/<hub>/#to-<fmt>` 的入站链接也正好是 **0** 条——两边同时归零，没有悬空片段；
  配对页引用的 8 个静态资源（截图 / 图标 / `content.css`）**逐个存在**，新增的 `svg-to-md.html` 不是坏图页；
  索引矩阵里 `mx-open` 格子 **116** 个、全部指向配对页。

  本轮只动 `.github/` 与生成数据源，没碰 TS/Vue/运行时，所以按改动范围执行的验证是：`prettier --check`（该 md）+
  `verify:numbers` + `pages:check`；`lint:all`/`build`/产物层两条守卫在**上一笔提交里已经跑过并全 rc=0**，本轮没有让它们的结论失效。

- **10-21 第五十六轮（把「英文里不许混中文」从一次性脚本升进生成器）。** 上一轮那两条泄漏（`docx-to-json` 与 `gif-to-webp` 的
  英文 lede 里印着中文片段）是我**自己写在一个 gitignore 目录里的临时扫描器**发现的——它随目录消失，下一次同样的一步会重新发生。
  现在这条判据住在 `scripts/render-site-pages.mjs` 的 `assertEnglishIsEnglish()`，由 `validatePair` 与 `validateHub` 一起调用，
  所以 `pages:render` / `pages:check` / CI 的 lint job 从此都会拦它。**判据形状刻意不是一张例外清单**：CJK 只允许出现在
  **成对反引号之间**（那是引用样例产物唯一的地方——一份中文表头的 CSV 样本、一段 `alt` 文本样例），
  扫描面按 `` ` `` 切成偶数段（代码段之外）再看，例外不需要登记，因此不存在「登记表空/失效」那两种假绿。
  **牙齿是量过的**，三档：① 把中文裸插进某条 `desc.en` → `✗ gif-to-webp: Chinese inside an English string`（红在该红的那句）；
  ② 把中文包进内联代码 → **不再报中文**（那一轮只被 160 字 SERP 预算拦住，说明这条规则确实放过了合法形状）；
  ③ 真实数据树全绿，而它现在就有两处**合法的**反引号内 CJK（`csv-to-txt`、`jpg-to-md`）——即"通过"不是零命中。
  一个非显然的实现细节：字符类比 `　-〿` 收窄成 `、-〿`，因为 U+3000 作为**源码里的字面端点**会触发
  ESLint `no-irregular-whitespace`（`--max-warnings 0` 直接红），而单独一个全角空格不是正文、删掉它不损失任何检出。
  写这个正则时 `new RegExp('\\u3000-…')` 那类转义写法不可用（转义会被编辑工具解码成真字符），所以五个 CJK 区块用真实字符写端点，
  注释里点名每块是什么。
  本轮只动 `scripts/` 里这一个文件与这份账本：**没动扩展的运行时与打包输入**，所以按改动范围跑的是
  `eslint`（该文件 rc=0）+ `pnpm lint:all` + `pages:check`（133 文件逐字节一致，渲染结果与守卫加入前**完全相同**——
  这条是「守卫收紧但没有改变产物」的证据）+ `verify:numbers`（138 文档）。`build` 与产物层两条守卫未重跑，
  理由同上：`scripts/**` 不进 `.output/chrome-mv3`，字节也没变。
  **CI 回执（`6b490ee`）**：三条 job 全绿——Lint & Type Check / Build Extension / E2E Tests 均 completed/success。
  **本轮没跑成的检查（如实记账）**：第五十四轮派出的**逐句验真只读 agent 在跑了 130 次工具调用、37 分钟后中断**
  （`Model response interrupted`），它的 12 条判定清单**没有回来**，所以 `svg-to-md` 那张页的文案此刻只由我本人的取证支撑：
  ① 链形 `svg>md` = `svg>html` + `html>md`（基线现读）；② 栅格化预处理的调用点在序列化之前
  （`utils/converters/html-to-md.ts:39`）；③ 表格格子被摊平这一条**今天对着实现二次确认**
  （`:15-16` 的 `escapeCell` 取的就是 `cell.textContent`，而 `:74-75` 的代码注释自己写明「标志必须描述交回去的那份文件，
  因为 `gfmTable` 把格子摊平成 textContent，`<td>` 里的图形永远到不了 markdown」——页面那句「提示以产物为准」就是照这条写的）；
  ④ 裸 Turndown 对带 `<text>` 的 `<svg>` 丢元素、只漏文字（第 54 轮的 Node 探针）。
  **未由独立第二人复核过的**是那张页里其余的措辞（例如「渐变与滤镜留在矢量那半句」的完整覆盖范围、以及给读者的取舍建议）。
  下一轮要么重派一次范围更小的核查（一次 3–4 条，别把 12 条塞进一个 agent——这次就是被长度拖到中断的），
  要么把该页的 lede 再收窄到只剩上面四条已证事实。

- **10-21 第五十七轮（核查回执补齐 + 一条被漏掉的钳制披露）。** 上一笔把中断的核查员记成欠账，这次**把范围收到 4 条重派**，
  一次跑完没再断：`svg-to-md` 的四条主张**全部成立**，且每条都给了文件行号级证据——
  ① 基线 `svg->md` = `svg>html` + `html>md` 两步（`conversion-paths.json:174`），`svg-to-html` 不栅格化；
  ② 预处理在序列化之前（`html-to-md.ts:39` 对 `:45` 的 `new TurndownService` 与 `:72` 的 `turndown()`），
  换成的是 `src` 属性、`image/png` 数据 URL（`svg-embed.ts:42/:97`），`alt` 取 `<title>`（:100），实测一行 `![my title](data:image/png;base64,…)`；
  ③ 格子摊平属实（`escapeCell` = `cell.textContent`，:15-16），且 svg→img 发生在 table 规则之前，所以「格子里原本是 svg」照样被抹掉；
  ④ 标志是**产物侧**判断（`html-to-md.ts:77` 的 `svgCount > 0 && markdown.includes('data:image/png')`），
  消费链路 `useConversion.ts:775/791` → `ResultDownload.vue:212` → `:357-360`，中英文案（`zh.ts:248` / `en.ts:234`）
  说的是「已转成位图写进结果文件」，不带张数、不提帧——**与 `html-to-docx.ts:55` 仍用纯 `svgCount > 0` 形成对照**，
  那条差异本轮没写进任何对外页面，属下一轮可查的口径。
  **核查员带回一条我漏写的产物事实**：`svg-embed` 也走 `fitToMaxDim`（`svg-raster-common.ts:61-67`，
  `MAX_DIM` = `MAX_CANVAS_EDGE` = **8192**，`output-options.ts:21` / `image-utils.ts:5`），
  所以**这条路上超过 8192 px 的那一边会被等比缩下来，且没有任何提示**——页面原先只说「没有尺寸与质量开关」，
  没说这个钳制照样生效。已补进 `svg-to-md` 的 limits（中英各一条，条目数保持相等）。
  尺寸回落链也顺量清了：`width`/`height` 只认纯数字或 `px`（`100%` / `20em` 视为缺失）→ 回落 `viewBox` 的宽/高 → 再回落 `DEFAULT_DIM = 1024`。
  CI 回执：`6b490ee` 与 `4535438` 三条 job（Lint & Type Check / Build Extension / E2E Tests）均 completed/success。
  **上面那条「留给下一轮」的口径差异已经判完，结论是不是缺陷、不要收紧**：`utils/core/svg-embed.ts:108` 返回的 `svgCount`
  计的是**真的被换掉的那些**（`:83-95` 逐个栅格化，单个失败走 `catch` + `continue`，失败的那个既不计数也不替换），
  所以 `html-to-docx.ts:55` 的 `svgRasterized: svgCount > 0` 说的就是「产物里至少有一张真的位图部件」，与 e2e 钉住的
  那条提件用例同向。Markdown 那侧必须改成看产物（`html-to-md.ts:77`），是因为格子摊平发生在替换**之后**，
  计数器会留下「换过但被抹掉」的窗口；DOCX 这条没有那个窗口（altChunk 原样带着标记走）。
  **同一个标志两种算法不是不一致，是两条链的形状不同**——下次看到别急着把它们统一掉。

- **10-21 第五十九轮（发布态实测：就绪 ≠ 已公网）。** 把这三十七轮的成果放进**线上真实状态**里量了一次：
  `https://liaolongdong.github.io/transfer-any-file/sitemap.xml` 共 **40** 条 `<loc>`，其中配对页 **35**；
  `/convert/html/`（hub）与 `/convert/svg-to-md.html` 都回 **404**。`origin/main`（`9652ce7`）树里
  `docs/convert/*.html` 是 **36** 个文件，而 `feature-dev` HEAD（`832a52a`）是 **131** 个（116 配对页 + 14 hub + 索引）。
  **所以「站点已有 116 张页」目前是分支就绪态、不是公网事实**——差的不是技术，是一次 owner-only 的合并：
  `static.yml` 只在 `docs/**` 落到 main 时部署，**合 PR #24 那一下公网就从 35 张变 116 张**，不需要另跑发布。
  PR #24 现场判据：`mergeable=true`、`mergeable_state=clean`、ahead **85** / behind **0**、205 文件，
  HEAD 上三条 job 全绿。**顺序提醒（有坑）**：PR #23（1.3.0 准备，head `5c0b47f`、state open、`unstable`）
  若先合，`v1.3.0` 会打在 svg→Markdown、英文守卫、8192 钳制披露与那 9 条更正**之前**的内容上，
  Release 说明与 Pages 都拿旧文案；先 #24 再重新生成 Release PR 才覆盖到最新 HEAD。
  合并 #24 之后回手必须跑 `node scripts/repair-release-merge.mjs --check`——把 main 合回长期分支时
  两份 CHANGELOG 会被 `git merge` 静默合错且**没有任何门禁为此变红**（本仓已知陷阱）。
  CI 回执补齐：`832a52a`（HEAD）三条 job 全绿；`44322f7` 的 Lint 与 Build 绿、**E2E 是 `cancelled`**
  （同分支连推被取消，不是失败——这一格按队列行为记账，别读成红灯）。
  本轮只动这份账本，没碰数据源与运行时：按改动范围跑 `prettier --check`（该 md）+ `verify:numbers` + `pages:check`。

- **10-22 第六十轮（#24 已合入、站点真的上线）。** `gh pr merge 24 --merge` 落地于 17:46:22Z，main = **`283b0f6`**
  （merge commit：本仓 main 的历史一直是 merge commit，squash 会把攒批压成一笔、`scripts/release.mjs` 就没有提交信息可抽）。
  main@283b0f6 上 **CI 五条 check 全绿**（Lint & Type Check / Build Extension / E2E Tests / Prepare release PR / deploy），
  `Tag the approved release` 是 **skipped**——那是「标签要人批」的正常形状，不是红灯。
  **公网实测（不是本地推断）**：`sitemap.xml` 现含 **131** 条 `/convert/`、其中配对页 **116**；
  昨天还 404 的 `/convert/svg-to-md.html` 与 `/convert/html/index.html` 均回 **200**。
  也就是说 35 → **116** 这件事**已经完成**，「覆盖率」这条线到此为止，下一轮别再提「再补几张页」。
  `feature-dev` 已 `--ff-only` 追平到 `283b0f6` 并推送。**一条读数陷阱顺手记下**：那次追平后我跑
  `node scripts/repair-release-merge.mjs --check`，输出行尾的 `rc=0` 来自管道里的 `tail`，
  脚本本身是 `fatal: Invalid object name 'MERGE_HEAD'`——**它拒绝是对的**（快进没有合并现场，
  那条「两份 CHANGELOG 被静默合错」的陷阱只在双向分叉的合并里成立）。判据要读脚本打印的那句，不要读管道尾巴的退出码。
  **Release PR 还是旧的，且工作流给了官方重建路径**：#23 仍是 `head=5c0b47f`、`base=ff61868`、1 笔 bot 提交，
  body 写的是「统计区间 `v1.2.1..HEAD`，共 11 笔、收录 5」——**不含本轮 86 笔**。
  `release-prepare.yml` 在 283b0f6 那次运行的日志把它自己的两条 refusal 印得很清楚：
  ①「不覆盖、不重开：人很可能正在那个 PR 里补英文说明」→ 有开启的 `release/<TAG>` PR 时只报告并停下（`reason=pr-23-already-open`）；
  ②「分支还在但没有开着的 PR：本轮不推（避免 non-fast-forward）」→ 要人先删分支。
  所以重建动作是**两步共享状态写**：关掉 #23 + `git push origin --delete release/v1.3.0`，再
  `gh workflow run release-prepare.yml -f mode=prepare`（入参是 `mode`，选项 `prepare` / `tag`）。
  判「唯一份」时查过 ref：`5c0b47f` **只挂在 `release/v1.3.0` 上**，所以已把它的 patch（920 行）与 PR body（42 行）
  归档到 `.test-tmp/pr23-bump.patch` / `.test-tmp/pr23-body.md`；内容是 bot 可重生的，但**删分支与关 PR 仍等所有者点头**。
  同一批 ref 扫描还看到 `release/v1.2.1`（`8a34502`）与 `release/v1.2.2`（`fda6b02`）两条历史分支也还在，属同一类清理项。

## 3. 收下改动：这一节记的是提交账，不是提交计划

这一节原先给的是 2026-09-19 那一轮（配对页与博客页改成数据源生成）的两条 `git commit`。那些提交早就落地了，
所以它现在只记账：本轮写了什么、停在哪、还欠哪一笔。**别抄这里的数字，用下面两条命令现读。**

```bash
cd ~/code/chrome-plugins/transfer-any-file
git log --oneline origin/main..HEAD | wc -l          # 读到过：10-02 深夜 20，10-03 评审轮 26，命中率量完 29，纯文档收口 30，图片压缩这一笔落地 32
git rev-parse --short HEAD && git rev-parse --short origin/feature-dev   # 相同 = 分支已推平
```

这些提交分段如下（`git log --format='%h %ad %s' --date=format:'%m-%d %H:%M' origin/main..HEAD` 连时间一起读得到；
每段报的是写下它那一轮的笔数，总额用上面那条命令现读——把各段相加不等于今天的数）：

- **10-01 那一笔**（`5d19834`）：产品页自称的版本回填成 1.1.0。**第 4 节那条排序约束就来自它**。
- **10-02 12:36 三笔**（`15228b2` / `fd5848e` / `8c0e9ac`）：结果面板报出这一批的实际减量、配对说明页扩到
  35 张且每页发布日各自成立、`docs/security.txt` 落站点根，素材同批重拍。
- **10-02 19:40–22:12 十六笔**：本轮批准的三件（任务列表勾选与嵌套、PDF 书签进标题层、批次步进度与耗时）
  连同它们的红断言、素材、双语散文与收口；末尾两笔（`255a909` / `0faba3b`）是「批次快过 100 毫秒报
  `< 0.1 s`」这条读数与跟着重拍的素材。
- **10-03 评审轮五笔**：第 2 节末段那五处修复按「两处界面读数 / 一处逐行开销 / 重建工具 / 文档纠错 /
  运营文档」分开落，加上本节这段账。类型选 `fix`、`perf` 与 `docs`——`## [未发布]` 里有手写正文，
  `release.mjs` 走的是「原样提升」那条分支（`--with-commit-list` 没开），所以这五笔一条都不会变成新 bullet。
- **10-03 06:46–07:47 三笔**（`866aa3c` / `eee37b5` / `888fc00`）：把第 2 节「真实 PDF 这一格只取证了一半」量成了
  **7 / 63**，顺带证伪了一条看着像缺陷的线索（产物里没有 `cmaps/` 与 `standard_fonts/`，但三份文档的中日韩
  字符数一条没丢）。这三笔与紧跟其后的这段账都只动本文，扩展源码一行没碰：这一轮重跑过构建，产物仍是那一轮
  下面那格记的 **3,830,049 B / 65 个文件**，一字节没多一字节没少，65 个文件里也没有混进文档——这就是这几笔不重跑
  e2e 的依据。
- **10-03 08:00 之后两笔**：前一笔 `3c11ece` 把本节那格「领先它 20 笔」改成现读，并把上面那三笔记进分段账；
  后一笔就是这段账所在的那一笔，把第 2 节末段那条产物校验从「这台机器跑不了」变成「跑过且 exit 0」，
  并给它补了三条断言加一道装载守卫，每一条都拿坏包验过会红。两笔都只动文档与 `scripts/verify-extension.mjs`，
  扩展源码一行没碰，所以下面那两格当时读数不变——这也是不重跑 e2e 的依据。这一轮实际跑的清单比下面那块多一行
  `node scripts/verify-extension.mjs`（要 `VERIFY_EXT_CHROME`），共 12 步，全 `exit 0`。
- **10-03 图片压缩这一笔**：动了扩展源码（`utils/core/format.ts` 那张 `Set` 加三个扩展名，
  `composables/useConversion.ts` 只改注释），所以这一笔**必须**重跑 e2e 与产物层守卫——跑了，332/332。
  第 2 节新加的那一条记的是它的读数与形状，本节那格 `wc -l` 从 31 走到 32，未发布区从 161 走到 162（见下）。
- **10-03 书签抬升路这一笔**：只动本文，给第 2 节那三条「需要所有者点头才做」的路子补上读数（都不抬，见该条）。
  它不动未发布区的 162 条——「量了一件事，结论是什么都不改」不是用户可见变更，因此不进 `CHANGELOG*`；
  同理也不动 e2e 与产物，验证那几行写在第 2 节末尾。
- **紧接着的评审改的就是上面这一笔写的字**（同样只动本文，扩展源码一行没碰）。把那条 41 行的读数逐条对回
  `.test-tmp/outline-final8.log` 与量具源码，四处站不住：① 原文把「下限压到 2 码点才出现正读数 +7」写在
  「② 前缀匹配、③ 标题出现在行内」这个共同主语之下，而日志是 `前缀2∪相等 [3,7,0,0]`、`行内2∪相等 [3,7,7,0]`——
  **+7 只属于 ③**，② 在任一档都是 +0，原因就是那 7 行的行首是符号不是标题，前缀判据结构性地不可能点火；
  ② 「`resolvedPage 0 / 12`（destination 全是命名目标）」把一条只判「`dest[0]` 是不是可解析的直接页引用」的
  读数说成了对目标类型的证实；③ 「没有一条超 80 码点」既把 UTF-16 长度说成码点、又把量具的 `>= 80` 说成「超」；
  ④ 「日志里只有码点数与字符类」是错的，`mask()` 打了每条标题的前 16 个码点，那确实是用户文档片段——这句不改，
  下一轮就可能有人把那几份 `outline-*.log` 当成可提交的结构性读数文件。四条都是**措辞对回证据**，没有一条需要动转换器，
  结论「都不抬」与 `7 / 63 → 14 / 63` 那两处关键读数原样成立。

未发布区块跟着上面前三段涨到 **161 条**（`CHANGELOG.md` 与 `CHANGELOG.en.md` 各 161，成对），比 `origin/main`
上的 150 条多 11 条——第 4 节那两步当时的账就是按这两个数算的。本文与新加的
`scripts/repair-release-merge.mjs` 是随后那一笔（`03d2fdb`），它不动那 161 条里的任何一条；10-03 评审轮
也不动——它改的是其中两条的**措辞**（`CHANGELOG*` 那句「产物逐字节不变」按产物语义改成两句），
并把重建工具的守恒从四条加到五条，`AGENTS.md`、`RELEASE_AUTOMATION.md` 与本文里跟着说「四条」的那几处
同步成五条。上面那一笔（`7e313c8`）也不动这 161 条：一条开发脚本的自检不是用户可见变更，它进
`CONTRIBUTING*`，不进 `CHANGELOG*`。**今天的两条数是 162 与 150**——图片压缩这一笔给两份各加一条 bullet，
于是分支比 `main` 多 12 条，第 4 节那两步按这两个数算；161 留在上面那几句里，是那一轮的读数，不是今天的。

提交前的收尾检查（这一轮实际跑的那几条，跑在哪棵树上就在哪棵树上提交）：

```bash
pnpm lint:all && pnpm verify:meta && pnpm verify:paths && pnpm pages:check \
  && pnpm verify:numbers && pnpm verify:listing
pnpm build && pnpm verify:offline && pnpm verify:remote-code   # 产物层两条必须在 build 之后
```

只动文档与脚本时，产物字节应当与上一轮相同；这一轮动到了扩展源码（那张 `Set` 多三个扩展名），所以它涨了：
**3,830,068 B / 65 个文件**（+19 B，2026-10-03 图片压缩这一笔的构建；上一格 3,830,049 是 `7e313c8` 那一轮收口时
的重建，两格之间只有这一处源码变化）。
这两个数是数出来的：`.output/chrome-mv3` 下每个普通文件各算一格字节，相加得 3,830,068，计数得 65——
`pnpm build` 末尾那行 `Σ Total size` 只给到 3.83 MB（那一格是 2026-10-03 那一次构建的读数；今天同一条命令打印
3.84，取整跨界发生在 1.2.1 之前），取整边界之内的增减它看不见。读数不一样就说明动到了
扩展源码，回头确认是不是有意为之。

**2026-10-18 这一轮（1.2.1 发版 + 发布链路两次补漏 + 体积回填）**：`Σ` 的现值是 **3,842,846 B / 65 个文件**，
比上面那一格多 **12,778 B**。涨在 10-17 那 22 笔扩展源码改动（XLSX 预览过 DOMPurify、`row-key`、解码链与
存储上报那批），而 `verify:numbers` 不守体积（盲区就写在上面那段里），所以那 12,778 B 一路没人报红——直到
1.2.1 的发布构建把 `Σ Total size: 3.84 MB` 打在 CI 日志里，而对外文案还写着 3.83。**回填 16 处，另带一处生成物**：
`docs/index.html` 六处（指标卡、中英取证段、注释里那份「每个数从哪来」的清单、以及两处说明「带单位的数不做
整数高亮 / 尺寸条挂在它下面」的引用）、`docs/blog/index.html` 中英各一、`docs/llms.txt`、`CONTRIBUTING*` 各一、
`docs/promo/community-posts.md` 两处与 `.en.md` 一处、`wechat-article.md` 与 `blog-article.en.md` 各一处；
`docs/promo/wechat-article.html` 由 `pnpm promo:wechat` 重排跟上（它 gitignored，不进 `git status`）。
**按档案留下的**：上面每一格按天的 `3,83x,xxx B`、两份 `CHANGELOG*` 里的历史条目、本文件第 4 节那些「那一轮实测」。

这一轮还把发布链路的两个洞补上了，核对点也跟着变：`aa7215d` 之前，发布提交只改四份手写文件，而三十六张生成页的
`about` 节点把版本号从 `package.json` 现读——1.2.1 合进 `main` 后 CI 正是红在 `pages:check` 上。今天起
`release.mjs --write` 自己重渲染，发布提交 = 四份手写 + `docs/convert/**` 与（有变化时的）`docs/sitemap.xml`；
**所以第 4.1 节那句「整个 diff 只有三份文件」是 1.1.0 那一轮的现场，不是今天的**（那一段按档案留着）。
另外 `fix(release)` 这个类型今天犯过一次：它按 `fix` 进了「修复」分组并当场催出一条 1.2.2 的 Release PR
（内容是发版脚本自己，用户看不见），已关在 #21——内部改动要用 `chore` / `ci`，这是 `release.mjs` 文件头就写明的分类。

提交前再确认一次工作树里没有别人的东西（与并发会话共享目录时尤其）：

```bash
git status --short          # 期望：只剩与本任务无关的、你认得的文件
git diff --cached --stat    # 每个提交前都看一眼
```

## 4. 让它上线：`main` 是唯一的发布通道，而这一轮发版排在合流前面

`static.yml` 的 push 触发只认 `branches: [main]` 且 `paths: docs/**`，CI 与 `release-prepare.yml` 也都以 `main` 为基。
所以「上线」仍然只有一个动作：让改动进 `main`。**但本轮它排在发版之后**，两条理由：

1. `5d19834` 把产品页自称的版本回填成 **1.1.0**，而 `package.json` 现在仍是 **1.0.0**（本机实测）。先把它
   合进 `main`，`static.yml` 会在几十秒内把这个中间态发到公网——一条对外主张与商品版本不一致的页面。
2. 商店上传由 `release.yml` 在**标签事件**里做，而 GitHub Release 的正文是它从**标签的工作树**里 awk 出的
   `## [1.1.0]` 区块。区块得先在 `main` 上成立，才谈得上发这一版。

链路上现在没有残留（2026-10-02 深夜与 10-03 各读一次，三条匿名 API 就够）：`origin/main` = `52ee7a1`，
`feature-dev` 领先它若干笔（这个数字每落一笔就在动，别抄，`git rev-list --count origin/main..HEAD` 现读），
且 `origin/main` 是 HEAD 的祖先（`git merge-base --is-ancestor origin/main HEAD` 实测通过）；远端
**0 个 tag、0 个 Release、0 个开着的 PR**，分支只有 `feature-dev` 与 `main`。所以
`release/v1.1.0` 那格「分支已被占用」的守卫不会挡路，第一次 `prepare` 可以直接跑。

### 4.1 六步，每步一个核对点

前五步是发版，第六步才轮到站点。写操作一律由所有者执行。

1. **准备 Release PR**：Actions → **Release prepare** → Run workflow → `mode: prepare`。它把 `main` 上那
   150 条未发布提升成 `## [1.1.0] - <日期>`、把 `package.json` 从 1.0.0 提到 1.1.0（`bump: minor`），
   推 `release/v1.1.0` 并开出那个 PR。本机想先看同一件事：`node scripts/release.mjs --json /tmp/taf-plan.json`
   （计划模式，一个文件都不写；`previousVersion` / `version` / `bump` / `subject` 四格直接读得到）。
   ⚠️ 在 `feature-dev` 上跑它读到的未发布区是 **162 条**——分支比 `main` 多本轮那 12 条。**被提升的是
   `main` 那侧的 150 条**，本轮这 12 条留在分支的未发布区里，等下一次发版。
2. **审完再合那个 PR**——approve 就是批准发布。整个 diff 只有三份文件（两份 CHANGELOG 加 `package.json`）。
   这一轮要审的是**英文那份区块是不是中文那份的对照**：两份的未发布区都是手写的成对条目，
   `release.mjs` 在这种情况下**原样带过去**（`--json` 输出里的 `carriedHandWritten: true` 就是它），
   不按提交信息重生成——所以 `Changelog-En:` 尾注那套「缺尾注就沿用中文主语」的机制这次不参与，
   但成对与否得有人看一眼。仓库没有 `RELEASE_PAT` 时这个 PR **不带任何状态检查**（GitHub 不为
   `GITHUB_TOKEN` 开的 PR 触发 `pull_request`）；`main` 若要求检查通过，那个 Merge 按钮点不动——
   配令牌或放行 `release/*`，见 [`RELEASE_AUTOMATION.md`](RELEASE_AUTOMATION.md) 的 1.3。
3. **确认标签真的推出去了**：合并那一刻 `tag` job 推 `v1.1.0`；没配令牌时那一步**只报 warning 就过**，
   任务摘要里给出三行本机命令（`git fetch origin main` / `git tag v1.1.0 <sha>` / `git push origin v1.1.0`）。
   核对：`curl -sS https://api.github.com/repos/liaolongdong/transfer-any-file/tags` 从 0 条变 1 条。
   **这一步漏掉等于没发版**——`GITHUB_TOKEN` 推的标签不会再触发任何工作流。
4. **读 `release.yml` 那一次运行的摘要**：构建、产物校验、GitHub Release（正文 = 标签树里抽出的 `## [1.1.0]`
   区块），然后商店那步要么「已上传、未提审」要么「已跳过」——四个商店 secret 缺任何一个都算跳过
   （item ID 早已取证，见 `.github/CHROMEWEBSTORE.md` 顶部「现网状态」）。要让用户真的拿到这一版，
   还得去后台点「提交审核」（`RELEASE_AUTOMATION.md` 第二节第 6 条）。
5. **把发布提交合回 `feature-dev`，并当场重建两份 CHANGELOG**——这一步不能省，也不能只看 `git merge`
   的返回值。见 4.2。
6. **然后才让 Pages 上线**：把 `feature-dev` 合进 `main` 并推送（PR 或直接推，取决于 `main` 的分支保护）。
   `static.yml` 随之部署，第 5 节那批线上核对才有意义。

### 4.2 合回开发分支：git 会绿着把发布记录合错

`scripts/repair-release-merge.mjs` 是为第 5 步写的。2026-10-02 在一个隔离副本里把整件事实测了一遍，不是推演：

```bash
git clone --no-hardlinks . /tmp/taf-relsim && cd /tmp/taf-relsim
# 副本里把 main 指到一个模拟的发布提交（--write 出来的那份），开发分支指 feature-dev
git checkout <开发分支> && git merge --no-commit --no-ff main
```

两份 CHANGELOG 的插入点相邻但不在同一行：发布提交在 `## [未发布]` 与它那 150 条**之间**插版本标题，
开发分支往 `## [未发布]` 的各个分组**开头**插新条目。于是 git 打印

```
Auto-merging CHANGELOG.md
Auto-merging CHANGELOG.en.md
Automatic merge went well; stopped before committing as requested
```

**exit 0、没有冲突标记**，而结果是未发布区从 11 条变成 **0 条**、`## [1.1.0]` 从 150 条变成 **161 条**：
本轮那 11 条没上线的功能被记成了 1.1.0 的一部分，而下一次 `release.mjs` 会以为没有东西可发。
**没有任何一道门禁为此变红**——CI 里既没有「未发布区非空」，也没有「版本小节等于发布时那一版」。
GitHub Release 的正文不受影响（它从标签的工作树里 awk），坏的是两份发布记录本身。

所以第 5 步的四条命令是：

```bash
git merge --no-commit --no-ff main               # 照旧合，但要 --no-commit
node scripts/repair-release-merge.mjs --check    # 红 = 需要修，并把三份读数打给你；绿有两种，见下面那条
node scripts/repair-release-merge.mjs            # 重建两份 CHANGELOG，然后才 git commit 那个合并
node scripts/repair-release-merge.mjs --check    # 绿 = 分界正确，可以收尾
```

它不靠人眼：以两份权威输入重建——`MERGE_HEAD`（被合进来的发布提交）给版本小节的原文，`ORIG_HEAD`
（合并前的分支尖端）给本轮条目的原文与分组顺序。**两份都先算完、五条断言全部成立之后才开始写盘**，
任何一条不过就**两份一个字都不写**（那两份是成对的，只修一份等于把它们拆成两种形状）：
① 该版本的每一条都能在分支的未发布区里找到（找不到 = 两侧不是同一次提升）；② 重建后全文条目总数守恒；
③ 版本小节之后的历史区两侧逐字相同（不同就交人工——那说明分支上动过旧版本的正文，没有确定答案）；
④ 中英两份的版本条数与未发布条数各自相等；⑤ 重建结果不比**工作树**少条目（工作树里多出来的那些既不在
`MERGE_HEAD` 也不在 `ORIG_HEAD`，是合并现场手写的——前四条都在两份 ref 之间守恒，看不见这一格，
而 `--check` 那句「确认无误后执行」正把人往「写下去就把它们抹了」那一步催）。重建出的两份直接过
`pnpm format:check`。隔离副本上的实测：`## [1.1.0] - 2026-10-02 150 条 · 未发布 11 条 · 全文 180 条`，
中英各一条，且版本小节到文末与发布提交逐字节相同、未发布那 11 条与分支尖端那 11 条逐字节相同。
五条断言各自被变异触发过一次——版本小节多一条（①）、分支未发布区有一条写重复（②）、发布侧改了一行
旧版本的正文（③）、中英两份的版本小节条数不同（④）、合并现场往两份的未发布区各手写一条 ref 里没有的
条目（⑤）——每一次都是 exit 1 且两份文件在磁盘上一个字节没变；⑤ 那一轮工作树 183 条、重建结果 182 条，
`--check` 与不带 `--check` 的那条命令都拦下来（后者会在写盘之前就失败，所以「检查」与「修」都不会吃掉手写的条目）。
搬运本身也被变异过一次，而它起初**不是**被断言抓住的：一条已提升的条目夹在两条本轮条目中间时，
旧写法会把那段空隙连条目一起抄回未发布区，内容重复、总数守恒，五条里前四条一条都不红——
修法是按游标推进而不是按「上一条保留条目」算空隙，同一条夹具在修好的脚本上变成 exit 1（条目总数 4 → 3）。
另一格形状变异是「本轮分支上没有新条目」那个出口：未发布区清空时如果直接让版本标题贴上小节标题，
重建结果就过不了 `pnpm format:check`，所以那一格留一个空行，与 `release.mjs` 落笔的形状一致。

**①–⑤ 都建立在「这一场里真的有一次提升」之上**，而功能分支追 `main` 这种最常见的合并根本没有提升。
2026-10-19 实测：`--check` 对这样一场报「历史区两侧不一致」，而**把同一个 ref 跟它自己比**（`--check
MERGE_HEAD MERGE_HEAD`）也是同一句红，两侧那份文件其实逐字节相同。机制量出来了——已发布那侧把
`## [未发布]` 之后第一格当「本轮新插的那一节」跳过去取下一节，未发布那侧从同一处直接撞到**这一节**，
于是两段切片差一整节（本仓库那两份 1.2.1 那一节是 18 行非空）。修法不是让这一路「跳过检查」——那等于让这条守卫
在它最常见的使用场景上完全不设防——而是换一条还站得住的判据：先按**位置**认出没有提升（两侧在
`## [未发布]` 之后的第一格是同一节），再自证合并结果的三处逐字节对得上——文件头必须仍像两侧之一（它在
`## [未发布]` **之上**，三方合并对它没有「该跟谁」的答案，所以只不许它是第三种东西）、未发布区必须等于分支那份、
版本小节必须等于已发布那侧那份。

这一路的牙是八次变异量出来的（`node .test-tmp/repair-teeth.mjs`，那份脚本在 `.test-tmp/` 里、**不进仓库**；
合成提交用 `git commit-tree` 造，不动任何分支 ref，跑完删掉隔离工作树）：

- 基线（就是 10-19 那一场合并的形状）→ `exit=0`，打印「无需重建…文件头、未发布区与版本小节三处已逐字节核过」。
- 工作树删掉版本小节里的一条 → `版本小节与 <已发布 ref> 那份不同`；往未发布区加一条 → `未发布区与 <未发布 ref>
那份不同`；把两份的 H1 与语言切换行改成两侧之外的第三种东西 → `文件头既不像…也不像…`。三条都 `exit=1`
  且两份一个字没写。第三条是评审查出来的**漏**：初版只比未发布区与尾部，那一改仍能绿，而屏幕上写着「逐字节自证通过」。
- 中英两份的首节互不相同 → 仍 `exit=0`，但打印的是「两份各自同在一节的那一格不同（… / …）——那是这两份文件
  本来就不成对，不是这一场合造成的」。这一路**不执行断言 ④**（那条管的是「只重建一份会把两份拆开」，与提升绑定），
  所以绿句不许再拿一份的标题替两份说话；不成对这件事必须看得见。
- 反向确认老判据没被削弱：造一次真提升（发布侧插 `## [1.2.2]` 两条）→ 仍走断言路径并打印「工作树是合并后的
  错形状 · 需要修 · 确认无误后执行…」；分支上改一行已发布版本的正文 → ③ 仍报人工判断；分支未发布区根本没有
  那些条目 → ① 仍报「两侧不是同一次提升」；在分支的**历史区深处**塞一行逐字等于被提升的那一节 → 仍走断言路径
  （这就是判据只看位置、不看「那一行出现过没有」的理由：后者会被这种行带走，把真提升误报成「不含发布提交」）。

一种**会红但正常**的形状要写明白，别当成守卫过严：`main` 上直接往未发布区写了条目、分支也写了，合并做的是并集，
于是「未发布区等于分支那份」不成立 → 红，并提示「若那是 `main` 上直接写的未发布条目，确认内容无误后手工放过」。
旧脚本对这种形状同样恒红，不是回归，但读的人要知道这一路的绿不等于「什么都对」。

所以 `--check` 的绿现在有两种，读它的人要知道是哪种：**「无需重建：…这一场合不含发布提交；合并结果的文件头、
未发布区与版本小节三处已逐字节核过」**与**「检查通过：未发布与已发布小节分界正确」**（后者的五条断言全跑过）。
`AGENTS.md` 的常见陷阱那一节、`.github/RELEASE_AUTOMATION.md` 第二节第 7 条与末尾工具清单一处，都跟着点名这两种绿。

另一条不需要这个工具的路：发版后**废弃这条开发分支**，下一轮从新的 `main` 重新起分支。陷阱只出现在
「旧分支带着自己的未发布条目去接 `main` 上新出现的版本小节」这个形状上，形状不在，整节 4.2 都不必存在。
本轮不适用，因为那 11 条已经写进 `feature-dev` 的未发布区、并进了对外文档。

推送如果卡住或超时，先核实是否其实已经到达，再按既有的三件套重试
（`git -c http.version=HTTP/1.1 -c http.postBuffer=1 push`），不要凭「命令返回了非 0」就重复推。
**核实这一步优先用匿名 API 而不是 `git ls-remote`**：`GET /repos/liaolongdong/transfer-any-file/{tags,pulls,branches}`
三条都不需要凭证，而 `git ls-remote origin 'refs/heads/release/*'` 在本机会挂住（2026-10-03 实测，两分钟超时）。

## 5. 发布后的线上核对（部署通常 1–3 分钟）

```bash
base=https://liaolongdong.github.io/transfer-any-file
# 1) sitemap 里每一条都必须是 200。条数随页面数走：2026-10-02 线上读到 25 条，
#    本轮那批新页进 main 之后应当是 39 条（本机 docs/sitemap.xml 实测 39，两者差的就是还没上线的那些）
curl -sS $base/sitemap.xml | sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' | tee /tmp/taf-urls.txt | wc -l
while read -r u; do printf '%s  %s\n' "$(curl -sS -o /dev/null -w '%{http_code}' "$u")" "$u"; done < /tmp/taf-urls.txt
# 2) 生成页两种语言都在 HTML 里（不靠 JS 渲染），且 canonical 指向自己
curl -sS $base/convert/png-to-webp.html | grep -c 'lang="en"'
curl -sS $base/convert/png-to-webp.html | grep -o '<link rel="canonical"[^>]*>'
# 3) 博客页可达、robots 仍指向 sitemap
curl -sS -o /dev/null -w '%{http_code}\n' $base/blog/
curl -sS $base/robots.txt | grep -i '^Sitemap:'
# 4) 本轮新增的两处，今天还是 404（2026-10-02 实测），第 4.1 第 6 步之后必须是 200
curl -sS -o /dev/null -w '%{http_code}\n' $base/security.txt
curl -sS -o /dev/null -w '%{http_code}\n' $base/convert/pdf-to-png.html
```

在浏览器里再做两件事：切一次中英（`?lang=en` 与页内开关都要生效）、把窗口拉到手机宽度看有没有整页横向溢出
（`docs/assets/content.css` 里的 `overflow-x: auto` 是给代码块兜底的，不该把整页撑开）。这几张页面没有 `<table>`，
所以要看的是长句英文与代码块的折行。

## 6. GitHub 侧的曝光动作

1. **topics 落地**——20 个名字目前**只存在于 `.github/repo-metadata.json`，GitHub 搜索拿不到**，这是仓库可发现性上唯一还欠的一项。
   两条 curl（About 与 topics 是两个端点，topics 那次是**整表替换**，别拆开发）在
   [`repo-metadata.md`](repo-metadata.md) 的「两条能走通的路径」小节，直接复制那一段；或者配好
   `REPO_METADATA_TOKEN` 后到 **Actions → Sync repository metadata → Run workflow**。
   落地后不带凭证即可核对：
   ```bash
   curl -sS -H "Accept: application/vnd.github+json" https://api.github.com/repos/liaolongdong/transfer-any-file/topics
   ```
2. **Social preview**：Settings → General → Social preview 上传 `docs/assets/store/github-social-preview.png`（1280×640，
   2026-09-18 已定稿并同意使用）。这个字段**没有任何 API**，只能在设置页点。它决定分享到 X / Slack / 微信时有没有卡片图。
3. **README 的可见面**：顶部导航现在多了「转换说明 / Conversions」与「博客 / Blog」两个入口，仓库首页渲染即可看到；
   不需要额外动作，但值得在发布后自己开一次 `https://github.com/liaolongdong/transfer-any-file` 确认锚点不跳空。
4. **tag 的拦路石换了**：仓库仍然没有任何 tag（2026-10-02 实测 GitHub API `/repos/…/tags` 为空）。原先「先别打」的理由是
   标签一推出 `release.yml` 就会上传新包，把那个「待裁决的样本」换掉，第三次判定再也无法归因——**裁决已经回来了**
   （2026-10-02 实测条目在架、详情区版本 1.0.0、上次更新 2026-09-30），这条约束随之解除。现在压着发版的只有一件：
   商店自动化要的四个 secret（`CHROME_EXTENSION_ID_TAF` 与发布商级的 `CWS_PUBLISHER_ID` /
   `CWS_SERVICE_ACCOUNT_EMAIL` / `CWS_SERVICE_ACCOUNT_PRIVATE_KEY`）配了没有——item ID 现在已知，配齐即可，
   不配则 `release.yml` 照旧只跳过上传、GitHub Release 正常发。取这三项的步骤见 `.github/CWS_PUBLISHING_GUIDE.md`
   的 3.1（Chrome Web Store API v2 + 服务账号；旧的 OAuth 桌面客户端与 refresh token 那条链路已断，别照着配）。见第 8 节。

## 7. 让搜索与 AI 答案引擎看见

`docs/robots.txt` 已经放行 Googlebot / Bingbot / GPTBot / ClaudeBot / PerplexityBot 等，并带 `Sitemap:` 行；
`docs/llms.txt` 已含新页面链接。这两件事不需要后台操作，所以下面全是**收录加速**而非配置修复。

1. **Google Search Console**。`liaolongdong.github.io` 不是你的域名，拿不到 DNS，所以「网域」属性走不通；
   用 **网址前缀** `https://liaolongdong.github.io/transfer-any-file/`，验证方式选 HTML 标记：
   GSC 给的 `<meta name="google-site-verification" content="…">` 加到 `docs/index.html` 的 `<head>`（其他 meta 之后），
   然后 `pnpm lint:all && pnpm pages:check` → 提交 → 等部署 → 回 GSC 点「验证」。
   这条改动只碰一个 meta 标签，不进任何守卫的射程；把 content 值给我，我可以连这一步一起提交。
2. **提交 sitemap**：GSC → sitemap → 添加 `https://liaolongdong.github.io/transfer-any-file/sitemap.xml`（39 条）。
3. **逐条请求收录**，优先级按「新页面 + 有搜索意图」排：首页 → `/convert/` → 35 张配对页 → `/blog/`。
   `privacy.html` 不必提交。
4. **Bing Webmaster Tools**：直接从 GSC 导入站点即可。IndexNow 属可做可不做，如果要做得把 key 文件放站点根
   （`docs/`），`static.yml` 只挡 `.md`，一个 `.txt` 能发出去。
5. **预期**：GitHub Pages 子路径的新页面从「抓到」到「有展示」通常是数周量级；`png to webp` 这类头词竞争极强，
   真正可能带来点击的是长尾（离线 / 批量 / 不上传 / 某格式转某格式）。所以第 8、9 节带来的真实用户比排名更早见效。

## 8. Chrome 应用商店：条目已上线，下面这套取舍继续有效

取证结论（不是一时保守，是量过的）：

- 中文简介用 66/132、英文用 127/132，**留白是刻意的**——第三次之前的两次拒审引用的都是「冒号/逗号分隔的格式名列表」
  这个形状，砍掉八个格式名正是从 98 降到 66 的那一刀。回填等于把同一条违规搬到主字段上。
- 简介字段有 4 处镜像（控制台 Summary = `CHROMEWEBSTORE.md` 的 Short Description = `_locales/en → extensionDescription`
  = `package.json#description`），外加 8 处长度引述；改一处要动一片，而收益是几个关键词。
- 名称同理：本项目刚因 listing 里的格式名列表被拒两次，外部 ASO 研究给的「标题塞格式关键词」方案与那两次拒审的理由
  是同一套判定，不采纳。

那两条冻结（不重打包、不改受审字段）是为「包已提交、等裁决」那几天设的，**裁决回来后自动解除**——2026-10-02
实测条目在架（详情区版本 1.0.0、上次更新 2026-09-30）。但上面三条取舍**不作废**：它们约束的是下一次提交，
而理由（两次拒审引用的就是那个形状）不会因为过审而消失。

现在商店这一侧真正剩下的动作只有三件，全部是后台写操作、由所有者执行：

1. 配齐 `CHROME_EXTENSION_ID_TAF` 与三个 `CWS_*` secret，让 `release.yml` 在标签事件里真的上传（不配则只跳过、
   GitHub Release 照发）；item ID 与 listing 见 `CHROMEWEBSTORE.md` 顶部「现网状态」。
2. 按 [`CWS_PUBLISHING_GUIDE.md`](CWS_PUBLISHING_GUIDE.md) 补「最近变更」文案，并把新截图与新页面带来的变化写进
   详描更新——改任何一个商店字段前先 `pnpm verify:listing`。
3. 记下上线当天的后台基线（曝光 / 详情页浏览 / 安装），第一周的波动才有参照。

安装率这一侧真正能动的杠杆是**评分条数**与**外部导流**，不是文案再压一遍关键词。

## 9. 社区分发

两份稿子各自带了「发帖纪律」，别绕过：[`docs/promo/community-posts.md`](../docs/promo/community-posts.md)（掘金 / V2EX / 知乎 / 即刻 / 小红书）、
[`community-posts.en.md`](../docs/promo/community-posts.en.md)（dev.to / Hashnode / Show HN / Reddit / awesome-list / X）。
注意这两份在 `docs/promo/` 下，`static.yml` 明确不发布它们，所以稿子里的截图路径是仓库相对路径。

建议的节奏（同一条内容在两个语言圈各自首发，间隔 24–48 小时，避免同一链接被同一批人重复看到）：

1. 先英文长文：dev.to / Hashnode **cross-post**，canonical 一律填 `https://liaolongdong.github.io/transfer-any-file/blog/`
   ——这一步做错会让新站点白拿不到权重。
2. Show HN：标题不带夸张、正文写清「完全离线、只申请存储权限、开源」，前 12 小时不离人，事实性问题当天在评论区更正。
3. Reddit 按 sub 分别改写（`r/chrome_extensions` 可发全文，其余按稿子里的顺序）。
4. awesome-list 两种一句话条目（按稿子给的两条，别自己扩写）。
5. 中文渠道：掘金长文 → V2EX（`/v/create?node=分享创造`）→ 知乎回答模板 → 即刻 / 小红书短稿 → 微博 → 公众号（`pnpm promo:wechat` 排版）。

**所有帖子首选给出商店链接** `https://chromewebstore.google.com/detail/blkdmpkcaceicinkhindniepbbbaekkb`——条目**已上线**
（2026-10-02 实测，权威见 `.github/CHROMEWEBSTORE.md` 顶部「现网状态」）。源码构建那条路照旧可以提，但它是**备选**，
不再是唯一路径；「尚未上架、只能开发者模式加载」这套写法从今天起是错账。**唯一的例外**是渠道本身禁止推广链接时
（例如某些 sub 只准讨论），那种情况写「商店搜『文件格式任意转换助手』」而不是宣称没有商店版本。

## 10. 复核节奏

| 时点       | 看什么                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 发布后 24h | 第 5 节的 URL 全 200；HN / Reddit 评论里的事实性问题当天更正；GSC「网页索引」里新页面的状态                                           |
| 7 天       | GSC 按页面看 `/convert/*` 的展示与收录数（`site:` 查询核对是否被收）；GitHub **Insights → Traffic** 是否出现新的引荐来源              |
| 30 天      | 决定是否补第二轮长尾页——只需往 `scripts/conversion-pages/pairs.mjs` 加条目，`pnpm pages:render` + `pnpm pages:check` 与守卫会自动覆盖 |
| 每次裁决后 | 商店状态写回 `CHROMEWEBSTORE.md` 的拒审记录与版本历史，同时更新项目记忆里的草稿状态                                                   |

## 11. 明确不做

不加统计脚本或任何第三方 JS（离线主张优先于「看数据」）；不引入外部 SEO 工具链；链接不放 `utm_*`；
不刷 star / 评分 / 评论；名称与简介仍守第 8 节那条留白口径（不往主字段塞格式名列表）；不把运营文档放进 `docs/`；
不新增权限、`host_permissions` 或任何远程资源——这些如果要做，先停下来单独说明。
