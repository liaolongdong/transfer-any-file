# 发版自动化操作说明 · Transfer Any File

> 这条链路把「合并到 `main`」变成一次可审阅的 Release PR，把「合并那个 PR」当作发布批准，之后自动出
> GitHub Release、打商店包并上传到 Chrome 应用商店——但**默认不提审**；要走自动提审，得先配好一道
> environment 人工批准门（1.4），而配好之后**每一次提审仍然要有人在 GitHub 上点 Approve**。本文只写操作：
> 哪些必须你亲手做、每步在哪看、失败了怎么读。设计与理由写在两份工作流的文件头注释里
> （`.github/workflows/release-prepare.yml` 与 `.github/workflows/release.yml`），那里是「为什么」的唯一出处。

---

## 全链路一张图

```text
你：把改动合进 main
        │
        ▼
release-prepare.yml（prepare job，自动）
   ├─ node scripts/release.mjs --json plan.json      算版本号 + 双语 changelog 区块
   ├─ 写任务摘要（这次是否可发版、区间、噪声提交数）
   ├─ 推分支 release/vX.Y.Z（四份手写文件 + 重新渲染的 docs/convert 与 sitemap）
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
   └─ release 作业 · 商店那步：四项 secrets 齐备才走 → 令牌校验 → ID 格式 → 审批门自证（只报告）→ 版本预检 → 上传包
        │                    ← 这个作业到上传为止，从不调用 :publish
        ▼
store_submit 作业（同一工作流，needs: release）
   ├─ 排队要四个条件同时成立（作业级 if：uploaded / store_ready / 仓库变量 CWS_AUTO_SUBMIT / 手动触发时的复选框）
   ├─ 排在门口：environment `cws-release` 的 Required reviewers → 状态是 Waiting，一行脚本都没跑
   ├─ 批准后第一件事是证明这道门是真的：读不到环境、或没有带审查人的 required_reviewers → 变红，不提审
   └─ 自证过了才：:fetchStatus → submit-check →（判定可以才）:publish {"publishType":"DEFAULT_PUBLISH"}
        │
        ▼
你：在那次运行页点 Approve and deploy   ★ 默认到此为止，提审是你的决定
   （门没配时唯一的入口：开发者后台该商品的 Package 页点「提交审核」）
```

---

## 一、一次性配置（只有这一节必须人做）

### 1.1 要配的 secret

配置位置都是 **仓库 → Settings → Secrets and variables → Actions → New repository secret**。

| Secret                            | 谁用它                                     | 不配会怎样                                                                                     |
| --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `RELEASE_PAT`                     | `release-prepare.yml` 的开 PR 与建标签两步 | 标签不会自动推：那一步只写 warning + 摘要里的本机命令，Release PR 照常开，`release.yml` 不启动 |
| `CHROME_EXTENSION_ID_TAF`         | `release.yml` 的商店那几步                 | 「已跳过 Chrome 应用商店」写进摘要，两步都不做，发布照常完成（GitHub Release 不受影响）        |
| `CWS_PUBLISHER_ID`                | 同上                                       | 同上                                                                                           |
| `CWS_SERVICE_ACCOUNT_EMAIL`       | 同上                                       | 同上                                                                                           |
| `CWS_SERVICE_ACCOUNT_PRIVATE_KEY` | 同上                                       | 同上                                                                                           |

四项商店凭据**必须同时存在**：`Detect Chrome Web Store credentials` 判断的是「四个都非空」，缺任何一个都
只报跳过，不会半路跑起来。取凭据的步骤（在 Google Cloud 里启用 _Chrome Web Store API_、建服务账号与私钥、
把服务账号邮箱加进开发者后台的「账号」页）在 `.github/CWS_PUBLISHING_GUIDE.md` 的 3.1 与 3.2 节，本文不重复。
后三项是**发布商级别**的，同一发布商下所有条目共用同一套值；但个人账号没有组织级 secret 共享，所以这三个值
仍要在**每个仓库里各填一次**。

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

### 1.4 审批门：environment `cws-release` + 仓库变量（可选，只做一次）

**不配它，链路的行为与「只上传、不提审」完全一致**——`store_submit` 那个作业根本不出现。要配，就照
`.github/CWS_PUBLISHING_GUIDE.md` 的 3.4 那七步走，而且顺序是死的：先建环境、验证 `protection_rules` 里
**真的看得到** Required reviewers 那一条，**再**设仓库变量 `CWS_AUTO_SUBMIT=true`。三条理由：

- 工作流引用一个不存在的环境时，GitHub 会把它建出来，而自动创建的环境**没有任何保护规则**——那种
  「有门框没有门」的状态下，每次打标签都会直接提审。
- 变量而不是 secret：`jobs.<id>.if` 读得到 `vars`、读不到 `secrets`，而这道题本来就不是机密——它是
  「门已配好」的一句公开声明。它的语义永远不包含「跳过门」。
- **Required reviewers 这一条只能在网页界面里加。** 2026-10-18 在本仓库实测：同一个环境上 `wait_timer` 与
  `can_admins_bypass` 两个字段 REST 都改得动，`reviewers` 却一律回 422
  `Required reviewers must have at least one reviewer`——填本人 id、填不存在的 id、填别人的 id 回的都是同一句，
  所以那不是 id 校验失败，是整条规则没被接受。判法与那张实测表在手册 Q16；它顺带给出一种比空壳更坏的形态：
  `protection_rules` 里**只有** `wait_timer` 是会自动放行的假门，谁都不用点批准。
- **上面那句「先验证再设变量」从今天起多了一道运行时的兜底。** 顺序仍然要是「先门后变量」，因为工作流
  引用环境这件事本身不能证明门的存在——而仓库里的环境可以被删、可以被换名、可以在一次误操作后变成自动创建的
  空壳。所以 `release.yml` 现在自己读同一个端点：上传前那一格把结论只写成 `::warning::`（这一版可能压根不打算
  自动提审，为一道没打算走的门把发布判红是不对的，而且这样每次发布都会真的执行一次「Actions 令牌读环境」，
  权限类意外在有人开变量之前就会暴露）；`store_submit` 在 `:publish` 之前跑同一判据的**拦下版**。判据在
  `scripts/release-ci.mjs` 的 `approval-gate`，由 `pnpm verify:release-ci` 钉形状：放行只有一种（`required_reviewers`
  且 `reviewers` 非空），空壳、只有 `wait_timer`、名单为空、响应读不出四种一律拦。

动手配之前先跑手册新增的 **3.0 那五条只读命令**：本链路最容易被误读的地方是「流水线全绿而商店什么都没发生」，
而它的三种成因（四项凭据缺任一项、门是假的、变量没设）在 Actions 页面上长得一模一样。

配完之后，链路上就多了一次必须的人为点击（第二节第 6 条）。四处容易搞错的地方：

| 项目       | 在哪                                                                | 配错的样子                                                                  |
| ---------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 环境名     | Settings → Environments，必须逐字 `cws-release`                     | 大小写不同的名字在 GitHub 那里算同一个环境，在工作流的 `if` 里却是另一个键  |
| 批准人名单 | 该环境的 Required reviewers（最多 6 个，任一人批准即放行）          | 只有触发者且在勾了 Prevent self-review → 每次发布都卡死在 Waiting（FAQ Q8） |
| 规则内容   | 同一环境的 `protection_rules`，必须读得到 `required_reviewers`      | **只有** `wait_timer` 是假门：计时走完自动放行，谁都不必批准（手册 Q16）    |
| 管理员绕过 | 同一页的 Allow administrators to bypass configured protection rules | 勾着时管理员可以直接穿过这道门，等于门只拦别人                              |

两个不受本仓库控制的边界，值得先知道再配：等待批准的上限是 **30 天**，而批准之后跑作业的上限是
GitHub 托管 runner 的 **6 小时**（两个不同的钟，见 FAQ Q9）；Free 计划只能给**公开仓库**配环境，
私有仓库上照抄这套配置会退化成那个空壳环境（见 FAQ Q10）。门只管提审这一下：GitHub Release、标签、
商店里的草稿 revision 都在门**之前**就完成了，批准与否都不回退它们。

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
5. 之后到商店门口为止不用管：标签由同一条工作流推，`release.yml` 随即接手。门没配（或配了还没人批准）时，
   商店那部分的结果就是「包已上传、未提审」。
6. 想让用户真的拿到这一版，先看 1.4 那道门配了没有：
   - **配了门**：Actions → 那次运行 → 页面顶部 `cws-release` 那一行旁边点 **Review deployments** →
     **Approve and deploy**。被批准之后那个作业才会去问 `:fetchStatus`，再决定按不按发布键。
   - **没配门**：到 Chrome Web Store 开发者后台该商品的 Package 页点 **提交审核**——它同样不重传包。
     三个入口（审批门 / 后台按钮 / 手动触发工作流）各自要不要重传包，对比表在
     `.github/CWS_PUBLISHING_GUIDE.md` 的 3.3 第 4 条。
7. **如果发版那一刻还有活着的长期分支**（本仓库的 `feature-dev` 就是这个形状：它带着自己的未发布条目，
   而 `main` 上刚多出一个版本小节），把 `main` 合回去要先过一道重建：

   ```bash
   git merge --no-commit --no-ff main
   node scripts/repair-release-merge.mjs --check   # 红 = 这次合并把发布记录合错了，或那条自证没过
   node scripts/repair-release-merge.mjs           # 重建两份 CHANGELOG，再 git commit 那个合并
   ```

   `git` 在这里**不报冲突也不报错**，`## [未发布]` 却会清空、本轮条目被划进刚发布的那一版名下，而且没有
   任何门禁为此变红。形状、实测读数与那五条断言见 `.github/visibility-checklist.md` 的 4.2。
   分支是发版当口才从 `main` 切出来的（两侧未发布区是同一份）时不需要这一步，`--check` 会直接报绿。
   **绿有两种**，读的人要分清：「检查通过：未发布与已发布小节分界正确」（这一场有提升，五条断言过了）与
   「无需重建：…这一场合不含发布提交」（功能分支追 `main` 那一类，改走文件头 + 未发布区 + 版本小节的逐字节自证）。

---

## 三、在本机先看一眼、或干脆在本机发

```bash
pnpm release:plan          # = node scripts/release.mjs —— 只算，不写任何文件
pnpm release:cut           # = --write --commit --tag —— 落地：改四份手写文件 + 重渲染生成页 + 本地提交 + 本地标签（不推送）
```

- 计划会读**工作树**，不只是历史：`## [未发布]` 区块、`package.json#version`、陈旧版本号扫描都在树里。
  所以工作树脏时它会提示，但照常给出计划；`--write` 才会因为脏树直接拒绝——那时才真的可能把别人
  未完成的改动带进发布提交。确信无碍可加 `--allow-dirty`。
- `--write` 碰四份**手写**文件：`CHANGELOG.md`、`CHANGELOG.en.md`、`package.json`，加 `docs/index.html` 里 `#app`
  节点那一行 `softwareVersion`——它是 `pnpm verify:meta` 与 `package.json` 比对的那一格，`--write` 不带着它，发布
  提交落进 `main` 的下一次 lint 就会红在这一条上。那一页其余的版本字样（矩阵导语、取证段、页脚 `vX.Y.Z` 链接）是
  **句子**，仍留在 `staleVersionMentions` 里等人自己重新取证。然后它重渲染 `docs/convert/` 与 `docs/sitemap.xml`：
  那三十六页的 `about` 节点把版本号从 `package.json` 现读，不重渲染就是「四份手写文件都改对了、生成物还停在上一版」，
  1.2.1 那次自动发版正是被 `pnpm pages:check` 咬在这里变红。它不会替你 `git push`，
  标签也一样要你自己 `git push origin vX.Y.Z`（或按第四节的 `mode: tag` 让工作流打）。
- 常用覆盖参数：`--bump major|minor|patch`、`--version X.Y.Z`、`--from <rev>`（改统计起点）、
  `--as-of YYYY-MM-DD`（改区块日期）、`--with-commit-list`（区块里附逐条清单）、`--json <path>`，
  以及 `--require-en`——有提交缺 `Changelog-En:` 尾注就拒绝落地。注意它**只在 `--write` 时生效**：
  计划模式（`release:plan`）里这一条和「没有可收录的提交」那几条判断一样，只报告不拦。完整清单见
  `scripts/release.mjs` 文件头。

---

## 四、手动开关（`workflow_dispatch`）

| 工作流          | 输入                | 默认       | 说明                                                                                                                                    |
| --------------- | ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Release Prepare | `mode`              | `prepare`  | `prepare` = 只准备/刷新 Release PR；`tag` = 给 `main` 上已合并但没标签的版本补打标签                                                    |
| Release         | `tag`               | 选填       | 第 1 / 2 / 3 档手动触发时把标签打进去（`vX.Y.Z`），留空会红在 Resolve version 那一步；标签事件触发时取事件自带的 ref。第 0 档不看它     |
| Release         | `dry_run`           | **`true`** | ⚠️ 手动触发时**不取消勾选就什么都不发**：跑完全部守卫与构建，只在摘要里报告将会做什么                                                   |
| Release         | `submit_for_review` | `false`    | 勾上才让 `store_submit` 那个作业**排队**；排到队之后仍要过审批门，被批准才 POST `:publish`，body 是 `{"publishType":"DEFAULT_PUBLISH"}` |
| Release         | `store_status_only` | `false`    | 勾上只跑 `store_status` 作业：现签一枚令牌 + 一次 `:fetchStatus`，不构建、不上传、不挂审批门（手册 3.3 的第 0 档）                      |

四个容易踩的地方，前三个是默认值造成的，最后一个是「表单取哪个 ref」造成的：

- `dry_run` 默认 `true`。想要真发布，必须显式取消勾选。
- 用 `workflow_dispatch` 补一次发布，这一次运行会**把包重新上传一遍**——标签触发时经过审批门的那次提审
  不重传（上传与提审是两个作业），手动重跑不是。重传一般能过版本预检，因为商店那边「已发布的版本号」
  还没变成这一版；要是这一版**已经发布成功**了，预检就会当场拦下这次运行，那是守卫在正常工作，
  改到后台点「提交审核」即可。
- 勾了 `submit_for_review` 而 1.4 那道门没配（或仓库变量 `CWS_AUTO_SUBMIT` 不是 `true`）：提审作业连排队
  都不排队，运行照样全绿，只是停在「包已上传，未提审」。这是刻意的 fail-closed，不是这次勾选白点了。
- dispatch 表单上的那几个复选框，来自**你选中的那个 ref 上的那份工作流文件**。所以 `store_status_only`
  只有在这份文件合进去的那个分支上才看得到；同理，填一个比 `scripts/cws-token.mjs` /
  `scripts/release-ci.mjs` 更早的标签，`release` 作业会在检出后的第一个脚本上 `Cannot find module`——
  那次红与凭据无关（判法见手册 Q15）。只想验凭据链就走第 0 档，它固定检出本次触发所在的 ref。

---

## 五、失败了怎么读

| 现象                                                   | 出处                                            | 原因与动作                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 合了 PR，但 `release.yml` 没有跑，也没有标签           | `release-prepare.yml` → `Push the tag`          | 仓库**完全没配** `RELEASE_PAT`：那一步只报 warning 就过，摘要里给出三行本机命令，补上即可；想以后自动，按 1.2 配令牌                                                                                        |
| `用 RELEASE_PAT 创建标签失败`                          | 同上                                            | 这一步是红的，与上一行的「没配」不是同一种情形。以日志里 GitHub 的原话为准：最常见的是令牌过期或已被撤销、只对别的仓库生效，再就是权限没勾够——创建 ref 写的是仓库内容，不是 Actions                         |
| Release PR 上没有任何状态检查、合不动                  | `Open the release PR` 的 notice                 | PR 由 `GITHUB_TOKEN` 创建，GitHub 不触发 `pull_request`。配 `RELEASE_PAT` 或放行 `release/*`                                                                                                                |
| `找不到可打标签的版本`                                 | `Resolve the tag to create`                     | `CHANGELOG.md` 里最高的版本号与 `package.json` 不一致。先修这两者，再跑 `tag` 模式                                                                                                                          |
| `main 上的 package.json 是 A，却要打标签 B`            | 同上                                            | 这份 changelog 与版本号已经错位，别合那个 PR；重跑 `prepare` 模式让它按当前 `main` 重算                                                                                                                     |
| 商店那两步都是灰的、摘要写着「已跳过 Chrome 应用商店」 | `Detect Chrome Web Store credentials`           | 四项商店 secrets 没配齐，缺任何一个都算。按 1.1 补齐再重跑；条目还没在后台手工建是另一回事，那会表现为上传 404，手工步骤见 `CHROMEWEBSTORE.md`                                                              |
| `服务账号令牌交换失败`                                 | `Verify Chrome Web Store service account`       | 按那行错误自己列的顺序核对：GCP 项目没启用 _Chrome Web Store API_；邮箱与私钥不是同一个服务账号；私钥粘贴时换行被吃掉（三种粘贴形状见 3.2 的说明）                                                          |
| `CHROME_EXTENSION_ID_TAF 格式非法`                     | `Verify CWS extension id format`                | 不是 32 位 a-p 小写字母，或混进了空格/换行。从后台 URL 里复制，不要手敲                                                                                                                                     |
| `线上已是 X，这次要传的是 Y`                           | `Upload the package to the Chrome Web Store`    | 版本预检拦下：商店只接受严格更高的版本号。核对 `main` 上的 `package.json` 与这个标签是否对得上                                                                                                              |
| `版本预检跳过`（notice）                               | 同上                                            | 读不到线上版本号——条目还没建时**必然**如此，属正常。上传若被拒，原因在响应体里                                                                                                                              |
| `HTTP 200，但商店把这次上传判为失败`                   | 同上                                            | 传输成了，商店读包读失败了：`uploadState` 回执是 `FAILED`（原因在它下面那份响应体里，多半是包内容或商品字段）。`IN_PROGRESS` 不会报这行，它在摘要里写「商店仍在解包」并提示紧接着的 `:publish` 可能因此报错 |
| `Submit for review (after approval)` 显示 **skipped**  | `store_submit` 的作业级 `if`                    | 四个条件之一不成立，作业一行脚本都没跑。最常见是仓库变量 `CWS_AUTO_SUBMIT` 没设（**fail-closed 是刻意的**），其次是手动触发没勾复选框；逐项查法见 `.github/CWS_PUBLISHING_GUIDE.md` 的 FAQ Q5 那张表        |
| `Check out the tag` 第一步就红，说那个 ref 找不到      | `release` 作业的第一步                          | 仓库还没有任何标签，而第 1 / 2 / 3 档都按 `inputs.tag` 检出——填一个不存在的标签就是这样，与凭据无关。先按 1.2 配 `RELEASE_PAT` 或在本机补那三行，把标签弄出来（判法见手册 Q18 / Q19）                       |
| 提审作业没停在 Waiting，隔了一会儿自己跑完了           | environment `cws-release` 的 `protection_rules` | **假门**：那条规则里只有 `wait_timer`，计时走完自动放行，不需要任何人批准。`required_reviewers` 只能在网页界面里加（手册 Q16），先把 `CWS_AUTO_SUBMIT` 删掉再补门                                           |
| 那一步停在 **Waiting**，没人点                         | environment `cws-release`                       | 这不是故障，这就是门。名单里任一人去那次运行页点 **Review deployments → Approve and deploy**（FAQ Q7）；看不到按钮的人不在名单里                                                                            |
| `:fetchStatus 返回 HTTP …`                             | `Submit the uploaded package for review`        | 批准之后先问商店「现在躺着什么」，问不到就不按发布键。401/403 多为服务账号邮箱没加进开发者信息中心的「账号」页，404 多为发布商 ID 或扩展 ID 对不上                                                          |
| `商店侧状态不允许提审：…`                              | 同上                                            | `submit-check` 返回 20：包还在解包、最近一次上传被商店判负、或队列里躺着的是**别的**版本号。发布键没按，修好原因再重跑这一步即可，**不需要重传包**（FAQ Q11）                                               |
| 摘要里出现「无需提审：这一版已经在商店那边了」         | 同上                                            | `submit-check` 返回 10——这一版已经在审核队列里（多半是你中途自己去后台点过）。跳过且算绿：重复提交只会让队列里同时躺两份同一个包                                                                            |
| `HTTP 200，但商店把这次提交判成了被拒或已取消`         | 同上                                            | `:publish` 回了 200，而响应里的 `state` 是 `REJECTED` / `CANCELLED`——只看 HTTP 码会当成成功，所以这一步单独判。政策口径与既往拒审见 `CHROMEWEBSTORE.md` 的「拒审记录与政策口径」                            |
| `这一版没有发布说明`（warning）                        | `Extract release notes`                         | `CHANGELOG.md` 里缺对应区块。发布不拦，但 GitHub Release 用的是占位文案，去补区块然后重跑                                                                                                                   |
| `release-prepare` 报 `Release PR #N 已经开着`          | `Skip when the release branch is already taken` | 同名分支已有一个开着的 PR，工作流**故意**不覆盖也不重开（你的补正可能就在里面）。去那个 PR 里继续                                                                                                           |

表格之外还有一条，它不表现为任何一步失败，所以不占一格：

- **合回长期分支之后，`## [未发布]` 空了、刚发布那一版的小节比发布时多出几条。** `git merge` 在这道关口
  既 exit 0、也不留冲突标记（两处插入点相邻但不在同一行），而 CI 里没有一条断言看得出这件事。修法就是
  第二节第 7 条：合并现场先 `node scripts/repair-release-merge.mjs --check`，红了再跑不带 `--check` 的那条
  重建——落盘前五条守恒断言任一不过，它一个字都不写；那五条都以「这一场里有一次提升」为前提，没有提升的
  一场（功能分支追 `main`）改走逐字节自证，同样不放过。形状与实测读数见 `.github/visibility-checklist.md` 的 4.2。
- 同一张表里「`版本预检跳过`」那一行的前提是「条目还没建」。**条目 2026-10-02 已在架**（线上 1.0.0），
  所以现在真读到空版本号应当当成异常去查：凭据、网络，或者商店响应的形状变了。第三种情形下
  `item-version` 是**故意**弃权的（认不出 `distributionChannels[].crxVersion` 就不猜），为的是把原因留在
  那份响应体里，而不是编一个版本号去跟 `package.json` 比。

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
- 不自动提审。上传是幂等的准备动作，惊动审核不是。配了 1.4 那道门之后提审仍然要**人先批准**：仓库变量与
  environment 是两道都握在所有者手里的闸，工作流里没有任何一处能把「批准」这个动作替人做掉，也没有
  `skipReview` 那种「调用方自己宣布免审」的开关（为什么不接它，见 FAQ Q12）。
- 不创建商店条目、不写商品文案、不传截图、不填隐私申报：商店 API 做不到这些，见
  `CHROMEWEBSTORE.md` 的「首次上架（手工步骤）」。
- 不升级依赖、不改 lockfile、不碰 `docs/` 生成物、不加任何 manifest 权限。它对仓库的写动作全部可以列出来：
  推 `release/vX.Y.Z` 那一个分支、开那一个 PR、建那一个 `vX.Y.Z` 标签 ref、创建一个 GitHub Release、
  上传一次商店包——默认配置下就这五下，没有别的；第六下（提审那次 `:publish` POST）要么根本不排队，
  要么排在审批门口等一个人点下 Approve 之后才打得出去。
- 发布动作本身不借第三方：建 Release 用 runner 自带的 `gh release create`，上传与提审用自带的 `curl`
  直接打 Google 的 API，而不是用 `softprops/action-gh-release` 或某个 npm 发布包。工作流里确实还有
  `actions/checkout`、`pnpm/action-setup`、`actions/setup-node` 这类通用步骤，构建也照旧走 `pnpm build`——
  这条边界只管「把版本推出去」那几下，不是宣称整条流水线没有第三方。

---

## 八、本文里还没被真实验证过的部分

诚实清单，第一次发版时请重点盯这几处：

- **仓库目前没有任何标签**，所以「合并 Release PR → 自动建标签 → `release.yml` 启动」这条链在真实
  GitHub 上一共分几步跑通过，答案是**零次**。步骤体的逻辑在本机被真跑过一轮：从 YAML 里抽出**真实的**
  run 块执行，只替换两个 API base 与换令牌那一步，对面是一台记录每个请求的假 v2 商店（方法/路径/字节数/
  请求体/认证头都参与断言），排队与否的作业级 `if` 也是从文件里读出来算的；同一套工装还做过变异验证
  （把守卫逐条改坏，包括这轮和上轮已修复的几处缺陷改回旧写法，确认每一个都红在该红的那一句上）。
  这套工装是一次性取证、没有入库，
  它证明的是「脚本按这些响应形状会这么做」，**证明不了 Actions 自身的触发规则**——那只有真跑一次才算证据。
- **入库的那一份是 `pnpm verify:release-ci`**（`scripts/check-release-ci.mjs`，CI lint job 的最后一步）：它按一张
  手写的契约表真跑 63 次商店响应解析（`item-version` / `upload-state` / `submit-check` / `publish-state` 的形状、
  退出码与那句进 step summary 的话），再钉 `release.yml` 的 10 处接缝（1 处回执标签拼接 + 4 处 submit-check 那段
  case 的形状 + 5 处只读档 `store_status`）。它守的是**两个文件的接缝**，
  上面那套仿真守的是**整条作业的顺序**——两件事不互相替代：守卫不会发现「`:publish` 被挪进了上传作业」，
  仿真也不会在 CI 里替你重跑一遍判定表。它自己的牙用 14 个变异体验过（上一轮 9 个，本轮为只读档那五处补 5 个；
  每个都必须红在它钉的那一句上，控制组是那两份文件的未改拷贝）。只读档那一步的 run 块也按同一条路子真跑过：
  从 YAML 里抽出**原文**执行，对面是一台只回状态码与响应体的假 `:fetchStatus`，四种出口（200 且读得到版本号 /
  200 但没有 `crxVersion`，即条目从没发布过 / 403 / 换票这一步就失败）各自的退出码、stdout 与 summary
  都断过言，跑完还查了临时文件有没有被 `trap` 清掉。
- **审批门一次都没真跑过**，但仓库侧的形状在 2026-10-18 变过一次，按当下的实测读数重述：`cws-release` 这个
  environment **现在存在**（`can_admins_bypass` 已关），可它的 `protection_rules` 仍是 `[]`——批准人这一条 REST
  加不上，只能在网页界面里加（手册 Q16）。仓库变量 `CWS_AUTO_SUBMIT` 仍未设，所以「停在 Waiting → 有人点
  Approve and deploy → 作业才开始跑」这一整串目前仍然只是 GitHub 文档里的行为。本地能证的只有那四种组合下作业
  排不排队。同一天还测出仓库侧另外三格：`CHROME_EXTENSION_ID_TAF` 已配（那 32 位本来就是公开的），
  `CWS_PUBLISHER_ID` / `CWS_SERVICE_ACCOUNT_EMAIL` / `CWS_SERVICE_ACCOUNT_PRIVATE_KEY` 三项仍未配，
  `RELEASE_PAT` 也没配，标签数仍是 0——所以第 1 / 2 / 3 档此刻连检出那一步都到不了（手册 Q19），而商店那两步
  因为四项不齐直接静默跳过（Q17）。配门时务必按 3.4 第 7 步专门验一次：期望看到 **Waiting**；要是它直接跑完了，
  你手上就是「没有保护规则的空壳」或「只有 `wait_timer` 的假门」，先把变量删掉再回去补门。
- **商店条目已经在架**（2026-10-02 实测：线上版本 1.0.0、详情区上次更新 2026-09-30），所以 `release.yml`
  那三步第一次真跑就会读到版本号。读的是 v2 `:fetchStatus` 响应里的
  `publishedItemRevisionStatus.distributionChannels[].crxVersion`——这个形状是向 `publish-browser-extension` 那套
  由 Google discovery 文档生成的类型取证的，**不是**向本仓库的真实响应取证的；所以 `scripts/release-ci.mjs` 的
  `item-version` 在认不出形状时**选择弃权**而不是猜：预检跳过，由上传响应体自己说明原因，这条命令永不使步骤失败。
  同一理由，`upload-state` 只把 `FAILED` / `NOT_FOUND` 这两个明确否定的取值判红，读不懂一律原样报出来并放行。
  第一次真跑时请顺手核对摘要里读到的线上版本号确实是那个数——它是「商店只接受严格更高的版本号」那条预检的分母。
- 分支保护的实际配置（本仓库若已要求状态检查通过）会直接影响 1.3 节的退路是否够用。
- **已经真跑过的只有三处**。前两处是 2026-10-02，都在隔离副本里、没有碰远端：`release.mjs --write` 在 `main`
  上产出的那份发布提交（**当时只改三份文件**，`## [未发布]` 与它那 150 条之间插标题），以及第二节第 7 条那个
  「绿着合错」的合并形状与 `scripts/repair-release-merge.mjs` 对它的重建（含五条断言各自被变异触发；
  2026-10-19 给「不含发布提交」那一路补了四次变异——文件头、未发布区、版本小节各一次，加中英首节不成对那一格——
  并反向确认它没把真提升放过去，包括「分支历史区深处塞一行同名标题」这种能把旧判据带走的形状）。
  第三处是 2026-10-18，在 `git worktree` 的 detached 副本里跑 `--write --allow-dirty`（1.2.0 → 1.2.1），
  四种形状各自落在该落的地方：happy path 写 `package.json` 1.2.1、`docs/index.html` 的 `#app
softwareVersion` 1.2.1 与双语区块各 23 行，随后 `node scripts/check-package-meta.mjs` 在同一棵树上绿；
  只把 `docs/index.html` 退回 1.2.0 而 `package.json` 留 1.2.1，`verify:meta` 红在「the product page
  advertises a release that is not the current one」——第四份文件存在的理由就是这一条；把那一行改成 `9.9.9`
  再跑 `--write`，退出 1，且 `package.json` 与两份 changelog 一个字都没动（校验排在任何写入之前）。顺带验到
  脏树闸门：把工作树弄脏之后 `--write` 直接拒绝列出脏在哪，加 `--allow-dirty` 才继续。
  **而这一版仍漏了一件事**：1.2.1 的 Release PR 合进 `main`（`c29aa8e`）之后，CI 的 `Lint & Type Check` 变红，
  红在 `pnpm pages:check`——四份手写文件都对（同一个 job 里 `verify:meta` 读到的就是 1.2.1），三十六张生成页的
  `about` 节点把版本号从 `package.json` 现读、没人重渲染。这条只有真发一次版才暴露得出来：本机那次跑的是
  `--write` 的写入面，`pages:check` 不在它的调用链里。修法是 `--write` 自己重渲染并把生成页纳进暂存集
  （第三节那条），上面「四份文件」的说法也随之改成「四份手写 + 生成页」。Actions 自身的触发规则仍然只有真跑
  一次才算证据——这一次就是它的证据。
- **审批门自证那两格还没在 CI 里跑过**（2026-10-23 落地）。手上有的证据是三类：`approval-gate` 的八种响应
  形状由 `pnpm verify:release-ci` 的夹具钉住；对**当天真实的环境响应**做了阳性与反向对照——真实返回体判
  「1 名必需审查员，`prevent_self_review=false`」并放行，把同一份文件的 `protection_rules` 清空后判拦并退出 1；
  四条接缝钉各做过一次变异（删掉整块拦下步骤 / 去掉 `exit 1` / 把环境名改成 `cws-OTHER` / 不变异作基线），
  前三次红在该红的那一句、第四次绿——中间有一次变异其实没生效（`exit 1` 的计数没变），是量具自己骗人，
  把 delta 断言加进去之后才真的测到。**还没跑过的那半**：上传前那一格要等下一次发布才真的执行（`store_ready=true`
  才会跑），届时才能确认 Actions 令牌确实读得到 `GET /repos/{owner}/{repo}/environments/{name}`——本机那两次
  用的是所有者令牌，这一条推不出来；拦下版更要等 `CWS_AUTO_SUBMIT=true` 之后才有机会执行。在那之前，它是
  一道理所当然应该在、但从未在真实运行里亮过的灯。

---

## 相关文档

- **半自动发布链路的两个脚本**：`scripts/release.mjs`（计划与落地）、`scripts/release-ci.mjs`（Actions 适配）
- **上面那两条命令的契约守卫**：`scripts/check-release-ci.mjs`（`pnpm verify:release-ci`，形状与判定表在文件里，
  改判定就要同批改那张表）
- **发版后把 `main` 合回长期分支时的重建工具**：`scripts/repair-release-merge.mjs`（`--check` 只报告，不带
  `--check` 才写盘；默认读 `MERGE_HEAD` 与 `ORIG_HEAD`，也可以给显式 ref。有提升的那一场走五条守恒断言，
  没有提升的那一场走「文件头 + 分支的未发布区 + 已发布那侧的版本小节」逐字节自证，两种绿在输出里点名）
- **上架手册（凭据、手工建条目、商店字段）**：`.github/CWS_PUBLISHING_GUIDE.md` / `.en.md`
- **商店文案与首次上架手工步骤**：`CHROMEWEBSTORE.md`
- **提交类型如何影响版本号与 changelog**：`CONTRIBUTING.md` → 值得先知道的约定 → 「提交信息就是发布说明的数据源」（英文对照在 `CONTRIBUTING.en.md`）
- **对外可见与发布核对点**：`.github/visibility-checklist.md`
- **触发发版的工作流**：`.github/workflows/release-prepare.yml`、`.github/workflows/release.yml`
