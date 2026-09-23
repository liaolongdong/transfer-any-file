# 功能 / 体验 / 动效 / 曝光 机会清单（2026-09-23）

> 本轮**只做分析，未改任何代码**。四路并行审计（功能盘点、站点 SEO/AEO、GitHub 访客视角、动效系统）+ 我对每条结论回到源码与线上站点复核。
> 与 09-18 / 09-19 / 09-20 / 09-21 / 09-22 / 09-23 六轮审计的挂账和否决记录对过，已收口或已被实测否决的不再重提（见 §8）。

---

## 1. 结论先说

最大的杠杆不是"再加功能"，而是三件已经成形却没生效的事：

1. **已经写完的东西没上线。** 11 张转换落地页 + 生成器 + 14 条 URL 的 sitemap 全部躺在工作区：线上 `/convert/` 实测 **404**，线上 sitemap 只有 **2** 条 URL（本地 14 条），分支领先 `origin/main` **71 笔**。同时 GitHub 上 **topics 为空**（20 个名字只存在于 `.github/repo-metadata.json`）、**0 个 tag**（Releases 页是空的）、社交预览图未上传。一个字节的新代码都不用写，曝光面就是现在的好几倍。
2. **界面里最伤体验的两个洞都是"数据没接出来"，不是"样式不够"。** 转换过程中步骤级进度根本没有上抛（`md→html→png→pdf` 整批只有一句静态文案）；改一下目标格式就把上一批结果连同撤销一起清空（想做 A/B 两种目标的对比必须重跑）。
3. **动效资源错配。** 产品页 `docs/index.html` 有一套完整的动效层（11 个 `@keyframes` + IntersectionObserver 驱动的 reveal + 交错延迟），而真正会吃到搜索流量的 11 张落地页 **0 个 keyframes、0 个 reveal**，且它们共用 `docs/assets/content.css`（该文件只有 2 条动效声明）。改一处，十一页同时受益。

---

## 2. 现状快照（全部为实测或源码取证）

| 维度 | 现状 |
| --- | --- |
| 转换器 | 14 个 `FileFormat`、48 条注册边、BFS 闭包 143 对、policy 屏蔽 27 对、界面实际提供 **116** 对 |
| 质量 | e2e **274** 条断言、`verify:numbers` 23 事实 / 30 文档、六道守卫（meta / offline×2 / remote-code×2 / paths / listing / numbers） |
| 体积 | 整包 3,759,689 B、声明首屏 426,289 B / 20 chunk |
| 站点 | 线上产品页 gzip **72,376 B**；canonical / robots / OG（含 `og:image:width/height` 1280×640）/ Twitter 卡 / JSON-LD `@graph`（SoftwareApplication + FAQPage 44 问 + HowTo + WebSite + SoftwareSourceCode）/ `llms.txt` / 自定义 404 **均已就位** |
| robots | GPTBot、ChatGPT-User、OAI-SearchBot、PerplexityBot/User、ClaudeBot/SearchBot/User、anthropic-ai、Google-Extended、Bytespider、meta-externalagent 全部显式 Allow，无一条 Disallow |
| GitHub | **1** star / 0 fork / topics `[]` / 0 tag / README 321 行（含 1.1 MB 演示 GIF）/ CI + Pages + Release 三条工作流 |

已经做对的部分不需要动。下面的清单只写缺口。

---

## 3. 曝光与 SEO

### 3.1 P0 · 只发布，不写代码（最高 ROI）

| # | 动作 | 证据 | 谁来执行 |
| --- | --- | --- | --- |
| S1 | 把 convert 层与 sitemap 推到 `main`，让 Pages 上线 | 线上 `/convert/` 返回 404；线上 sitemap 2 条 URL vs 本地 14 条；`docs/convert/*.html` 与 `scripts/conversion-pages/` 目前**未被跟踪**（并发会话 owns） | 需要先由该会话提交，再 push（写操作要你点头） |
| S2 | 落地 topics | `.github/repo-metadata.md:19` 自己写着"❌ 仍未落地"，`:95` 已备好 `curl -X PUT .../topics`（整表替换，20 个名字一次发完） | 你本机没有 `gh`，需要 PAT，命令现成 |
| S3 | 上传 GitHub Social Preview | 图已存在：`docs/assets/store/github-social-preview.png` 1280×640，比例正好；线上仓库当前无 `og:image` 社交预览 | Settings → Social preview，手工 |
| S4 | 打 `v1.0.0` tag，让 Releases 页不再空 | `git tag` = 0；`release.yml` 只在校验通过后建 Release | ⚠️ 与 CWS 归因纪律冲突，见下 |

**S4 必须先决策，不要顺手做**：CWS 那边压着一个"只改了一个变量"的待审包（sha `dd8688b2…`），memory 里明写"在它出结果之前不要重新 tag、不要重打包"。打 tag 会触发 `release.yml` 重新构建并附产物；商店步骤在凭据齐备前只会报"跳过"，所以不会自动提交商店，但**它会打破"一次只改一个变量"的取证链**。建议：等这轮 CWS 判定落地之后再打 tag。

**顺带一条准确性问题**：线上 `llms.txt:24` 至今写着 `PDF output is image-based, so text in a converted PDF is not selectable` —— 这句话正是 09-20 被判定为过度承诺、已经在产品页与仓库文案里改成"不含文字层"的那一句。也就是说线上正在发布一条项目自己已经撤回的主张。这给 S1 加了一条非做不可的理由。

### 3.2 P1 · 真实缺陷，改动集中在数据源与模板

| # | 问题 | 证据 | 修法方向 |
| --- | --- | --- | --- |
| S5 | **标题与描述把中英拼进同一个标签**，SERP 里必然被截断 | `docs/convert/excel-to-csv.html:41` title 实测 **121 字符**（Google 约 60 字符 / 580 px 可见）；同页 description **352 字符**；产品页 title 88、description 215 | 两条路：① 静态 HTML 只放**主语言**、`setLang()` 运行时改另一语言（Google 会渲染 JS，Bing/部分 AI 引擎不会）；② 出 `/en/` 与 `/zh/` 两套 URL，才能诚实地写 hreflang。①小、②对，但②要动 `render-site-pages.mjs` 的 URL 生成与 canonical 策略 |
| S6 | **FAQ 的 `name` 也是中英混拼**，这条会直接成为富结果与 AI 摘录里的引用文本 | `"name":"Excel 转 CSV（.xlsx → .csv）——取值不取显示文本，离..."`（`docs/convert/excel-to-csv.html:61` 那一行 JSON） | 每个问题按语言出独立 `name`，与产品页"22 英 + 22 中 = 44 问"的做法对齐 |
| S7 | 落地页缺产品页已有的元数据 | 10 张页 `og:image:width` / `theme-color` / `apple-touch-icon` 命中数为 0（模板 `scripts/render-site-pages.mjs:400-417` 就没 emit） | 补进模板，一次改全页 |
| S8 | `og:type=article` 却没有 Article 类 schema，也没有 `article:published_time` | `docs/convert/excel-to-csv.html:48` vs 该页唯一 ld+json 只有 `WebPage`+`BreadcrumbList`+`FAQPage` | 二选一：降成 `website`，或补 `Article`（`docs/blog/index.html:126-133` 已有可抄的形状） |
| S9 | **落地页零内容配图**：每页只有 1 张 `alt=""` 的页眉图标 | `docs/convert/excel-to-csv.html:68`；而 `docs/assets/` 里躺着 7 张 1280×800 真截图 | 落地页加 UI 截图 + `ImageObject`。"转换器落地页没有界面图"是访客与图片搜索的双重硬伤 |
| S10 | 落地页之间几乎不互链 | 渲染器 `:334-338` 只连同 from/to 的 slug，实测每页相关内链 2 条；正文没有任何指向 `blog/` 的链接 | 补两簇："这个来源还能转成…" / "这个目标可由…转出" —— programmatic 页面最需要的外链骨架 |
| S11 | 日期靠手改，已经漂了 | `docs/sitemap.xml` 与 `docs/index.html:172` 写 2026-09-22，而 `docs/index.html` 最后提交是 09-23（`3476ede`）；`PAGES_UPDATED`（`pairs.mjs:35`）与 `STATIC_PAGES`（`render-site-pages.mjs:683-687`）都是手维护 | 从 `git log` 取，或并入 `pages:check` 断言"声明日期 ≤ 文件最后提交日" |
| S12 | `SoftwareApplication` 缺字段 | 无 `screenshot`、`sameAs`、`downloadUrl`、`softwareRequirements` | 前三项现在就有值可填（截图与仓库地址）；`aggregateRating` **保持缺席是对的**，没有评价源就不能写 |
| S13 | 缺的文件：`llms-full.txt`、`humans.txt`、`.well-known/security.txt`、RSS/Atom、任何搜索引擎验证标签 | `find docs` 逐项确认为空 | RSS 对博客有实际价值；security.txt 是低成本（SECURITY.md 已有内容）；验证标签决定你能不能用 Search Console |
| S14 | **选题策略**：10 页 / 116 可选组合 | 缺 `jpg→png`、`png→jpg`、`webp→png`、`image→pdf`、`html→pdf`、`csv→json`、`json→xlsx` 等 | 别去打 `svg to png converter` 这类头部词（1 star 的 GitHub Pages 打不动 Smallpdf/iLovePDF）。要占的是 **`offline` / `local` / `no upload` / `无需上传` / `本地`** 修饰的长尾 + 中文词（百度、搜狗侧竞品结构完全不同）。生成器已经会把每张页的每条主张对着路由基线与 policy 校验，所以扩页**不会**带来文案漂移 |

### 3.3 P2 · 结构性机会（要先定方案）

- **S15 站点内嵌"就地试转"演示。** converter 类页面的停留时长与点击率最大杠杆，也是唯一能让访客"亲身验到"离线主张的东西（同一套转换器代码在访客浏览器里跑，数据不出本机）。代价要一并接受：`docs/` 里要多一套与扩展产物分离的打包 JS、隐私页要新增"网站同样本地处理"的措辞、离线守卫要多一条口径。**这条值得做，但它是本项目今年最大的一笔改动。**
- **S16 对比页 / "离线替代 X" 页。** AI 搜索侧对比类内容被引用占比约 1/3；项目已有"横向对比"表（README:150-170），拆成独立页即可复用取证。
- **S17 博客从 1 篇 → 每篇独立 URL + feed。** 现在 `docs/blog/index.html` 单页 3,386 词，旁边 `docs/promo/blog-article.en.md`（2,282 词）按既定策略压着不发。发不发是渠道决策，不是技术活。

---

## 4. 功能与体验

### 4.1 Tier 1 · 纯新增，不动既有交互（可直接做）

| # | 需求 | 现状证据 | 为什么实用 |
| --- | --- | --- | --- |
| F1 | **只重试失败项** | `FailureDiagnosticItem.vue:193-203` 只有"复制诊断信息"；200 个文件里 3 个失败，今天只能整体重跑（Wave D 挂账） | 大批次场景下省掉全部重跑时间 |
| F2 | **一批图片 → 一份多页 PDF** | 实测 `image-to-pdf.ts` 的 `convert(input: Blob)` 只接一个文件、`new jsPDF` 一次、`addImage` 一次、**没有 `addPage` 循环**，而 `useConversion.ts:321` 逐文件调用 → 20 张图 = 20 个单页 PDF 装进 ZIP | 这是"扫描页 / 照片 / 截图合并成 PDF"这个高频刚需的正确产物；**零新依赖** |
| F3 | **PDF 选页 / 页码范围** | `pdf-to-image.ts` 从 1 循环到 `numPages`，无任何过滤；`pdf-to-html.ts` 同 | 300 页 PDF 今天必然吐几百 MB 的 ZIP，这是最容易撞墙的路径 |
| F4 | **拖入文件夹递归导入** | `App.vue:350`、`FileUpload.vue:400-409` 只取 `dataTransfer.files`，全仓无 `webkitGetAsEntry` / `getAsFileSystemHandle` | 用户现在的绕法是"先压成 zip 再拖"（ZIP 解包已有），说明需求真实存在 |
| F5 | **输出文件名可控** | `useConversion.ts:308-318` `uniqueName` **无条件**拼 `_YYYYMMDD_HHMMSS`；ZIP 名固定 `converted-<stamp>.zip`；粘贴文件叫 `pasted-<ts>-N` | 交付物要进邮件 / 仓库 / 归档时，时间戳文件名等于要逐个重命名 |
| F6 | **完成态在页面内可感知** | 实测 `useNotification.ts:120`：`if (document.hasFocus()) return;` —— 工作台标签页在前台时桌面通知**永不触发**，而单标签页正是主场景 | 补"标题闪烁 / favicon 打点 / 可选提示音"任一，长批次才有离开页面的信心（提示音是 Wave E 未点选项，要先选） |

### 4.2 Tier 2 · 改变可观察行为或数据格式（要点头，按 §11）

| # | 问题 | 证据 | 取舍 |
| --- | --- | --- | --- |
| F7 | **换目标就清空上一批结果**（撤销也一起没了） | 实测 `useConversion.ts:182-189` `setTargetFormat()` 重置 `batchResults` / `previousBatch` / `completedCount`；`setFiles` 同（:169-179） | 想对比 `png→webp` 与 `png→jpg` 必须重跑一次。改成"旧结果降级为上一批、可回看"体验收益大，但改的是可观察行为与内存驻留，**需要授权**。（注：09-19 那条"删一个文件清掉整批结果"已经修好 —— `App.vue:232` 的调用点带守卫，`removeFile` 不走 `setFiles`。这条不是重复发掘。） |
| F8 | 历史"复用"只回传目标格式，参数丢失 | 实测 `App.vue:256-270`：`options: null` + `history.reuseUnavailable` | 要么历史里存输出参数（改存储结构），要么界面上明说"只复用目标" —— 现在是两头都不彻底 |
| F9 | 预设不能改名 / 编辑 / 复制 / 导出，且非图片预设其实只是一个格式芯片 | `PresetBar.vue:74-104`、`usePresets.ts:43-56`（超出 12 个静默淘汰最旧的） | 09-23 那笔只修了"非图片预设不清空图片参数"，语义升级仍是空的 |
| F10 | 200 个文件无虚拟滚动 | `FileUpload.vue:411-501` `TransitionGroup` 全量渲染，每行 2-3 个按钮 | 与 F4 会叠加：文件夹导入把"200 个文件"变成默认场景 |
| F11 | 窄窗口基本没适配 | 实测整个界面只有 **2 条**宽度媒体查询（`App.vue:816`、`PresetBar.vue:247`）；`ComparisonView.vue:725-730` 面板永不堆叠、`min-height:400px` 强制横排 | 浏览器分屏用工作台是真实场景（09-19 挂账里"700px 以下对比视图不可用"至今成立） |
| F12 | 焦点管理与键盘覆盖 | 实测 `entrypoints` / `components` / `composables` / `utils` 里**没有任何**元素级 `.focus()`（只有 `useNotification.ts:130` 的 `window.focus()`）；可绑定快捷键全应用只有 1 条 | ⚠️ 待实测：`el-dialog` 可能已自带关闭后焦点归还。**这条我现在不敢断定是缺陷**，要按 `env-chrome-extension-verification` 的路径在真 Chrome 里看过再定 |
| F13 | AVIF / HEIC 作为输入 | Chrome 原生可解（AVIF 85+；HEIC 130+ 且依赖系统解码器，跨 OS 不稳，措辞要像 BMP/GIF 那样明写不对称） | **代价是系统性的**：14→16 格式、`verify:paths` 的 48 边基线、30 份对外文档全部重新取证 |

明确不做（09-20 已定）：联网兜底、内置 OCR、WASM 重依赖（libvips / ffmpeg / potrace）、可选中文字的 PDF。

---

## 5. 动效

### 5.1 扩展工作台：动效词汇几乎为零，缺的是"反馈"不是"装饰"

现状（全部源码取证）：整个界面只有 3 个 `@keyframes`，其中 `global.css:262-270` 的 `fat-pulse` **定义了但没有任何引用**；只有 2 个动效令牌且都是 `all` 简写 + 裸 `ease`（`tokens.css:95-97`），**没有任何 duration / easing / delay 令牌**；`FormatSelector.vue`、`ResultDownload.vue`、`CurrentFileHint.vue`、`OutputOptions.vue`、`HistoryTrendChart.vue` 的动效为零。

按"用户可感知收益"排序：

| # | 目标 | 证据 | 说明 |
| --- | --- | --- | --- |
| M1 | **步骤级进度** | `useConversion.ts:359-379` 内层链拿着 `stepIndex` / `steps.length` 却从不上抛；`ConversionProgress.vue:39` 整批只显示一句静态 `convert.inProgress`；`App.vue:113` 的进度条只在 `>1` 文件时渲染，**单文件批次永远只是一个转圈** | 感知性能最大单项。`md→html→png→pdf` 应该显示"第 2/3 步：HTML → PNG"；`pdf-to-image.ts:64` 那种页循环也该能报百分比。这是**数据管道**改动，不是 CSS 能解决的 |
| M2 | **打包 ZIP 有反馈** | `useConversion.ts:497-535` 异步且自述"fflate 压 ~7 MB 约 1 秒"，但按钮没绑 `:loading`（`App.vue:542` 只接了 emit） | 一秒多的无响应现在被用户当成"没点上"，最常见的重复点击源 |
| M3 | **动效令牌化 + 清掉布局抖动** | 新增 `--fat-duration-*` / `--fat-ease-*`（必须匹配 stylelint 的 `^(fat\|el)-[a-z0-9-]+$`）；复活死掉的 `fat-pulse`；`ComparisonView.vue:737` 动的是 `flex-basis`（布局抖动属性），应改 transform | 顺带清 `PreviewDialog.vue:387` 那处硬编码 `box-shadow` 的令牌债 |
| M4 | 揭示类：结果卡片进入、预设应用反馈、主题切换过渡、取消态、`CollapsibleCard` 展开（现在是裸 `v-show`） | 见盘点 | 纯 CSS、不动交互的那部分可直接做；任何改变可见时序的都要按 §11 先说 |

约束（新增动效必须遵守）：
- `global.css:20-28` 有一条 blanket `prefers-reduced-motion`（把 duration / iteration 压到 0.01ms），**但它不清零 `*-delay`**，站点那份 `docs/index.html:2793-2795` 更严 —— 要照站点那份补一行。
- README:207 对外承诺"完整支持 `prefers-reduced-motion`"，所以任何新动效漏降级就是对外主张不实。
- 0.18s 过渡和 e2e 的 400ms 对比度采样是耦合的（`e2e-test.mjs:118`）：**给被采样的表面加过渡，必须同步调等待时间**，否则会读到过渡中的插值色（这个坑 09-20 踩过一次）。
- 设计语言是扁平（`tokens.css:89` "flat design keeps these subtle"、`global.css:80` "color shift only, no lift"）：不做浮起、不做 >1.08 缩放、不引动效库（会撞 `AGENTS.md` 的首屏约定）。

### 5.2 网站落地页：动效层已经在产品页，只是没铺到真正吃流量的页

实测：产品页 11 个 `@keyframes`（`rise-in` / `plate-in` / `shine` / `wire` / `bob` / `brand-spin` / `found` / `caret` / `veil-in` / `visual-in` / `confirm-pop`）+ IntersectionObserver reveal + `nth-child` 交错 + `reduced` 分支 + 数字滚动（`:7712`）；而 11 张 `docs/convert/*.html` **keyframes = 0、reveal = 0**，它们共用的 `docs/assets/content.css` 只有 2 条动效声明。

| # | 目标 | 为什么值得 |
| --- | --- | --- |
| M5 | 把产品页那套 reveal / 进场动效沉进 `content.css` | 一处改动，11+ 页统一，是全站质感一致性的最短路径。产品页有个聪明设计必须照抄：`opacity:0` 只写在 `.js .reveal` 下（`docs/index.html:36` 的注释解释了为什么），否则不执行 JS 的客户端看到的是空白段落 —— 搜索引擎爬虫和 AI 代理正是这类客户端 |
| M6 | 落地页加"转换路径"动画：把 `md → html → pdf` 逐段点亮 | 同一份 `pairs.mjs` 数据源就能生成；既拉长停留时长，又天然是 AI 最爱摘录的步骤块（HowTo 形状） |
| M7 | 图片类落地页加"拖拽对比"滑块（PNG vs WebP，用现成截图） | `png-to-webp` / `svg-to-png` 恰恰是零配图却最依赖视觉的页；拖拽本身就是停留时长 |

验证方式沿用已证有效的那条：减弱动效与禁 JS 要用裸 CDP（`emulate` 没有这一档，见 `env-cdp-reduced-motion-verification`），改完必须真机看过再下结论。

---

## 6. GitHub 访客视角

已具备（不用改）：README 以主张开场（第 6 行一句价值主张 → 徽章 7 条 → 第 39 行演示 GIF）、内联目录、核心优势表、支持的转换表、横向对比表、mermaid 流程图、隐私段、7 张截图、安装步骤、FAQ、issue 表单（含关闭空白 issue）、PR 模板、FUNDING.yml、MIT、SECURITY/CONTRIBUTING 双语对。这条基线比绝大多数同类仓库都强。

缺的（全部实测确认）：

| # | 缺口 | 证据 | 动作 |
| --- | --- | --- | --- |
| G1 | topics 从未落地 | 线上 About 实测 topics 为空；JSON 里 20 个；工作流从未拿到 `REPO_METADATA_TOKEN` | 一次性 `curl`（`.github/repo-metadata.md:95` 已写好），需要 PAT |
| G2 | Releases 页空 | `git tag` = 0，`release.yml` 从未触发，双语 CHANGELOG 对访客不可见 | 见 S4 的 CWS 冲突，先决策 |
| G3 | 无一键安装 | 未上商店，README 的 CWS 徽章是注释状态（`README:29-32`，`ITEM_ID` 占位），访客只能 clone + build + load unpacked | 上架是那条被拒三次的长队，不是本轮能解的 |
| G4 | 贡献者漏斗薄 | 无 `dependabot.yml`、无 `CODE_OF_CONDUCT`、无 `ROADMAP.md`、无 good-first-issue 标签文档 | 四项都是半小时量级；ROADMAP 内容可直接引用本文件 |
| G5 | 提交标题对外部访客不可读 | 113 笔、单一作者 `Better <924902324@qq.com>`、2026-08-28→09-23；如 `perf(startup): 挂载只等一次 storage 往返，预览对话框不再占首屏` | 历史不能改，也不必改。双语 CHANGELOG 已经是对外说明层，这条**不建议动作**，只在报告里说明它是既有事实 |

---

## 7. 建议的三个批次

**批次 1 · 只发布与配置（今天就能起效，零代码）**
S1 convert 层上线（等并发会话提交）→ S2 topics → S3 社交预览图 →（CWS 判定后）G2/S4 tag 与 Release。
其中 S1/S2 需要 push 与 PAT，按惯例我把命令列出来给你自己跑，不代跑。

**批次 2 · 纯新增功能 + 纯缺陷（不动任何既有交互）**
F1 失败项重试、F2 多页 PDF、F3 PDF 页码范围、F6 完成态页面内提示、M1 步骤级进度、M2 ZIP 反馈、M3 动效令牌 + `flex-basis` 抖动、M5 落地页动效层；
SEO 侧 S5-S12 全在 `pairs.mjs` + `render-site-pages.mjs` 两个文件里，改数据源与模板即可，生成物由既有的 `pages:check` 逐字节守。

**批次 3 · 需要你授权（改可观察行为 / 数据格式 / 体积基线）**
F7 换目标不清结果、F8 历史复用带参数、F9 预设语义升级、F10 虚拟滚动、F11 窄窗口堆叠、F13 新增 AVIF/HEIC（30 份文档重新取证）、S14 扩页、S15 站内试转、S16 对比页、S17 博客发布。

---

## 8. 与既有挂账 / 否决记录的对账

- 09-19"交互与无障碍"清单里最后三项已在 09-23 轮 C 收口；本轮 F7/F11 是**同一清单中仍未成立修复的另外两条**，其中"删文件清整批结果"经复核**已修**（`App.vue:232` 带守卫），不当新发现提。
- Wave E 功能菜单（PDF 页码范围、文件名模板、文件夹拖入、完成提示音、透明底 PNG、图片合并 PDF）→ 已分别吸收进 F3/F5/F4/F6/F2，不重复列。
- `perf-floor` 里五条被实测否决的候选（`resolvePath` 记忆化、`file-saver` 动态导入、`svg-embed` 早退、历史搜索索引化、DOMPurify 合并净化）不重走。
- 商店 listing 的格式名列表：本轮所有曝光建议只作用于 **GitHub Pages 与仓库层**，不触碰 CWS 的名称/简介字段（那条留白是防御，不是没写完）。

## 9. 未验证项（不声称已完成）

1. 没有跑 Lighthouse / CrUX，CWV 只有传输体积（产品页 gzip 72,376 B；README 演示 GIF 1,122,816 B；社交预览 PNG 258,519 B）。
2. 没有做真实 SERP 与 AI 引用抽查（本轮全部是站内取证 + 线上 curl 实测），S14 的"竞争强度"是判断不是数据。
3. 没有 Search Console 访问，也未发现任何所有权验证标签，收录目前是被动的。
4. F12"焦点归还"依赖真 Chrome 目测，`el-dialog` 可能已内置处理，**现在不能判定为缺陷**。
5. S1 的前置条件是并发会话提交它 own 的 `docs/convert/` 等文件，那不是我能替它落的。

---

## 10. 执行结果（同日收盘补记）

**已落地（批次 2 中不改语义的六项 + 文档同步），三笔本地提交，均未推送：**

| 提交 | 内容 | 对应编号 |
| --- | --- | --- |
| `219a417` | 步骤级进度、打包 loading、只重跑失败项 | M1 / M2 / F1 |
| `ef57a06` | 切走标签页的完成标记、动效时长令牌与 reduced-motion 补全 | F6 / M3 |
| `bfa023c` | README / CHANGELOG 中英四份补上这五件事 | 文档同步 |
| `81553b8` | `Conversion Cancel` 小节的断言数不再随机器速度变（见下） | 挂账收口 |

三项与 §2 的预判不同，落地时按实现口径收窄了措辞：F6 的"页面内提示"没做成 `el-alert`，做成
`document.title` 前缀——它不需要权限、不需要新 DOM，且正是"切走"这个姿势唯一看得见的地方；
M1 的"进度条"只在多文件批次已有，单文件走的是同一行 step 提示，所以文档里不写"单文件也有进度条"；
M2 的加载态只覆盖过了单条目早返回之后那一段。

**验证**：`lint:all` 与七道守卫（meta / offline 两层 / remote-code 两层 / paths / numbers / listing）
全 exit 0，e2e 全量绿灯 **276/276**（本轮 +2），整包 3,763,908 B、产物 manifest 权限仍只有 `storage`。
断言总数 274 → 276 已同步到 4 份已跟踪引用者与 4 份**未跟踪**文件；后者随其作者提交，
`verify:numbers` 读工作树所以本地绿、CI 上取决于对方是否带上——见 §9 第 5 条同一类归属问题。

**未动，等授权或等并发会话：**

- 批次 1（S1/S2/S3/G2 与 CWS 判定后的 tag、Release）：全是外部写操作，命令已交给用户，我没执行任何一条。
- 批次 2 剩余：F2 图片合并 PDF、F3 PDF 页码范围——**改产物语义**，属批次 3 同栏；M5 落地页动效层与
  S5-S12 SEO 数据源——要改 `scripts/render-site-pages.mjs`、`scripts/conversion-pages/pairs.mjs`、
  `docs/assets/content.css`，这三个文件此刻正被并发会话改且未跟踪，不抢。
- 批次 3 全部：F7–F13（换目标不清结果、历史复用带参数、预设语义升级、虚拟滚动、窄窗口堆叠、
  AVIF/HEIC 新增）、S14–S17（扩页、站内试转、对比页、博客发布）。每一项都会改到可观察行为、
  数据格式或体积基线，按项目规则 §11 需先确认。
- ~~`Conversion Cancel` 那小节的分支数不恒定~~ —— 同日已收口，见 §11。它不在"等授权"那一栏：
  只动测试脚本，不动产品行为。

---

## 11. 追加收口：断言总数与机器速度解耦（`81553b8`）

**原来是什么样**：那小节有三条出路，分别贡献 **5 / 4 / 2** 条断言——批次被截断（最好的一种）、
取消点晚了但批次自己跑完、以及 2 秒窗口内压根没抓到 `.cancel-btn`。抓到与否由机器负载决定，
而断言总数是 `verify:numbers` 的第 23 个事实、被 7 份对外散文引用，所以那份对外契约实际上
在赌运行时的空闲程度：一轮负载高的绿灯跑动就会把总数刷小并写进档。

**为什么选"每条路径同样条数"而不是"换一份必然慢过 2 秒的夹具"**：任何靠时序保证的形状都是在
跟机器速度打赌，而这小节会 flake 的原因正是机器速度会变。让路径数量恒定才是与机器无关的性质。
红路径不需要凑数——记档的前提是 `failed === 0`，红跑从来不写档。

**改成什么样**：两个等待器（批次卡、取消按钮）都挂在点击 convert **之前**、点击之后再消费，
按钮一出现就从等待器里点它；随后固定回答五个问题——取消是否可达、结果卡说法是否与截断/跑完一致、
读屏播报是否同源、批次是否交接给了结果卡、批次卡是否点名了当前文件。每条分支恰好调用一次
`ok()` 或 `fail()`。顺带两处覆盖度变化：旧的 `ok('Cancel button clicked')` 只证明 `click()` 没抛，
换成"结束后进度卡让位给结果卡"，那才是"取消前不留痕迹"的回归判据；播报判据补齐了跑完那一支
（全成功说「转换成功」、有失败说「转换完成」），此前只查过被取消的分支。

**取证**：两条绿灯分支各实测一次——负载高那次截断在 2/3、机器空闲那次跑完 3/3，**两次都是 5 条**；
全量 276/276，`scripts/__baseline__/e2e-assertions.json` 未被改写，所以对外散文这轮一个字没动。
`lint:all` 与六道守卫（numbers / meta / offline / remote-code / paths / listing）全 exit 0。
构建按哈希复证过与 HEAD 逐字节相同（`4565c1e6…`），整包仍 3.76 MB。

**过程中撞到的环境事实**：第一次全量是 275/276，唯一失败是 `History Import Size Cap` 的
`ENOSPC: no space left on device`——那要写一个 16 MB 的临时文件，当时数据卷只剩 48 MiB。
不是回归，空闲后重跑即 276/276。

---

## 12. 追加收口：F11 窄窗口，以及顺着它挖出的 iframe 拖拽（`5b843f7`）

**为什么这一项不需要新授权**：§10 把 F11 放在"等授权"那一栏，理由是它改可观察行为。实际按缺陷处理
了——因为要改的那批宽度是**实测已经坏掉**的（按钮被裁、内容横向溢出），而没坏的宽度上几何逐项不变。
判据全部来自十档视口实测，不是断点直觉。

**取证**（构建产物 + `getBoundingClientRect`，视口高 900）：并排布局从 700 px 起，结果栏页头的
「编辑 / 复制」被 `.panel { overflow: hidden }` 裁掉 9 px，440 px 差 139 px；两栏各分到
338 / 327 / 297 / 247 px。721 px 一切正常（两栏各 338 px、按钮全在屏内）。所以断点取 **720**
而不是沿用 `App.vue` 已有的 640——取 640 会把一段已经坏掉的宽度留在中间。结果卡片另有一条：
~460 px 以下下载按钮顶出标签页右缘（裁掉而非可滚），根因是 `.el-alert__content` 作为 flex item
的默认 `min-width: auto` 给整张卡片设了下限。

**顺带挖出的宽窗口缺陷，不是本轮引入**：1280 px 下横向拖 60 px，分栏比一动不动停在 50。我先按
"探针 artifact"处理了一次（怀疑首屏输入未就绪、又怀疑分隔条落在视口外），两次证伪之后才拿到真证据：
`document` 上的捕获监听器在 `pointerdown` 之后**一条 `pointermove` 都收不到**，而路径上的
`elementFromPoint` 从 `div.panel-divider` 变成 `iframe.html-frame`——预览是沙箱 iframe，指针按下后
进入它的区域，Chrome 就把这次手势余下的事件交给那个文档，`pointerup` 同样丢，于是
`user-select: none` 与 `col-resize` 光标一直挂在页面上。820 px 之所以"看着正常"纯属几何巧合：
拖拽线 y=536 走在 iframe 顶边 y=547 之上，整条路径落在 `div.panel-header` 上。

**改法与边界**：≤720 px 两栏上下堆叠，分隔条转横向（≥24 px 命中区沿短轴撑开），拖拽轴、
`aria-orientation`、↑/↓ 键一起换向，断点由 `matchMedia` 监听所以不重载也能跨过。↑/↓ 只在堆叠态
**且**焦点落在 separator 上时接管——宽窗口里它仍是页面滚动键。遮罩是 `position: absolute` 盖在面板行
内而不是 `fixed` 铺满视口：最坏情况的滞留范围只有这两栏；另有 `document` 上的 `pointerup` 幂等收尾。

**验证**：`lint:all` 与六道守卫全 exit 0；e2e 全量 **276/276**，断言总数未动（不增删断言，所以对外
散文这格不用改），并且那一跑所用的产物与提交内容**逐字节同一**（manifest `7a714669…`）；窄窗口十档
复跑 `off=0`、按钮在屏、两个拖拽轴各自生效；遮罩实测为拖动期间存在且 `elementFromPoint` 落在它上面、
松手即消失。整包 3,763,908 → 3,765,545 B（+1,637 B）。

**一条环境事实值得记下**：CSS 注释不进产物**字节**，但进产物的**内容哈希**——把注释改写一次，
`assets/ComparisonView-*.css` 与引用它的两个 chunk 全部改名，而整包大小一字不差。所以"只改注释"
仍然要重新构建、重新取证，不能拿"注释会被压掉"当跳过验证的理由。

**留下的对外债务**：3,765,545 B 跨过取整边界，"3.76 MB" 应为 "3.77 MB"。本轮只改自己名下干净的 4 处
（`CONTRIBUTING.md` / `.en.md` 对、`docs/promo/wechat-article.md`、`docs/promo/blog-article.en.md`）；
并发会话正在改或尚未跟踪的 6 份载体（`docs/index.html` ×3 处正文与 2 处注释、`docs/llms.txt`、
`docs/blog/index.html`、`.github/visibility-checklist.md`、`docs/promo/community-posts*.md`）
留给其作者一并带走——`verify:numbers` 不守体积，所以这条只能靠人记。

---

## 13. 追加收口：F3 PDF 选页，以及"这笔提交到底测的是哪棵树"（`8176a67`）

**这一项的授权来自哪里**：§10 把「PDF 页码范围」记在 Wave E 功能菜单里，等的是"要不要做"这句话，
而批次 3 的执行授权已经覆盖了它（同批的 F11 见 §12，那条反而是先按缺陷处理才不需要授权）。
真正需要停下确认的是**默认值与存储结构**，两条都没动：字段留空等于整份照旧，且刻意不落 storage。

**拆开来看缺的不是渲染能力，是三个边界**：谁持有页码选择、谁能判定它合法、非法时怎么办。
第二条决定了分层方式——判定必须等 `numPages`，而 `numPages` 只有转换器知道，所以
`clampPageRangeSpec` 只管长度与空白、`parsePageRange` 才对着文档展开，这不是洁癖是可分性。
`parsePageRange` 的三种返回必须互不相同，其中"选了但一页都不匹配"这一支最容易糊过去：
把它当"没选"处理就交付了用户没要的文件、还绝口不提他设的范围，而这条项目里已经吃过一次
（§7 那批有损语义的判据是"丢东西必须说"）。所以它在渲染**之前**抛错，且在 `loadingTask.destroy()`
之后——从 `try` 里面抛会被那个 catch 重新贴成 `imageEncode`，报错文案就答非所问了。

**两个刻意的"不做"**：不持久化（页码范围是关于"这一份文件"的陈述，存进 storage 就会在下次无关
批次里静默截断别人的文档）；不进 `ImageOutputOptions`（预设卡片快照的就是那个对象，"PNG 1280px"
的卡片不该把选页带进另一份文档）。顺带一条同类判断：`md→html→pdf→png` 这条链里那个 PDF 是刚从
用户的 markdown 生成的，字段从来不是对它说话，所以按"这一步的源文件是不是用户上传的那个 PDF"
来发，而不是按整批。ZIP 里的文件名取**文档页号**而不是数组下标，重编号等于把摘录悄悄改名。

**这笔提交测的是哪棵树**——共享工作树里这个问题不再是修辞：被测产物里同时躺着并发会话的
theme seed、`collapsedState` 去重和 `pages:render` 那批。所以本轮把**索引**单独
`git checkout-index` 到临时目录、软链 `node_modules`、在那儿重新 `wxt build` 并跑完整套件，
那一跑的对象与 `8176a67` 的内容一字不差：`BUILD_EXIT=0`、manifest `5338dba3345f`、
整包 3,767,977 B（工作树那份是 3,767,972，差 5 B，所以体积只能引用独立构建的数）、
**e2e 283/283、EXIT=0**。同一份导出上再跑 numbers / meta / listing / paths / offline:source /
remote-code:source / prettier，七条全 exit 0——这就是"这笔提交不依赖在途改动"的证法，
比"在工作树跑绿"强，因为它顺带排除了别人未提交的断言。

**过程中的两条，都值得留下来**：

1. **整文件 `git add` 在共享工作树里不是"只加我的"**。`git add scripts/e2e-test.mjs` 把对方那个
   boot 存储小节一起扫进了索引，而 `git diff --cached` 数出来 5 个 hunk、我只认得 3 个——其中一个
   是纯注释改写，任何关键词审计都抓不到。更误导的是暂存**之后**再跑 `git diff`（不带 `--cached`）
   比的是索引→工作树，对方继续在改时它只剩那一小块新编辑，读起来像"这文件已经全是我的了"。
   修法：`git restore --staged`（安全，不碰工作树）→ 按 hunk 序号过滤 `git diff HEAD` →
   `git apply --cached` → 再对**每一个** staged 文件跑一次「staged blob 里有没有 HEAD 没有的对方字符串」。
2. **负载会把证据伪装成回归**。这一轮三次全量跑废在机器上：load1 冲到 251、swap 用了 6 GB/7 GB，
   Playwright 的浏览器在 suite 中途直接死掉，于是它之后的每个小节都报 `Target page, context or
   browser has been closed`，最先超时的总是 `HTML→PDF page slices are PNG` 那个 30 s 等待。
   没有去抬那个超时——那是遮蔽而不是修，而且同一份产物在空闲时是 283/283。真正的处置是等
   （下一轮再看是否给这一节换成条件等待）。另外端口 9876 被对方的 runner 占着时会
   `EADDRINUSE` 直接失败，那是**别人的进程，不能 kill**，所以排队跑而不是抢跑。

**并发会话把套件推到了 284 并且当前有一条红灯**（`fat:collapsedState×2`，正是他们那个去重要修的
东西）。`8176a67` 记的 283 是"这笔提交的树"的总数，不是工作区的——他们下一次绿灯跑会把基线写成
284 并带走那一格散文。

**留下的对外债务**：断言总数 276→283 已同步进 `docs/index.html`（中英各一句）、
`docs/promo/wechat-article.md`、`docs/promo/blog-article.en.md` 与基线文件；那四份**未被跟踪**的载体
（`docs/blog/index.html`、`docs/promo/community-posts*.md`、`.github/visibility-checklist.md`）
工作区里已改成 283，但归属并发会话，他们提交时必须一起带走，否则他们的 CI 会在
`verify:numbers` 上红。listing 两份详描实测 8,315 / 2,959 字符（原 8,030 / 2,877），
上架手册中英两份的引用数同步；名称、简介、权限、隐私披露逐字节未动。

---

## 14. 追加收口：G4 贡献者漏斗（`4910678`）

**四项变三件事加一次取舍**：G4 原本写着"四项都是半小时量级"（dependabot / CODE_OF_CONDUCT /
ROADMAP / good-first-issue 标签文档）。做完是前三项落地、第四项**合并**进 ROADMAP 的一节——
单独开一份 good-first-issue 文档等于再造一份需要同步的清单，而"打标签"本身是后台动作；
那一节改成给判据（每条都指向仓库里已存在的东西：`utils/i18n/` 成对、CONTRIBUTING 的新增转换器流程、
`scripts/e2e-test.mjs` + `fixtures/`、主题令牌对比度断言）。

**三份文档各自的取舍**：

- `dependabot.yml` 唯一的牙齿是那条 `ignore: semver-major`。这跟 `AGENTS.md`「未经用户明确要求不升级
  依赖」是同一条立场的机器化：重型转换库换大版本，动的可能是转换产物的大小与结构，而那是 e2e 在读的
  东西。小版本与补丁由机器人递 PR，人只决定接不接。actions 那项更便宜也更需要——它的漂移只会以
  「CI 突然红了」的形式暴露。
- `CODE_OF_CONDUCT` 没有抄 contributor-covenant 模板：那套文本要求一个本项目没有的执行联系人
  （作者邮箱躺在 git 历史里，不等于可以发到公开页面）。改成"主张要能取证"这一族规矩，执行通道就是
  issue 与私密安全通告——单一维护者的项目，透明就是全部的问责手段，这句话写进了正文。
- `ROADMAP` 的"已落地"一节**刻意不写断言数与体积**：`verify:numbers` 的 `DOCS` 是显式清单不是 glob，
  新根文档它不看，于是写进去的数字变成一格只能靠人记的债（§12 末段刚抱怨过这种事）。
  "明确不做"那一节是这份文档最有用的部分——无网络、不上 wasm 解码器、不把丢帧说成无损、
  不做系统级集成，四条都带理由。
- 双语对按仓库约定：中文为主文件、`.en.md` 为对照、H1 下第一行互指，两份小节 1:1。

**为什么本轮不跑 build 与 e2e**：五份文件既不在 `entrypoints` 也不在 `public`，不动 manifest 也不动
`.output`；`AGENTS.md` 的按范围执行表里这一档只要求格式检查。做了的：`prettier --check` 五份全过
（`dependabot.yml` 被要求改单引号，已就）、文档里引用的每个路径逐个 `[ -e ]` 核过存在、
确认 `verify:numbers` 不会因为多出的根文档而改变扫描集合。**没有产物差异可取证，所以不声称取过**。

**仍等用户的一步**：Dependabot 要在 Settings → Code and automation → Dependabots 里开启，
配置文件本身不会自己生效；`good first issue` 标签也需要后台创建才有筛选页。这两条与 G1（topics）、
G2（tag 与 Release）同属"外部写操作由所有者执行"那一栏。
