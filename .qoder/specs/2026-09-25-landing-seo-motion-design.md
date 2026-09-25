# 落地页元数据与动效层（2026-09-25）

> 本轮范围（用户已批准「按推荐方案实施」）：A 元数据全做 —— S6 FAQ 按语言、S7 缺失元数据、S8 `og:type=article` 与 schema 对齐、产品页 title 首帧收窄；B 的两条 —— S9 界面配图 + `ImageObject`、M5 reveal 动效层。
> 明确不含：S11 日期派生、S14 扩页、S10 相关转换簇（理由见 §1）。
> 载体只有四个：`scripts/conversion-pages/pairs.mjs`（数据源）、`scripts/render-site-pages.mjs`（模板与校验）、`docs/assets/content.css`（11 张页 + 博客共用）、`docs/index.html`（产品页，手写）。生成物 `docs/convert/**` 与 `docs/sitemap.xml` 一律由 `pnpm pages:render` 重写，手改会被覆盖。

## 0. 与 09-23 机会清单的对账（三条修正，别照旧账动手）

- **S5 已经落地**，旧报告说它没做是因为写于并发会话提交之前。11 张 pair 页 + `convert/index.html` + `docs/blog/index.html` 都有 `window.__FAT_META__` 与首帧前脚本（`render-site-pages.mjs:236-270`），按语言改写 title / description / og:title / og:description / twitter:title / twitter:description；静态那串中英混拼只是「不执行 JS 的客户端兜底」。**仍然成立的是产品页**：`docs/index.html` 没有 `__FAT_META__`（实测 0 次命中），它的收窄发生在文档末尾的 `setLang()`（`:7566`），首帧读到的是双语串。
- **S11 不是缺陷，且在本仓库不可修**：`PAGES_UPDATED` 的 JSDoc（`pairs.mjs:31-35`）把「随内容一起手工改」写成了设计——它是爬虫能读到的、唯一与「主张何时被编辑」对齐的日期。想改成 `git log` 派生也做不到：四处 `actions/checkout@v4`（`ci.yml:22/58/80`、`static.yml:41`、`release.yml:36`）**都没有设 `fetch-depth`**，默认浅克隆，CI 上取不到内容的真实提交史，一条只在本地成立的守卫等于没有守卫。
- **S10 的半条已经做了**：`chrome()`（`:278-311`）给每一页装了导航与页脚，指向产品页 / 转换一览 / 博客 / 隐私政策 / GitHub，`related` 簇（`:334-345`）最多给 6 条同族链接。缺的只是「同一源格式的其余目标」那一簇，属扩页一起算更划算的活。

## 1. 这一轮改什么

### 1.1 S6 · JSON-LD 按语言收窄（唯一直接影响富结果文本的一条）

现状：`renderPage()` 的 `@graph` 里 `FAQPage` 的 `name` 是 `${item.q.zh} ${item.q.en}`、`acceptedAnswer.text` 同理（`:379-383`），`WebPage.name`/`description` 用 ` | ` 拼双语（`:363/:367`）。首帧脚本只换 meta，**不换 ld+json**，所以 Google 的 FAQ 富结果与 AI 摘录引用的就是这句混排文本。

方案：**静态双语保留 + 首帧后改写 `ld+json`**，与 title 已有的形状同构，不引入第二套约定。

- `headScripts()` 的 payload 增加 `faq: [[q, a], …]`（每语言一份，顺序与 `@graph` 里的 Question 一一对应）与 `wn` / `wd`（WebPage 的 name / description 单语版）。
 - `ld+json` 元素加 `id="fat-ld"`；在其**之后**再 emit 一小段内联脚本（首段脚本在 head 里跑，那时 `#fat-ld` 还不存在），读 `document.documentElement.lang` → `JSON.parse` → 按 `@type` 找到 `FAQPage` 与 `WebPage` 逐条替换 → 写回 `textContent`。
- **失败安全**：解析或结构不符预期就 `catch` 掉、保留静态那份，绝不出现「结构化数据整块没了」。
- `convert/index.html` 的 `@graph` 实测只有 `CollectionPage` + `BreadcrumbList`（无 FAQPage），所以它只需要换 `WebPage`/`CollectionPage` 那一份单语 name 与 description，语言化的 FAQ 簇只属于 10 张 pair 页。

### 1.2 S7 · 补齐 pair 页与索引页缺的元数据

全部落在 `renderPage()` / `renderIndex()` 的 head 模板，实测缺口：`og:image:width|height` = 0、`theme-color` = 0、`apple-touch-icon` = 0，索引页连 `twitter:card` 都没有（`convert/index.html:48-55` 只有 og）。

- `og:image:width` = 1280、`og:image:height` = 640（`sips` 实测 `docs/assets/store/github-social-preview.png`），与产品页已有的那两条同值。
- `theme-color` 取 `content.css:29` 的 `--paper`（`#fff`），**不凭印象写色值**；不引暗色档（`content.css` 里没有 `prefers-color-scheme` 规则，加一条「暗色下用 X」就是假主张）。
- `<link rel="apple-touch-icon" sizes="512x512" href="../assets/icon.png">`——该文件实测 512×512，`sizes` 照实写而不是照惯例写 180。
- 索引页补 `twitter:card` / `title` / `description` / `image` 四条，值与它自己的 og:* 同源。

### 1.3 S8 · 让 `og:type=article` 有对应的 schema

pair 页声明了 `og:type=article`（`:406`）但 `@graph` 里只有 `WebPage` + `BreadcrumbList` + `FAQPage`，也没有 `article:published_time`。两个方向里选**补 Article**而不是把 `og:type` 降成 `website`：这 11 页是写给人读的步骤文，`Article` 的字段本轮配图之后全都有真实值可填，形状直接照抄 `docs/blog/index.html`（那页已评审过）。

- `WebPage` 节点的 `@type` 改成 `['WebPage', 'Article']`，补 `headline`（单语，随首帧脚本换）、`image`（= §1.4 那张截图的绝对 URL）、`datePublished` / `dateModified`、`author`（Person `Better`）、`publisher`（Organization，只到 `name` + `url`，不塞 logo）。
- 新增导出常量 `PAGES_PUBLISHED = '2026-09-25'`：**取证方式是 `git log --reverse` 里 `docs/convert/` 第一次进库的那笔（`b441af2`，2026-09-25 14:25）**，JSDoc 必须写明「这是内容进库日，且截至本轮这些页尚未通过 Pages 上线」，不得写成「已发布日」。
- `<meta property="article:published_time">` 与 `article:modified_time` 同步 emit（博客页已有可抄的两行）。

### 1.4 S9 · 落地页加界面截图与 `ImageObject`

现状实测：11 张页加起来只有一张 `alt=""` 的 26×26 页眉图标（`:283`）。

- **素材一律复用已公开的 7 张**（`docs/assets/screenshots/`，32,172–82,989 B，1280×800），**不重拍**：`pnpm assets:capture` 会把 24 张商店/README 素材一并刷新，那笔漂移属发版那次统一处理（09-24 已记过这条账）；且这 7 张此刻已经在产品页与 README 上公开，引到落地页不把漂移扩散到新表面。
- `pairs.mjs` 新增 `SHOTS` 表：`{ file, w, h, alt: {zh,en} }`，alt 描述**截图里真实存在的东西**（如「工作台批量转换结果的界面截图」），不复述该页的转换主题——给图片搜索写假 alt 与对外写假数字是同一类问题。
- 每个 pair 增加一个 `shot` 键，按族的映射（依据是「这一页的读者最该先看到什么」）：文档导出类 → `batch-results`，读取/预览类（`word-to-markdown`、`pdf-to-text`）→ `preview-edit`，数据类三页 → `batch-files`，图片类两页 → `output-preset`（那两张里有质量/最长边滑块，恰是图片路由唯一的输出旋钮），索引页 → `workbench-empty`。
- 位置：`.lede` 之后、`#keeps` 之前，`<figure class="shot">` + `<figcaption>`；`width`/`height` 显式写死（防 CLS）、`loading="lazy"`、`decoding="async"`、`fetchpriority="low"`。
- JSON-LD：`@graph` 增加 `ImageObject`（`contentUrl` 绝对 URL + `width`/`height` + `caption`），并被 `Article.image` 引用。
- **`validatePair()` 新增两条硬校验**（这个文件的存在理由就是「页面主张必须能被代码证伪」）：`shot` 指向的文件必须真实存在于 `docs/assets/screenshots/`，且 `SHOTS` 里声明的 `w`/`h` 必须与 PNG 的 IHDR 实测一致——不一致直接 `fail()`。

### 1.5 M5 · 把产品页那套 reveal 沉进共用样式

现状：产品页 11 个 `@keyframes` + IntersectionObserver + 交错；11 张 pair 页 **0 keyframes / 0 reveal**，`content.css` 只有 3 处 transition（`:122/:432` + reduce 块 `:501-507`）。一处改，11 页 + 博客同时受益。

- `content.css` 的 `:root` 补 `--dur-slow: 0.42s`（与产品页 `:704` 同值，注释里那条「ladder」的口径照搬），新增 `@keyframes fat-reveal`（`opacity` + `translateY(10px)` → 0，只用合成器属性，不动 `flex-basis` 那类布局属性）。
- **必须照抄产品页那条门**：`opacity: 0` 只写在 `.js .reveal` 下（`docs/index.html:2416`），`<html class="js">` 由首帧脚本加（`docs/index.html:38` 就是这么做到的）——不执行 JS 的爬虫与 AI 代理因此读到的永远是完整正文。`headScripts()` 里补 `document.documentElement.classList.add('js')`。
- 交错在脚本里给 `.in` 的元素写 `style.animationDelay`（`i % 6 * 40ms`），避免 `nth-child` 与文档结构耦合。
- **减弱动效降级要一次写全**：现有 reduce 块只压了 `transition-duration`，本轮补 `animation-duration`、`animation-delay`、`transition-delay` 三条归零 + `.js .reveal { opacity: 1; animation: none }`。README:207 对外承诺「完整支持 `prefers-reduced-motion`」，漏一条就是主张不实。
- 观察脚本内联在模板里，**不新建 `docs/assets/content.js`**：新文件在 `pages:check` 的射程之外（它只比对 `docs/convert/**` 与 `sitemap.xml` 的字节），等于加一份没人守的资产。无 IntersectionObserver 时直接给所有 `.reveal` 加 `.in`。

### 1.6 产品页 title 首帧收窄

把 `setLang()` 用到的那份 title / description / ogTitle / ogDescription / twitterDescription 表提到 head 的首帧脚本里（约 700 字符），首帧即按语言写 `document.title` 与四条 meta；文档末尾的 `setLang()` 保留其余职责（正文显隐、`aria-pressed`、`og:locale`、localStorage 持久化）并复用同一张表，避免出现两份语言数据。双语静态值继续留在标记里当兜底——这条是 `docs/index.html:14-17` 已经写成注释的既有约定。

## 2. 红线（本轮一律不碰）

- 不改 URL 结构、不改 canonical、不加 hreflang：`docs/index.html:52-57` 那段理由（`?lang=` 变体自 canonical 到干净 URL，hreflang 目标非自 canonical 会让 Google 丢掉整簇）至今成立。
- 不引入任何外链资源：脚本一律内联或同源，图片一律 `docs/assets/`。站点页脚写着 no telemetry，这条主张靠的就是「没有第三方子资源」。
- 不删静态双语串（title / description / FAQ / 正文），不改 `pairs.mjs` 里任何一条 `keeps` / `limits` / `notes` 的事实措辞。
- 不动扩展产物、`package.json` 依赖、`wxt.config.ts`、manifest 权限；不重跑 `assets:capture`。
- `convert/index.html` 的 og:description 里那三个受治数字（14 / 48 / 116）一个字不动。

## 3. 验证（按项目口径，缺一项不算验过）

1. `pnpm pages:render` → `git diff --stat docs/convert docs/sitemap.xml` 逐项读 diff（确认改动只是新增 meta/figure/脚本，没有把双语串弄丢）。
2. `pnpm pages:check` 必须 exit 0，且生成物随本轮一起提交——否则 CI 的 lint job 直接红。
3. `pnpm lint:all`（`pairs.mjs` / `render-site-pages.mjs` 受 Prettier 与 ESLint 管，`docs/assets/content.css` 与 `docs/index.html` 受 Prettier 管，`docs/convert/` 在 `.prettierignore` 里）。
4. `pnpm verify:numbers`：本轮只增句不改写旧句，引用基线只会在「少于记录」时失败；若必须改写含数字的句子，`--update` 后读 diff 确认少掉的正是那句。
5. 真 Chrome 三档核验（裸 CDP，`emulate` 没有减弱动效这一档）：
   - **禁 JS**：`#fat-ld` 保持双语静态、`.reveal` 全部可见、title 是双语串；
   - **`prefers-reduced-motion: reduce`**：computed `animation-duration` / `transition-duration` 为 0.01ms 且 `animation-delay` 为 0，`.reveal` 可见；
   - **`?lang=en`**：title、description、og/twitter 四件、`#fat-ld` 里的 FAQ `name` 全为英文，且 `<html lang="en">`。
6. 图片：本地静态服务打开任一 pair 页，断言 `<img>` 自然宽高 = 声明值（坏图的 naturalWidth 为 0 会让「配图」变成空洞）。
7. 交付说明列出：改了什么、为什么、跑了哪些、哪些没跑。

## 4. 风险与回滚

- `content.css` 是 12 个页面共用，动效一处改全站生效——**同一原因让它成为最大风险面**：`.js` 门写错就等于给不吃 JS 的客户端发空白页。第 3.5 条那一档是这条风险的直接反证，必须先跑再提交。
- `article` 相关字段用了一个新的手维护常量 `PAGES_PUBLISHED`：它和 `PAGES_UPDATED` 同一条治理口径（随内容改动一起看），JSDoc 里写明取值来源与「尚未上线」，避免下一个人当成发布日。
- 内联脚本变长会让 11 页同时变大（估 +1.2 KB/页，相对 19 KB 的 HTML 可忽略）；若 S6 的 JSON 改写在线上出问题，回滚只需把那段脚本从模板里删掉——静态那份双语 ld+json 本来就是完整可用的。
- 本轮不产生新对外数字，但「11 张页有界面图」这类说法若进任何散文，必须能指向 `pairs.mjs` 的 `shot` 字段。

## 5. 实施顺序（一笔一个主题）

1. `pairs.mjs`：`SHOTS` 表 + `shot` 字段 + `PAGES_PUBLISHED`（纯数据，先让校验器有东西可校验）。
2. `render-site-pages.mjs`：`validatePair()` 的两条新校验（先红后绿，证明校验有牙）→ S7 元数据 → S8 Article → S9 figure/ImageObject → S6 ld+json 改写 → M5 脚本与 `.js` 门。
3. `content.css`：令牌 + keyframes + reveal + reduce 补三条。
4. `docs/index.html`：首帧收窄。
5. `pages:render` / 全量验证 / 真 Chrome 三档。
6. 文案同步：`CHANGELOG.md` + `CHANGELOG.en.md` 的「未发布」节各一条；README 与产品页是否要提「落地页有截图」按实现取证决定，不虚写。
7. 自审 diff + 代码评审（用户点名的 `code-review` / `requesting-code-review`）。
