# 发版自动化操作说明 · Transfer Any File

> 这条链路把「合并到 `main`」变成一次可审阅的 Release PR，把「合并那个 PR」当作发布批准，之后自动出
> GitHub Release、打商店包并上传到 Chrome 应用商店——但**默认不提审**。本文只写操作：哪些必须你亲手做、
> 每步在哪看、失败了怎么读。设计与理由写在两份工作流的文件头注释里（`.github/workflows/release-prepare.yml`
> 与 `.github/workflows/release.yml`），那里是「为什么」的唯一出处。

---

## 全链路一张图

```text
你：把改动合进 main
        │
        ▼
release-prepare.yml（prepare job，自动）
   ├─ node scripts/release.mjs --json plan.json      算版本号 + 双语 changelog 区块
   ├─ 写任务摘要（这次是否可发版、区间、噪声提交数）
   ├─ 推分支 release/vX.Y.Z（提交只含 CHANGELOG.md / CHANGELOG.en.md / package.json 三份）
   └─ gh pr create                                   ← Release PR 开出来，等你
        │
你：审 diff，合并这个 PR   ★ 批准发布就发生在这里
        │
        ▼
release-prepare.yml（tag job，自动）
   ├─ 从合并后的 main 读回版本号，与 package.json 复核
   └─ 用 RELEASE_PAT 建标签 vX.Y.Z  ── 没有 PAT？只写摘要 + warning，等你本机补那三行
        │
        ▼
release.yml（由标签触发，自动）
   ├─ 版本一致性 → 源码层守卫 → pnpm build → 打包 → 产物层两道守卫 → 校验包内容
   ├─ gh release create（附商店 zip，说明取 CHANGELOG.md 的对应区块）
   └─ 商店：四项 secrets 齐备才走 → OAuth 校验 → 扩展 ID 格式 → 版本预检 → 上传包
        │
        ▼
你：在开发者后台点「提交审核」   ★ 默认到此为止，提审是你的决定
```

---

## 一、一次性配置（只有这一节必须人做）

### 1.1 要配的 secret

配置位置都是 **仓库 → Settings → Secrets and variables → Actions → New repository secret**。

| Secret                    | 谁用它                                     | 不配会怎样                                                                                     |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `RELEASE_PAT`             | `release-prepare.yml` 的开 PR 与建标签两步 | 标签不会自动推：那一步只写 warning + 摘要里的本机命令，Release PR 照常开，`release.yml` 不启动 |
| `CHROME_EXTENSION_ID_TAF` | `release.yml` 的商店那几步                 | 「已跳过 Chrome 应用商店提交」写进摘要，发布照常完成（GitHub Release 不受影响）                |
| `CWS_CLIENT_ID`           | 同上                                       | 同上                                                                                           |
| `CWS_CLIENT_SECRET`       | 同上                                       | 同上                                                                                           |
| `CWS_REFRESH_TOKEN`       | 同上                                       | 同上                                                                                           |

四项商店凭据**必须同时存在**：`Detect Chrome Web Store credentials` 判断的是「四个都非空」，缺任何一个都
只报跳过，不会半路跑起来。取凭据的步骤（Google Cloud OAuth 客户端、refresh token、后台把 OAuth 应用发到
In production）在 `.github/CWS_PUBLISHING_GUIDE.md` 的 3.1 与 3.2 节，本文不重复。

### 1.2 `RELEASE_PAT`：为什么非要有这么一个令牌

GitHub 有一条硬规则：**由 `GITHUB_TOKEN` 产生的事件不再触发其他工作流**。所以用工作流自带的令牌推标签，
会得到「标签有了、`release.yml` 从没跑过」的静默半成品——这正是本链路最不能接受的结果，因为它把成功
写在了一个没人会看的绿色对勾上。

配置步骤（都在 GitHub 界面里）：

1. 右上角头像 → **Settings** → 左侧 **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**。
2. **Repository access** 选 **Only select repositories**，只挑 `transfer-any-file`。
   别给全部仓库：这个令牌出现在 CI 环境里，范围越窄越好。
3. **Permissions** 里把这两项设为 **Read and write**：
   - **Contents** —— 建标签走的是 `POST /repos/{owner}/{repo}/git/refs`，写的是仓库内容；
   - **Pull requests** —— `gh pr create` 要它。
     不必顺手把 **Actions** 也打开：这条链路的触发靠的是「标签与 PR 的作者是一个真人身份」，不是某个权限
     勾选。细粒度权限表里并没有一行明写着「`POST /git/refs` 归我管」，上面这两项是按「建标签写的是仓库内容」
     推出的最贴近组合——**所以别把它当证明**：真勾少了，那一步会失败并把 GitHub 的原话留在日志里
     （见第五节那一行），照原话补就行。
4. **Expiration** 按你能接受的周期设，并设一个日历提醒。到期之后链路**不是**安静退回：`RELEASE_PAT`
   还在、只是被 GitHub 拒了，那一步会以 `::error::` 失败（工作流变红），而不是像「没配」那样只报 warning。
   这两种情形在第五节是分开的两行，别把它们混成一种。
5. 生成后立刻复制，填进仓库 secret `RELEASE_PAT`。

如果你更愿意用经典令牌：**不要**。经典 PAT 带的是 `repo` 作用域（见 `.github/repo-metadata.md` 里同一件事的
说明），覆盖面是整个账号的仓库，而这里只需要一个仓库的 Contents + Pull requests。

**没配它时链路怎么继续**：`Push the tag` 那步只报一条 warning，任务摘要里给出三行本机命令
（`git fetch origin main` / `git tag vX.Y.Z <sha>` / `git push origin vX.Y.Z`）。你在终端补完这三行，
`release.yml` 一样会被触发。这条退路是刻意保留的，不是故障。

### 1.3 分支保护（如果你给 `main` 加了保护）

`release-prepare.yml` 用 `RELEASE_PAT` 开 PR 的唯一理由就在这里：**`GITHUB_TOKEN` 开的 PR 不会触发
`pull_request` 事件**，于是那个 PR 上一个状态检查都不会跑。若 `main` 的分支保护要求 `ci.yml` 的检查通过
才能合并，这个 Release PR 就永远点不下 Merge。

- 已配 `RELEASE_PAT`：PR 作者是令牌背后的账号，`ci.yml` 照常跑，什么都不用改。
- 未配：`Open the release PR` 那步会留一条 `::notice` 注解「这个 PR 不会有状态检查」（是注解，不在任务摘要里）。
  此时要么去配 PAT，要么在分支保护里给 `release/*` 放行。两者都不想动，就别让这条链路开这个 PR：在本机跑
  `pnpm release:cut`（见第三节），自己推分支开一个普通 PR——作者是真人账号，`ci.yml` 会正常跑；合并后按
  第四节的 `tag` 模式补标签。

---

## 二、每次发版的流程（只有「合并」这一步是你的批准）

1. 把改动合进 `main`（走正常的 PR 流程即可）。
2. Actions → **Release Prepare** → 看最新那次运行的任务摘要：版本号、统计区间、被当作噪声略过的提交数。
3. 打开它开出来的 **Release PR**（标题是「X.Y.Z 发布准备（双语 changelog 提升与版本 bump）」），
   审这份 diff：
   - `CHANGELOG.md` / `CHANGELOG.en.md` 里新提升的区块——**英文那份是最需要人看的一笔**。提交信息是中文的，
     没写 `Changelog-En:` 尾注的那些条目在英文那份里会先**沿用中文主语**，所以这一格现在基本是靠人在 PR 分支上
     补写的：改 `CHANGELOG.en.md` 里那一区块，直接推到 `release/vX.Y.Z`（这个 PR 的分支）就行；
   - `package.json` 的版本号是不是你想要的量级（`feat:` → 次版本，带 `!` 或 `BREAKING CHANGE` → 主版本，
     其余 → 修订号）。要改判**不是**往这个 PR 分支补提交：版本号是在 `main` 上算的（读 `main` 的
     `package.json` 与 `main` 上的提交），PR 分支上的提交改不动它。能用的三条路是：
     ① 直接在 PR 分支上改 `package.json` 的号，并把两份 changelog 的小节标题 `## [X.Y.Z]` 改成同一个号——
     两边对不上时 `Resolve the tag to create` 会当场拦下（第五节有一行）；
     ② 关掉这个 PR，先把想要的那条提交合进 `main`，再用 `mode: prepare` 重跑（旧分支还留着时会跳过，
     见第五节 `Release PR #N 已经开着` 那一行）；
     ③ 干脆在本机按第三节 `pnpm release:cut -- --bump minor` 自己落地一版。
4. **合并它**。这一步就是「批准发布」。
5. 之后不用管：标签由同一条工作流推，`release.yml` 随即接手。商店那步的默认结果是「包已上传、未提审」。
6. 想让用户真的拿到这一版：到 Chrome Web Store 开发者后台的 Package 页点 **提交审核**。
   两个入口的差别见 `.github/CWS_PUBLISHING_GUIDE.md` 的 3.3 第 3 条。
7. **如果发版那一刻还有活着的长期分支**（本仓库的 `feature-dev` 就是这个形状：它带着自己的未发布条目，
   而 `main` 上刚多出一个版本小节），把 `main` 合回去要先过一道重建：

   ```bash
   git merge --no-commit --no-ff main
   node scripts/repair-release-merge.mjs --check   # 红 = 这次合并把发布记录合错了
   node scripts/repair-release-merge.mjs           # 重建两份 CHANGELOG，再 git commit 那个合并
   ```

   `git` 在这里**不报冲突也不报错**，`## [未发布]` 却会清空、本轮条目被划进刚发布的那一版名下，而且没有
   任何门禁为此变红。形状、实测读数与那四条断言见 `.github/visibility-checklist.md` 的 4.2。
   分支是发版当口才从 `main` 切出来的（两侧未发布区是同一份）时不需要这一步，`--check` 会直接报绿。

---

## 三、在本机先看一眼、或干脆在本机发

```bash
pnpm release:plan          # = node scripts/release.mjs —— 只算，不写任何文件
pnpm release:cut           # = --write --commit --tag —— 落地：改三份文件 + 本地提交 + 本地标签（不推送）
```

- 计划会读**工作树**，不只是历史：`## [未发布]` 区块、`package.json#version`、陈旧版本号扫描都在树里。
  所以工作树脏时它会提示，但照常给出计划；`--write` 才会因为脏树直接拒绝——那时才真的可能把别人
  未完成的改动带进发布提交。确信无碍可加 `--allow-dirty`。
- `--write` 只碰三份文件：`CHANGELOG.md`、`CHANGELOG.en.md`、`package.json`。它不会替你 `git push`，
  标签也一样要你自己 `git push origin vX.Y.Z`（或按第四节的 `mode: tag` 让工作流打）。
- 常用覆盖参数：`--bump major|minor|patch`、`--version X.Y.Z`、`--from <rev>`（改统计起点）、
  `--as-of YYYY-MM-DD`（改区块日期）、`--with-commit-list`（区块里附逐条清单）、`--json <path>`，
  以及 `--require-en`——有提交缺 `Changelog-En:` 尾注就拒绝落地。注意它**只在 `--write` 时生效**：
  计划模式（`release:plan`）里这一条和「没有可收录的提交」那几条判断一样，只报告不拦。完整清单见
  `scripts/release.mjs` 文件头。

---

## 四、手动开关（`workflow_dispatch`）

| 工作流          | 输入                | 默认       | 说明                                                                                                             |
| --------------- | ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Release Prepare | `mode`              | `prepare`  | `prepare` = 只准备/刷新 Release PR；`tag` = 给 `main` 上已合并但没标签的版本补打标签                             |
| Release         | `tag`               | 必填       | 手动触发时得把标签名打进去（`vX.Y.Z`），发布就是对这一个标签跑；由标签事件触发时这个输入不参与，取事件自带的 ref |
| Release         | `dry_run`           | **`true`** | ⚠️ 手动触发时**不取消勾选就什么都不发**：跑完全部守卫与构建，只在摘要里报告将会做什么                            |
| Release         | `submit_for_review` | `false`    | 勾上才在上传之后 POST `publishTarget=default`（提审）                                                            |

两个容易踩的地方，都是默认值造成的：

- `dry_run` 默认 `true`。想要真发布，必须显式取消勾选。
- 用 `workflow_dispatch` 补提审时，同一次运行会**把包重新上传一遍**。如果上一次上传之后条目已能读到那个
  版本号，版本预检会先把这次运行拦下——那是守卫在正常工作，改到后台点「提交审核」即可。

---

## 五、失败了怎么读

| 现象                                          | 出处                                            | 原因与动作                                                                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 合了 PR，但 `release.yml` 没有跑，也没有标签  | `release-prepare.yml` → `Push the tag`          | 仓库**完全没配** `RELEASE_PAT`：那一步只报 warning 就过，摘要里给出三行本机命令，补上即可；想以后自动，按 1.2 配令牌                                                                |
| `用 RELEASE_PAT 创建标签失败`                 | 同上                                            | 这一步是红的，与上一行的「没配」不是同一种情形。以日志里 GitHub 的原话为准：最常见的是令牌过期或已被撤销、只对别的仓库生效，再就是权限没勾够——创建 ref 写的是仓库内容，不是 Actions |
| Release PR 上没有任何状态检查、合不动         | `Open the release PR` 的 notice                 | PR 由 `GITHUB_TOKEN` 创建，GitHub 不触发 `pull_request`。配 `RELEASE_PAT` 或放行 `release/*`                                                                                        |
| `找不到可打标签的版本`                        | `Resolve the tag to create`                     | `CHANGELOG.md` 里最高的版本号与 `package.json` 不一致。先修这两者，再跑 `tag` 模式                                                                                                  |
| `main 上的 package.json 是 A，却要打标签 B`   | 同上                                            | 这份 changelog 与版本号已经错位，别合那个 PR；重跑 `prepare` 模式让它按当前 `main` 重算                                                                                             |
| 商店那步写着「已跳过 Chrome 应用商店提交」    | `Detect Chrome Web Store credentials`           | 四项商店 secrets 没配齐，缺任何一个都算。按 1.1 补齐再重跑；条目还没在后台手工建是另一回事，那会表现为上传 404，手工步骤见 `CHROMEWEBSTORE.md`                                      |
| `OAuth token exchange failed`                 | `Verify CWS OAuth credentials`                  | 多半是 refresh token 失效：OAuth 应用在 Testing 模式下约 7 天过期。把应用发到 In production，并按 3.1 重新生成同一套三元凭据                                                        |
| `CHROME_EXTENSION_ID_TAF 格式非法`            | `Verify CWS extension id format`                | 不是 32 位 a-p 小写字母，或混进了空格/换行。从后台 URL 里复制，不要手敲                                                                                                             |
| `线上已是 X，这次要传的是 Y`                  | `Publish to the Chrome Web Store`               | 版本预检拦下：商店只接受严格更高的版本号。核对 `main` 上的 `package.json` 与这个标签是否对得上                                                                                      |
| `版本预检跳过`（notice）                      | 同上                                            | 读不到线上版本号——条目还没建时**必然**如此，属正常。上传若被拒，原因在响应体里                                                                                                      |
| `这一版没有发布说明`（warning）               | `Extract release notes`                         | `CHANGELOG.md` 里缺对应区块。发布不拦，但 GitHub Release 用的是占位文案，去补区块然后重跑                                                                                           |
| `release-prepare` 报 `Release PR #N 已经开着` | `Skip when the release branch is already taken` | 同名分支已有一个开着的 PR，工作流**故意**不覆盖也不重开（你的补正可能就在里面）。去那个 PR 里继续                                                                                   |

表格之外还有一条，它不表现为任何一步失败，所以不占一格：

- **合回长期分支之后，`## [未发布]` 空了、刚发布那一版的小节比发布时多出几条。** `git merge` 在这道关口
  既 exit 0、也不留冲突标记（两处插入点相邻但不在同一行），而 CI 里没有一条断言看得出这件事。修法就是
  第二节第 7 条：合并现场先 `node scripts/repair-release-merge.mjs --check`，红了再跑不带 `--check` 的那条
  重建——落盘前四条守恒断言任一不过，它一个字都不写。形状与实测读数见 `.github/visibility-checklist.md` 的 4.2。
- 同一张表里「`版本预检跳过`」那一行的前提是「条目还没建」。**条目 2026-10-02 已在架**（线上 1.0.0），
  所以现在真读到空版本号应当当成异常去查凭据与网络，而不是当成正常。

---

## 六、回滚与「发错了」

- **标签**：`git push origin :refs/tags/vX.Y.Z` 删掉远端标签。删掉只是把这次发布从可见面上抹掉，
  GitHub Release 与已经上传到商店的包都不会跟着退；要重发就往前发一个新号，**不要复用旧标签**——
  这条是本链路的约定，没有守卫替你拦，商店那边尤其只接受严格更高的版本号。
- **GitHub Release**：后台删 Release；附件 zip 随之消失，仓库历史不动。
- **商店**：这一段没有任何自动化参与，本仓库也没有写过「怎么回退」——撤包、换回旧版本都是开发者后台里的
  手工动作，做之前照 Google 自己的界面说明核对，本文不替它下结论。
- **`main` 上的版本号与 changelog 区块**：不回退。已经合进去的提升就是仓库的记录，
  发错了就往前修一版。这条链路的设计前提是「往前走」，任何改历史的动作都要人工判断，它一概不碰。

---

## 七、这条链路刻意不做的事

- 不自动合并 Release PR——approve 是人的判断，整条链路就靠这一次点头收口。
- 不自动提审。上传是幂等的准备动作，惊动审核不是。
- 不创建商店条目、不写商品文案、不传截图、不填隐私申报：商店 API 做不到这些，见
  `CHROMEWEBSTORE.md` 的「首次上架（手工步骤）」。
- 不升级依赖、不改 lockfile、不碰 `docs/` 生成物、不加任何 manifest 权限。它对仓库的写动作全部可以列出来：
  推 `release/vX.Y.Z` 那一个分支、开那一个 PR、建那一个 `vX.Y.Z` 标签 ref、创建一个 GitHub Release、
  上传一次商店包——默认配置下就这五下，没有别的；勾了 `submit_for_review` 才多出第六下（那次提审 POST）。
- 发布动作本身不借第三方：建 Release 用 runner 自带的 `gh release create`，上传与提审用自带的 `curl`
  直接打 Google 的 API，而不是用 `softprops/action-gh-release` 或某个 npm 发布包。工作流里确实还有
  `actions/checkout`、`pnpm/action-setup`、`actions/setup-node` 这类通用步骤，构建也照旧走 `pnpm build`——
  这条边界只管「把版本推出去」那几下，不是宣称整条流水线没有第三方。

---

## 八、本文里还没被真实验证过的部分

诚实清单，第一次发版时请重点盯这几处：

- **仓库目前没有任何标签**，所以「合并 Release PR → 自动建标签 → `release.yml` 启动」这条链在真实
  GitHub 上一共分几步跑通过，答案是**零次**。步骤体的逻辑是在本机用桩 `gh` / 桩 `curl` 执行真的
  run 块验证的（含把两处已修复的令牌缺陷改回旧写法、确认它们会因此暴露），但 Actions 自身的触发规则
  只有真跑一次才算证据。
- **商店条目已经在架**（2026-10-02 实测：线上版本 1.0.0、详情区上次更新 2026-09-30），所以 `release.yml`
  那三步第一次真跑就会读到版本号——但 `GET /chromewebstore/v1.1/items/{id}` 的**响应形状在本仓库没有被取证过**。
  版本号字段名两种说法都见过（`current_version` 与 `version`），所以 `scripts/release-ci.mjs` 的 `item-version`
  在认不出形状时**选择弃权**而不是猜：预检跳过，由上传响应体自己说明原因，这条命令永不使步骤失败。
  第一次真跑时请顺手核对摘要里读到的线上版本号确实是 1.0.0——它是「商店只接受严格更高的版本号」那条预检的分母。
- 分支保护的实际配置（本仓库若已要求状态检查通过）会直接影响 1.3 节的退路是否够用。
- **已经真跑过的只有两处**（2026-10-02，都在隔离副本里，没有碰远端）：`release.mjs --write` 在 `main` 上产出的
  那份发布提交（只改三份文件，`## [未发布]` 与它那 150 条之间插标题），以及第二节第 7 条那个「绿着合错」的
  合并形状与 `scripts/repair-release-merge.mjs` 对它的重建（含四条断言各自被变异触发）。Actions 自身的触发规则
  仍然只有真跑一次才算证据。

---

## 相关文档

- **半自动发布链路的两个脚本**：`scripts/release.mjs`（计划与落地）、`scripts/release-ci.mjs`（Actions 适配）
- **发版后把 `main` 合回长期分支时的重建工具**：`scripts/repair-release-merge.mjs`（`--check` 只报告，不带
  `--check` 才写盘；默认读 `MERGE_HEAD` 与 `ORIG_HEAD`，也可以给显式 ref）
- **上架手册（凭据、手工建条目、商店字段）**：`.github/CWS_PUBLISHING_GUIDE.md` / `.en.md`
- **商店文案与首次上架手工步骤**：`CHROMEWEBSTORE.md`
- **提交类型如何影响版本号与 changelog**：`CONTRIBUTING.md` → 值得先知道的约定 → 「提交信息就是发布说明的数据源」（英文对照在 `CONTRIBUTING.en.md`）
- **对外可见与发布核对点**：`.github/visibility-checklist.md`
- **触发发版的工作流**：`.github/workflows/release-prepare.yml`、`.github/workflows/release.yml`
