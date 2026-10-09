# Chrome Web Store 上架指南 · Transfer Any File

简体中文 · [English](CWS_PUBLISHING_GUIDE.en.md)

本文档记录 Transfer Any File 上架 Chrome Web Store 的完整流程和关键配置。

## 📋 前置条件

- Google 账号（已有）
- 双币/全币种信用卡或借记卡（用于支付 $5 注册费）
- 稳定的网络代理（访问 Google 服务）

---

## 第一步：注册 Chrome Web Store 开发者账号

1. 打开 Chrome Web Store Developer Dashboard：
   https://chrome.google.com/webstore/devconsole

2. 使用 Google 账号登录

3. 接受开发者协议

4. 支付 $5 美元一次性注册费（使用双币/全币种卡）

5. 注册成功后，记下 devconsole 地址里那段 UUID（发布商 ID，第三步配 secrets 时要用）

> **提示**：注册过程中需要访问 Google 服务，建议选择网络稳定的时段操作。

---

## 第二步：创建扩展商品

在 Developer Dashboard 中：

### 1. 点击 **"新建商品"** (New Item)

### 2. 上传扩展 zip 包

```
.output/transfer-any-file-{version}-chrome.zip
```

> 💡 **版本管理**：zip 文件名中的版本号跟随 `package.json`，上传时以 `.output/` 目录中最新构建产物为准。确保版本号高于商店线上已发布的版本（首次提交无此限制）。

### 3. 填写商店信息（Store Listing）

#### **基本信息**：

- **名称（Name）**：
  - 中文（默认语言）：`文件格式任意转换助手 — 离线转换无上传` (28/75 字符)
  - 英文：`Transfer Any File — Offline File Format Converter` (49/75 字符)
  - ⚠️ **必须与 `public/_locales/*/messages.json` 的 `extensionName` 逐字一致**

- **摘要（Short Description）** (132 字符硬限制)：
  - 中文：**`在本机浏览器内互转 14 种常见的文档、表格与图片格式。支持混合批量、多步链路、预览编辑与 ZIP 打包，全程离线，不上传、无账号。`** (66/132 字符)
  - 英文：**`Convert between 14 common document, spreadsheet and image file formats right in your browser — offline, in batches, no uploads.`** (127/132 字符)
  - ✅ **权威来源**：`public/_locales/zh_CN/messages.json` 与 `en/messages.json` 的 `extensionDescription`（manifest 通过 `__MSG_extensionDescription__` 引用）
  - ⚠️ **商店列表必须粘贴同一句话**——两份副本逐字一致，否则审核会判定描述与 manifest 不符

- **详细描述（Full Description）**：
  - 参见 `CHROMEWEBSTORE.md` 中的"商店文案"章节
  - 中文详细说明：3,142 字符（上限 16,000）
  - 英文详细说明：8,902 字符（上限 16,000）
  - ✅ **已避开关键词堆砌风险**：所有字段均不使用逗号/冒号分隔的格式名列表

- **分类（Category）**：Productivity

- **单一目的（Single Purpose）**：

  ```
  Converts user-selected documents, spreadsheets and images between common file formats entirely on the local machine.
  ```

- **主要语言（Primary Language）**：Chinese (China)

- **附加语言（Additional Languages）**：English (United States)

#### **图形素材**：

- **商店图标**：128×128 px (`public/icon/128.png`)
- **截图**：至少 1 张、**每语言页最多 5 张**，尺寸只能 **1280×800**，格式 JPEG / 24 位 PNG
  - 中文页：从 `docs/assets/store/screens/` 选择 5 张 `-zh.png` 文件
  - 英文页：从 `docs/assets/store/screens/` 选择 5 张英文 caption 版
  - ✅ **推荐顺序**：`screen-01-workbench`、`02-batch`、`03-zip`、`04-preview`、`07-presets`
- **小幅推广图片**（可选）：440×280 px (`docs/assets/store/cws-small-promo.png`)
- **大幅推广图片**（可选）：1400×560 px (`docs/assets/store/cws-marquee-promo.png`)

#### **隐私政策**：

- **隐私政策 URL**：`https://liaolongdong.github.io/transfer-any-file/privacy.html`
- ✅ **已验证可达性**：`curl -Is https://liaolongdong.github.io/transfer-any-file/privacy.html | head -1` 返回 `HTTP/2 200`

#### **数据使用声明**：

- ✅ **勾选**：This developer collects user data
- **数据处理说明**：
  - 用户文件：读取后在本地内存中处理，不上传
  - 转换历史：仅存储文件名、格式和体积元数据（app-activity）
  - 偏好设置：存储在扩展本地 storage
  - ❌ **不收集**：任何用户文件内容、不上传、不共享给第三方
- **隐私政策文本**：
  ```
  Files are read into the extension page's memory, converted there, and returned to the user as a download. Conversion history and preferences are stored locally via chrome.storage.local. No data is transmitted, uploaded, synced or shared with anyone, including the developer; there is no server.
  ```

### 4. 权限合理性说明（Justification）

| 权限      | 用途说明                                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage` | 保存用户的转换历史（文件名、格式和体积，从不保存文件内容）和界面偏好（主题、颜色模式、语言、通知和确认开关、自定义快捷键）。数据仅存储在设备本地：扩展未声明任何 host 权限，其自身代码不发起任何网络请求。没有更窄的权限可以实现这些功能。 |

**完整中英文说明**（可直接粘贴）：

```
storage: persists the user's own conversion history (file names, formats and sizes — never file contents) and interface preferences (theme, colour mode, language, notification and confirmation switches, custom shortcut) via chrome.storage.local. Nothing leaves the device: the extension declares no host permissions and its own code issues no network request. No narrower permission can do this.
```

### 5. 点击 **"提交审核"** (Submit for Review)

---

## 第三步：配置 CI/CD 自动化发布

### 3.1 取服务账号凭据（Chrome Web Store API v2）

发布走的是 **API v2 + 服务账号**：不再有 Client ID / Client Secret / Refresh Token 那三件，也不需要在
浏览器里点一次「同意」。换掉它的理由是那条老链路两头都断了——它的授权 URL 用的是
`redirect_uri=urn:ietf:wg:oauth:2.0:oob`，Google 自 2022-02-28 起禁止新客户端使用该 redirect_uri、
2023-01-31 起对**所有**客户端关闭，授权端点在检查客户端之前就回「错误 400: bad_request」；而 v1.1 那套
端点本身在 **2026-10-15** 停止服务。

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)，创建新项目（或选已有项目）
2. 「API 和服务」→「库」→ 搜 **Chrome Web Store API** → 启用。
   没启用时令牌照样换得到、调用却被回 `403 accessNotConfigured`，所以这一步是那条链路的第一道关
3. 「IAM 和管理」→「服务账号」→ 创建服务账号。名字随意；**GCP 的 IAM 角色一个都不必加**——
   商店授权看的是这个账号在不在你这个发布商的成员列表里（第 5 步），不是 GCP 里的角色
4. 「服务账号」→ 该账号 →「密钥」→「添加密钥」→「新建密钥」→ JSON → 下载。
   要用的就是文件里那两个字段：`client_email` 与 `private_key`。
   下载完**别让它留在仓库目录里**——`git add .` 会连它一起收走，而这条链路只从 GitHub Secrets 读它，
   本机不需要留这份文件（`.gitignore` 里那条 `.env.submit` 守的是旧形状，守不住一个随机命名的 JSON）
5. 打开开发者信息中心 <https://chrome.google.com/webstore/devconsole>，进「账号」页把第 4 步那个
   `client_email` 加为成员。**一个发布商目前只能加一个服务账号**，所以同属这个发布商的几个扩展
   共用它一个就行，不必各建一个
6. 记下**发布商 ID**：devconsole 地址栏 `https://chrome.google.com/webstore/devconsole/<uuid>` 里那段
   UUID，它就是 v2 资源名 `publishers/{publisherId}/items/{itemId}` 的第一段

> v2 只有五个动作：`fetchStatus` / `upload` / `publish` / `cancelSubmission` / `setPublishedDeployPercentage`。
> 里面**没有**「创建条目」也**没有**「改可见范围」——那两件事仍然只在后台手工做，所以本文第二节不会消失。

### 3.2 配置 GitHub Secrets

在 GitHub Repository Settings → Secrets and variables → Actions 中配置以下 secrets：

**发布商级（同属一个发布商的仓库填同一套值）：**

```bash
CWS_PUBLISHER_ID                 # 发布商 ID：devconsole 地址里的那段 UUID
CWS_SERVICE_ACCOUNT_EMAIL        # 服务账号的 client_email
CWS_SERVICE_ACCOUNT_PRIVATE_KEY  # 该服务账号的私钥
```

**本扩展专用：**

```bash
CHROME_EXTENSION_ID_TAF  # Transfer Any File 扩展 ID（从 CWS Dashboard 获取，32 位 a-p 小写字母）
```

> ⚠️ **重要提示**：
>
> - 私钥的三种粘贴形状都吃得下：整份 JSON 文件、从 JSON 里复制出来的 `private_key` 字段值（那里的换行
>   还是字面量的反斜杠 n、等号还是 JSON 转义写法）、以及已经还原成多行的 PEM。认不出时会说清是哪一类
>   问题，并且绝不把密钥打进日志——见 `scripts/cws-token.mjs`
> - 但**推荐粘整份 JSON 或多行 PEM**：人手工把转义还原成真换行，是这三种形状里最容易出错的一种
> - 前三个值是发布商级别的：GitHub 个人账号没有组织级 secret 共享，所以**每个仓库里各填一次**（值相同）
> - 扩展 ID 必须是 32 位 a-p 小写字母，复制时别带空格/换行等不可见字符
> - 服务账号没有「token 7 天过期」这件事：每次运行由 `scripts/cws-token.mjs` 现签一枚 5 分钟有效的 RS256
>   JWT 去换 access_token，也不需要把 OAuth 应用发布为 In production。旧文档里那两条提醒随 refresh token
>   一起作废

### 3.3 发布流程

当前配置用 runner 自带的 `curl` 直接打 Chrome Web Store API v2 的上传 / 发布端点，**不引入第三方 npm 包
或 action**；只有换令牌那一步交给第一方的 `scripts/cws-token.mjs`（RS256 签名在 shell 里写不出来）：

1. **准备版本**（推荐路径，全自动见 `.github/RELEASE_AUTOMATION.md`）：合并到 `main` 之后，
   `release-prepare.yml` 会算出版本号、提升双语 changelog 的「未发布」区块，并开一个 Release PR。
   **合并那个 PR 就是批准发布**，标签由同一条工作流在合并之后打上。手工做法同样有效：

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **自动触发（上传作业 `release`）**：`.github/workflows/release.yml` 被标签触发后自动执行：
   - 验证 tag 与 package.json 版本一致
   - 运行源码层检查（`verify:meta`、`verify:offline:source`、`verify:numbers`、`verify:listing`）
   - 构建扩展，随后对产物再跑一次 `verify:offline`（断言浏览器实际加载的那份 manifest 只有 `storage` 权限）与 `verify:remote-code`，最后打包
   - 验证包内容（manifest.json 在根目录，无仓库文件）
   - 创建 GitHub Release
   - 校验服务账号凭据（现签一枚 JWT 换 access_token，失败时把 Google 的响应体原样打出来）与扩展 ID 格式
   - **版本预检**：先用 `:fetchStatus` 读商店现在挂着的版本号（v2 把它写在
     `publishedItemRevisionStatus.distributionChannels[].crxVersion`），本次要传的不严格高于它就直接停下。
     这条判断放在上传之前才有意义：放在之后，几兆字节已经传完，而商店只接受更高的版本
   - 上传包（请求体就是 zip 的原始字节），再读商店的回执 `uploadState`：明确为 `FAILED` / `NOT_FOUND`
     就变红，读不懂的只报告不拦

   **这个作业到此为止，一次 `:publish` 都不会调。**

3. **提审作业 `store_submit` 停在门口**：它挂的是 environment `cws-release` 的 Required reviewers。
   配好了这道门（见 3.4）的人才会看到它：Actions 里那次运行显示为 **Waiting**，点进去是
   「Review deployments」卡片，旁边一个 `cws-release` 的 Approve 按钮。**在有人点它之前，这个作业的第一
   行脚本都没跑过**，商店那边只有刚上传的草稿 revision，用户侧看不到任何东西。

   有人批准后，作业才开始跑，做三件事：

   - 再问一次 `:fetchStatus`。批准与上传之间可能隔了几小时甚至几天，久到有人自己去后台点了「提交审核」，
     也久到包还在解包队列里。这两种情况下直接按发布键，要么撞一个看不出所以然的错，更糟的是
     **把审核队列里另一份 revision 当成这次的给发布了**。所以这一步先读
     `submittedItemRevisionStatus`（已提交待审的那个 revision）与 `lastAsyncUploadState`（过去 24 小时内
     有过异步上传才设），判定交给 `scripts/release-ci.mjs submit-check`——那张「响应形状 → 退出码」的表入库为
     `pnpm verify:release-ci`，CI 的 lint job 每次按它真跑一遍，改判定必须同批改那张表
   - 判定为「可以提审」才调用 `:publish`，请求体 `{"publishType":"DEFAULT_PUBLISH"}` —— 审核通过后立即
     发布给全体用户，与旧版 `publishTarget=default` 等价
   - 判定为「这一版已经在商店那边了」就**跳过且不算失败**（重复提交只会让队列里同时躺两份同一个包）；
     判定为「商店侧状态不对」就变红停下，把理由写进 annotation

   发布响应同样过一道 `publish-state`：HTTP 200 但 `state` 是 `REJECTED` / `CANCELLED` 一律变红，
   `PUBLISHED_TO_TESTERS` 会在回执里明说「只发布给了测试人员」。

4. **要提审有三个入口**，按「谁按下发布键」分：

   | 入口                                   | 什么时候用                                  | 包要不要重传                                                                                                                             |
   | -------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
   | **审批门**（推荐，配好之后是默认路径） | 合并 Release PR → 自动上传 → 有人点 Approve | 不用。`:publish` 发就是刚上传那个 revision                                                                                               |
   | **开发者后台**                         | 门没配、或想立刻手工提交                    | 不用。Dashboard → 该商品 → Package 页点 **"提交审核"**，见「第二步 · 5」                                                                 |
   | **手动触发工作流**                     | 想指定某个历史 tag 补一次发布               | 要。Actions → Release → Run workflow，填 tag、`dry_run` 取消勾选、勾上 `submit_for_review`。勾了这个复选框才会排队，排到队后仍要过审批门 |

   旧文档里那句「重跑提审会被版本预检拦下、改走后台按钮即可」说的是**上传与提审绑在同一步**时的那种形态；
   现在两步拆开了，批准之后不必重传包，也就不会被预检拦第二次。

5. **Dry Run 测试**（可选）：手动触发时把 `dry_run` 勾上（默认就是勾着的）。它跑到构建与全部守卫为止，
   不创建 GitHub Release、不上传包，提审作业因为 `uploaded` 是空的而不排队。

   ```bash
   # 在 GitHub Actions 页面手动触发 workflow_dispatch；命令行等价写法：
   gh workflow run release.yml -f tag=v1.2.0 -f dry_run=true
   ```

### 3.4 配置人工批准门（environment `cws-release`，只做一次）

这道门是「合并 main → 一路自动走到商店门口 → **有人放行才按发布键**」里那句「有人放行」的落地物。
它不是本工作流里的一个 `if`：`if` 只能表达「这次运行有没有勾那个复选框」，表达不了
「另一个人看过并同意了」。1.0.0 三次被拒之后，「先看一眼」必须是流程里的一个**状态**，不能是跑完之后
的一句「记得看一眼」。

**顺序是死的：先建门并确认它真的会拦，再设那个变量。** 反过来的后果写在下面第 5 条里。

1. **建环境**。Repository → Settings → 左侧 **Environments** → **New environment**。
   名字必须逐字写作 `cws-release`（工作流里 `environment.name` 引用的是它）。GitHub 的环境名
   「may not exceed 255 characters and must be unique within the repository」，且**不区分大小写**——
   写成 `CWS-Release` 会被当成同一个名字，但工作流里的引用不是同一个键，别赌。

2. **加 Required reviewers**。在环境的配置页勾上 **Required reviewers**，
   「Enter up to 6 people or teams」——填谁都行，但**至少要有一个不是「将来唯一会来点批准的那个人」的
   替代品**：这条链路的意义是「另一双眼睛」。勾 **Prevent self-review** 可以禁止触发者自己批准
   （个人仓库里只有你一个人时**别勾**，见 FAQ Q8）。保存前再看一眼
   **Allow administrators to bypass configured protection rules**：勾着的话，管理员身份可以直接跳过这道门。
   「Deselect Allow administrators to bypass configured protection rules」是文档里明确的关闭方式。

3. **Deployment branch 这一项留空或写 `main`**（写模式时要「Enter the name pattern for the branch or tag
   that you want to allow」，且分支与 tag 的模式**要分别配**）。本工作流的发布作业 checkout 的是标签
   `needs.release.outputs.tag`，不是分支——如果你在这里加了分支限制，先确认标签触发仍然过得了这道规则，
   否则门会变成「谁都进不去」。拿不准就留空：这条链路上真正的拦点是 Required reviewers。

4. **保存**（Configure environment → Save protection rules）。

5. **验证这道门真的存在，然后才开变量**。GitHub 的文档写明：
   「Running a workflow that references an environment that does not exist will create an environment
   with the referenced name」，而除 Pages 隐式构建那种情况外
   「the newly created environment will not have any protection rules or secrets configured」——
   **一个自动创建出来的环境是没有门的**，每次打标签都会直接提审。所以别只信自己点过保存：

   ```bash
   curl -sS -H "Authorization: Bearer $GH_PAT" -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/<owner>/<repo>/environments/cws-release > /tmp/env.json
   node -e "const e=require('/tmp/env.json');console.log(JSON.stringify((e.protection_rules||[]).map(r=>r.type)))"
   ```

   `protection_rules` 必须**非空**，并且能在里面找到 required reviewers 那一条（GitHub 的示例响应里它的
   `type` 写作 `required_reviewers`，`reviewers` 列出被指定的人）。返回 `[]` 或者压根没有这个键，就是
   「环境存在但没有门」——回到第 2 步。字段名以你实际看到的返回体为准，这条判断只要求**非空且能看到评审人**。

6. **开变量**。Repository → Settings → Secrets and variables → Actions → **Variables** →
   **Repository variables** → New：

   ```bash
   CWS_AUTO_SUBMIT = true      # 唯一取值就是 true；不设或设成别的值 = 不提审（fail-closed）
   ```

   它是第二道保险而不是门本身：门是 environment 的 Required reviewers，变量只是「我已经把门配好了」这个
   **公开声明**（所以它是 variable 而不是 secret——它不是机密值）。它参与作业级 `if`，是因为
   `jobs.<job_id>.if` 里能用 `vars` 而**不能用 `secrets`**（文档在那一页列的可用上下文是
   github / needs / vars / inputs）。

7. **最后一次真跑验证**：打一个测试标签或手动触发一次（勾 `submit_for_review`、`dry_run` 不勾）。
   预期形状是：`release` 作业全绿并上传成功 → `Submit for review (after approval)` 显示
   **Waiting**，等你点 Approve → 点了之后不到两分钟结束。
   如果你**没有**看到 Waiting 而是它直接跑完了，说明第 5 步查出来的那个「没有保护规则的环境」就是它——
   立刻回去补，并把 `CWS_AUTO_SUBMIT` 先删掉。

---

## 第四步：获取扩展 ID

提交审核通过后，在 Chrome Web Store Dashboard 中获取 32 位扩展 ID：

1. 打开 Dashboard → 找到你的扩展
2. 扩展 ID 显示在页面 URL 中：`.../webstore/detail/[EXTENSION_ID]/edit`
3. 复制该 ID 并更新 GitHub Secrets 中的 `CHROME_EXTENSION_ID_TAF`

---

## 第五步：后续版本更新

### 5.1 版本升级流程

1. 改动合进 `main`，`release-prepare.yml` 会开出一个 Release PR（版本自动定为 `1.1.0`，
   依据是提交类型），核对它的正文并合并进去，就是批准发布 —— 细节见 `.github/RELEASE_AUTOMATION.md`
2. 想在本机先看一眼计划：

   ```bash
   pnpm release:plan          # 只算版本与 changelog，不写任何文件
   pnpm release:cut           # 本机落地：写双语文档 + 提交 + 打标签（不会推送）
   ```

3. 手工路径也仍然有效——改 `package.json` 版本号、补 `CHANGELOG.md` 与 `CHANGELOG.en.md`、再打标签：

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **重要**：新版本必须高于商店线上已发布的版本，否则会被拒绝。`release.yml` 在上传之前会把这条
   规则自己查一遍（见 3.3 的「版本预检」），不再依赖商店的报错来告知

### 5.2 注意事项

- ✅ **每次更新都要升版本号**：版本号等于或低于已上线版本的更新会被直接拒
- ✅ **上传不等于提审**：默认那一步只把包传上去，审核要人显式要求（3.3 第 3 条）
- ✅ **保持文案一致性**：所有商店字段必须与 `_locales` 文件逐字一致
- ✅ **重新运行验证**：`pnpm verify:meta`、`pnpm verify:offline`、`pnpm verify:numbers`、`pnpm verify:listing`（离线那条含产物层，本地要先 `pnpm build`；`verify:numbers` 比对对外文档里的数字与代码里的数字；推 tag 时由 `release.yml` 按构建前/后两层跑齐）

---

## 常见问题

### Q1: 服务账号那条链路报错，怎么定位到哪一环？

A: 按顺序看，四种失败各有各的现场：

1. `403 accessNotConfigured` → GCP 项目没启用 Chrome Web Store API（3.1 第 2 步）
2. 换令牌就 `400`（`invalid_grant` / `unauthorized_client`）→ `CWS_SERVICE_ACCOUNT_EMAIL` 与这份私钥
   不是同一个服务账号，或私钥在粘贴时被改坏了。前者重新配对一对，后者看第 3 条
3. 步骤日志写着「私钥读不出来」→ 粘的不是那三种形状之一，常见于手工把转义还原成真换行还原坏了
4. **令牌换得到、商店调用却 401/403** → 服务账号邮箱没加进开发者信息中心的「账号」页。
   这一条在「校验服务账号凭据」那一步是查不出来的：那一步只做本地能做的两件事（密钥读得出、令牌换得到），
   邮箱是不是成员只有商店调用才知道

老文档里「token 过期」那一问已经不存在了：服务账号每次现签现用，没有需要续期的长期令牌。

### Q2: 扩展 ID 格式错误？

A: 确保：

- 32 位小写字母（a-p）
- 没有空格、换行等不可见字符
- 直接从 Dashboard URL 复制，不要手动输入

### Q3: 审核被拒怎么办？

A: 参考 `CHROMEWEBSTORE.md` 中的"拒审记录与政策口径"章节，常见原因：

- 关键词堆砌：不要在名称、摘要中使用逗号/冒号分隔的格式名列表
- 描述与 manifest 不一致：确保所有字段逐字匹配
- 隐私政策不可达：确保 URL 返回 HTTP 200

### Q4: 如何测试发布流程？

A: 两段分开测。**上传之前那段**用 dry run，它不碰商店：

```bash
gh workflow run release.yml -f tag=v1.2.0 -f dry_run=true     # 页面上等价：勾上 dry_run
```

**门与提审这两步**不能靠 dry run 测（dry run 下 `uploaded` 是空的，提审作业压根不排队）。可靠的测法是
「让它排队、但不批准」：勾 `submit_for_review`、不勾 `dry_run` 跑一次，看它是否停在 **Waiting**。
停在 Waiting = 门在；直接跑完 = 门不在，按 3.4 第 5 步查那个 environment。

真要把一次发布**取消**掉：不批准即可，30 天后那次等待自己过期（Q9）；或者在运行页 Cancel workflow，
已上传的草稿 revision 不会出现在商店页面上——它没被提交审核。

### Q5: 包上传成功了，商店那边怎么没开始审核？

A: 先确认这是不是你要的形状。上传作业**从不调用 `:publish`**，提审是另一个作业的事，而它排队要四个条件
同时成立（少一个就连排队都不排）：

| 条件                                                 | 在哪查                                                  |
| ---------------------------------------------------- | ------------------------------------------------------- |
| 上一作业真的传成功了（`uploaded == 'true'`）         | `release` 作业那步的日志末尾；失败原因写在响应体里      |
| 四项 secrets 齐备（`store_ready == 'true'`）         | 「Detect Chrome Web Store credentials」那一步的 summary |
| 仓库变量 `CWS_AUTO_SUBMIT == 'true'`                 | Settings → Secrets and variables → Actions → Variables  |
| 手动触发时勾了 `submit_for_review`（标签触发不看它） | 那次运行的 Run workflow 表单                            |

四个都对而作业显示 **Waiting** 而不是 skipped —— 那不是没开始审核，那就是门。叫它的 reviewers 里任何
一个人点 Approve。三个入口（门 / 后台按钮 / 手动触发）的区别见 3.3 第 4 条的表。

### Q6: `Submit for review (after approval)` 显示 skipped，一点日志都没有

A: 作业级 `if` 为假，所以它连一行脚本都没执行——上面那张表按顺序查。最常见的两个是：变量没设（**fail-closed
是刻意的**：没确认过门存在就不该自动提审），以及手动触发时忘了勾复选框。

如果 `release` 作业里商店那两步本来就是灰的（"已跳过 Chrome 应用商店"），那是 secrets 不齐，先回 3.2。

### Q7: 我在哪里批准？批准了却没动静？

A: Actions → 那次运行 → 页面顶部 `cws-release` 那一行旁边有 **Review deployments**，点开卡片里的
**Approve and deploy**。要点：

- **只有 `required_reviewers` 名单里的人（以及被允许绕过的管理员）看得到这个按钮**。别人只能看到 "Waiting"。
- 名单里**任一人**批准即放行（文档原话："Only one of the required reviewers needs to approve the job
  for it to proceed"），不需要 6 个人都点。
- 批准的是**作业的开始**，不是发布结果。批完了它才去 `:fetchStatus`、再决定按不按发布键（3.3 第 3 条）。
- 没看到卡片：确认这个 environment 真的挂在作业上（`environment.name: cws-release` 拼写一致），
  以及这个环境**不是**被首次运行自动创建出来的那个空壳（3.4 第 5 步）。

### Q8: 仓库只有我一个人，勾了 Prevent self-review 之后没人能批准了

A: 这是这道门在个人仓库上的真实张力：门要的是「另一双眼睛」，而你可能确实只有这一双。三个选项，按诚实程度排：

1. **加一个真实的第二人**（协作者、家人账号、你自己的另一个账号），让门名副其实。
2. **不勾 Prevent self-review**，接受「自己批准自己」——这时门仍然拦住了**自动化**（标签推上去不会自己发出去，
   必须有人来点），只是拦不住那个「人」是你自己。
3. 别为了让流程看起来有门而留一个谁都批不了的名单：那样每次发布都会卡在 Waiting，最后你会养成
   「绕过它」的习惯，那比没有门更糟。

无论选哪种，`CWS_AUTO_SUBMIT` 的语义都不变：它只是「门已配好」的声明，不是「跳过门」。

### Q9: 批准等了很久会不会超时？

A: 两个不同的钟，别混：

- **等待批准**：「A workflow may wait for up to 30 days on environment approvals」。所以周五推的标签，
  周一早上批也还来得及；超过 30 天没人管，那次等待自己过期。
- **批准之后执行作业**：GitHub 托管 runner 的单个作业上限是 6 hours（5 天那一档是自托管 runner 的）。
  这一步实际只用不到两分钟。

工作流里**刻意没写** `jobs.store_submit.timeout-minutes`：文档没有明确说那个钟在等待审批期间走不走，
而一旦它从排队时起算，一个 10 分钟的设置就会变成「批准得慢一点的发布自己超时」——这种失败既看不出
所以然，又正好落在最不该失败的地方。

### Q10: 私有仓库 / Free 计划能用这道门吗？

A: 文档写明「Users with GitHub Free plans can only configure environments for public repositories」，
私有仓库要 Pro / Team。本仓库是 public，所以门可用。如果你在**私有仓库 + Free** 上照抄这套配置：
`environment:` 引用一个建不出来的环境，行为会退化成「自动创建的空壳环境」（没有保护规则），
也就是**每次打标签直接提审**——这正是 `CWS_AUTO_SUBMIT` 那道变量保险要拦的情形。
那种账号条件下的正确做法是：不设变量，提审走开发者后台的 Package 页按钮。

同一篇文档还提醒：把一个 Free 计划下的公开仓库改成私有，已有的保护措施会被忽略并锁住配置入口，
直到改回来为止。仓库可见性不是免费参数，别在配好门之后随手翻。

### Q11: 批准之后那一步失败了（或被拒），要不要重传包？

A: 不用重传。`:publish` 发布的就是**已经上传的那个 revision**，所以修复了原因之后再跑一次提审作业即可。
而重跑前它自己会先问 `:fetchStatus`：

- 如果商店那边这一版**已经在审核队列里**（例如你中途自己去后台点过按钮），`submit-check` 返回 10，
  作业**跳过且算绿**——不会出现队列里同时躺两份同一个包。
- 如果包还在解包（`lastAsyncUploadState: IN_PROGRESS`）或解包失败，返回 20，作业变红并写明原因，
  **不会**去按发布键。
- 如果队列里躺着的是**别的**版本号，同样返回 20——不把别人的 revision 当成这次的发布。

真正需要重传包的只有一种情况：你改了 `package.json` 版本号并推了新标签。

### Q12: `skipReview` 是什么？为什么不接上它？

A: v2 的 `PublishItemRequest` 里除了 `publishType` 还有三个字段：`skipReview`、`blockOnWarnings`、
`deployInfos`。

- `skipReview` 的字面意思是「不提审直接发布」。**这条链路不接它**：审核不是可以由调用方宣布免除的环节，
  接上它等于给发布脚本加了一个「绕过商店检查」的开关，而这条链路的整条理由恰恰是「商店的检查之前先有
  一道人的检查」。
- `blockOnWarnings` 是「有告警就当失败」的开关，**也刻意不开**：告警按文档是非阻断的，拦下来只会让人
  必须去后台看一眼才能重试。取而代之的是 `publish-state` 把告警**打印出来**（回执里写「N 条非阻断告警
  （reason：description / …）」），让人决定。
- `deployInfos` 配的是 `STAGED_PUBLISH` 的分批放量。这里发的是 `DEFAULT_PUBLISH`，用不到它；
  要改成灰度发布是**一次有意的产品决定**，不该是某次 CI 改动顺手带来的。

---

## 相关文档

- **商店文案完整模板**：`CHROMEWEBSTORE.md`
- **权限与隐私申报**：`CHROMEWEBSTORE.md` → "权限与隐私申报"
- **拒审记录与应对**：`CHROMEWEBSTORE.md` → "拒审记录与政策口径"
- **发版自动化（Release PR、标签、secrets 清单）**：`.github/RELEASE_AUTOMATION.md`
- **产品说明页**：https://liaolongdong.github.io/transfer-any-file/
- **隐私政策**：https://liaolongdong.github.io/transfer-any-file/privacy.html

---

## 配置检查清单

发布前请确保：

- [ ] GitHub Secrets 配置齐全（发布商级 3 个 + 本扩展专用 1 个；要让标签自动触发发版，再加 `RELEASE_PAT`）
- [ ] 服务账号邮箱已加进开发者信息中心的「账号」页（漏了这步，令牌照样换得到，是商店调用才回 401/403）
- [ ] GCP 项目已启用 Chrome Web Store API
- [ ] 扩展 ID 格式正确（32 位 a-p 字母，`CHROME_EXTENSION_ID_TAF`）
- [ ] 所有验证通过（`pnpm lint:all && pnpm verify:meta && pnpm verify:listing && pnpm build && pnpm verify:offline`）
- [ ] 商店文案与 `_locales` 文件一致
- [ ] 隐私政策 URL 可达
- [ ] 版本号高于线上版本
- [ ] **（要走自动提审才需要）** environment `cws-release` 已建好，且 `protection_rules` 里能看到
      Required reviewers 那一条——不是首次运行自动创建的空壳（3.4 第 5 步的那条 curl 命令）
- [ ] **（同上）** 仓库变量 `CWS_AUTO_SUBMIT=true` 已设，且设之前刚验证过上一格
- [ ] **（同上）** 名单里至少有一个**不是本次触发者**的批准人；个人仓库只有一个人时，确认自己选的是
      Q8 里的哪一种，而不是「勾了 Prevent self-review 然后没人能批」

---

## 联系方式

- **问题反馈**：[GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **邮箱**：[924902324@qq.com](mailto:924902324@qq.com)
- **微信**：`lld_1025`（备注「taf」）
