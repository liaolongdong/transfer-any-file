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
  - 中文详细说明：3,405 字符（上限 16,000）
  - 英文详细说明：9,737 字符（上限 16,000）
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

### 3.0 先确认这条链此刻缺哪几块（只读，任何时候都能跑）

本文其余小节写的是**应有状态**，而跑不通的原因几乎全在仓库设置里。GitHub 的 Secret **只写不可读**，所以能核对的是
「名字在不在」，不是「值对不对」。动手配之前先跑这五条，它们全是 GET，一个字节都不写：

```bash
R=liaolongdong/transfer-any-file

gh api repos/$R/actions/secrets --jq '.secrets[].name'                     # ① 四项新名字在不在
gh api repos/$R/environments/cws-release --jq '[.protection_rules[].type]' # ② 门有没有牙
gh api repos/$R/environments/cws-release/secrets --jq '.total_count'       # ③ 必须是 0
gh api repos/$R/actions/variables --jq '.variables[].name'                 # ④ CWS_AUTO_SUBMIT
git ls-remote --tags origin | wc -l                                        # ⑤ 有没有标签
```

| 读数                                                                                                                         | 说明什么                                                                                                              | 去哪一节    |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| ① 缺 `CHROME_EXTENSION_ID_TAF` / `CWS_PUBLISHER_ID` / `CWS_SERVICE_ACCOUNT_EMAIL` / `CWS_SERVICE_ACCOUNT_PRIVATE_KEY` 任一项 | 商店那两步**一起静默跳过**，摘要写「已跳过 Chrome 应用商店」，运行照样全绿                                            | 3.2         |
| ① 里有 `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_EXTENSION_ID`                                                            | 那是 v1.1 时代的三项，新链路一个字都不读它们——**别把它们数成「配了三样」**（见 Q17）                                  | 3.2         |
| ② 是 `[]`                                                                                                                    | 环境存在但**没有门**：`store_submit` 一旦排上队就直接放行                                                             | 3.4         |
| ② 只有 `wait_timer`、没有 `required_reviewers`                                                                               | **假门**：timer 走完自动放行，不需要任何人批准（见 Q16）                                                              | 3.4         |
| ③ 不是 `0`                                                                                                                   | 凭据配成了环境级，只有 `store_submit` 看得见；上传那一步在 `release` 作业里，看不见                                   | 3.2         |
| ④ 里没有 `CWS_AUTO_SUBMIT`                                                                                                   | 提审作业连排队都不排——这是刻意的 fail-closed                                                                          | 3.4 第 6 步 |
| ⑤ 是 `0`                                                                                                                     | 第 1 / 2 / 3 档**此刻都跑不了**：`Check out the tag` 按 `inputs.tag` 检出，不存在的 ref 直接失败；只有第 0 档不受影响 | Q19         |

② ③ ④ 这三格合起来，解释的是最容易误判的一种现场：**流水线全绿，而商店那边什么都没发生**。那不是某一步失败，
是那两步根本没执行——`Detect Chrome Web Store credentials` 判的是「四样都非空」，缺任何一样都只写一行跳过原因。

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
6. 记下**发布商 ID**：打开某个商品的编辑页，地址栏形如
   `https://chrome.google.com/webstore/devconsole/{A}/{B}/edit`——`{A}` 才是要记的那一段，`{B}` 是商品
   （扩展）ID。`{A}` 就是 v2 资源名 `publishers/{publisherId}/items/{itemId}` 的第一段，本发布商这串是
   **36 位含 `-` 的 UUID，不是纯数字**。三个长得都像的候选，只有一个能用：

   | 候选                                       | 它是什么                                                                    | 能不能填进 `CWS_PUBLISHER_ID` |
   | ------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------- |
   | devconsole 地址栏第一段（36 位 UUID 形）   | 发布商（开发者账号）的 ID，v2 资源路径的第一段                              | ✅ 就是它                     |
   | 服务账号详情页的「唯一 ID」（21 位纯数字） | Cloud IAM 给这个服务账号编的号，用途是拼 `<该编号>@iam.gserviceaccount.com` | ❌ 与商店授权无关             |
   | Cloud 项目的 project number（纯数字）      | GCP 项目号                                                                  | ❌                            |

   > ⚠️ **这一格没有第二道检查替你兜底。** v2 的接口定义对这段只要求「不含 `/`」，所以「形状合法、值却是
   > 另一个编号」会一路走到 Google，然后在**只读的第一跳** `:fetchStatus` 上回 `403 PERMISSION_DENIED`——
   > 不是 404，也不需要等到写接口。CI 日志里那行 `publishers/***/items/***` 帮不上忙：`***` 是 GitHub 对
   > Secret 值的掩码，只要非空且合法形就长这样。兄弟仓库 account-password-helper 在 2026-10-11 就踩在这条上。
   > Secret 只写不可读，所以处置不是「先比对旧值」，而是**拿地址栏那串直接覆盖一次**，再用下面的只读档验通
   > （3.3 的第 0 档），成因与判法另见 FAQ Q14。

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
> - **四项都要落在 Repository secrets 那一档，不是 environment `cws-release` 的 secrets。** GitHub 的环境级
>   secret 只对声明了那个环境的作业可见，而**上传**那一步在 `release` 作业里（它不挂 environment）：配错级别的
>   后果不是报错，是 `store_ready=false`、商店两步一起静默跳过（现象见 Q6）。只有 `store_submit` 看得见环境级
>   的值，于是「提审绿了、包却没传」这种最难解释的形状就是这么来的
> - **私钥原文进过聊天窗口、Issue / PR 评论、CI 日志、终端回滚缓冲或提交记录，就算已泄露**，只能换不能删——
>   删掉那条消息不是处置手段，它可能已被缓存或索引。轮换四步：Cloud Console → 该服务账号 → Keys → 删旧 key →
>   新建 JSON key → 按下面的取法重贴进 `CWS_SERVICE_ACCOUNT_PRIVATE_KEY`（Secret 是整体替换）→ 跑一次只读档确认
>   新 key 生效，然后**把下载那份 JSON 删掉**。**同一把 key 换在同一服务账号下时 `client_email` 不变**，
>   所以 3.1 第 5 步后台那一行不用重做；只有连服务账号一起废弃、换新邮箱时，才要在后台先移除旧邮箱再挂新的，
>   并且 `CWS_SERVICE_ACCOUNT_EMAIL` 必须与这把私钥**出自同一份 JSON**——只改一边时换票会直接失败

私钥这一格**粘什么形状都行**这件事，本仓库是测过的，不是推测的（`normalizePrivateKey` 三条出口逐形状跑过，
本机 2026-10-11 现生成一把 2048 位 RSA 的 PKCS#8 计数：目标形状 **28 行**，把换行写成两个字符的字面量 `\n`
之后是 **1 行 / 1732 字符**）：

| 粘进去的形状                                   | `scripts/cws-token.mjs` | 失败时报的那句                                       |
| ---------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| 多行 PEM（BEGIN / END 两行都在，中间真实换行） | ✅                      | —                                                    |
| 整份服务账号 JSON 文件                         | ✅                      | —（里面没有非空 `private_key` 才报「JSON 里没有…」） |
| JSON 里那个字段值、换行还是字面量 `\n`         | ✅                      | —（脚本自己还原）                                    |
| CRLF 行尾、首尾多空行                          | ✅                      | —                                                    |
| 连 JSON 的那对双引号一起贴                     | ❌                      | `私钥不是一把能用的 RSA 私钥：error:1E08010C…`       |
| 只贴中间那段 base64、首尾两行丢了              | ❌                      | `认不出 PEM 头（期望 "-----BEGIN …"）`               |
| 只有 BEGIN、没有 END                           | ❌                      | `私钥不是一把能用的 RSA 私钥：error:1E08010C…`       |

也就是说：**「整段一行」在本仓库不是坏形状的判据**（脚本会把字面量 `\n` 还原回来），真正会红的是首尾两行
丢了或引号带进来了；三种失败各有各的句子，照着上面那两句就能定位。取法推荐仍然用带真实换行的那条，
省得靠脚本兜底（`pbcopy` 是 macOS 的，Linux 换 `xclip -selection clipboard`）：

```bash
SA_JSON=~/Downloads/service-account.json    # 换成你下载那份的实际路径
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).private_key)' "$SA_JSON" | pbcopy
```

贴之前想自证剪贴板里那一串是不是一把能用的钥匙（不联网、不落盘、不回显内容，只报结构事实）：

```bash
pbpaste | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{require("crypto").createPrivateKey(s);console.log("可解析 | 行数",s.trimEnd().split("\n").length,"| 含字面量 \\n:",s.includes("\\n"))}catch(e){console.log("仍然坏：",e.message)}})'
```

### 3.3 发布流程

当前配置用 runner 自带的 `curl` 直接打 Chrome Web Store API v2 的上传 / 发布端点，**不引入第三方 npm 包
或 action**；只有换令牌那一步交给第一方的 `scripts/cws-token.mjs`（RS256 签名在 shell 里写不出来）：

**四档执行深度**，越靠下越接近一次真实提审。第 0 档存在的理由是：另外三档都以「构建 + 上传」为前提，
而凭据或那两个 ID 配错的时候，你最不想要的就是先传一次包再去猜（1.0.0 那三轮拒审里就有一轮的代价花在这里）：

| 档位              | 怎么触发                                                          | 做什么                                                                   | 要不要人批准 | 什么时候用                                             |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------ |
| **0 只读档**      | 手动触发，勾 `store_status_only`（`tag` 可留空）                  | 现签一枚令牌 + 一次 `:fetchStatus`，把线上版本号与商店侧状态写进 summary | 否           | 第一次真发布之前验凭据；随时想知道在架的是哪一版       |
| **1 Dry run**     | 手动触发，`dry_run` 保持勾选（默认就是勾着的）                    | 构建 + 全部守卫 + 包内容校验；不建 Release、不碰商店                     | 否           | 改到 manifest / 依赖 / 打包后，先确认产物本身合规      |
| **2 只上传**      | 推 `v*` 标签；或手动触发但**不**勾 `submit_for_review`            | 走完发布与上传，到此为止（`release` 作业不调 `:publish`）                | 否           | 默认形态：包先交到商店手上，要不要惊动审核由人稍后决定 |
| **3 上传 + 提审** | 手动触发勾 `submit_for_review`，且 `CWS_AUTO_SUBMIT=true`、门已配 | 第 2 档 + `store_submit` 排队等 `cws-release` 批准 → 批准后 `:publish`   | **是**       | 正式发版（推标签那条自动链路在门配好之后就是这一档）   |

> ⚠️ 第 0 档那个复选框叫 `store_status_only`，它是这次改动新加的字段。GitHub 的 dispatch 表单取的是
> **你选中的那个 ref 上的那份工作流文件**，所以这份文件合进哪个分支，那个分支上才看得到这一档；在还没合进去
> 的分支上触发，表单里根本没有这个勾，跑的是那个 ref 的旧定义。同理，Actions 页面里的工作流清单只看默认分支。

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

6. **第 0 档（`store_status`）具体做什么**：这个作业不构建、不装依赖，只跑两个第一方脚本
   （`cws-token.mjs` 现签令牌、`release-ci.mjs item-version` 读版本号），中间只有一次商店调用是
   `:fetchStatus`，一个字节都不写。两个刻意的差别：

   - **不挂 environment**——只读不需要人放行，需要放行的只有写那一下；挂了门，「看一眼线上是哪一版」
     就变成一次审批。
   - **不检出 `tag`**——那两个脚本是 2026-10 才合进来的，比它们更早的 tag 上没有这两个文件，
     跟着 tag 检出会在第一步就 `Cannot find module`，而那次失败与凭据毫无关系。所以它固定检出本次触发
     所在的 ref。

   ```bash
   gh workflow run release.yml -f store_status_only=true      # 页面上等价：勾 Store status only，tag 留空
   ```

   怎么判读：summary 里那行「线上版本号」就是商店此刻挂着的版本。这一步绿，说明「服务账号 → access_token
   → v2 端点」整条通、四项 Secret 与那两个 ID 配成了**一套**；红在 403 就按 Q14 那两种成因查，
   红在换票那一步就按 Q1 前三条查。要是打印出来的是 `fetchStatus HTTP 000` 并紧跟一句「没有响应体」，
   那不是凭据问题而是**根本没连上商店**（curl 连不上时不会创建那个响应体文件，所以这一步特意把这两种
   形状分开说，不让一句 `No such file or directory` 顶掉判决）——本机直连时这一种最常见，见 Q13。
   它绿了**不代表**商品文案填齐了——那些字段 API 既不写也不读。

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

   > ⚠️ **这一步只能在网页界面里做，别照命令敲。** 本轮实测：同一个环境上 `wait_timer` 与 `can_admins_bypass`
   > 两个字段 REST 都改得动，唯独 required reviewers 这条规则改不了——`reviewers` 里填本人 id、填不存在的 id、
   > 填别人的 id，回的都是同一句 422 `Required reviewers must have at least one reviewer`。判法与那一整张
   > 实测表在 Q16，它顺带解释了为什么「只有 `wait_timer`」的环境是一条会自动放行的**假门**。

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

   从 2026-10-23 起，上面这条 curl 之外还有一道运行时的兜底：`release.yml` 自己读同一个端点。上传之前那一格
   `Report whether the approval gate is real` 只把结论写成 `::warning::`（这一版可能压根不打算自动提审，为一道
   没打算走的门把发布判红是不对的）；`store_submit` 在 `:publish` 之前跑的是**拦下版**——读不到环境，或者
   `protection_rules` 里没有带审查人的 `required_reviewers`，作业变红、不提审。判据不在 YAML 里，在
   `scripts/release-ci.mjs` 的 `approval-gate`，由 `pnpm verify:release-ci` 用夹具钉住（放行只有一种形状；
   空壳环境、只有 `wait_timer`、名单为空、响应读不出，四种都判拦）。于是「引用了环境」和「有人必须先点头」
   不再是同一句话的两种写法。

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
   邮箱是不是成员只有商店调用才知道。**403 还有第二种成因**——`CWS_PUBLISHER_ID` 填成了另一个长得也像的
   编号，两种成因与判法见 Q14；这一问最省事的验法是第 0 档（只读、零写入），不必等到一次真上传

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

A: 先跑**第 0 档**把凭据链验通（`store_status_only`，不构建、不写商店、不要批准，3.3 第 6 条），下面两段
才有意义。然后两段分开测。**上传之前那段**用 dry run，它不碰商店：

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

### Q13: 想在本地先把凭据验通，结果 `fetch failed` 或者干等十几秒超时

A: 那是**网络层没出去**，不构成任何凭据结论。`scripts/cws-token.mjs` 用 `fetch` 打
`https://oauth2.googleapis.com/token`，而 **Node 22 及更早不读 `HTTPS_PROXY`**（认环境代理是 Node 24 的
`NODE_USE_ENV_PROXY`），所以本机常开的系统代理在这条链路上完全不参与。兄弟仓库 account-password-helper
在 2026-10-11 量过同一个形状：直连商店域名 19.9 秒超时（`http=000`），只有显式走代理才出得来。
于是这类机器上：

- 「本地红」**推不出**「凭据错」——它报的是 `fetch failed` / 超时，而不是商店给的状态码
- 判绿改走 CI 的第 0 档（3.3 的 `store_status_only`）：不构建、不写商店、不要批准，runner 侧没有这层代理问题
- 本地仍然可做的两件事都不联网：3.2 那条剪贴板自检（只报行数与判据、不回显密钥），以及
  `pnpm verify:release-ci`（拿夹具打五条判定：四条商店响应 + 一条环境审批门自证，全程零网络）
- 别把私钥 `export` 进 `~/.zshrc` 之类的启动文件来「省得再贴」；只在当前 shell 里导，
  要看它长什么样用 3.2 那条自检，`echo "$CWS_SERVICE_ACCOUNT_PRIVATE_KEY"` 会把整段 PEM 打进回滚缓冲

### Q14: 令牌换得到，`:fetchStatus` 却回 `403 PERMISSION_DENIED`

A: Google 那句 `Permission denied on resource 'publishers/{id}/items/{extId}' (or it might not exist)`
**同时涵盖两种成因**，别默认它是「邮箱没加」那一种：

1. **服务账号邮箱没加进开发者信息中心的「账号」页**（3.1 第 5 步）。这一条连只读查询都会被拒，
   不必等到写接口——正是第 0 档能把它单独暴露出来的原因。
2. **那两段拼出来的资源不归当前发布商**：`CWS_PUBLISHER_ID` 填成了服务账号详情页那个 21 位「唯一 ID」、
   或 Cloud 项目的 project number，又或者商品 ID 抄错。三段候选怎么分见 3.1 第 6 步那张表。

判法不是「先把旧值比对出来」——Secret 只写不可读，日志里那行 `publishers/***/items/***` 是 GitHub 的掩码，
只要非空且合法形就长这样，而形状检查对这段只禁 `/`，**值错照样一路绿到 Google**。所以处置是
**拿 Dashboard 地址栏第一段直接覆盖一次 Secret**（覆盖即收敛），然后用第 0 档判绿，别拿第 3 档试。

两种 403 都是**零写入**：它落在 `:fetchStatus` 那一跳，包没上传、也没生成新 revision，所以补好之后
重跑那一次运行就行，不会撞版本预检（预检比对的是线上版本号，它没变过）。

### Q15: 手动触发填了一个 tag，第一步就 `Cannot find module '…/scripts/cws-token.mjs'`

A: `release` 与 `store_submit` 都按那个 tag 检出（`ref: ${{ github.event.inputs.tag }}`），
而 `cws-token.mjs` / `release-ci.mjs` 是这一轮改动才合进来的文件——**比它们更早的 tag 的树上根本没有这两个
脚本**（同理：这一轮还没合进 `main` 之前，`main` 上打的 tag 用的是旧的 v1.1 链路）。这不是凭据问题：
它红在检出之后的第一个脚本，还没走到任何联网的那一步。坐实只需要一条只读命令：

```bash
git fetch --tags origin
git ls-tree <那个tag> scripts/cws-token.mjs     # 输出为空 = 那个 tag 上没有它
```

结论：第 1 / 2 / 3 档只对**含有这些脚本的那个 ref 打出的 tag**有意义；只想验凭据链就用第 0 档，
它固定检出本次触发所在的 ref，不受这条限制（3.3 第 6 条）。

### Q16: 环境建好了，`protection_rules` 里只有 `wait_timer`——这算门吗？

**不算，而且比没有门更危险。** wait timer 是「等满 N 分钟自动放行」，它不需要任何人批准；把它当成闸门，等于
给一次自动提审配了一个缓冲期。判据只有一条：`protection_rules` 里必须出现 `required_reviewers` 那一条，
且 `reviewers` 列得出人（3.4 第 5 步那条命令读的就是它）。

本轮实测的另一件事值得写进这里，因为它推翻了「照命令敲就能配好」这个假设：**这一条保护规则在本账号上只能用
网页界面加，REST 加不上**。同一个 `PUT /repos/{owner}/{repo}/environments/cws-release`：

| 请求体                                                                       | 结果（2026-10-18 实测）                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `{"wait_timer":1}`                                                           | 200，`protection_rules` 出现 `wait_timer`                |
| `{"wait_timer":0}`                                                           | 200，规则清空                                            |
| `{"can_admins_bypass":false}`                                                | 200，字段改掉                                            |
| `{"reviewers":[{"reviewer_id":<本人 id>}]}`                                  | 422 `Required reviewers must have at least one reviewer` |
| 同上，再加 `wait_timer` / `prevent_self_review` / `deployment_branch_policy` | 422，同一句                                              |
| `{"reviewers":[{"reviewer_id":1}]}`（不存在的 id）                           | 422，**还是同一句**                                      |

最后一行是判据：报错与 id 对不对无关，说明 GitHub 根本没校验那串数字，而是整条 required reviewers 规则没被接受
（`gh` 用的是 OAuth 令牌，`repo` 与 `workflow` 两个 scope 都在，`wait_timer` 写得动，所以不是没有写权限）。
所以处置是：**去 Settings → Environments → `cws-release` → Required reviewers 在界面里加**，回来再用 3.0 的第 ②
条确认读得出 `required_reviewers`。在那之前不要设 `CWS_AUTO_SUBMIT`——空壳环境与假门都会让「合并 main」直接
惊动审核，而这条链路的整句理由就是先要有一个人看一眼。

### Q17: 仓库里还留着 `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_EXTENSION_ID`，是不是说明凭据配好了？

不是。那三样是 v1.1 那套「OAuth 桌面客户端 + refresh token」的遗留，**新链路一个字都不读它们**：`release.yml`
读的是 `CHROME_EXTENSION_ID_TAF`、`CWS_PUBLISHER_ID`、`CWS_SERVICE_ACCOUNT_EMAIL`、`CWS_SERVICE_ACCOUNT_PRIVATE_KEY`
这四样，判据是「这四样都非空」。留着它们不会让流水线失败，但会让人在 3.0 的第 ① 条里数错——本轮实测这个仓库
就是「旧三样在、新四样缺」的形状，那种状态下商店两步一起静默跳过。

删不删由所有者定：Secret 只写不可读，删掉之后原值找不回来，要恢复必须重新粘。唯一别做的事是把
`CWS_EXTENSION_ID` 当成「已经配过扩展 ID 了」——工作流里那个键叫 `CHROME_EXTENSION_ID_TAF`，名字不对等没配。
顺带一句：那 32 位本来就是公开的（商店详情页地址栏里就是它），所以把它复制成新键这一步没有任何保密难度，
`gh secret set CHROME_EXTENSION_ID_TAF` 粘进去即可。

### Q18: 合并了 Release PR，既没有标签、`release.yml` 也没跑？

**2026-10-27 起，这一格不再是「缺 `RELEASE_PAT`」**：标签由作业令牌创建，紧接着 `release-prepare.yml` 的
`publish` 那一格用 `workflow_call` **显式**把 `release.yml` 调起来。链路不再赌「标签触发工作流」这件事，
所以 GitHub 那条硬规则（**由 `GITHUB_TOKEN` 产生的事件不再触发其他工作流**）被绕开而不是被满足。
`RELEASE_PAT` 现在只决定 Release PR 的作者是谁，也就是那条 PR 上有没有状态检查（配法见
`.github/RELEASE_AUTOMATION.md` 的 1.2；不配也照样发版）。

于是现在有两种形状，读法相反。`Push the tag` 那一格是**红的**：标签没建成，最常见是仓库把
Settings → Actions → General 的 Workflow permissions 设成 Read repository，把作业声明的 `contents: write`
压掉了；摘要里给出本机那三行，补完就走 `push: tags` 那一路。那一格**绿、而 `publish` 显示 skipped**：
标签本来就存在（人已推过），发布应由那一次推送负责——要补就直接手动运行 `release.yml` 并填 `tag`。
这一格在 3.0 的第 ⑤ 条读得出来——`git ls-remote --tags origin` 为空而 `main` 上已经有版本小节，就是这个形状。

### Q19: 现在想跑一次 dry run 验产物，结果第一步就失败？

如果 3.0 的第 ⑤ 条读出标签数是 `0`，那第 1 / 2 / 3 档此刻**都跑不了**，且失败点与凭据无关：`release` 作业
第一步 `Resolve which tag to build` 把三路的标签信号（标签事件的 ref 名、手动触发的 `tag`、接力传进来的
`tag`）收敛成一个值，**形状不是 `v` 前缀就当场失败**，检出拿的是它算出的 `refs/tags/<tag>`——你填的那个标签
在仓库里不存在，红的是检出那一步，而它不会带着一个错误的 ref 去构建别的树。dry run 也是从这一步开始的——
「不创建 Release、不碰商店」发生在后面，不改变它需要一个真实标签才能开工。

想验的东西按深浅各有对应的入口：

| 想验什么                                 | 用什么                                                                                                                                      | 需不需要标签 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 产物本身合规（构建 + 全部守卫 + 包内容） | 本地 `pnpm build && pnpm verify:offline && pnpm verify:remote-code`；CI 侧由 `ci.yml` 的 build job 代跑                                     | 不需要       |
| 判定逻辑与 `release.yml` 的接缝没被改坏  | `pnpm verify:release-ci`（零网络）                                                                                                          | 不需要       |
| 凭据链通不通                             | 第 0 档 `store_status_only`，它固定检出本次触发所在的 ref                                                                                   | 不需要       |
| 整条发布链                               | 合并 Release PR 就够（标签由作业令牌建、`publish` 接力发布，见 Q18）；标签已存在而没发布时本机补那三行，或直接手动跑 `release.yml` 填 `tag` | **需要**     |

### Q20: `uploadState=IN_PROGRESS` 的时候会发生什么？会不会把上一版提审上去？

商店收到包之后是**异步解包**的，`:upload` 可能回 `IN_PROGRESS`。这时候立刻 `:publish`，审核队列里拿到的就是
**上一个已解析的版本**——这是 v2 最坑人的一种失败，因为它报成功，而发布出去的是旧包。

这条链路的处理是分两层，不靠运气：上传那一步读到 `IN_PROGRESS` 只在摘要里写「商店仍在解包」，**不判红**
（包确实交上去了，红一次会把整个发布作业标坏）；真正拦下的是提审作业里的 `submit-check`——它先重新问一次
`:fetchStatus`，读到 `lastAsyncUploadState` 还是 `IN_PROGRESS` 就返回退出码 20，作业变红并写明原因，
**发布键不按**。而这两步之间隔着 3.4 那道人工批准门，解包通常早就落定了。

要自己手搓 curl 调这两个端点时，这里就是唯一必须补一段轮询的地方：`GET :fetchStatus` 读
`lastAsyncUploadState`，落定（`SUCCEEDED` / `FAILED`）之前不要 POST `:publish`。参考仓库的做法是固定轮询到落定
为止再提审，本项目把它交给了 `submit-check` 的判红——两种都行的前提是「读过才发」，而不是「发完再读」。

### Q21: 包传错了、或者提审内容不对，能不能撤回这次提交？

能，v2 有 `:cancelSubmission`，但**本仓库没有把它接成子命令**（`scripts/release-ci.mjs` 的四条商店响应判定是
`item-version` / `upload-state` / `submit-check` / `publish-state`，里面没有撤审那一条，`release.yml` 也没有撤审那一步）。
所以当前处置有两条真路：开发者后台该商品的页面上手工撤回，或者用下面这段一次性手工配方。配额限制按 Google
文档是**每个发布商每天 6 次**，别把它当重试按钮用。

```bash
# 一次性应急：只撤这一次提交，不动包、不动 GitHub Release。
export CWS_SERVICE_ACCOUNT_EMAIL='…@iam.gserviceaccount.com'
SA_JSON=~/Downloads/service-account.json
export CWS_SERVICE_ACCOUNT_PRIVATE_KEY="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).private_key)' "$SA_JSON")"

node scripts/cws-token.mjs /tmp/cws.cfg          # 权限 600 的 curl 配置文件，令牌不落 argv
curl -sS --config /tmp/cws.cfg -X POST \
  "https://chromewebstore.googleapis.com/v2/publishers/$CWS_PUBLISHER_ID/items/$CHROME_EXTENSION_ID_TAF:cancelSubmission" \
  -w '\n[http %{http_code}]\n'
rm -f /tmp/cws.cfg                                # 用完就删
```

这段**本轮没有真跑过**（既没有凭据，本机又出不了网，见 Q13），端点名与配额以 Google 当前文档为准；写在这里的
理由是「撤审这件事在本文档里原本没有出处」，而不是「已验证可用」。真要用它之前，先跑一次第 0 档确认
`:fetchStatus` 读得到当前条目，再确认地址栏那两段（3.1 第 6 步）拼出来的就是你要撤的那个商品。

### Q22: fork 的贡献者提 PR，会不会误把我的商品提审出去？

不会，但不是因为工作流里写了守卫——**本仓库的 `release.yml` 没有 `github.repository == '…'` 这一条作业级判断**。
拦住它的是三条触发与凭据层面的事实：`release.yml` 只由 `push` 的 `v*` 标签和 `workflow_dispatch` 触发，
`pull_request` 根本不触发它（PR 上跑的是 `ci.yml`）；fork 的 run 拿不到你仓库的任何 Secret，所以
`store_ready` 恒为 `false`，商店两步直接跳过；而 `store_submit` 还额外要 `vars.CWS_AUTO_SUBMIT == 'true'`，
fork 那个副本上没人设过它。

fork 上想验证产物本身合规，用零凭据的那几条就够：`pnpm build` 之后的 `verify:offline` 与 `verify:remote-code`
是产物层断言，`ci.yml` 的 build job 已经在做这件事。之所以不给这条加显式守卫：加它要改 `release.yml`，
而那几行字符串正被 `pnpm verify:release-ci` 的接缝表钉着，为一个已经由触发规则挡住的场景去改契约表不划算。
真要收紧，改的是那条作业的 `if` 并同步改契约表，不是随手加一行。

### Q23: 环境的 `can_admins_bypass` 是什么？要不要关？

它是环境页上那句「Allow administrators to bypass configured protection rules」，**GitHub 的默认值是开着**——
也就是仓库管理员可以直接穿过这道门，门只拦别人。对一个「必须有另一双眼睛」的闸门，这就是漏底。

本轮实测：这个字段 REST 改得动（`{"can_admins_bypass":false}` 回 200 并确实生效），只有 required reviewers
那条规则改不了（见 Q16）。所以现在的状态是「不让管理员绕过，但还没有批准人」——那种状态下 `store_submit`
一旦排上队会**没有人能放行**，30 天后那次等待自己过期（Q9）。这也是为什么 3.4 的顺序是死的：先在界面里把
批准人加进 `required_reviewers`，再回来确认 `protection_rules` 读得出它，最后才设 `CWS_AUTO_SUBMIT`。
个人仓库只有你一个人时，Q8 的三个选项要先选一个——门要的是另一双眼睛，而名单里只有触发者本人时，
勾了 `prevent_self_review` 就等于每次发布都卡死。

### Q24: 能不能用 API 把商品改成 unlisted、或者审核通过后先压着不放量？

改可见范围：**不能**。v2 的 `publishType` 只有 `DEFAULT_PUBLISH` 与 `STAGED_PUBLISH`，而 Google 明确写过
不再支持用 API 修改商品可见性——unlisted / trusted testers 这些一律在开发者后台改。这条与本仓库
「API 建不了条目、写不了商品文案」是同一族限制：发布 API 管的是包与提交动作，不管商品是什么形态。

`STAGED_PUBLISH`：**能发，但放量这一步这里用不上**。把 `release.yml` 里那个字面量换成 `STAGED_PUBLISH`
确实会让「审过即上架」变成「审过先挂起」，可分批放量的 `:setPublishedDeployPercentage` 按 Google 文档要求
该商品**7 日活跃用户超过 10,000**，量级不足时请求被拒，只能在后台手动操作。本项目现在的用户数远不到那条线，
所以真要灰度，改的是一个当前不具备调用条件端点的调用方式——那是一次有意的产品决定，不该由某次 CI 改动顺手带来
（Q12 里 `deployInfos` 那条讲的是同一件事）。

- **权限与隐私申报**：`CHROMEWEBSTORE.md` → "权限与隐私申报"
- **拒审记录与应对**：`CHROMEWEBSTORE.md` → "拒审记录与政策口径"
- **发版自动化（Release PR、标签、secrets 清单）**：`.github/RELEASE_AUTOMATION.md`
- **产品说明页**：https://liaolongdong.github.io/transfer-any-file/
- **隐私政策**：https://liaolongdong.github.io/transfer-any-file/privacy.html

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

- [ ] **先跑 3.0 那五条只读命令**，按那张表确认此刻缺的是哪几块——「流水线全绿而商店什么都没发生」的三种成因
      （凭据缺项、假门、变量没设）全都长得像成功，只有那五条读数能把它们分开
- [ ] GitHub Secrets 配置齐全（发布商级 3 个 + 本扩展专用 1 个；`RELEASE_PAT` 自 2026-10-27 起是**可选项**，
      它只决定 Release PR 有没有状态检查，标签与发版都不经过它）
- [ ] **那四项都在 Repository secrets 那一档**，不在 environment `cws-release` 的 secrets 里（配错级别不报错，
      只让商店两步一起静默跳过，3.2 的第 4 条 ⚠️ 与 Q6）
- [ ] 那四项是**新链路的四个名字**，不是 `CWS_CLIENT_ID` / `CWS_CLIENT_SECRET` / `CWS_EXTENSION_ID` 那三个旧名字
      （新链路不读它们，别把它们数成「配过了」，见 Q17）
- [ ] 服务账号邮箱已加进开发者信息中心的「账号」页（漏了这步，令牌照样换得到，是商店调用才回 401/403）
- [ ] `CWS_PUBLISHER_ID` 取的是**商品编辑页地址栏的第一段**（36 位 UUID 形），不是服务账号详情页那个 21 位
      「唯一 ID」（3.1 第 6 步那张三段候选表；填错只在商店那跳露出来，见 Q14）
- [ ] GCP 项目已启用 Chrome Web Store API
- [ ] 扩展 ID 格式正确（32 位 a-p 字母，`CHROME_EXTENSION_ID_TAF`）
- [ ] **先跑一次第 0 档**（`store_status_only`，只读、零写入、不要批准）确认凭据链是通的，再考虑第 2 / 3 档
- [ ] 想跑第 1 / 2 / 3 档之前，确认那个标签**真的存在**（仓库零标签时 dry run 红在检出那一步，见 Q19）
- [ ] 所有验证通过（`pnpm lint:all && pnpm verify:meta && pnpm verify:listing && pnpm build && pnpm verify:offline`）
- [ ] 商店文案与 `_locales` 文件一致
- [ ] 隐私政策 URL 可达
- [ ] 版本号高于线上版本
- [ ] **（要走自动提审才需要）** environment `cws-release` 已建好，且 `protection_rules` 里能看到
      Required reviewers 那一条——不是首次运行自动创建的空壳（3.4 第 5 步的那条 curl 命令）
- [ ] **（同上）** 那一格读出来不是**只有** `wait_timer`：那是一条自动放行的假门，比没有门更坏（Q16）
- [ ] **（同上）** 批准人是在**网页界面**里加的——本轮实测 REST 加不上这条规则，别照着命令敲（Q16）
- [ ] **（同上）** `can_admins_bypass` 已关（默认是开的，管理员能直接穿门，Q23）
- [ ] **（同上）** 仓库变量 `CWS_AUTO_SUBMIT=true` 已设，且设之前刚验证过上面三格
- [ ] **（同上）** 名单里至少有一个**不是本次触发者**的批准人；个人仓库只有一个人时，确认自己选的是
      Q8 里的哪一种，而不是「勾了 Prevent self-review 然后没人能批」

---

## 联系方式

- **问题反馈**：[GitHub Issues](https://github.com/liaolongdong/transfer-any-file/issues)
- **邮箱**：[924902324@qq.com](mailto:924902324@qq.com)
- **微信**：`lld_1025`（备注「taf」）
