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
pnpm test:e2e        # = pnpm build + node scripts/e2e-test.mjs，断言基线 327 条
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

## 3. 收下改动：建议分两个提交

按「生成器与站点内容」和「文档与守卫」拆开，将来回看某张落地页为什么这么写时，只需要读第一条。

```bash
cd ~/code/chrome-plugins/transfer-any-file

git status --short          # 先看清全貌：与并发会话共享目录时这一步不能省

git add scripts/render-site-pages.mjs scripts/conversion-pages/ \
        docs/convert/ docs/blog/ docs/assets/content.css docs/sitemap.xml \
        package.json .prettierignore .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
docs(site): 10 张转换配对落地页与博客页改为数据源生成，并加漂移守卫

配对页文案集中在 scripts/conversion-pages/pairs.mjs，docs/convert/ 与 docs/sitemap.xml
由 scripts/render-site-pages.mjs 渲染；这两处生成物不再受 Prettier 管，改用
pnpm pages:check 比对提交字节，并已加进 CI 的 lint job。博客草稿提升为 /blog/ 真实页面。
EOF
)"

git add docs/index.html docs/llms.txt README.md README.en.md \
        CHANGELOG.md CHANGELOG.en.md \
        .github/repo-metadata.md .github/visibility-checklist.md \
        AGENTS.md .qoder/rules/wxt-rules.md \
        docs/promo/community-posts.md docs/promo/community-posts.en.md \
        scripts/check-prose-numbers.mjs scripts/__baseline__/prose-number-quotes.json
git commit -m "$(cat <<'EOF'
docs: 产品页补 3 条长尾 FAQ 与结构化数据，站点入口与取证范围同步

中英 FAQ 各 3 条并同步进 JSON-LD（现 22 问 × 2 语言 = 44 条，与可见条目 1:1）；
README / llms.txt 指向新的 /convert/ 与 /blog/；verify:numbers 把生成页与博客纳入取证
（30 份文档），并新增两份渠道稿与这份对外可见清单。
EOF
)"
```

两个提交都要过的收尾检查（第二个提交动了 CHANGELOG，所以 `verify:numbers` 会重读它们）：

```bash
pnpm lint:all && pnpm pages:check && pnpm verify:numbers && pnpm verify:listing
```

提交前再确认一次工作树里没有别人的东西（与并发会话共享目录时尤其）：

```bash
git status --short          # 期望：只剩与本任务无关的、你认得的文件
git diff --cached --stat    # 每个提交前都看一眼
```

## 4. 让它上线：`main` 是唯一的发布通道

`static.yml` 的 push 触发只认 `branches: [main]` 且 `paths: docs/**`。当前分支拓扑（本机实测）：

```
feat/p0-data-integrity (HEAD)  领先 origin/feat/p0-data-integrity 5 个提交（第 3 节提交后是 7），领先本地 main 62 个
main                           领先 origin/main 2 个提交，且**是 HEAD 的祖先**
```

`main` 是 HEAD 的祖先这条已用 `git merge-base --is-ancestor main HEAD` 实测过，所以并进 `main` 是一次
`--ff-only`，不产生合并提交；而 `main` 手上那 2 个未推送提交（specs 与 plans 两份文档）已经在 HEAD 的历史里，
推 `main` 会一起带上。也就是说：**新页面在 HEAD 上，而 Pages 发的是 `main`。** 两条路：

- **A（推荐，与既有工作流一致）**：分支验收完（含 `pnpm test:e2e`）再并进 `main` 并推送，Pages 随之发布。
  这一轮的文档改动会跟着分支一起上线，不需要额外动作。
- **B（想让站点先上）**：把第 3 节的两个提交单独摘到 `main`。注意两个提交互相依赖——`docs/convert/` 与
  `docs/sitemap.xml` 的守卫（`pages:check`）和渲染器在同一个提交里，只摘文档会让 `main` 的 CI 红。
  摘完之后 `main` 与分支的站点内容会分叉，下一次合并要人工对齐。

```bash
# A 路线
git push origin feat/p0-data-integrity        # 先让分支上的 7 个提交可见、跑 CI
# 验收后：
git checkout main && git merge --ff-only feat/p0-data-integrity && git push origin main   # 这一步才会触发 Pages
# 如果 --ff-only 报「not possible」（期间 main 又动了），停下来选 rebase 还是普通 merge，别强推

# B 路线（先在 main 上重放第 3 节的两个提交）
git log --oneline -3                          # 记下两个新提交的哈希
git checkout main && git cherry-pick <生成器提交> <文档提交> && git push origin main
```

推送如果卡住或超时，先 `git ls-remote origin` 核实是否其实已经到达，再按既有的三件套重试
（`git -c http.version=HTTP/1.1 -c http.postBuffer=1 push`），不要凭「命令返回了非 0」就重复推。

## 5. 发布后的线上核对（部署通常 1–3 分钟）

```bash
base=https://liaolongdong.github.io/transfer-any-file
# 1) sitemap 里每一条都必须是 200，且条数 = 14
curl -sS $base/sitemap.xml | sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' | tee /tmp/taf-urls.txt | wc -l
while read -r u; do printf '%s  %s\n' "$(curl -sS -o /dev/null -w '%{http_code}' "$u")" "$u"; done < /tmp/taf-urls.txt
# 2) 生成页两种语言都在 HTML 里（不靠 JS 渲染），且 canonical 指向自己
curl -sS $base/convert/png-to-webp.html | grep -c 'lang="en"'
curl -sS $base/convert/png-to-webp.html | grep -o '<link rel="canonical"[^>]*>'
# 3) 博客页可达、robots 仍指向 sitemap
curl -sS -o /dev/null -w '%{http_code}\n' $base/blog/
curl -sS $base/robots.txt | grep -i '^Sitemap:'
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
   商店自动化要的四个 secret（`CHROME_EXTENSION_ID_TAF` 与 `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_REFRESH_TOKEN`）
   配了没有——item ID 现在已知，配齐即可，不配则 `release.yml` 照旧只跳过上传、GitHub Release 正常发。见第 8 节。

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
