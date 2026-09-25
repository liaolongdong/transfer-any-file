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

## 2. 验证：本机已经全部跑过

| 命令                                                         | 结论                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint:all`                                              | 通过（本轮 5 个文件需要格式化，已 `prettier --write` 修掉：`repo-metadata.md`、`content.css`、`docs/blog/index.html`、两份生成脚本） |
| `pnpm verify:meta`                                           | 通过，英文简介 127/132                                                                                                               |
| `pnpm verify:listing`                                        | 通过，7 个粘贴字段在限内且与各事实源一致                                                                                             |
| `pnpm verify:paths`                                          | 通过，48 条边 / 182 对                                                                                                               |
| `pnpm pages:check`                                           | 通过，12 个文件等于数据源渲染结果（格式化生成脚本之后重跑仍等于原字节）                                                              |
| `pnpm verify:numbers`                                        | 通过，23 项事实比对 **30 份**对外散文（这份清单也在其中，它引用的数字同样会老化）                                                    |
| `pnpm verify:offline:source` / `pnpm verify:offline`         | 两层都通过，产物 manifest 权限恰为 `["storage"]`，无 host / optional                                                                 |
| `pnpm verify:remote-code:source` / `pnpm verify:remote-code` | 两层都通过（源码 77 个文件、产物 45 个文件）                                                                                         |
| `pnpm build`                                                 | 通过，8.1 s，整包 3.76 MB；`.output/chrome-mv3` 内**没有** `docs/`、`CHROMEWEBSTORE.md` 等文档产物                                   |

**没跑的一项**：`pnpm test:e2e`。理由是本轮只动文档、生成脚本与工作流，未触碰运行时、manifest 与依赖。
如果要在合并前跑满（约 20 分钟，且本机需要手动装过 ffmpeg 与 chromium 二进制）：

```bash
pnpm test:e2e        # = pnpm build + node scripts/e2e-test.mjs，断言基线 283 条
```

**待裁决的那个包没被动过**（已核 sha）：`.output/transfer-any-file-1.0.0-chrome.zip`，sha256 `dd8688b2…c0b0b3`，
1,146,878 B。`pnpm build` 只重写 `.output/chrome-mv3/`，不生成 zip；zip 只在 `pnpm package` 时才换，所以第 8 节那条禁令是有效的。

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
4. **暂时不要打 tag**：仓库当前没有任何 tag，而 `release.yml` 在凭证齐备时会推包到商店——现在 tag 等于把
   「待裁决的包」换成新样本，第三次判定就再也无法归因（第 8 节）。等裁决回来再谈发版。

## 7. 让搜索与 AI 答案引擎看见

`docs/robots.txt` 已经放行 Googlebot / Bingbot / GPTBot / ClaudeBot / PerplexityBot 等，并带 `Sitemap:` 行；
`docs/llms.txt` 已含新页面链接。这两件事不需要后台操作，所以下面全是**收录加速**而非配置修复。

1. **Google Search Console**。`liaolongdong.github.io` 不是你的域名，拿不到 DNS，所以「网域」属性走不通；
   用 **网址前缀** `https://liaolongdong.github.io/transfer-any-file/`，验证方式选 HTML 标记：
   GSC 给的 `<meta name="google-site-verification" content="…">` 加到 `docs/index.html` 的 `<head>`（其他 meta 之后），
   然后 `pnpm lint:all && pnpm pages:check` → 提交 → 等部署 → 回 GSC 点「验证」。
   这条改动只碰一个 meta 标签，不进任何守卫的射程；把 content 值给我，我可以连这一步一起提交。
2. **提交 sitemap**：GSC → sitemap → 添加 `https://liaolongdong.github.io/transfer-any-file/sitemap.xml`（14 条）。
3. **逐条请求收录**，优先级按「新页面 + 有搜索意图」排：首页 → `/convert/` → 10 张配对页 → `/blog/`。
   `privacy.html` 不必提交。
4. **Bing Webmaster Tools**：直接从 GSC 导入站点即可。IndexNow 属可做可不做，如果要做得把 key 文件放站点根
   （`docs/`），`static.yml` 只挡 `.md`，一个 `.txt` 能发出去。
5. **预期**：GitHub Pages 子路径的新页面从「抓到」到「有展示」通常是数周量级；`png to webp` 这类头词竞争极强，
   真正可能带来点击的是长尾（离线 / 批量 / 不上传 / 某格式转某格式）。所以第 8、9 节带来的真实用户比排名更早见效。

## 8. Chrome 应用商店：本轮刻意不动

取证结论（不是一时保守，是量过的）：

- 中文简介用 66/132、英文用 127/132，**留白是刻意的**——第三次之前的两次拒审引用的都是「冒号/逗号分隔的格式名列表」
  这个形状，砍掉八个格式名正是从 98 降到 66 的那一刀。回填等于把同一条违规搬到主字段上。
- 简介字段有 4 处镜像（控制台 Summary = `CHROMEWEBSTORE.md` 的 Short Description = `_locales/en → extensionDescription`
  = `package.json#description`），外加 8 处长度引述；改一处要动一片，而收益是几个关键词。
- 名称同理：本项目刚因 listing 里的格式名列表被拒两次，外部 ASO 研究给的「标题塞格式关键词」方案与那两次拒审的理由
  是同一套判定，不采纳。

现在真正卡着的只有一件事：**包 sha `dd8688b2…` 已提交、等裁决**。在它出结果之前：

- 不跑 `pnpm package`、不重新 tag、不升版本——任何重打包都会换掉那个「只改了一个变量」的样本；
- 不再改任何受审字段（名称、两份简介、两份详描、截图与宣传图上的烧字）。

裁决回来后按 [`CWS_PUBLISHING_GUIDE.md`](CWS_PUBLISHING_GUIDE.md) 走：通过则补「最近变更」文案并把新截图/新页面带来的
流量写进商店页的 product description 更新（先 `pnpm verify:listing`）；再拒则先看它点名的字段形状，
不申诉、不改没被点名的东西。安装率这一侧真正能动的杠杆是**评分条数**与**外部导流**，不是文案再压一遍关键词。

## 9. 社区分发

两份稿子各自带了「发帖纪律」，别绕过：[`docs/promo/community-posts.md`](../docs/promo/community-posts.md)（掘金 / V2EX / 知乎 / 即刻 / 小红书）、
[`community-posts.en.md`](../docs/promo/community-posts.en.md)（dev.to / Hashnode / Show HN / Reddit / awesome-list / X）。
注意这两份在 `docs/promo/` 下，`static.yml` 明确不发布它们，所以稿子里的截图路径是仓库相对路径。

建议的节奏（同一条内容在两个语言圈各自首发，间隔 24–48 小时，避免同一链接被同一批人重复看到）：

1. 先英文长文：dev.to / Hashnode **cross-post**，canonical 一律填 `https://liaolongdong.github.io/transfer-any-file/blog/`
   ——这一步做错会让新站点白拿不到权重。
2. Show HN：标题不带夸张、正文写清「未上架商店」，前 12 小时不离人，事实性问题当天在评论区更正。
3. Reddit 按 sub 分别改写（`r/chrome_extensions` 可发全文，其余按稿子里的顺序）。
4. awesome-list 两种一句话条目（按稿子给的两条，别自己扩写）。
5. 中文渠道：掘金长文 → V2EX（`/v/create?node=分享创造`）→ 知乎回答模板 → 即刻 / 小红书短稿 → 微博 → 公众号（`pnpm promo:wechat` 排版）。

**所有帖子必须写明「尚未上架 Chrome 应用商店，当前是开发者模式加载」**——这是稿子里的第一条纪律，也是商店文案
在仓库里被反复强调的那件事：不能引用不存在的商店链接。

## 10. 复核节奏

| 时点       | 看什么                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 发布后 24h | 第 5 节的 URL 全 200；HN / Reddit 评论里的事实性问题当天更正；GSC「网页索引」里新页面的状态                                           |
| 7 天       | GSC 按页面看 `/convert/*` 的展示与收录数（`site:` 查询核对是否被收）；GitHub **Insights → Traffic** 是否出现新的引荐来源              |
| 30 天      | 决定是否补第二轮长尾页——只需往 `scripts/conversion-pages/pairs.mjs` 加条目，`pnpm pages:render` + `pnpm pages:check` 与守卫会自动覆盖 |
| 每次裁决后 | 商店状态写回 `CHROMEWEBSTORE.md` 的拒审记录与版本历史，同时更新项目记忆里的草稿状态                                                   |

## 11. 明确不做

不加统计脚本或任何第三方 JS（离线主张优先于「看数据」）；不引入外部 SEO 工具链；链接不放 `utm_*`；
不刷 star / 评分 / 评论；不改名称与简介（第 8 节）；不在裁决前重打包；不把运营文档放进 `docs/`；
不新增权限、`host_permissions` 或任何远程资源——这些如果要做，先停下来单独说明。
