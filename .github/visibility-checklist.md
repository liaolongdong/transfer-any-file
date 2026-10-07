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
pnpm test:e2e        # = pnpm build + node scripts/e2e-test.mjs，断言基线 332 条
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
`pnpm build` 末尾那行 `Σ Total size` 只给到 3.83 MB，取整边界之内的增减它看不见。读数不一样就说明动到了
扩展源码，回头确认是不是有意为之。

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
node scripts/repair-release-merge.mjs --check    # 红 = 需要修，并把三份读数打给你
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
